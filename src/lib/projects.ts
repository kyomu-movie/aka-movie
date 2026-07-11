import { mkdir, writeFile } from "node:fs/promises";
import { listProjectIds, readProject, saveProject } from "@/lib/db";
import { nextProjectId } from "@/lib/naming";
import { ensureWorkspaceFolders, projectPaths } from "@/lib/paths";
import type { ProjectRecord } from "@/lib/types";

export async function createProject(script: string): Promise<ProjectRecord> {
  const normalized = script.trim();
  if (!normalized) throw new Error("台本を入力してください。");
  await ensureWorkspaceFolders();
  const id = nextProjectId(await listProjectIds());
  const paths = projectPaths(id);
  await mkdir(paths.structureDir, { recursive: true });
  const now = new Date().toISOString();
  const project: ProjectRecord = { id, createdAt: now, updatedAt: now, stage: "draft", script: normalized, messages: [{ role: "user", text: normalized, createdAt: now }] };
  await saveProject(project);
  return project;
}
export async function getProject(id: string): Promise<ProjectRecord> {
  const project = await readProject(id);
  if (!project) throw new Error("案件が見つかりません。");
  return project;
}
export async function updateProject(id: string, change: (project: ProjectRecord) => void): Promise<ProjectRecord> {
  const project = await getProject(id);
  change(project);
  project.updatedAt = new Date().toISOString();
  await saveProject(project);
  return project;
}
export async function writeProjectJson(id: string, target: "structure" | "animation", value: unknown): Promise<void> {
  await writeFile(projectPaths(id)[target], JSON.stringify(value, null, 2), "utf8");
}
