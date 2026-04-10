import { useState } from "react";
import { getFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import type { SubChain, FunctionNode } from "../types";

interface Props {
  subChain: SubChain;
  blendColor: string;
  onSetSource: (fnName: string) => void;
  onSetSourceArg: (argIdx: number, value: number) => void;
  onInsertTransform: (index: number, fnName: string) => void;
  onReplaceTransform: (index: number, fnName: string) => void;
  onRemoveTransform: (index: number) => void;
  onSetTransformArg: (nodeIdx: number, argIdx: number, value: number) => void;
}

// A mini header button for a node inside the sub-chain.
// The title bar uses the function's own category color with a border in the
// parent blend's color, as specified.
function SubNodeHeader({
  node,
  blendColor,
  onReplace,
  onRemove,
}: {
  node: FunctionNode;
  blendColor: string;
  onReplace: () => void;
  onRemove?: () => void;
}) {
  const color = CATEGORY_COLORS[node.type];
  return (
    <div style={{ display: "flex", marginTop: 4 }}>
      <button
        onClick={onReplace}
        style={{
          flex: 1,
          background: color,
          border: `2px solid ${blendColor}`,
          borderRight: onRemove ? "none" : `2px solid ${blendColor}`,
          cursor: "pointer",
          padding: "3px 3px",
          color: "#fff",
          fontSize: 9,
          fontFamily: "monospace",
          fontWeight: 700,
          letterSpacing: "0.05em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
        title="Change function"
      >
        {node.name}
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: color + "aa",
            border: `2px solid ${blendColor}`,
            cursor: "pointer",
            color: "#fff",
            fontSize: 10,
            padding: "0 4px",
            flexShrink: 0,
          }}
          title="Remove"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function BlendSubChain({
  subChain,
  blendColor,
  onSetSource,
  onSetSourceArg,
  onInsertTransform,
  onReplaceTransform,
  onRemoveTransform,
  onSetTransformArg,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [replacePickerIdx, setReplacePickerIdx] = useState<number | null>(null);
  const [addPickerOpen, setAddPickerOpen] = useState(false);

  const { source, transforms } = subChain;

  // ── Collapsed: compact one-line summary ──────────────────────────────────
  if (!expanded) {
    const summary = [source.name, ...transforms.map((t) => t.name)].join("·");
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          display: "block",
          width: "100%",
          background: "transparent",
          border: `1px solid ${blendColor}55`,
          borderRadius: 3,
          color: blendColor,
          fontSize: 9,
          fontFamily: "monospace",
          padding: "4px 6px",
          textAlign: "left",
          cursor: "pointer",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginTop: 4,
        }}
        title="Expand input chain"
      >
        ▶ {summary}
      </button>
    );
  }

  // ── Expanded: full nested chain ──────────────────────────────────────────
  const sourceDef = getFunctionDef(source.name);
  const sourceColor = CATEGORY_COLORS[source.type];

  return (
    <div>
      {/* Section label / collapse button */}
      <button
        onClick={() => setExpanded(false)}
        style={{
          display: "block",
          width: "100%",
          background: "none",
          border: "none",
          borderTop: `1px solid ${blendColor}44`,
          color: blendColor + "bb",
          fontSize: 8,
          padding: "3px 0 2px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "monospace",
          letterSpacing: "0.06em",
          marginTop: 4,
        }}
      >
        ▼ input
      </button>

      {/* Source node */}
      <SubNodeHeader
        node={source}
        blendColor={blendColor}
        onReplace={() => setSourcePickerOpen(true)}
      />
      {sourceDef?.args.map((argDef, i) => (
        <SliderRow
          key={argDef.name}
          label={argDef.name}
          value={source.args[i]?.value ?? argDef.default}
          min={argDef.min}
          max={argDef.max}
          step={argDef.step}
          color={sourceColor}
          onChange={(v) => onSetSourceArg(i, v)}
        />
      ))}

      {/* Transform nodes (nested blend sub-chains are shown but not expanded) */}
      {transforms.map((t, i) => {
        const tDef = getFunctionDef(t.name);
        const tColor = CATEGORY_COLORS[t.type];
        const isNestedBlend = t.type === "combine" || t.type === "combineCoord";
        return (
          <div key={i}>
            <SubNodeHeader
              node={t}
              blendColor={blendColor}
              onReplace={() => setReplacePickerIdx(i)}
              onRemove={() => onRemoveTransform(i)}
            />
            {/* Don't recurse into nested blend sub-chains */}
            {!isNestedBlend &&
              tDef?.args.map((argDef, ai) => (
                <SliderRow
                  key={argDef.name}
                  label={argDef.name}
                  value={t.args[ai]?.value ?? argDef.default}
                  min={argDef.min}
                  max={argDef.max}
                  step={argDef.step}
                  color={tColor}
                  onChange={(v) => onSetTransformArg(i, ai, v)}
                />
              ))}
          </div>
        );
      })}

      {/* Add sub-transform */}
      <button
        onClick={() => setAddPickerOpen(true)}
        style={{
          display: "block",
          width: "100%",
          background: "transparent",
          border: `1px dashed ${blendColor}55`,
          borderRadius: 3,
          color: blendColor,
          fontSize: 9,
          cursor: "pointer",
          padding: "3px 0",
          marginTop: 6,
        }}
      >
        • add
      </button>

      {/* Pickers */}
      {sourcePickerOpen && (
        <FunctionPicker
          position="source"
          onSelect={(name) => onSetSource(name)}
          onClose={() => setSourcePickerOpen(false)}
        />
      )}
      {replacePickerIdx !== null && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => onReplaceTransform(replacePickerIdx, name)}
          onClose={() => setReplacePickerIdx(null)}
        />
      )}
      {addPickerOpen && (
        <FunctionPicker
          position="transform"
          onSelect={(name) => onInsertTransform(transforms.length, name)}
          onClose={() => setAddPickerOpen(false)}
        />
      )}
    </div>
  );
}
