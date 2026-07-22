import { describe, expect, it } from "vitest";
import { isActiveNotification, notificationText, type BoardNotification } from "./notification";

const item: BoardNotification = {
  id: "one", type: "booking-created", dayId: "2026-07-22", time: "19:00",
  courts: ["C2", "C4"], createdAt: new Date("2026-07-22T08:00:00Z"),
  expiresAt: new Date("2026-07-29T08:00:00Z"), actorUid: null, read: false,
};

describe("notifications", () => {
  it("formats English booking details", () => {
    expect(notificationText(item, "en")).toEqual({ title: "New court booking", body: "22 Jul at 19:00 · C2, C4" });
  });

  it("formats cleared bookings without courts", () => {
    expect(notificationText({ ...item, type: "booking-cleared", courts: [] }, "en").body).toBe("22 Jul at 19:00");
  });

  it("filters expired records", () => {
    expect(isActiveNotification(item.expiresAt, new Date("2026-07-29T07:59:59Z"))).toBe(true);
    expect(isActiveNotification(item.expiresAt, new Date("2026-07-29T08:00:00Z"))).toBe(false);
  });

  it("combines all occupied slots in a daily reminder", () => {
    const result = notificationText({ ...item, type: "booking-reminder", reminderSlots: [
      { time: "18:00", courts: ["C1", "C2"] }, { time: "20:00", courts: ["C4"] },
    ] }, "en");
    expect(result.body).toBe("22 Jul · 18:00 C1, C2 · 20:00 C4");
  });

  it("shows added, removed, and current courts", () => {
    const result = notificationText({
      ...item, type: "booking-updated", courts: ["C1", "C3"],
      addedCourts: ["C3"], removedCourts: ["C2"],
    }, "en");
    expect(result.body).toBe("22 Jul at 19:00 · Added C3 · Removed C2 · Current: C1, C3");
  });

  it("omits the current list when a slot is cleared", () => {
    const result = notificationText({
      ...item, type: "booking-cleared", courts: [], addedCourts: [], removedCourts: ["C1", "C2"],
    }, "en");
    expect(result.body).toBe("22 Jul at 19:00 · Removed C1, C2");
  });

  it("formats court deltas in Thai", () => {
    const result = notificationText({
      ...item, type: "booking-updated", courts: ["C1", "C3"],
      addedCourts: ["C3"], removedCourts: ["C2"],
    }, "th");
    expect(result.body).toContain("เพิ่ม C3 · ลบ C2 · ปัจจุบัน: C1, C3");
  });
});
