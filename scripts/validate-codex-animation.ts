import { readFile } from "node:fs/promises";
import path from "node:path";
import { describeAnimationTimeline, normalizeAnimation } from "../src/lib/animation";
import type { DiagramStructure } from "../src/lib/types";

async function main(): Promise<void> {
  const id = process.argv[2]?.trim();
  if (!id || !/^\d{6}_\d{2}$/.test(id)) {
    throw new Error("Usage: npm.cmd run codex:validate-animation -- <project-id> (example: 260712_01)");
  }

  const root = process.cwd();
  const structureDir = path.join(root, "export", id, `${id}_構造`);
  const structure = JSON.parse(
    await readFile(path.join(structureDir, "structure.json"), "utf8"),
  ) as DiagramStructure;
  const rawAnimation = JSON.parse(
    await readFile(path.join(structureDir, "animation.json"), "utf8"),
  ) as unknown;
  const animation = normalizeAnimation(structure, rawAnimation);

  console.log("アニメーション設定は有効です。");
  console.log("確認用タイムライン:");
  for (const line of describeAnimationTimeline(structure, animation)) {
    console.log(`- ${line}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
