export type FunctionType = 'src' | 'coord' | 'color' | 'combine' | 'combineCoord';

// MVP: static values only
export type ArgumentValue = { mode: 'static'; value: number };

export interface FunctionNode {
  name: string;
  type: FunctionType;
  args: ArgumentValue[];
}

export interface Chain {
  id: string;
  source: FunctionNode;
  /** Up to 6 transform slots; undefined = empty slot */
  transforms: (FunctionNode | undefined)[];
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
