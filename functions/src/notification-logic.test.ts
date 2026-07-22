import { describe, expect, it } from "vitest";
import { bangkokDate, classifyChange, shouldSendLateReminder } from "./notification-logic.js";

describe("notification logic", () => {
  it("classifies create, update, clear, and unchanged writes", () => {
    expect(classifyChange(undefined, { courts: ["C1"] })).toBe("booking-created");
    expect(classifyChange({ courts: ["C1"] }, { courts: ["C2"] })).toBe("booking-updated");
    expect(classifyChange({ courts: ["C1"] }, { courts: [] })).toBe("booking-cleared");
    expect(classifyChange({ courts: ["C1"] }, { courts: ["C1"] })).toBeNull();
  });
  it("uses the Bangkok calendar date", () => expect(bangkokDate(new Date("2026-07-21T18:00:00Z"))).toBe("2026-07-22"));
  it("allows a reminder after 3 PM but before play", () => {
    expect(shouldSendLateReminder("2026-07-22", "19:00", new Date("2026-07-22T09:00:00Z"))).toBe(true);
    expect(shouldSendLateReminder("2026-07-22", "19:00", new Date("2026-07-22T12:30:00Z"))).toBe(false);
  });
});
