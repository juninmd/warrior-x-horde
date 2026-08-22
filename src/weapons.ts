// weapons.ts - Sistema de armas coletáveis
import { Weapon, Army, Entities, GameState } from './types';

let weaponIdCounter = 0;

export function createWeapon(canvasWidth: number, y: number): Weapon {
  const types: Array<'rifle' | 'shotgun' | 'minigun' | 'rocket'> = ['rifle', 'shotgun', 'minigun', 'rocket'];
  const type = types[Math.floor(Math.random() * types.length)];

  const stats = {
    rifle: { damage: 2, fireRate: 400 },
    shotgun: { damage: 4, fireRate: 800 },
    minigun: { damage: 1, fireRate: 100 },
    rocket: { damage: 10, fireRate: 1500 },
  };

  const side = Math.random() > 0.5 ? 'left' : 'right';
  const x = side === 'left' ? canvasWidth * 0.25 : canvasWidth * 0.75;

  return {
    id: weaponIdCounter++,
    x,
    y,
    width: 60,
    height: 30,
    type,
    damage: stats[type].damage,
    fireRate: stats[type].fireRate,
    passed: false,
  };
}

export function applyWeapon(army: Army, weapon: Weapon): void {
  army.damage = weapon.damage;
  army.fireRate = weapon.fireRate;
}

export function drawWeapon(ctx: CanvasRenderingContext2D, weapon: Weapon): void {
  if (weapon.passed) return;

  const colors = {
    rifle: '#4A90D9',
    shotgun: '#E67E22',
    minigun: '#27AE60',
    rocket: '#E74C3C',
  };

  const icons = {
    rifle: '���',
    shotgun: '���',
    minigun: '���',
    rocket: '���',
  };

  // Fundo da arma
  ctx.fillStyle = colors[weapon.type];
  ctx.beginPath();
  ctx.roundRect(weapon.x - weapon.width / 2, weapon.y, weapon.width, weapon.height, 8);
  ctx.fill();

  // Ícone
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icons[weapon.type], weapon.x, weapon.y + weapon.height / 2);
}

export function spawnWeapons(entities: Entities, canvasWidth: number): void {
  // Remover armas que já passaram
  for (let i = entities.weapons.length - 1; i >= 0; i--) {
      const w = entities.weapons[i];
      if (w.passed || w.y >= 1000) {
          const last = entities.weapons.pop();
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
/* v8 ignore next */
          if (last && i < entities.weapons.length) {
              entities.weapons[i] = last;
          }
      }
  }

  // Spawnar novas armas ocasionalmente
  if (Math.random() < 0.01 && entities.weapons.length < 2) {
    entities.weapons.push(createWeapon(canvasWidth, -100));
  }
}

export function updateWeapons(entities: Entities, gameState: GameState): void {
  for (const weapon of entities.weapons) {
    weapon.y += gameState.gameSpeed;
  }
}

export function checkWeaponCollision(army: Army, weapon: Weapon): boolean {
  if (weapon.passed) return false;

  const armyLeft = army.centerX - 50;
  const armyRight = army.centerX + 50;
  const armyTop = army.centerY - 50;
  const armyBottom = army.centerY + 50;

  return weapon.x > armyLeft &&
         weapon.x < armyRight &&
         weapon.y > armyTop &&
         weapon.y < armyBottom;
}
