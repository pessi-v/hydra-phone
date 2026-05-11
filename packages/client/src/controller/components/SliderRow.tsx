import { useCallback, useRef } from "preact/hooks";
import { SLIDER_TRACK } from "../lib/constants";

const KNOB_R = 7; // visual radius in px — knob diameter = 14px
const TRACK_H = 3; // track bar height in px

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (value: number) => void;
  onAdd?: () => void;
  onRemove?: () => void;
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  color,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Percentage of value within [min, max], clamped to [0, 100]
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  // Snap a raw number to the nearest step, clamped to [min, max]
  const snap = useCallback(
    (raw: number) => {
      const stepsFromMin = Math.round((raw - min) / step);
      const snapped = min + stepsFromMin * step;
      const dec = (step.toString().split(".")[1] ?? "").length;
      return parseFloat(Math.max(min, Math.min(max, snapped)).toFixed(dec));
    },
    [min, max, step],
  );

  // Convert a pointer's clientX to a snapped value.
  // The knob centre travels from (rect.left + KNOB_R) to (rect.right - KNOB_R),
  // matching the inset track bar.
  const valueAt = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return snap(min);
      const trackWidth = rect.width - 2 * KNOB_R;
      if (trackWidth <= 0) return snap(min);
      const pctRaw = (clientX - rect.left - KNOB_R) / trackWidth;
      return snap(min + Math.max(0, Math.min(1, pctRaw)) * (max - min));
    },
    [min, max, snap],
  );

  const onDown = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      (e.currentTarget as Element | null)?.setPointerCapture(e.pointerId);
      onChange(valueAt(e.clientX));
    },
    [onChange, valueAt],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      onChange(valueAt(e.clientX));
    },
    [onChange, valueAt],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Double-click/tap the value to type it in manually
  const onDblClick = useCallback(() => {
    const raw = prompt(`${label} (${min}–${max})`, String(value));
    if (raw === null) return;
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(snap(n));
  }, [label, min, max, value, onChange, snap]);

  const display =
    Math.abs(value) < 0.01 && value !== 0
      ? value.toExponential(1)
      : Number.isInteger(value)
        ? String(value)
        : parseFloat(value.toFixed(3)).toString();

  return (
    <div style={{ padding: "3px 6px" }}>
      {/* Label + value */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 3,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {onRemove ? (
            <button
              onClick={onRemove}
              style={{
                background: "none",
                border: "none",
                color: "#B0BEC5",
                fontSize: 11,
                lineHeight: 1,
                padding: "0 1px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              ×
            </button>
          ) : (
            <span
              style={{
                fontSize: 9,
                color: "#B0BEC5",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}
            >
              {label}
            </span>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              style={{
                background: "none",
                border: "none",
                color: color,
                fontSize: 9,
                lineHeight: 1,
                padding: "0 1px",
                cursor: "pointer",
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              [ add ]
            </button>
          )}
        </div>
        <span
          onDblClick={onDblClick}
          style={{
            fontSize: 10,
            color: "#fff",
            fontFamily: "monospace",
            userSelect: "none",
            cursor: "text",
            flexShrink: 0,
          }}
        >
          {display}
        </span>
      </div>

      {/* Track + knob — pointer events handled on the container */}
      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          position: "relative",
          height: KNOB_R * 2 + 6, // extra height = easier finger tap area
          touchAction: "none",
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        {/* Track bar — inset by KNOB_R on each side so the filled portion
            always ends exactly at the knob centre */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: KNOB_R,
            right: KNOB_R,
            height: TRACK_H,
            transform: "translateY(-50%)",
            background: SLIDER_TRACK,
            borderRadius: TRACK_H / 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "inherit",
            }}
          />
        </div>

        {/* Knob — positioned so its left edge travels from 0 to (100% − 2·KNOB_R),
            keeping it fully within the container at both extremes */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `calc((100% - ${KNOB_R * 2}px) * ${pct / 100})`,
            transform: "translateY(-50%)",
            width: KNOB_R * 2,
            height: KNOB_R * 2,
            borderRadius: "50%",
            background: "#1A1A2E",
            border: `2px solid ${color}`,
            boxShadow: `0 0 0 1px ${color}44, 0 1px 4px rgba(0,0,0,0.5)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
