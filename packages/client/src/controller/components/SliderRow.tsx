import { useCallback, useRef } from 'react';
import { SLIDER_TRACK } from '../lib/constants';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  color: string;
  onChange: (value: number) => void;
}

export function SliderRow({ label, value, min, max, step, color, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  // Double-tap to enter value manually
  const handleDoubleClick = useCallback(() => {
    const raw = prompt(`${label} (${min}–${max})`, String(value));
    if (raw === null) return;
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
  }, [label, min, max, value, onChange]);

  // Percentage for the filled track
  const pct = ((value - min) / (max - min)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));

  const displayValue = Math.abs(value) < 0.01 && value !== 0
    ? value.toExponential(1)
    : Number.isInteger(value)
    ? String(value)
    : parseFloat(value.toFixed(3)).toString();

  return (
    <div style={{ padding: '4px 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#B0BEC5', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '60%' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: '#fff', fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
          {displayValue}
        </span>
      </div>
      <div style={{ position: 'relative', height: 18 }} onDoubleClick={handleDoubleClick}>
        {/* Custom track background */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: 4, transform: 'translateY(-50%)',
          borderRadius: 2, overflow: 'hidden',
          background: SLIDER_TRACK,
        }}>
          <div style={{
            width: `${clampedPct}%`, height: '100%',
            background: color, borderRadius: 2,
          }} />
        </div>
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer',
            touchAction: 'none',
            margin: 0,
          }}
        />
      </div>
    </div>
  );
}
