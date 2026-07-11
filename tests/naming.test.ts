import { describe, expect, it } from "vitest";
import { datePrefix, getVideoDurationFrames, nextProjectId } from "../src/lib/naming";

describe("output naming", () => {
  it("uses yymmdd_2digit naming and increments only the current day", () => {
    const date = new Date("2026-07-10T03:00:00.000Z");
    expect(datePrefix(date)).toBe("260710");
    expect(nextProjectId(["260710_01", "260710_03", "260709_99"], date)).toBe("260710_04");
  });
  it("clamps silent video duration to the configured 8 to 20 second range", () => {
    expect(getVideoDurationFrames([])).toBe(240);
    expect(getVideoDurationFrames([{ elementId: "a", order: 1, motion: "fade", delayMs: 22000, durationMs: 1000 }])).toBe(600);
  });
});
