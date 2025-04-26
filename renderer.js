// renderer.js - Funções de renderização
import { warriorSprite } from './entities.js';

// Cores
const COLORS = {
  bullet: "yellow",
  enemyBullet: "orange",
  enemy: "red",
  boss: "darkred",
  barrel: {
    buff: "green",
    nerf: "purple",
    reinforcement: "yellow"
  },
  text: "white",
  shield: "rgba(0, 200, 255, 0.5)",
  superCannon: ["rgba(255, 0, 0, ", "rgba(255, 255, 0, ", "rgba(255, 0, 0, "]
};

// Renderizar o jogo completo
function renderGame(ctx, entities) {
  const { allies, enemies, barrels, boss, bullets } = entities;

  // Limpar tela
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Desenhar super canhão (atrás de tudo)
  if (allies.length > 0 && allies[0].superCannonActive) {
    drawSuperCannonEffect(ctx, allies[0]);
  }

  // Desenhar balas
  drawBullets(ctx, bullets);

  // Desenhar inimigos
  drawEnemies(ctx, enemies);

  // Desenhar chefe
  if (boss) {
    drawBoss(ctx, boss);
  }

  // Desenhar barris
  drawBarrels(ctx, barrels);

  // Desenhar aliados
  drawAllies(ctx, allies);
}

// Desenhar aliados (jogador e reforços)
function drawAllies(ctx, allies) {
  allies.forEach(ally => {
    if (ally.damageEffect) {
      ctx.filter = "brightness(150%) hue-rotate(-50deg)";
    }

    // Desenhar sprite do jogador
    ctx.drawImage(warriorSprite, ally.frameIndex * 64, 0, 64, 64, ally.x, ally.y, 64, 64);
    ctx.filter = "none";

    // Desenhar escudo se tiver
    if (ally.shield > 0) {
      ctx.beginPath();
      ctx.arc(ally.x + ally.width / 2, ally.y + ally.height / 2, 40, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });
}

// Desenhar balas
function drawBullets(ctx, bullets) {
  bullets.forEach(bullet => {
    ctx.fillStyle = bullet.isEnemy ? COLORS.enemyBullet : COLORS.bullet;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

// Desenhar inimigos
function drawEnemies(ctx, enemies) {
  enemies.forEach(enemy => {
    ctx.fillStyle = COLORS.enemy;
    if (enemy.damageEffect) ctx.filter = "brightness(150%) sepia(100%)";
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.filter = "none";

    // HP do inimigo
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`HP: ${enemy.hp}`, enemy.x + 5, enemy.y + 20);
  });
}

// Desenhar chefe
function drawBoss(ctx, boss) {
  if (boss.damageEffect) ctx.filter = "brightness(200%)";
  ctx.fillStyle = COLORS.boss;
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.filter = "none";

  // Texto do chefe
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = "center";
  ctx.fillText("CHEFE", boss.x + boss.width / 2, boss.y + 20);
  ctx.fillText(`HP: ${boss.hp}`, boss.x + boss.width / 2, boss.y + 40);

  // Barra de vida do chefe
  drawBossHealthBar(ctx, boss);
}

// Desenhar barris
function drawBarrels(ctx, barrels) {
  barrels.forEach(barrel => {
    ctx.fillStyle = COLORS.barrel[barrel.barrelType] || "gray";
    ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);

    // HP para barris de reforço
    if (barrel.barrelType === "reinforcement") {
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`HP: ${barrel.hp}`, barrel.x + barrel.width / 2, barrel.y + 40);
    }
  });
}

// Desenhar barra de vida do chefe
function drawBossHealthBar(ctx, boss) {
  const barWidth = ctx.canvas.width - 40;
  const barHeight = 20;
  const x = 20;
  const y = 20;
  const hpPercent = boss.hp / boss.maxHp;
  const barColor = `rgb(${Math.floor(255 * (1 - hpPercent))}, ${Math.floor(255 * hpPercent)}, 0)`;

  // Fundo da barra
  ctx.fillStyle = "black";
  ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

  // Barra de HP
  ctx.fillStyle = barColor;
  ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

  // Contorno
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Texto
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("CHEFE", x + barWidth / 2, y + 15);
}

// Desenhar efeito do super canhão
function drawSuperCannonEffect(ctx, player) {
  const beamWidth = 20;
  const beamX = player.x + player.width / 2 - beamWidth / 2;
  const beamHeight = player.y;

  // Efeito de pulso
  const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;

  // Gradiente
  const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);
  gradient.addColorStop(0, `${COLORS.superCannon[0]}${0.2 * pulse})`);
  gradient.addColorStop(0.5, `${COLORS.superCannon[1]}${0.4 * pulse})`);
  gradient.addColorStop(1, `${COLORS.superCannon[2]}${0.2 * pulse})`);

  // Desenhar raio
  ctx.fillStyle = gradient;
  ctx.fillRect(beamX, 0, beamWidth, beamHeight);

  // Borda mais intensa
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.3 * pulse})`;
  ctx.lineWidth = 2 + 2 * pulse;
  ctx.strokeRect(beamX, 0, beamWidth, beamHeight);
}

// Desenhar interface do usuário
function drawUI(ctx, entities, gameState) {
  const { allies } = entities;
  const mainPlayer = allies.length > 0 ? allies[0] : null;

  if (!mainPlayer) return;

  ctx.fillStyle = COLORS.text;
  ctx.font = "16px Arial";

  // Game over screen
  if (gameState.isGameOver) {
    drawGameOver(ctx, gameState);
    return;
  }

  // Bottom-right stats
  ctx.textAlign = "right";
  ctx.fillText(`HP: ${mainPlayer.hp}`, ctx.canvas.width - 10, ctx.canvas.height - 10);
  ctx.fillText(`DMG: ${mainPlayer.bulletDamage}`, ctx.canvas.width - 10, ctx.canvas.height - 30);
  ctx.fillText(`Rate: ${mainPlayer.fireRate}`, ctx.canvas.width - 10, ctx.canvas.height - 50);
  ctx.fillText(`Escudo: ${mainPlayer.shield}`, ctx.canvas.width - 10, ctx.canvas.height - 70);

  // Status do super tiro com cooldown
  const superCannonStatus = getSuperCannonStatus(mainPlayer);
  ctx.fillText(`Super Tiro: ${superCannonStatus}`, ctx.canvas.width - 10, ctx.canvas.height - 90);

  // Reforços
  ctx.fillText(`Reforços: ${allies.length - 1}/5`, ctx.canvas.width - 10, ctx.canvas.height - 110);

  // Bottom-left stats
  ctx.textAlign = "left";
  ctx.fillText(`Kills (Wave): ${mainPlayer.kills}`, 10, ctx.canvas.height - 10);
  ctx.fillText(`Total Kills: ${mainPlayer.totalKills}`, 10, ctx.canvas.height - 30);
  ctx.fillText(`Wave: ${gameState.currentWave}`, 10, ctx.canvas.height - 50);
  ctx.fillText(`Score: ${gameState.score}`, 10, ctx.canvas.height - 70);
}

// Obter status do super canhão para exibição
function getSuperCannonStatus(player) {
  if (player.superCannonActive) {
    const remainingTime = Math.max(0, Math.ceil((player.superCannonTimer + player.superCannonDuration - Date.now()) / 1000));
    return `Ativo (${remainingTime}s)`;
  } else if (player.superCannonReady && player.kills >= 20) {
    return 'Pronto (C)';
  } else if (!player.superCannonReady) {
    const cooldownRemaining = Math.ceil((player.superCannonLastUsed + player.superCannonCooldown - Date.now()) / 1000);
    return `Cooldown: ${cooldownRemaining}s`;
  } else {
    return `${player.kills}/20`;
  }
}

// Desenhar tela de game over
function drawGameOver(ctx, gameState) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.fillStyle = COLORS.text;
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", ctx.canvas.width / 2, ctx.canvas.height / 2 - 60);

  ctx.font = "24px Arial";
  ctx.fillText(`Pontuação: ${gameState.score}`, ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.fillText(`Recorde: ${gameState.highScore}`, ctx.canvas.width / 2, ctx.canvas.height / 2 + 40);

  ctx.font = "18px Arial";
  ctx.fillText("Clique em Reiniciar Jogo para jogar novamente", ctx.canvas.width / 2, ctx.canvas.height / 2 + 100);
}

export { renderGame, drawUI };