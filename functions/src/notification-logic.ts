export type SlotData = { time?: string; courts?: unknown[]; qrImages?: unknown[]; updatedBy?: string };
export type NotificationKind = "booking-created" | "booking-updated" | "booking-cleared";

function occupied(slot: SlotData | undefined) { return Boolean(slot?.courts?.length); }
function signature(slot: SlotData | undefined) {
  return JSON.stringify({ courts: slot?.courts ?? [], qrImages: slot?.qrImages ?? [] });
}

export function classifyChange(before: SlotData | undefined, after: SlotData | undefined): NotificationKind | null {
  if (signature(before) === signature(after)) return null;
  if (!occupied(before) && occupied(after)) return "booking-created";
  if (occupied(before) && !occupied(after)) return "booking-cleared";
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
