import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiClient, suggestedApiUrl, websocketUrl } from '@/api/client';
import { localDate } from '@/domain/dates';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/domain/demo';
import type { ApiKeySummary, Member, PetState, PublicUser, Task, TodoList } from '@/domain/types';
import { syncOutside } from '@/native/pebble';
import { storage } from '@/storage';

type Store = {
  ready: boolean;
  user: PublicUser | null;
  apiUrl: string;
  lists: TodoList[];
  tasks: Task[];
  members: Member[];
  pet: PetState | null;
  keys: ApiKeySummary[];
  error: string | null;
  cheer: string | null;
  mood: 'idle' | 'happy';
  clearError: () => void;
  setApiUrl: (url: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  openList: (id: string) => Promise<void>;
  createList: (title: string, color: string) => Promise<string>;
  joinList: (code: string) => Promise<string>;
  deleteList: (id: string) => Promise<void>;
  addTask: (listId: string, title: string, notes: string) => Promise<void>;
  editTask: (id: string, title: string, notes: string) => Promise<void>;
  toggleTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  buy: (itemId: string) => Promise<void>;
  equip: (category: string, itemId: string | null) => Promise<void>;
  loadKeys: () => Promise<void>;
  createKey: (name: string) => Promise<string>;
  revokeKey: (id: string) => Promise<void>;
  rename: (displayName: string) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('Store missing');
  return value;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const client = useRef(new ApiClient(suggestedApiUrl(), () => setUser(null))).current;
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [apiUrl, setApiUrlState] = useState(suggestedApiUrl());
  const [lists, setLists] = useState<TodoList[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pet, setPet] = useState<PetState | null>(null);
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cheer, setCheer] = useState<string | null>(null);
  const [mood, setMood] = useState<'idle' | 'happy'>('idle');
  const listId = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  async function applySession(token: string, nextUser?: PublicUser) {
    tokenRef.current = token;
    client.token = token;
    await storage.setToken(token);
    if (nextUser) setUser(nextUser);
    await refresh();
  }

  async function refresh() {
    if (!client.token) return;
    const today = localDate();
    const [nextLists, nextPet, me] = await Promise.all([client.lists(), client.pet(today), client.me()]);
    setLists(nextLists.lists);
    setPet(nextPet);
    setUser(me);
    if (listId.current) {
      const [nextTasks, nextMembers] = await Promise.all([
        client.tasks(listId.current),
        client.members(listId.current),
      ]);
      setTasks(nextTasks.tasks);
      setMembers(nextMembers.members);
    }
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const savedUrl = await storage.getApiUrl();
        const base = (savedUrl || suggestedApiUrl()).replace(/\/$/, '');
        client.setBase(base);
        if (!cancel) setApiUrlState(base);
        const token = await storage.getToken();
        if (token) {
          client.token = token;
          tokenRef.current = token;
          try {
            const me = await client.me();
            if (!cancel) setUser(me);
            await refresh();
          } catch (err) {
            if (!client.token) {
              await storage.setToken(null);
              if (!cancel) setUser(null);
            } else if (!cancel) {
              setError(err instanceof Error ? err.message : 'Something went wrong.');
            }
          }
        }
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
    // The first load should only happen once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !client.token) return undefined;
    let socket: WebSocket | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (stopped || !client.token) return;
      try {
        socket = new WebSocket(websocketUrl(client.base, client.token));
      } catch {
        timer = setTimeout(connect, 3000);
        return;
      }
      socket.onmessage = () => {
        refresh().catch(() => undefined);
      };
      socket.onclose = () => {
        if (!stopped) timer = setTimeout(connect, 2500);
      };
    };
    connect();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      socket?.close();
    };
    // Reconnect when the signed-in person or server changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, apiUrl]);

  useEffect(() => {
    if (!pet || !user) return;
    const open = lists.reduce((sum, list) => sum + list.openCount, 0);
    void syncOutside({
      coins: pet.coins,
      todayDone: pet.todayDone,
      todayOpen: open,
      displayName: user.displayName,
      ...pet.equipped,
    });
  }, [pet, lists, user]);

  useEffect(() => {
    if (!cheer) return undefined;
    const timer = setTimeout(() => setCheer(null), 1600);
    return () => clearTimeout(timer);
  }, [cheer]);

  const value = useMemo<Store>(() => {
    const guard = async (action: () => Promise<void>) => {
      try {
        setError(null);
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        throw err;
      }
    };

    return {
      ready,
      user,
      apiUrl,
      lists,
      tasks,
      members,
      pet,
      keys,
      error,
      cheer,
      mood,
      clearError: () => setError(null),
      async setApiUrl(url: string) {
        const next = url.trim().replace(/\/$/, '');
        client.setBase(next);
        setApiUrlState(next);
        await storage.setApiUrl(next);
        if (client.token) await refresh();
      },
      signIn: (email, password) =>
        guard(async () => {
          const result = await client.login({ email: email.trim(), password });
          await applySession(result.token, result.user);
        }),
      signUp: (displayName, email, password) =>
        guard(async () => {
          const result = await client.signup({ displayName, email: email.trim(), password });
          await applySession(result.token, result.user);
        }),
      signInDemo: () =>
        guard(async () => {
          const result = await client.login({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
          await applySession(result.token, result.user);
        }),
      async signOut() {
        tokenRef.current = null;
        client.token = null;
        listId.current = null;
        await storage.setToken(null);
        setUser(null);
        setLists([]);
        setTasks([]);
        setPet(null);
        setKeys([]);
      },
      refresh: () => guard(refresh),
      openList: (id: string) =>
        guard(async () => {
          listId.current = id;
          const [nextTasks, nextMembers] = await Promise.all([client.tasks(id), client.members(id)]);
          setTasks(nextTasks.tasks);
          setMembers(nextMembers.members);
        }),
      createList: async (title, color) => {
        let id = '';
        await guard(async () => {
          const list = await client.createList(title, color);
          id = list.id;
          await refresh();
        });
        return id;
      },
      joinList: async (code) => {
        let id = '';
        await guard(async () => {
          const result = await client.join(code);
          id = result.list.id;
          await refresh();
        });
        return id;
      },
      deleteList: (id) =>
        guard(async () => {
          await client.deleteList(id);
          if (listId.current === id) listId.current = null;
          await refresh();
        }),
      addTask: (listIdValue, title, notes) =>
        guard(async () => {
          await client.addTask(listIdValue, title, notes);
          await refresh();
        }),
      editTask: (id, title, notes) =>
        guard(async () => {
          await client.editTask(id, title, notes);
          await refresh();
        }),
      toggleTask: (task) =>
        guard(async () => {
          const result = await client.complete(task.id, !task.done, localDate());
          setTasks((current) => current.map((item) => (item.id === task.id ? result.task : item)));
          if (result.coinsDelta > 0) {
            setCheer(`+${result.coinsDelta} coins`);
            setMood('happy');
            setTimeout(() => setMood('idle'), 1800);
          }
          await refresh();
        }),
      deleteTask: (id) =>
        guard(async () => {
          await client.deleteTask(id);
          await refresh();
        }),
      buy: (itemId) =>
        guard(async () => {
          const next = await client.buy(itemId);
          setPet(next);
          setCheer('Nice choice');
          setMood('happy');
          setTimeout(() => setMood('idle'), 1800);
          await refresh();
        }),
      equip: (category, itemId) =>
        guard(async () => {
          const next = await client.equip(category, itemId);
          setPet(next);
        }),
      loadKeys: () =>
        guard(async () => {
          const result = await client.keys();
          setKeys(result.keys);
        }),
      createKey: async (name) => {
        let secret = '';
        await guard(async () => {
          const created = await client.createKey(name);
          secret = created.secret;
          const result = await client.keys();
          setKeys(result.keys);
        });
        return secret;
      },
      revokeKey: (id) =>
        guard(async () => {
          await client.revokeKey(id);
          const result = await client.keys();
          setKeys(result.keys);
        }),
      rename: (displayName) =>
        guard(async () => {
          const me = await client.rename(displayName);
          setUser(me);
        }),
    };
  }, [apiUrl, cheer, client, error, keys, lists, members, mood, pet, ready, tasks, user]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
