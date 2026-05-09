import { useCallback, useRef } from "react";
import type { ArgumentValue, ArrayArgumentValue, EaseName, ArgDef } from "../types";
import { SliderRow } from "./SliderRow";
import { SLIDER_TRACK } from "../lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const EASE_OPTIONS: Array<EaseName | "none"> = [
  "none",
  "linear",
  "easeInQuad", "easeOutQuad", "easeInOutQuad",
  "easeInCubic", "easeOutCubic", "easeInOutCubic",
  "easeInQuart", "easeOutQuart", "easeInOutQuart",
  "easeInQuint", "easeOutQuint", "easeInOutQuint",
  "sin",
];

// ─── ModRow ───────────────────────────────────────────────────────────────────

const MOD_KNOB = 5;
const MOD_TRACK = 2;

interface ModRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (v: number) => void;
}

function ModRow({ label, value, min, max, step, color, onChange }: ModRowProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const snap = useCallback(
    (raw: number) => {
      const steps = Math.round((raw - min) / step);
      const snapped = min + steps * step;
      const dec = (step.toString().split(".")[1] ?? "").length;
      return parseFloat(Math.max(min, Math.min(max, snapped)).toFixed(dec));
    },
    [min, max, step],
  );

  const valueAt = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return snap(min);
      const w = rect.width - 2 * MOD_KNOB;
      if (w <= 0) return snap(min);
      return snap(
        min + Math.max(0, Math.min(1, (clientX - rect.left - MOD_KNOB) / w)) * (max - min),
      );
    },
    [min, max, snap],
  );

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      onChange(valueAt(e.clientX));
    },
    [onChange, valueAt],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      onChange(valueAt(e.clientX));
    },
    [onChange, valueAt],
  );

  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onTapValue = useCallback(() => {
    const raw = prompt(`${label} (${min}–${max})`, String(value));
    if (!raw) return;
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(snap(n));
  }, [label, min, max, value, onChange, snap]);

  const display =
    Number.isInteger(value) ? String(value) : parseFloat(value.toFixed(2)).toString();

  return (
    <div style={{ display: "flex", alignItems: "center", padding: "2px 6px", gap: 4 }}>
      <span
        style={{
          fontSize: 8,
          color: "#90A4AE",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          width: 34,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        ref={trackRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          flex: 1,
          position: "relative",
          height: MOD_KNOB * 2 + 4,
          touchAction: "none",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: MOD_KNOB,
            right: MOD_KNOB,
            height: MOD_TRACK,
            transform: "translateY(-50%)",
            background: SLIDER_TRACK,
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "inherit" }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `calc((100% - ${MOD_KNOB * 2}px) * ${pct / 100})`,
            transform: "translateY(-50%)",
            width: MOD_KNOB * 2,
            height: MOD_KNOB * 2,
            borderRadius: "50%",
            background: "#1A1A2E",
            border: `2px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      </div>
      <span
        onClick={onTapValue}
        style={{
          fontSize: 9,
          color: "#fff",
          fontFamily: "monospace",
          width: 28,
          textAlign: "right",
          flexShrink: 0,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {display}
      </span>
    </div>
  );
}

// ─── ArrayArgEditor ───────────────────────────────────────────────────────────

interface EditorProps {
  label: string;
  arg: ArrayArgumentValue;
  argDef: ArgDef;
  color: string;
  onChange: (arg: ArgumentValue) => void;
}

function ArrayArgEditor({ label, arg, argDef, color, onChange }: EditorProps) {
  const { values, fast = 1, smooth = 0, ease, offset = 0, fit } = arg;

  const update = useCallback(
    (patch: Partial<ArrayArgumentValue>) => {
      onChange({ ...arg, ...patch });
    },
    [arg, onChange],
  );

  const editValue = useCallback(
    (idx: number) => {
      const raw = prompt(
        `value ${idx + 1} (${argDef.min}–${argDef.max})`,
        String(values[idx]),
      );
      if (!raw) return;
      const n = parseFloat(raw);
      if (isNaN(n)) return;
      const clamped = Math.max(argDef.min, Math.min(argDef.max, n));
      const next = [...values];
      next[idx] = clamped;
      update({ values: next });
    },
    [values, argDef, update],
  );

  const deleteValue = useCallback(
    (idx: number) => {
      if (values.length <= 1) return;
      update({ values: values.filter((_, i) => i !== idx) });
    },
    [values, update],
  );

  const addValue = useCallback(() => {
    const last = values[values.length - 1] ?? argDef.default;
    update({ values: [...values, last] });
  }, [values, argDef.default, update]);

  const cycleEase = useCallback(() => {
    const curr = ease ?? "none";
    const idx = EASE_OPTIONS.indexOf(curr);
    const next = EASE_OPTIONS[(idx + 1) % EASE_OPTIONS.length];
    update({ ease: next === "none" ? undefined : (next as EaseName) });
  }, [ease, update]);

  const toggleFit = useCallback(() => {
    update({ fit: fit ? undefined : [argDef.min, argDef.max] });
  }, [fit, argDef, update]);

  const fmtV = (v: number) =>
    Math.abs(v) < 0.01 && v !== 0
      ? v.toExponential(1)
      : parseFloat(v.toFixed(3)).toString();

  return (
    <div style={{ padding: "3px 0" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 6px",
          marginBottom: 4,
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "#B0BEC5",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            maxWidth: "55%",
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: 8,
              color: color,
              fontFamily: "monospace",
              border: `1px solid ${color}55`,
              borderRadius: 2,
              padding: "0 3px",
            }}
          >
            [ ]
          </span>
          <button
            onClick={() =>
              onChange({ mode: "static", value: values[0] ?? argDef.default })
            }
            title="Back to single value"
            style={{
              background: "transparent",
              border: "1px solid #455A64",
              borderRadius: 2,
              color: "#607D8B",
              fontSize: 9,
              padding: "0 3px",
              cursor: "pointer",
              lineHeight: "1.5",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Value chips ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          padding: "0 6px 4px",
          alignItems: "center",
        }}
      >
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              background: color + "1a",
              border: `1px solid ${color}55`,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <span
              onClick={() => editValue(i)}
              style={{
                fontSize: 9,
                color: "#fff",
                fontFamily: "monospace",
                padding: "2px 4px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {fmtV(v)}
            </span>
            {values.length > 1 && (
              <span
                onClick={() => deleteValue(i)}
                style={{
                  fontSize: 9,
                  color: color + "cc",
                  padding: "2px 4px 2px 0",
                  cursor: "pointer",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                ×
              </span>
            )}
          </div>
        ))}
        <button
          onClick={addValue}
          style={{
            background: "transparent",
            border: `1px dashed ${color}66`,
            borderRadius: 3,
            color: color,
            fontSize: 10,
            padding: "1px 6px",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "#455A6433", margin: "0 6px 2px" }} />

      {/* ── Modifiers ── */}
      <ModRow
        label="fast"
        value={fast}
        min={0.1}
        max={4}
        step={0.1}
        color={color}
        onChange={(v) => update({ fast: v })}
      />
      <ModRow
        label="smooth"
        value={smooth}
        min={0}
        max={1}
        step={0.05}
        color={color}
        onChange={(v) => update({ smooth: v })}
      />

      {/* Ease cycle button */}
      <div style={{ display: "flex", alignItems: "center", padding: "2px 6px", gap: 4 }}>
        <span
          style={{
            fontSize: 8,
            color: "#90A4AE",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            width: 34,
            flexShrink: 0,
          }}
        >
          ease
        </span>
        <button
          onClick={cycleEase}
          style={{
            flex: 1,
            background: ease ? color + "1a" : "transparent",
            border: `1px solid ${ease ? color + "88" : "#455A64"}`,
            borderRadius: 2,
            color: ease ? color : "#607D8B",
            fontSize: 8,
            fontFamily: "monospace",
            padding: "2px 4px",
            cursor: "pointer",
            textAlign: "left",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {ease ?? "none"} ›
        </button>
      </div>

      <ModRow
        label="offset"
        value={offset}
        min={0}
        max={1}
        step={0.05}
        color={color}
        onChange={(v) => update({ offset: v })}
      />

      {/* Fit */}
      <div style={{ display: "flex", alignItems: "center", padding: "2px 6px", gap: 4 }}>
        <span
          style={{
            fontSize: 8,
            color: "#90A4AE",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            width: 34,
            flexShrink: 0,
          }}
        >
          fit
        </span>
        {fit ? (
          <div style={{ display: "flex", flex: 1, gap: 3, alignItems: "center" }}>
            <span
              onClick={() => {
                const raw = prompt("fit low", String(fit[0]));
                if (!raw) return;
                const n = parseFloat(raw);
                if (!isNaN(n)) update({ fit: [n, fit[1]] });
              }}
              style={{
                fontSize: 9,
                color: "#fff",
                fontFamily: "monospace",
                border: "1px solid #455A64",
                borderRadius: 2,
                padding: "1px 4px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {parseFloat(fit[0].toFixed(2))}
            </span>
            <span style={{ fontSize: 8, color: "#455A64" }}>–</span>
            <span
              onClick={() => {
                const raw = prompt("fit high", String(fit[1]));
                if (!raw) return;
                const n = parseFloat(raw);
                if (!isNaN(n)) update({ fit: [fit[0], n] });
              }}
              style={{
                fontSize: 9,
                color: "#fff",
                fontFamily: "monospace",
                border: "1px solid #455A64",
                borderRadius: 2,
                padding: "1px 4px",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {parseFloat(fit[1].toFixed(2))}
            </span>
            <button
              onClick={toggleFit}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "1px solid #455A64",
                borderRadius: 2,
                color: "#455A64",
                fontSize: 9,
                padding: "1px 3px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={toggleFit}
            style={{
              background: "transparent",
              border: "1px dashed #455A64",
              borderRadius: 2,
              color: "#455A64",
              fontSize: 8,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            off
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ArgRow ───────────────────────────────────────────────────────────────────

interface Props {
  label: string;
  arg: ArgumentValue;
  argDef: ArgDef;
  color: string;
  onChange: (arg: ArgumentValue) => void;
}

export function ArgRow({ label, arg, argDef, color, onChange }: Props) {
  if (arg.mode === "static") {
    return (
      <SliderRow
        label={label}
        value={arg.value}
        min={argDef.min}
        max={argDef.max}
        step={argDef.step}
        color={color}
        onChange={(v) => onChange({ mode: "static", value: v })}
        onSwitchToArray={() => onChange({ mode: "array", values: [arg.value] })}
      />
    );
  }
  return (
    <ArrayArgEditor
      label={label}
      arg={arg}
      argDef={argDef}
      color={color}
      onChange={onChange}
    />
  );
}
