
import { createPlayer } from './entities';
import { updateEntities } from './entityUpdater';
import { renderGame } from './renderer';
import { drawUI } from './ui';
import { setupInput, isShooting } from './input';
import { processMovement } from './movement';
import { sounds } from './audio';
import { preloadSounds } from './audioManager';
import { checkCollisions } from './collisions';
import { Entities } from './types';
import { gameState } from './gameState';
import { spawnEnemies, spawnBarrel, triggerZombieSprints } from './spawner';
import { initGame } from './gameSetup';
import { handleEntityDeath, updateBossSpawn } from './gameManager';
import { updateBuffs, drawBuffs } from './buffs';

preloadSounds();

export const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const startButton = Object.assign(document.createElement("button"), {
  innerText: "Iniciar Jogo",
  style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px 40px; font-size: 20px;",
});
document.body.appendChild(startButton);

export let entities: Entities = {
  allies: [], enemies: [], barrels: [], boss: null, bullets: []
};

let lastTime = 0;
function gameLoop(currentTime: number): void {
  if (gameState.isGameOver) return;

  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  spawnEnemies();
  updateBossSpawn();
  triggerZombieSprints(entities.enemies);
  updateEntities(entities, gameState, isShooting);
  processMovement(entities);
  checkCollisions(entities, gameState, handleEntityDeath);
  updateBuffs(deltaTime);
  renderGame(ctx, entities);
  drawUI(ctx, entities, gameState);
  drawBuffs(ctx);
  requestAnimationFrame(gameLoop);
}

import { preloadImages } from './sprites';

startButton.addEventListener("click", async () => {
  startButton.disabled = true; // Disable button during loading
  startButton.innerText = "Loading...";
  try {
    await preloadImages();
    initGame(entities, gameState, gameLoop, startButton);
  } catch (error) {
    console.error("Failed to load game assets:", error);
    startButton.innerText = "Error loading game";
  }
});
setupInput(entities, canvas);
setInterval(spawnBarrel, 5000);
