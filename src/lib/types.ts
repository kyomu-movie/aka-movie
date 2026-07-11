export type WorkflowStage = "draft" | "image_review" | "structure_review" | "rendering" | "complete" | "failed";
export type ElementKind = "title" | "node" | "icon" | "relation" | "annotation" | "group";
export type MotionKind = "fade" | "draw" | "slide-left" | "slide-right" | "slide-up" | "slide-down";

export interface NormalizedBox { x: number; y: number; width: number; height: number; }
export interface DiagramElement {
  id: string; label: string; kind: ElementKind; box: NormalizedBox; connectsTo: string[]; parentId?: string; description?: string;
}
export interface AnimationItem { elementId: string; order: number; motion: MotionKind; durationMs: number; delayMs: number; }
export interface DiagramStructure { title: string; summary: string; elements: DiagramElement[]; }
export interface DiagramLayer { imageDataUrl: string; box: NormalizedBox; }
export interface ProjectRecord {
  id: string; createdAt: string; updatedAt: string; stage: WorkflowStage; script: string; imagePath?: string; videoPath?: string;
  structure?: DiagramStructure; animation?: AnimationItem[]; error?: string; isSuccessExample?: boolean;
  messages: Array<{ role: "user" | "assistant"; text: string; createdAt: string }>;
}
