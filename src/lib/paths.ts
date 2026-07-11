import path from "node:path";
import { mkdir } from "node:fs/promises";
import { assertProjectId } from "@/lib/naming";

export const ROOT = process.cwd();
export const REFERENCE_DIR = path.join(ROOT, "reference");
export const EXPORT_DIR = path.join(ROOT, "export");
export const SKILL_DIR = path.join(ROOT, "skill");
// The spelling is part of the requested external folder contract.
export const RULE_DIR = path.join(ROOT, "leran_rule");
export const DATA_DIR = path.join(ROOT, "data");

export async function ensureWorkspaceFolders(): Promise<void> {
  await Promise.all([EXPORT_DIR, SKILL_DIR, RULE_DIR, DATA_DIR].map((folder) => mkdir(folder, { recursive: true })));
}

export function projectPaths(id: string) {
  assertProjectId(id);
  const projectDir = path.join(EXPORT_DIR, id);
  const structureDir = path.join(projectDir, `${id}_構造`);
  return {
    projectDir,
    structureDir,
    image: path.join(structureDir, "generated-image.png"),
    structure: path.join(structureDir, "structure.json"),
    animation: path.join(structureDir, "animation.json"),
    video: path.join(projectDir, `${id}.mp4`)
  };
}
