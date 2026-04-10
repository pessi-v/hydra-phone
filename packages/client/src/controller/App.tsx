import { useEffect, useState } from 'react';
import { usePatchStore } from './state/patchStore';
import { useWsStore } from './state/wsStore';
import { SourceColumn } from './components/SourceColumn';
import { TransformColumn } from './components/TransformColumn';
import { ControlsColumn } from './components/ControlsColumn';
import { CodeView } from './components/CodeView';
import { PAGE_BG } from './lib/constants';

// In portrait mode, rotate the UI 90° so the layout always appears landscape.
// The rotated container is sized to the landscape dimensions (100vh × 100vw)
// and offset so it stays centered in the portrait viewport.
function LandscapeAdapter({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(
    () => window.innerHeight > window.innerWidth
  );

  useEffect(() => {
    const check = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    (screen.orientation as { lock?: (o: string) => Promise<void> })?.lock?.('landscape')?.catch(() => {});
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isPortrait) {
    return <>{children}</>;
  }

  // Portrait: rotate the container 90° clockwise.
  // Container dimensions are swapped (width=100vh, height=100vw) so after
  // rotation the content fills the portrait viewport as if it were landscape.
  return (
    <div style={{
      position: 'fixed',
      width: '100vh',
      height: '100vw',
      top: 'calc(50vh - 50vw)',
      left: 'calc(50vw - 50vh)',
      transform: 'rotate(90deg)',
      transformOrigin: 'center center',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

// Pairing overlay shown while waiting for the display to connect
function PairingOverlay({ sessionId }: { sessionId: string }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: PAGE_BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', gap: 12, fontFamily: 'monospace', zIndex: 200,
    }}>
      <div style={{ fontSize: 14, color: '#B0BEC5' }}>Waiting for display…</div>
      <div style={{ fontSize: 10, color: '#455A64' }}>session: {sessionId}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: '#FF8C00',
            animation: `pulse 1.2s ${i * 0.4}s ease-in-out infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export function App() {
  const [codeVisible, setCodeVisible] = useState(false);

  const chain = usePatchStore(s => s.patch.chains[0]);
  const { status, sessionId } = useWsStore();

  const numCols = 1 + chain.transforms.length; // source + transforms

  return (
    <LandscapeAdapter>
      {status !== 'paired' && sessionId && (
        <PairingOverlay sessionId={sessionId} />
      )}
      {!sessionId && (
        <div style={{
          position: 'fixed', inset: 0, background: PAGE_BG,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#E91E63', fontFamily: 'monospace', fontSize: 12,
        }}>
          No session ID — scan the QR code from the display.
        </div>
      )}

      {/* Main editor — always rendered so state is preserved */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${numCols}, 1fr) auto`,
        width: '100%',
        height: '100%',
        background: PAGE_BG,
        overflow: 'hidden',
      }}>
        <SourceColumn chainId={chain.id} />
        {chain.transforms.map((_, i) => (
          <TransformColumn key={i} chainId={chain.id} index={i} />
        ))}
        <ControlsColumn
          chainId={chain.id}
          codeVisible={codeVisible}
          onToggleCode={() => setCodeVisible(v => !v)}
        />
      </div>

      {codeVisible && <CodeView onClose={() => setCodeVisible(false)} />}
    </LandscapeAdapter>
  );
}
