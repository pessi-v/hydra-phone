import { nanoid } from 'nanoid';
import QRCode from 'qrcode';
// hydra-synth requires `global` on window — set in index.html before this module loads
import Hydra from 'hydra-synth';

// ─── Session ID ───────────────────────────────────────────────────────────────

const sessionId = nanoid(10);
const sessionIdEl = document.getElementById('session-id')!;
sessionIdEl.textContent = `session: ${sessionId}`;

// ─── QR Code ─────────────────────────────────────────────────────────────────

const qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
const codeOverlay = document.getElementById('code-overlay') as HTMLDivElement;

async function getCtrlUrl(): Promise<string> {
  const port = window.location.port;
  const proto = window.location.protocol;

  try {
    const res = await fetch('/api/host');
    const { ip, mdns, publicHost } = await res.json() as {
      ip: string | null; mdns: string; publicHost: string | null;
    };
    // In production PUBLIC_HOST is set — always use HTTPS with the canonical domain.
    if (publicHost) return `https://${publicHost}/ctrl?session=${sessionId}`;
    // Dev: prefer mDNS (.local), fall back to LAN IP, then current hostname.
    const host = mdns ?? ip ?? window.location.hostname;
    return `${proto}//${host}${port ? `:${port}` : ''}/ctrl?session=${sessionId}`;
  } catch {
    return `${window.location.origin}/ctrl?session=${sessionId}`;
  }
}

// ─── Hydra Setup ──────────────────────────────────────────────────────────────

const hydraCanvas = document.getElementById('hydra-canvas') as HTMLCanvasElement;

function resizeCanvas() {
  hydraCanvas.width = window.innerWidth;
  hydraCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let hydraReady = false;

function initHydra() {
  if (hydraReady) return;
  new Hydra({
    canvas: hydraCanvas,
    detectAudio: false,
    enableStreamCapture: false,
  });
  hydraReady = true;
  console.log('[display] Hydra initialized');
}

// ─── Eval helper ─────────────────────────────────────────────────────────────

let lastCode = '';
let ws: WebSocket | null = null;

function evalPatch(code: string) {
  if (!hydraReady) return;
  if (code === lastCode) return;
  lastCode = code;
  try {
    // Indirect eval: runs in global scope where Hydra globals (osc, noise, etc.) live
    (0, eval)(code);
  } catch (err) {
    console.error('[display] eval error:', err);
    ws?.send(JSON.stringify({ type: 'error', message: String(err) }));
  }
}

// ─── WebSocket ────────────────────────────────────────────────────────────────

const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws?session=${sessionId}&role=display`;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function connect() {
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[display] WebSocket connected');
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  ws.onmessage = (event) => {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(event.data) as { type: string; [key: string]: unknown };
    } catch {
      return;
    }

    if (msg.type === 'paired') {
      console.log('[display] paired — going fullscreen');
      const overlay = document.getElementById('qr-overlay');
      if (overlay) overlay.style.display = 'none';
      initHydra();
    } else if (msg.type === 'patch') {
      const code = msg['code'] as string;
      evalPatch(code);
      codeOverlay.textContent = code;
    } else if (msg.type === 'show_code') {
      codeOverlay.style.display = (msg as { type: string; visible: boolean }).visible ? 'block' : 'none';
    } else if (msg.type === 'disconnected') {
      console.log('[display] controller disconnected — showing QR');
      const overlay = document.getElementById('qr-overlay');
      if (overlay) overlay.style.display = 'flex';
    }
  };

  ws.onclose = () => {
    console.log('[display] WebSocket closed — reconnecting in 2s');
    reconnectTimer = setTimeout(connect, 2000);
  };

  ws.onerror = (err) => {
    console.error('[display] WebSocket error', err);
  };
}

// ─── Init (async for QR URL resolution) ──────────────────────────────────────

void (async () => {
  const ctrlUrl = await getCtrlUrl();
  console.log(`[display] ctrl URL: ${ctrlUrl}`);

  await QRCode.toCanvas(qrCanvas, ctrlUrl, {
    width: 240,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });

  connect();
})();
