import { create } from 'zustand';
import { generateCode } from '../lib/codeGen';
import { usePatchStore } from './patchStore';

type WsStatus = 'disconnected' | 'connecting' | 'paired';

interface WsStore {
  status: WsStatus;
  sessionId: string | null;
  lastError: string | null;
  connect(sessionId: string): void;
  disconnect(): void;
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let patchUnsubscribe: (() => void) | null = null;
let sendDebounce: ReturnType<typeof setTimeout> | null = null;

function sendPatch() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const patch = usePatchStore.getState().patch;
  const code = generateCode(patch);
  ws.send(JSON.stringify({ type: 'patch', code }));
}

function scheduleSend() {
  if (sendDebounce) clearTimeout(sendDebounce);
  sendDebounce = setTimeout(sendPatch, 16);
}

export const useWsStore = create<WsStore>((set, get) => ({
  status: 'disconnected',
  sessionId: null,
  lastError: null,

  connect(sessionId) {
    // Cancel any pending reconnect from a previous connection
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) ws.close();
    set({ status: 'connecting', sessionId });

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws?session=${sessionId}&role=controller`;

    const thisWs = new WebSocket(url);
    ws = thisWs;

    thisWs.onopen = () => {
      console.log('[controller] WebSocket connected');
    };

    thisWs.onmessage = (event) => {
      let msg: { type: string };
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'paired') {
        set({ status: 'paired', lastError: null });
        patchUnsubscribe?.();
        patchUnsubscribe = usePatchStore.subscribe(scheduleSend);
        sendPatch();
      } else if (msg.type === 'error') {
        const errMsg = (msg as { type: 'error'; message: string }).message;
        set({ lastError: errMsg });
        console.error('[controller] hydra eval error:', errMsg);
      } else if (msg.type === 'disconnected') {
        set({ status: 'connecting', lastError: null });
        patchUnsubscribe?.();
        patchUnsubscribe = null;
      }
    };

    thisWs.onclose = () => {
      // If another connect() has already replaced this socket, do nothing
      if (ws !== thisWs) return;

      console.log('[controller] WebSocket closed — reconnecting in 2s');
      set({ status: 'connecting' });
      patchUnsubscribe?.();
      patchUnsubscribe = null;
      reconnectTimer = setTimeout(() => {
        const { sessionId: sid } = get();
        if (sid) get().connect(sid);
      }, 2000);
    };

    thisWs.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  },

  disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    ws?.close();
    ws = null;
    patchUnsubscribe?.();
    patchUnsubscribe = null;
    set({ status: 'disconnected', sessionId: null });
  },
}));

// ── Initialize from URL on module load ────────────────────────────────────────
// Done here (outside React) so StrictMode double-effects don't open two sockets.
const _sessionId = new URLSearchParams(window.location.search).get('session');
if (_sessionId) {
  useWsStore.getState().connect(_sessionId);
}
