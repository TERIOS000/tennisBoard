import type { BoardDataService } from "@/lib/board-service";
import { FirebaseBoardService } from "@/lib/firebase-board-service";
import { isFirebaseConfigured } from "@/lib/firebase-client";
import { LocalBoardService } from "@/lib/local-board-service";

let service: BoardDataService | undefined;

export function getBoardService() {
  service ??= isFirebaseConfigured ? new FirebaseBoardService() : new LocalBoardService();
  return service;
}
