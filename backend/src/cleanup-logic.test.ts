import { describe, expect, it } from "vitest";
import { chunk, cleanupBatchSize, cleanupSchedule, isStaleDay, slotParentDay } from "./cleanup-logic.js";

describe("cleanup logic", () => {
  it("schedules the run shortly after Bangkok midnight", () => {
    expect(cleanupSchedule).toBe("45 0 * * *");
  });

  describe("isStaleDay", () => {
    it("keeps today and future days", () => {
      expect(isStaleDay("2026-08-26", "2026-08-26")).toBe(false);
      expect(isStaleDay("2026-08-27", "2026-08-26")).toBe(false);
    });

    it("marks yesterday and older as stale", () => {
      expect(isStaleDay("2026-08-25", "2026-08-26")).toBe(true);
      expect(isStaleDay("2025-01-01", "2026-08-26")).toBe(true);
    });

    it("crosses month and year boundaries lexicographically", () => {
      expect(isStaleDay("2026-08-31", "2026-09-01")).toBe(true);
      expect(isStaleDay("2026-12-31", "2027-01-01")).toBe(true);
      expect(isStaleDay("2027-01-01", "2026-12-31")).toBe(false);
    });
  });

  describe("slotParentDay", () => {
    it("extracts the day id from a slot document path", () => {
      expect(slotParentDay("days/2026-08-26/slots/1800")).toBe("2026-08-26");
      expect(slotParentDay("days/2026-12-31/slots/2000")).toBe("2026-12-31");
    });

    it("rejects malformed paths", () => {
      expect(slotParentDay("days/not-a-date/slots/1800")).toBeNull();
      expect(slotParentDay("days/2026-8-6/slots/1800")).toBeNull();
      expect(slotParentDay("other/2026-08-26/slots/1800")).toBeNull();
      expect(slotParentDay("days/2026-08-26/extra/slots/1800")).toBeNull();
      expect(slotParentDay("days/2026-08-26")).toBeNull();
      expect(slotParentDay("")).toBeNull();
    });
  });

  describe("chunk", () => {
    it("returns an empty list for empty input", () => {
      expect(chunk([], 3)).toEqual([]);
    });

    it("splits items into even groups", () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("keeps a trailing partial group", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("defaults to the Firestore batch limit and never emits empty groups", () => {
      const groups = chunk(Array.from({ length: cleanupBatchSize + 1 }, (_, index) => index));
      expect(groups).toHaveLength(2);
      expect(groups[0]).toHaveLength(cleanupBatchSize);
      expect(groups[1]).toHaveLength(1);
    });

    it("rejects non-positive sizes", () => {
      expect(() => chunk([1], 0)).toThrow();
      expect(() => chunk([1], -1)).toThrow();
    });
  });
});
