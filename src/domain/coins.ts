export const COIN_REWARD = 10;

/**
 * Coins are paid once, the first time a task is marked done.
 * Unticking does not refund them. Ticking again does not pay again.
 */
export function completionReward(input: {
  wasDone: boolean;
  coinAwarded: boolean;
  nextDone: boolean;
}): { coinAwarded: boolean; coinsDelta: number } {
  if (input.nextDone && !input.wasDone && !input.coinAwarded) {
    return { coinAwarded: true, coinsDelta: COIN_REWARD };
  }
  return { coinAwarded: input.coinAwarded, coinsDelta: 0 };
}

export function purchaseBlock(coins: number, price: number, owned: boolean): string | null {
  if (owned) return 'You already own this.';
  if (price <= 0) return 'This one is already part of Pebble\'s room.';
  if (coins < price) return "You don't have enough coins yet.";
  return null;
}
