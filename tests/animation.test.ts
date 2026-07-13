import { describe, expect, it } from "vitest";
import {
  applyAnimationEasing,
  createAnimationSummary,
  describeAnimationTimeline,
  evaluateAnimationItem,
  normalizeAnimation,
} from "../src/lib/animation";
import type { DiagramStructure, RelationPathCommand } from "../src/lib/types";

const structure: DiagramStructure = {
  title: "テスト",
  summary: "",
  elements: [
    {
      id: "node-a",
      label: "機密台本の見出し",
      kind: "node",
      box: { x: 100, y: 200, width: 300, height: 240 },
      connectsTo: ["relation-a"],
    },
    {
      id: "relation-a",
      label: "次へ",
      kind: "relation",
      box: { x: 400, y: 260, width: 300, height: 200 },
      connectsTo: [],
      relationPath: {
        strokeWidth: 30,
        commands: [
          { type: "M", x: 420, y: 300 },
          { type: "C", cx1: 500, cy1: 220, cx2: 620, cy2: 460, x: 700, y: 350 },
        ],
      },
    },
  ],
};

const keyframeAnimation = [
  {
    elementId: "node-a",
    order: 1,
    delayMs: 0,
    durationMs: 1200,
    keyframes: [
      { at: 0, opacity: 0, x: -80, scale: 0.9, easing: "ease-out" },
      { at: 0.7, opacity: 1, x: 0, scale: 1.08, easing: "spring-soft" },
      { at: 1, opacity: 1, x: 0, y: 0, scale: 1, rotateDeg: 0, reveal: 1 },
    ],
  },
  {
    elementId: "relation-a",
    order: 2,
    delayMs: 1200,
    durationMs: 1000,
    revealStyle: { mode: "path", direction: "forward" },
    keyframes: [
      { at: 0, reveal: 0, opacity: 1 },
      { at: 1, reveal: 1, opacity: 1, x: 0, y: 0, scale: 1, rotateDeg: 0 },
    ],
  },
];

describe("adaptive animation schema", () => {
  it("normalizes inherited keyframe properties and evaluates combined motion", () => {
    const animation = normalizeAnimation(structure, keyframeAnimation);
    expect(animation).toHaveLength(2);
    expect(animation[0].source).toBe("keyframes");
    expect(animation[0].keyframes[1].y).toBe(0);
    expect(animation[0].keyframes[1].reveal).toBe(1);

    const start = evaluateAnimationItem(animation[0], 0);
    const middle = evaluateAnimationItem(animation[0], 0.5);
    const end = evaluateAnimationItem(animation[0], 1);
    expect(start.opacity).toBe(0);
    expect(middle.opacity).toBeGreaterThan(0);
    expect(middle.x).toBeGreaterThan(-80);
    expect(end).toMatchObject({ opacity: 1, x: 0, y: 0, scale: 1, rotateDeg: 0, reveal: 1 });
  });

  it("converts legacy motions without changing the stored source format", () => {
    const legacyStructure: DiagramStructure = { ...structure, elements: [structure.elements[0]] };
    const animation = normalizeAnimation(legacyStructure, [
      { elementId: "node-a", order: 1, motion: "slide-left", delayMs: 0, durationMs: 800 },
    ]);
    expect(animation[0].source).toBe("legacy");
    expect(animation[0].keyframes[0]).toMatchObject({ opacity: 0, x: -48 });
    expect(animation[0].keyframes[1]).toMatchObject({ opacity: 1, x: 0 });
  });

  it("describes the plan in Japanese while sharing only sanitized motion facts", () => {
    const animation = normalizeAnimation(structure, keyframeAnimation);
    const timeline = describeAnimationTimeline(structure, animation);
    expect(timeline[0]).toContain("機密台本の見出し");
    expect(timeline[0]).toContain("途中強調");

    const summary = JSON.stringify(createAnimationSummary(structure, animation));
    expect(summary).not.toContain("機密台本");
    expect(summary).not.toContain("node-a");
    expect(summary).toContain('"schemaVersion":2');
    expect(summary).toContain('"revealMode":"path"');
  });

  it("supports every easing with stable endpoints", () => {
    for (const easing of ["linear", "ease-in", "ease-out", "ease-in-out", "spring-soft"] as const) {
      expect(applyAnimationEasing(easing, 0)).toBe(0);
      expect(applyAnimationEasing(easing, 1)).toBe(1);
      expect(applyAnimationEasing(easing, 0.5)).toBeGreaterThan(0);
      expect(applyAnimationEasing(easing, 0.5)).toBeLessThanOrEqual(1);
    }
  });

  it("rejects unsafe ranges, invalid timing, and incomplete elements", () => {
    const unsafe = structuredClone(keyframeAnimation);
    unsafe[0].keyframes[0].scale = 0.5;
    expect(() => normalizeAnimation(structure, unsafe)).toThrow("0.75〜1.3");

    const invalidCoordinate = structuredClone(structure);
    invalidCoordinate.elements[0].box.x = -1;
    expect(() => normalizeAnimation(invalidCoordinate, keyframeAnimation)).toThrow();

    const unsafeRotation = structuredClone(keyframeAnimation);
    (unsafeRotation[0].keyframes[0] as { rotateDeg?: number }).rotateDeg = 16;
    expect(() => normalizeAnimation(structure, unsafeRotation)).toThrow();

    const reversed = structuredClone(keyframeAnimation);
    reversed[0].keyframes[1].at = 0;
    expect(() => normalizeAnimation(structure, reversed)).toThrow();

    const unknownElement = structuredClone(keyframeAnimation);
    unknownElement[0].elementId = "missing-element";
    expect(() => normalizeAnimation(structure, unknownElement)).toThrow();
    const late = structuredClone(keyframeAnimation);
    late[1].delayMs = 18000;
    late[1].durationMs = 500;
    expect(() => normalizeAnimation(structure, late)).toThrow("18200ms");

    expect(() => normalizeAnimation(structure, [keyframeAnimation[0]])).toThrow("設定がない要素");
  });

  it("requires a valid relation path for path reveal", () => {
    const noPath: DiagramStructure = {
      ...structure,
      elements: structure.elements.map((element) => element.id === "relation-a" ? { ...element, relationPath: undefined } : element),
    };
    expect(() => normalizeAnimation(noPath, keyframeAnimation)).toThrow("relationPath");

    const validPaths: RelationPathCommand[][] = [
      [
        { type: "M", x: 100, y: 500 },
        { type: "L", x: 900, y: 500 },
      ],
      [
        { type: "M", x: 100, y: 500 },
        { type: "Q", cx: 500, cy: 100, x: 900, y: 500 },
      ],
      [
        { type: "M", x: 100, y: 500 },
        { type: "C", cx1: 300, cy1: 100, cx2: 700, cy2: 900, x: 900, y: 500 },
      ],
      [
        { type: "M", x: 500, y: 200 },
        { type: "C", cx1: 850, cy1: 200, cx2: 850, cy2: 800, x: 500, y: 800 },
        { type: "C", cx1: 150, cy1: 800, cx2: 150, cy2: 200, x: 500, y: 200 },
      ],
    ];
    for (const commands of validPaths) {
      const withPath = structuredClone(structure);
      const relation = withPath.elements.find((element) => element.id === "relation-a");
      if (!relation) throw new Error("relation-a is missing");
      relation.relationPath = { strokeWidth: 30, commands };
      expect(() => normalizeAnimation(withPath, keyframeAnimation)).not.toThrow();
    }
    const invalidPath: DiagramStructure = {
      ...structure,
      elements: structure.elements.map((element) => element.id === "relation-a" ? {
        ...element,
        relationPath: { strokeWidth: 30, commands: [{ type: "L" as const, x: 0, y: 0 }, { type: "L" as const, x: 100, y: 100 }] },
      } : element),
    };
    expect(() => normalizeAnimation(invalidPath, keyframeAnimation)).toThrow("最初の1個だけを M");
  });
});
