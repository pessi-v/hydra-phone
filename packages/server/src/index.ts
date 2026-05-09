import { createServer, IncomingMessage } from 'http';
import { networkInterfaces, hostname } from 'os';
import { execSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';

// ─── Environment ──────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

/**
 * When set, returned in /api/host so the display builds the QR URL using the
 * public domain instead of the LAN IP / mDNS hostname.
 */
const PUBLIC_HOST = process.env.PUBLIC_HOST ?? null;

/**
 * When set, the server serves the Vite-built client from this directory.
 * Typically /srv/static in the Docker image.
 */
const STATIC_DIR = process.env.STATIC_DIR ? resolve(process.env.STATIC_DIR) : null;

// ─── LAN IP / mDNS detection ─────────────────────────────────────────────────

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

function getMdnsHost(): string {
  // On macOS, scutil --get LocalHostName returns the Bonjour/mDNS hostname,
  // which may differ from os.hostname() (e.g. "m2-air" vs "Mac").
  if (process.platform === 'darwin') {
    try {
      const local = execSync('scutil --get LocalHostName', { encoding: 'utf8' }).trim();
      if (local) return `${local}.local`;
    } catch { /* fall through */ }
  }
  const raw = hostname();
  return raw.endsWith('.local') ? raw : `${raw}.local`;
}

const MDNS_HOST = getMdnsHost();

console.log(`LAN IP:      ${LAN_IP ?? 'not found'}`);
console.log(`mDNS:        ${MDNS_HOST}`);
console.log(`PUBLIC_HOST: ${PUBLIC_HOST ?? '(not set)'}`);
console.log(`STATIC_DIR:  ${STATIC_DIR ?? '(not set)'}`);

// ─── Static file serving ──────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
};

function serveStatic(pathname: string, res: import('http').ServerResponse): boolean {
  if (!STATIC_DIR) return false;

  // Map clean URL paths to HTML files
  let urlPath = pathname;
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  else if (urlPath === '/ctrl') urlPath = '/ctrl.html';

  const filePath = resolve(join(STATIC_DIR, urlPath));
  // Guard against path traversal
  if (!filePath.startsWith(STATIC_DIR)) return false;

  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;

  const mime = MIME[extname(filePath)] ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  createReadStream(filePath).pipe(res);
  return true;
}

// ─── Session relay ────────────────────────────────────────────────────────────

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
  session.cleanupTimer = setTimeout(() => {
    sessions.delete(sessionId);
    console.log(`[cleanup] session=${sessionId}`);
  }, 5 * 60 * 1000);
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/host') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ ip: LAN_IP, mdns: MDNS_HOST, publicHost: PUBLIC_HOST }));
    return;
  }

  if (req.method === 'GET' && serveStatic(pathname, res)) {
    return;
  }

  if (STATIC_DIR && req.method === 'GET') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hydra Phone relay server\n');
});

// ─── WebSocket server ─────────────────────────────────────────────────────────

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

  if (session[role]) {
    session[role]!.close(1001, 'Replaced by new connection');
  }
  session[role] = ws;

  tryPair(sessionId, session);

  ws.on('message', (data) => {
    const other = role === 'controller' ? session.display : session.controller;
    if (other && other.readyState === WebSocket.OPEN) {
      other.send(data.toString());
    }
  });

  ws.on('close', () => {
    console.log(`[disconnect] role=${role} session=${sessionId}`);
    if (session[role] === ws) {
      session[role] = undefined;
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
  console.log(`Hydra Phone relay server listening on :${PORT}`);
});
