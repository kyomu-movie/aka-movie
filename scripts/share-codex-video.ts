import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createAnimationSummary, normalizeAnimation } from "../src/lib/animation";
import type { DiagramStructure } from "../src/lib/types";

const projectId = process.argv[2]?.trim();

if (!projectId || !/^\d{6}_\d{2}$/.test(projectId)) {
  throw new Error("Usage: npm.cmd run codex:share -- <project-id> (example: 260712_01)");
}

const root = process.cwd();
const source = path.join(root, "export", projectId, `${projectId}.mp4`);
const destinationDir = path.join(root, "shared-videos", projectId);
const destination = path.join(destinationDir, `${projectId}.mp4`);
const metadataPath = path.join(destinationDir, "metadata.json");
const summaryPath = path.join(destinationDir, "animation-summary.json");
const reviewPath = path.join(destinationDir, "review-request.md");
const structureDir = path.join(root, "export", projectId, `${projectId}_構造`);

async function main(): Promise<void> {
await access(source);
const structure = JSON.parse(await readFile(path.join(structureDir, "structure.json"), "utf8")) as DiagramStructure;
const animation = normalizeAnimation(
  structure,
  JSON.parse(await readFile(path.join(structureDir, "animation.json"), "utf8")) as unknown,
);
const animationSummary = createAnimationSummary(structure, animation);

// Validate every share artifact before creating the Git-visible directory. This
// prevents an invalid animation from leaving a partial shared-videos entry.
await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);
const contents = await readFile(destination);
const metadata = {
  projectId,
  file: `${projectId}.mp4`,
  sha256: createHash("sha256").update(contents).digest("hex"),
  animationSummaryVersion: 2,
  sharedAt: new Date().toISOString()
};
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
await writeFile(summaryPath, `${JSON.stringify(animationSummary, null, 2)}\n`, "utf8");

try {
  await access(reviewPath);
} catch {
  await writeFile(reviewPath, [
    "# オーナー確認依頼",
    "",
    "- 状態: オーナー確認待ち",
    "- 今回行った修正・気付いた事実: ",
    "- 今後の動画でも重要かもしれない理由: ",
    "",
    "これは確認用メモであり学習ルールではありません。メンバーは leran_rule/ を編集しません。",
    ""
  ].join("\n"), "utf8");
}

console.log(`Shared video prepared: ${path.relative(root, destination)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
