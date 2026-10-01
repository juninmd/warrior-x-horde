// skins.ts - Hero skin catalog + persisted selection
// Skins repaint the player's soldiers (body/trail); sprites are cached per color
// by the renderer, so any palette works without extra assets.

export type SkinStyle = 'plain' | 'scarf' | 'flame' | 'crest' | 'visor' | 'mohawk' | 'halo' | 'band' | 'crown' | 'rays' | 'stars';

export interface HeroSkin {
  id: string;
  name: string;
  /** Body color used for soldiers and the movement trail. */
  primary: string;
  /** Highlight color: gear flair, bullets, trail and the selector card glow. */
  accent: string;
  icon: string;
  /** High score required to unlock (0 = always available). */
  unlockScore: number;
  /** Extra gear drawn on each soldier (see renderer.drawSkinFlair). */
  style: SkinStyle;
  /** One-line description shown as tooltip in the picker. */
  desc: string;
}

export const HERO_SKINS: HeroSkin[] = [
  { id: 'recruit', name: 'Recruta', primary: '#4A90D9', accent: '#7FC4FF', icon: '🛡️', unlockScore: 0, style: 'plain', desc: 'Farda azul padrão do pelotão.' },
  { id: 'ranger', name: 'Ranger', primary: '#27AE60', accent: '#7BE495', icon: '🌿', unlockScore: 0, style: 'scarf', desc: 'Batedores da floresta, com lenço verde.' },
  { id: 'inferno', name: 'Inferno', primary: '#E8552F', accent: '#FFB13D', icon: '🔥', unlockScore: 1000, style: 'flame', desc: 'Capacetes em chamas e tiros alaranjados.' },
  { id: 'glacier', name: 'Glacial', primary: '#7FD6FF', accent: '#FFFFFF', icon: '❄️', unlockScore: 2000, style: 'crest', desc: 'Crista de gelo. Tiros brancos congelantes.' },
  { id: 'cyber', name: 'Cyber', primary: '#00E5FF', accent: '#FF00E5', icon: '🤖', unlockScore: 3000, style: 'visor', desc: 'Visor neon e tiros magenta.' },
  { id: 'toxic', name: 'Tóxico', primary: '#9BE000', accent: '#FF4DFF', icon: '☣️', unlockScore: 4000, style: 'mohawk', desc: 'Moicano radioativo. Rastro de lodo rosa.' },
  { id: 'phantom', name: 'Fantasma', primary: '#B9C6D6', accent: '#FFFFFF', icon: '👻', unlockScore: 5000, style: 'halo', desc: 'Aura espectral sobre cada soldado.' },
  { id: 'shadow', name: 'Sombra', primary: '#3B3B52', accent: '#FF3B5C', icon: '🥷', unlockScore: 6500, style: 'band', desc: 'Ninjas de bandana rubra.' },
  { id: 'royal', name: 'Real', primary: '#FFD700', accent: '#FFF3B0', icon: '👑', unlockScore: 8000, style: 'crown', desc: 'A guarda real: coroa dourada.' },
  { id: 'solar', name: 'Solar', primary: '#FF9F1C', accent: '#FFF1A8', icon: '☀️', unlockScore: 12000, style: 'rays', desc: 'Raios de sol e tiros dourados.' },
  { id: 'galaxy', name: 'Galáxia', primary: '#6C3BFF', accent: '#FF7BFF', icon: '🌌', unlockScore: 20000, style: 'stars', desc: 'Estrelas cadentes. A skin definitiva.' },
];

export const DEFAULT_SKIN_ID = HERO_SKINS[0].id;

const SKIN_STORAGE_KEY = 'crowdHeroSkin';
const HIGH_SCORE_KEY = 'crowdHighScore';

export function getSkinById(id: string): HeroSkin {
  const found = HERO_SKINS.find(s => s.id === id);
  return found || HERO_SKINS[0];
}

export function getHighScore(): number {
  try {
    const raw = Number(localStorage.getItem(HIGH_SCORE_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch (e) {
    console.warn('Failed to read high score', e);
    return 0;
  }
}

export function isSkinUnlocked(skin: HeroSkin, highScore: number = getHighScore()): boolean {
  return highScore >= skin.unlockScore;
}

export function getSelectedSkinId(): string {
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    if (stored) {
      const skin = HERO_SKINS.find(s => s.id === stored);
      if (skin && isSkinUnlocked(skin)) return skin.id;
    }
  } catch (e) {
    console.warn('Failed to read skin selection', e);
  }
  return DEFAULT_SKIN_ID;
}

export function getActiveSkin(): HeroSkin {
  return getSkinById(getSelectedSkinId());
}

/** Persists the selection. Returns false when the skin is unknown or still locked. */
export function selectSkin(id: string): boolean {
  const skin = HERO_SKINS.find(s => s.id === id);
  if (!skin || !isSkinUnlocked(skin)) return false;
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skin.id);
  } catch (e) {
    console.warn('Failed to save skin selection', e);
  }
  return true;
}
