import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { IMAGE, VIDEO } from "@/lib/constants";
import { getVideoDurationFrames } from "@/lib/naming";
import { DATA_DIR, REFERENCE_DIR, ROOT, RULE_DIR, SKILL_DIR, ensureWorkspaceFolders, projectPaths } from "@/lib/paths";
import { getProject, updateProject, writeProjectJson } from "@/lib/projects";
import type { AnimationItem, DiagramElement, DiagramStructure, ElementKind, MotionKind, ProjectRecord } from "@/lib/types";

const allowedKinds = new Set<ElementKind>(["title", "node", "icon", "relation", "annotation", "group"]);
const allowedMotion = new Set<MotionKind>(["fade", "slide-left", "slide-right", "slide-up", "slide-down"]);
let openai: OpenAI | undefined;

function client(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が未設定です。.env.local に設定してから再実行してください。");
  openai ??= new OpenAI({ apiKey });
  return openai;
}

async function jsonFile<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return fallback; }
}

async function buildReferencePack(): Promise<{ contactSheetPath: string; count: number }> {
  await ensureWorkspaceFolders();
  const names = (await readdir(REFERENCE_DIR)).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort((a, b) => a.localeCompare(b, "ja"));
  if (!names.length) throw new Error("reference フォルダに参考画像を入れてください。");
  const width = 320, height = 180;
  const images = await Promise.all(names.map((name) => sharp(path.join(REFERENCE_DIR, name)).resize(width, height, { fit: "cover" }).png().toBuffer()));
  const contactSheetPath = path.join(DATA_DIR, "reference-contact-sheet.png");
  await sharp({ create: { width: width * 4, height: height * 4, channels: 4, background: "#f9f9f9" } })
    .composite(images.map((input, index) => ({ input, left: (index % 4) * width, top: Math.floor(index / 4) * height })))
    .png().toFile(contactSheetPath);
  await Promise.all(names.map((name) => stat(path.join(REFERENCE_DIR, name))));
  return { contactSheetPath, count: names.length };
}

async function promptSkills(stage: "image" | "structure" | "animation"): Promise<string> {
  const entries = await readdir(SKILL_DIR, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(SKILL_DIR, entry.name, "SKILL.md"));
  const texts = await Promise.all(files.map(async (file) => { try { return await readFile(file, "utf8"); } catch { return ""; } }));
  const selected = texts.filter(Boolean).map((text) => text.slice(0, 6000));
  return selected.length ? `\n追加スキル（${stage}）:\n${selected.join("\n\n")}` : "";
}

interface LearnedRule { id: string; stage: string; text: string; createdAt: string; }
const rulesFile = () => path.join(RULE_DIR, "rules.json");
async function learnedRules(): Promise<string[]> { return (await jsonFile<LearnedRule[]>(rulesFile(), [])).slice(-20).map((rule) => rule.text); }
async function recordRule(stage: string, feedback?: string): Promise<void> {
  const text = feedback?.trim();
  if (!text || /^ok$/i.test(text)) return;
  const rules = await jsonFile<LearnedRule[]>(rulesFile(), []);
  rules.push({ id: crypto.randomUUID(), stage, text: `${stage}で守ること: ${text}`, createdAt: new Date().toISOString() });
  await writeFile(rulesFile(), JSON.stringify(rules, null, 2), "utf8");
}

function imagePrompt(script: string, feedback: string | undefined, referenceCount: number, rules: string[], skills: string): string {
  return `あなたは日本語の図解デザイナーです。台本から、横長の1枚の図解画像を作成してください。\n\n台本:\n${script}\n\n参考入力は ${referenceCount} 枚すべてを4×4に並べたスタイルシートです。内容をコピーせず、白地・広い余白・太い黒アイコン・大きい日本語・赤い見出しというテイストだけを参照してください。\n\n必須デザイン: 背景 #f9f9f9、文字とアイコン #030303、主見出し #C00000、補助色 #EE6E4A、薄い罫線 #EAEAEA。本文は Noto Sans JP Black 相当、補助は Noto Sans JP Bold 相当。重要要素は中央の16:9セーフエリア（上下80pxの余白を残す）に置く。図解だけを出力し、余計な写真・透かし・英語のダミーテキストは入れない。\n\n過去ルール:\n${rules.length ? rules.map((rule) => `- ${rule}`).join("\n") : "- なし"}${feedback ? `\n\n今回の修正指示:\n${feedback}` : ""}${skills}`;
}

async function generatePng(script: string, feedback?: string): Promise<Buffer> {
  const pack = await buildReferencePack();
  const rules = await learnedRules();
  const instruction = imagePrompt(script, feedback, pack.count, rules, await promptSkills("image"));
  const reference = await toFile(await readFile(pack.contactSheetPath), "reference-contact-sheet.png", { type: "image/png" });
  const result = await client().images.edit({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    image: reference,
    prompt: instruction,
    size: "1536x1024",
    quality: "high",
    output_format: "png",
    background: "opaque"
  } as never);
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("GPT Image 2 から画像データを受け取れませんでした。");
  return Buffer.from(base64, "base64");
}

function clamp(value: unknown, min = 0, max = 1000): number { return Math.min(max, Math.max(min, Number(value) || 0)); }
function cleanElement(value: unknown, index: number): DiagramElement {
  const item = (value ?? {}) as Record<string, unknown>;
  const kind = allowedKinds.has(item.kind as ElementKind) ? item.kind as ElementKind : "node";
  const sourceBox = (item.box ?? {}) as Record<string, unknown>;
  return {
    id: typeof item.id === "string" && item.id ? item.id.replace(/[^a-zA-Z0-9_-]/g, "-") : `element-${index + 1}`,
    label: typeof item.label === "string" ? item.label.slice(0, 120) : `要素 ${index + 1}`,
    kind,
    box: { x: clamp(sourceBox.x), y: clamp(sourceBox.y), width: clamp(sourceBox.width, 1), height: clamp(sourceBox.height, 1) },
    connectsTo: Array.isArray(item.connectsTo) ? item.connectsTo.filter((target): target is string => typeof target === "string") : [],
    parentId: typeof item.parentId === "string" ? item.parentId : undefined,
    description: typeof item.description === "string" ? item.description.slice(0, 240) : undefined
  };
}

function cleanStructure(value: unknown): DiagramStructure {
  const raw = (value ?? {}) as Record<string, unknown>;
  const elements = Array.isArray(raw.elements) ? raw.elements.map(cleanElement) : [];
  if (!elements.length) throw new Error("図解から構造要素を抽出できませんでした。画像を修正して再試行してください。");
  return { title: typeof raw.title === "string" ? raw.title : "図解", summary: typeof raw.summary === "string" ? raw.summary : "", elements };
}

function defaultAnimation(structure: DiagramStructure): AnimationItem[] {
  const priority: Record<ElementKind, number> = { title: 0, relation: 1, group: 2, icon: 3, node: 4, annotation: 5 };
  let cursor = 0;
  return [...structure.elements].sort((a, b) => priority[a.kind] - priority[b.kind] || a.box.y - b.box.y || a.box.x - b.box.x).map((element, index) => {
    const durationMs = element.kind === "title" ? 700 : 800;
    const motion: MotionKind = element.kind === "title" ? "fade" : element.box.x < 450 ? "slide-left" : element.box.x > 550 ? "slide-right" : "slide-up";
    const item = { elementId: element.id, order: index + 1, motion, durationMs, delayMs: cursor };
    cursor += durationMs + 180;
    return item;
  });
}

async function extractFromImage(image: Buffer, script: string, feedback?: string): Promise<DiagramStructure> {
  const schema = {
    type: "object", additionalProperties: false,
    properties: {
      title: { type: "string" }, summary: { type: "string" },
      elements: { type: "array", items: { type: "object", additionalProperties: false, properties: {
        id: { type: "string" }, label: { type: "string" }, kind: { type: "string" },
        box: { type: "object", additionalProperties: false, properties: { x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["x", "y", "width", "height"] },
        connectsTo: { type: "array", items: { type: "string" } }, parentId: { type: "string" }, description: { type: "string" }
      }, required: ["id", "label", "kind", "box", "connectsTo"] } }
    }, required: ["title", "summary", "elements"]
  };
  const imageUrl = `data:image/png;base64,${image.toString("base64")}`;
  const prompt = `この図解画像を、ステップ型アニメーション用に分解してください。台本: ${script}\n座標は左上を(0,0)、右下を(1000,1000)とした矩形です。タイトル、接続線・矢印、各ノード、注釈を別要素にし、relationは接続先IDをconnectsToへ入れてください。${feedback ? `\n修正指示: ${feedback}` : ""}${await promptSkills("structure")}`;
  const response = await client().responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4",
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: imageUrl, detail: "high" }] }],
    text: { format: { type: "json_schema", name: "diagram_structure", strict: true, schema } }
  } as never);
  return cleanStructure(JSON.parse(response.output_text));
}

function withMessage(project: ProjectRecord, role: "user" | "assistant", text: string): void { project.messages.push({ role, text, createdAt: new Date().toISOString() }); }

export async function generateDiagram(id: string, feedback?: string): Promise<ProjectRecord> {
  const project = await getProject(id);
  await ensureWorkspaceFolders();
  await recordRule("画像生成", feedback);
  const png = await generatePng(project.script, feedback);
  const paths = projectPaths(id);
  await mkdir(paths.structureDir, { recursive: true });
  await writeFile(paths.image, png);
  return updateProject(id, (record) => {
    if (feedback) withMessage(record, "user", feedback);
    record.imagePath = paths.image; record.stage = "image_review"; record.error = undefined;
    withMessage(record, "assistant", feedback ? "修正指示を反映した図解画像を生成しました。内容を確認し、OK または追加の修正指示を入力してください。" : "図解画像を生成しました。内容を確認し、OK または修正指示を入力してください。");
  });
}

export async function extractStructure(id: string, feedback?: string): Promise<ProjectRecord> {
  const project = await getProject(id);
  if (!project.imagePath) throw new Error("先に図解画像を生成してください。");
  await recordRule("構造抽出", feedback);
  const structure = await extractFromImage(await readFile(project.imagePath), project.script, feedback);
  const animation = defaultAnimation(structure);
  await writeProjectJson(id, "structure", structure);
  await writeProjectJson(id, "animation", animation);
  return updateProject(id, (record) => {
    if (feedback) withMessage(record, "user", feedback);
    record.structure = structure; record.animation = animation; record.stage = "structure_review"; record.error = undefined;
    withMessage(record, "assistant", "構造要素と自動アニメーション案を作成しました。右側で順番・動き・秒数を編集し、OK で動画を書き出してください。");
  });
}

export async function saveAnimation(id: string, animation: AnimationItem[]): Promise<ProjectRecord> {
  const project = await getProject(id);
  if (!project.structure) throw new Error("構造を先に抽出してください。");
  const elementIds = new Set(project.structure.elements.map((element) => element.id));
  if (animation.length !== elementIds.size || animation.some((item) => !elementIds.has(item.elementId) || !allowedMotion.has(item.motion))) throw new Error("アニメーション設定が不正です。");
  const cleaned = animation.map((item, index) => ({ elementId: item.elementId, order: index + 1, motion: item.motion, durationMs: Math.min(5000, Math.max(200, Number(item.durationMs) || 800)), delayMs: Math.max(0, Number(item.delayMs) || 0) }));
  await writeProjectJson(id, "animation", cleaned);
  return updateProject(id, (record) => { record.animation = cleaned; });
}

export async function renderVideo(id: string): Promise<ProjectRecord> {
  const project = await getProject(id);
  if (!project.imagePath || !project.structure || !project.animation) throw new Error("画像、構造、アニメーションを確認してから書き出してください。");
  await updateProject(id, (record) => { record.stage = "rendering"; withMessage(record, "assistant", "動画を書き出しています。完了まで少しお待ちください。"); });
  const paths = projectPaths(id);
  try {
    const imageDataUrl = `data:image/png;base64,${(await readFile(project.imagePath)).toString("base64")}`;
    const inputProps = { imageDataUrl, structure: project.structure, animation: project.animation };
    const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "remotion", "index.tsx") });
    const composition = await selectComposition({ serveUrl, id: "DiagramVideo", inputProps });
    await renderMedia({ serveUrl, composition: { ...composition, durationInFrames: getVideoDurationFrames(project.animation) }, codec: "h264", outputLocation: paths.video, inputProps, concurrency: 1, crf: 18 });
    return updateProject(id, (record) => { record.videoPath = paths.video; record.stage = "complete"; record.error = undefined; withMessage(record, "assistant", "mp4の書き出しが完了しました。プレビューして、良ければ成功例として保存できます。"); });
  } catch (error) {
    await updateProject(id, (record) => { record.stage = "failed"; record.error = error instanceof Error ? error.message : "動画の書き出しに失敗しました。"; });
    throw error;
  }
}

export async function markSuccess(id: string): Promise<ProjectRecord> {
  const project = await getProject(id);
  if (!project.videoPath) throw new Error("動画を完成させてから成功例として保存してください。");
  const file = path.join(RULE_DIR, "success-examples.json");
  const examples = await jsonFile<Array<{ id: string; script: string; createdAt: string }>>(file, []);
  if (!examples.some((example) => example.id === id)) examples.push({ id, script: project.script, createdAt: new Date().toISOString() });
  await writeFile(file, JSON.stringify(examples, null, 2), "utf8");
  return updateProject(id, (record) => { record.isSuccessExample = true; withMessage(record, "assistant", "成功例として保存し、次回以降のルール・類似事例参照に利用します。"); });
}

export function assetPath(id: string, asset: "image" | "video" | "structure" | "animation"): string {
  const paths = projectPaths(id);
  return paths[asset];
}
