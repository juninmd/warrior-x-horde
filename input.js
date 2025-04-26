// input.js - Gerenciamento de entrada do usuário
import { createBullet, activateSuperCannon } from './entities.js';

// Estado das teclas pressionadas
let keys = {};

// Configurar input para o jogo
function setupInput(entities, canvas) {
  document.addEventListener("keydown", (e) => handleKeyDown(e, entities));
  document.addEventListener("keyup", (e) => handleKeyUp(e));
  canvas.addEventListener("mousemove", (e) => handleMouseMove(e, entities, canvas));
  canvas.addEventListener("mousedown", (e) => handleMouseClick(e, entities));
}

// Processar movimento com base nas teclas pressionadas
function processMovement(entities) {
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

// Atualizar posição dos aliados com base no jogador principal
function updateAlliesPosition(allies) {
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

// Processar tiro
function processShooting(entities) {
  if (entities.allies.length === 0) return;

  const now = Date.now();

  entities.allies.forEach(ally => {
    if (now - ally.lastShotTime >= ally.fireRate) {
      entities.bullets.push(createBullet(ally, false));
      ally.lastShotTime = now;
    }
  });
}

// Lidar com tecla pressionada
function handleKeyDown(e, entities) {
  keys[e.key] = true;

  // Tecla M para mutar música
  if (e.key === 'm') {
    toggleMusic();
  }

  // Tecla C para super canhão
  if (e.key === 'c' && entities.allies.length > 0) {
    const mainPlayer = entities.allies[0];
    if (mainPlayer.kills >= 20 && mainPlayer.superCannonReady) {
      activateSuperCannon(mainPlayer);
    }
  }
  if (e.key === ' ') {
    processShooting(entities);
  }
}

// Lidar com tecla solta
function handleKeyUp(e) {
  keys[e.key] = false;
}

// Lidar com movimento do mouse
function handleMouseMove(e, entities, canvas) {
  if (entities.allies.length === 0) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;

  const mainPlayer = entities.allies[0];
  // Atualizar posição X do jogador
  mainPlayer.x = Math.max(0, Math.min(canvas.width - mainPlayer.width, mouseX - mainPlayer.width / 2));

  // Atualizar posição dos aliados/reforços
  updateAlliesPosition(entities.allies);
}

// Lidar com clique do mouse
function handleMouseClick(e, entities) {
  if (e.button === 0) { // Botão esquerdo
    processShooting(entities);
  }
}

// Função para mutar/desmutar o áudio (importada de audio.js)
function toggleMusic() {
  // Esta função é importada de audio.js
  if (typeof window.toggleAudio === 'function') {
    window.toggleAudio();
  }
}

export { setupInput, processMovement, processShooting };