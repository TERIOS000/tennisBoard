import { beforeAll, describe, expect, it } from "vitest";

const firestoreEmulator = "http://127.0.0.1:8080";
const projectId = "courtrao-cleanup-test";
const bucketName = `${projectId}.appspot.com`;

const emulatorUp = await fetch(firestoreEmulator, { signal: AbortSignal.timeout(1500) })
  .then(() => true)
  .catch(() => false);

describe.skipIf(!emulatorUp)("cleanup integration (requires emulators)", () => {
  let runCleanup: () => Promise<void>;
  let db: ReturnType<typeof import("firebase-admin/firestore").getFirestore>;
  let bucket: ReturnType<typeof import("firebase-admin/storage").getStorage>["bucket"];
  const staleDayId = "2026-01-01";
  let todayId = "";

  beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
    process.env.STORAGE_EMULATOR_HOST = "http://127.0.0.1:9199";
    process.env.GCLOUD_PROJECT = projectId;

    const adminApp = await import("firebase-admin/app");
    adminApp.initializeApp({ projectId, storageBucket: bucketName });

    ({ runCleanup } = await import("./index.js"));
    db = (await import("firebase-admin/firestore")).getFirestore();
    bucket = (await import("firebase-admin/storage")).getStorage().bucket(bucketName);

    const { bangkokDate } = await import("./notification-logic.js");
    todayId = bangkokDate(new Date());
  });

  async function seedSlot(dayId: string, imagePath: string) {
    await bucket.file(imagePath).save(Buffer.from(`qr-for-${dayId}`), { contentType: "image/png" });
    await db.doc(`days/${dayId}`).set({ date: dayId });
    await db.doc(`days/${dayId}/slots/1800`).set({
      time: "18:00",
      courts: ["C1"],
      qrImages: [{ name: "qr.png", path: imagePath, url: `https://example.com/${imagePath}` }],
      updatedAt: new Date(),
      updatedBy: "tester",
    });
  }

  async function slotExists(dayId: string) {
    return (await db.doc(`days/${dayId}/slots/1800`).get()).exists;
  }

  async function objectExists(path: string) {
    const [exists] = await bucket.file(path).exists();
    return exists;
  }

  it("deletes stale slots, their images, and parent day docs; keeps today", async () => {
    const staleImage = `qr/${staleDayId}/1800/old.png`;
    const todayImage = `qr/${todayId}/1800/now.png`;
    await seedSlot(staleDayId, staleImage);
    await seedSlot(todayId, todayImage);

    await runCleanup();

    expect(await slotExists(staleDayId)).toBe(false);
    expect((await db.doc(`days/${staleDayId}`).get()).exists).toBe(false);
    expect(await objectExists(staleImage)).toBe(false);

    expect(await slotExists(todayId)).toBe(true);
    expect(await objectExists(todayImage)).toBe(true);
    expect((await db.doc(`days/${todayId}`).get()).exists).toBe(true);
  });
});
