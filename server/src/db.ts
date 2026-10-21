import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import postgres from 'postgres';

export type Row = Record<string, unknown>;

export interface Db {
  all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

export async function openDatabase(options: { path?: string; url?: string }): Promise<Db> {
  if (options.url) return openPostgres(options.url);
  if (!options.path) throw new Error('A database path or DATABASE_URL is required.');
  return openSqlite(options.path);
}

function openSqlite(file: string): Db {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  try {
    db.exec('PRAGMA journal_mode = WAL');
  } catch {
    // The memory database does not use WAL.
  }
  return {
    async all(sql, params = []) {
      return db.prepare(sql).all(...(params as never[])) as Row[];
    },
    async get(sql, params = []) {
      const row = db.prepare(sql).get(...(params as never[]));
      return (row as Row | undefined) ?? undefined;
    },
    async run(sql, params = []) {
      const info = db.prepare(sql).run(...(params as never[]));
      return { changes: Number(info.changes ?? 0) };
    },
    async exec(sql) {
      db.exec(sql);
    },
    async close() {
      db.close();
    },
  };
}

function toPostgres(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function openPostgres(url: string): Promise<Db> {
  const sql = postgres(url, {
    ssl: process.env.DATABASE_SSL === 'false' ? false : 'require',
    max: 5,
    prepare: false,
  });
  return {
    async all(text, params = []) {
      const rows = await sql.unsafe(toPostgres(text), params as never[]);
      return [...rows] as Row[];
    },
    async get(text, params = []) {
      const rows = await sql.unsafe(toPostgres(text), params as never[]);
      return (rows[0] as Row | undefined) ?? undefined;
    },
    async run(text, params = []) {
      const rows = await sql.unsafe(toPostgres(text), params as never[]);
      return { changes: Number(rows.count ?? 0) };
    },
    async exec(text) {
      await sql.unsafe(text);
    },
    async close() {
      await sql.end({ timeout: 5 });
    },
  };
}
