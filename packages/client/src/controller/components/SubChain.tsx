import type { SubChain } from "../types";

interface Props {
  subChain: SubChain;
  expanded: boolean;
  blendColor: string;
  onToggle: () => void;
}

// Compact expand/collapse indicator shown inside a blend/modulate column.
// When expanded, the sub-chain functions appear as their own columns in the grid.
export function BlendIndicator({ subChain, expanded, blendColor, onToggle }: Props) {
  const summary = [subChain.source.name, ...subChain.transforms.map((t) => t.name)].join("·");
  return (
    <button
      onClick={onToggle}
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
      title={expanded ? "Collapse input chain" : "Expand input chain"}
    >
      {expanded ? "▼" : "▶"} {summary}
    </button>
  );
}
