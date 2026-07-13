export type WorkflowStage = "draft" | "image_review" | "structure_review" | "rendering" | "complete" | "failed";
export type ElementKind = "title" | "node" | "icon" | "relation" | "annotation" | "group";
export type MotionKind = "fade" | "draw" | "slide-left" | "slide-right" | "slide-up" | "slide-down";
export type AnimationEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring-soft";
export type RevealMode = "clip-x" | "clip-y" | "path";
export type RevealDirection = "forward" | "reverse";

export interface NormalizedBox { x: number; y: number; width: number; height: number; }
export type RelationPathCommand =
  | { type: "M" | "L"; x: number; y: number }
  | { type: "Q"; cx: number; cy: number; x: number; y: number }
  | { type: "C"; cx1: number; cy1: number; cx2: number; cy2: number; x: number; y: number };
export interface RelationPath { commands: RelationPathCommand[]; strokeWidth: number; }
export interface DiagramElement {
  id: string; label: string; kind: ElementKind; box: NormalizedBox; connectsTo: string[]; parentId?: string; description?: string;
  relationPath?: RelationPath;
}
/** Legacy Web/API animation item. Codex-local projects may also use KeyframeAnimationItem. */
export interface AnimationItem { elementId: string; order: number; motion: MotionKind; durationMs: number; delayMs: number; }
export interface AnimationKeyframe {
  at: number;
  opacity?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotateDeg?: number;
  reveal?: number;
  easing?: AnimationEasing;
}
export interface KeyframeAnimationItem {
  elementId: string;
  order: number;
  durationMs: number;
  delayMs: number;
  keyframes: AnimationKeyframe[];
  revealStyle?: { mode: RevealMode; direction?: RevealDirection };
}
export type CodexAnimationItem = AnimationItem | KeyframeAnimationItem;
export interface NormalizedAnimationKeyframe {
  at: number;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  rotateDeg: number;
  reveal: number;
  easing: AnimationEasing;
}
export interface NormalizedAnimationItem {
  elementId: string;
  order: number;
  durationMs: number;
  delayMs: number;
  keyframes: NormalizedAnimationKeyframe[];
  revealStyle: { mode: RevealMode; direction: RevealDirection };
  source: "legacy" | "keyframes";
}
export interface DiagramStructure { title: string; summary: string; elements: DiagramElement[]; }
export interface DiagramLayer { imageDataUrl: string; box: NormalizedBox; }
export interface ProjectRecord {
  id: string; createdAt: string; updatedAt: string; stage: WorkflowStage; script: string; imagePath?: string; videoPath?: string;
  structure?: DiagramStructure; animation?: AnimationItem[]; error?: string; isSuccessExample?: boolean;
  messages: Array<{ role: "user" | "assistant"; text: string; createdAt: string }>;
}
