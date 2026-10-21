import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Db } from './db.ts';

const scryptAsync = promisify(scrypt);

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type Auth = { userId: string; kind: 'session' | 'key' };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hex] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const actual = Buffer.from(hex, 'hex');
  if (actual.length !== derived.length) return false;
  return timingSafeEqual(actual, derived);
}

export function signJwt(userId: string, secret: string, now = Date.now()): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: userId, exp: Math.floor(now / 1000) + 60 * 60 * 24 * 30 }),
  ).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function readJwt(token: string, secret: string): string {
  const parts = token.split('.');
  if (parts.length !== 3) throw new ApiError(401, 'Please sign in again.');
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError(401, 'Please sign in again.');
  }
  let payload: { sub?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch {
    throw new ApiError(401, 'Please sign in again.');
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
    throw new ApiError(401, 'Please sign in again.');
  }
  return payload.sub;
}

export function hashKey(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function newApiKey(): { secret: string; prefix: string } {
  const secret = `pebble_${randomBytes(24).toString('hex')}`;
  return { secret, prefix: `${secret.slice(0, 14)}…` };
}

export async function authenticate(db: Db, jwtSecret: string, token: string): Promise<Auth> {
  if (!token) throw new ApiError(401, 'Please sign in again.');
  if (token.startsWith('pebble_')) {
    const row = await db.get<{ user_id: string }>(
      `SELECT user_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`,
      [hashKey(token)],
    );
    if (!row) throw new ApiError(401, "That key doesn't work. It may have been revoked.");
    return { userId: row.user_id, kind: 'key' };
  }
  return { userId: readJwt(token, jwtSecret), kind: 'session' };
}
