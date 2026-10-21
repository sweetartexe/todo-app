import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { WebSocket } from 'ws';
import { completionReward, purchaseBlock, COIN_REWARD } from '../../src/domain/coins.ts';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../src/domain/demo.ts';
import { localDate } from '../../src/domain/dates.ts';
import { startServer } from '../src/serve.ts';

test('coins are awarded once', () => {
  assert.equal(completionReward({ wasDone: false, coinAwarded: false, nextDone: true }).coinsDelta, COIN_REWARD);
  assert.equal(completionReward({ wasDone: true, coinAwarded: true, nextDone: false }).coinsDelta, 0);
  assert.equal(
    completionReward({ wasDone: false, coinAwarded: true, nextDone: true }).coinsDelta,
    0,
  );
  assert.equal(completionReward({ wasDone: true, coinAwarded: true, nextDone: true }).coinsDelta, 0);
  assert.equal(purchaseBlock(5, 20, false), "You don't have enough coins yet.");
  assert.equal(purchaseBlock(20, 20, true), 'You already own this.');
  assert.equal(purchaseBlock(20, 20, false), null);
});

type Started = Awaited<ReturnType<typeof startServer>>;

let server: Started;
const today = '2026-10-21';

before(async () => {
  server = await startServer({
    port: 0,
    databasePath: ':memory:',
    seed: false,
    jwtSecret: 'test-secret',
  });
});

after(async () => {
  await server.close();
});

async function api(
  path: string,
  options: { token?: string; method?: string; body?: unknown } = {},
) {
  const response = await fetch(server.url + path, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  return { status: response.status, data };
}

async function user(name: string) {
  const email = `${name}@example.com`;
  const signed = await api('/v1/auth/signup', {
    body: { email, password: 'password1', displayName: name },
  });
  assert.equal(signed.status, 200, JSON.stringify(signed.data));
  return { token: signed.data.token as string, id: signed.data.user.id as string };
}

test('health and privacy pages respond', async () => {
  const health = await api('/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  const privacy = await fetch(server.url + '/privacy');
  assert.equal(privacy.status, 200);
  assert.match(await privacy.text(), /Pebble privacy/);
});

test('signup rejects a short password and a duplicate email', async () => {
  const short = await api('/v1/auth/signup', {
    body: { email: 'short@example.com', password: 'tiny' },
  });
  assert.equal(short.status, 400);
  const first = await user('Ada');
  assert.ok(first.token);
  const again = await api('/v1/auth/signup', {
    body: { email: 'ada@example.com', password: 'password1', displayName: 'Ada' },
  });
  assert.equal(again.status, 400);
  const bad = await api('/v1/auth/login', {
    body: { email: 'ada@example.com', password: 'nope-nope' },
  });
  assert.equal(bad.status, 401);
});

test('sharing, coins, and the shop', async () => {
  const ada = await user('Nia');
  const sam = await user('Sam');
  const created = await api('/v1/lists', {
    token: ada.token,
    body: { title: 'Groceries', color: 'leaf' },
  });
  assert.equal(created.status, 200);
  const listId = created.data.id as string;
  const code = created.data.inviteCode as string;

  const hidden = await api(`/v1/lists/${listId}/tasks`, { token: sam.token });
  assert.equal(hidden.status, 404);

  const joined = await api('/v1/lists/join', { token: sam.token, body: { code } });
  assert.equal(joined.status, 200);
  assert.equal(joined.data.already, false);

  const added = await api(`/v1/lists/${listId}/tasks`, {
    token: sam.token,
    body: { title: 'Lemons', notes: 'A net of them' },
  });
  assert.equal(added.status, 200);
  const taskId = added.data.id as string;

  const seen = await api(`/v1/lists/${listId}/tasks`, { token: ada.token });
  assert.equal(seen.data.tasks.some((task: { title: string }) => task.title === 'Lemons'), true);

  const first = await api(`/v1/tasks/${taskId}/complete`, {
    token: sam.token,
    body: { done: true, today },
  });
  assert.equal(first.status, 200);
  assert.equal(first.data.coinsDelta, COIN_REWARD);
  assert.equal(first.data.coins, COIN_REWARD);

  const again = await api(`/v1/tasks/${taskId}/complete`, {
    token: sam.token,
    body: { done: true, today },
  });
  assert.equal(again.data.coinsDelta, 0);
  assert.equal(again.data.coins, COIN_REWARD);

  const untick = await api(`/v1/tasks/${taskId}/complete`, {
    token: sam.token,
    body: { done: false, today },
  });
  assert.equal(untick.data.coinsDelta, 0);
  assert.equal(untick.data.task.done, false);
  assert.equal(untick.data.task.coinAwarded, true);

  const retick = await api(`/v1/tasks/${taskId}/complete`, {
    token: sam.token,
    body: { done: true, today },
  });
  assert.equal(retick.data.coinsDelta, 0);
  assert.equal(retick.data.coins, COIN_REWARD);

  const adaPet = await api(`/v1/pet?today=${today}`, { token: ada.token });
  assert.equal(adaPet.data.coins, 0);

  const edited = await api(`/v1/tasks/${taskId}`, {
    token: ada.token,
    method: 'PATCH',
    body: { title: 'Lemons and limes' },
  });
  assert.equal(edited.data.title, 'Lemons and limes');

  const removed = await api(`/v1/lists/${listId}`, { token: sam.token, method: 'DELETE' });
  assert.equal(removed.status, 403);
  const gone = await api(`/v1/lists/${listId}`, { token: ada.token, method: 'DELETE' });
  assert.equal(gone.status, 200);
  const after = await api(`/v1/lists/${listId}/tasks`, { token: ada.token });
  assert.equal(after.status, 404);

  const pocket = await api('/v1/lists', { token: sam.token, body: { title: 'Pocket', color: 'coral' } });
  assert.equal(pocket.status, 200, JSON.stringify(pocket.data));
  const extra = await api(`/v1/lists/${pocket.data.id}/tasks`, {
    token: sam.token,
    body: { title: 'Bread' },
  });
  const paid = await api(`/v1/tasks/${extra.data.id}/complete`, {
    token: sam.token,
    body: { done: true, today },
  });
  assert.equal(paid.data.coins, COIN_REWARD * 2);

  const poor = await api('/v1/shop/buy', { token: sam.token, body: { itemId: 'hat-crown' } });
  assert.equal(poor.status, 400);
  const bought = await api('/v1/shop/buy', { token: sam.token, body: { itemId: 'hat-sprout' } });
  assert.equal(bought.status, 200);
  assert.equal(bought.data.coins, 0);
  assert.ok(bought.data.owned.includes('hat-sprout'));
  const twice = await api('/v1/shop/buy', { token: sam.token, body: { itemId: 'hat-sprout' } });
  assert.equal(twice.status, 400);
  const worn = await api('/v1/pet/equip', {
    token: sam.token,
    body: { category: 'hat', itemId: 'hat-sprout' },
  });
  assert.equal(worn.data.equipped.hat, 'hat-sprout');
});

test('api keys and the MCP tools', async () => {
  const ada = await user('Kai');
  const list = await api('/v1/lists', { token: ada.token, body: { title: 'Errands', color: 'sun' } });
  const listId = list.data.id as string;
  const created = await api('/v1/api-keys', { token: ada.token, body: { name: 'Claude' } });
  assert.equal(created.status, 200);
  const secret = created.data.secret as string;
  assert.ok(secret.startsWith('pebble_'));

  const denied = await api('/v1/shop/buy', { token: secret, body: { itemId: 'hat-party' } });
  assert.equal(denied.status, 403);

  const listed = await api('/v1/lists', { token: secret });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.lists.length, 1);

  const init = await api('/mcp', {
    token: secret,
    body: {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    },
  });
  assert.equal(init.status, 200);
  assert.equal(init.data.result.serverInfo.name, 'pebble');

  const names = await api('/mcp', {
    token: secret,
    body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  });
  const toolNames = names.data.result.tools.map((tool: { name: string }) => tool.name);
  assert.deepEqual(toolNames, ['list_lists', 'list_tasks', 'add_task', 'complete_task', 'delete_task']);

  const added = await api('/mcp', {
    token: secret,
    body: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'add_task', arguments: { listId, title: 'Post the letter' } },
    },
  });
  assert.equal(added.status, 200);
  assert.match(added.data.result.content[0].text, /Post the letter/);

  const tasks = await api(`/v1/lists/${listId}/tasks`, { token: secret });
  const taskId = tasks.data.tasks[0].id as string;
  const done = await api('/mcp', {
    token: secret,
    body: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'complete_task', arguments: { taskId, today } },
    },
  });
  assert.match(done.data.result.content[0].text, /10 coins/);

  const farm = await api('/mcp', {
    token: secret,
    body: {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'complete_task', arguments: { taskId, done: false, today } },
    },
  });
  assert.match(farm.data.result.content[0].text, /not taken back/);
  const farm2 = await api(`/v1/tasks/${taskId}/complete`, {
    token: secret,
    body: { done: true, today },
  });
  assert.equal(farm2.data.coinsDelta, 0);

  const deleted = await api('/mcp', {
    token: secret,
    body: {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'delete_task', arguments: { taskId } },
    },
  });
  assert.match(deleted.data.result.content[0].text, /Deleted/);
  const empty = await api(`/v1/lists/${listId}/tasks`, { token: secret });
  assert.equal(empty.data.tasks.length, 0);

  const noKey = await api('/mcp', {
    body: { jsonrpc: '2.0', id: 7, method: 'tools/list' },
  });
  assert.equal(noKey.status, 401);

  await api(`/v1/api-keys/${created.data.id}`, { token: ada.token, method: 'DELETE' });
  const revoked = await api('/v1/lists', { token: secret });
  assert.equal(revoked.status, 401);
});

test('a websocket hears a shared change', async () => {
  const ada = await user('Rio');
  const sam = await user('Noor');
  const list = await api('/v1/lists', { token: ada.token, body: { title: 'Flat', color: 'sky' } });
  await api('/v1/lists/join', { token: sam.token, body: { code: list.data.inviteCode } });
  const messages: string[] = [];
  const ws = new WebSocket(`${server.url.replace('http', 'ws')}/v1/ws?access_token=${encodeURIComponent(sam.token)}`);
  ws.on('message', (data) => messages.push(String(data)));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('websocket did not open')), 2000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  const started = Date.now();
  while (!messages.some((message) => message.includes('hello')) && Date.now() - started < 2000) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(messages.some((message) => message.includes('hello')));
  await api(`/v1/lists/${list.data.id}/tasks`, { token: ada.token, body: { title: 'Bins' } });
  const waitUntil = Date.now() + 2000;
  while (!messages.some((message) => message.includes('changed')) && Date.now() < waitUntil) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(messages.some((message) => message.includes('changed')));
  ws.close();
});

test('demo accounts are seeded on an empty database', async () => {
  const demo = await startServer({
    port: 0,
    databasePath: ':memory:',
    seed: true,
    jwtSecret: 'test-secret',
  });
  try {
    const response = await fetch(demo.url + '/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const data = (await response.json()) as { token: string };
    assert.equal(response.status, 200);
    const lists = await fetch(demo.url + '/v1/lists', {
      headers: { authorization: `Bearer ${data.token}` },
    });
    const body = (await lists.json()) as { lists: Array<{ title: string; inviteCode: string }> };
    assert.equal(body.lists.length, 2);
    const pet = await fetch(demo.url + `/v1/pet?today=${localDate()}`, {
      headers: { authorization: `Bearer ${data.token}` },
    });
    const petBody = (await pet.json()) as { coins: number; todayDone: number; equipped: { hat: string } };
    assert.equal(petBody.coins, 45);
    assert.equal(petBody.equipped.hat, 'hat-party');
    assert.equal(petBody.todayDone, 2);
  } finally {
    await demo.close();
  }
});
