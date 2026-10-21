import type { Db } from './db.ts';
import { ApiError } from './auth.ts';
import {
  addTask,
  getPet,
  listLists,
  listTasks,
  removeTask,
  resolveListId,
  setTaskDone,
  todayFrom,
  type Hub,
} from './logic.ts';

type ToolArgs = Record<string, unknown>;

const tools = [
  {
    name: 'list_lists',
    description: 'List the shared to-do lists this person can see, with how many tasks are still open.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_tasks',
    description: 'List the tasks on one list. Pass listId, or listTitle if you know the list name.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string' },
        listTitle: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'add_task',
    description: 'Add a task to a list the person shares.',
    inputSchema: {
      type: 'object',
      properties: {
        listId: { type: 'string' },
        listTitle: { type: 'string' },
        title: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['title'],
      additionalProperties: false,
    },
  },
  {
    name: 'complete_task',
    description:
      'Mark a task done or not done. Finishing a task for the first time gives coins. Unticking does not take coins away, and ticking again does not give more coins.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        done: { type: 'boolean' },
        today: { type: 'string', description: 'Local calendar day YYYY-MM-DD. Optional.' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
  {
    name: 'delete_task',
    description: 'Remove a task from a shared list.',
    inputSchema: {
      type: 'object',
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
      additionalProperties: false,
    },
  },
];

function toolText(summary: string, data: unknown) {
  return `${summary}\n${JSON.stringify(data, null, 2)}`;
}

async function callTool(db: Db, hub: Hub, userId: string, name: string, args: ToolArgs) {
  if (name === 'list_lists') {
    const lists = await listLists(db, userId);
    const summary =
      lists.length === 0
        ? 'No lists yet.'
        : lists.map((list) => `${list.title}: ${list.openCount} to do`).join('\n');
    return toolText(summary, { lists });
  }
  if (name === 'list_tasks') {
    const listId = await resolveListId(db, userId, args);
    const tasks = await listTasks(db, userId, listId);
    const summary =
      tasks.length === 0
        ? 'That list is empty.'
        : tasks.map((task) => `${task.done ? '[done]' : '[open]'} ${task.title} (${task.id})`).join('\n');
    return toolText(summary, { listId, tasks });
  }
  if (name === 'add_task') {
    const listId = await resolveListId(db, userId, args);
    const task = await addTask(db, hub, userId, listId, { title: args.title, notes: args.notes });
    return toolText(`Added "${task.title}".`, { task });
  }
  if (name === 'complete_task') {
    if (typeof args.taskId !== 'string' || !args.taskId) throw new ApiError(400, 'Pass a taskId.');
    const done = args.done === undefined ? true : Boolean(args.done);
    const result = await setTaskDone(db, hub, userId, args.taskId, done, todayFrom(args.today));
    const summary =
      result.coinsDelta > 0
        ? `Marked done. ${result.coinsDelta} coins earned.`
        : done
          ? 'Marked done. No new coins (already earned, or it was already done).'
          : 'Marked not done. Coins were not taken back.';
    return toolText(summary, result);
  }
  if (name === 'delete_task') {
    if (typeof args.taskId !== 'string' || !args.taskId) throw new ApiError(400, 'Pass a taskId.');
    await removeTask(db, hub, userId, args.taskId);
    return toolText('Deleted the task.', { taskId: args.taskId, deleted: true });
  }
  throw new ApiError(400, `Unknown tool: ${name}`);
}

export async function handleMcp(db: Db, hub: Hub, userId: string, body: unknown) {
  if (!body || typeof body !== 'object') throw new ApiError(400, 'Expected a JSON-RPC body.');
  const message = body as { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    throw new ApiError(400, 'Expected JSON-RPC 2.0.');
  }
  const id = message.id ?? null;
  try {
    const result = await dispatch(db, hub, userId, message.method, message.params);
    if (message.id === undefined) return { notification: true as const };
    return { jsonrpc: '2.0', id, result };
  } catch (error) {
    if (message.id === undefined) return { notification: true as const };
    const api = error instanceof ApiError ? error : null;
    if (api && message.method === 'tools/call') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: api.message }],
          isError: true,
        },
      };
    }
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: api ? -32000 : -32603,
        message: api?.message ?? 'Something went wrong.',
      },
    };
  }
}

async function dispatch(db: Db, hub: Hub, userId: string, method: string, params: unknown) {
  if (method === 'initialize') {
    const version =
      params && typeof params === 'object' && typeof (params as { protocolVersion?: string }).protocolVersion === 'string'
        ? (params as { protocolVersion: string }).protocolVersion
        : '2024-11-05';
    const protocolVersion = version === '2025-03-26' || version === '2024-11-05' ? version : '2024-11-05';
    return {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'pebble', version: '1.0.0' },
    };
  }
  if (method === 'notifications/initialized' || method === 'ping') {
    return {};
  }
  if (method === 'tools/list') {
    return { tools };
  }
  if (method === 'tools/call') {
    const call = params as { name?: string; arguments?: ToolArgs } | undefined;
    if (!call?.name) throw new ApiError(400, 'tools/call needs a name.');
    const text = await callTool(db, hub, userId, call.name, call.arguments ?? {});
    const pet = await getPet(db, userId, todayFrom(undefined)).catch(() => null);
    return {
      content: [{ type: 'text', text: pet ? `${text}\n\nCoins: ${pet.coins}` : text }],
    };
  }
  throw new ApiError(400, `Unknown method: ${method}`);
}
