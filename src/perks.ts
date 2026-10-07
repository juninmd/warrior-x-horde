// perks.ts - Roguelite upgrades: after every boss the player picks 1 of 3 perks.
// Perks stack (up to `max`) and last for the whole run.
import { Entities } from './types';
import { addSoldiersToArmy } from './entities';

export interface Perk {
  id: string;
  name: string;
  icon: string;
  desc: string;
  max: number;
  rarity: 'common' | 'rare' | 'epic';
}

export const PERKS: Perk[] = [
  { id: 'damage', name: 'Munição Perfurante', icon: '🎯', desc: '+20% de dano em todos os tiros.', max: 5, rarity: 'common' },
  { id: 'firerate', name: 'Gatilho Rápido', icon: '⚡', desc: '+15% de cadência de tiro.', max: 5, rarity: 'common' },
  { id: 'shield', name: 'Escudo de Energia', icon: '🛡️', desc: 'Absorve 2 projéteis de chefe/inimigos por capítulo.', max: 4, rarity: 'rare' },
  { id: 'greed', name: 'Imã de Ouro', icon: '💰', desc: '+40% de moedas coletadas.', max: 3, rarity: 'common' },
  { id: 'reinforce', name: 'Reforços', icon: '🪖', desc: 'Chama +10 soldados imediatamente.', max: 99, rarity: 'common' },
  { id: 'armor', name: 'Colete Reforçado', icon: '🧱', desc: 'Tiros de chefe matam 1 soldado a menos (mín. 1).', max: 2, rarity: 'rare' },
  { id: 'supercool', name: 'Super Reator', icon: '🔋', desc: 'Super Canhão recarrega 25% mais rápido.', max: 3, rarity: 'rare' },
  { id: 'combo', name: 'Mestre do Combo', icon: '🔥', desc: '+25% de pontos de combo.', max: 3, rarity: 'epic' },
];

export const BASE_SUPER_COOLDOWN = 63000;

const taken: Record<string, number> = {};
let shieldCharges = 0;
export const MAX_SHIELD_CHARGES = 8;

export function resetPerks(): void {
  for (const k of Object.keys(taken)) delete taken[k];
  shieldCharges = 0;
}

export function perkCount(id: string): number {
  return taken[id] ?? 0;
}

export function getTakenPerks(): { perk: Perk; count: number }[] {
  return PERKS.filter(p => perkCount(p.id) > 0).map(p => ({ perk: p, count: perkCount(p.id) }));
}

export interface PerkMods {
  damageMult: number;
  fireRateMult: number; // >1 = shoots faster
  coinMult: number;
  bossDamageReduction: number;
  superCooldownMult: number;
  comboScoreMult: number;
}

export function getMods(): PerkMods {
  return {
    damageMult: 1 + 0.2 * perkCount('damage'),
    fireRateMult: 1 + 0.15 * perkCount('firerate'),
    coinMult: 1 + 0.4 * perkCount('greed'),
    bossDamageReduction: perkCount('armor'),
    superCooldownMult: Math.max(0.25, 1 - 0.25 * perkCount('supercool')),
    comboScoreMult: 1 + 0.25 * perkCount('combo'),
  };
}

/** Shield charges refill at every chapter start. */
export function refillShield(): void {
  shieldCharges = Math.min(MAX_SHIELD_CHARGES, Math.max(shieldCharges, perkCount('shield') * 2));
}
export function getShieldCharges(): number {
  return shieldCharges;
}
/** Returns true when a charge absorbed the hit. */
export function consumeShield(): boolean {
  if (shieldCharges <= 0) return false;
  shieldCharges--;
  return true;
}

/** Picks `n` distinct perks that are not maxed out, weighted by rarity. */
export function rollOffers(n = 3, rng: () => number = Math.random): Perk[] {
  const pool = PERKS.filter(p => perkCount(p.id) < p.max);
  const weight = (p: Perk) => (p.rarity === 'common' ? 5 : p.rarity === 'rare' ? 3 : 1.5);
  const out: Perk[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, p) => s + weight(p), 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= weight(pool[idx]);
      if (r <= 0) break;
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/** Applies a perk. Returns false for unknown / maxed perks. */
export function pickPerk(id: string, entities: Entities | null): boolean {
  const perk = PERKS.find(p => p.id === id);
  if (!perk || perkCount(id) >= perk.max) return false;
  taken[id] = perkCount(id) + 1;
  if (id === 'reinforce' && entities) addSoldiersToArmy(entities.playerArmy, 10);
  if (id === 'shield') shieldCharges += 2;
  return true;
}

/** Adds shield charges (shop / pickups), clamped to MAX_SHIELD_CHARGES. */
export function addShieldCharges(n: number): void {
  shieldCharges = Math.min(MAX_SHIELD_CHARGES, shieldCharges + n);
}
