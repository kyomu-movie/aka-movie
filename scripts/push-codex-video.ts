import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectId = process.argv[2]?.trim();

if (!projectId || !/^\d{6}_\d{2}$/.test(projectId)) {
  throw new Error("Usage: npm.cmd run codex:push-video -- <project-id> (example: 260712_01)");
}

const root = process.cwd();
const sharedDirectory = `shared-videos/${projectId}/`;
const sharedVideo = `${sharedDirectory}${projectId}.mp4`;

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd: root, windowsHide: true });
  return stdout;
}

async function changedPaths(): Promise<string[]> {
  const status = await git(["status", "--porcelain=v1", "-z"]);
  const entries = status.split("\0").filter(Boolean);
  const paths: string[] = [];

  for (const entry of entries) {
    const state = entry.slice(0, 2);
    if (state.includes("R") || state.includes("C")) {
      throw new Error("Renamed or copied files are not supported by this sharing command. Share only the finished video folder.");
    }
    paths.push(entry.slice(3));
  }
  return paths;
}

function assertOnlySharedVideo(paths: string[]): void {
  const unrelated = paths.filter((file) => !file.startsWith(sharedDirectory));
  if (unrelated.length) {
    throw new Error([
      "Only the finished video folder can be published by this command.",
      "Commit, stash, or discard these unrelated changes first:",
      ...unrelated.map((file) => `- ${file}`),
    ].join("\n"));
  }
}

async function assertLfsTracking(): Promise<void> {
  const attributes = await git(["check-attr", "filter", "--", sharedVideo]);
  if (!attributes.trim().endsWith("filter: lfs")) {
    throw new Error(`${sharedVideo} is not configured for Git LFS. Ask the repository owner to check .gitattributes.`);
  }
  await execFileAsync("git", ["lfs", "version"], { cwd: root, windowsHide: true });
}

async function hasStagedChanges(): Promise<boolean> {
  try {
    await git(["diff", "--cached", "--quiet"]);
    return false;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
  const branch = (await git(["branch", "--show-current"])).trim();
  const expectedBranch = `video/${projectId}`;
  if (branch !== expectedBranch) {
    throw new Error(`Switch to ${expectedBranch} before sharing this video. Current branch: ${branch || "(none)"}`);
  }

  await access(path.join(root, sharedVideo));
  await access(path.join(root, sharedDirectory, "metadata.json"));
  await access(path.join(root, sharedDirectory, "animation-summary.json"));
  await access(path.join(root, sharedDirectory, "review-request.md"));
  await assertLfsTracking();
  assertOnlySharedVideo(await changedPaths());

  await git(["add", "--", `shared-videos/${projectId}`]);
  const staged = (await git(["diff", "--cached", "--name-only"])).split(/\r?\n/).filter(Boolean);
  assertOnlySharedVideo(staged);

  if (!await hasStagedChanges()) {
    console.log(`Nothing new to publish for ${projectId}.`);
    return;
  }

  await git(["diff", "--cached", "--check"]);
  await git(["commit", "-m", `share: ${projectId}`]);
  await git(["push", "-u", "origin", branch]);
  console.log(`Published ${sharedDirectory} from ${branch}. Create a pull request for owner review next.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
