import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("defines an installable standalone Tennis Board app", () => {
    expect(manifest()).toMatchObject({
      name: "Tennis Board",
      short_name: "Tennis Board",
      start_url: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#f3f6f4",
      theme_color: "#198754",
      icons: expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    });
  });
});
