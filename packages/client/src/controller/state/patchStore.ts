import { signal } from '@preact/signals';
import { nanoid } from 'nanoid';
import type { Patch, Chain, FunctionNode, ArgumentValue, SubChain } from '../types';
import { getFunctionDef } from '../lib/functionRegistry';

function makeNode(fnName: string): FunctionNode {
  const def = getFunctionDef(fnName);
  if (!def) throw new Error(`Unknown function: ${fnName}`);
  const node: FunctionNode = {
    name: def.name,
    type: def.type,
    args: def.args.map((a): ArgumentValue => ({ mode: 'static', values: [a.default] })),
  };
  if (def.type === 'combine' || def.type === 'combineCoord') {
    node.blendId = nanoid(6);
    node.subChain = { source: makeNode('osc'), transforms: [] };
  }
  return node;
}

function makeChain(sourceName = 'osc', output: Chain['output'] = 'o0'): Chain {
  return {
    id: nanoid(6),
    source: makeNode(sourceName),
    transforms: [],
    output,
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

// ── State ─────────────────────────────────────────────────────────────────────

export const patch = signal<Patch>({
  chains: [
    makeChain('osc', 'o0'),
    makeChain('osc', 'o1'),
    makeChain('osc', 'o2'),
    makeChain('osc', 'o3'),
  ],
  globalSettings: { bpm: 30, speed: 1, renderMode: 'single' },
});

export const activeOutput = signal<Chain['output']>('o0');

export function setActiveOutput(output: Chain['output']) {
  activeOutput.value = output;
}

function updateChain(chainId: string, updater: (c: Chain) => Chain) {
  patch.value = {
    ...patch.value,
    chains: patch.value.chains.map(c => c.id === chainId ? updater(c) : c),
  };
}

// ── Source ────────────────────────────────────────────────────────────────────

export function setSource(chainId: string, fnName: string) {
  updateChain(chainId, c => ({ ...c, source: makeNode(fnName) }));
}

export function setSourceArg(chainId: string, argIndex: number, values: number[]) {
  updateChain(chainId, c => {
    const args = [...c.source.args];
    args[argIndex] = { mode: 'static', values };
    return { ...c, source: { ...c.source, args } };
  });
}

// ── Transforms ────────────────────────────────────────────────────────────────

export function insertTransform(chainId: string, index: number, fnName: string) {
  updateChain(chainId, c => {
    const transforms = [...c.transforms];
    transforms.splice(index, 0, makeNode(fnName));
    return { ...c, transforms };
  });
}

export function replaceTransform(chainId: string, index: number, fnName: string) {
  updateChain(chainId, c => {
    const transforms = [...c.transforms];
    transforms[index] = makeNode(fnName);
    return { ...c, transforms };
  });
}

export function removeTransform(chainId: string, index: number) {
  updateChain(chainId, c => ({
    ...c, transforms: c.transforms.filter((_, i) => i !== index),
  }));
}

export function setTransformArg(chainId: string, index: number, argIndex: number, values: number[]) {
  updateChain(chainId, c => {
    const transforms = [...c.transforms];
    const t = transforms[index];
    if (!t) return c;
    const args = [...t.args];
    args[argIndex] = { mode: 'static', values };
    transforms[index] = { ...t, args };
    return { ...c, transforms };
  });
}

// ── Sub-chain actions ─────────────────────────────────────────────────────────

export function setSubChainSource(chainId: string, path: number[], fnName: string) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => ({ ...sc, source: makeNode(fnName) }))
  );
}

export function setSubChainSourceArg(chainId: string, path: number[], argIndex: number, values: number[]) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => {
      const args = [...sc.source.args];
      args[argIndex] = { mode: 'static', values };
      return { ...sc, source: { ...sc.source, args } };
    })
  );
}

export function insertSubChainTransform(chainId: string, path: number[], index: number, fnName: string) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => {
      const transforms = [...sc.transforms];
      transforms.splice(index, 0, makeNode(fnName));
      return { ...sc, transforms };
    })
  );
}

export function replaceSubChainTransform(chainId: string, path: number[], index: number, fnName: string) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => {
      const transforms = [...sc.transforms];
      transforms[index] = makeNode(fnName);
      return { ...sc, transforms };
    })
  );
}

export function removeSubChainTransform(chainId: string, path: number[], index: number) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => ({
      ...sc, transforms: sc.transforms.filter((_, i) => i !== index),
    }))
  );
}

export function setSubChainTransformArg(chainId: string, path: number[], nodeIdx: number, argIdx: number, values: number[]) {
  updateChain(chainId, c =>
    applyToSubChain(c, path, sc => {
      const transforms = [...sc.transforms];
      const node = transforms[nodeIdx];
      if (!node) return sc;
      const args = [...node.args];
      args[argIdx] = { mode: 'static', values };
      transforms[nodeIdx] = { ...node, args };
      return { ...sc, transforms };
    })
  );
}

// ── Chain-level ───────────────────────────────────────────────────────────────

export function setRenderMode(mode: Patch['globalSettings']['renderMode']) {
  patch.value = {
    ...patch.value,
    globalSettings: { ...patch.value.globalSettings, renderMode: mode },
  };
}
