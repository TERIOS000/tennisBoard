export type SlotData = { time?: string; courts?: unknown[]; qrImages?: unknown[]; updatedBy?: string };
export type NotificationKind = "booking-created" | "booking-updated" | "booking-cleared";

function courtNames(slot: SlotData | undefined) {
  return (slot?.courts ?? []).filter((court): court is string => typeof court === "string");
}

export function courtDelta(before: SlotData | undefined, after: SlotData | undefined) {
  const previous = new Set(courtNames(before));
  const current = new Set(courtNames(after));
  return {
    addedCourts: [...current].filter((court) => !previous.has(court)).sort(),
    removedCourts: [...previous].filter((court) => !current.has(court)).sort(),
  };
}

export function classifyChange(before: SlotData | undefined, after: SlotData | undefined): NotificationKind | null {
  const { addedCourts, removedCourts } = courtDelta(before, after);
  if (!addedCourts.length && !removedCourts.length) return null;
  if (!courtNames(before).length && courtNames(after).length) return "booking-created";
  if (courtNames(before).length && !courtNames(after).length) return "booking-cleared";
  return "booking-updated";
}

export function bangkokDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function shouldSendLateReminder(dayId: string, time: string, now: Date) {
  const bangkok = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const minutes = bangkok.getHours() * 60 + bangkok.getMinutes();
  const [hour, minute] = time.split(":").map(Number);
  return dayId === bangkokDate(now) && minutes >= 15 * 60 && minutes < hour * 60 + minute;
}
