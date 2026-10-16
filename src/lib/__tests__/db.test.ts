import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDatabaseConnectionString, getDbPool, resetDbPool } from "../db";
import { Pool, type PoolConfig } from "pg";

// Mock pg.Pool to inspect constructor arguments
vi.mock("pg", () => {
  class MockPool {
    config: PoolConfig;
    on = vi.fn();
    query = vi.fn();
    connect = vi.fn();
    end = vi.fn().mockResolvedValue(undefined);

    constructor(config: PoolConfig) {
      this.config = config;
    }
  }

  return {
    Pool: vi.fn().mockImplementation(function (config: PoolConfig) {
      return new MockPool(config);
    }),
  };
});

describe("Database Configuration & Hybrid Resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbPool();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_password;
    delete process.env.DB_NAME;
  });

  afterEach(() => {
    resetDbPool();
    process.env = originalEnv;
  });

  describe("getDatabaseConnectionString()", () => {
    it("returns DATABASE_URL directly when present", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@remotehost:6543/db?sslmode=require";
      expect(getDatabaseConnectionString()).toBe(
        "postgresql://user:pass@remotehost:6543/db?sslmode=require"
      );
    });

    it("constructs connection string from DB_* variables when DATABASE_URL is missing", () => {
      process.env.DB_HOST = "aws-0.pooler.supabase.com";
      process.env.DB_PORT = "6543";
      process.env.DB_USER = "postgres.proj";
      process.env.DB_PASSWORD = "my-secret-password";
      process.env.DB_NAME = "postgres";

      const conn = getDatabaseConnectionString();
      expect(conn).toBe(
        "postgresql://postgres.proj:my-secret-password@aws-0.pooler.supabase.com:6543/postgres?sslmode=require"
      );
    });

    it("URL-encodes special characters in user and password", () => {
      process.env.DB_HOST = "db.example.com";
      process.env.DB_PORT = "5432";
      process.env.DB_USER = "user@special";
      process.env.DB_PASSWORD = "pass#word/with%chars";
      process.env.DB_NAME = "testdb";

      const conn = getDatabaseConnectionString();
      expect(conn).toBe(
        "postgresql://user%40special:pass%23word%2Fwith%25chars@db.example.com:5432/testdb?sslmode=require"
      );
    });

    it("returns empty string when required DB_* variables are missing", () => {
      process.env.DB_HOST = "db.example.com";
      // Missing user and password
      expect(getDatabaseConnectionString()).toBe("");
    });
  });

  describe("getDbPool()", () => {
    it("initializes Pool with connectionString when DATABASE_URL is present", () => {
      process.env.DATABASE_URL = "postgresql://unified:url@remote:6543/prod";

      const pool = getDbPool();
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: "postgresql://unified:url@remote:6543/prod",
          statement_timeout: 10000,
        })
      );
      expect(pool).toBeDefined();
    });

    it("initializes Pool with discrete parameters when DATABASE_URL is missing but DB_* is set", () => {
      process.env.DB_HOST = "cluster.pooler.supabase.com";
      process.env.DB_PORT = "6543";
      process.env.DB_USER = "postgres.ref";
      process.env.DB_PASSWORD = "secure-pass-123";
      process.env.DB_NAME = "postgres";

      const pool = getDbPool();
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "cluster.pooler.supabase.com",
          port: 6543,
          user: "postgres.ref",
          password: "secure-pass-123",
          database: "postgres",
        })
      );
      expect(pool).toBeDefined();
    });

    it("throws descriptive error when neither DATABASE_URL nor DB_* credentials exist", () => {
      expect(() => getDbPool()).toThrowError(
        /Missing required database credentials/i
      );
    });
  });
});
