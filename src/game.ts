// @ts-check
// game.ts - Arquivo principal do jogo com melhorias no sistema de spawn
import { createPlayer, createEnemy, createBoss, createBarrel, updateEntities } from './entities.js';
import { renderGame, drawUI } from './renderer';
import { processMovement, setupInput } from './input.js';
import { preloadSounds, sounds } from './audio';
import { checkCollisions } from './collisions';
import { Entities, GameState, Enemy } from './types';

preloadSounds();

// Configuração do canvas
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const startButton = Object.assign(document.createElement("button"), {
  innerText: "Iniciar Jogo",
  style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px 40px; font-size: 20px;",
});
document.body.appendChild(startButton);

const spawnRate = 700; // Taxa de spawn inicial em ms

// Estado global do jogo
let gameState: GameState = {
  isStarted: false,
  isGameOver: false,
  currentWave: 1,
  enemiesSpawned: 0,
  enemiesKilled: 0,
  enemiesKilledWave: 0,
  enemiesRequiredForBoss: 50, // Quantidade de inimigos mortos necessária para o boss aparecer
  bossSpawnCooldown: 3000, // Cooldown para o boss aparecer após requisitos serem atendidos
  maxBossSpawnCooldown: 10000, // 10 segundos de cooldown
  zombieSprintChance: 0.2, // 20% de chance de um zumbi realizar um sprint
  zombieSprintCooldown: 0, // Cooldown global para controlar sprints em massa
  highScore: Number(localStorage.getItem('highScore')) || 0,
  score: 0,
  spawnRate: spawnRate, // Taxa inicial de spawn em ms
  lastSpawnTime: 0, // Último momento que um inimigo foi spawnado
  difficultyMultiplier: 1.0, // Multiplicador de dificuldade que aumenta com as ondas
  waveStartTime: 0, // Tempo em que a onda atual começou
  maxReinforcements: 20, // Máximo de aliados permitidos
  maxEnemies: 100, // Máximo de inimigos permitidos
  BarrelTypes: {
    REINFORCEMENT: 'reinforcement',
    NERF: 'nerf',
    BUFF: 'buff',
    HEALTH: 'health',
    SHIELD: 'shield'
  },
  showBossWarning: false,
  maxAllies: 30, // Máximo de aliados permitidos
  superCannonCooldown: 20000, // Cooldown do super canhão
  superCannonActive: false, // Se o super canhão está ativo
  superCannonTimer: 0, // Timer do super canhão
  superCannonDuration: 5000, // Duração do super canhão em ms,
  superCannonDamageMultiply: 5,
  superCannonLastUsed: 0, // Último momento que o super canhão foi usadoF
  superCannonReady: false // Se o super canhão está pronto para uso
};

// Entidades do jogo
let entities: Entities = {
  allies: [], // Jogador principal e reforços em um único array
  enemies: [],
  barrels: [],
  boss: null,
  bullets: [] // Todas as balas em um único array
};

// Inicialização do jogo
function initGame(): void {
  Object.assign(gameState, {
    isStarted: true, isGameOver: false, currentWave: 1, enemiesSpawned: 0, enemiesKilled: 0, score: 0,
    spawnRate, difficultyMultiplier: 1.0, enemiesRequiredForBoss: 20, waveStartTime: Date.now(), lastSpawnTime: Date.now()
  });
  Object.assign(entities, { allies: [createPlayer()], enemies: [], barrels: [], bullets: [], boss: null });
  sounds.gameStart.play(); sounds.gameMusic.play();
  startButton.style.display = "none";
  gameLoop();
}

// Manipulação de entidades que morrem
function handleEntityDeath(entity: any, index: number | null, type: string): void {
  const { allies, enemies } = entities;
  if (type === 'ally') {
    allies.splice(index!, 1);
    if (!allies.length) triggerGameOver();
  } else if (type === 'enemy') {
    enemies.splice(index!, 1);
    gameState.score += 1 * gameState.currentWave;
    gameState.enemiesKilled++;
    checkBossSpawnConditions();
  } else if (type === 'boss') {
    entities.boss = null;
    Object.assign(gameState, { score: gameState.score + 5 * gameState.currentWave, enemiesSpawned: 0 });
    advanceToNextWave();
    sounds.bossMusic.pause(); sounds.gameMusic.play(); sounds.bossDeath.play(); sounds.waveComplete.play();
  }
}

// Verifica condições para spawnar o boss
function checkBossSpawnConditions(): void {
  // Se já temos um boss, não fazemos nada
  if (entities.boss) return;

  // Se matamos inimigos suficientes e não estamos em cooldown
  if (gameState.enemiesKilled >= gameState.enemiesRequiredForBoss && gameState.bossSpawnCooldown <= 0) {
    // Inicia o cooldown para o boss
    gameState.bossSpawnCooldown = gameState.maxBossSpawnCooldown;

    // Efeito de alerta para o jogador
    sounds.bossWarning.play();

    // Mensagem visual (implementar na função drawUI)
    gameState.showBossWarning = true;
  }
}

// Avançar para a próxima onda
function advanceToNextWave(): void {
  gameState.currentWave++;
  gameState.waveStartTime = Date.now();
  gameState.difficultyMultiplier += 0.5; // Aumenta a dificuldade
  gameState.enemiesRequiredForBoss = Math.min(20 + gameState.currentWave * 5, 100); // Aumenta o requisito de inimigos
  gameState.spawnRate = Math.max(spawnRate - (gameState.currentWave * 100), 500); // Spawn mais rápido, mínimo 500ms

  // Mensagem de nova onda
  console.log(`Onda ${gameState.currentWave} iniciada!`);
}

// Sistema de zumbis aprimorado
function createZombie(): Enemy {
  const zombie: Enemy = createEnemy(gameState.currentWave);

  zombie.isZombie = true;
  zombie.moveStyle = getRandomZombieMovement();
  zombie.canSprint = Math.random() < gameState.zombieSprintChance;
  zombie.sprintCooldown = 0;
  zombie.sprintDuration = 0;
  zombie.baseSpeed = zombie.speed;

  return zombie;
}

// Estilos de movimento zumbi
function getRandomZombieMovement(): string {
  const styles = ["shambler", "runner", "crawler", "lurker"];
  const randomIndex = Math.floor(Math.random() * styles.length);
  return styles[randomIndex];
}

// Spawner de inimigos aprimorado
function spawnEnemies() {
  if (!gameState.isStarted || gameState.isGameOver) return;

  const currentTime = Date.now();

  // Verifica se é hora de spawnar novos inimigos
  if (currentTime - gameState.lastSpawnTime >= gameState.spawnRate) {
    gameState.lastSpawnTime = currentTime;

    // Calcula quantos inimigos spawnar baseado na onda atual
    const baseCount = Math.ceil(gameState.currentWave / 2);
    const spawnCount = Math.min(baseCount, gameState.maxEnemies); // Máximo de 5 zumbis por vez

    for (let i = 0; i < spawnCount; i++) {
      // Não spawna mais inimigos se o boss está presente
      if (!entities.boss) {
        entities.enemies.push(createZombie());
        gameState.enemiesSpawned++;
      }
    }
  }

  // Atualiza o cooldown do boss
  if (gameState.bossSpawnCooldown > 0) {
    gameState.bossSpawnCooldown -= 16; // Aproximadamente 16ms por frame

    // Quando o cooldown terminar, spawna o boss
    if (gameState.bossSpawnCooldown <= 0) {
      spawnBoss();
      gameState.showBossWarning = false;
    }
  }

  // Atualiza o cooldown global de sprint
  if (gameState.zombieSprintCooldown > 0) {
    gameState.zombieSprintCooldown -= 16;
  }
}

// Spawner de boss
function spawnBoss(): void {
  if (!gameState.isStarted || entities.boss) return;

  entities.boss = createBoss(gameState.currentWave);
  sounds.gameMusic.pause();
  sounds.bossMusic.currentTime = 0;
  sounds.bossMusic.play();

  // Aumenta a chance de sprint para os zumbis quando o boss aparece
  gameState.zombieSprintChance = Math.min(0.2 + (gameState.currentWave * 0.05), 0.5);
}

// Desencadeia sprint em zumbis aleatórios se o cooldown permitir
function triggerZombieSprints(): void {
  if (gameState.zombieSprintCooldown <= 0 && Math.random() < 0.1) { // 10% de chance por loop
    // Coloca em cooldown para evitar muitos sprints consecutivos
    gameState.zombieSprintCooldown = 5000; // 5 segundos

    // Percorre os zumbis e dá chance de sprint para cada um
    entities.enemies.forEach(zombie => {
      if (zombie.canSprint && zombie.sprintCooldown <= 0 && Math.random() < 0.3) {
        zombie.sprintCooldown = 8000 + Math.random() * 4000; // 8-12 segundos de cooldown
        zombie.sprintDuration = 1000 + Math.random() * 1500; // 1-2.5 segundos de sprint
        zombie.speed = zombie.baseSpeed * (2 + Math.random() * 0.5); // 2-2.5x velocidade

        // Efeito visual (pode ser implementado na renderização)
        zombie.isSprinting = true;
      }
    });
  }
}

// Spawner de barris
function spawnBarrel(): void {
  if (!gameState.isStarted) return;

  // Escolhe tipo de barril baseado em probabilidade
  const typeRoll = Math.random();

  let type = gameState.BarrelTypes.BUFF;
  if (typeRoll < 0.4) { // 40% chance
    type = gameState.BarrelTypes.BUFF;
  } else if (typeRoll < 0.7) { // 30% chance
    type = gameState.BarrelTypes.REINFORCEMENT;
  } else if (typeRoll < 0.9) { // 20% chance
    type = gameState.BarrelTypes.HEALTH;
  } else { // 10% chance
    type = gameState.BarrelTypes.NERF;
  }

  // Limite de reforços
  if (type === gameState.BarrelTypes.REINFORCEMENT && entities.allies.length >= gameState.maxReinforcements) {
    type = Math.random() < 0.5 ? gameState.BarrelTypes.BUFF : gameState.BarrelTypes.NERF;
  }

  entities.barrels.push(createBarrel(type as 'reinforcement' | 'nerf' | 'buff' | 'health' | 'shield'));
}

// Atualizar a tela final para exibir o score máximo e o score atual
function updateGameOverScreen(): void {
  if (gameState.isGameOver || entities.allies[0].hp <= 0) {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'gameOverScreen';
    gameOverScreen.className = 'fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center text-white';

    gameOverScreen.innerHTML = `
      <h1 class='text-4xl font-bold mb-4'>Game Over</h1>
      <p class='text-lg mb-2'>Score Atual: ${gameState.score}</p>
      <p class='text-lg mb-4'>Recorde: ${gameState.highScore}</p>
      <button id='restartButton' class='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>Reiniciar</button>
      <a id='shareButton' href='https://twitter.com/intent/tweet?text=Eu%20acabei%20de%20fazer%20${gameState.score}%20pontos%20no%20Warrior%20X%20Horde!%20Jogue%20agora%20em%20https://warrior-x-horde.netlify.app'
       target='_blank'
       class='bg-blue-400 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded mt-4 inline-block'>
      Compartilhar no Twitter
      </a>
    `;

    document.body.appendChild(gameOverScreen);

    document.getElementById('restartButton')!.addEventListener('click', () => {
      gameOverScreen.remove();
      initGame();
    });
  }
}

// Game over
function triggerGameOver(): void {
  gameState.isGameOver = true;
  gameState.isStarted = false;

  // Atualizar high score
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('highScore', gameState.highScore.toString());
  }

  sounds.gameMusic.pause();
  sounds.bossMusic.pause();
  sounds.gameOver.play();

  startButton.innerText = "Reiniciar Jogo";
  startButton.style.display = "block";

  updateGameOverScreen();
}

// Loop principal do jogo
function gameLoop(): void {
  if (gameState.isGameOver) return;
  spawnEnemies();
  triggerZombieSprints();
  updateEntities(entities, gameState);
  processMovement(entities);
  checkCollisions(entities, gameState, handleEntityDeath);
  renderGame(ctx, entities);
  drawUI(ctx, entities, gameState);
  requestAnimationFrame(gameLoop);
}

// Event listeners
startButton.addEventListener("click", initGame);
setupInput(entities, canvas);

// Timer para spawn de barris
setInterval(spawnBarrel, 5000);

export { gameState, entities, canvas };
