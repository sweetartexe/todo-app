import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ApiKeySummary, Member, PetState, PublicUser, Task, TodoList } from '@/domain/types';

const UNREACHABLE =
  "Pebble can't reach the server. On your computer, run npm run server and leave that window open. The phone and the computer need the same Wi-Fi. If a Windows firewall box appears, choose Allow.";

export function suggestedApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host) return `http://${host}:8787`;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8787`;
  }
  return 'http://localhost:8787';
}

export function websocketUrl(apiUrl: string, token: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/v1/ws';
  url.search = '';
  url.searchParams.set('access_token', token);
  return url.toString();
}

export class ApiClient {
  token: string | null = null;

  constructor(
    public base: string,
    private onUnauthorized: () => void,
  ) {}

  setBase(base: string) {
    this.base = base.replace(/\/$/, '');
  }

  private async request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.base}${path}`, {
        method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
        headers: {
          ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new Error(UNREACHABLE);
    }
    const raw = await response.text();
    let data: { error?: string } = {};
    if (raw) {
      try {
        data = JSON.parse(raw) as { error?: string };
      } catch {
        throw new Error(UNREACHABLE);
      }
    }
    if (response.status === 401 && this.token) {
      this.token = null;
      this.onUnauthorized();
    }
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');
    return data as T;
  }

  signup(input: { email: string; password: string; displayName: string }) {
    return this.request<{ token: string; user: PublicUser }>('/v1/auth/signup', { body: input });
  }

  login(input: { email: string; password: string }) {
    return this.request<{ token: string; user: PublicUser }>('/v1/auth/login', { body: input });
  }

  me() {
    return this.request<PublicUser>('/v1/me');
  }

  rename(displayName: string) {
    return this.request<PublicUser>('/v1/me', { method: 'PATCH', body: { displayName } });
  }

  lists() {
    return this.request<{ lists: TodoList[] }>('/v1/lists');
  }

  createList(title: string, color: string) {
    return this.request<TodoList>('/v1/lists', { body: { title, color } });
  }

  join(code: string) {
    return this.request<{ list: TodoList; already: boolean }>('/v1/lists/join', { body: { code } });
  }

  deleteList(id: string) {
    return this.request<{ ok: boolean }>(`/v1/lists/${id}`, { method: 'DELETE' });
  }

  tasks(listId: string) {
    return this.request<{ tasks: Task[] }>(`/v1/lists/${listId}/tasks`);
  }

  addTask(listId: string, title: string, notes: string) {
    return this.request<Task>(`/v1/lists/${listId}/tasks`, { body: { title, notes } });
  }

  editTask(id: string, title: string, notes: string) {
    return this.request<Task>(`/v1/tasks/${id}`, { method: 'PATCH', body: { title, notes } });
  }

  complete(id: string, done: boolean, today: string) {
    return this.request<{ task: Task; coinsDelta: number; coins: number }>(`/v1/tasks/${id}/complete`, {
      body: { done, today },
    });
  }

  deleteTask(id: string) {
    return this.request<{ ok: boolean }>(`/v1/tasks/${id}`, { method: 'DELETE' });
  }

  members(listId: string) {
    return this.request<{ members: Member[] }>(`/v1/lists/${listId}/members`);
  }

  pet(today: string) {
    return this.request<PetState>(`/v1/pet?today=${encodeURIComponent(today)}`);
  }

  buy(itemId: string) {
    return this.request<PetState>('/v1/shop/buy', { body: { itemId } });
  }

  equip(category: string, itemId: string | null) {
    return this.request<PetState>('/v1/pet/equip', { body: { category, itemId } });
  }

  keys() {
    return this.request<{ keys: ApiKeySummary[] }>('/v1/api-keys');
  }

  createKey(name: string) {
    return this.request<ApiKeySummary & { secret: string }>('/v1/api-keys', { body: { name } });
  }

  revokeKey(id: string) {
    return this.request<{ ok: boolean }>(`/v1/api-keys/${id}`, { method: 'DELETE' });
  }
}
