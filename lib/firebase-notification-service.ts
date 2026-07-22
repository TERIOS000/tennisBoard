import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where, writeBatch } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import type { Language } from "@/lib/board";
import { getFirebaseClient } from "@/lib/firebase-client";
import { waitForUser } from "@/lib/firebase-board-service";
import { isActiveNotification, type BoardNotification, type NotificationType } from "@/lib/notification";

export type NotificationSubscription = {
  onData: (notifications: BoardNotification[]) => void;
  onError: (error: Error) => void;
};

export type PushState = "unsupported" | "default" | "denied" | "enabled";

export class FirebaseNotificationService {
  private client = getFirebaseClient();

  async pushState(): Promise<PushState> {
    if (!("Notification" in window) || !(await isSupported())) return "unsupported";
    return Notification.permission === "granted" ? "enabled" : Notification.permission;
  }

  async enablePush(language: Language) {
    if (!("Notification" in window) || !(await isSupported())) return "unsupported" as const;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission;
    const user = await waitForUser(this.client.auth);
    const worker = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(this.client.app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) throw new Error("NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.");

    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: worker });
    if (!token) throw new Error("Push registration did not return a token.");
    await setDoc(doc(this.client.db, "pushSubscriptions", user.uid), {
      uid: user.uid, token, language, updatedAt: serverTimestamp(),
    });
    return "enabled" as const;
  }

  async refreshRegistration(language: Language) {
    if (await this.pushState() !== "enabled") return;
    await this.enablePush(language);
  }

  subscribe(subscription: NotificationSubscription) {
    let events = new Map<string, BoardNotification>();
    let readIds = new Set<string>();
    let currentUid = "";
    let stopEvents = () => {};
    let stopReads = () => {};
    let stopped = false;

    const emit = () => subscription.onData([...events.values()]
      .filter((item) => item.actorUid !== currentUid && isActiveNotification(item.expiresAt))
      .map((item) => ({ ...item, read: readIds.has(item.id) }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));

    void waitForUser(this.client.auth).then((user) => {
      if (stopped) return;
      currentUid = user.uid;
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      stopEvents = onSnapshot(query(collection(this.client.db, "notifications"), where("createdAt", ">=", cutoff)), (snapshot) => {
        events = new Map(snapshot.docs.flatMap((item) => {
          const data = item.data();
          if (!(data.createdAt instanceof Timestamp) || !(data.expiresAt instanceof Timestamp)) return [];
          return [[item.id, {
            id: item.id,
            type: data.type as NotificationType,
            dayId: data.dayId,
            time: data.time,
            courts: Array.isArray(data.courts) ? data.courts : [],
            createdAt: data.createdAt.toDate(),
            expiresAt: data.expiresAt.toDate(),
            actorUid: typeof data.actorUid === "string" ? data.actorUid : null,
            read: false,
            reminderSlots: Array.isArray(data.reminderSlots) ? data.reminderSlots : undefined,
          } satisfies BoardNotification]];
        }));
        emit();
      }, subscription.onError);
      stopReads = onSnapshot(collection(this.client.db, "users", user.uid, "notificationReads"), (snapshot) => {
        readIds = new Set(snapshot.docs.map((item) => item.id));
        emit();
      }, subscription.onError);
    }).catch(subscription.onError);

    return () => { stopped = true; stopEvents(); stopReads(); };
  }

  async markRead(ids: string[]) {
    if (!ids.length) return;
    const user = await waitForUser(this.client.auth);
    const batch = writeBatch(this.client.db);
    for (const id of ids) batch.set(doc(this.client.db, "users", user.uid, "notificationReads", id), {
      notificationId: id, readAt: serverTimestamp(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await batch.commit();
  }

  async onForegroundMessage(callback: () => void) {
    if (!(await isSupported())) return () => {};
    return onMessage(getMessaging(this.client.app), callback);
  }
}

let service: FirebaseNotificationService | undefined;
export function getNotificationService() {
  service ??= new FirebaseNotificationService();
  return service;
}
