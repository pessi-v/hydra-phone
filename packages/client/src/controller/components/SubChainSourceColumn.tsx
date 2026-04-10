import { useState } from "react";
import { usePatchStore } from "../state/patchStore";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import type { Chain, FunctionNode, SubChain } from "../types";

// Navigate path [i0, i1, ...] → chain.transforms[i0].subChain.transforms[i1].subChain...
function getSubChainAtPath(chain: Chain, path: number[]): SubChain | undefined {
  let node: FunctionNode | undefined = chain.transforms[path[0]];
  for (let i = 1; i < path.length; i++) {
    node = node?.subChain?.transforms[path[i]];
  }
  return node?.subChain;
}

interface Props {
  chainId: string;
  /** Path to the SubChain whose source this column edits. e.g. [2] or [2,1] */
  path: number[];
  blendColor: string;
}

export function SubChainSourceColumn({ chainId, path, blendColor }: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const source = usePatchStore((s) => {
    const chain = s.patch.chains.find((c) => c.id === chainId);
    if (!chain) return undefined;
    return getSubChainAtPath(chain, path)?.source;
  });

  const setSubChainSource = usePatchStore((s) => s.setSubChainSource);
  const setSubChainSourceArg = usePatchStore((s) => s.setSubChainSourceArg);
  const insertSubChainTransform = usePatchStore((s) => s.insertSubChainTransform);

  if (!source) return null;

  const def = getFunctionDef(source.name);
  const color = CATEGORY_COLORS[source.type];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: color + "18",
        borderLeft: `2px solid ${blendColor}88`,
        borderRight: `1px solid ${color}44`,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setReplacePicker(true)}
        style={{
          background: color,
          border: "none",
          borderBottom: `2px solid ${blendColor}`,
          cursor: "pointer",
          padding: "6px 4px",
          textAlign: "center",
          color: "#fff",
          fontSize: 10,
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.05em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title="Change source function"
      >
        {source.name}
      </button>

      {/* Args */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {def?.args.map((argDef, i) => (
          <SliderRow
            key={argDef.name}
            label={argDef.name}
            value={source.args[i]?.value ?? argDef.default}
            min={argDef.min}
            max={argDef.max}
            step={argDef.step}
            color={color}
            onChange={(v) => setSubChainSourceArg(chainId, path, i, v)}
          />
        ))}
      </div>

      {/* Add sub-chain transform */}
      <button
        onClick={() => setAddPicker(true)}
        style={{
          background: "transparent",
          border: `1px dashed ${blendColor}66`,
          borderRadius: 4,
          margin: "4px 6px 6px",
          color: blendColor,
          fontSize: 11,
          cursor: "pointer",
          padding: "4px 0",
          flexShrink: 0,
        }}
        title="Add transform"
      >
        + add
      </button>

      {replacePicker && (
        <FunctionPicker
          position="source"
          onSelect={(name) => setSubChainSource(chainId, path, name)}
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => insertSubChainTransform(chainId, path, 0, name)}
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
