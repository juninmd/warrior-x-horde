// game.js - Arquivo principal do jogo
import { createPlayer, createEnemy, createBoss, createBarrel, updateEntities } from './entities.js';
import { renderGame, drawUI } from './renderer.js';
import { setupInput } from './input.js';
import { setupAudio, sounds } from './audio.js';
import { checkCollisions } from './collision.js';

// Configuração do canvas
const canvas = document.getElementById("gameCanvas");
window.canvas = canvas; // Para depuração
const ctx = canvas.getContext("2d");
canvas.width = 480;
canvas.height = 800;

// Estado global do jogo
let gameState = {
  isStarted: false,
  isGameOver: false,
  currentWave: 1,
  enemiesSpawned: 0,
  bossAppearEnemiesCount: 100,
  highScore: localStorage.getItem('highScore') || 0,
  score: 0
};

// Entidades do jogo
let entities = {
  allies: [], // Jogador principal e reforços em um único array
  enemies: [],
  barrels: [],
  boss: null,
  bullets: [] // Todas as balas em um único array
};

// Configuração do botão de início
const startButton = document.createElement("button");
startButton.innerText = "Iniciar Jogo";
startButton.style.position = "absolute";
startButton.style.top = "50%";
startButton.style.left = "50%";
startButton.style.transform = "translate(-50%, -50%)";
startButton.style.padding = "20px 40px";
startButton.style.fontSize = "20px";
document.body.appendChild(startButton);

// Inicialização do jogo
function initGame() {
  startButton.style.display = "none";
  gameState.isStarted = true;
  gameState.isGameOver = false;
  gameState.currentWave = 1;
  gameState.enemiesSpawned = 0;
  gameState.score = 0;

  // Criar jogador principal
  entities.allies = [createPlayer()];
  entities.enemies = [];
  entities.barrels = [];
  entities.bullets = [];
  entities.boss = null;

  sounds.gameStart.play();
  sounds.gameMusic.play();

  gameLoop();
}

// Manipulação de entidades que morrem
function handleEntityDeath(entity, index, type) {
  if (type === 'ally') {
    entities.allies.splice(index, 1);
    if (entities.allies.length === 0) {
      triggerGameOver();
    }
  } else if (type === 'enemy') {
    entities.enemies.splice(index, 1);
    gameState.score += 100 * gameState.currentWave;

    // Se for o jogador principal que matou
    if (entities.allies.length > 0) {
      entities.allies[0].kills++;
      entities.allies[0].totalKills++;
    }
  } else if (type === 'boss') {
    entities.boss = null;
    gameState.score += 5000 * gameState.currentWave;
    gameState.enemiesSpawned = 0;
    gameState.currentWave++;
    sounds.bossMusic.pause();
    sounds.gameMusic.play();
    sounds.bossDeath.play();
    sounds.waveComplete.play();
  }
}

// Spawner de inimigos
function spawnEnemy() {
  if (!gameState.isStarted) return;

  for (let i = 0; i < Math.min(3, gameState.bossAppearEnemiesCount - gameState.enemiesSpawned); i++) {
    entities.enemies.push(createEnemy(gameState.currentWave));
    gameState.enemiesSpawned++;
  }

  if (gameState.enemiesSpawned >= gameState.bossAppearEnemiesCount && !entities.boss) {
    entities.boss = createBoss(gameState.currentWave);
    sounds.gameMusic.pause();
    sounds.bossMusic.currentTime = 0;
    sounds.bossMusic.play();
  }
}

// Spawner de barris
function spawnBarrel() {
  if (!gameState.isStarted) return;

  // Escolhe tipo de barril baseado em probabilidade
  const typeRoll = Math.random();
  let type = typeRoll < 0.4 ? "buff" : typeRoll < 0.8 ? "nerf" : "reinforcement";

  // Limite de reforços
  if (type === "reinforcement" && entities.allies.length >= 6) {
    type = Math.random() < 0.5 ? "buff" : "nerf";
  }

  entities.barrels.push(createBarrel(type));
}

// Game over
function triggerGameOver() {
  gameState.isGameOver = true;
  gameState.isStarted = false;

  // Atualizar high score
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('highScore', gameState.highScore);
  }

  sounds.gameMusic.pause();
  sounds.bossMusic.pause();
  sounds.gameOver.play();

  startButton.innerText = "Reiniciar Jogo";
  startButton.style.display = "block";
}

// Loop principal do jogo
function gameLoop() {
  if (gameState.isGameOver) return;

  // Atualização
  updateEntities(entities, gameState);
  checkCollisions(entities, gameState, handleEntityDeath);

  // Renderização
  renderGame(ctx, entities);
  drawUI(ctx, entities, gameState);

  requestAnimationFrame(gameLoop);
}

// Event listeners
startButton.addEventListener("click", initGame);
setupInput(entities, canvas);
setupAudio();

// Timers para spawn de entidades
setInterval(spawnEnemy, 100);
setInterval(spawnBarrel, 5000);

export { gameState, entities };