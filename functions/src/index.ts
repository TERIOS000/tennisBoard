import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { bangkokDate, bangkokHour, dailyReminderId, dailyReminderSchedule, occupiedReminderSlots, type NotificationKind, type SlotData } from "./notification-logic.js";

initializeApp();
const db = getFirestore();
const retentionMs = 7 * 24 * 60 * 60 * 1000;

type ReminderSlot = { time: string; courts: unknown[] };
type EventInput = { id: string; type: NotificationKind | "booking-reminder"; dayId: string; time: string; courts: unknown[]; actorUid: string | null; reminderSlots?: ReminderSlot[]; addedCourts?: string[]; removedCourts?: string[] };

function text(input: EventInput, language: string) {
  const courtText = input.courts.join(", ");
  const combined = input.reminderSlots?.map((slot) => `${slot.time} ${slot.courts.join(", ")}`).join(" · ");
  const hasDelta = Boolean(input.addedCourts && input.removedCourts);
  const englishDelta = [
    input.addedCourts?.length ? `Added ${input.addedCourts.join(", ")}` : "",
    input.removedCourts?.length ? `Removed ${input.removedCourts.join(", ")}` : "",
    input.courts.length ? `Current: ${courtText}` : "",
  ].filter(Boolean).join(" · ");
  const thaiDelta = [
    input.addedCourts?.length ? `เพิ่ม ${input.addedCourts.join(", ")}` : "",
    input.removedCourts?.length ? `ลบ ${input.removedCourts.join(", ")}` : "",
    input.courts.length ? `ปัจจุบัน: ${courtText}` : "",
  ].filter(Boolean).join(" · ");
  if (language === "th") return {
    title: input.type === "booking-reminder" ? "เตือนการจองคอร์ท" : input.type === "booking-cleared" ? "ยกเลิกการจองคอร์ท" : input.type === "booking-created" ? "มีการจองคอร์ทใหม่" : "อัปเดตการจองคอร์ท",
    body: combined ? `${input.dayId} · ${combined}` : hasDelta ? `${input.dayId} เวลา ${input.time} · ${thaiDelta}` : input.type === "booking-cleared" ? `${input.dayId} เวลา ${input.time}` : `${input.dayId} เวลา ${input.time} · ${courtText}`,
  };
  return {
    title: input.type === "booking-reminder" ? "Court booking reminder" : input.type === "booking-cleared" ? "Court booking cleared" : input.type === "booking-created" ? "New court booking" : "Court booking updated",
    body: combined ? `${input.dayId} · ${combined}` : hasDelta ? `${input.dayId} at ${input.time} · ${englishDelta}` : input.type === "booking-cleared" ? `${input.dayId} at ${input.time}` : `${input.dayId} at ${input.time} · ${courtText}`,
  };
}

async function createAndSend(input: EventInput) {
  const ref = db.collection("notifications").doc(input.id);
  const created = await db.runTransaction(async (transaction) => {
    if ((await transaction.get(ref)).exists) return false;
    const now = Timestamp.now();
    transaction.create(ref, { ...input, createdAt: now, expiresAt: Timestamp.fromMillis(now.toMillis() + retentionMs) });
    return true;
  });
  if (!created) return;

  const subscriptions = await db.collection("pushSubscriptions").get();
  const link = `/?notification=${encodeURIComponent(input.id)}&day=${input.dayId}&time=${input.time}`;
  await Promise.all(subscriptions.docs.filter((item) => item.id !== input.actorUid).map(async (item) => {
    const data = item.data();
    if (typeof data.token !== "string") return;
    const message = text(input, data.language);
    try {
      await getMessaging().send({
        token: data.token,
        data: { title: message.title, body: message.body, link, notificationId: input.id },
        webpush: { headers: { Urgency: "high" }, fcmOptions: { link } },
      });
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (code.includes("registration-token-not-registered") || code.includes("invalid-registration")) await item.ref.delete();
      else console.error("Push delivery failed", item.id, error);
    }
  }));
}

export const sendDailyReminders = onSchedule({
  schedule: dailyReminderSchedule,
  timeZone: "Asia/Bangkok",
  region: "asia-southeast1",
}, async () => {
  const now = new Date();
  const dayId = bangkokDate(now);
  const runHour = bangkokHour(now);
  const slots = await db.collection("days").doc(dayId).collection("slots").get();
  const occupied = occupiedReminderSlots(slots.docs.map((slot) => slot.data() as SlotData));
  if (!occupied.length) return;
  await createAndSend({
    id: dailyReminderId(dayId, runHour), type: "booking-reminder", dayId,
    time: occupied[0].time, courts: [], reminderSlots: occupied, actorUid: null,
  });
});
 