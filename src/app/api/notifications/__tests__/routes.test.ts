import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUpdateWhere = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: mockUpdateWhere,
  }),
});
const mockSelect = vi.fn();

vi.mock("@/lib/db", () => ({
  withDbRetry: vi.fn((op: (client: unknown) => Promise<unknown>) =>
    op({
      select: mockSelect,
      update: mockUpdate,
    })
  ),
}));

import { GET as listNotifications } from "../route";
import { PATCH as markNotificationRead } from "../[id]/read/route";
import { POST as markAllRead } from "../read-all/route";
import { getCurrentUser, type AuthSession } from "@/server/auth";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

function makeSession(): AuthSession {
  return {
    userId: "user-1",
    email: "lead@aisat.ac.in",
    profile: { id: "user-1", email: "lead@aisat.ac.in", full_name: "Lead", role: "lead" },
    leadCommunities: [],
    ficCommunities: [],
    hodDepartments: [],
    isAdmin: false,
    isPrincipal: false,
    isVicePrincipal: false,
    isHod: false,
    isActingHod: false,
    isFic: false,
    isStaff: false,
    isLead: true,
  };
}

describe("Notifications API (/api/notifications/*)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await listNotifications();
    expect(res.status).toBe(401);
  });

  it("returns user notifications and unreadCount on GET", async () => {
    mockGetCurrentUser.mockResolvedValue(makeSession());
    let call = 0;
    mockSelect.mockImplementation(() => {
      call++;
      if (call === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: "n-1",
                    userId: "user-1",
                    eventId: "ev-1",
                    type: "event_published",
                    title: "Published",
                    message: "Approved!",
                    isRead: false,
                    createdAt: new Date("2026-10-15T10:00:00Z"),
                  },
                ]),
              }),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      };
    });

    const res = await listNotifications();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].id).toBe("n-1");
  });

  it("marks individual and all notifications read", async () => {
    mockGetCurrentUser.mockResolvedValue(makeSession());
    mockUpdateWhere.mockReturnValue({
      returning: vi.fn().mockResolvedValue([
        {
          id: "n-1",
          userId: "user-1",
          eventId: null,
          type: "event_published",
          title: "Published",
          message: "Approved!",
          isRead: true,
          createdAt: new Date("2026-10-15T10:00:00Z"),
        },
      ]),
    });

    const resOne = await markNotificationRead(
      new Request("http://localhost/api/notifications/n-1/read", { method: "PATCH" }),
      { params: Promise.resolve({ id: "n-1" }) }
    );
    expect(resOne.status).toBe(200);

    mockUpdateWhere.mockResolvedValueOnce([]);
    const resAll = await markAllRead();
    expect(resAll.status).toBe(200);
  });
});
