import { VIDEO } from "./constants";

const TOKYO = "Asia/Tokyo";
export function datePrefix(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TOKYO, year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}`;
}
export function nextProjectId(existingIds: string[], date = new Date()): string {
  const prefix = datePrefix(date);
  const numbers = existingIds.filter((id) => id.startsWith(`${prefix}_`)).map((id) => Number(id.slice(prefix.length + 1))).filter(Number.isFinite);
  return `${prefix}_${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(2, "0")}`;
}
export function assertProjectId(id: string): void { if (!/^\d{6}_\d{2}$/.test(id)) throw new Error("不正な案件IDです。"); }
export function getVideoDurationFrames<T extends { delayMs: number; durationMs: number }>(animation: T[]): number {
  const lastMs = animation.reduce((max, item) => Math.max(max, item.delayMs + item.durationMs), 0);
  return Math.min(VIDEO.maxSeconds, Math.max(VIDEO.minSeconds, Math.ceil((lastMs + 1800) / 1000))) * VIDEO.fps;
}
