const {
  groupEventsByCampusDate,
  getCampusDateString,
  getCampusWeekBoundaries,
  isValidTimezone,
} = require('../src/lib/date-grouping.ts');

function runTest() {
  console.log('Testing Campus Date Grouping Logic...\n');
  const timezone = 'America/New_York';
  // Mock "now" as Monday, 2026-09-14 10:00:00 EDT (UTC: 2026-09-14T14:00:00Z)
  const now = new Date('2026-09-14T14:00:00Z');

  const { todayDateStr, tomorrowDateStr, endOfWeekDateStr } = getCampusWeekBoundaries(now, timezone);
  console.log(`Now: ${now.toISOString()}`);
  console.log(`Today (Campus NY): ${todayDateStr}`);
  console.log(`Tomorrow (Campus NY): ${tomorrowDateStr}`);
  console.log(`End of Week (Sunday): ${endOfWeekDateStr}\n`);

  if (todayDateStr !== '2026-09-14') throw new Error('Today mismatch');
  if (tomorrowDateStr !== '2026-09-15') throw new Error('Tomorrow mismatch');
  if (endOfWeekDateStr !== '2026-09-20') throw new Error('End of week mismatch');

  const mockEvents = [
    // Case 1: Today
    { id: '1', title: 'Tech Talk Today', start_time: '2026-09-14T16:00:00Z', status: 'published' },
    // Case 2: Tomorrow
    { id: '2', title: 'Acoustic Sessions Tomorrow', start_time: '2026-09-15T22:30:00Z', status: 'published' },
    // Case 3: Day after tomorrow (Wednesday) -> This Week
    { id: '3', title: 'Design Roast Wednesday', start_time: '2026-09-16T22:00:00Z', status: 'published' },
    // Case 3b: Friday of this week -> This Week
    { id: '4', title: 'Hackathon Friday', start_time: '2026-09-18T14:00:00Z', status: 'published' },
    // Case 4: Next week Monday -> Upcoming
    { id: '5', title: 'Next Week Keynote', start_time: '2026-09-21T14:00:00Z', status: 'published' },
    // Case 5: Yesterday -> Past (should be excluded)
    { id: '6', title: 'Past Orientation', start_time: '2026-09-13T14:00:00Z', status: 'published' },
    // Case 6: Cancelled event -> should be excluded
    { id: '7', title: 'Cancelled Meetup', start_time: '2026-09-14T18:00:00Z', status: 'cancelled' },
  ];

  const groups = groupEventsByCampusDate(mockEvents, timezone, now);

  console.log('Today events:', groups.today.map(e => e.title));
  console.log('Tomorrow events:', groups.tomorrow.map(e => e.title));
  console.log('This Week events:', groups.thisWeek.map(e => e.title));
  console.log('Upcoming events:', groups.upcoming.map(e => e.title));

  if (groups.today.length !== 1 || groups.today[0].id !== '1') throw new Error('Failed Case 1: Today');
  console.log('✓ Case 1 PASS: Event today -> Today');

  if (groups.tomorrow.length !== 1 || groups.tomorrow[0].id !== '2') throw new Error('Failed Case 2: Tomorrow');
  console.log('✓ Case 2 PASS: Event tomorrow -> Tomorrow');

  if (groups.thisWeek.length !== 2 || groups.thisWeek[0].id !== '3' || groups.thisWeek[1].id !== '4') throw new Error('Failed Case 3: This Week');
  console.log('✓ Case 3 PASS: Events day after tomorrow -> This Week');

  if (groups.upcoming.length !== 1 || groups.upcoming[0].id !== '5') throw new Error('Failed Case 4: Upcoming');
  console.log('✓ Case 4 PASS: Event next week -> Upcoming');

  const hasPast = Object.values(groups).flat().some(e => e.id === '6');
  if (hasPast) throw new Error('Failed Case 5: Past event included');
  console.log('✓ Case 5 PASS: Past event excluded');

  const hasCancelled = Object.values(groups).flat().some(e => e.id === '7');
  if (hasCancelled) throw new Error('Failed Case 6: Cancelled event included');
  console.log('✓ Case 6 PASS: Cancelled event excluded');

  // Test invalid timezone
  let errorCaught = false;
  try {
    groupEventsByCampusDate(mockEvents, 'Invalid/Unknown_Zone', now);
  } catch (err) {
    errorCaught = true;
  }
  if (!errorCaught) throw new Error('Failed timezone error check');
  console.log('✓ Timezone error validation PASS');

  console.log('\nAll date grouping assertions passed!');
}

runTest();
