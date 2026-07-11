import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function datePrefix(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}${part("month")}${part("day")}`;
}

async function main(): Promise<void> {
  const script = argument("--script")?.trim();
  if (!script) throw new Error("--script に台本を指定してください。");
  const exportDir = path.join(process.cwd(), "export");
  await mkdir(exportDir, { recursive: true });
  const prefix = datePrefix();
  const ids = (await readdir(exportDir, { withFileTypes: true })).filter((entry) => entry.isDirectory() && new RegExp(`^${prefix}_\\d{2}$`).test(entry.name)).map((entry) => Number(entry.name.slice(prefix.length + 1)));
  const id = `${prefix}_${String((ids.length ? Math.max(...ids) : 0) + 1).padStart(2, "0")}`;
  const projectDir = path.join(exportDir, id);
  const structureDir = path.join(projectDir, `${id}_構造`);
  await mkdir(structureDir, { recursive: true });
  await writeFile(path.join(structureDir, "project.json"), JSON.stringify({ id, script, createdAt: new Date().toISOString(), mode: "codex-local" }, null, 2), "utf8");
  console.log(JSON.stringify({ id, projectDir, structureDir, image: path.join(structureDir, "generated-image.png"), structure: path.join(structureDir, "structure.json"), animation: path.join(structureDir, "animation.json"), video: path.join(projectDir, `${id}.mp4`) }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
