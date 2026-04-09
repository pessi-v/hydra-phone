import { usePatchStore } from '../state/patchStore';
import { useWsStore } from '../state/wsStore';
import { generateCode } from '../lib/codeGen';
import { CONTROLS_BG, OUTPUT_BUFFERS } from '../lib/constants';
import type { Chain } from '../types';

interface Props {
  chainId: string;
  codeVisible: boolean;
  onToggleCode: () => void;
}

export function ControlsColumn({ chainId, codeVisible, onToggleCode }: Props) {
  const output = usePatchStore(s => s.patch.chains.find(c => c.id === chainId)?.output);
  const patch = usePatchStore(s => s.patch);
  const setOutput = usePatchStore(s => s.setOutput);
  const wsStatus = useWsStore(s => s.status);
  const lastError = useWsStore(s => s.lastError);

  const statusColor = wsStatus === 'paired' ? '#4CAF50' : wsStatus === 'connecting' ? '#FF8C00' : '#E91E63';
  const statusLabel = wsStatus === 'paired' ? 'live' : wsStatus === 'connecting' ? 'wait' : 'off';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: CONTROLS_BG, padding: '6px 4px', gap: 8,
      minWidth: 64, flexShrink: 0,
    }}>
      {/* Connection status */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor, marginRight: 4,
          verticalAlign: 'middle',
        }} />
        <span style={{ fontSize: 9, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.1em', verticalAlign: 'middle' }}>
          {statusLabel}
        </span>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #455A64', margin: '0' }} />

      {/* Output buffer */}
      <div>
        <div style={{ fontSize: 9, color: '#B0BEC5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, textAlign: 'center' }}>
          out
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {OUTPUT_BUFFERS.map(buf => (
            <button
              key={buf}
              onClick={() => setOutput(chainId, buf as Chain['output'])}
              style={{
                padding: '4px 2px', fontSize: 10,
                fontFamily: 'monospace', cursor: 'pointer',
                borderRadius: 4, border: 'none',
                background: output === buf ? '#FF8C00' : '#455A64',
                color: '#fff',
              }}
            >
              {buf}
            </button>
          ))}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #455A64', margin: '0' }} />

      {/* Code view toggle */}
      <button
        onClick={onToggleCode}
        style={{
          background: codeVisible ? '#37474F' : '#263238',
          border: `1px solid ${codeVisible ? '#FF8C00' : '#455A64'}`,
          borderRadius: 6, color: codeVisible ? '#FF8C00' : '#B0BEC5',
          fontSize: 9, padding: '6px 4px', cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}
      >
        {'</>'}
        <br />code
      </button>

      {/* Error display */}
      {lastError && (
        <div style={{
          fontSize: 8, color: '#E91E63', wordBreak: 'break-word',
          background: '#E91E6322', borderRadius: 4, padding: 4,
        }}>
          {lastError.slice(0, 80)}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Generated code preview (hidden, shown via overlay) */}
      <div style={{ fontSize: 7, color: '#455A64', textAlign: 'center' }}>
        {generateCode(patch).split('\n').length} line{generateCode(patch).split('\n').length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
