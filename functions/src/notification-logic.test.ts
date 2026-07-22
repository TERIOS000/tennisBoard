import { describe, expect, it } from "vitest";
import { bangkokDate, bangkokHour, classifyChange, courtDelta, dailyReminderId, dailyReminderSchedule, occupiedReminderSlots } from "./notification-logic.js";

describe("notification logic", () => {
  it("classifies create, update, clear, and unchanged writes", () => {
    expect(classifyChange(undefined, { courts: ["C1"] })).toBe("booking-created");
    expect(classifyChange({ courts: ["C1"] }, { courts: ["C2"] })).toBe("booking-updated");
    expect(classifyChange({ courts: ["C1"] }, { courts: [] })).toBe("booking-cleared");
    expect(classifyChange({ courts: ["C1"] }, { courts: ["C1"] })).toBeNull();
  });
  it("calculates additions, removals, and replacements", () => {
    expect(courtDelta({ courts: ["C1", "C2"] }, { courts: ["C1", "C3", "C4"] })).toEqual({
      addedCourts: ["C3", "C4"], removedCourts: ["C2"],
    });
  });
  it("ignores QR-only changes", () => {
    expect(classifyChange(
      { courts: ["C1"], qrImages: [{ name: "old" }] },
      { courts: ["C1"], qrImages: [{ name: "new" }] },
    )).toBeNull();
  });
  it("uses the Bangkok calendar date", () => expect(bangkokDate(new Date("2026-07-21T18:00:00Z"))).toBe("2026-07-22"));
  it("uses the Bangkok hour for distinct daily summary IDs", () => {
    expect(bangkokHour(new Date("2026-07-22T05:00:00Z"))).toBe("12");
    expect(bangkokHour(new Date("2026-07-22T10:00:00Z"))).toBe("17");
    expect(dailyReminderId("2026-07-22", "12")).toBe("daily-reminder-2026-07-22-12");
    expect(dailyReminderId("2026-07-22", "17")).toBe("daily-reminder-2026-07-22-17");
  });
  it("schedules noon and 5 PM summaries", () => {
    expect(dailyReminderSchedule).toBe("0 12,17 * * *");
  });
  it("keeps only occupied slots and sorts them by time", () => {
    expect(occupiedReminderSlots([
      { time: "20:00", courts: ["C3"] },
      { time: "18:00", courts: ["C1", "C2"] },
      { time: "19:00", courts: [] },
    ])).toEqual([
      { time: "18:00", courts: ["C1", "C2"] },
      { time: "20:00", courts: ["C3"] },
    ]);
    expect(occupiedReminderSlots([])).toEqual([]);
  });
});
