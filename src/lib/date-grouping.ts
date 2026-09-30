import type { Event } from "../types/database";

export interface EventGroups {
  today: Event[];
  tomorrow: Event[];
  thisWeek: Event[];
  upcoming: Event[];
}

/**
 * Validates timezone string against IANA standards
 */
export function isValidTimezone(tz?: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns YYYY-MM-DD representation of a timestamp in the given campus timezone
 */
export function getCampusDateString(date: Date, timeZone: string): string {
  if (!isValidTimezone(timeZone)) {
    throw new Error(`Invalid campus timezone configuration: "${timeZone}"`);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Calculates the date strings for:
 * - todayDateStr
 * - tomorrowDateStr
 * - endOfWeekDateStr (Sunday of current week in campus timezone)
 */
export function getCampusWeekBoundaries(now: Date, timeZone: string): {
  todayDateStr: string;
  tomorrowDateStr: string;
  endOfWeekDateStr: string;
} {
  if (!isValidTimezone(timeZone)) {
    throw new Error(`Invalid campus timezone configuration: "${timeZone}"`);
  }

  const todayDateStr = getCampusDateString(now, timeZone);

  // Tomorrow is 24 hours ahead
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = getCampusDateString(tomorrow, timeZone);

  // Determine weekday in campus timezone (0 = Sun, 1 = Mon, ... 6 = Sat)
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const currentDay = weekdayMap[weekdayStr] ?? 0;

  // Days remaining until Sunday (end of week)
  // If currentDay is 0 (Sunday), end of week is today (0 days remaining).
  // If currentDay is 1 (Monday), Sunday is 6 days away.
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;

  const endOfWeek = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
  const endOfWeekDateStr = getCampusDateString(endOfWeek, timeZone);

  return {
    todayDateStr,
    tomorrowDateStr,
    endOfWeekDateStr,
  };
}

/**
 * Groups published campus events chronologically into:
 * - TODAY: local campus date === today
 * - TOMORROW: local campus date === tomorrow
 * - THIS WEEK: after tomorrow, on or before end of current campus week (Sunday)
 * - UPCOMING: after current week
 *
 * Events are strictly scoped to published status, sorted chronologically,
 * and past events (< today) are excluded from upcoming sections.
 */
export function groupEventsByCampusDate(
  events: Event[],
  timeZone: string,
  currentTimestamp: Date = new Date()
): EventGroups {
  if (!isValidTimezone(timeZone)) {
    throw new Error(`Invalid campus timezone configuration: "${timeZone}"`);
  }

  const { todayDateStr, tomorrowDateStr, endOfWeekDateStr } = getCampusWeekBoundaries(
    currentTimestamp,
    timeZone
  );

  const groups: EventGroups = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    upcoming: [],
  };

  // Only consider published events
  const publishedEvents = events.filter((e) => e.status === "published");

  for (const event of publishedEvents) {
    const eventDate = new Date(event.start_time);
    const eventDateStr = getCampusDateString(eventDate, timeZone);

    // Past events (< today) fallback to upcoming rather than silently dropping
    if (eventDateStr < todayDateStr) {
      groups.upcoming.push(event);
      continue;
    }

    // Case 1: Today
    if (eventDateStr === todayDateStr) {
      groups.today.push(event);
      continue;
    }

    // Case 2: Tomorrow
    if (eventDateStr === tomorrowDateStr) {
      groups.tomorrow.push(event);
      continue;
    }

    // Case 3: This Week (after tomorrow, up to end of week)
    if (eventDateStr <= endOfWeekDateStr) {
      groups.thisWeek.push(event);
      continue;
    }

    // Case 4: Upcoming (after this week)
    groups.upcoming.push(event);
  }

  // Sort every section chronologically by local start time
  const sortByStart = (a: Event, b: Event) =>
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime();

  groups.today.sort(sortByStart);
  groups.tomorrow.sort(sortByStart);
  groups.thisWeek.sort(sortByStart);
  groups.upcoming.sort(sortByStart);

  return groups;
}
