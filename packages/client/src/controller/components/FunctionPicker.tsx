import { CATEGORY_COLORS, CATEGORY_LABELS, ARRAY_FN_COLOR } from '../lib/constants';
import { getSourceFunctions, getTransformFunctions, getArrayFunctions } from '../lib/functionRegistry';
import type { FunctionDef, FunctionType } from '../types';

interface Props {
  position: 'source' | 'transform' | 'array';
  onSelect: (fnName: string) => void;
  onClose: () => void;
}

const TRANSFORM_TYPE_ORDER: FunctionType[] = ['coord', 'color', 'combine', 'combineCoord'];

export function FunctionPicker({ position, onSelect, onClose }: Props) {
  if (position === 'array') {
    const fns = getArrayFunctions();
    return (
      <>
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#263238', borderRadius: '12px 12px 0 0',
          zIndex: 101, padding: '12px 8px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
            <span style={{ color: '#B0BEC5', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Add Array Function
            </span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px' }}>
            {fns.map(fn => (
              <button
                key={fn.name}
                onClick={() => { onSelect(fn.name); onClose(); }}
                style={{
                  background: ARRAY_FN_COLOR + '22',
                  border: `1px solid ${ARRAY_FN_COLOR}66`,
                  borderRadius: 6,
                  color: '#fff',
                  fontSize: 12,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {fn.name}
                <span style={{ fontSize: 9, color: '#B0BEC5', marginLeft: 4 }}>
                  {fn.args.length > 0 ? `(${fn.args.length})` : '()'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const fns = position === 'source' ? getSourceFunctions() : getTransformFunctions();

  const grouped: Partial<Record<FunctionType, FunctionDef[]>> = {};
  for (const fn of fns) {
    (grouped[fn.type] ??= []).push(fn);
  }

  const types: FunctionType[] = position === 'source'
    ? ['src']
    : TRANSFORM_TYPE_ORDER.filter(t => grouped[t]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#263238', borderRadius: '12px 12px 0 0',
        zIndex: 101, padding: '12px 8px 24px',
        maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
          <span style={{ color: '#B0BEC5', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {position === 'source' ? 'Choose Source' : 'Add Transform'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
        </div>

        {types.map(type => (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: CATEGORY_COLORS[type], textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, padding: '0 4px' }}>
              {CATEGORY_LABELS[type]}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px' }}>
              {(grouped[type] ?? []).map(fn => (
                <button
                  key={fn.name}
                  onClick={() => { onSelect(fn.name); onClose(); }}
                  style={{
                    background: CATEGORY_COLORS[type] + '22',
                    border: `1px solid ${CATEGORY_COLORS[type]}66`,
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 12,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                  }}
                >
                  {fn.name}
                  <span style={{ fontSize: 9, color: '#B0BEC5', marginLeft: 4 }}>
                    {fn.args.length > 0 ? `(${fn.args.length})` : '()'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
