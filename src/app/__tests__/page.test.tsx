import { describe, it, expect, vi, beforeEach } from "vitest";
import StudentNoticeBoardPage, { revalidate } from "../(board)/page";

vi.mock("@/features/events/components/notice-board-client", () => ({
  NoticeBoardClient: (props: Record<string, unknown>) => (
    <div data-testid="notice-board-client" data-props={JSON.stringify(props)} />
  ),
}));

const {
  mockSelect,
  queueQueryResults,
  resetQueryQueue,
  setQueryError,
} = vi.hoisted(() => {
  let queryQueue: unknown[][] = [];
  let queryError: Error | null = null;

  const queueQueryResults = (...results: unknown[][]) => {
    queryQueue.push(...results);
  };

  const resetQueryQueue = () => {
    queryQueue = [];
    queryError = null;
  };

  const setQueryError = (err: Error) => {
    queryError = err;
  };

  interface MockChain {
    from: (table: unknown) => MockChain;
    innerJoin: (...args: unknown[]) => MockChain;
    leftJoin: (...args: unknown[]) => MockChain;
    where: (...args: unknown[]) => MockChain;
    orderBy: (...args: unknown[]) => MockChain;
    limit: (...args: unknown[]) => Promise<unknown[]>;
    then: (
      resolve: (v: unknown[]) => unknown,
      reject?: (e: unknown) => unknown
    ) => Promise<unknown>;
  }

  const mockSelect = vi.fn().mockImplementation(() => {
    const createChain = () => {
      const getNext = () => {
        if (queryError) {
          return Promise.reject(queryError);
        }
        return Promise.resolve(queryQueue.shift() ?? []);
      };

      const chain: MockChain = {
        from: vi.fn().mockImplementation(() => chain),
        innerJoin: vi.fn().mockImplementation(() => chain),
        leftJoin: vi.fn().mockImplementation(() => chain),
        where: vi.fn().mockImplementation(() => chain),
        orderBy: vi.fn().mockImplementation(() => chain),
        limit: vi.fn().mockImplementation(() => getNext()),
        then: (resolve, reject) => getNext().then(resolve, reject),
      };
      return chain;
    };
    return createChain();
  });

  return {
    mockSelect,
    queueQueryResults,
    resetQueryQueue,
    setQueryError,
  };
});

vi.mock("@/lib/db", () => {
  const mockDbClient = {
    select: mockSelect,
  };

  return {
    db: mockDbClient,
    withDbRetry: (op: (client: typeof mockDbClient) => Promise<unknown>) => op(mockDbClient),
  };
});

describe("StudentNoticeBoardPage ISR (src/app/page.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueryQueue();
  });

  it("exports revalidate = 60 for Edge ISR caching", () => {
    expect(revalidate).toBe(60);
  });

  it("renders notice board with events and venues", async () => {
    const mockEvent = {
      id: "event-1",
      campusId: "campus-1",
      communityId: "comm-1",
      title: "Tech Fest 2026",
      slug: "tech-fest",
      description: "Annual Tech Fest",
      category: "Tech",
      startTime: new Date("2026-10-25T10:00:00Z"),
      endTime: new Date("2026-10-25T14:00:00Z"),
      locationName: "Turing Auditorium",
      status: "published",
      community: {
        id: "comm-1",
        name: "ACM Chapter",
        slug: "acm",
        category: "Tech",
      },
      venue: {
        id: "venue-1",
        name: "Turing Auditorium",
        building: "CS",
        isActive: true,
      },
      reviewer: null,
    };

    const mockVenue = {
      id: "venue-1",
      campusId: "campus-1",
      name: "Turing Auditorium",
      building: "CS",
      isActive: true,
    };

    queueQueryResults([mockEvent], [mockVenue]);

    const jsx = await StudentNoticeBoardPage();
    expect(jsx).toBeDefined();
    expect(jsx.props.initialEvents).toHaveLength(1);
    expect(jsx.props.initialEvents[0].title).toBe("Tech Fest 2026");
    expect(jsx.props.initialVenues).toHaveLength(1);
    expect(jsx.props.initialVenues[0].name).toBe("Turing Auditorium");
  });

  it("handles database SSR error gracefully and renders with empty arrays", async () => {
    setQueryError(new Error("Database connection lost"));

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const jsx = await StudentNoticeBoardPage();
    expect(jsx).toBeDefined();
    expect(jsx.props.initialEvents).toHaveLength(0);
    expect(jsx.props.initialVenues).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Notice board pre-render: database query failed (build/offline fallback):",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
