import { createServer, IncomingMessage } from 'http';
import { networkInterfaces, hostname } from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

// ─── LAN IP detection ─────────────────────────────────────────────────────────

function getLanIp(): string | null {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const LAN_IP = getLanIp();
// macOS/iOS/Linux Bonjour mDNS: <hostname>.local resolves over the LAN
const rawHostname = hostname();
const MDNS_HOST = rawHostname.endsWith('.local') ? rawHostname : `${rawHostname}.local`;

console.log(`LAN IP: ${LAN_IP ?? 'not found'}`);
console.log(`mDNS:   ${MDNS_HOST}`);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

interface Session {
  display?: WebSocket;
  controller?: WebSocket;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const sessions = new Map<string, Session>();

function getSession(id: string): Session {
  if (!sessions.has(id)) sessions.set(id, {});
  return sessions.get(id)!;
}

function tryPair(sessionId: string, session: Session) {
  if (session.display && session.controller) {
    clearTimeout(session.cleanupTimer);
    const msg = JSON.stringify({ type: 'paired', sessionId });
    session.display.send(msg);
    session.controller.send(msg);
    console.log(`[paired] session=${sessionId}`);
  }
}

function scheduleCleanup(sessionId: string, session: Session) {
  clearTimeout(session.cleanupTimer);
  // Clean up sessions that sit unpaired for > 5 minutes
  session.cleanupTimer = setTimeout(() => {
    sessions.delete(sessionId);
    console.log(`[cleanup] session=${sessionId}`);
  }, 5 * 60 * 1000);
}

const httpServer = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/host') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ ip: LAN_IP, mdns: MDNS_HOST }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hydra Phone relay server\n');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get('session');
  const role = url.searchParams.get('role') as 'display' | 'controller' | null;

  if (!sessionId || !role || !['display', 'controller'].includes(role)) {
    ws.close(1008, 'Missing session or role');
    return;
  }

  console.log(`[connect] role=${role} session=${sessionId}`);

  const session = getSession(sessionId);
  clearTimeout(session.cleanupTimer);

  // Replace any stale connection for this role
  if (session[role]) {
    session[role]!.close(1001, 'Replaced by new connection');
  }
  session[role] = ws;

  tryPair(sessionId, session);

  ws.on('message', (data) => {
    // Relay from controller → display and display → controller
    const other = role === 'controller' ? session.display : session.controller;
    if (other && other.readyState === WebSocket.OPEN) {
      other.send(data.toString());
    }
  });

  ws.on('close', () => {
    console.log(`[disconnect] role=${role} session=${sessionId}`);
    if (session[role] === ws) {
      session[role] = undefined;
      // Notify the other side
      const other = role === 'controller' ? session.display : session.controller;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({ type: 'disconnected', role }));
      }
      scheduleCleanup(sessionId, session);
    }
  });

  ws.on('error', (err) => {
    console.error(`[error] role=${role} session=${sessionId}`, err.message);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Hydra Phone relay server listening on ws://localhost:${PORT}`);
});
