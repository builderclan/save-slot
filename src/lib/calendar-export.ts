import { CampusEvent } from "@/types/database";

export function getGoogleCalendarUrl(event: CampusEvent): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    `${event.description}\n\nOrganized by: ${event.community?.name || "Campus Club"}${
      event.external_registration_url ? `\nRegister: ${event.external_registration_url}` : ""
    }`
  );
  const location = encodeURIComponent(
    event.venue?.name
      ? `${event.venue.name} (${event.venue.building || "Campus"})`
      : event.location_name
  );

  const formatTime = (isoString: string) => {
    return new Date(isoString).toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const dates = `${formatTime(event.start_time)}/${formatTime(event.end_time)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function downloadIcsFile(event: CampusEvent) {
  const formatTime = (isoString: string) => {
    return new Date(isoString).toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const location = event.venue?.name
    ? `${event.venue.name}, ${event.venue.building || "Campus"}`
    : event.location_name;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AISAT SafeSlot//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@campus.edu`,
    `DTSTAMP:${formatTime(new Date().toISOString())}`,
    `DTSTART:${formatTime(event.start_time)}`,
    `DTEND:${formatTime(event.end_time)}`,
    `SUMMARY:${event.title.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n").replace(/,/g, "\\,")}`,
    `LOCATION:${location.replace(/,/g, "\\,")}`,
    `ORGANIZER;CN="${(event.community?.name || "Campus Community").replace(/"/g, "")}":MAILTO:events@campus.edu`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `${event.slug || "campus-event"}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
