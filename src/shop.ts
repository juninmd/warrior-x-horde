// shop.ts - In-run shop: catalog, dynamic pricing, cooldowns and purchase effects (UI-agnostic, unit-tested).
import type { Entities, GameState } from './types';
import { addSoldiersToArmy, addSpecialSoldiersToArmy } from './entities';
import { addShieldCharges } from './perks';
import { registerKill, defeatBoss, defeatMiniBoss } from './rewards';
import { getItem, getPrice, blockedReason, timesBought, markPurchased } from './shop-catalog';
import type { ShopType, BlockReason, ShopItem } from './shop-catalog';
export * from './shop-catalog';

export interface PurchaseResult {
  ok: boolean;
  reason?: BlockReason;
  cost?: number;
  item?: ShopItem;
  /** Kills made by a nuke (for UI feedback). */
  kills?: number;
}

/** Orbital strike: wipes hordes (paying kills, not coins), clears hostile bullets and wounds bosses. */
export function applyNuke(entities: Entities, gs: GameState): number {
  let kills = 0;
  for (const h of entities.enemyHordes) {
    if (!h.isActive) continue;
    for (const s of h.soldiers) {
      if (!s.isAlive) continue;
      s.isAlive = false;
      kills++;
      gs.score += 10;
      registerKill(gs, s.x, s.y);
    }
    h.soldiers.length = 0;
    h.count = 0;
    h.hp = 0;
    h.isActive = false; // spawner releases it on the next pass
  }
  // keep our own bullets, drop everything hostile (pool leak free: filter in place)
  let w = 0;
  for (let i = 0; i < entities.bullets.length; i++) {
    const b = entities.bullets[i];
    if (!b.isEnemy) entities.bullets[w++] = b;
  }
  entities.bullets.length = w;

  const boss = entities.boss;
  if (boss && boss.isActive) {
    boss.hp -= Math.min(boss.maxHp * 0.25, 6000);
    if (boss.hp <= 0) defeatBoss(boss, gs, gs.currentLevel);
  }
  for (const mb of entities.miniBosses) {
    if (!mb.isActive) continue;
    mb.hp -= mb.maxHp * 0.6;
    if (mb.hp <= 0) defeatMiniBoss(mb, gs, gs.currentLevel);
  }
  return kills;
}

/** Validates and performs a purchase. The caller owns visuals/sounds. */
export function purchase(type: ShopType, entities: Entities, gs: GameState): PurchaseResult {
  const item = getItem(type);
  if (!item) return { ok: false, reason: 'unknown' };
  const reason = blockedReason(item, gs);
  if (reason) return { ok: false, reason, item };

  const cost = getPrice(item, gs.currentLevel);
  gs.coins -= cost;
  markPurchased(item);

  const army = entities.playerArmy;
  let kills: number | undefined;
  switch (type) {
    case 'soldier': addSoldiersToArmy(army, 10); break;
    case 'bazooka': addSpecialSoldiersToArmy(army, 'bazooka', 2); break;
    case 'laser': addSpecialSoldiersToArmy(army, 'laser', 2); break;
    case 'shield': addShieldCharges(2); break;
    case 'recharge_super': gs.superCannonLastUsed = 0; gs.superCannonReady = true; break;
    case 'nuke': kills = applyNuke(entities, gs); break;
  }
  return { ok: true, cost, item, kills };
}
