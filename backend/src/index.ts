import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { afternoonReminderSchedule, bangkokDate, bangkokHour, dailyReminderId, morningReminderSchedule, occupiedReminderSlots, type SlotData } from "./notification-logic.js";

initializeApp();
const db = getFirestore();
const retentionMs = 7 * 24 * 60 * 60 * 1000;

type ReminderSlot = { time: string; courts: unknown[] };
type ReminderInput = {
  id: string;
  type: "booking-reminder";
  dayId: string;
  time: string;
  reminderSlots: ReminderSlot[];
};

function reminderText(input: ReminderInput, language: string) {
  const combined = input.reminderSlots.map((slot) => `${slot.time} ${slot.courts.join(", ")}`).join(" · ");
  if (language === "th") return {
    title: "เตือนการจองคอร์ท",
    body: `${input.dayId} · ${combined}`,
  };
  return {
    title: "Court booking reminder",
    body: `${input.dayId} · ${combined}`,
  };
}

async function createAndSend(input: ReminderInput) {
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
  await Promise.all(subscriptions.docs.map(async (item) => {
    const data = item.data();
    if (typeof data.token !== "string") return;
    const message = reminderText(input, data.language);
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

async function sendDailyReminder() {
  const now = new Date();
  const dayId = bangkokDate(now);
  const runHour = bangkokHour(now);
  const slots = await db.collection("days").doc(dayId).collection("slots").get();
  const occupied = occupiedReminderSlots(slots.docs.map((slot) => slot.data() as SlotData));
  if (!occupied.length) return;
  await createAndSend({
    id: dailyReminderId(dayId, runHour), type: "booking-reminder", dayId,
    time: occupied[0].time, reminderSlots: occupied,
  });
}

const reminderOptions = {
  timeZone: "Asia/Bangkok",
  region: "asia-southeast1",
} as const;

export const sendMorningReminder = onSchedule({
  ...reminderOptions,
  schedule: morningReminderSchedule,
}, sendDailyReminder);

export const sendAfternoonReminder = onSchedule({
  ...reminderOptions,
  schedule: afternoonReminderSchedule,
}, sendDailyReminder);
