import { createSampleRecords, type Court, type QrImage, type SlotRecord, type SlotTime } from "@/lib/board";
import type { BoardDataService, BoardSubscription } from "@/lib/board-service";

export class LocalBoardService implements BoardDataService {
  private records = createSampleRecords("en");
  private subscriptions = new Set<BoardSubscription>();

  subscribe(dayIds: string[], subscription: BoardSubscription) {
    this.subscriptions.add(subscription);
    subscription.onData(this.records.filter((record) => dayIds.includes(record.dayId)));
    return () => this.subscriptions.delete(subscription);
  }

  async saveSlot(dayId: string, time: SlotTime, courts: Court[], images: QrImage[]) {
    const next: SlotRecord = {
      dayId,
      time,
      courts: [...courts].sort(),
      qrImages: images.map((image) => ({ name: image.name, url: image.url, path: image.path })),
      updatedAt: new Date(),
      updatedBy: "local",
    };
    this.records = [...this.records.filter((record) => record.dayId !== dayId || record.time !== time), next];
    this.notify();
  }

  clearSlot(dayId: string, time: SlotTime) {
    return this.saveSlot(dayId, time, [], []);
  }

  private notify() {
    for (const subscription of this.subscriptions) subscription.onData([...this.records]);
  }
}
