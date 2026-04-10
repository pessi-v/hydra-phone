import type { FunctionDef, FunctionType } from "../types";

// MVP subset — all functions available in Phase 1
const REGISTRY: FunctionDef[] = [
  // ── Sources ──────────────────────────────────────────────────────────────
  {
    name: "osc",
    type: "src",
    args: [
      { name: "frequency", default: 60, min: 0, max: 200, step: 0.5 },
      { name: "sync", default: 0.1, min: -2, max: 2, step: 0.01 },
      { name: "offset", default: 0, min: -3.14, max: 3.14, step: 0.01 },
    ],
  },
  {
    name: "noise",
    type: "src",
    args: [
      { name: "scale", default: 10, min: 0, max: 50, step: 0.1 },
      { name: "offset", default: 0.1, min: -2, max: 2, step: 0.01 },
    ],
  },
  {
    name: "voronoi",
    type: "src",
    args: [
      { name: "scale", default: 5, min: 0, max: 30, step: 0.1 },
      { name: "speed", default: 0.3, min: -5, max: 5, step: 0.05 },
      { name: "blending", default: 0.3, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "shape",
    type: "src",
    args: [
      { name: "sides", default: 3, min: 3, max: 20, step: 1 },
      { name: "radius", default: 0.3, min: 0, max: 1, step: 0.01 },
      { name: "smoothing", default: 0.01, min: 0, max: 0.5, step: 0.005 },
    ],
  },
  {
    name: "gradient",
    type: "src",
    args: [{ name: "speed", default: 0, min: -5, max: 5, step: 0.05 }],
  },
  {
    name: "solid",
    type: "src",
    args: [
      { name: "r", default: 0, min: 0, max: 1, step: 0.01 },
      { name: "g", default: 0, min: 0, max: 1, step: 0.01 },
      { name: "b", default: 0, min: 0, max: 1, step: 0.01 },
      { name: "a", default: 1, min: 0, max: 1, step: 0.01 },
    ],
  },

  // ── Geometry / Coord transforms ──────────────────────────────────────────
  {
    name: "rotate",
    type: "coord",
    args: [
      { name: "angle", default: 10, min: -6.28, max: 6.28, step: 0.01 },
      { name: "speed", default: 0, min: -5, max: 5, step: 0.05 },
    ],
  },
  {
    name: "scale",
    type: "coord",
    args: [
      { name: "amount", default: 1.5, min: 0.01, max: 10, step: 0.05 },
      { name: "xMult", default: 1, min: 0.01, max: 5, step: 0.05 },
      { name: "yMult", default: 1, min: 0.01, max: 5, step: 0.05 },
      { name: "offsetX", default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: "offsetY", default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: "pixelate",
    type: "coord",
    args: [
      { name: "pixelX", default: 20, min: 1, max: 200, step: 1 },
      { name: "pixelY", default: 20, min: 1, max: 200, step: 1 },
    ],
  },
  {
    name: "repeat",
    type: "coord",
    args: [
      { name: "repeatX", default: 3, min: 1, max: 20, step: 0.1 },
      { name: "repeatY", default: 3, min: 1, max: 20, step: 0.1 },
      { name: "offsetX", default: 0, min: -1, max: 1, step: 0.01 },
      { name: "offsetY", default: 0, min: -1, max: 1, step: 0.01 },
    ],
  },
  {
    name: "kaleid",
    type: "coord",
    args: [{ name: "nSides", default: 4, min: 1, max: 20, step: 1 }],
  },
  {
    name: "scroll",
    type: "coord",
    args: [
      { name: "scrollX", default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: "scrollY", default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: "speedX", default: 0, min: -5, max: 5, step: 0.05 },
      { name: "speedY", default: 0, min: -5, max: 5, step: 0.05 },
    ],
  },

  // ── Color transforms ─────────────────────────────────────────────────────
  {
    name: "posterize",
    type: "color",
    args: [
      { name: "bins", default: 3, min: 1, max: 20, step: 1 },
      { name: "gamma", default: 0.6, min: 0.1, max: 3, step: 0.05 },
    ],
  },
  {
    name: "invert",
    type: "color",
    args: [{ name: "amount", default: 1, min: 0, max: 1, step: 0.01 }],
  },
  {
    name: "contrast",
    type: "color",
    args: [{ name: "amount", default: 1.6, min: 0, max: 4, step: 0.05 }],
  },
  {
    name: "brightness",
    type: "color",
    args: [{ name: "amount", default: 0.4, min: -1, max: 2, step: 0.05 }],
  },
  {
    name: "luma",
    type: "color",
    args: [
      { name: "threshold", default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: "tolerance", default: 0.1, min: 0, max: 0.5, step: 0.005 },
    ],
  },
  {
    name: "thresh",
    type: "color",
    args: [
      { name: "threshold", default: 0.5, min: 0, max: 1, step: 0.01 },
      { name: "tolerance", default: 0.04, min: 0, max: 0.5, step: 0.005 },
    ],
  },
  {
    name: "color",
    type: "color",
    args: [
      { name: "r", default: 5, min: 0, max: 255, step: 1 },
      { name: "g", default: 25, min: 0, max: 255, step: 1 },
      { name: "b", default: 40, min: 0, max: 255, step: 1 },
      { name: "a", default: 1, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    name: "saturate",
    type: "color",
    args: [{ name: "amount", default: 2, min: 0, max: 10, step: 0.1 }],
  },
  {
    name: "hue",
    type: "color",
    args: [{ name: "hue", default: 0.4, min: 0, max: 1, step: 0.01 }],
  },
  {
    name: "colorama",
    type: "color",
    args: [{ name: "amount", default: 0.005, min: 0, max: 0.1, step: 0.001 }],
  },

  // ── Blend / Combine ──────────────────────────────────────────────────────
  {
    name: "add",
    type: "combine",
    args: [{ name: "amount", default: 1, min: 0, max: 2, step: 0.01 }],
  },
  {
    name: "sub",
    type: "combine",
    args: [{ name: "amount", default: 1, min: 0, max: 2, step: 0.01 }],
  },
  {
    name: "blend",
    type: "combine",
    args: [{ name: "amount", default: 0.5, min: 0, max: 1, step: 0.01 }],
  },
  {
    name: "mult",
    type: "combine",
    args: [{ name: "amount", default: 1, min: 0, max: 2, step: 0.01 }],
  },
  {
    name: "diff",
    type: "combine",
    args: [],
  },
  {
    name: "layer",
    type: "combine",
    args: [],
  },
  {
    name: "mask",
    type: "combine",
    args: [],
  },

  // ── Modulate / CombineCoord ──────────────────────────────────────────────
  {
    name: "modulate",
    type: "combineCoord",
    args: [{ name: "amount", default: 0.1, min: -1, max: 1, step: 0.005 }],
  },
  {
    name: "modulateScale",
    type: "combineCoord",
    args: [
      { name: "multiple", default: 1, min: 0, max: 5, step: 0.05 },
      { name: "offset", default: 1, min: -2, max: 2, step: 0.05 },
    ],
  },
  {
    name: "modulatePixelate",
    type: "combineCoord",
    args: [
      { name: "multiple", default: 10, min: 1, max: 100, step: 1 },
      { name: "offset", default: 3, min: 0, max: 20, step: 0.5 },
    ],
  },
  {
    name: "modulateRotate",
    type: "combineCoord",
    args: [
      { name: "multiple", default: 1, min: -5, max: 5, step: 0.05 },
      { name: "offset", default: 0, min: -3.14, max: 3.14, step: 0.01 },
    ],
  },
  {
    name: "modulateHue",
    type: "combineCoord",
    args: [{ name: "amount", default: 1, min: 0, max: 5, step: 0.05 }],
  },
  {
    name: "modulateKaleid",
    type: "combineCoord",
    args: [{ name: "nSides", default: 4, min: 1, max: 20, step: 1 }],
  },
  {
    name: "modulateScrollX",
    type: "combineCoord",
    args: [
      { name: "scrollX", default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: "speed", default: 0, min: -5, max: 5, step: 0.05 },
    ],
  },
  {
    name: "modulateScrollY",
    type: "combineCoord",
    args: [
      { name: "scrollY", default: 0.5, min: -1, max: 1, step: 0.01 },
      { name: "speed", default: 0, min: -5, max: 5, step: 0.05 },
    ],
  },
];

// Lookup map for quick access by name
const byName = new Map<string, FunctionDef>(REGISTRY.map((f) => [f.name, f]));

export function getFunctionDef(name: string): FunctionDef | undefined {
  return byName.get(name);
}

export function getFunctionsByType(type: FunctionType): FunctionDef[] {
  return REGISTRY.filter((f) => f.type === type);
}

export function getSourceFunctions(): FunctionDef[] {
  return getFunctionsByType("src");
}

export function getTransformFunctions(): FunctionDef[] {
  return REGISTRY.filter((f) => f.type !== "src");
}

export { REGISTRY };
