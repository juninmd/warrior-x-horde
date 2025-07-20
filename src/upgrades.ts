import { Upgrade, Player, GameState } from './types';

export const upgrades: Upgrade[] = [
  {
    id: 'player_hp',
    name: 'Player HP',
    description: 'Increase player maximum health.',
    cost: 10,
    level: 0,
    maxLevel: 5,
    applyEffect: (player: Player, gameState: GameState) => {
      player.hp += 1;
    },
  },
  {
    id: 'player_damage',
    name: 'Player Damage',
    description: 'Increase player bullet damage.',
    cost: 15,
    level: 0,
    maxLevel: 5,
    applyEffect: (player: Player, gameState: GameState) => {
      player.bulletDamage += 1;
    },
  },
  {
    id: 'player_firerate',
    name: 'Player Fire Rate',
    description: 'Increase player fire rate (shoot faster).',
    cost: 20,
    level: 0,
    maxLevel: 5,
    applyEffect: (player: Player, gameState: GameState) => {
      player.fireRate = Math.max(50, player.fireRate - 50);
    },
  },
  {
    id: 'reinforcement_hp',
    name: 'Reinforcement HP',
    description: 'Increase reinforcement health.',
    cost: 12,
    level: 0,
    maxLevel: 3,
    applyEffect: (player: Player, gameState: GameState) => {
      // This upgrade would need to be applied to newly spawned reinforcements
      // For existing ones, you'd need to iterate through entities.allies
      // For simplicity, we'll assume it affects future reinforcements for now.
    },
  },
  {
    id: 'super_cannon_cooldown',
    name: 'Super Cannon Cooldown',
    description: 'Reduce Super Cannon cooldown.',
    cost: 25,
    level: 0,
    maxLevel: 3,
    applyEffect: (player: Player, gameState: GameState) => {
      gameState.superCannonCooldown = Math.max(5000, gameState.superCannonCooldown - 5000);
    },
  },
];
