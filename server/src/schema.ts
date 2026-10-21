export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    coins INTEGER NOT NULL DEFAULT 0,
    hat TEXT,
    plant TEXT,
    furniture TEXT,
    background TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    color TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS list_members (
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (list_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0,
    coin_awarded INTEGER NOT NULL DEFAULT 0,
    done_at TEXT,
    done_on TEXT,
    done_by TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS owned_items (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, item_id)
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id)`,
  `CREATE INDEX IF NOT EXISTS idx_members_user ON list_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`,
];
