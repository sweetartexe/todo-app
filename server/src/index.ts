import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanAddresses, startServer } from './serve.ts';

function loadEnvFile() {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

const secret = process.env.JWT_SECRET || 'pebble-dev-only-change-me';
if (secret === 'pebble-dev-only-change-me') {
  console.warn('Pebble is using the built-in dev secret. Set JWT_SECRET before you share this server on the internet.');
}

const databaseUrl = process.env.DATABASE_URL || undefined;
const databasePath = databaseUrl
  ? undefined
  : process.env.DATABASE_PATH || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'pebble.db');

const server = await startServer({
  port: Number(process.env.PORT || 8787),
  databasePath,
  databaseUrl,
  seed: process.env.SEED_DEMO !== 'false',
  jwtSecret: secret,
});

const addresses = lanAddresses();
console.log(`Pebble is listening on ${server.url}`);
if (addresses.length) {
  console.log('On your phone, the app will try:');
  for (const address of addresses) console.log(`  http://${address}:${server.port}`);
}
console.log('Leave this window open while you use the app.');
