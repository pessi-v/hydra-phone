import { useState } from "react";
import { usePatchStore } from "../state/patchStore";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import { BlendIndicator } from "./BlendSubChain";
import type { Chain, FunctionNode } from "../types";

// Navigate path [i0, i1, ...] to get subChain.transforms[subIndex]
function getNodeAtPath(
  chain: Chain,
  path: number[],
  subIndex: number,
): FunctionNode | undefined {
  let node: FunctionNode | undefined = chain.transforms[path[0]];
  for (let i = 1; i < path.length; i++) {
    node = node?.subChain?.transforms[path[i]];
  }
  return node?.subChain?.transforms[subIndex];
}

interface Props {
  chainId: string;
  /** Path to the containing SubChain. e.g. [2] or [2,1] */
  path: number[];
  subIndex: number;
  blendColor: string;
  subChainExpanded?: boolean;
  onToggleSubChain?: () => void;
}

export function SubChainTransformColumn({
  chainId,
  path,
  subIndex,
  blendColor,
  subChainExpanded,
  onToggleSubChain,
}: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const transform = usePatchStore((s) => {
    const chain = s.patch.chains.find((c) => c.id === chainId);
    if (!chain) return undefined;
    return getNodeAtPath(chain, path, subIndex);
  });

  const replaceSubChainTransform = usePatchStore(
    (s) => s.replaceSubChainTransform,
  );
  const removeSubChainTransform = usePatchStore(
    (s) => s.removeSubChainTransform,
  );
  const insertSubChainTransform = usePatchStore(
    (s) => s.insertSubChainTransform,
  );
  const setSubChainTransformArg = usePatchStore(
    (s) => s.setSubChainTransformArg,
  );

  if (!transform) return null;

  const def = getFunctionDef(transform.name);
  const color = CATEGORY_COLORS[transform.type];

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
      {/* Header — tap to replace, × to remove */}
      <div style={{ display: "flex", flexShrink: 0 }}>
        <button
          onClick={() => setReplacePicker(true)}
          style={{
            flex: 1,
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
          }}
          title="Change function"
        >
          {transform.name}
        </button>
        <button
          onClick={() => removeSubChainTransform(chainId, path, subIndex)}
          style={{
            background: color + "aa",
            border: "none",
            borderBottom: `2px solid ${blendColor}`,
            cursor: "pointer",
            color: "#fff",
            fontSize: 12,
            padding: "0 5px",
            flexShrink: 0,
          }}
          title="Remove"
        >
          ×
        </button>
      </div>

      {/* Args */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {def?.args.map((argDef, i) => (
          <SliderRow
            key={argDef.name}
            label={argDef.name}
            value={transform.args[i]?.value ?? argDef.default}
            min={argDef.min}
            max={argDef.max}
            step={argDef.step}
            color={color}
            onChange={(v) =>
              setSubChainTransformArg(chainId, path, subIndex, i, v)
            }
          />
        ))}

        {/* Expand/collapse indicator for nested blend/modulate */}
        {transform.subChain && onToggleSubChain && (
          <div style={{ padding: "0 6px" }}>
            <BlendIndicator
              subChain={transform.subChain}
              expanded={!!subChainExpanded}
              blendColor={color}
              onToggle={onToggleSubChain}
            />
          </div>
        )}

        {def?.args.length === 0 && !transform.subChain && (
          <div
            style={{
              fontSize: 9,
              color: "#455A64",
              textAlign: "center",
              paddingTop: 8,
            }}
          >
            no params
          </div>
        )}
      </div>

      {/* Add sub-chain transform after this one */}
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
        title="Add transform after"
      >
        • add
      </button>

      {replacePicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) =>
            replaceSubChainTransform(chainId, path, subIndex, name)
          }
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) =>
            insertSubChainTransform(chainId, path, subIndex + 1, name)
          }
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
