export type FunctionType = 'src' | 'coord' | 'color' | 'combine' | 'combineCoord';

// MVP: static values only
export type ArgumentValue = { mode: 'static'; value: number };

// Nested source chain used as the first argument of combine / combineCoord functions
export interface SubChain {
  source: FunctionNode;
  transforms: FunctionNode[];
}

export interface FunctionNode {
  name: string;
  type: FunctionType;
  args: ArgumentValue[];
  /** Present iff type is 'combine' | 'combineCoord' — the texture input */
  subChain?: SubChain;
  /** Stable ID for blend/modulate nodes — used to track UI expand state across reorders */
  blendId?: string;
}

export interface Chain {
  id: string;
  source: FunctionNode;
  transforms: FunctionNode[];
  output: 'o0' | 'o1' | 'o2' | 'o3';
}

export interface GlobalSettings {
  bpm: number;
  speed: number;
  renderMode: 'single' | 'quad';
}

export interface Patch {
  chains: Chain[];
  globalSettings: GlobalSettings;
}

// ─── Registry types ───────────────────────────────────────────────────────────

export interface ArgDef {
  name: string;
  default: number;
  min: number;
  max: number;
  step: number;
  description?: string;
}

export interface FunctionDef {
  name: string;
  type: FunctionType;
  args: ArgDef[];
}
