import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, type WebSocket } from 'ws';
import { authenticate, ApiError, signJwt } from './auth.ts';
import type { Db } from './db.ts';
import { handleMcp } from './mcp.ts';
import { SCHEMA } from './schema.ts';
import { seedIfEmpty } from './seed.ts';
import {
  addTask,
  assertSession,
  buyItem,
  createKey,
  createList,
  deleteList,
  editTask,
  equipItem,
  getList,
  getMe,
  getPet,
  Hub,
  joinList,
  listKeys,
  listLists,
  listMembers,
  listTasks,
  login,
  removeTask,
  renameMe,
  revokeKey,
  setTaskDone,
  signup,
  todayFrom,
  updateList,
} from './logic.ts';

type Route = {
  method: string;
  pattern: string;
  auth: boolean;
  handler: (ctx: RequestCtx) => Promise<unknown>;
};

type RequestCtx = {
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  userId: string;
  kind: 'session' | 'key';
};

const KEY_ALLOWED = new Set([
  'GET /v1/me',
  'GET /v1/lists',
  'GET /v1/lists/:id',
  'GET /v1/lists/:id/tasks',
  'GET /v1/lists/:id/members',
  'POST /v1/lists/:id/tasks',
  'PATCH /v1/tasks/:id',
  'POST /v1/tasks/:id/complete',
  'DELETE /v1/tasks/:id',
  'GET /v1/pet',
]);

function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const expected = pattern.split('/').filter(Boolean);
  const actual = pathname.split('/').filter(Boolean);
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
    else if (expected[i] !== actual[i]) return null;
  }
  return params;
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new ApiError(413, 'That was too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new ApiError(400, 'The request was not a JSON object.'));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new ApiError(400, 'The request was not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown, contentType = 'application/json; charset=utf-8') {
  const payload = contentType.includes('json') ? JSON.stringify(body) : String(body);
  res.writeHead(status, {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

const HOME_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pebble</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: Georgia, serif; background:#FFF6EA; color:#3A2718; margin:0; padding:48px 20px; }
  main { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 40px; margin-bottom: 0; }
  a { color:#E45436; }
</style></head>
<body><main>
  <h1>Pebble is running.</h1>
  <p>This is the little program that remembers your lists. The phone app talks to it. You can close this tab.</p>
  <p><a href="/privacy">Privacy</a> · <a href="/health">Health check</a></p>
</main></body></html>`;

const PRIVACY_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Pebble privacy</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font-family: Georgia, serif; background:#FFF6EA; color:#3A2718; margin:0; padding:48px 20px; line-height:1.5; }
  main { max-width: 640px; margin: 0 auto; }
</style></head>
<body><main>
  <h1>Pebble privacy</h1>
  <p>Pebble stores the email and password you choose (the password is scrambled), your lists and tasks, your pet's coins and decorations, and any assistant keys you create.</p>
  <p>If you run Pebble on your own computer, that information stays on that computer. If you put Pebble on a hosting service, that service stores it so your phone can reach it from anywhere.</p>
  <p>An assistant key lets the assistant you chose read your lists and add, finish, or delete tasks, until you revoke the key in the app. Keys cannot spend coins or make new keys.</p>
  <p>Pebble does not show ads and does not sell this information.</p>
</main></body></html>`;

function routes(db: Db, hub: Hub, jwtSecret: string): Route[] {
  const sessionUser = async (ctx: RequestCtx) => {
    assertSession({ userId: ctx.userId, kind: ctx.kind });
    return ctx.userId;
  };
  return [
    {
      method: 'POST',
      pattern: '/v1/auth/signup',
      auth: false,
      handler: async ({ body }) => {
        const user = await signup(db, body);
        return { token: signJwt(user.id, jwtSecret), user };
      },
    },
    {
      method: 'POST',
      pattern: '/v1/auth/login',
      auth: false,
      handler: async ({ body }) => {
        const user = await login(db, body);
        return { token: signJwt(user.id, jwtSecret), user };
      },
    },
    { method: 'GET', pattern: '/v1/me', auth: true, handler: async (ctx) => getMe(db, ctx.userId) },
    {
      method: 'PATCH',
      pattern: '/v1/me',
      auth: true,
      handler: async (ctx) => renameMe(db, await sessionUser(ctx), ctx.body.displayName),
    },
    { method: 'GET', pattern: '/v1/lists', auth: true, handler: async (ctx) => ({ lists: await listLists(db, ctx.userId) }) },
    {
      method: 'POST',
      pattern: '/v1/lists',
      auth: true,
      handler: async (ctx) => createList(db, hub, await sessionUser(ctx), ctx.body),
    },
    {
      method: 'POST',
      pattern: '/v1/lists/join',
      auth: true,
      handler: async (ctx) => joinList(db, hub, await sessionUser(ctx), ctx.body.code),
    },
    {
      method: 'GET',
      pattern: '/v1/lists/:id',
      auth: true,
      handler: async (ctx) => getList(db, ctx.userId, ctx.params.id),
    },
    {
      method: 'PATCH',
      pattern: '/v1/lists/:id',
      auth: true,
      handler: async (ctx) => updateList(db, hub, await sessionUser(ctx), ctx.params.id, ctx.body),
    },
    {
      method: 'DELETE',
      pattern: '/v1/lists/:id',
      auth: true,
      handler: async (ctx) => {
        await deleteList(db, hub, await sessionUser(ctx), ctx.params.id);
        return { ok: true };
      },
    },
    {
      method: 'GET',
      pattern: '/v1/lists/:id/tasks',
      auth: true,
      handler: async (ctx) => ({ tasks: await listTasks(db, ctx.userId, ctx.params.id) }),
    },
    {
      method: 'POST',
      pattern: '/v1/lists/:id/tasks',
      auth: true,
      handler: async (ctx) => addTask(db, hub, ctx.userId, ctx.params.id, ctx.body),
    },
    {
      method: 'GET',
      pattern: '/v1/lists/:id/members',
      auth: true,
      handler: async (ctx) => ({ members: await listMembers(db, ctx.userId, ctx.params.id) }),
    },
    {
      method: 'PATCH',
      pattern: '/v1/tasks/:id',
      auth: true,
      handler: async (ctx) => editTask(db, hub, ctx.userId, ctx.params.id, ctx.body),
    },
    {
      method: 'POST',
      pattern: '/v1/tasks/:id/complete',
      auth: true,
      handler: async (ctx) =>
        setTaskDone(db, hub, ctx.userId, ctx.params.id, Boolean(ctx.body.done), todayFrom(ctx.body.today)),
    },
    {
      method: 'DELETE',
      pattern: '/v1/tasks/:id',
      auth: true,
      handler: async (ctx) => {
        await removeTask(db, hub, ctx.userId, ctx.params.id);
        return { ok: true };
      },
    },
    {
      method: 'GET',
      pattern: '/v1/pet',
      auth: true,
      handler: async (ctx) => getPet(db, ctx.userId, todayFrom(ctx.query.get('today'))),
    },
    {
      method: 'POST',
      pattern: '/v1/shop/buy',
      auth: true,
      handler: async (ctx) => buyItem(db, hub, await sessionUser(ctx), ctx.body.itemId),
    },
    {
      method: 'POST',
      pattern: '/v1/pet/equip',
      auth: true,
      handler: async (ctx) => equipItem(db, hub, await sessionUser(ctx), ctx.body),
    },
    {
      method: 'GET',
      pattern: '/v1/api-keys',
      auth: true,
      handler: async (ctx) => ({ keys: await listKeys(db, await sessionUser(ctx)) }),
    },
    {
      method: 'POST',
      pattern: '/v1/api-keys',
      auth: true,
      handler: async (ctx) => createKey(db, await sessionUser(ctx), ctx.body.name),
    },
    {
      method: 'DELETE',
      pattern: '/v1/api-keys/:id',
      auth: true,
      handler: async (ctx) => {
        await revokeKey(db, await sessionUser(ctx), ctx.params.id);
        return { ok: true };
      },
    },
  ];
}

export async function startServer(options: {
  port?: number;
  databasePath?: string;
  databaseUrl?: string;
  seed?: boolean;
  jwtSecret?: string;
} = {}) {
  const databaseUrl = options.databasePath ? undefined : options.databaseUrl;
  const db = await (await import('./db.ts')).openDatabase({
    path: options.databasePath,
    url: databaseUrl,
  });
  for (const statement of SCHEMA) await db.exec(statement);
  if (options.seed !== false) await seedIfEmpty(db);
  const jwtSecret = options.jwtSecret || 'pebble-dev-only-change-me';
  const hub = new Hub();
  const table = routes(db, hub, jwtSecret);

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'OPTIONS') {
      send(res, 204, {});
      return;
    }
    if (req.method === 'GET' && url.pathname === '/') {
      send(res, 200, HOME_HTML, 'text/html; charset=utf-8');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/privacy') {
      send(res, 200, PRIVACY_HTML, 'text/html; charset=utf-8');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, service: 'pebble' });
      return;
    }
    try {
      if (req.method === 'POST' && url.pathname === '/mcp') {
        const header = req.headers.authorization || '';
        const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
        const auth = await authenticate(db, jwtSecret, token);
        const body = await readBody(req);
        const result = await handleMcp(db, hub, auth.userId, body);
        if ('notification' in result) {
          res.writeHead(202, { 'access-control-allow-origin': '*' });
          res.end();
          return;
        }
        send(res, 200, result);
        return;
      }

      const route = table.find((item) => item.method === req.method && matchRoute(item.pattern, url.pathname));
      if (!route) {
        send(res, 404, { error: 'Not found.' });
        return;
      }
      const params = matchRoute(route.pattern, url.pathname)!;
      let userId = '';
      let kind: 'session' | 'key' = 'session';
      if (route.auth) {
        const header = req.headers.authorization || '';
        const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
        const auth = await authenticate(db, jwtSecret, token);
        userId = auth.userId;
        kind = auth.kind;
        if (kind === 'key' && !KEY_ALLOWED.has(`${route.method} ${route.pattern}`)) {
          throw new ApiError(
            403,
            'This key only works with lists and tasks. Open Pebble to manage the shop or keys.',
          );
        }
      }
      const body = req.method === 'GET' || req.method === 'DELETE' ? {} : await readBody(req);
      const result = await route.handler({ params, query: url.searchParams, body, userId, kind });
      send(res, 200, result ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError) send(res, error.status, { error: error.message });
      else {
        console.error(error);
        send(res, 500, { error: 'Something went wrong on the server.' });
      }
    }
  };

  const server = createServer((req, res) => {
    void handler(req, res);
  });
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname !== '/v1/ws') {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (socketWs) => {
      void attachSocket(socketWs, url, db, jwtSecret, hub);
    });
  });

  const port = options.port ?? 8787;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => resolve());
  });
  const address = server.address();
  const actual = typeof address === 'object' && address ? address.port : port;
  return {
    url: `http://127.0.0.1:${actual}`,
    port: actual,
    async close() {
      for (const client of wss.clients) client.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await db.close();
    },
  };
}

async function attachSocket(socket: WebSocket, url: URL, db: Db, jwtSecret: string, hub: Hub) {
  try {
    const token = url.searchParams.get('access_token') || '';
    const auth = await authenticate(db, jwtSecret, token);
    const client = { userId: auth.userId, socket };
    hub.clients.add(client);
    socket.on('close', () => hub.clients.delete(client));
    socket.send(JSON.stringify({ type: 'hello' }));
  } catch {
    socket.close(4001, 'Please sign in again.');
  }
}

export function lanAddresses(): string[] {
  const found: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) found.push(entry.address);
    }
  }
  return found;
}
