import { detectConflicts } from "./conflicts";
import { Event, Venue } from "@/types/database";

const mockVenue: Venue = {
  id: "v-1",
  campus_id: "c-1",
  name: "Turing Auditorium",
  building: "CS Center",
  is_active: true,
};

const mockEvent: Event = {
  id: "e-1",
  campus_id: "c-1",
  community_id: "comm-1",
  venue_id: "v-1",
  title: "Hackathon",
  slug: "hackathon",
  description: "Annual hackathon",
  category: "Tech",
  tags: [],
  start_time: "2026-09-18T10:00:00Z",
  end_time: "2026-09-18T14:00:00Z",
  timezone: "UTC",
  location_name: "Turing Auditorium",
  is_virtual: false,
  external_registration_url: "https://lu.ma/hack",
  status: "published",
  created_by: "u-1",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

export function runTests() {
  console.log("Running Conflict Detector Verification Suite...");

  // Test 1: Hard Venue Collision
  const report1 = detectConflicts({
    venueId: "v-1",
    startTime: "2026-09-18T12:00:00Z", // Overlaps 10:00-14:00
    endTime: "2026-09-18T15:00:00Z",
    existingEvents: [mockEvent],
    venues: [mockVenue],
  });

  if (!report1.hasVenueConflict) {
    throw new Error("Test 1 Failed: Expected venue conflict");
  }
  console.log("✓ Test 1 Passed: Detected venue double-booking");

  // Test 2: Different Venue Overlap (Advisory only)
  const report2 = detectConflicts({
    venueId: "v-2", // Different venue
    startTime: "2026-09-18T12:00:00Z",
    endTime: "2026-09-18T15:00:00Z",
    existingEvents: [mockEvent],
    venues: [mockVenue],
  });

  if (report2.hasVenueConflict || !report2.hasScheduleOverlap) {
    throw new Error("Test 2 Failed: Expected schedule overlap only");
  }
  console.log("✓ Test 2 Passed: Detected concurrent schedule overlap without false venue conflict");

  // Test 3: Consecutive times (Non-overlapping)
  const report3 = detectConflicts({
    venueId: "v-1",
    startTime: "2026-09-18T14:00:00Z", // Starts right when e-1 ends
    endTime: "2026-09-18T16:00:00Z",
    existingEvents: [mockEvent],
    venues: [mockVenue],
  });

  if (report3.hasVenueConflict || report3.hasScheduleOverlap) {
    throw new Error("Test 3 Failed: Consecutive times should not overlap");
  }
  console.log("✓ Test 3 Passed: Consecutive non-overlapping intervals clean");

  // Test 4: Exclude Self when Editing
  const report4 = detectConflicts({
    eventId: "e-1", // Self edit
    venueId: "v-1",
    startTime: "2026-09-18T10:00:00Z",
    endTime: "2026-09-18T14:00:00Z",
    existingEvents: [mockEvent],
    venues: [mockVenue],
  });

  if (report4.hasVenueConflict || report4.hasScheduleOverlap) {
    throw new Error("Test 4 Failed: Self edit should not conflict with itself");
  }
  console.log("✓ Test 4 Passed: Self edit excluded from conflict report");

  // Test 5: Cancelled event does not conflict
  const cancelledEvent: Event = { ...mockEvent, status: "cancelled" };
  const report5 = detectConflicts({
    venueId: "v-1",
    startTime: "2026-09-18T11:00:00Z",
    endTime: "2026-09-18T13:00:00Z",
    existingEvents: [cancelledEvent],
    venues: [mockVenue],
  });

  if (report5.hasVenueConflict) {
    throw new Error("Test 5 Failed: Cancelled event should not trigger conflict");
  }
  console.log("✓ Test 5 Passed: Cancelled events safely ignored");

  console.log("ALL 5 CONFLICT ENGINE TESTS PASSED SUCCESSFULLY! 🎉");
}

runTests();
