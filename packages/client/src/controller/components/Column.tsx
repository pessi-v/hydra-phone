import { useState } from "preact/hooks";
import { getFunctionDef, getArrayFunctionDef } from "../lib/functionRegistry";
import { CATEGORY_COLORS, ARRAY_FN_COLOR } from "../lib/constants";
import { SliderRow } from "./SliderRow";
import { FunctionPicker } from "./FunctionPicker";
import { BlendIndicator } from "./SubChain";
import type { FunctionNode, ArrayFnNode } from "../types";

type Props =
  | {
      kind: "source" | "transform";
      node: FunctionNode;
      blendColor?: string;
      subChainExpanded?: boolean;
      expandedArgChains: Set<string>;
      onReplace: (name: string) => void;
      onRemove?: () => void;
      onArgChange: (i: number, values: number[]) => void;
      onArgChainChange: (i: number, chain: ArrayFnNode[]) => void;
      onAdd: (name: string) => void;
      onToggleSubChain?: () => void;
      onToggleArgChain: (arrayId: string) => void;
    }
  | {
      kind: "array-fn";
      fnNode: ArrayFnNode;
      isLast: boolean;
      onArgChange: (argIdx: number, value: number) => void;
      onRemove: () => void;
      onAdd: (name: string) => void;
    };

export function Column(props: Props) {
  const [replacePicker, setReplacePicker] = useState(false);
  const [addPicker, setAddPicker] = useState(false);
  const [addArrayPickerForArg, setAddArrayPickerForArg] = useState<
    number | null
  >(null);

  if (props.kind === "array-fn") {
    const { fnNode, isLast, onArgChange, onRemove, onAdd } = props;
    const fnDef = getArrayFunctionDef(fnNode.name);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: ARRAY_FN_COLOR + "18",
          borderLeft: `2px solid ${ARRAY_FN_COLOR}88`,
          borderRight: `1px solid ${ARRAY_FN_COLOR}44`,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexShrink: 0 }}>
          <div
            style={{
              flex: 1,
              background: ARRAY_FN_COLOR,
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
          >
            {fnNode.name}
          </div>
          <button
            onClick={onRemove}
            style={{
              background: ARRAY_FN_COLOR + "aa",
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

        <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
          {fnDef?.args.map((argDef, i) => (
            <SliderRow
              key={argDef.name}
              label={argDef.name}
              value={fnNode.args[i] ?? argDef.default}
              min={argDef.min}
              max={argDef.max}
              step={argDef.step}
              color={ARRAY_FN_COLOR}
              onChange={(v) => onArgChange(i, v)}
            />
          ))}
        </div>

        {isLast && (
          <button
            onClick={() => setAddPicker(true)}
            style={{
              background: "transparent",
              border: `1px dashed ${ARRAY_FN_COLOR}66`,
              borderRadius: 4,
              margin: "4px 6px 6px",
              color: ARRAY_FN_COLOR,
              fontSize: 11,
              cursor: "pointer",
              padding: "4px 0",
              flexShrink: 0,
            }}
          >
            • add one
          </button>
        )}

        {addPicker && (
          <FunctionPicker
            position="array"
            onSelect={onAdd}
            onClose={() => setAddPicker(false)}
          />
        )}
      </div>
    );
  }

  // ── source / transform ────────────────────────────────────────────────────

  const {
    node,
    kind,
    blendColor,
    subChainExpanded,
    expandedArgChains,
    onReplace,
    onRemove,
    onArgChange,
    onArgChainChange,
    onAdd,
    onToggleSubChain,
    onToggleArgChain,
  } = props;

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
          title={
            kind === "source" ? "Change source function" : "Change function"
          }
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
          const chain = node.args[i]?.arrayChain ?? [];
          const arrayId = node.args[i]?.arrayId ?? "";
          return (
            <div key={argDef.name}>
              {values.map((val, j) => (
                <SliderRow
                  key={`${argDef.name}-${j}`}
                  label={j === 0 ? argDef.name : "·"}
                  value={val}
                  min={argDef.min}
                  max={argDef.max}
                  step={argDef.step}
                  color={color}
                  onChange={(v) =>
                    onArgChange(
                      i,
                      values.map((x, k) => (k === j ? v : x)),
                    )
                  }
                  onAdd={
                    j === 0
                      ? () =>
                          onArgChange(i, [...values, values[values.length - 1]])
                      : undefined
                  }
                  onRemove={
                    j > 0
                      ? () =>
                          onArgChange(
                            i,
                            values.filter((_, k) => k !== j),
                          )
                      : undefined
                  }
                />
              ))}
              {values.length > 1 && (
                <div style={{ padding: "2px 6px 4px" }}>
                  {chain.length === 0 ? (
                    <button
                      onClick={() => setAddArrayPickerForArg(i)}
                      style={{
                        display: "block",
                        width: "100%",
                        background: "transparent",
                        border: `1px dashed ${ARRAY_FN_COLOR}66`,
                        borderRadius: 3,
                        color: ARRAY_FN_COLOR,
                        fontSize: 11,
                        fontFamily: "monospace",
                        padding: "3px 6px",
                        cursor: "pointer",
                      }}
                    >
                      •
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleArgChain(arrayId)}
                      style={{
                        display: "block",
                        width: "100%",
                        background: "transparent",
                        border: `1px solid ${ARRAY_FN_COLOR}55`,
                        borderRadius: 3,
                        color: ARRAY_FN_COLOR,
                        fontSize: 9,
                        fontFamily: "monospace",
                        padding: "3px 6px",
                        textAlign: "left",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {expandedArgChains.has(arrayId) ? "▼" : "▶"}{" "}
                      {chain.map((f) => f.name).join(" · ")}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
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
          border: `1px dashed ${blendColor ?? color}66`,
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
        •
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
      {addArrayPickerForArg !== null && (
        <FunctionPicker
          position="array"
          onSelect={(name) => {
            const fnDef = getArrayFunctionDef(name);
            const newFn: ArrayFnNode = {
              name,
              args: fnDef?.args.map((a) => a.default) ?? [],
            };
            onArgChainChange(addArrayPickerForArg!, [newFn]);
            const arrayId = node.args[addArrayPickerForArg!]?.arrayId;
            if (arrayId && !expandedArgChains.has(arrayId))
              onToggleArgChain(arrayId);
          }}
          onClose={() => setAddArrayPickerForArg(null)}
        />
      )}
    </div>
  );
}
