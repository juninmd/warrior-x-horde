// story.ts - Campaign narrative: one chapter per level, boss introductions, epilogues.
import { getBossLore } from './boss-lore';
import type { BossLore } from './boss-lore';

export interface Chapter {
  level: number;
  place: string;
  text: string;
}

export const CHAPTERS: Chapter[] = [
  { level: 1, place: 'Portão da Cidade', text: 'Os Devoradores soltaram uma Fera para vigiar a entrada. Abra caminho.' },
  { level: 2, place: 'Esgotos Tóxicos', text: 'Sob as ruas, o vírus alienígena criou algo vivo. E faminto.' },
  { level: 3, place: 'Torre de Vigia', text: 'Um olho gigante observa cada movimento do pelotão. Não pare de se mover.' },
  { level: 4, place: 'Fábrica Abandonada', text: 'As máquinas de guerra foram reativadas pela nave-mãe.' },
  { level: 5, place: 'Distrito das Teias', text: 'Os bairros foram tomados por teias. Algo grande tece no escuro.' },
  { level: 6, place: 'Cemitério Municipal', text: 'Os mortos não descansam. O Rei dos Ossos reclama a cidade.' },
  { level: 7, place: 'Cratera Infernal', text: 'Onde a nave pousou, o chão queima. O Senhor das Cinzas espera.' },
  { level: 8, place: 'Névoa Fantasma', text: 'Uma névoa espessa esconde um inimigo que balas comuns mal tocam.' },
  { level: 9, place: 'Reator de Cristal', text: 'O coração de energia da nave está logo à frente. Falta pouco.' },
  { level: 10, place: 'A Nave-Mãe', text: 'Ela paira sobre a cidade. Destrua-a e liberte a humanidade!' },
];

export function getChapter(level: number): Chapter {
  if (level >= 1 && level <= CHAPTERS.length) return CHAPTERS[level - 1];
  return {
    level,
    place: `Horda Infinita ${level - CHAPTERS.length}`,
    text: 'A nave-mãe caiu, mas outras já respondem ao chamado. Resista o máximo que puder.',
  };
}

export const VICTORY_TEXT =
  'A Nave-Mãe explode em mil fragmentos e a névoa sobre a cidade se dissipa. A humanidade está livre — por enquanto.';

export function getDefeatLine(level: number): string {
  const ch = getChapter(level);
  return `O pelotão caiu em "${ch.place}". Outros virão para terminar o que vocês começaram.`;
}

/** Mid-chapter radio calls from Commander Vega (shown at 50% of each level). */
export const RADIO: string[] = [
  'Vega: Bom trabalho, soldado. A Fera guarda o portão — mire na cabeça!',
  'Vega: O pântano é instável. Não deixe a gosma encostar em vocês.',
  'Vega: O Olho observa tudo. Mantenham-se em movimento!',
  'Vega: Máquinas de guerra à frente. Concentrem fogo!',
  'Vega: Teias por toda parte... cuidado com o que cai do teto.',
  'Vega: Os mortos estão levantando. Não parem de atirar.',
  'Vega: O calor é insuportável, mas estamos perto da cratera.',
  'Vega: Não confio nessa névoa. Fiquem juntos!',
  'Vega: O reator está logo ali. Última parada antes da Nave-Mãe.',
  'Vega: É isso, Comandante. Derrube a Nave-Mãe e liberte a humanidade!',
];

export function getRadio(level: number): string {
  return level >= 1 && level <= RADIO.length ? RADIO[level - 1] : 'Vega: A horda não acaba... resista, Comandante!';
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;

function getBanner(): HTMLElement {
  let el = document.getElementById('storyBanner');
  if (!el) {
    el = document.createElement('div');
    el.id = 'storyBanner';
    el.className = 'story-banner';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    (document.querySelector('.game-canvas-wrapper') ?? document.body).appendChild(el);
  }
  return el;
}

function showBanner(kicker: string, title: string, text: string, variant: 'chapter' | 'boss' | 'radio', ms: number): void {
  const el = getBanner();
  /* v8 ignore next */
  if (typeof el.replaceChildren !== 'function') return; // minimal DOM stubs
  el.replaceChildren();
  const k = document.createElement('div'); k.className = 'story-kicker'; k.textContent = kicker;
  const t = document.createElement('div'); t.className = 'story-title'; t.textContent = title;
  const p = document.createElement('div'); p.className = 'story-text'; p.textContent = text;
  el.append(k, t, p);
  el.dataset.variant = variant;
  el.hidden = false;
  // restart the CSS animation
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => hideStoryBanner(), ms);
}

export function hideStoryBanner(): void {
  const el = document.getElementById('storyBanner');
  if (el) { el.hidden = true; el.classList.remove('show'); }
  if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; }
}

export function showChapterBanner(level: number): void {
  const ch = getChapter(level);
  const kicker = level <= CHAPTERS.length ? `CAPÍTULO ${level}` : 'MODO INFINITO';
  showBanner(kicker, ch.place, ch.text, 'chapter', 4200);
}

export function showBossBanner(type: Parameters<typeof getBossLore>[0]): BossLore {
  const lore = getBossLore(type);
  showBanner('⚠ CHEFE', lore.name, `${lore.title} — “${lore.taunt}”`, 'boss', 3600);
  return lore;
}

export function showRadioBanner(level: number): void {
  showBanner('📻 RÁDIO', 'Comandante Vega', getRadio(level).replace(/^Vega:\s*/, ''), 'radio', 3400);
}
