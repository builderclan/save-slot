import { describe, it, expect, vi, beforeEach } from "vitest";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  parseEnv,
  getMigrationFiles,
  ensureLedgerTable,
  getMigrationStatus,
  runMigrations,
} = require("../../../scripts/migrate.js");
/* eslint-enable @typescript-eslint/no-require-imports */

describe("Database Migration System", () => {
  describe("parseEnv()", () => {
    it("correctly parses key-value pairs without quotes", () => {
      const content = `
DB_HOST=localhost
DB_PORT=6543
DB_NAME=postgres
`;
      const parsed = parseEnv(content);
      expect(parsed).toEqual({
        DB_HOST: "localhost",
        DB_PORT: "6543",
        DB_NAME: "postgres",
      });
    });

    it("handles double and single quotes properly", () => {
      const content = `
DB_PASSWORD="super-secret-password"
DB_USER='postgres.dev'
`;
      const parsed = parseEnv(content);
      expect(parsed).toEqual({
        DB_PASSWORD: "super-secret-password",
        DB_USER: "postgres.dev",
      });
    });

    it("ignores comments and empty lines", () => {
      const content = `
# This is a comment
DB_HOST=localhost

# Another comment
DB_PORT=5432
`;
      const parsed = parseEnv(content);
      expect(parsed).toEqual({
        DB_HOST: "localhost",
        DB_PORT: "5432",
      });
    });
  });

  describe("getMigrationFiles()", () => {
    it("returns sorted SQL files from migrations directory", () => {
      const files = getMigrationFiles();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThanOrEqual(8);
      expect(files[0]).toBe("001_initial_schema.sql");
      expect(files[1]).toBe("002_optional_registration_url.sql");
      expect(files[files.length - 1]).toBe("008_add_principal_and_vice_principal_roles.sql");

      // Verify all items are .sql
      for (const file of files) {
        expect(file.endsWith(".sql")).toBe(true);
      }
    });

    it("returns empty array for non-existent directory", () => {
      const files = getMigrationFiles("/non/existent/path");
      expect(files).toEqual([]);
    });
  });

  describe("ensureLedgerTable()", () => {
    it("creates ledger table and returns map of applied migrations", async () => {
      const mockQuery = vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("CREATE TABLE IF NOT EXISTS")) {
          return Promise.resolve({ rows: [] });
        }
        if (queryText.includes("SELECT name, applied_at")) {
          return Promise.resolve({
            rows: [
              { name: "001_initial_schema.sql", applied_at: "2026-09-14T05:24:10.362Z" },
              { name: "002_optional_registration_url.sql", applied_at: "2026-09-14T05:24:10.362Z" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockClient = { query: mockQuery };
      const appliedMap = await ensureLedgerTable(mockClient);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(appliedMap.size).toBe(2);
      expect(appliedMap.has("001_initial_schema.sql")).toBe(true);
      expect(appliedMap.has("002_optional_registration_url.sql")).toBe(true);
      expect(appliedMap.has("007_add_reviewed_by.sql")).toBe(false);
    });
  });

  describe("getMigrationStatus()", () => {
    it("accurately classifies applied and pending migrations", async () => {
      const mockQuery = vi.fn().mockImplementation((queryText: string) => {
        if (queryText.includes("SELECT name, applied_at")) {
          return Promise.resolve({
            rows: [
              { name: "001_initial_schema.sql", applied_at: "2026-09-14T05:24:10.362Z" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockClient = { query: mockQuery };
      const statuses = await getMigrationStatus(mockClient);

      expect(statuses.length).toBeGreaterThanOrEqual(8);
      const first = statuses.find((s: { name: string }) => s.name === "001_initial_schema.sql");
      const eighth = statuses.find((s: { name: string }) => s.name === "008_add_principal_and_vice_principal_roles.sql");

      expect(first?.applied).toBe(true);
      expect(eighth?.applied).toBe(false);
    });
  });

  describe("runMigrations()", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("skips execution when dryRun is true", async () => {
      const queryLog: string[] = [];
      const mockQuery = vi.fn().mockImplementation((sql: string) => {
        queryLog.push(sql);
        if (sql.includes("SELECT name, applied_at")) {
          return Promise.resolve({ rows: [] }); // all pending
        }
        return Promise.resolve({ rows: [] });
      });

      const mockClient = { query: mockQuery };
      const res = await runMigrations({ client: mockClient, dryRun: true });

      expect(res.dryRun).toBe(true);
      expect(res.appliedCount).toBe(0);
      expect(queryLog.some((q) => q.includes("BEGIN;"))).toBe(false);
      expect(queryLog.some((q) => q.includes("pg_advisory_unlock"))).toBe(true);
    });

    it("executes each pending migration inside a transaction and commits", async () => {
      const queryLog: string[] = [];
      const mockQuery = vi.fn().mockImplementation((sql: string) => {
        queryLog.push(typeof sql === "string" ? sql : JSON.stringify(sql));
        if (sql.includes("SELECT name, applied_at")) {
          return Promise.resolve({
            rows: [
              { name: "001_initial_schema.sql", applied_at: "2026-09-14T05:24:10.362Z" },
              { name: "002_optional_registration_url.sql", applied_at: "2026-09-14T05:24:10.362Z" },
              { name: "003_complete_rls_and_conflict_engine.sql", applied_at: "2026-09-14T05:24:10.544Z" },
              { name: "004_fix_rls_recursion.sql", applied_at: "2026-09-14T05:24:59.525Z" },
              { name: "005_auth_and_multicampus_hardening.sql", applied_at: "2026-09-14T05:42:38.160Z" },
              { name: "006_community_onboarding.sql", applied_at: "2026-09-14T07:03:00.505Z" },
              { name: "007_add_reviewed_by.sql", applied_at: "2026-10-08T12:00:00.000Z" },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const mockClient = { query: mockQuery };
      const res = await runMigrations({ client: mockClient });

      expect(res.appliedCount).toBe(1); // Only 008 was pending
      expect(queryLog).toContain("BEGIN;");
      expect(queryLog).toContain("COMMIT;");
      expect(queryLog.some((q) => q.includes("pg_advisory_lock"))).toBe(true);
      expect(queryLog.some((q) => q.includes("pg_advisory_unlock"))).toBe(true);
    });

    it("rolls back transaction when a migration fails", async () => {
      const queryLog: string[] = [];
      const mockQuery = vi.fn().mockImplementation((sql: string) => {
        queryLog.push(typeof sql === "string" ? sql : JSON.stringify(sql));
        if (sql.includes("SELECT name, applied_at")) {
          return Promise.resolve({ rows: [] }); // all pending
        }
        if (sql.includes("CREATE TABLE IF NOT EXISTS")) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes("CREATE EXTENSION") || sql.includes("ALTER TABLE")) {
          throw new Error("Syntax error in SQL migration");
        }
        return Promise.resolve({ rows: [] });
      });

      const mockClient = { query: mockQuery };
      await expect(runMigrations({ client: mockClient })).rejects.toThrow("Syntax error in SQL migration");

      expect(queryLog).toContain("BEGIN;");
      expect(queryLog).toContain("ROLLBACK;");
      expect(queryLog.some((q) => q.includes("pg_advisory_unlock"))).toBe(true);
    });
  });
});
