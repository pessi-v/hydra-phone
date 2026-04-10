import { useState } from "react";
import { usePatchStore } from "../state/patchStore";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import { BlendSubChain } from "./BlendSubChain";

interface Props {
  chainId: string;
  index: number;
}

export function TransformColumn({ chainId, index }: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const transform = usePatchStore(
    (s) => s.patch.chains.find((c) => c.id === chainId)?.transforms[index],
  );
  const replaceTransform = usePatchStore((s) => s.replaceTransform);
  const removeTransform = usePatchStore((s) => s.removeTransform);
  const insertTransform = usePatchStore((s) => s.insertTransform);
  const setTransformArg = usePatchStore((s) => s.setTransformArg);

  const setSubChainSource = usePatchStore((s) => s.setSubChainSource);
  const setSubChainSourceArg = usePatchStore((s) => s.setSubChainSourceArg);
  const insertSubChainTransform = usePatchStore((s) => s.insertSubChainTransform);
  const replaceSubChainTransform = usePatchStore((s) => s.replaceSubChainTransform);
  const removeSubChainTransform = usePatchStore((s) => s.removeSubChainTransform);
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
          onClick={() => removeTransform(chainId, index)}
          style={{
            background: color + "aa",
            border: "none",
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

      {/* Args + sub-chain (scrollable) */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {/* Numeric args */}
        {def?.args.map((argDef, i) => (
          <SliderRow
            key={argDef.name}
            label={argDef.name}
            value={transform.args[i]?.value ?? argDef.default}
            min={argDef.min}
            max={argDef.max}
            step={argDef.step}
            color={color}
            onChange={(v) => setTransformArg(chainId, index, i, v)}
          />
        ))}

        {/* Sub-chain for combine / combineCoord */}
        {transform.subChain && (
          <div style={{ padding: "0 6px 6px" }}>
            <BlendSubChain
              subChain={transform.subChain}
              blendColor={color}
              onSetSource={(name) => setSubChainSource(chainId, index, name)}
              onSetSourceArg={(ai, v) => setSubChainSourceArg(chainId, index, ai, v)}
              onInsertTransform={(i, name) => insertSubChainTransform(chainId, index, i, name)}
              onReplaceTransform={(i, name) => replaceSubChainTransform(chainId, index, i, name)}
              onRemoveTransform={(i) => removeSubChainTransform(chainId, index, i)}
              onSetTransformArg={(ni, ai, v) => setSubChainTransformArg(chainId, index, ni, ai, v)}
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

      {/* Add transform after this one */}
      <button
        onClick={() => setAddPicker(true)}
        style={{
          background: "transparent",
          border: `1px dashed ${color}66`,
          borderRadius: 4,
          margin: "4px 6px 6px",
          color: color,
          fontSize: 11,
          cursor: "pointer",
          padding: "4px 0",
          flexShrink: 0,
        }}
        title="Add function after"
      >
        • add
      </button>

      {replacePicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => replaceTransform(chainId, index, name)}
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => insertTransform(chainId, index + 1, name)}
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
