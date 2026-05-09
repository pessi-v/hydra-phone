import type { Patch, Chain, FunctionNode, ArgumentValue, SubChain } from '../types';

function argToString(arg: ArgumentValue): string {
  if (arg.mode === 'static') return String(arg.value);

  // Array mode — emit [v0, v1, ...] with optional chained modifiers.
  // fit() first (transforms values), then smooth/ease, then fast/offset.
  let code = `[${arg.values.join(', ')}]`;
  if (arg.fit !== undefined)                    code += `.fit(${arg.fit[0]}, ${arg.fit[1]})`;
  if (arg.smooth !== undefined && arg.smooth !== 0) code += `.smooth(${arg.smooth})`;
  if (arg.ease !== undefined)                   code += `.ease('${arg.ease}')`;
  if (arg.fast !== undefined && arg.fast !== 1) code += `.fast(${arg.fast})`;
  if (arg.offset !== undefined && arg.offset !== 0) code += `.offset(${arg.offset})`;
  return code;
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
