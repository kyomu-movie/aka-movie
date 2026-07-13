import { VIDEO } from "./constants";
import type {
  AnimationEasing,
  AnimationItem,
  DiagramElement,
  DiagramStructure,
  KeyframeAnimationItem,
  MotionKind,
  NormalizedAnimationItem,
  NormalizedAnimationKeyframe,
  RelationPathCommand,
  RevealDirection,
  RevealMode,
} from "./types";

export const FINAL_HOLD_MS = 1800;
export const MAX_ANIMATION_END_MS = VIDEO.maxSeconds * 1000 - FINAL_HOLD_MS;

const EASINGS = new Set<AnimationEasing>(["linear", "ease-in", "ease-out", "ease-in-out", "spring-soft"]);
const REVEAL_MODES = new Set<RevealMode>(["clip-x", "clip-y", "path"]);
const REVEAL_DIRECTIONS = new Set<RevealDirection>(["forward", "reverse"]);
const LEGACY_MOTIONS = new Set<MotionKind>(["fade", "draw", "slide-left", "slide-right", "slide-up", "slide-down"]);
const DEFAULT_KEYFRAME: NormalizedAnimationKeyframe = {
  at: 0,
  opacity: 1,
  x: 0,
  y: 0,
  scale: 1,
  rotateDeg: 0,
  reveal: 1,
  easing: "ease-out",
};

type MotionProperty = "opacity" | "x" | "y" | "scale" | "rotateDeg" | "reveal";
type UnknownRecord = Record<string, unknown>;

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} はオブジェクトで指定してください。`);
  return value as UnknownRecord;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} は有限の数値で指定してください。`);
  return value;
}

function ranged(value: unknown, label: string, min: number, max: number): number {
  const number = finiteNumber(value, label);
  if (number < min || number > max) throw new Error(`${label} は ${min}〜${max} の範囲で指定してください。`);
  return number;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  const number = finiteNumber(value, label);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} は ${min}〜${max} の整数で指定してください。`);
  return number;
}

function validatePoint(value: unknown, label: string): number {
  return ranged(value, label, 0, 1000);
}

function validateRelationCommand(value: unknown, index: number): RelationPathCommand {
  const item = record(value, `relationPath.commands[${index}]`);
  const type = item.type;
  if (type === "M" || type === "L") {
    return { type, x: validatePoint(item.x, `${type}.x`), y: validatePoint(item.y, `${type}.y`) };
  }
  if (type === "Q") {
    return {
      type,
      cx: validatePoint(item.cx, "Q.cx"),
      cy: validatePoint(item.cy, "Q.cy"),
      x: validatePoint(item.x, "Q.x"),
      y: validatePoint(item.y, "Q.y"),
    };
  }
  if (type === "C") {
    return {
      type,
      cx1: validatePoint(item.cx1, "C.cx1"),
      cy1: validatePoint(item.cy1, "C.cy1"),
      cx2: validatePoint(item.cx2, "C.cx2"),
      cy2: validatePoint(item.cy2, "C.cy2"),
      x: validatePoint(item.x, "C.x"),
      y: validatePoint(item.y, "C.y"),
    };
  }
  throw new Error(`relationPath.commands[${index}].type は M/L/Q/C のいずれかにしてください。`);
}

function validateElement(element: DiagramElement): void {
  const values = [element.box.x, element.box.y, element.box.width, element.box.height];
  if (values.some((value) => !Number.isFinite(value)) || element.box.x < 0 || element.box.y < 0 || element.box.width <= 0 || element.box.height <= 0 || element.box.x + element.box.width > 1000 || element.box.y + element.box.height > 1000) {
    throw new Error(`構造要素 ${element.id} の box は0〜1000の画面内に収めてください。`);
  }
  if (!element.relationPath) return;
  if (element.kind !== "relation") throw new Error(`relationPath は relation 要素だけに設定できます: ${element.id}`);
  const path = record(element.relationPath, `${element.id}.relationPath`);
  if (!Array.isArray(path.commands) || path.commands.length < 2 || path.commands.length > 32) {
    throw new Error(`${element.id}.relationPath.commands は2〜32個で指定してください。`);
  }
  const commands = path.commands.map(validateRelationCommand);
  if (commands[0].type !== "M" || commands.slice(1).some((command) => command.type === "M")) {
    throw new Error(`${element.id}.relationPath は最初の1個だけを M にしてください。`);
  }
  ranged(path.strokeWidth, `${element.id}.relationPath.strokeWidth`, 1, 120);
}

function easing(value: unknown, label: string, fallback: AnimationEasing): AnimationEasing {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !EASINGS.has(value as AnimationEasing)) {
    throw new Error(`${label} は linear/ease-in/ease-out/ease-in-out/spring-soft のいずれかにしてください。`);
  }
  return value as AnimationEasing;
}

function optionalRange(value: unknown, label: string, min: number, max: number, fallback: number): number {
  return value === undefined ? fallback : ranged(value, label, min, max);
}

function normalizeKeyframes(item: UnknownRecord, element: DiagramElement): NormalizedAnimationItem {
  const elementId = item.elementId;
  if (typeof elementId !== "string" || !elementId) throw new Error("animation.elementId を指定してください。");
  const order = integer(item.order, `${elementId}.order`, 1, 1000);
  const delayMs = integer(item.delayMs, `${elementId}.delayMs`, 0, MAX_ANIMATION_END_MS);
  const durationMs = integer(item.durationMs, `${elementId}.durationMs`, 200, 5000);
  if (!Array.isArray(item.keyframes) || item.keyframes.length < 2 || item.keyframes.length > 8) {
    throw new Error(`${elementId}.keyframes は2〜8個で指定してください。`);
  }

  let previous = DEFAULT_KEYFRAME;
  const keyframes = item.keyframes.map((value, index): NormalizedAnimationKeyframe => {
    const keyframe = record(value, `${elementId}.keyframes[${index}]`);
    const at = ranged(keyframe.at, `${elementId}.keyframes[${index}].at`, 0, 1);
    if (index === 0 && at !== 0) throw new Error(`${elementId} の最初のキーフレームは at: 0 にしてください。`);
    if (index > 0 && at <= previous.at) throw new Error(`${elementId} のキーフレーム時刻は小さい順にしてください。`);
    const normalized: NormalizedAnimationKeyframe = {
      at,
      opacity: optionalRange(keyframe.opacity, `${elementId}.opacity`, 0, 1, previous.opacity),
      x: optionalRange(keyframe.x, `${elementId}.x`, -240, 240, previous.x),
      y: optionalRange(keyframe.y, `${elementId}.y`, -240, 240, previous.y),
      scale: optionalRange(keyframe.scale, `${elementId}.scale`, 0.75, 1.3, previous.scale),
      rotateDeg: optionalRange(keyframe.rotateDeg, `${elementId}.rotateDeg`, -15, 15, previous.rotateDeg),
      reveal: optionalRange(keyframe.reveal, `${elementId}.reveal`, 0, 1, previous.reveal),
      easing: easing(keyframe.easing, `${elementId}.easing`, "ease-out"),
    };
    previous = normalized;
    return normalized;
  });

  const last = keyframes[keyframes.length - 1];
  if (last.at !== 1) throw new Error(`${elementId} の最後のキーフレームは at: 1 にしてください。`);
  if (last.opacity !== 1 || last.x !== 0 || last.y !== 0 || last.scale !== 1 || last.rotateDeg !== 0 || last.reveal !== 1) {
    throw new Error(`${elementId} の最後は opacity:1、x/y/rotateDeg:0、scale/reveal:1 に戻してください。`);
  }

  let mode: RevealMode = "clip-x";
  let direction: RevealDirection = "forward";
  if (item.revealStyle !== undefined) {
    const revealStyle = record(item.revealStyle, `${elementId}.revealStyle`);
    if (typeof revealStyle.mode !== "string" || !REVEAL_MODES.has(revealStyle.mode as RevealMode)) {
      throw new Error(`${elementId}.revealStyle.mode は clip-x/clip-y/path のいずれかにしてください。`);
    }
    mode = revealStyle.mode as RevealMode;
    if (revealStyle.direction !== undefined) {
      if (typeof revealStyle.direction !== "string" || !REVEAL_DIRECTIONS.has(revealStyle.direction as RevealDirection)) {
        throw new Error(`${elementId}.revealStyle.direction は forward/reverse のいずれかにしてください。`);
      }
      direction = revealStyle.direction as RevealDirection;
    }
  }
  if (mode === "path" && (!element.relationPath || element.kind !== "relation")) {
    throw new Error(`${elementId} で path 描画を使う場合は relationPath を設定してください。`);
  }

  return { elementId, order, delayMs, durationMs, keyframes, revealStyle: { mode, direction }, source: "keyframes" };
}

function legacyKeyframes(motion: MotionKind): { keyframes: NormalizedAnimationKeyframe[]; mode: RevealMode } {
  const start: NormalizedAnimationKeyframe = { ...DEFAULT_KEYFRAME, at: 0 };
  if (motion === "fade") start.opacity = 0;
  if (motion === "slide-left") { start.opacity = 0; start.x = -48; }
  if (motion === "slide-right") { start.opacity = 0; start.x = 48; }
  if (motion === "slide-up") { start.opacity = 0; start.y = -48; }
  if (motion === "slide-down") { start.opacity = 0; start.y = 48; }
  if (motion === "draw") start.reveal = 0;
  return { keyframes: [start, { ...DEFAULT_KEYFRAME, at: 1 }], mode: motion === "draw" ? "path" : "clip-x" };
}

function normalizeLegacy(item: UnknownRecord): NormalizedAnimationItem {
  const elementId = item.elementId;
  if (typeof elementId !== "string" || !elementId) throw new Error("animation.elementId を指定してください。");
  if (typeof item.motion !== "string" || !LEGACY_MOTIONS.has(item.motion as MotionKind)) throw new Error(`${elementId}.motion が不正です。`);
  const { keyframes, mode } = legacyKeyframes(item.motion as MotionKind);
  return {
    elementId,
    order: integer(item.order, `${elementId}.order`, 1, 1000),
    delayMs: integer(item.delayMs, `${elementId}.delayMs`, 0, MAX_ANIMATION_END_MS),
    durationMs: integer(item.durationMs, `${elementId}.durationMs`, 200, 5000),
    keyframes,
    revealStyle: { mode, direction: "forward" },
    source: "legacy",
  };
}

export function normalizeAnimation(structure: DiagramStructure, value: unknown): NormalizedAnimationItem[] {
  if (!Array.isArray(value) || !value.length) throw new Error("animation.json には1件以上のアニメーションを設定してください。");
  if (!Array.isArray(structure.elements) || !structure.elements.length) throw new Error("structure.json には1件以上の要素を設定してください。");

  const elementIds = new Set<string>();
  for (const element of structure.elements) {
    if (!element.id || elementIds.has(element.id)) throw new Error(`構造要素のIDが空または重複しています: ${element.id || "(empty)"}`);
    elementIds.add(element.id);
    validateElement(element);
  }

  const elements = new Map(structure.elements.map((element) => [element.id, element]));
  const normalized = value.map((entry, index) => {
    const item = record(entry, `animation[${index}]`);
    const elementId = typeof item.elementId === "string" ? item.elementId : "";
    const element = elements.get(elementId);
    if (!element) throw new Error(`animation.json に存在しない要素IDがあります: ${elementId || "(empty)"}`);
    return Array.isArray(item.keyframes) ? normalizeKeyframes(item, element) : normalizeLegacy(item);
  });

  const animationIds = new Set<string>();
  const orders = new Set<number>();
  for (const item of normalized) {
    if (animationIds.has(item.elementId)) throw new Error(`animation.json の要素IDが重複しています: ${item.elementId}`);
    if (orders.has(item.order)) throw new Error(`animation.json の order が重複しています: ${item.order}`);
    animationIds.add(item.elementId);
    orders.add(item.order);
    if (item.delayMs + item.durationMs > MAX_ANIMATION_END_MS) {
      throw new Error(`${item.elementId} の終了時刻が ${MAX_ANIMATION_END_MS}ms を超えています。完成図の保持時間を確保してください。`);
    }
  }
  const missing = structure.elements.filter((element) => !animationIds.has(element.id)).map((element) => element.id);
  if (missing.length) throw new Error(`animation.json に設定がない要素があります: ${missing.join(", ")}`);
  return normalized;
}

export function applyAnimationEasing(kind: AnimationEasing, rawProgress: number): number {
  const progress = Math.min(1, Math.max(0, rawProgress));
  if (kind === "linear") return progress;
  if (kind === "ease-in") return progress ** 3;
  if (kind === "ease-out") return 1 - (1 - progress) ** 3;
  if (kind === "ease-in-out") return progress < 0.5 ? 4 * progress ** 3 : 1 - ((-2 * progress + 2) ** 3) / 2;
  const softened = 1 - (1 - progress) ** 3 + Math.sin(Math.PI * progress) * (1 - progress) ** 2 * 0.1;
  return Math.min(1, Math.max(0, softened));
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

export function evaluateAnimationItem(item: NormalizedAnimationItem, rawProgress: number): NormalizedAnimationKeyframe {
  const progress = Math.min(1, Math.max(0, rawProgress));
  if (progress <= item.keyframes[0].at) return item.keyframes[0];
  const last = item.keyframes[item.keyframes.length - 1];
  if (progress >= last.at) return last;
  const nextIndex = item.keyframes.findIndex((keyframe) => keyframe.at >= progress);
  const from = item.keyframes[nextIndex - 1];
  const to = item.keyframes[nextIndex];
  const segmentProgress = (progress - from.at) / (to.at - from.at);
  const eased = applyAnimationEasing(from.easing, segmentProgress);
  return {
    at: progress,
    opacity: mix(from.opacity, to.opacity, eased),
    x: mix(from.x, to.x, eased),
    y: mix(from.y, to.y, eased),
    scale: mix(from.scale, to.scale, eased),
    rotateDeg: mix(from.rotateDeg, to.rotateDeg, eased),
    reveal: mix(from.reveal, to.reveal, eased),
    easing: from.easing,
  };
}

export function animationEndMs(animation: Array<{ delayMs: number; durationMs: number }>): number {
  return animation.reduce((max, item) => Math.max(max, item.delayMs + item.durationMs), 0);
}

function motionProperties(item: NormalizedAnimationItem): MotionProperty[] {
  const properties: MotionProperty[] = [];
  if (item.keyframes.some((frame) => frame.opacity !== 1)) properties.push("opacity");
  if (item.keyframes.some((frame) => frame.x !== 0)) properties.push("x");
  if (item.keyframes.some((frame) => frame.y !== 0)) properties.push("y");
  if (item.keyframes.some((frame) => frame.scale !== 1)) properties.push("scale");
  if (item.keyframes.some((frame) => frame.rotateDeg !== 0)) properties.push("rotateDeg");
  if (item.keyframes.some((frame) => frame.reveal !== 1)) properties.push("reveal");
  return properties;
}

const PROPERTY_LABELS: Record<MotionProperty, string> = {
  opacity: "フェード",
  x: "横移動",
  y: "縦移動",
  scale: "拡大・縮小",
  rotateDeg: "回転",
  reveal: "描画",
};

function seconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(1).replace(/\.0$/, "");
}

export function describeAnimationTimeline(structure: DiagramStructure, animation: NormalizedAnimationItem[]): string[] {
  const elements = new Map(structure.elements.map((element) => [element.id, element]));
  return [...animation].sort((a, b) => a.order - b.order).map((item) => {
    const element = elements.get(item.elementId);
    const motions = motionProperties(item).map((property) => PROPERTY_LABELS[property]);
    if (item.keyframes.length > 2) motions.push("途中強調");
    const description = motions.length ? motions.join("＋") : "そのまま表示";
    return `${seconds(item.delayMs)}〜${seconds(item.delayMs + item.durationMs)}秒: ${element?.label ?? item.elementId}を${description}`;
  });
}

export function createAnimationSummary(structure: DiagramStructure, animation: NormalizedAnimationItem[]) {
  const elements = new Map(structure.elements.map((element) => [element.id, element]));
  const formats = new Set(animation.map((item) => item.source));
  return {
    schemaVersion: 2,
    animationFormat: formats.size === 1 ? [...formats][0] : "mixed",
    animationEndMs: animationEndMs(animation),
    finalHoldMs: FINAL_HOLD_MS,
    elements: [...animation].sort((a, b) => a.order - b.order).map((item) => ({
      order: item.order,
      kind: elements.get(item.elementId)?.kind ?? "unknown",
      delayMs: item.delayMs,
      durationMs: item.durationMs,
      keyframeCount: item.keyframes.length,
      motionProperties: motionProperties(item),
      revealMode: item.revealStyle.mode,
      revealDirection: item.revealStyle.direction,
    })),
  };
}

export function isLegacyAnimationItem(value: unknown): value is AnimationItem {
  return Boolean(value && typeof value === "object" && "motion" in value && !("keyframes" in value));
}

export function isKeyframeAnimationItem(value: unknown): value is KeyframeAnimationItem {
  return Boolean(value && typeof value === "object" && "keyframes" in value);
}
