import { randomBytes, randomUUID } from 'node:crypto';
import {
  EQUIP_SLOTS,
  findItem,
  isListColor,
  type ItemCategory,
} from '../../src/domain/catalog.ts';
import { COIN_REWARD, completionReward, purchaseBlock } from '../../src/domain/coins.ts';
import { isDateKey, localDate } from '../../src/domain/dates.ts';
import { ApiError, hashPassword, verifyPassword, hashKey, newApiKey, type Auth } from './auth.ts';
import type { Db } from './db.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class Hub {
  clients = new Set<{ userId: string; socket: { readyState: number; send: (data: string) => void } }>();

  publish(userIds: Iterable<string>) {
    const want = new Set(userIds);
    const message = JSON.stringify({ type: 'changed' });
    for (const client of this.clients) {
      if (want.has(client.userId) && client.socket.readyState === 1) {
        client.socket.send(message);
      }
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function bit(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function cleanText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string') throw new ApiError(400, `Add a ${label}.`);
  const cleaned = value.replace(/[\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) throw new ApiError(400, `Add a ${label}.`);
  if (cleaned.length > max) throw new ApiError(400, `That ${label} is too long.`);
  return cleaned;
}

function optionalNotes(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new ApiError(400, 'Notes should be plain text.');
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (cleaned.length > 2000) throw new ApiError(400, 'Those notes are too long.');
  return cleaned;
}

function emailOf(value: unknown): string {
  if (typeof value !== 'string') throw new ApiError(400, 'Add an email address.');
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'That email address does not look right.');
  }
  return email;
}

function passwordOf(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8) {
    throw new ApiError(400, 'Password needs at least 8 characters.');
  }
  if (value.length > 200) throw new ApiError(400, 'That password is too long.');
  return value;
}

function inviteCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

export function mapUser(row: Record<string, unknown>) {
  return {
    id: text(row.id),
    email: text(row.email),
    displayName: text(row.display_name),
    coins: Number(row.coins ?? 0),
  };
}

function mapList(row: Record<string, unknown>) {
  return {
    id: text(row.id),
    title: text(row.title),
    color: text(row.color),
    inviteCode: text(row.invite_code),
    role: text(row.role) === 'owner' ? 'owner' : 'member',
    openCount: Number(row.open_count ?? 0),
    doneCount: Number(row.done_count ?? 0),
    createdAt: text(row.created_at),
  };
}

function mapTask(row: Record<string, unknown>) {
  return {
    id: text(row.id),
    listId: text(row.list_id),
    title: text(row.title),
    notes: text(row.notes),
    done: bit(row.done),
    coinAwarded: bit(row.coin_awarded),
    doneOn: row.done_on ? text(row.done_on) : null,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

async function memberIds(db: Db, listId: string): Promise<string[]> {
  const rows = await db.all<{ user_id: string }>(
    `SELECT user_id FROM list_members WHERE list_id = ?`,
    [listId],
  );
  return rows.map((row) => row.user_id);
}

async function requireRole(db: Db, userId: string, listId: string) {
  const row = await db.get<{ role: string }>(
    `SELECT role FROM list_members WHERE list_id = ? AND user_id = ?`,
    [listId, userId],
  );
  if (!row) throw new ApiError(404, "That list isn't one you share.");
  return row.role === 'owner' ? 'owner' : 'member';
}

const LIST_SELECT = `
  SELECT l.*, m.role,
    (SELECT COUNT(*) FROM tasks t WHERE t.list_id = l.id AND t.done = 0) AS open_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.list_id = l.id AND t.done = 1) AS done_count
  FROM lists l
  JOIN list_members m ON m.list_id = l.id AND m.user_id = ?
`;

export async function signup(
  db: Db,
  input: { email: unknown; password: unknown; displayName?: unknown },
) {
  const email = emailOf(input.email);
  const password = passwordOf(input.password);
  const displayName =
    input.displayName == null || input.displayName === ''
      ? email.split('@')[0].slice(0, 40)
      : cleanText(input.displayName, 'name', 40);
  const existing = await db.get(`SELECT id FROM users WHERE email = ?`, [email]);
  if (existing) throw new ApiError(400, 'That email is already in use.');
  const id = randomUUID();
  const created = nowIso();
  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, coins, background, created_at)
     VALUES (?, ?, ?, ?, 0, 'bg-cozy', ?)`,
    [id, email, await hashPassword(password), displayName, created],
  );
  await db.run(`INSERT INTO owned_items (user_id, item_id, created_at) VALUES (?, 'bg-cozy', ?)`, [
    id,
    created,
  ]);
  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [id]);
  return mapUser(user!);
}

export async function login(db: Db, input: { email: unknown; password: unknown }) {
  const email = emailOf(input.email);
  const password = typeof input.password === 'string' ? input.password : '';
  const row = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!row || !(await verifyPassword(password, text(row.password_hash)))) {
    throw new ApiError(401, "Those details don't match. Try again?");
  }
  return mapUser(row);
}

export async function getMe(db: Db, userId: string) {
  const row = await db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!row) throw new ApiError(401, 'Please sign in again.');
  return mapUser(row);
}

export async function renameMe(db: Db, userId: string, displayName: unknown) {
  const name = cleanText(displayName, 'name', 40);
  await db.run(`UPDATE users SET display_name = ? WHERE id = ?`, [name, userId]);
  return getMe(db, userId);
}

export async function listLists(db: Db, userId: string) {
  const rows = await db.all(`${LIST_SELECT} ORDER BY l.created_at ASC`, [userId]);
  return rows.map(mapList);
}

export async function getList(db: Db, userId: string, listId: string) {
  const row = await db.get(`${LIST_SELECT} AND l.id = ?`, [userId, listId]);
  if (!row) throw new ApiError(404, "That list isn't one you share.");
  return mapList(row);
}

export async function createList(
  db: Db,
  hub: Hub,
  userId: string,
  input: { title: unknown; color?: unknown },
) {
  const title = cleanText(input.title, 'list name', 60);
  const color = input.color == null || input.color === '' ? 'coral' : input.color;
  if (!isListColor(color)) throw new ApiError(400, 'Pick one of the list colors.');
  const id = randomUUID();
  const created = nowIso();
  let code = inviteCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db.run(
        `INSERT INTO lists (id, title, color, invite_code, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, title, color, code, created],
      );
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      code = inviteCode();
    }
  }
  await db.run(
    `INSERT INTO list_members (list_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`,
    [id, userId, created],
  );
  hub.publish([userId]);
  return getList(db, userId, id);
}

export async function updateList(
  db: Db,
  hub: Hub,
  userId: string,
  listId: string,
  input: { title?: unknown; color?: unknown },
) {
  const role = await requireRole(db, userId, listId);
  if (role !== 'owner') throw new ApiError(403, 'Only the person who made the list can rename it.');
  const current = await db.get(`SELECT * FROM lists WHERE id = ?`, [listId]);
  if (!current) throw new ApiError(404, "That list isn't one you share.");
  const title = input.title == null ? text(current.title) : cleanText(input.title, 'list name', 60);
  const color = input.color == null ? text(current.color) : input.color;
  if (!isListColor(color)) throw new ApiError(400, 'Pick one of the list colors.');
  await db.run(`UPDATE lists SET title = ?, color = ? WHERE id = ?`, [title, color, listId]);
  hub.publish(await memberIds(db, listId));
  return getList(db, userId, listId);
}

export async function deleteList(db: Db, hub: Hub, userId: string, listId: string) {
  const role = await requireRole(db, userId, listId);
  if (role !== 'owner') throw new ApiError(403, 'Only the person who made the list can delete it.');
  const people = await memberIds(db, listId);
  await db.run(`DELETE FROM lists WHERE id = ?`, [listId]);
  hub.publish(people);
}

export async function joinList(db: Db, hub: Hub, userId: string, code: unknown) {
  if (typeof code !== 'string' || !code.trim()) throw new ApiError(400, 'Type the invite code.');
  const normalized = code.replace(/\s+/g, '').toUpperCase();
  const list = await db.get<{ id: string }>(`SELECT id FROM lists WHERE invite_code = ?`, [normalized]);
  if (!list) throw new ApiError(404, "That invite code didn't work.");
  const existing = await db.get(
    `SELECT user_id FROM list_members WHERE list_id = ? AND user_id = ?`,
    [list.id, userId],
  );
  if (!existing) {
    await db.run(
      `INSERT INTO list_members (list_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`,
      [list.id, userId, nowIso()],
    );
  }
  hub.publish(await memberIds(db, list.id));
  return { list: await getList(db, userId, list.id), already: Boolean(existing) };
}

export async function listMembers(db: Db, userId: string, listId: string) {
  await requireRole(db, userId, listId);
  const rows = await db.all(
    `SELECT u.id AS user_id, u.display_name, m.role
     FROM list_members m JOIN users u ON u.id = m.user_id
     WHERE m.list_id = ?
     ORDER BY m.joined_at ASC`,
    [listId],
  );
  return rows.map((row) => ({
    userId: text(row.user_id),
    displayName: text(row.display_name),
    role: text(row.role) === 'owner' ? 'owner' : 'member',
  }));
}

async function taskForUser(db: Db, userId: string, taskId: string) {
  const row = await db.get(
    `SELECT t.* FROM tasks t
     JOIN list_members m ON m.list_id = t.list_id AND m.user_id = ?
     WHERE t.id = ?`,
    [userId, taskId],
  );
  if (!row) throw new ApiError(404, "That task isn't on a list you share.");
  return row;
}

export async function listTasks(db: Db, userId: string, listId: string) {
  await requireRole(db, userId, listId);
  const rows = await db.all(
    `SELECT * FROM tasks WHERE list_id = ? ORDER BY done ASC, updated_at DESC`,
    [listId],
  );
  return rows.map(mapTask);
}

export async function addTask(
  db: Db,
  hub: Hub,
  userId: string,
  listId: string,
  input: { title: unknown; notes?: unknown },
) {
  await requireRole(db, userId, listId);
  const title = cleanText(input.title, 'task', 200);
  const notes = optionalNotes(input.notes);
  const id = randomUUID();
  const created = nowIso();
  await db.run(
    `INSERT INTO tasks (id, list_id, title, notes, done, coin_awarded, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?)`,
    [id, listId, title, notes, userId, created, created],
  );
  hub.publish(await memberIds(db, listId));
  const row = await db.get(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return mapTask(row!);
}

export async function editTask(
  db: Db,
  hub: Hub,
  userId: string,
  taskId: string,
  input: { title?: unknown; notes?: unknown },
) {
  const current = await taskForUser(db, userId, taskId);
  const title = input.title == null ? text(current.title) : cleanText(input.title, 'task', 200);
  const notes = input.notes == null ? text(current.notes) : optionalNotes(input.notes);
  const updated = nowIso();
  await db.run(`UPDATE tasks SET title = ?, notes = ?, updated_at = ? WHERE id = ?`, [
    title,
    notes,
    updated,
    taskId,
  ]);
  hub.publish(await memberIds(db, text(current.list_id)));
  const row = await db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
  return mapTask(row!);
}

export async function setTaskDone(
  db: Db,
  hub: Hub,
  userId: string,
  taskId: string,
  done: boolean,
  today: string,
) {
  const current = await taskForUser(db, userId, taskId);
  const wasDone = bit(current.done);
  const coinAwarded = bit(current.coin_awarded);
  const reward = completionReward({ wasDone, coinAwarded, nextDone: done });
  const updated = nowIso();
  if (done && !wasDone) {
    if (reward.coinsDelta > 0) {
      const awarded = await db.run(
        `UPDATE tasks
         SET done = 1, coin_awarded = 1, done_at = ?, done_on = ?, done_by = ?, updated_at = ?
         WHERE id = ? AND done = 0 AND coin_awarded = 0`,
        [updated, today, userId, updated, taskId],
      );
      if (awarded.changes === 1) {
        await db.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [COIN_REWARD, userId]);
      } else {
        await db.run(
          `UPDATE tasks SET done = 1, done_at = ?, done_on = ?, done_by = ?, updated_at = ?
           WHERE id = ? AND done = 0`,
          [updated, today, userId, updated, taskId],
        );
        reward.coinsDelta = 0;
      }
    } else {
      await db.run(
        `UPDATE tasks SET done = 1, done_at = ?, done_on = ?, done_by = ?, updated_at = ?
         WHERE id = ? AND done = 0`,
        [updated, today, userId, updated, taskId],
      );
    }
  } else if (!done && wasDone) {
    await db.run(
      `UPDATE tasks SET done = 0, done_at = NULL, done_on = NULL, done_by = NULL, updated_at = ?
       WHERE id = ?`,
      [updated, taskId],
    );
  }
  hub.publish(await memberIds(db, text(current.list_id)));
  const row = await db.get(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
  const me = await getMe(db, userId);
  return { task: mapTask(row!), coinsDelta: reward.coinsDelta, coins: me.coins };
}

export async function removeTask(db: Db, hub: Hub, userId: string, taskId: string) {
  const current = await taskForUser(db, userId, taskId);
  await db.run(`DELETE FROM tasks WHERE id = ?`, [taskId]);
  hub.publish(await memberIds(db, text(current.list_id)));
}

export async function getPet(db: Db, userId: string, today: string) {
  const user = await db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
  if (!user) throw new ApiError(401, 'Please sign in again.');
  const ownedRows = await db.all<{ item_id: string }>(
    `SELECT item_id FROM owned_items WHERE user_id = ? ORDER BY created_at ASC`,
    [userId],
  );
  const done = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tasks WHERE done = 1 AND done_by = ? AND done_on = ?`,
    [userId, today],
  );
  const open = await db.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM tasks t
     JOIN list_members m ON m.list_id = t.list_id AND m.user_id = ?
     WHERE t.done = 0`,
    [userId],
  );
  return {
    coins: Number(user.coins ?? 0),
    owned: ownedRows.map((row) => row.item_id),
    equipped: {
      hat: user.hat ? text(user.hat) : null,
      plant: user.plant ? text(user.plant) : null,
      furniture: user.furniture ? text(user.furniture) : null,
      background: user.background ? text(user.background) : 'bg-cozy',
    },
    todayDone: Number(done?.n ?? 0),
    todayOpen: Number(open?.n ?? 0),
  };
}

export async function buyItem(db: Db, hub: Hub, userId: string, itemId: unknown) {
  if (typeof itemId !== 'string') throw new ApiError(400, 'Pick something from the shop.');
  const item = findItem(itemId);
  if (!item || item.price <= 0) throw new ApiError(404, "That isn't in the shop.");
  const owned = await db.get(`SELECT item_id FROM owned_items WHERE user_id = ? AND item_id = ?`, [
    userId,
    item.id,
  ]);
  const user = await getMe(db, userId);
  const block = purchaseBlock(user.coins, item.price, Boolean(owned));
  if (block) throw new ApiError(400, block);
  const debit = await db.run(`UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?`, [
    item.price,
    userId,
    item.price,
  ]);
  if (debit.changes !== 1) throw new ApiError(400, "You don't have enough coins yet.");
  try {
    await db.run(`INSERT INTO owned_items (user_id, item_id, created_at) VALUES (?, ?, ?)`, [
      userId,
      item.id,
      nowIso(),
    ]);
  } catch (error) {
    await db.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [item.price, userId]);
    throw error;
  }
  hub.publish([userId]);
  return getPet(db, userId, localDate());
}

export async function equipItem(
  db: Db,
  hub: Hub,
  userId: string,
  input: { category: unknown; itemId: unknown },
) {
  const category = input.category;
  if (typeof category !== 'string' || !EQUIP_SLOTS.includes(category as ItemCategory)) {
    throw new ApiError(400, 'Pick a hat, plant, piece of furniture, or background.');
  }
  const slot = category as ItemCategory;
  let itemId: string | null = null;
  if (input.itemId != null && input.itemId !== '') {
    if (typeof input.itemId !== 'string') throw new ApiError(400, 'Pick something you own.');
    const item = findItem(input.itemId);
    if (!item || item.category !== slot) throw new ApiError(400, "That doesn't go there.");
    const owned = await db.get(
      `SELECT item_id FROM owned_items WHERE user_id = ? AND item_id = ?`,
      [userId, item.id],
    );
    if (!owned) throw new ApiError(400, 'Buy it in the shop first.');
    itemId = item.id;
  } else if (slot === 'background') {
    itemId = 'bg-cozy';
  }
  await db.run(`UPDATE users SET ${slot} = ? WHERE id = ?`, [itemId, userId]);
  hub.publish([userId]);
  return getPet(db, userId, localDate());
}

export async function listKeys(db: Db, userId: string) {
  const rows = await db.all(
    `SELECT id, name, key_prefix, created_at FROM api_keys
     WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((row) => ({
    id: text(row.id),
    name: text(row.name),
    prefix: text(row.key_prefix),
    createdAt: text(row.created_at),
  }));
}

export async function createKey(db: Db, userId: string, name: unknown) {
  const label = cleanText(name, 'name for the key', 40);
  const id = randomUUID();
  const { secret, prefix } = newApiKey();
  const created = nowIso();
  await db.run(
    `INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, label, hashKey(secret), prefix, created],
  );
  return { id, name: label, prefix, secret, createdAt: created };
}

export async function revokeKey(db: Db, userId: string, keyId: string) {
  const result = await db.run(
    `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
    [nowIso(), keyId, userId],
  );
  if (result.changes !== 1) throw new ApiError(404, "That key is already gone.");
}

export function todayFrom(value: unknown): string {
  if (isDateKey(value)) return value;
  return localDate();
}

export function assertSession(auth: Auth) {
  if (auth.kind !== 'session') {
    throw new ApiError(
      403,
      'This key only works with lists and tasks. Open Pebble to manage the shop or keys.',
    );
  }
}

export async function resolveListId(
  db: Db,
  userId: string,
  input: { listId?: unknown; listTitle?: unknown },
): Promise<string> {
  if (typeof input.listId === 'string' && input.listId) return input.listId;
  if (typeof input.listTitle !== 'string' || !input.listTitle.trim()) {
    throw new ApiError(400, 'Say which list, by its id or its name.');
  }
  const title = input.listTitle.trim().toLowerCase();
  const lists = await listLists(db, userId);
  const matches = lists.filter((list) => list.title.toLowerCase() === title);
  if (matches.length === 1) return matches[0].id;
  if (matches.length === 0) throw new ApiError(404, 'No list is called that.');
  throw new ApiError(400, 'More than one list is called that. Use the list id.');
}
