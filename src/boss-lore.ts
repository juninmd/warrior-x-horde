// boss-lore.ts - Names, titles and taunts for every boss (no runtime imports: safe for the renderer)
import type { Boss } from './types';

export interface BossLore {
  name: string;
  title: string;
  taunt: string;
}

export const BOSS_LORE: Record<Boss['type'], BossLore> = {
  normal: { name: 'SENTINELA', title: 'Vigia dos Devoradores', taunt: 'Vocês não passarão.' },
  beast: { name: 'GIANT BEAST', title: 'A Fera do Portão', taunt: 'GRRRAAAH! Carne fresca!' },
  slime: { name: 'TOXIC SLIME', title: 'O Pântano Vivo', taunt: 'Glub... vocês vão se dissolver...' },
  eye: { name: 'THE WATCHER', title: 'O Olho que Tudo Vê', taunt: 'Eu vejo cada um de vocês.' },
  machine: { name: 'MECHA TANK', title: 'Máquina de Guerra', taunt: 'ALVO ADQUIRIDO. EXTERMINAR.' },
  spider: { name: 'WIDOWMAKER', title: 'A Tecelã de Pesadelos', taunt: 'Entrem na minha teia...' },
  skull: { name: 'BONE KING', title: 'Rei dos Esquecidos', taunt: 'Todo exército vira pó.' },
  demon: { name: 'DEMON LORD', title: 'Senhor das Cinzas', taunt: 'Queimem, humanos!' },
  ghost: { name: 'PHANTOM', title: 'O Pesadelo Sem Corpo', taunt: 'Suas balas não me tocam...' },
  crystal: { name: 'PRISM CORE', title: 'Coração da Nave', taunt: 'A energia nos torna eternos.' },
  mothership: { name: 'NAVE-MÃE', title: 'Rainha dos Devoradores', taunt: 'Esta cidade é minha. Rendam-se!' },
};

export function getBossLore(type: Boss['type']): BossLore {
  return BOSS_LORE[type] ?? BOSS_LORE.normal;
}
