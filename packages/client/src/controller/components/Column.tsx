import { useState } from "preact/hooks";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import { BlendIndicator } from "./SubChain";
import type { FunctionNode } from "../types";

interface Props {
  node: FunctionNode;
  kind: "source" | "transform";
  blendColor?: string;
  subChainExpanded?: boolean;
  onReplace: (name: string) => void;
  onRemove?: () => void;
  onArgChange: (i: number, values: number[]) => void;
  onAdd: (name: string) => void;
  onToggleSubChain?: () => void;
}

export function Column({
  node,
  kind,
  blendColor,
  subChainExpanded,
  onReplace,
  onRemove,
  onArgChange,
  onAdd,
  onToggleSubChain,
}: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);

  const def = getFunctionDef(node.name);
  const color = CATEGORY_COLORS[node.type];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: color + "18",
        borderLeft: blendColor ? `2px solid ${blendColor}88` : undefined,
        borderRight: `1px solid ${color}44`,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", flexShrink: 0 }}>
        <button
          onClick={() => setReplacePicker(true)}
          style={{
            flex: 1,
            background: color,
            border: "none",
            borderBottom: blendColor ? `2px solid ${blendColor}` : undefined,
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
          title={kind === "source" ? "Change source function" : "Change function"}
        >
          {node.name}
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              background: color + "aa",
              border: "none",
              borderBottom: blendColor ? `2px solid ${blendColor}` : undefined,
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
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
        {def?.args.map((argDef, i) => {
          const values = node.args[i]?.values ?? [argDef.default];
          return values.map((val, j) => (
            <SliderRow
              key={`${argDef.name}-${j}`}
              label={j === 0 ? argDef.name : "·"}
              value={val}
              min={argDef.min}
              max={argDef.max}
              step={argDef.step}
              color={color}
              onChange={(v) => onArgChange(i, values.map((x, k) => k === j ? v : x))}
              onAdd={j === 0
                ? () => onArgChange(i, [...values, values[values.length - 1]])
                : undefined}
              onRemove={j > 0
                ? () => onArgChange(i, values.filter((_, k) => k !== j))
                : undefined}
            />
          ));
        })}

        {node.subChain && onToggleSubChain && (
          <div style={{ padding: "0 6px" }}>
            <BlendIndicator
              subChain={node.subChain}
              expanded={!!subChainExpanded}
              blendColor={color}
              onToggle={onToggleSubChain}
            />
          </div>
        )}

        {kind === "transform" && def?.args.length === 0 && !node.subChain && (
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

      <button
        onClick={() => setAddPicker(true)}
        style={{
          background: "transparent",
          border: `1px dashed ${(blendColor ?? color)}66`,
          borderRadius: 4,
          margin: "4px 6px 6px",
          color: blendColor ?? color,
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
          position={kind === "source" ? "source" : "transform"}
          onSelect={onReplace}
          onClose={() => setReplacePicker(false)}
        />
      )}
      {addPicker && (
        <FunctionPicker
          position="transform"
          onSelect={onAdd}
          onClose={() => setAddPicker(false)}
        />
      )}
    </div>
  );
}
