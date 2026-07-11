import "@fontsource/noto-sans-jp/700.css";
import "@fontsource/noto-sans-jp/900.css";
import { AbsoluteFill, Composition, interpolate, useCurrentFrame } from "remotion";
import { registerRoot } from "remotion";
import type { AnimationItem, DiagramLayer, DiagramStructure } from "../lib/types";
import { VIDEO } from "../lib/constants";

type VideoProps = { imageDataUrl: string; structure: DiagramStructure; animation: AnimationItem[]; layerAssets: Record<string, DiagramLayer> };
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
      const progress = interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      const offset = (1 - progress) * 48;
      const transform = item.motion === "slide-left" ? `translateX(${-offset}px)` : item.motion === "slide-right" ? `translateX(${offset}px)` : item.motion === "slide-up" ? `translateY(${-offset}px)` : item.motion === "slide-down" ? `translateY(${offset}px)` : "none";
      const opacity = item.motion === "draw" ? 1 : progress;
      const clipPath = item.motion === "draw" ? `inset(0 ${Math.round((1 - progress) * 10000) / 100}% 0 0)` : undefined;
      const left = asset.box.x / 1000 * VIDEO.width;
      const top = asset.box.y / 1000 * VIDEO.height;
      const width = Math.max(4, asset.box.width / 1000 * VIDEO.width);
      const height = Math.max(4, asset.box.height / 1000 * VIDEO.height);
      const arrowPath = element.kind === "relation" ? ARROW_PATHS[element.id] : undefined;
      if (arrowPath) {
        const maskId = `path-mask-${element.id}`;
        return <svg key={element.id} width={VIDEO.width} height={VIDEO.height} viewBox={`0 0 ${VIDEO.width} ${VIDEO.height}`} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={VIDEO.width} height={VIDEO.height}>
              <rect x="0" y="0" width={VIDEO.width} height={VIDEO.height} fill="black" />
              <path d={arrowPath} fill="none" stroke="white" strokeWidth={ARROW_STROKE_WIDTHS[element.id] ?? 96} strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
            </mask>
          </defs>
          <image href={asset.imageDataUrl} x={left} y={top} width={width} height={height} mask={`url(#${maskId})`} />
        </svg>;
      }
      return <img key={element.id} src={asset.imageDataUrl} alt="" style={{ position: "absolute", left, top, width, height, opacity, transform, clipPath }} />;
    })}
    <img src={imageDataUrl} alt="" style={{ position: "absolute", width: VIDEO.width, height: VIDEO.height, top: 0, left: 0, opacity: frame >= finalFrame ? 1 : 0 }} />
  </AbsoluteFill>;
}

function RemotionRoot() {
  return <Composition id="DiagramVideo" component={DiagramVideo} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.maxSeconds * VIDEO.fps} defaultProps={blank} />;
}

registerRoot(RemotionRoot);
