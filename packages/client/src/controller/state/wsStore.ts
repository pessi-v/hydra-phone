import { signal, effect } from '@preact/signals';
import { generateCode } from '../lib/codeGen';
import { patch } from './patchStore';

type WsStatus = 'disconnected' | 'connecting' | 'paired';

export const wsStatus = signal<WsStatus>('disconnected');
export const sessionId = signal<string | null>(null);
export const lastError = signal<string | null>(null);

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let stopPatchSync: (() => void) | null = null;
let sendDebounce: ReturnType<typeof setTimeout> | null = null;

function scheduleSend() {
  if (sendDebounce) clearTimeout(sendDebounce);
  sendDebounce = setTimeout(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const code = generateCode(patch.value);
    ws.send(JSON.stringify({ type: 'patch', code }));
  }, 16);
}

export function connect(sid: string) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) ws.close();
  wsStatus.value = 'connecting';
  sessionId.value = sid;

  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${window.location.host}/ws?session=${sid}&role=controller`;

  const thisWs = new WebSocket(url);
  ws = thisWs;

  thisWs.onopen = () => {
    console.log('[controller] WebSocket connected');
  };

  thisWs.onmessage = (event) => {
    let msg: { type: string };
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'paired') {
      wsStatus.value = 'paired';
      lastError.value = null;
      stopPatchSync?.();
      // effect() runs immediately (sends current patch) then on every change
      stopPatchSync = effect(() => { void patch.value; scheduleSend(); });
    } else if (msg.type === 'error') {
      lastError.value = (msg as { type: 'error'; message: string }).message;
      console.error('[controller] hydra eval error:', lastError.value);
    } else if (msg.type === 'disconnected') {
      wsStatus.value = 'connecting';
      lastError.value = null;
      stopPatchSync?.();
      stopPatchSync = null;
    }
  };

  thisWs.onclose = () => {
    if (ws !== thisWs) return;
    console.log('[controller] WebSocket closed — reconnecting in 2s');
    wsStatus.value = 'connecting';
    stopPatchSync?.();
    stopPatchSync = null;
    reconnectTimer = setTimeout(() => {
      const sid = sessionId.value;
      if (sid) connect(sid);
    }, 2000);
  };

  thisWs.onerror = () => {
    // onclose fires after onerror, reconnect handled there
  };
}

export function disconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  ws?.close();
  ws = null;
  stopPatchSync?.();
  stopPatchSync = null;
  wsStatus.value = 'disconnected';
  sessionId.value = null;
}

// ── Initialize from URL on module load ────────────────────────────────────────
// Done here (outside Preact) so double-effects don't open two sockets.
const _sid = new URLSearchParams(window.location.search).get('session');
if (_sid) connect(_sid);
