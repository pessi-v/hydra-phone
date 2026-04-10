import { useState } from "react";
import { usePatchStore } from "../state/patchStore";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";

interface Props {
  chainId: string;
}

export function SourceColumn({ chainId }: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const source = usePatchStore(
    (s) => s.patch.chains.find((c) => c.id === chainId)?.source,
  );
  const setSource = usePatchStore((s) => s.setSource);
  const setSourceArg = usePatchStore((s) => s.setSourceArg);
  const insertTransform = usePatchStore((s) => s.insertTransform);

  if (!source) return null;

  const def = getFunctionDef(source.name);
  const color = CATEGORY_COLORS.src;

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
      {/* Header — tap to replace source */}
      <button
        onClick={() => setReplacePicker(true)}
        style={{
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
            onChange={(v) => setSourceArg(chainId, i, v)}
          />
        ))}
      </div>

      {/* Add transform after source */}
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
        title="Add function"
      >
        • add
      </button>

      {replacePicker && (
        <FunctionPicker
          position="source"
          onSelect={(name) => setSource(chainId, name)}
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => insertTransform(chainId, 0, name)}
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
