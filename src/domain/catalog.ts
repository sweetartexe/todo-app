export const LIST_COLORS = ['coral', 'leaf', 'sun', 'sky', 'lilac', 'berry'] as const;
export type ListColor = (typeof LIST_COLORS)[number];

export type ItemCategory = 'hat' | 'plant' | 'furniture' | 'background';

export type ShopItem = {
  id: string;
  name: string;
  category: ItemCategory;
  price: number;
  blurb: string;
};

export const FREE_ITEMS: ShopItem[] = [
  {
    id: 'bg-cozy',
    name: 'Cozy room',
    category: 'background',
    price: 0,
    blurb: 'The warm little room Pebble starts in.',
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hat-sprout', name: 'Sprout cap', category: 'hat', price: 20, blurb: 'A tiny leaf, for growing habits.' },
  { id: 'hat-party', name: 'Party hat', category: 'hat', price: 30, blurb: 'For finishing the hard one.' },
  { id: 'hat-beanie', name: 'Cozy beanie', category: 'hat', price: 40, blurb: 'Soft, warm, slightly wonky.' },
  { id: 'hat-crown', name: 'Pebble crown', category: 'hat', price: 80, blurb: 'A bit much. In a good way.' },
  { id: 'plant-sprout', name: 'Desk sprout', category: 'plant', price: 20, blurb: 'One brave leaf.' },
  { id: 'plant-cactus', name: 'Pocket cactus', category: 'plant', price: 35, blurb: 'Low maintenance, like a good list.' },
  { id: 'plant-monstera', name: 'Monstera', category: 'plant', price: 60, blurb: 'A big leafy friend.' },
  { id: 'furn-rug', name: 'Round rug', category: 'furniture', price: 30, blurb: 'Somewhere soft to sit.' },
  { id: 'furn-lamp', name: 'Glow lamp', category: 'furniture', price: 45, blurb: 'Warm light for evening tasks.' },
  { id: 'furn-shelf', name: 'Tiny shelf', category: 'furniture', price: 50, blurb: 'For tiny treasures.' },
  { id: 'bg-sunrise', name: 'Sunrise', category: 'background', price: 25, blurb: 'Peachy morning light.' },
  { id: 'bg-meadow', name: 'Meadow', category: 'background', price: 40, blurb: 'Grass, sky, a slow day.' },
  { id: 'bg-night', name: 'Night window', category: 'background', price: 40, blurb: 'Stars and a quiet room.' },
  { id: 'bg-beach', name: 'Beach day', category: 'background', price: 55, blurb: 'Sand between tasks.' },
];

export const EQUIP_SLOTS: ItemCategory[] = ['hat', 'plant', 'furniture', 'background'];

export function findItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === id) ?? FREE_ITEMS.find((item) => item.id === id);
}

export function isListColor(value: unknown): value is ListColor {
  return typeof value === 'string' && (LIST_COLORS as readonly string[]).includes(value);
}
