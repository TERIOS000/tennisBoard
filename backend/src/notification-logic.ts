export type SlotData = { time?: string; courts?: unknown[] };
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
