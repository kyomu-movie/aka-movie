import { createClient, type Client } from "@libsql/client";
import type { ProjectRecord } from "@/lib/types";

let client: Client | undefined;
let initialized: Promise<void> | undefined;
function database(): Client { client ??= createClient({ url: "file:data/workflows.db" }); return client; }
async function ready(): Promise<Client> {
  initialized ??= database().execute("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, updated_at TEXT NOT NULL, data TEXT NOT NULL)").then(() => undefined);
  await initialized;
  return database();
}
export async function saveProject(project: ProjectRecord): Promise<void> {
  const db = await ready();
  await db.execute({ sql: "INSERT INTO projects (id, updated_at, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, data = excluded.data", args: [project.id, project.updatedAt, JSON.stringify(project)] });
}
export async function readProject(id: string): Promise<ProjectRecord | undefined> {
  const result = await (await ready()).execute({ sql: "SELECT data FROM projects WHERE id = ?", args: [id] });
  const value = result.rows[0]?.data;
  return typeof value === "string" ? JSON.parse(value) as ProjectRecord : undefined;
}
export async function listProjectIds(): Promise<string[]> {
  const result = await (await ready()).execute("SELECT id FROM projects");
  return result.rows.map((row) => String(row.id));
}
