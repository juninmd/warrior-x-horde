// @ts-check

// ======== SETUP ========
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 480;
canvas.height = 800;

let gameStarted = false;
let gameOver = false;

const startButton = document.createElement("button");
startButton.innerText = "Iniciar Jogo";
startButton.style.position = "absolute";
startButton.style.top = "50%";
startButton.style.left = "50%";
startButton.style.transform = "translate(-50%, -50%)";
startButton.style.padding = "20px 40px";
startButton.style.fontSize = "20px";
document.body.appendChild(startButton);

let enemies = [];
let barrels = [];
let currentWave = 1;
let enemiesSpawned = 0;
let boss = null;
let reinforcements = [];

const resetWarior = () => {
  return {
    x: canvas.width / 2 - 64,
    y: canvas.height - 100,
    width: 64,
    height: 64,
    speed: 2,
    bulletSpeed: 4,
    bulletDamage: 1,
    bullets: [],
    fireRate: 600,
    lastShotTime: 0,
    hp: 10,
    buffs: { damage: 0, firerate: 0, health: 0 },
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
    damageEffect: 0,
    kills: 0,
    totalKills: 0,
    shield: 0,
    superCannonActive: false,
    superCannonTimer: 0,
    superCannonDuration: 3000,
    maxReinforcements: 5,
  };
};

startButton.addEventListener("click", () => {
  startButton.style.display = "none";
  gameStarted = true;
  gameOver = false;
  sounds.gameStart.play();
  sounds.gameMusic.play();

  warrior = resetWarior();

  enemies = [];
  barrels = [];
  currentWave = 1;
  enemiesSpawned = 0;
  boss = null;
  reinforcements = [];

  gameLoop();
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
const supperCannonCount = 5;
document.addEventListener("keydown", (e) => {
  if (e.key === 'm') {
    toggleMusic();
  };

  if (e.key === 'c' && warrior.kills >= supperCannonCount && !warrior.superCannonActive) {
    activateSuperCannon();
  };

});

const warriorSprite = new Image();
warriorSprite.src = "hero.png"; // 3 frames, 64x64 each, top-down soldier

// ======== AUDIO ========
const sounds = {
  gameStart: new Audio("game_start.mp3"),
  gameOver: new Audio("game_over.wav"),
  gameMusic: new Audio("music.mp3"),
  bossMusic: new Audio("music_boss.mp3"),
  bossDeath: new Audio("boss_death.mp3"),
  waveComplete: new Audio("wave_complete.wav"),
  buff_damage: new Audio("buff_damage.wav"),
  buff_firerate: new Audio("buff_firerate.wav"),
  buff_health: new Audio("buff_health.wav"),
  nerf: new Audio("nerf.wav"),
  superCannon: new Audio("boss_death.mp3") // novo
};
sounds.gameMusic.loop = true;
sounds.bossMusic.loop = true;
sounds.gameMusic.volume = 0.4;
sounds.bossMusic.volume = 0.5;

let isMusicMuted = false;
function toggleMusic() {
  isMusicMuted = !isMusicMuted;
  Object.values(sounds).forEach(s => s.volume = isMusicMuted ? 0 : 0.5);
  sounds.gameMusic.volume = isMusicMuted ? 0 : 0.4;
}

// ======== STATE ========
let warrior = resetWarior();


// ======== INPUT ========
let keys = {};
function handleKeyDown(e) {
  keys[e.key] = true;
}

function handleKeyUp(e) {
  keys[e.key] = false;
}

// ======== MOVEMENT ========
function moveWarrior() {
  let moved = false;
  if (keys["ArrowLeft"] && warrior.x > 0) {
    warrior.x -= warrior.speed;
    moved = true;
  }
  if (keys["ArrowRight"] && warrior.x < canvas.width - warrior.width) {
    warrior.x += warrior.speed;
    moved = true;
  }
  if (moved) {
    warrior.frameTimer += 16;
    if (warrior.frameTimer >= warrior.frameInterval) {
      warrior.frameTimer = 0;
      warrior.frameIndex = (warrior.frameIndex + 1) % 3;
    }
  } else {
    warrior.frameIndex = 1;
  }
  updateReinforcements();
}

// ======== SHOOTING ========
function shoot() {
  const now = Date.now();
  if (now - warrior.lastShotTime >= warrior.fireRate) {
    warrior.bullets.push({ x: warrior.x + warrior.width / 2 - 2.5, y: warrior.y, speed: warrior.bulletSpeed, damage: warrior.bulletDamage });
    warrior.lastShotTime = now;
    fireReinforcementBullets();
  }
}

const superCannonDamage = 5;

// ======== SUPER CANNON ========
function activateSuperCannon() {
  warrior.superCannonActive = setInterval(() => {
    const beamX = warrior.x + warrior.width / 2 - 10;

    if (boss && boss.y < warrior.y && boss.x + boss.width > beamX && boss.x < beamX + 20) {
      bossDamage(superCannonDamage);
    }

    enemies.forEach((enemy, i) => {
      if (enemy.y < warrior.y && enemy.x + enemy.width > beamX && enemy.x < beamX + 20) {
        enemy.hp -= superCannonDamage;
        if (enemy.hp <= 0) { enemies.splice(i, 1); warrior.kills++; warrior.totalKills++; }
      }
    });
  }, 100);
  warrior.superCannonTimer = Date.now();
  sounds.superCannon.play();
}

function updateSuperCannon() {
  if (warrior.superCannonActive && Date.now() - warrior.superCannonTimer > warrior.superCannonDuration) {
    clearInterval(warrior.superCannonActive);
    warrior.superCannonActive = false;
  }
}

function drawSuperCannonEffect() {
  if (warrior.superCannonActive) {
    const beamWidth = 20;
    const beamX = warrior.x + warrior.width / 2 - beamWidth / 2;
    const beamHeight = warrior.y;
    const gradient = ctx.createLinearGradient(beamX, 0, beamX + beamWidth, 0);

    const pulse = Math.sin(Date.now() / 100) * 0.2 + 0.8;
    gradient.addColorStop(0, `rgba(255, 0, 0, ${0.2 * pulse})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 0, ${0.4 * pulse})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${0.2 * pulse})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(beamX, 0, beamWidth, beamHeight);

    // Borda mais intensa
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.3 * pulse})`;
    ctx.lineWidth = 2 + 2 * pulse;
    ctx.strokeRect(beamX, 0, beamWidth, beamHeight);
  }
}

// ======== SPAWNERS ========
const bossAppearEnemiesCount = 10;
function spawnEnemy() {
  if (!gameStarted) return;
  for (let i = 0; i < Math.min(3, bossAppearEnemiesCount - enemiesSpawned); i++) {
    enemies.push({
      x: Math.random() * (canvas.width - 50),
      y: 0,
      width: 50,
      height: 50,
      speed: 0.1 + (currentWave / 5) * 0.1,
      hp: 0 + currentWave,
      damageEffect: 0
    });
    enemiesSpawned++;
  }
  if (enemiesSpawned >= bossAppearEnemiesCount && !boss) {
    boss = {
      x: canvas.width / 2 - 120,
      y: 0,
      width: 240,
      height: 120,
      speed: 0.1, // reduzido para 1/3
      hp: (1 + currentWave * 10) * 3, // aumentado x3
      maxHp: (1 + currentWave * 10) * 3, // aumentado x3
      damageEffect: 0,
      bullets: [],
      lastShot: Date.now(),
      damage: 5,
    };
    sounds.gameMusic.pause();
    sounds.bossMusic.currentTime = 0;
    sounds.bossMusic.play();
  }
}

function spawnBarrel() {
  if (!gameStarted) return;

  if (reinforcements.length < warrior.maxReinforcements) {
    barrels.push({ x: Math.random() * (canvas.width - 30), y: 0, width: 30, height: 30, speed: 0.3, type: "reinforcement", hp: 1 });
  }

  let type = Math.random() < 0.5 ? "buff" : "nerf";
  barrels.push({ x: Math.random() * (canvas.width - 30), y: 0, width: 30, height: 30, speed: 1, type });
}

// ======== COLLISIONS ======== People / Bullet
function checkCollisions() {

  // reinforcements
  reinforcements.forEach((reinforcement, i) => {
    if (boss) {
      if (
        boss.x < reinforcement.x + reinforcement.width &&
        boss.x + boss.width > reinforcement.x &&
        boss.y < reinforcement.y + reinforcement.height &&
        boss.y + boss.height > reinforcement.y
      ) {
        reinforcement.damageEffect = 5;
        reinforcements.splice(i, 1);
      }
    }

    // bullets
    reinforcement.bullets.forEach((bullet, bIndex) => {

      enemies.forEach((enemy, eIndex) => {
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + 5 > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + 10 > enemy.y
        ) {
          enemy.hp -= bullet.damage;
          enemy.damageEffect = 5;
          reinforcement.bullets.splice(bIndex, 1);
          if (enemy.hp <= 0) {
            enemies.splice(eIndex, 1);
          }
        }
      });

      if (boss) {
        if (bullet.x < boss.x + boss.width && bullet.x + 5 > boss.x && bullet.y < boss.y + boss.height && bullet.y + 10 > boss.y) {
          reinforcement.bullets.splice(bIndex, 1);
          bossDamage(bullet.damage);
        }
      }
    });
  });

  // boss
  if (boss) {
    if (
      boss.x < warrior.x + warrior.width &&
      boss.x + boss.width > warrior.x &&
      boss.y < warrior.y + warrior.height &&
      boss.y + boss.height > warrior.y
    ) {
      warriorDamage(warrior, warrior.hp);
    }
  }

  warrior.bullets.forEach((bullet, bIndex) => {
    enemies.forEach((enemy, eIndex) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + 5 > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + 10 > enemy.y
      ) {
        enemy.hp -= bullet.damage;
        enemy.damageEffect = 5;
        warrior.bullets.splice(bIndex, 1);
        if (enemy.hp <= 0) {
          enemies.splice(eIndex, 1);
          warrior.kills++;
          warrior.totalKills++;
        }
      }
    });

    if (boss) {
      if (bullet.x < boss.x + boss.width && bullet.x + 5 > boss.x && bullet.y < boss.y + boss.height && bullet.y + 10 > boss.y) {
        warrior.bullets.splice(bIndex, 1);
        bossDamage(bullet.damage);
      }
    }

    barrels.forEach((barrel, i) => {

      if (barrel.type === "reinforcement") {
        if (
          bullet.x < barrel.x + barrel.width &&
          bullet.x + 5 > barrel.x &&
          bullet.y < barrel.y + barrel.height &&
          bullet.y + 10 > barrel.y
        ) {
          barrel.damageEffect = 5;
          barrel.hp -= warrior.bulletDamage;
          warrior.bullets.splice(bIndex, 1);
          if (barrel.hp <= 0) {
            sounds.buff_damage.play();
            barrels.splice(i, 1);
            spawnReinforcement();
          }
        }
      }
    });

  });

  barrels.forEach((barrel, i) => {
    if (
      warrior.x < barrel.x + barrel.width &&
      warrior.x + warrior.width > barrel.x &&
      warrior.y < barrel.y + barrel.height &&
      warrior.y + warrior.height > barrel.y
    ) {
      if (barrel.type === "buff") {
        let rand = Math.random();

        if (rand < 0.22) {
          warrior.shield += 1;
          sounds.buff_damage.play();
        } else if (rand < 0.33) {
          warrior.bulletDamage++;
          warrior.buffs.damage++;
          sounds.buff_damage.play();
        } else if (rand < 0.66) {
          warrior.fireRate = Math.max(100, warrior.fireRate - 100);
          warrior.buffs.firerate++;
          sounds.buff_firerate.play();
        } else {
          warrior.hp += 1;
          warrior.buffs.health++;
          sounds.buff_health.play();
        }
      } else if (barrel.type === "nerf") {
        let rand = Math.random();
        if (rand < 0.33) {
          warrior.bulletDamage = Math.max(1, warrior.bulletDamage - 1);
        } else if (rand < 0.66) {
          warrior.fireRate += 100;
        } else {
          warrior.hp = Math.max(1, warrior.hp - 1);
        }
        sounds.nerf.play();
      }

      if (barrel.type !== "reinforcement") {
        barrels.splice(i, 1);
      }
    }
  });

  enemies.forEach((enemy, eIndex) => {

    if (
      enemy.x < warrior.x + warrior.width &&
      enemy.x + enemy.width > warrior.x &&
      enemy.y < warrior.y + warrior.height &&
      enemy.y + enemy.height > warrior.y
    ) {
      warriorDamage(warrior);
      enemies.splice(eIndex, 1);
    }

    reinforcements.forEach((reinforcement, i) => {
      if (
        enemy.x < reinforcement.x + reinforcement.width &&
        enemy.x + enemy.width > reinforcement.x &&
        enemy.y < reinforcement.y + reinforcement.height &&
        enemy.y + enemy.height > reinforcement.y
      ) {
        reinforcement.damageEffect = 5;
        reinforcements.splice(i, 1);
      }
    });

  });
}

function bossDamage(damage) {
  boss.hp -= damage;
  boss.damageEffect = 5;
  if (boss.hp <= 0) {
    boss = null;
    warrior.kills++;
    warrior.totalKills++;
    enemiesSpawned = 0;
    currentWave++;
    sounds.bossMusic.pause();
    sounds.gameMusic.play();
    sounds.bossDeath.play();
    sounds.waveComplete.play();
  }
}

// ======== UPDATE + DRAW + LOOP ========
function update() {
  if (!gameStarted) return;
  moveWarrior();
  if (keys[" "]) shoot();

  if (warrior.damageEffect) warrior.damageEffect--;

  warrior.bullets.forEach((bullet, i) => {
    bullet.y -= bullet.speed;
    if (bullet.y < 0) warrior.bullets.splice(i, 1);
  });

  reinforcements.forEach((reinforcement) => {
    reinforcement.bullets.forEach((bullet, i) => {
      bullet.y -= bullet.speed;
      if (bullet.y < 0) reinforcement.bullets.splice(i, 1);
    });
  });

  enemies.forEach((enemy, i) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      warriorDamage(warrior);
      enemies.splice(i, 1);
    }
    if (enemy.damageEffect) enemy.damageEffect--;
  });

  if (boss) {
    boss.y += boss.speed;
    if (boss.damageEffect) {
      boss.damageEffect--;
    }
    if (Date.now() - boss.lastShot > 1500) {
      boss.bullets.push({ x: boss.x + boss.width / 2 - 2.5, y: boss.y + boss.height, speed: 2 });
      boss.lastShot = Date.now();
    }

    boss.bullets.forEach((b, i) => {
      b.y += b.speed;

      reinforcements.forEach((reinforcement, q) => {
        if (
          b.x < reinforcement.x + reinforcement.width &&
          b.x + 5 > reinforcement.x &&
          b.y < reinforcement.y + reinforcement.height &&
          b.y + 10 > reinforcement.y
        ) {
          reinforcements.splice(q, 1);
          boss.bullets.splice(i, 1);
        }
      });

      if (
        b.x < warrior.x + warrior.width &&
        b.x + 5 > warrior.x &&
        b.y < warrior.y + warrior.height &&
        b.y + 10 > warrior.y
      ) {
        warriorDamage(warrior, boss.damage);
        boss.bullets.splice(i, 1);
      }
      else if (
        b.x < warrior.x + warrior.width &&
        b.x + 5 > warrior.x &&
        b.y < warrior.y + warrior.height &&
        b.y + 10 > warrior.y
      ) {
        warriorDamage(warrior, boss.damage);
        boss.bullets.splice(i, 1);
      }

      else if (b.y > canvas.height) {
        boss.bullets.splice(i, 1);
      }
    });

    if (boss > canvas.height) {
      boss = null;
      triggerGameOver();
    };

  }

  barrels.forEach((barrel, i) => {
    barrel.y += barrel.speed;
    if (barrel.y > canvas.height) {
      barrels.splice(i, 1);
    };
  });

  checkCollisions();
  updateReinforcementBullets();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (warrior.damageEffect) {
    ctx.filter = "brightness(150%) hue-rotate(-50deg)";
  };
  ctx.drawImage(warriorSprite, warrior.frameIndex * 64, 0, 64, 64, warrior.x, warrior.y, 64, 64);
  ctx.filter = "none";

  ctx.fillStyle = "red";
  enemies.forEach(enemy => {
    if (enemy.damageEffect) ctx.filter = "brightness(150%) sepia(100%)";
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    ctx.filter = "none";
    ctx.fillStyle = "white";
    ctx.fillText(`HP: ${enemy.hp}`, enemy.x + 5, enemy.y + 20);
    ctx.fillStyle = "red";
  });

  if (boss) {
    if (boss.damageEffect) ctx.filter = "brightness(200%)";
    ctx.fillStyle = "darkred";
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.filter = "none";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("BOSS", boss.x + boss.width / 2, boss.y + 20);
    ctx.fillText(`HP: ${boss.hp}`, boss.x + boss.width / 2, boss.y + 40);
    ctx.fillStyle = "orange";
    boss.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10));
  }

  ctx.fillStyle = "yellow";
  warrior.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10));

  drawReinforcementBullets();

  if (warrior.shield > 0) {
    ctx.beginPath();
    ctx.arc(warrior.x + warrior.width / 2, warrior.y + warrior.height / 2, 40, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  barrels.forEach(barrel => {
    if (barrel.type === "reinforcement") {
      ctx.fillText(`HP: ${barrel.hp}`, barrel.x + barrel.width / 2, barrel.y + 40);
      ctx.fillStyle = "yellow";
    }

    if (barrel.type === "buff") {
      ctx.fillStyle = "green";
    }

    if (barrel.type === "nerf") {
      ctx.fillStyle = "purple";
    }
    ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
  });

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";

  // Bottom-right stats
  ctx.textAlign = "right";
  ctx.fillText(`HP: ${warrior.hp}`, canvas.width - 10, canvas.height - 10);
  ctx.fillText(`DMG: ${warrior.bulletDamage}`, canvas.width - 10, canvas.height - 30);
  ctx.fillText(`Rate: ${warrior.fireRate}`, canvas.width - 10, canvas.height - 50);
  ctx.fillText(`Escudo: ${warrior.shield}`, canvas.width - 10, canvas.height - 70);
  ctx.fillText(`Super Tiro: ${warrior.kills >= supperCannonCount ? 'Pronto (C)' : warrior.kills + `/${supperCannonCount}`}`, canvas.width - 10, canvas.height - 90);
  ctx.fillText(`Reforços ${reinforcements.length} /${warrior.maxReinforcements}`, canvas.width - 10, canvas.height - 110);

  ctx.textAlign = "left";
  ctx.fillText(`Kills (Wave): ${warrior.kills}`, 10, canvas.height - 10);
  ctx.fillText(`Total Kills: ${warrior.totalKills}`, 10, canvas.height - 30);
  ctx.fillText(`Wave: ${currentWave}`, 10, canvas.height - 50);

  drawSuperCannonEffect();
  drawBossHealthBar();
  drawReinforcements();
}

// ======== MOUSE CONTROLS ========
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  warrior.x = mouseX - warrior.width / 2;

  // Impede que o guerreiro saia da tela
  if (warrior.x < 0) warrior.x = 0;
  if (warrior.x > canvas.width - warrior.width) warrior.x = canvas.width - warrior.width;
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) shoot(); // botão esquerdo
});


function warriorDamage(warrior, hp) {
  if (warrior.shield > 0) {
    warrior.shield--;
  } else {
    warrior.damageEffect = 5;
    warrior.hp -= hp || 1;
  }

  if (warrior.hp <= 0) {
    triggerGameOver();
  }
}

function drawBossHealthBar() {
  if (boss) {
    const barWidth = canvas.width - 40;
    const barHeight = 20;
    const x = 20;
    const y = 20;
    const hpPercent = boss.hp / boss.maxHp;
    const barColor = `rgb(${Math.floor(255 * (1 - hpPercent))}, ${Math.floor(255 * hpPercent)}, 0)`;

    ctx.fillStyle = "black";
    ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("BOSS", x + barWidth / 2 - 30, y + 15);
  }
}


function spawnReinforcement() {
  if (reinforcements.length >= warrior.maxReinforcements) {
    return;
  };

  const offsetX = 10 * (reinforcements.length + 1);
  const targetX = warrior.x + warrior.width / 2;

  reinforcements.push({
    offsetX: (reinforcements.length % 2 === 0 ? -offsetX : offsetX),
    bullets: [],
    lastShotTime: 0,
    x: targetX - 4,
    y: warrior.y,
    width: 64,
    height: 64,
    frameIndex: 0,
    frameTimer: 0,
    frameInterval: 120,
  });
}

function updateReinforcements() {
  reinforcements.forEach(r => {

    let moved = false;
    if (keys["ArrowLeft"] && warrior.x > 0) {
      moved = true;
    }
    if (keys["ArrowRight"] && r.x < canvas.width - r.width) {
      moved = true;
    }
    if (moved) {
      r.frameTimer += 16;
      if (r.frameTimer >= r.frameInterval) {
        r.frameTimer = 0;
        r.frameIndex = (r.frameIndex + 1) % 3;
      }
    } else {
      r.frameIndex = 1;
    }

    const targetX = warrior.x + warrior.width / 2 + r.offsetX;
    r.x = Math.max(0, Math.min(canvas.width - 64, targetX - 4)); // 64 é a largura do reforço
    r.y = warrior.y;
  });
}

function drawReinforcements() {
  reinforcements.forEach(r => {
    ctx.drawImage(warriorSprite, r.frameIndex * 64, 0, 64, 64, r.x, r.y, 64, 64);
    ctx.filter = "none";
  });
}

function fireReinforcementBullets() {
  const now = Date.now();
  reinforcements.forEach(r => {
    if (now - r.lastShotTime >= warrior.fireRate) {
      r.bullets.push({ x: r.x + 16 - 2, y: r.y, width: 4, height: 10, speed: warrior.bulletSpeed, damage: warrior.bulletDamage });
      r.lastShotTime = now;
    }
  });
}

function updateReinforcementBullets() {
  reinforcements.forEach(r => {
    r.bullets.forEach(b => b.y -= warrior.bulletSpeed);
  });
}

function drawReinforcementBullets() {
  ctx.fillStyle = "yellow";
  reinforcements.forEach((reinforcement) => reinforcement.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10)));
}

// ======== GAME OVER ========
function triggerGameOver() {
  gameOver = true;
  gameStarted = false;
  sounds.gameMusic.pause();
  sounds.bossMusic.pause();
  sounds.gameOver.play();
  startButton.innerText = "Reiniciar Jogo";
  startButton.style.display = "block";
}

function gameLoop() {
  if (gameOver) {
    return;
  }
  update();
  draw();
  requestAnimationFrame(gameLoop);
  updateSuperCannon();
}

setInterval(spawnEnemy, 100);
setInterval(spawnBarrel, 1400);