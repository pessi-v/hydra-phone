import { patch, activeOutput } from '../state/patchStore';
import { generateCode } from '../lib/codeGen';

interface Props {
  onClose: () => void;
}

export function CodeView({ onClose }: Props) {
  const code = generateCode(patch.value, activeOutput.value);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50,
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#1A1A2E', borderTop: '1px solid #37474F',
        zIndex: 51, padding: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: '#B0BEC5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Generated Code
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigator.clipboard?.writeText(code)}
              style={{
                background: 'transparent', border: '1px solid #455A64',
                color: '#B0BEC5', fontSize: 10, padding: '2px 8px',
                borderRadius: 4, cursor: 'pointer',
              }}
            >
              copy
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#B0BEC5', cursor: 'pointer', fontSize: 18 }}
            >
              ×
            </button>
          </div>
        </div>
        <pre style={{
          fontFamily: 'monospace', fontSize: 12, color: '#4CAF50',
          background: '#0D1117', padding: 12, borderRadius: 8,
          overflowX: 'auto', margin: 0, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}>
          {code}
        </pre>
      </div>
    </>
  );
}
