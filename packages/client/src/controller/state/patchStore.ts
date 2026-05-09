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

// ── Recursive path helpers ────────────────────────────────────────────────────
//
// `path` is an array of transform indices that navigates to a SubChain:
//   path = [i0]       → chain.transforms[i0].subChain
//   path = [i0, i1]   → chain.transforms[i0].subChain.transforms[i1].subChain
//   etc.

function applyToSubChain(
  chain: Chain,
  path: number[],
  updater: (sc: SubChain) => SubChain,
): Chain {
  const transforms = [...chain.transforms];
  const node = transforms[path[0]];
  if (!node) return chain;
  transforms[path[0]] = applyToNode(node, path.slice(1), updater);
  return { ...chain, transforms };
}

function applyToNode(
  node: FunctionNode,
  remaining: number[],
  updater: (sc: SubChain) => SubChain,
): FunctionNode {
  if (!node.subChain) return node;
  if (remaining.length === 0) {
    return { ...node, subChain: updater(node.subChain) };
  }
  const subTransforms = [...node.subChain.transforms];
  const child = subTransforms[remaining[0]];
  if (!child) return node;
  subTransforms[remaining[0]] = applyToNode(child, remaining.slice(1), updater);
  return { ...node, subChain: { ...node.subChain, transforms: subTransforms } };
}

interface PatchStore {
  patch: Patch;

  // Source
  setSource(chainId: string, fnName: string): void;
  setSourceArg(chainId: string, argIndex: number, arg: ArgumentValue): void;

  // Transforms — dense array, no gaps
  /** Insert a new transform at `index` (0 = before all transforms) */
  insertTransform(chainId: string, index: number, fnName: string): void;
  /** Replace the function at `index` without changing its position */
  replaceTransform(chainId: string, index: number, fnName: string): void;
  /** Remove transform at `index`; remaining transforms shift left */
  removeTransform(chainId: string, index: number): void;
  setTransformArg(chainId: string, index: number, argIndex: number, arg: ArgumentValue): void;

  // Sub-chain (inside combine / combineCoord transforms)
  // path = [i0, i1, ...] navigates to the SubChain to modify:
  //   [2]    → chain.transforms[2].subChain
  //   [2, 1] → chain.transforms[2].subChain.transforms[1].subChain
  setSubChainSource(chainId: string, path: number[], fnName: string): void;
  setSubChainSourceArg(chainId: string, path: number[], argIndex: number, arg: ArgumentValue): void;
  insertSubChainTransform(chainId: string, path: number[], index: number, fnName: string): void;
  replaceSubChainTransform(chainId: string, path: number[], index: number, fnName: string): void;
  removeSubChainTransform(chainId: string, path: number[], index: number): void;
  setSubChainTransformArg(chainId: string, path: number[], nodeIdx: number, argIdx: number, arg: ArgumentValue): void;

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

  setSourceArg(chainId, argIndex, arg) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const args = [...c.source.args];
          args[argIndex] = arg;
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

  setTransformArg(chainId, index, argIndex, arg) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          const transforms = [...c.transforms];
          const t = transforms[index];
          if (!t) return c;
          const args = [...t.args];
          args[argIndex] = arg;
          transforms[index] = { ...t, args };
          return { ...c, transforms };
        }),
      },
    }));
  },

  // ── Sub-chain actions ────────────────────────────────────────────────────

  setSubChainSource(chainId, path, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => ({ ...sc, source: makeNode(fnName) }));
        }),
      },
    }));
  },

  setSubChainSourceArg(chainId, path, argIndex, arg) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => {
            const args = [...sc.source.args];
            args[argIndex] = arg;
            return { ...sc, source: { ...sc.source, args } };
          });
        }),
      },
    }));
  },

  insertSubChainTransform(chainId, path, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => {
            const transforms = [...sc.transforms];
            transforms.splice(index, 0, makeNode(fnName));
            return { ...sc, transforms };
          });
        }),
      },
    }));
  },

  replaceSubChainTransform(chainId, path, index, fnName) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => {
            const transforms = [...sc.transforms];
            transforms[index] = makeNode(fnName);
            return { ...sc, transforms };
          });
        }),
      },
    }));
  },

  removeSubChainTransform(chainId, path, index) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => ({
            ...sc,
            transforms: sc.transforms.filter((_, i) => i !== index),
          }));
        }),
      },
    }));
  },

  setSubChainTransformArg(chainId, path, nodeIdx, argIdx, arg) {
    set(state => ({
      patch: {
        ...state.patch,
        chains: state.patch.chains.map(c => {
          if (c.id !== chainId) return c;
          return applyToSubChain(c, path, sc => {
            const transforms = [...sc.transforms];
            const node = transforms[nodeIdx];
            if (!node) return sc;
            const args = [...node.args];
            args[argIdx] = arg;
            transforms[nodeIdx] = { ...node, args };
            return { ...sc, transforms };
          });
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
