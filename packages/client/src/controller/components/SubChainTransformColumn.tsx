import { useState } from "react";
import { usePatchStore } from "../state/patchStore";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";

interface Props {
  chainId: string;
  tIdx: number;      // index of the blend transform in the main chain
  subIndex: number;  // index within the sub-chain's transforms array
  blendColor: string;
}

export function SubChainTransformColumn({ chainId, tIdx, subIndex, blendColor }: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const transform = usePatchStore(
    (s) =>
      s.patch.chains.find((c) => c.id === chainId)?.transforms[tIdx]?.subChain?.transforms[subIndex],
  );
  const replaceSubChainTransform = usePatchStore((s) => s.replaceSubChainTransform);
  const removeSubChainTransform = usePatchStore((s) => s.removeSubChainTransform);
  const insertSubChainTransform = usePatchStore((s) => s.insertSubChainTransform);
  const setSubChainTransformArg = usePatchStore((s) => s.setSubChainTransformArg);

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
          onClick={() => removeSubChainTransform(chainId, tIdx, subIndex)}
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
            onChange={(v) => setSubChainTransformArg(chainId, tIdx, subIndex, i, v)}
          />
        ))}

        {/* Nested blend: show static indicator, no recursive expansion */}
        {transform.subChain && (
          <div
            style={{
              padding: "4px 6px",
              fontSize: 9,
              color: "#607D8B",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            ▶{" "}
            {[transform.subChain.source.name, ...transform.subChain.transforms.map((t) => t.name)].join(
              "·",
            )}
          </div>
        )}

        {def?.args.length === 0 && !transform.subChain && (
          <div style={{ fontSize: 9, color: "#455A64", textAlign: "center", paddingTop: 8 }}>
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
        + add
      </button>

      {replacePicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => replaceSubChainTransform(chainId, tIdx, subIndex, name)}
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => insertSubChainTransform(chainId, tIdx, subIndex + 1, name)}
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
