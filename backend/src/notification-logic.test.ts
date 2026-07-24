import { describe, expect, it } from "vitest";
import { afternoonReminderSchedule, bangkokDate, bangkokHour, dailyReminderId, morningReminderSchedule, occupiedReminderSlots } from "./notification-logic.js";

describe("notification logic", () => {
  it("uses the Bangkok calendar date", () => expect(bangkokDate(new Date("2026-07-21T18:00:00Z"))).toBe("2026-07-22"));
  it("uses the Bangkok hour for distinct daily summary IDs", () => {
    expect(bangkokHour(new Date("2026-07-22T02:00:00Z"))).toBe("09");
    expect(bangkokHour(new Date("2026-07-22T09:30:00Z"))).toBe("16");
    expect(dailyReminderId("2026-07-22", "09")).toBe("daily-reminder-2026-07-22-09");
    expect(dailyReminderId("2026-07-22", "16")).toBe("daily-reminder-2026-07-22-16");
  });
  it("schedules 9 AM and 4:30 PM summaries", () => {
    expect(morningReminderSchedule).toBe("0 9 * * *");
    expect(afternoonReminderSchedule).toBe("30 16 * * *");
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
