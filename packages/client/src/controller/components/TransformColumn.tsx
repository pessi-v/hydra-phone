import { useState } from 'react';
import { usePatchStore } from '../state/patchStore';
import { getFunctionDef } from '../lib/functionRegistry';
import { CATEGORY_COLORS } from '../lib/constants';
import { SliderRow } from './SliderRow';
import { FunctionPicker } from './FunctionPicker';

interface Props {
  chainId: string;
  slot: number;
}

export function TransformColumn({ chainId, slot }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const transform = usePatchStore(
    s => s.patch.chains.find(c => c.id === chainId)?.transforms[slot]
  );
  const setTransform = usePatchStore(s => s.setTransform);
  const clearTransform = usePatchStore(s => s.clearTransform);
  const setTransformArg = usePatchStore(s => s.setTransformArg);

  if (!transform) {
    // Empty slot — show [+] button
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100%',
        borderRight: '1px solid #37474F', minWidth: 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: '1px dashed #455A64',
            background: 'transparent', color: '#455A64',
            fontSize: 18, cursor: 'pointer', lineHeight: 1,
          }}
        >
          +
        </button>
        {pickerOpen && (
          <FunctionPicker
            position="transform"
            onSelect={name => setTransform(chainId, slot, name)}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  const def = getFunctionDef(transform.name);
  const color = CATEGORY_COLORS[transform.type];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: color + '18', borderRight: `1px solid ${color}44`,
      minWidth: 0, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            flex: 1, background: color, border: 'none', cursor: 'pointer',
            padding: '6px 4px', textAlign: 'center',
            color: '#fff', fontSize: 10, fontFamily: 'monospace',
            fontWeight: 700, letterSpacing: '0.05em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
          title="Change function"
        >
          {transform.name}
        </button>
        <button
          onClick={() => clearTransform(chainId, slot)}
          style={{
            background: color + 'aa', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 12, padding: '0 5px', flexShrink: 0,
          }}
          title="Remove"
        >
          ×
        </button>
      </div>

      {/* Args */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
        {def?.args.map((argDef, i) => (
          <SliderRow
            key={argDef.name}
            label={argDef.name}
            value={transform.args[i]?.value ?? argDef.default}
            min={argDef.min}
            max={argDef.max}
            step={argDef.step}
            color={color}
            onChange={v => setTransformArg(chainId, slot, i, v)}
          />
        ))}
        {def?.args.length === 0 && (
          <div style={{ fontSize: 9, color: '#455A64', textAlign: 'center', paddingTop: 8 }}>
            no params
          </div>
        )}
      </div>

      {pickerOpen && (
        <FunctionPicker
          position="transform"
          onSelect={name => setTransform(chainId, slot, name)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
