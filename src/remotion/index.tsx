import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/noto-sans-jp/900.css";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { registerRoot } from "remotion";
import { evaluateAnimationItem } from "../lib/animation";
import type { DiagramElement, DiagramLayer, DiagramStructure, NormalizedAnimationItem, RelationPathCommand } from "../lib/types";
import { VIDEO } from "../lib/constants";

type VideoProps = { imageDataUrl: string; structure: DiagramStructure; animation: NormalizedAnimationItem[]; layerAssets: Record<string, DiagramLayer> };
const blank: VideoProps = { imageDataUrl: "", structure: { title: "", summary: "", elements: [] }, animation: [], layerAssets: {} };

const ARROW_PATHS: Record<string, string> = {
  "south-arrow": "M 1165 790 L 1112 930",
  relation_living_to_work: "M 1140 135 C 1220 150 1295 210 1355 285",
  relation_work_to_time: "M 1418 558 C 1428 620 1418 690 1390 735",
  relation_time_to_quality: "M 1070 970 C 1000 1000 915 1000 850 965",
  relation_quality_to_fans: "M 548 742 C 520 690 500 625 490 575",
  relation_fans_to_living: "M 540 310 C 580 200 655 145 750 130",
  "decrease-trend": "M 805 744 L 948 812 L 1026 812 L 1172 881 L 1256 881 L 1420 946 L 1485 946 L 1565 980"
};

const ARROW_STROKE_WIDTHS: Record<string, number> = {
  "south-arrow": 76,
  "decrease-trend": 34
};

function pathCommand(command: RelationPathCommand): string {
  const x = (value: number) => value / 1000 * VIDEO.width;
  const y = (value: number) => value / 1000 * VIDEO.height;
  if (command.type === "M" || command.type === "L") return `${command.type} ${x(command.x)} ${y(command.y)}`;
  if (command.type === "Q") return `Q ${x(command.cx)} ${y(command.cy)} ${x(command.x)} ${y(command.y)}`;
  if ("cx1" in command) return `C ${x(command.cx1)} ${y(command.cy1)} ${x(command.cx2)} ${y(command.cy2)} ${x(command.x)} ${y(command.y)}`;
  throw new Error("Unsupported relation path command.");
}

function relationPath(element: DiagramElement): { d: string; strokeWidth: number } | undefined {
  if (element.relationPath) {
    return {
      d: element.relationPath.commands.map(pathCommand).join(" "),
      strokeWidth: element.relationPath.strokeWidth / 1000 * VIDEO.height,
    };
  }
  const legacy = ARROW_PATHS[element.id];
  return legacy ? { d: legacy, strokeWidth: ARROW_STROKE_WIDTHS[element.id] ?? 96 } : undefined;
}

function revealClipPath(item: NormalizedAnimationItem, reveal: number): string | undefined {
  const mode = item.revealStyle.mode === "path" ? "clip-x" : item.revealStyle.mode;
  const hidden = Math.round((1 - reveal) * 10000) / 100;
  if (mode === "clip-y") {
    return item.revealStyle.direction === "reverse"
      ? `inset(${hidden}% 0 0 0)`
      : `inset(0 0 ${hidden}% 0)`;
  }
  return item.revealStyle.direction === "reverse"
    ? `inset(0 0 0 ${hidden}%)`
    : `inset(0 ${hidden}% 0 0)`;
}

function DiagramVideo({ imageDataUrl, structure, animation, layerAssets }: VideoProps) {
  const frame = useCurrentFrame();
  const animationById = new Map(animation.map((item) => [item.elementId, item]));
  const finalFrame = animation.reduce((max, item) => Math.max(max, Math.ceil((item.delayMs + item.durationMs) / 1000 * VIDEO.fps)), 0);
  return <AbsoluteFill style={{ backgroundColor: "#f9f9f9", overflow: "hidden", fontFamily: "Noto Sans JP" }}>
    {structure.elements.map((element) => {
      const item = animationById.get(element.id);
      const asset = layerAssets[element.id];
      if (!item || !asset) return null;
      const start = Math.round(item.delayMs / 1000 * VIDEO.fps);
      const duration = Math.max(1, Math.round(item.durationMs / 1000 * VIDEO.fps));
      const progress = Math.min(1, Math.max(0, (frame - start) / duration));
      const state = evaluateAnimationItem(item, progress);
      const transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale}) rotate(${state.rotateDeg}deg)`;
      const left = asset.box.x / 1000 * VIDEO.width;
      const top = asset.box.y / 1000 * VIDEO.height;
      const width = Math.max(4, asset.box.width / 1000 * VIDEO.width);
      const height = Math.max(4, asset.box.height / 1000 * VIDEO.height);
      const pathInfo = item.revealStyle.mode === "path" && element.kind === "relation" ? relationPath(element) : undefined;
      if (pathInfo) {
        const maskId = `path-mask-${element.id}`;
        const dashOffset = item.revealStyle.direction === "reverse" ? state.reveal - 1 : 1 - state.reveal;
        const completedLayerOpacity = Math.min(1, Math.max(0, (state.reveal - 0.85) / 0.15));
        return <svg key={element.id} width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{
          position: "absolute",
          inset: 0,
          opacity: state.opacity,
          transform,
          transformOrigin: `${left + width / 2}px ${top + height / 2}px`,
        }}>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIDEO.width} height={VIDEO.height}>
              <rect x="0" y="0" width={VIDEO.width} height={VIDEO.height} fill="black" />
              <path d={pathInfo.d} fill="none" stroke="white" strokeWidth={pathInfo.strokeWidth} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={dashOffset} />
            </mask>
          </defs>
          <image href={asset.imageDataUrl} x={left} y={top} width={width} height={height} mask={`url(#${maskId})`} />
          <image href={asset.imageDataUrl} x={left} y={top} width={width} height={height} opacity={completedLayerOpacity} />
        </svg>;
      }
      return <img key={element.id} src={asset.imageDataUrl} alt="" style={{
        position: "absolute", left, top, width, height, opacity: state.opacity, transform, clipPath: revealClipPath(item, state.reveal),
      }} />;
    })}
    <img src={imageDataUrl} alt="" style={{ position: "absolute", width: VIDEO.width, height: VIDEO.height, top: 0, left: 0, opacity: frame >= finalFrame ? 1 : 0 }} />
  </AbsoluteFill>;
}

function RemotionRoot() {
  return <Composition id="DiagramVideo" component={DiagramVideo} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.maxSeconds * VIDEO.fps} defaultProps={blank} />;
}

registerRoot(RemotionRoot);
