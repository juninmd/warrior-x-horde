// @ts-check
// input.js - Gerenciamento de entrada do usuário
import { createBullet, activateSuperCannon } from './entities';
import { toggleAudio } from './audio';
import { canvas, gameState } from './game';
import { Entities, Player } from './types';

const keys: Record<string, boolean> = {};

function setupInput(entities: Entities, canvas: HTMLCanvasElement): void {
  canvas.addEventListener("mousemove", (e: MouseEvent) => handleMouseMove(e, entities, canvas));
  canvas.addEventListener("mousedown", (e: MouseEvent) => handleMouseClick(e, entities));
  document.getElementById("superCannon")?.addEventListener("touchstart", () => {
    if (entities.allies.length > 0) {
      gameState.superCannonActive = true;
    }
  });

  window.addEventListener("keydown", (e: KeyboardEvent) => handleKeyDown(e, entities));
  window.addEventListener("keyup", (e: KeyboardEvent) => handleKeyUp(e));
}

function processMovement(entities: Entities): void {
  if (entities.allies.length === 0) return;

  const mainPlayer = entities.allies[0];
  let moved = false;

  // Movimento horizontal
  if (keys["ArrowLeft"] && mainPlayer.x > 0) {
    mainPlayer.x -= mainPlayer.speed;
    moved = true;
  }

  if (keys["ArrowRight"] && mainPlayer.x < canvas.width - mainPlayer.width) {
    mainPlayer.x += mainPlayer.speed;
    moved = true;
  }

  // Animar o sprite se moveu
  if (moved) {
    mainPlayer.frameTimer += 16;
    if (mainPlayer.frameTimer >= mainPlayer.frameInterval) {
      mainPlayer.frameTimer = 0;
      mainPlayer.frameIndex = (mainPlayer.frameIndex + 1) % 3;
    }
  } else {
    mainPlayer.frameIndex = 1; // Frame parado
  }

  // Atualizar posição dos aliados/reforços
  updateAlliesPosition(entities.allies);
}

function updateAlliesPosition(allies: Player[]): void {
  if (allies.length <= 1) return;

  const mainPlayer = allies[0];

  // Começando do índice 1 para pular o jogador principal
  for (let i = 1; i < allies.length; i++) {
    const ally = allies[i];
    const targetX = mainPlayer.x + ally.offsetX;
    ally.x = Math.max(0, Math.min(canvas.width - ally.width, targetX));
    ally.y = mainPlayer.y;

    // Atualizar animação
    if (mainPlayer.frameIndex !== ally.frameIndex) {
      ally.frameIndex = mainPlayer.frameIndex;
    }
  }
}

function processShooting(entities: Entities): void {
  if (entities.allies.length === 0) return;

  const now = Date.now();

  entities.allies.forEach(ally => {
    if (now - ally.lastShotTime >= ally.fireRate) {
      entities.bullets.push(createBullet(ally, false));
      ally.lastShotTime = now;
    }
  });
}

function handleKeyDown(e: KeyboardEvent, entities: Entities): void {
  keys[e.key] = true;

  // Tecla M para mutar música
  if (e.key === 'm') {
    toggleMusic();
    e.preventDefault(); // Evitar o comportamento padrão do navegador
  }

  // Tecla C para super canhão
  if (e.key === 'c' && entities.allies.length > 0) {
    activateSuperCannon();
  }

  // Tecla Espaço para atirar
  if (e.key === ' ') {
    processShooting(entities);
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  keys[e.key] = false;
}

function handleMouseMove(e: MouseEvent, entities: Entities, canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if (entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    if (mainPlayer.width !== undefined && mainPlayer.height !== undefined) {
      mainPlayer.x = x - mainPlayer.width / 2;
      mainPlayer.y = y - mainPlayer.height / 2;
    }
  }
}

function handleMouseClick(e: MouseEvent, entities: Entities): void {
  if (entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    mainPlayer.lastShotTime = Date.now();
  }
}

function toggleMusic(): void {
  toggleAudio();
}

export { setupInput, processMovement, processShooting };