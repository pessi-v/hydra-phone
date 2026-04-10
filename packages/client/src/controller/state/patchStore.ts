import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Patch, Chain, FunctionNode, ArgumentValue } from '../types';
import { getFunctionDef } from '../lib/functionRegistry';

function makeNode(fnName: string): FunctionNode {
  const def = getFunctionDef(fnName);
  if (!def) throw new Error(`Unknown function: ${fnName}`);
  return {
    name: def.name,
    type: def.type,
    args: def.args.map((a): ArgumentValue => ({ mode: 'static', value: a.default })),
  };
}

function makeChain(sourceName = 'osc'): Chain {
  return {
    id: nanoid(6),
    source: makeNode(sourceName),
    transforms: [],
    output: 'o0',
  };
}

interface PatchStore {
  patch: Patch;

  // Source
  setSource(chainId: string, fnName: string): void;
  setSourceArg(chainId: string, argIndex: number, value: number): void;

  // Transforms — dense array, no gaps
  /** Insert a new transform at `index` (0 = before all transforms) */
  insertTransform(chainId: string, index: number, fnName: string): void;
  /** Replace the function at `index` without changing its position */
  replaceTransform(chainId: string, index: number, fnName: string): void;
  /** Remove transform at `index`; remaining transforms shift left */
  removeTransform(chainId: string, index: number): void;
  setTransformArg(chainId: string, index: number, argIndex: number, value: number): void;

  // Chain-level
  setOutput(chainId: string, output: Chain['output']): void;
  setRenderMode(mode: Patch['globalSettings']['renderMode']): void;
}

export const usePatchStore = create<PatchStore>((set) => ({
  patch: {
    chains: [makeChain('osc')],
    globalSettings: { bpm: 30, speed: 1, renderMode: 'single' },
  },

  setSource(chainId, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c =>
          c.id === chainId ? { ...c, source: makeNode(fnName) } : c
        ),
      },
    }));
  },

  setSourceArg(chainId, argIndex, value) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const args = [...c.source.args];
          args[argIndex] = { mode: 'static', value };
          return { ...c, source: { ...c.source, args } };
        }),
      },
    }));
  },

  insertTransform(chainId, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          transforms.splice(index, 0, makeNode(fnName));
          return { ...c, transforms };
        }),
      },
    }));
  },

  replaceTransform(chainId, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          transforms[index] = makeNode(fnName);
          return { ...c, transforms };
        }),
      },
    }));
  },

  removeTransform(chainId, index) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return { ...c, transforms: c.transforms.filter((_, i) => i !== index) };
        }),
      },
    }));
  },

  setTransformArg(chainId, index, argIndex, value) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          const t = transforms[index];
          if (!t) return c;
          const args = [...t.args];
          args[argIndex] = { mode: 'static', value };
          transforms[index] = { ...t, args };
          return { ...c, transforms };
        }),
      },
    }));
  },

  setOutput(chainId, output) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c =>
          c.id === chainId ? { ...c, output } : c
        ),
      },
    }));
  },

  setRenderMode(mode) {
    set(state => ({
      patch: {
        ...state.patch,
        globalSettings: { ...state.patch.globalSettings, renderMode: mode },
      },
    }));
  },
}));
