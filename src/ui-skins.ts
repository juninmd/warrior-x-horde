// ui-skins.ts - Start screen hero skin selector
import { HERO_SKINS, HeroSkin, getHighScore, getSelectedSkinId, isSkinUnlocked, selectSkin } from './skins';
import { vibrate } from './input';

function buildCard(skin: HeroSkin, unlocked: boolean, selectedId: string): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'skin-card';
  card.dataset.skinId = skin.id;
  card.style.setProperty('--skin-primary', skin.primary);
  card.style.setProperty('--skin-accent', skin.accent);

  if (!unlocked) card.classList.add('locked');
  if (skin.id === selectedId) card.classList.add('selected');

  card.setAttribute('aria-pressed', String(skin.id === selectedId));
  card.setAttribute(
    'aria-label',
    unlocked ? `Skin ${skin.name}` : `Skin ${skin.name} bloqueada, requer ${skin.unlockScore.toLocaleString('pt-BR')} pontos`
  );
  card.disabled = !unlocked;

  const avatar = document.createElement('span');
  avatar.className = 'skin-avatar';
  avatar.textContent = unlocked ? skin.icon : '🔒';

  const name = document.createElement('span');
  name.className = 'skin-name';
  name.textContent = unlocked ? skin.name : `${skin.unlockScore.toLocaleString('pt-BR')}`;

  card.append(avatar, name);
  return card;
}

/**
 * Renders (or re-renders) the skin picker inside the start screen.
 * `onChange` fires after a successful selection so callers can repaint the army.
 */
export function renderSkinSelector(onChange?: (skinId: string) => void): void {
  const startScreenContent = document.querySelector('.start-screen-content');
  if (!startScreenContent) return;

  let panel = document.getElementById('skinSelector');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'skinSelector';
    panel.className = 'skin-selector';

    const anchor = startScreenContent.querySelector('.start-btn');
    if (anchor) {
      startScreenContent.insertBefore(panel, anchor);
    } else {
      startScreenContent.appendChild(panel);
    }
  }

  const title = document.createElement('h3');
  title.className = 'skin-selector-title';
  title.textContent = 'Esquadrão';

  const grid = document.createElement('div');
  grid.className = 'skin-grid';

  const highScore = getHighScore();
  const selectedId = getSelectedSkinId();

  for (const skin of HERO_SKINS) {
    const unlocked = isSkinUnlocked(skin, highScore);
    const card = buildCard(skin, unlocked, selectedId);

    card.addEventListener('click', (e) => {
      e.stopPropagation(); // start screen click starts the game
      if (!selectSkin(skin.id)) return;
      vibrate(10);
      renderSkinSelector(onChange);
      if (onChange) onChange(skin.id);
    });

    grid.appendChild(card);
  }

  panel.replaceChildren(title, grid);
}
