import type { ItemCategory, ListColor } from './catalog';

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  coins: number;
};

export type Outfit = {
  hat: string | null;
  plant: string | null;
  furniture: string | null;
  background: string | null;
};

export type TodoList = {
  id: string;
  title: string;
  color: ListColor | string;
  inviteCode: string;
  role: 'owner' | 'member';
  openCount: number;
  doneCount: number;
  createdAt: string;
};

export type Task = {
  id: string;
  listId: string;
  title: string;
  notes: string;
  done: boolean;
  coinAwarded: boolean;
  doneOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Member = {
  userId: string;
  displayName: string;
  role: 'owner' | 'member';
};

export type PetState = {
  coins: number;
  owned: string[];
  equipped: Outfit;
  todayDone: number;
  todayOpen: number;
};

export type ApiKeySummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
};

export type EquipSlot = ItemCategory;
