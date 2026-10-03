// shop-catalog.ts - Shop catalog, dynamic pricing and cooldowns (pure: no dependency on game/renderer)
import type { GameState } from './types';
import { getShieldCharges, MAX_SHIELD_CHARGES } from './perks';
import { COLORS } from './constants';

export type ShopType = 'bazooka' | 'laser' | 'soldier' | 'nuke' | 'recharge_super' | 'shield';

export interface ShopItem {
  id: string;
  type: ShopType;
  basePrice: number;
  color: string;
  icon: string;
  label: string;
  desc: string;
  /** Minimum time between purchases (game-time ms). */
  cooldownMs?: number;
}

/** Order = rail order top→bottom reversed in CSS (first item sits under the thumb). */
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'soldier', type: 'soldier', basePrice: 50, color: COLORS.PLAYER.NORMAL, icon: '🪖', label: '+10 TROPAS', desc: 'Chama 10 soldados para o seu exército.' },
  { id: 'bazooka', type: 'bazooka', basePrice: 120, color: COLORS.PLAYER.BAZOOKA, icon: '🚀', label: 'BAZUCA ×2', desc: '2 soldados bazuca: tiro com 5× de dano, ótimos contra chefes.' },
  { id: 'laser', type: 'laser', basePrice: 150, color: COLORS.PLAYER.LASER, icon: '⚡', label: 'LASER ×2', desc: '2 soldados laser: 3× de dano e tiros ultrarrápidos.' },
  { id: 'shield', type: 'shield', basePrice: 140, color: '#4AD0FF', icon: '🛡️', label: 'ESCUDO', desc: `+2 cargas de escudo: cada carga bloqueia 1 projétil (máx. ${MAX_SHIELD_CHARGES}).` },
  { id: 'nuke', type: 'nuke', basePrice: 400, color: COLORS.UI.GOLD, icon: '☢️', label: 'NUKE', desc: 'Ataque orbital: elimina todas as hordas, limpa projéteis inimigos e fere chefes. Recarga 30s.', cooldownMs: 30000 },
  { id: 'recharge', type: 'recharge_super', basePrice: 180, color: COLORS.UI.GOLD, icon: '🔋', label: 'RECARGA', desc: 'Recarrega na hora o Super Canhão (só quando está em recarga).' },
];

const bought: Record<string, number> = {};
const cooldown: Record<string, number> = {};

export function resetShop(): void {
  for (const k of Object.keys(bought)) delete bought[k];
  for (const k of Object.keys(cooldown)) delete cooldown[k];
}

export function getItem(type: ShopType): ShopItem | undefined {
  return SHOP_ITEMS.find(i => i.type === type);
}

export function timesBought(id: string): number {
  return bought[id] ?? 0;
}

/** Price grows +12% per purchase in the run and +35% per chapter (income grows ~4x over the campaign). */
export function getPrice(item: ShopItem, level: number): number {
  const lvl = Number.isFinite(level) ? level : 1; // tolerate partial game states
  const raw = item.basePrice * (1 + 0.12 * timesBought(item.id)) * (1 + 0.35 * Math.max(0, lvl - 1));
  return Math.max(5, Math.round(raw / 5) * 5);
}

export function cooldownLeft(item: ShopItem): number {
  return Math.max(0, cooldown[item.id] ?? 0);
}

/** Advances cooldowns by game time (pause-safe: call once per simulated frame). */
export function tickShop(dtMs: number): void {
  for (const k of Object.keys(cooldown)) cooldown[k] = Math.max(0, cooldown[k] - dtMs);
}

export type BlockReason = 'coins' | 'cooldown' | 'ready' | 'max' | 'unknown';

/** Why an item cannot be bought right now (null = available). */
export function blockedReason(item: ShopItem, gs: GameState): BlockReason | null {
  if (cooldownLeft(item) > 0) return 'cooldown';
  if (item.type === 'recharge_super' && gs.superCannonReady && !gs.superCannonActive) return 'ready';
  if (item.type === 'shield' && getShieldCharges() >= MAX_SHIELD_CHARGES) return 'max';
  if (gs.coins < getPrice(item, gs.currentLevel)) return 'coins';
  return null;
}


/** Records a purchase (price escalation + cooldown start). */
export function markPurchased(item: ShopItem): void {
  bought[item.id] = timesBought(item.id) + 1;
  if (item.cooldownMs) cooldown[item.id] = item.cooldownMs;
}
