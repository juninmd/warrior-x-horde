// cinematic.ts - Intro story sequence (typewriter scenes). Auto-plays once, replayable from the start screen.

export interface Scene {
  kicker: string;
  title: string;
  text: string;
  art: string;
  /** CSS gradient for the backdrop. */
  bg: string;
}

export const INTRO_SCENES: Scene[] = [
  { kicker: 'ANO 2157', title: 'Um Mundo em Paz', text: 'A humanidade prosperava sob um céu azul. As cidades brilhavam. Ninguém olhava para cima.', art: '🌍', bg: 'linear-gradient(180deg,#0b3a6b,#1c7ed6 60%,#8fd3ff)' },
  { kicker: 'A CHEGADA', title: 'Os Devoradores', text: 'Naves rasgaram as nuvens. Uma raça faminta veio colher os recursos da Terra e escravizar seu povo.', art: '🛸', bg: 'linear-gradient(180deg,#050816,#1a1040 60%,#3b1d6e)' },
  { kicker: 'O VÍRUS', title: 'A Horda', text: 'Um vírus alienígena transformou milhões em zumbis. As cidades caíram, uma a uma, sob a sombra das naves-mãe.', art: '🧟', bg: 'linear-gradient(180deg,#1a0505,#4a0f0f 60%,#7a1c10)' },
  { kicker: 'A RESISTÊNCIA', title: 'O Último Pelotão', text: 'Restou um punhado de soldados. Sob o comando de Vega, você abrirá caminho até a Nave-Mãe.', art: '🪖', bg: 'linear-gradient(180deg,#0e1b12,#1d4d2b 60%,#3a7d44)' },
  { kicker: 'AVANCE!', title: 'Liberte a Cidade', text: 'Cruze os portais, recrute tropas, escolha melhorias e derrube cada chefe. Boa sorte, Comandante.', art: '⚔️', bg: 'linear-gradient(180deg,#2b0a14,#7a1633 60%,#ff416c)' },
];

const SEEN_KEY = 'wxhIntroSeen';

export function hasSeenIntro(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen(): void {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ }
}

/** Auto-play only on a real first visit (never under test runners). */
export function shouldAutoPlayIntro(): boolean {
  return !hasSeenIntro() && import.meta.env.MODE !== 'test' && !(navigator as Navigator & { webdriver?: boolean }).webdriver;
}

let active: { stop: () => void } | null = null;
export function isIntroPlaying(): boolean { return active !== null; }

const CHAR_MS = 24;

/** Plays the sequence; `onDone` fires exactly once (finished or skipped). */
export function playIntro(onDone: () => void): void {
  active?.stop();
  const host = document.querySelector('.game-canvas-wrapper') ?? document.body;

  const root = document.createElement('div');
  root.id = 'introCinematic';
  root.className = 'intro';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'História');

  const art = document.createElement('div'); art.className = 'intro-art';
  const kicker = document.createElement('div'); kicker.className = 'intro-kicker';
  const title = document.createElement('h2'); title.className = 'intro-title';
  const text = document.createElement('p'); text.className = 'intro-text';
  const dots = document.createElement('div'); dots.className = 'intro-dots';
  INTRO_SCENES.forEach(() => dots.appendChild(document.createElement('span')));
  const next = document.createElement('button'); next.type = 'button'; next.className = 'intro-next'; next.textContent = 'Continuar ▶';
  const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'intro-skip'; skip.textContent = 'Pular ⏭';
  root.append(skip, art, kicker, title, text, dots, next);
  host.appendChild(root);

  let idx = 0;
  let typing: ReturnType<typeof setInterval> | null = null;
  let full = '';
  let finished = false;

  const finishTyping = () => {
    if (typing) { clearInterval(typing); typing = null; }
    text.textContent = full;
  };

  const show = (i: number) => {
    const sc = INTRO_SCENES[i];
    root.style.background = sc.bg;
    art.textContent = sc.art;
    art.classList.remove('pop'); void art.offsetWidth; art.classList.add('pop');
    kicker.textContent = sc.kicker;
    title.textContent = sc.title;
    full = sc.text;
    text.textContent = '';
    next.textContent = i === INTRO_SCENES.length - 1 ? 'Começar ⚔️' : 'Continuar ▶';
    Array.from(dots.children).forEach((d, k) => d.classList.toggle('on', k <= i));
    let n = 0;
    if (typing) clearInterval(typing);
    typing = setInterval(() => {
      n++;
      text.textContent = full.slice(0, n);
      if (n >= full.length) finishTyping();
    }, CHAR_MS);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    finishTyping();
    document.removeEventListener('keydown', onKey);
    root.remove();
    active = null;
    markSeen();
    onDone();
  };

  const advance = () => {
    if (typing) { finishTyping(); return; } // first tap completes the line
    if (idx >= INTRO_SCENES.length - 1) { finish(); return; }
    show(++idx);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') finish();
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advance(); }
  };

  root.addEventListener('click', (e) => { e.stopPropagation(); advance(); });
  next.addEventListener('click', (e) => { e.stopPropagation(); advance(); });
  skip.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
  document.addEventListener('keydown', onKey);

  active = { stop: finish };
  show(0);
}
