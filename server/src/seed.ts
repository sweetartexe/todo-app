import { hashPassword } from './auth.ts';
import type { Db } from './db.ts';
import {
  DEMO_EMAIL,
  DEMO_HOME_CODE,
  DEMO_NAME,
  DEMO_PASSWORD,
  DEMO_PICNIC_CODE,
  FRIEND_EMAIL,
  FRIEND_NAME,
  FRIEND_PASSWORD,
} from '../../src/domain/demo.ts';
import { localDate } from '../../src/domain/dates.ts';

const DEMO_ID = '11111111-1111-4111-8111-111111111111';
const FRIEND_ID = '22222222-2222-4222-8222-222222222222';
const HOME_ID = '33333333-3333-4333-8333-333333333333';
const PICNIC_ID = '44444444-4444-4444-8444-444444444444';

export async function seedIfEmpty(db: Db) {
  const existing = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM users`);
  if (Number(existing?.n ?? 0) > 0) return;
  const created = new Date().toISOString();
  const today = localDate();
  const demoHash = await hashPassword(DEMO_PASSWORD);
  const friendHash = await hashPassword(FRIEND_PASSWORD);

  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, coins, hat, plant, furniture, background, created_at)
     VALUES (?, ?, ?, ?, 45, 'hat-party', 'plant-sprout', NULL, 'bg-sunrise', ?)`,
    [DEMO_ID, DEMO_EMAIL, demoHash, DEMO_NAME, created],
  );
  await db.run(
    `INSERT INTO users (id, email, password_hash, display_name, coins, background, created_at)
     VALUES (?, ?, ?, ?, 10, 'bg-cozy', ?)`,
    [FRIEND_ID, FRIEND_EMAIL, friendHash, FRIEND_NAME, created],
  );

  for (const item of ['bg-cozy', 'bg-sunrise', 'hat-party', 'plant-sprout']) {
    await db.run(`INSERT INTO owned_items (user_id, item_id, created_at) VALUES (?, ?, ?)`, [
      DEMO_ID,
      item,
      created,
    ]);
  }
  await db.run(`INSERT INTO owned_items (user_id, item_id, created_at) VALUES (?, 'bg-cozy', ?)`, [
    FRIEND_ID,
    created,
  ]);

  await db.run(
    `INSERT INTO lists (id, title, color, invite_code, created_at) VALUES (?, 'Home', 'coral', ?, ?)`,
    [HOME_ID, DEMO_HOME_CODE, created],
  );
  await db.run(
    `INSERT INTO lists (id, title, color, invite_code, created_at) VALUES (?, 'Weekend picnic', 'leaf', ?, ?)`,
    [PICNIC_ID, DEMO_PICNIC_CODE, created],
  );
  await db.run(
    `INSERT INTO list_members (list_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`,
    [HOME_ID, DEMO_ID, created],
  );
  await db.run(
    `INSERT INTO list_members (list_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`,
    [PICNIC_ID, DEMO_ID, created],
  );
  await db.run(
    `INSERT INTO list_members (list_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)`,
    [PICNIC_ID, FRIEND_ID, created],
  );

  const tasks: Array<[string, string, string, number, number, string | null]> = [
    ['t1', HOME_ID, 'Water the plants', 1, 1, DEMO_ID],
    ['t2', HOME_ID, 'Buy oat milk', 0, 0, null],
    ['t3', HOME_ID, 'Call grandma', 0, 0, null],
    ['t4', HOME_ID, 'Put the kettle on', 0, 0, null],
    ['t5', PICNIC_ID, 'Pack sandwiches', 0, 0, null],
    ['t6', PICNIC_ID, 'Check the weather', 1, 1, DEMO_ID],
    ['t7', PICNIC_ID, 'Bring a blanket', 0, 0, null],
  ];
  for (const [id, listId, title, done, awarded, doneBy] of tasks) {
    await db.run(
      `INSERT INTO tasks
        (id, list_id, title, notes, done, coin_awarded, done_at, done_on, done_by, created_by, created_at, updated_at)
       VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        listId,
        title,
        done,
        awarded,
        done ? created : null,
        done ? today : null,
        doneBy,
        DEMO_ID,
        created,
        created,
      ],
    );
  }
}
