import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import sharp from "sharp";
import { normalizeAnimation } from "../src/lib/animation";
import { VIDEO } from "../src/lib/constants";
import { getVideoDurationFrames } from "../src/lib/naming";
import type { DiagramLayer, DiagramStructure } from "../src/lib/types";

const LAYER_PADDING = 4;
const execFileAsync = promisify(execFile);
const TARGET_BITRATE = 12_000_000;

type FfprobeResult = {
  streams?: Array<{
    codec_name?: string;
    profile?: string;
    pix_fmt?: string;
    width?: number;
    height?: number;
    level?: number;
    avg_frame_rate?: string;
    bit_rate?: string;
    codec_type?: string;
    color_range?: string;
    color_space?: string;
  }>;
  format?: { duration?: string; bit_rate?: string };
};

function bundledMediaBinary(root: string, name: "ffmpeg" | "ffprobe"): string {
  if (process.platform === "win32") return path.join(root, "node_modules", "@remotion", "compositor-win32-x64-msvc", `${name}.exe`);
  return name;
}

async function encodeWindowsHighQuality(root: string, intermediate: string, output: string): Promise<void> {
  await execFileAsync(bundledMediaBinary(root, "ffmpeg"), [
    "-loglevel", "error",
    "-y",
    "-i", intermediate,
    "-map", "0:v:0",
    "-c:v", "libx264",
    "-preset", "slow",
    "-profile:v", "high",
    "-level:v", "4.2",
    "-pix_fmt", "yuv420p",
    "-b:v", "12M",
    "-minrate", "12M",
    "-maxrate", "12M",
    "-bufsize", "24M",
    "-x264-params", "nal-hrd=cbr:force-cfr=1",
    "-g", "60",
    "-keyint_min", "60",
    "-sc_threshold", "0",
    "-color_range", "tv",
    "-colorspace", "bt709",
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-movflags", "+faststart",
    "-an",
    output
  ], { cwd: root, windowsHide: true, maxBuffer: 1024 * 1024 });
}

async function verifyWindowsHighQuality(root: string, video: string, expectedDurationSeconds: number): Promise<number> {
  const { stdout } = await execFileAsync(bundledMediaBinary(root, "ffprobe"), [
    "-v", "error",
    "-show_entries", "format=duration,bit_rate:stream=codec_type,codec_name,profile,level,pix_fmt,width,height,avg_frame_rate,bit_rate,color_range,color_space",
    "-of", "json",
    video
  ], { cwd: root, windowsHide: true, maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout) as FfprobeResult;
  const videoStream = parsed.streams?.find((stream) => stream.codec_type === "video");
  const audioStream = parsed.streams?.find((stream) => stream.codec_type === "audio");
  const duration = Number(parsed.format?.duration);
  const bitrate = Number(parsed.format?.bit_rate ?? videoStream?.bit_rate);
  if (!videoStream || audioStream) throw new Error("最終動画の映像・音声ストリーム構成が不正です。");
  const isHighProfile = videoStream.profile === "High" || videoStream.profile === "100";
  if (videoStream.codec_name !== "h264" || !isHighProfile || videoStream.level !== 42 || videoStream.pix_fmt !== "yuv420p") throw new Error("最終動画がWindows互換のH.264 High／Level 4.2／YUV 4:2:0ではありません。");
  if (videoStream.color_range !== "tv" || videoStream.color_space !== "bt709") throw new Error("最終動画の色空間がBT.709 limited rangeではありません。");
  if (videoStream.width !== VIDEO.width || videoStream.height !== VIDEO.height || videoStream.avg_frame_rate !== `${VIDEO.fps}/1`) throw new Error("最終動画の解像度またはフレームレートが不正です。");
  if (Math.abs(duration - expectedDurationSeconds) > 0.05) throw new Error("最終動画の長さが設定値と一致しません。");
  if (!Number.isFinite(bitrate) || bitrate < TARGET_BITRATE * 0.9 || bitrate > TARGET_BITRATE * 1.1) throw new Error(`最終動画のビットレートが範囲外です: ${bitrate}`);
  return bitrate;
}

async function normalizeSolidRed(image: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const isRed = red >= 140 && red >= green * 1.6 && red >= blue * 1.6;
    if (isRed) {
      data[index] = 192;
      data[index + 1] = 0;
      data[index + 2] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function buildTransparentLayers(image: Buffer, structure: DiagramStructure, layersDir: string): Promise<Record<string, DiagramLayer>> {
  const metadata = await sharp(image).metadata();
  const imageWidth = metadata.width;
  const imageHeight = metadata.height;
  if (!imageWidth || !imageHeight) throw new Error("生成画像のサイズを取得できません。");
  await mkdir(layersDir, { recursive: true });
  const layers: Record<string, DiagramLayer> = {};

  for (const element of structure.elements) {
    const left = Math.max(0, Math.floor(element.box.x / 1000 * imageWidth) - LAYER_PADDING);
    const top = Math.max(0, Math.floor(element.box.y / 1000 * imageHeight) - LAYER_PADDING);
    const right = Math.min(imageWidth, Math.ceil((element.box.x + element.box.width) / 1000 * imageWidth) + LAYER_PADDING);
    const bottom = Math.min(imageHeight, Math.ceil((element.box.y + element.box.height) / 1000 * imageHeight) + LAYER_PADDING);
    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);
    const { data, info } = await sharp(image).extract({ left, top, width, height }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const neutralNearWhite = red >= 247 && green >= 247 && blue >= 247 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 4;
      const redRelationPixel = red >= 120 && red >= green * 1.5 && red >= blue * 1.5;
      if (neutralNearWhite) data[index + 3] = 0;
      if (element.kind === "relation" && !redRelationPixel) data[index + 3] = 0;
      if (element.kind === "group" && redRelationPixel) data[index + 3] = 0;
    }

    const layerPath = path.join(layersDir, `${element.id}.png`);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(layerPath);
    layers[element.id] = {
      imageDataUrl: `data:image/png;base64,${(await readFile(layerPath)).toString("base64")}`,
      box: { x: left / imageWidth * 1000, y: top / imageHeight * 1000, width: width / imageWidth * 1000, height: height / imageHeight * 1000 }
    };
  }
  return layers;
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id || !/^\d{6}_\d{2}$/.test(id)) throw new Error("案件IDを yymmdd_xx 形式で指定してください。");
  const root = process.cwd();
  const projectDir = path.join(root, "export", id);
  const structureDir = path.join(projectDir, `${id}_構造`);
  const project = JSON.parse(await readFile(path.join(structureDir, "project.json"), "utf8")) as { outputDurationSeconds?: number };
  const image = await normalizeSolidRed(await readFile(path.join(structureDir, "generated-image.png")));
  const structure = JSON.parse(await readFile(path.join(structureDir, "structure.json"), "utf8")) as DiagramStructure;
  const animation = normalizeAnimation(structure, JSON.parse(await readFile(path.join(structureDir, "animation.json"), "utf8")) as unknown);
  const layerAssets = await buildTransparentLayers(image, structure, path.join(structureDir, "layers"));
  const inputProps = { imageDataUrl: `data:image/png;base64,${image.toString("base64")}`, structure, animation, layerAssets };
  const serveUrl = await bundle({ entryPoint: path.join(root, "src", "remotion", "index.tsx") });
  const composition = await selectComposition({ serveUrl, id: "DiagramVideo", inputProps });
  const outputLocation = path.join(projectDir, `${id}.mp4`);
  const intermediateLocation = path.join(projectDir, `${id}-intermediate.mov`);
  const stagedOutputLocation = path.join(projectDir, `${id}-high-quality.mp4`);
  if (project.outputDurationSeconds !== undefined && (!Number.isInteger(project.outputDurationSeconds) || project.outputDurationSeconds < VIDEO.minSeconds || project.outputDurationSeconds > VIDEO.maxSeconds)) {
    throw new Error(`outputDurationSeconds は ${VIDEO.minSeconds}〜${VIDEO.maxSeconds} の整数で指定してください。`);
  }
  const durationInFrames = project.outputDurationSeconds ? project.outputDurationSeconds * VIDEO.fps : getVideoDurationFrames(animation);
  if (!Number.isInteger(durationInFrames) || durationInFrames < getVideoDurationFrames(animation)) throw new Error("出力時間がアニメーションより短く設定されています。");
  await renderMedia({
    serveUrl,
    composition: { ...composition, durationInFrames },
    codec: "prores",
    proResProfile: "4444",
    pixelFormat: "yuv444p10le",
    imageFormat: "png",
    preferLossless: true,
    muted: true,
    enforceAudioTrack: false,
    outputLocation: intermediateLocation,
    inputProps,
    concurrency: 1
  });
  await encodeWindowsHighQuality(root, intermediateLocation, stagedOutputLocation);
  const bitrate = await verifyWindowsHighQuality(root, stagedOutputLocation, durationInFrames / VIDEO.fps);
  await copyFile(stagedOutputLocation, outputLocation);
  await unlink(stagedOutputLocation);
  await unlink(intermediateLocation);
  console.log(`${outputLocation} (${Math.round(bitrate / 1_000_000 * 10) / 10} Mbps)`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
