import type { Court, Language, SlotTime } from "@/lib/board";

export const notificationRetentionDays = 7;

export type NotificationType = "booking-created" | "booking-updated" | "booking-cleared" | "booking-reminder";

export type BoardNotification = {
  id: string;
  type: NotificationType;
  dayId: string;
  time: SlotTime;
  courts: Court[];
  createdAt: Date;
  expiresAt: Date;
  actorUid: string | null;
  read: boolean;
  reminderSlots?: { time: SlotTime; courts: Court[] }[];
  addedCourts?: Court[];
  removedCourts?: Court[];
};

export function notificationText(notification: BoardNotification, language: Language) {
  const date = new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${notification.dayId}T12:00:00Z`));
  const courts = notification.courts.length ? notification.courts.join(", ") : "—";
  const combinedReminder = notification.reminderSlots
    ?.map((slot) => `${slot.time} ${slot.courts.join(", ")}`)
    .join(" · ");
  const hasDelta = Boolean(notification.addedCourts && notification.removedCourts);
  const englishDelta = [
    notification.addedCourts?.length ? `Added ${notification.addedCourts.join(", ")}` : "",
    notification.removedCourts?.length ? `Removed ${notification.removedCourts.join(", ")}` : "",
    notification.courts.length ? `Current: ${courts}` : "",
  ].filter(Boolean).join(" · ");
  const thaiDelta = [
    notification.addedCourts?.length ? `เพิ่ม ${notification.addedCourts.join(", ")}` : "",
    notification.removedCourts?.length ? `ลบ ${notification.removedCourts.join(", ")}` : "",
    notification.courts.length ? `ปัจจุบัน: ${courts}` : "",
  ].filter(Boolean).join(" · ");

  if (language === "th") {
    const title = notification.type === "booking-reminder" ? "เตือนการจองคอร์ท" :
      notification.type === "booking-cleared" ? "ยกเลิกการจองคอร์ท" :
      notification.type === "booking-created" ? "มีการจองคอร์ทใหม่" : "อัปเดตการจองคอร์ท";
    const body = combinedReminder ? `${date} · ${combinedReminder}` : hasDelta ? `${date} เวลา ${notification.time} · ${thaiDelta}` : notification.type === "booking-cleared"
      ? `${date} เวลา ${notification.time}`
      : `${date} เวลา ${notification.time} · ${courts}`;
    return { title, body };
  }

  const title = notification.type === "booking-reminder" ? "Court booking reminder" :
    notification.type === "booking-cleared" ? "Court booking cleared" :
    notification.type === "booking-created" ? "New court booking" : "Court booking updated";
  const body = combinedReminder ? `${date} · ${combinedReminder}` : hasDelta ? `${date} at ${notification.time} · ${englishDelta}` : notification.type === "booking-cleared"
    ? `${date} at ${notification.time}`
    : `${date} at ${notification.time} · ${courts}`;
  return { title, body };
}

export function isActiveNotification(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() > now.getTime();
}
