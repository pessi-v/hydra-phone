import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Patch, Chain, FunctionNode, ArgumentValue } from '../types';
import { getFunctionDef } from '../lib/functionRegistry';
import { TRANSFORM_SLOTS } from '../lib/constants';

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
    transforms: Array(TRANSFORM_SLOTS).fill(undefined),
    output: 'o0',
  };
}

interface PatchStore {
  patch: Patch;

  // Source actions
  setSource(chainId: string, fnName: string): void;
  setSourceArg(chainId: string, argIndex: number, value: number): void;

  // Transform actions
  setTransform(chainId: string, slot: number, fnName: string): void;
  clearTransform(chainId: string, slot: number): void;
  setTransformArg(chainId: string, slot: number, argIndex: number, value: number): void;

  // Chain-level actions
  setOutput(chainId: string, output: Chain['output']): void;

  // Global
  setRenderMode(mode: Patch['globalSettings']['renderMode']): void;
}

export const usePatchStore = create<PatchStore>((set) => ({
  patch: {
    chains: [makeChain('osc')],
    globalSettings: {
      bpm: 30,
      speed: 1,
      renderMode: 'single',
    },
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

  setTransform(chainId, slot, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          transforms[slot] = makeNode(fnName);
          return { ...c, transforms };
        }),
      },
    }));
  },

  clearTransform(chainId, slot) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          transforms[slot] = undefined;
          return { ...c, transforms };
        }),
      },
    }));
  },

  setTransformArg(chainId, slot, argIndex, value) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          const t = transforms[slot];
          if (!t) return c;
          const args = [...t.args];
          args[argIndex] = { mode: 'static', value };
          transforms[slot] = { ...t, args };
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
