import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const confirm = process.argv.includes("--confirm");
const root = process.cwd();
const allowedDirectories = ["leran_rule/approved/", "leran_rule/successes/"];

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
      throw new Error("Renamed or copied learning files must be reviewed and committed manually.");
    }
    paths.push(entry.slice(3));
  }
  return paths;
}

function assertApprovedLearningOnly(paths: string[]): void {
  const unrelated = paths.filter((file) => !allowedDirectories.some((directory) => file.startsWith(directory)));
  if (unrelated.length) {
    throw new Error([
      "Only approved rules and success summaries may be published by this command.",
      "Candidates, videos, and unrelated files must not be included:",
      ...unrelated.map((file) => `- ${file}`),
    ].join("\n"));
  }
}

async function validateLearning(): Promise<void> {
  await execFileAsync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", "skill/movie-create/scripts/validate-learning.ps1",
    "-RepoRoot", root,
  ], { cwd: root, windowsHide: true });
}

async function main(): Promise<void> {
  const paths = await changedPaths();
  assertApprovedLearningOnly(paths);
  if (!paths.length) throw new Error("No approved learning changes are ready to publish.");

  console.log("Approved learning files to publish:");
  for (const file of paths) console.log(`- ${file}`);
  console.log("Candidates are intentionally excluded. Members must not run this owner-only command.");
  if (!confirm) {
    console.log("Review the files above. If the owner approves every change, run: npm.cmd run codex:publish-learning -- --confirm");
    return;
  }

  await validateLearning();
  await git(["add", "--", ...allowedDirectories.map((directory) => directory.slice(0, -1))]);
  const staged = (await git(["diff", "--cached", "--name-only"])).split(/\r?\n/).filter(Boolean);
  assertApprovedLearningOnly(staged);
  await git(["diff", "--cached", "--check"]);
  await git(["commit", "-m", "learning: update approved rules"]);
  await git(["push", "origin", "HEAD"]);
  console.log("Approved learning changes were published. Create or update the owner pull request as needed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
