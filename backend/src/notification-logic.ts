export type SlotData = { time?: string; courts?: unknown[]; qrImages?: unknown[]; updatedBy?: string };
export type NotificationKind = "booking-created" | "booking-updated" | "booking-cleared";
export const morningReminderSchedule = "0 9 * * *";
export const afternoonReminderSchedule = "30 16 * * *";

export function occupiedReminderSlots(slots: SlotData[]) {
  return slots.flatMap((slot) => slot.time && slot.courts?.length
    ? [{ time: slot.time, courts: slot.courts }]
    : []).sort((left, right) => left.time.localeCompare(right.time));
}

export function dailyReminderId(dayId: string, hour: string) {
  return `daily-reminder-${dayId}-${hour}`;
}

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

export function bangkokHour(now: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
