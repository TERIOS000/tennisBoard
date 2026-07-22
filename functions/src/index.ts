import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { bangkokDate, classifyChange, courtDelta, shouldSendLateReminder, type NotificationKind, type SlotData } from "./notification-logic.js";

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

export const dispatchBookingChanges = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "Asia/Bangkok",
  region: "asia-southeast1",
}, async () => {
  const now = new Date();
  const start = new Date(`${bangkokDate(now)}T12:00:00Z`);
  const dayIds = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    return day.toISOString().slice(0, 10);
  });

  for (const dayId of dayIds) {
    const slots = await db.collection("days").doc(dayId).collection("slots").get();
    for (const slot of slots.docs) {
      const current = slot.data() as SlotData & { updatedAt?: Timestamp };
      if (!current.time || !(current.updatedAt instanceof Timestamp)) continue;
      const stateRef = db.collection("notificationState").doc(`${dayId}-${slot.id}`);
      const stateSnapshot = await stateRef.get();
      const previous = stateSnapshot.exists
        ? stateSnapshot.data() as SlotData & { updatedAt?: Timestamp }
        : undefined;
      if (!previous && now.getTime() - current.updatedAt.toMillis() > 2 * 60 * 1000) {
        await stateRef.set({ ...current, observedAt: Timestamp.now() });
        continue;
      }
      if (previous?.updatedAt?.isEqual(current.updatedAt)) continue;
      const type = classifyChange(previous, current);
      if (type) {
        const delta = courtDelta(previous, current);
        await createAndSend({
          id: `change-${dayId}-${slot.id}-${current.updatedAt.toMillis()}`,
          type, dayId, time: current.time, courts: current.courts ?? [], actorUid: current.updatedBy ?? null,
          ...delta,
        });
      }
      if ((current.courts?.length ?? 0) > 0 && shouldSendLateReminder(dayId, current.time, now)) {
        await createAndSend({ id: `reminder-${dayId}-${slot.id}`, type: "booking-reminder", dayId, time: current.time, courts: current.courts ?? [], actorUid: null });
      }
      await stateRef.set({ ...current, observedAt: Timestamp.now() });
    }
  }
});

export const sendDailyReminders = onSchedule({
  schedule: "0 15 * * *",
  timeZone: "Asia/Bangkok",
  region: "asia-southeast1",
}, async () => {
  const dayId = bangkokDate(new Date());
  const slots = await db.collection("days").doc(dayId).collection("slots").get();
  const occupied = slots.docs.flatMap((slot) => {
    const data = slot.data() as SlotData;
    return data.time && data.courts?.length ? [{ time: data.time, courts: data.courts }] : [];
  }).sort((left, right) => left.time.localeCompare(right.time));
  if (!occupied.length) return;
  await createAndSend({
    id: `daily-reminder-${dayId}`, type: "booking-reminder", dayId,
    time: occupied[0].time, courts: [], reminderSlots: occupied, actorUid: null,
  });
});
