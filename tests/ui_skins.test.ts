import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSkinSelector } from '../src/ui-skins';
import { HERO_SKINS, DEFAULT_SKIN_ID, getSelectedSkinId } from '../src/skins';

function mountStartScreen(): void {
  document.body.innerHTML = `
    <div class="start-screen-content">
      <button class="start-btn">JOGAR</button>
    </div>`;
}

describe('ui-skins', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does nothing without a start screen', () => {
    renderSkinSelector();
    expect(document.getElementById('skinSelector')).toBeNull();
  });

  it('renders one card per skin before the start button', () => {
    mountStartScreen();
    renderSkinSelector();

    const panel = document.getElementById('skinSelector')!;
    expect(panel).not.toBeNull();
    expect(panel.nextElementSibling?.classList.contains('start-btn')).toBe(true);

    const cards = panel.querySelectorAll('.skin-card');
    expect(cards.length).toBe(HERO_SKINS.length);
    expect(panel.querySelector('.skin-card.selected')?.getAttribute('data-skin-id')).toBe(DEFAULT_SKIN_ID);
  });

  it('appends the panel when the start button is missing', () => {
    document.body.innerHTML = '<div class="start-screen-content"></div>';
    renderSkinSelector();
    const content = document.querySelector('.start-screen-content')!;
    expect(content.lastElementChild?.id).toBe('skinSelector');
  });

  it('marks locked skins as disabled with the required score', () => {
    mountStartScreen();
    renderSkinSelector();

    const locked = HERO_SKINS.find(s => s.unlockScore > 0)!;
    const card = document.querySelector(`[data-skin-id="${locked.id}"]`) as HTMLButtonElement;
    expect(card.disabled).toBe(true);
    expect(card.classList.contains('locked')).toBe(true);
    expect(card.querySelector('.skin-avatar')?.textContent).toBe('🔒');
    expect(card.querySelector('.skin-name')?.textContent).toBe(locked.unlockScore.toLocaleString('pt-BR'));
    expect(card.getAttribute('aria-label')).toContain(locked.unlockScore.toLocaleString('pt-BR'));
  });

  it('selects an unlocked skin, persists it and notifies the caller', () => {
    mountStartScreen();
    const onChange = vi.fn();
    renderSkinSelector(onChange);

    const free = HERO_SKINS.filter(s => s.unlockScore === 0)[1];
    (document.querySelector(`[data-skin-id="${free.id}"]`) as HTMLButtonElement).click();

    expect(getSelectedSkinId()).toBe(free.id);
    expect(onChange).toHaveBeenCalledWith(free.id);
    const selected = document.querySelector('.skin-card.selected') as HTMLElement;
    expect(selected.dataset.skinId).toBe(free.id);
    expect(selected.getAttribute('aria-pressed')).toBe('true');
  });

  it('re-renders without a callback and ignores locked selections', () => {
    mountStartScreen();
    renderSkinSelector();

    const free = HERO_SKINS.filter(s => s.unlockScore === 0)[1];
    (document.querySelector(`[data-skin-id="${free.id}"]`) as HTMLButtonElement).click();
    expect(getSelectedSkinId()).toBe(free.id);

    const locked = HERO_SKINS.find(s => s.unlockScore > 0)!;
    const lockedCard = document.querySelector(`[data-skin-id="${locked.id}"]`) as HTMLButtonElement;
    lockedCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getSelectedSkinId()).toBe(free.id);
  });

  it('does not bubble the click into the start screen handler', () => {
    mountStartScreen();
    const onStart = vi.fn();
    document.querySelector('.start-screen-content')!.addEventListener('click', onStart);
    renderSkinSelector();

    const free = HERO_SKINS.filter(s => s.unlockScore === 0)[1];
    (document.querySelector(`[data-skin-id="${free.id}"]`) as HTMLButtonElement).click();
    expect(onStart).not.toHaveBeenCalled();
  });
});
