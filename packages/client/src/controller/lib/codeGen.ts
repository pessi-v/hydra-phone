import type { Patch, Chain, FunctionNode, ArgumentValue, SubChain } from '../types';

function argToString(arg: ArgumentValue): string {
  if (arg.values.length === 1 && arg.arrayChain.length === 0) return String(arg.values[0]);
  let s = `[${arg.values.join(', ')}]`;
  for (const fn of arg.arrayChain) {
    s += `.${fn.name}(${fn.args.join(', ')})`;
  }
  return s;
}

function subChainBodyToString(sc: SubChain): string {
  const source = nodeToString(sc.source);
  const transforms = sc.transforms.map(t => `.${nodeToString(t)}`).join('');
  return `${source}${transforms}`;
}

function nodeToString(node: FunctionNode): string {
  const numericArgs = node.args.map(argToString);
  if (node.subChain) {
    // combine / combineCoord: sub-chain is the first argument, numeric args follow
    const allArgs = [subChainBodyToString(node.subChain), ...numericArgs].join(', ');
    return `${node.name}(${allArgs})`;
  }
  return `${node.name}(${numericArgs.join(', ')})`;
}

function chainToString(chain: Chain): string {
  const source = nodeToString(chain.source);
  const transforms = chain.transforms.map(t => `.${nodeToString(t)}`).join('');
  return `${source}${transforms}.out(${chain.output})`;
}

export function generateCode(patch: Patch, activeOutput: 'o0' | 'o1' | 'o2' | 'o3'): string {
  const lines: string[] = [];

  if (patch.globalSettings.speed !== 1) {
    lines.push(`speed = ${patch.globalSettings.speed}`);
  }
  if (patch.globalSettings.bpm !== 30) {
    lines.push(`bpm = ${patch.globalSettings.bpm}`);
  }

  for (const chain of patch.chains) {
    lines.push(chainToString(chain));
  }

  if (patch.globalSettings.renderMode === 'quad') {
    lines.push('render()');
  } else {
    lines.push(`render(${activeOutput})`);
  }

  return lines.join('\n');
}
