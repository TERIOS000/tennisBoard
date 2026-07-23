import { onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseClient } from "@/lib/firebase-client";
import type { BoardDataService, BoardSubscription } from "@/lib/board-service";
import { allowedCourts, allowedSlotTimes, type Court, type QrImage, type SlotRecord, type SlotTime } from "@/lib/board";

type StoredImage = Required<Pick<QrImage, "name" | "path" | "url">>;

function slotId(time: SlotTime) {
  return time.replace(":", "");
}

export function waitForUser(auth: Auth) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise<NonNullable<Auth["currentUser"]>>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    }, reject);
    signInAnonymously(auth).catch((error) => {
      unsubscribe();
      reject(error);
    });
  });
}

export class FirebaseBoardService implements BoardDataService {
  private client = getFirebaseClient();

  constructor() {
    void waitForUser(this.client.auth).catch(() => {
      // Save attempts surface authentication failures in the editor.
    });
  }

  subscribe(dayIds: string[], subscription: BoardSubscription) {
    const records = new Map<string, SlotRecord>();
    const unsubscribers = dayIds.map((dayId) =>
      onSnapshot(collection(this.client.db, "days", dayId, "slots"), (snapshot) => {
        for (const key of [...records.keys()]) if (key.startsWith(`${dayId}/`)) records.delete(key);
        for (const item of snapshot.docs) {
          const data = item.data();
          if (!allowedSlotTimes.includes(data.time) || !Array.isArray(data.courts)) continue;
          const courts = data.courts.filter((court: unknown): court is Court =>
            typeof court === "string" && allowedCourts.includes(court as Court)
          );
          const qrImages = Array.isArray(data.qrImages) ? data.qrImages.filter(
            (image: unknown): image is StoredImage => Boolean(image && typeof image === "object" && "name" in image && "path" in image && "url" in image)
          ) : [];
          const record: SlotRecord = {
            dayId,
            time: data.time,
            courts,
            qrImages,
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
            updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : null,
          };
          records.set(`${dayId}/${record.time}`, record);
        }
        subscription.onData([...records.values()]);
      }, (error) => subscription.onError(error))
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  async saveSlot(dayId: string, time: SlotTime, courts: Court[], images: QrImage[]) {
    const user = await waitForUser(this.client.auth);
    const slotRef = doc(this.client.db, "days", dayId, "slots", slotId(time));
    const previous = await getDoc(slotRef);
    const previousImages = (previous.data()?.qrImages ?? []) as StoredImage[];
    const uploaded: StoredImage[] = [];

    try {
      for (const image of images) {
        if (image.path && !image.file) {
          uploaded.push({ name: image.name, path: image.path, url: image.url });
          continue;
        }
        if (!image.file) throw new Error(`Missing file data for ${image.name}.`);
        const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `qr/${dayId}/${slotId(time)}/${crypto.randomUUID()}-${safeName}`;
        const objectRef = ref(this.client.storage, path);
        await uploadBytes(objectRef, image.file, { contentType: image.file.type });
        uploaded.push({ name: image.name, path, url: await getDownloadURL(objectRef) });
      }
      await setDoc(slotRef, {
        time,
        courts: [...courts].sort(),
        qrImages: uploaded,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } catch (error) {
      const newPaths = uploaded.filter((image) => !previousImages.some((old) => old.path === image.path));
      await Promise.allSettled(newPaths.map((image) => deleteObject(ref(this.client.storage, image.path))));
      throw error;
    }

    const keptPaths = new Set(uploaded.map((image) => image.path));
    await Promise.allSettled(previousImages.filter((image) => !keptPaths.has(image.path)).map(
      (image) => deleteObject(ref(this.client.storage, image.path))
    ));
  }

  clearSlot(dayId: string, time: SlotTime) {
    return this.saveSlot(dayId, time, [], []);
  }
}
