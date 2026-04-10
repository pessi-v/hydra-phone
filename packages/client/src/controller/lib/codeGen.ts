import type { Patch, Chain, FunctionNode, ArgumentValue, SubChain } from '../types';

function argToString(arg: ArgumentValue): string {
  // MVP: static only
  return String(arg.value);
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

export function generateCode(patch: Patch): string {
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
  }

  return lines.join('\n');
}
