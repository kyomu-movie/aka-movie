export const DESIGN = {
  white: "#f9f9f9",
  black: "#030303",
  red: "#C00000",
  lightRed: "#EE6E4A",
  lightGray: "#EAEAEA",
  darkGray: "#999999"
} as const;

export const VIDEO = { width: 1920, height: 1080, fps: 30, minSeconds: 8, maxSeconds: 20 } as const;
export const IMAGE = { width: 1536, height: 1024, safeCropTopBottom: 80 } as const;
