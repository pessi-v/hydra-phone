import type { FunctionType } from "../types";

export const CATEGORY_COLORS: Record<FunctionType, string> = {
  src: "#FD6853",
  coord: "#FFE354",
  color: "#A6FF54",
  combine: "#5BFF6C",
  combineCoord: "#5BFFDF",
};

export const CATEGORY_LABELS: Record<FunctionType, string> = {
  src: "Source",
  coord: "Geometry",
  color: "Color",
  combine: "Blend",
  combineCoord: "Modulate",
};

export const CONTROLS_BG = "#37474F";
export const PAGE_BG = "#1A1A2E";
export const TEXT_PRIMARY = "#FFFFFF";
export const TEXT_SECONDARY = "#B0BEC5";
export const SLIDER_TRACK = "#455A64";

// Default output buffers
export const OUTPUT_BUFFERS = ["o0", "o1", "o2", "o3"] as const;
