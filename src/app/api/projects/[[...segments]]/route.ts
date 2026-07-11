import { readFile } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { assetPath, extractStructure, generateDiagram, markSuccess, renderVideo, saveAnimation } from "@/lib/workflow";
import { createProject, getProject } from "@/lib/projects";
import type { AnimationItem, ProjectRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments?: string[] }> };

function publicProject(project: ProjectRecord) {
  return {
    ...project,
    imagePath: undefined,
    videoPath: undefined,
    assets: {
      image: project.imagePath ? `/api/projects/${project.id}/asset/image` : undefined,
      video: project.videoPath ? `/api/projects/${project.id}/asset/video` : undefined
    }
  };
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "処理に失敗しました。";
  return NextResponse.json({ error: message }, { status: 400 });
}
async function segments(context: Context) { return (await context.params).segments ?? []; }

export async function GET(_request: NextRequest, context: Context) {
  try {
    const parts = await segments(context);
    if (parts.length === 1) return NextResponse.json(publicProject(await getProject(parts[0])));
    if (parts.length === 3 && parts[1] === "asset") {
      const asset = parts[2];
      if (asset !== "image" && asset !== "video" && asset !== "structure" && asset !== "animation") throw new Error("不正なアセットです。");
      const file = await readFile(assetPath(parts[0], asset));
      const contentType = asset === "image" ? "image/png" : asset === "video" ? "video/mp4" : "application/json; charset=utf-8";
      return new NextResponse(file, { headers: { "Content-Type": contentType, "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
  } catch (error) { return fail(error); }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const parts = await segments(context);
    const body = await request.json().catch(() => ({})) as { script?: string; feedback?: string };
    if (!parts.length) return NextResponse.json(publicProject(await createProject(body.script ?? "")), { status: 201 });
    const [id, action] = parts;
    if (action === "image") return NextResponse.json(publicProject(await generateDiagram(id, body.feedback)));
    if (action === "structure") return NextResponse.json(publicProject(await extractStructure(id, body.feedback)));
    if (action === "render") return NextResponse.json(publicProject(await renderVideo(id)));
    if (action === "success") return NextResponse.json(publicProject(await markSuccess(id)));
    if (action === "chat") {
      const project = await getProject(id);
      const text = body.feedback?.trim() ?? "";
      if (!text) throw new Error("メッセージを入力してください。");
      if (project.stage === "image_review") return NextResponse.json(publicProject(/^ok$/i.test(text) ? await extractStructure(id) : await generateDiagram(id, text)));
      if (project.stage === "structure_review") return NextResponse.json(publicProject(/^ok$/i.test(text) ? await renderVideo(id) : await extractStructure(id, text)));
      throw new Error("この段階ではチャットによる操作を受け付けていません。");
    }
    return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
  } catch (error) { return fail(error); }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const parts = await segments(context);
    if (parts.length !== 2 || parts[1] !== "animation") return NextResponse.json({ error: "見つかりません。" }, { status: 404 });
    const body = await request.json() as { animation?: AnimationItem[] };
    if (!Array.isArray(body.animation)) throw new Error("アニメーション設定がありません。");
    return NextResponse.json(publicProject(await saveAnimation(parts[0], body.animation)));
  } catch (error) { return fail(error); }
}
