import type { Court, QrImage, SlotRecord, SlotTime } from "@/lib/board";

export type BoardSubscription = {
  onData: (records: SlotRecord[]) => void;
  onError: (error: Error) => void;
};

export interface BoardDataService {
  subscribe(dayIds: string[], subscription: BoardSubscription): () => void;
  saveSlot(dayId: string, time: SlotTime, courts: Court[], images: QrImage[]): Promise<void>;
  clearSlot(dayId: string, time: SlotTime): Promise<void>;
}
