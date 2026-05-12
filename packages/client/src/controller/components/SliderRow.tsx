import { useCallback, useRef } from "preact/hooks";
import { SLIDER_TRACK } from "../lib/constants";

const KNOB_R = 7; // visual radius in px — knob diameter = 14px

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
    <div className="py-[3px] px-1.5 my-10">
      {/* Label + value */}
      <div className="flex justify-between items-baseline mb-[3px]">
        <div className="flex items-baseline gap-1 min-w-0 overflow-hidden">
          {onRemove ? (
            <button
              onClick={onRemove}
              className="bg-transparent border-0 text-[#B0BEC5] text-[11px] leading-none px-px py-0 cursor-pointer shrink-0"
            >
              ×
            </button>
          ) : (
            <span className="text-[9px] text-[#B0BEC5] uppercase tracking-wider overflow-hidden whitespace-nowrap text-ellipsis min-w-0">
              {label}
            </span>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              className="bg-transparent border-0 text-[9px] leading-none px-px py-0 cursor-pointer opacity-70 shrink-0"
              style={{ color }}
            >
              [ add ]
            </button>
          )}
        </div>
        <span
          onDblClick={onDblClick}
          className="text-[10px] text-white font-mono select-none cursor-text shrink-0"
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
        className="relative h-8 touch-none select-none cursor-pointer"
      >
        {/* Track bar — inset by KNOB_R on each side so the filled portion
            always ends exactly at the knob centre */}
        <div
          className="absolute top-1/2 left-[7px] right-[7px] h-[3px] -translate-y-1/2 rounded-full overflow-hidden"
          style={{ background: SLIDER_TRACK }}
        >
          <div
            className="h-full rounded-[inherit]"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>

        {/* Knob — positioned so its left edge travels from 0 to (100% − 2·KNOB_R),
            keeping it fully within the container at both extremes */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#1A1A2E] pointer-events-none"
          style={{
            left: `calc((100% - 14px) * ${pct / 100})`,
            border: `2px solid ${color}`,
            boxShadow: `0 0 0 1px ${color}44, 0 1px 4px rgba(0,0,0,0.5)`,
          }}
        />
      </div>
    </div>
  );
}
