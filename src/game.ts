
import { createPlayer } from './entities';
import { updateEntities } from './entityUpdater';
import { renderGame } from './renderer';
import { drawUI } from './ui';
import { setupInput } from './input';
import { processMovement } from './movement';
import { sounds } from './audio';
import { preloadSounds } from './audioManager';
import { checkCollisions } from './collisions';
import { Entities } from './types';
import { gameState } from './gameState';
import { spawnEnemies, spawnBarrel, triggerZombieSprints } from './spawner';
import { initGame } from './gameSetup';
import { handleEntityDeath, updateBossSpawn } from './gameManager';

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

function gameLoop(): void {
  if (gameState.isGameOver) return;
  spawnEnemies();
  updateBossSpawn();
  triggerZombieSprints(entities.enemies);
  updateEntities(entities, gameState);
  processMovement(entities);
  checkCollisions(entities, gameState, handleEntityDeath);
  renderGame(ctx, entities);
  drawUI(ctx, entities, gameState);
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", () => initGame(entities, gameState, gameLoop, startButton));
setupInput(entities, canvas);
setInterval(spawnBarrel, 5000);
