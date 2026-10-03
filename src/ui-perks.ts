// ui-perks.ts - "Choose 1 of 3" perk cards shown between chapters.
import { Perk, getTakenPerks } from './perks';

let open = false;
let keyHandler: ((e: KeyboardEvent) => void) | null = null;

export function isPerkChoiceOpen(): boolean {
  return open;
}

export function closePerkChoice(): void {
  document.getElementById('perkModal')?.remove();
  if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
  open = false;
}

/** Renders the modal. `onPick` fires once with the chosen perk id. */
export function showPerkChoice(offers: Perk[], chapterCleared: number, onPick: (id: string) => void): void {
  closePerkChoice();
  open = true;

  const modal = document.createElement('div');
  modal.id = 'perkModal';
  modal.className = 'perk-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Escolha uma melhoria');

  const title = document.createElement('h2');
  title.textContent = `Capítulo ${chapterCleared} concluído!`;
  const sub = document.createElement('p');
  sub.className = 'perk-sub';
  sub.textContent = 'Escolha uma melhoria para o resto da campanha:';

  const row = document.createElement('div');
  row.className = 'perk-row';

  let chosen = false;
  const choose = (id: string) => {
    if (chosen) return;
    chosen = true;
    closePerkChoice();
    onPick(id);
  };

  offers.forEach((perk, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `perk-card ${perk.rarity}`;
    card.dataset.perk = perk.id;
    card.setAttribute('aria-label', `${perk.name}. ${perk.desc}`);
    const icon = document.createElement('span'); icon.className = 'perk-icon'; icon.textContent = perk.icon;
    const name = document.createElement('span'); name.className = 'perk-name'; name.textContent = perk.name;
    const desc = document.createElement('span'); desc.className = 'perk-desc'; desc.textContent = perk.desc;
    const rar = document.createElement('span'); rar.className = 'perk-rarity';
    rar.textContent = perk.rarity === 'common' ? 'COMUM' : perk.rarity === 'rare' ? 'RARO' : 'ÉPICO';
    const hint = document.createElement('span'); hint.className = 'perk-key'; hint.textContent = String(i + 1);
    card.append(rar, icon, name, desc, hint);
    card.addEventListener('click', (e) => { e.stopPropagation(); choose(perk.id); });
    row.appendChild(card);
  });

  modal.append(title, sub, row);

  const taken = getTakenPerks();
  if (taken.length) {
    const chips = document.createElement('div');
    chips.className = 'perk-taken';
    chips.setAttribute('aria-label', 'Melhorias ativas');
    for (const { perk, count } of taken) {
      const c = document.createElement('span');
      c.title = `${perk.name}: ${perk.desc}`;
      c.textContent = `${perk.icon}${count > 1 ? '×' + count : ''}`;
      chips.appendChild(c);
    }
    modal.appendChild(chips);
  }

  (document.querySelector('.game-canvas-wrapper') ?? document.body).appendChild(modal);
  (row.firstElementChild as HTMLElement | null)?.focus();

  keyHandler = (e: KeyboardEvent) => {
    const n = Number(e.key);
    if (n >= 1 && n <= offers.length) choose(offers[n - 1].id);
  };
  document.addEventListener('keydown', keyHandler);
}
