import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Patch, Chain, FunctionNode, ArgumentValue, SubChain } from '../types';
import { getFunctionDef } from '../lib/functionRegistry';

function makeNode(fnName: string): FunctionNode {
  const def = getFunctionDef(fnName);
  if (!def) throw new Error(`Unknown function: ${fnName}`);
  const node: FunctionNode = {
    name: def.name,
    type: def.type,
    args: def.args.map((a): ArgumentValue => ({ mode: 'static', value: a.default })),
  };
  if (def.type === 'combine' || def.type === 'combineCoord') {
    node.blendId = nanoid(6);
    node.subChain = { source: makeNode('osc'), transforms: [] };
  }
  return node;
}

function makeChain(sourceName = 'osc'): Chain {
  return {
    id: nanoid(6),
    source: makeNode(sourceName),
    transforms: [],
    output: 'o0',
  };
}

// Immutably update transform at tIdx within a chain
function withTransformNode(
  chain: Chain,
  tIdx: number,
  updater: (t: FunctionNode) => FunctionNode,
): Chain {
  const transforms = [...chain.transforms];
  const t = transforms[tIdx];
  if (!t) return chain;
  transforms[tIdx] = updater(t);
  return { ...chain, transforms };
}

// Immutably update the subChain within a FunctionNode
function withSubChain(
  node: FunctionNode,
  updater: (sc: SubChain) => SubChain,
): FunctionNode {
  if (!node.subChain) return node;
  return { ...node, subChain: updater(node.subChain) };
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

  // Sub-chain (inside combine / combineCoord transforms)
  setSubChainSource(chainId: string, tIdx: number, fnName: string): void;
  setSubChainSourceArg(chainId: string, tIdx: number, argIndex: number, value: number): void;
  insertSubChainTransform(chainId: string, tIdx: number, index: number, fnName: string): void;
  replaceSubChainTransform(chainId: string, tIdx: number, index: number, fnName: string): void;
  removeSubChainTransform(chainId: string, tIdx: number, index: number): void;
  setSubChainTransformArg(chainId: string, tIdx: number, nodeIdx: number, argIdx: number, value: number): void;

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

  // ── Sub-chain actions ────────────────────────────────────────────────────

  setSubChainSource(chainId, tIdx, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => ({ ...sc, source: makeNode(fnName) }))
          );
        }),
      },
    }));
  },

  setSubChainSourceArg(chainId, tIdx, argIndex, value) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => {
              const args = [...sc.source.args];
              args[argIndex] = { mode: 'static', value };
              return { ...sc, source: { ...sc.source, args } };
            })
          );
        }),
      },
    }));
  },

  insertSubChainTransform(chainId, tIdx, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => {
              const transforms = [...sc.transforms];
              transforms.splice(index, 0, makeNode(fnName));
              return { ...sc, transforms };
            })
          );
        }),
      },
    }));
  },

  replaceSubChainTransform(chainId, tIdx, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => {
              const transforms = [...sc.transforms];
              transforms[index] = makeNode(fnName);
              return { ...sc, transforms };
            })
          );
        }),
      },
    }));
  },

  removeSubChainTransform(chainId, tIdx, index) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => ({
              ...sc,
              transforms: sc.transforms.filter((_, i) => i !== index),
            }))
          );
        }),
      },
    }));
  },

  setSubChainTransformArg(chainId, tIdx, nodeIdx, argIdx, value) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return withTransformNode(c, tIdx, t =>
            withSubChain(t, sc => {
              const transforms = [...sc.transforms];
              const node = transforms[nodeIdx];
              if (!node) return sc;
              const args = [...node.args];
              args[argIdx] = { mode: 'static', value };
              transforms[nodeIdx] = { ...node, args };
              return { ...sc, transforms };
            })
          );
        }),
      },
    }));
  },

  // ── Chain-level ──────────────────────────────────────────────────────────

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
