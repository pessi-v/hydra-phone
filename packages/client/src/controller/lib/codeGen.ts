import type { Patch, Chain, FunctionNode, ArgumentValue } from '../types';

function argToString(arg: ArgumentValue): string {
  // MVP: static only
  return String(arg.value);
}

function nodeToString(node: FunctionNode): string {
  const args = node.args.map(argToString).join(', ');
  return `${node.name}(${args})`;
}

function chainToString(chain: Chain): string {
  const source = nodeToString(chain.source);
  const transforms = chain.transforms
    .filter((t): t is FunctionNode => t !== undefined)
    .map(t => `.${nodeToString(t)}`)
    .join('');
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
