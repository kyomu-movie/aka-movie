import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const projectId = process.argv[2]?.trim();

if (!projectId || !/^\d{6}_\d{2}$/.test(projectId)) {
  throw new Error("Usage: npm.cmd run codex:share -- <project-id> (example: 260712_01)");
}

const root = process.cwd();
const source = path.join(root, "export", projectId, `${projectId}.mp4`);
const destinationDir = path.join(root, "shared-videos", projectId);
const destination = path.join(destinationDir, `${projectId}.mp4`);
const metadataPath = path.join(destinationDir, "metadata.json");
const reviewPath = path.join(destinationDir, "review-request.md");

await access(source);
await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);

const contents = await readFile(destination);
const metadata = {
  projectId,
  file: `${projectId}.mp4`,
  sha256: createHash("sha256").update(contents).digest("hex"),
  sharedAt: new Date().toISOString()
};
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

try {
  await access(reviewPath);
} catch {
  await writeFile(reviewPath, [
    "# Owner review request",
    "",
    "- Status: Pending owner review",
    "- What was changed or learned: ",
    "- Why it may matter for future videos: ",
    "",
    "This is a review note, not a learning rule. Members must not edit leran_rule/.",
    ""
  ].join("\n"), "utf8");
}

console.log(`Shared video prepared: ${path.relative(root, destination)}`);
