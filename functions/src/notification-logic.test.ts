import { describe, expect, it } from "vitest";
import { bangkokDate, classifyChange, courtDelta, shouldSendLateReminder } from "./notification-logic.js";

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
  it("allows a reminder after 3 PM but before play", () => {
    expect(shouldSendLateReminder("2026-07-22", "19:00", new Date("2026-07-22T09:00:00Z"))).toBe(true);
    expect(shouldSendLateReminder("2026-07-22", "19:00", new Date("2026-07-22T12:30:00Z"))).toBe(false);
  });
});
