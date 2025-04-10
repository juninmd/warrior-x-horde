// ======== SETUP ========
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 480;
canvas.height = 800;

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

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
  nerf: new Audio("nerf.wav")
};
sounds.gameMusic.loop = true;
sounds.bossMusic.loop = true;
sounds.gameMusic.volume = 0.4;
sounds.bossMusic.volume = 0.5;
sounds.gameStart.play();
sounds.gameMusic.play();

// ======== STATE ========
let warrior = {
  x: canvas.width / 2 - 32,
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
  totalKills: 0
};

let keys = {};
let enemies = [];
let barrels = [];
let currentWave = 1;
let enemiesSpawned = 0;
let boss = null;

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
}

// ======== SHOOTING ========
function shoot() {
  const now = Date.now();
  if (now - warrior.lastShotTime >= warrior.fireRate) {
    warrior.bullets.push({ x: warrior.x + warrior.width / 2 - 2.5, y: warrior.y, speed: warrior.bulletSpeed, damage: warrior.bulletDamage });
    warrior.lastShotTime = now;
  }
}

// ======== SPAWNERS ========
function spawnEnemy() {
  if (enemiesSpawned < 100) {
    enemies.push({
      x: Math.random() * (canvas.width - 50),
      y: 0,
      width: 50,
      height: 50,
      speed: 0.6,
      hp: 3,
      damageEffect: 0
    });
    enemiesSpawned++;
  } else if (!boss) {
    boss = {
      x: canvas.width / 2 - 120,
      y: 0,
      width: 240,
      height: 120,
      speed: 0.3,
      hp: 50 + currentWave * 10,
      damageEffect: 0,
      bullets: [],
      lastShot: Date.now()
    };
    sounds.gameMusic.pause();
    sounds.bossMusic.currentTime = 0;
    sounds.bossMusic.play();
  }
}

function spawnBarrel() {
  let type = Math.random() < 0.5 ? "buff" : "nerf";
  barrels.push({ x: Math.random() * (canvas.width - 30), y: 0, width: 30, height: 30, speed: 1, type });
}

// ======== COLLISIONS ========
function checkCollisions() {
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
    if (boss && bullet.x < boss.x + boss.width && bullet.x + 5 > boss.x && bullet.y < boss.y + boss.height && bullet.y + 10 > boss.y) {
      boss.hp -= bullet.damage;
      boss.damageEffect = 5;
      warrior.bullets.splice(bIndex, 1);
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
        if (rand < 0.33) {
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
      } else {
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
      barrels.splice(i, 1);
    }
  });

  enemies.forEach((enemy, eIndex) => {
    if (
      enemy.x < warrior.x + warrior.width &&
      enemy.x + enemy.width > warrior.x &&
      enemy.y < warrior.y + warrior.height &&
      enemy.y + enemy.height > warrior.y
    ) {
      warrior.hp -= 1;
      warrior.damageEffect = 5;
      enemies.splice(eIndex, 1);
    }
  });
}

// ======== UPDATE + DRAW + LOOP ========
function update() {
  moveWarrior();
  if (keys[" "]) shoot();

  if (warrior.damageEffect) warrior.damageEffect--;

  warrior.bullets.forEach((bullet, i) => {
    bullet.y -= bullet.speed;
    if (bullet.y < 0) warrior.bullets.splice(i, 1);
  });

  enemies.forEach((enemy, i) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      warrior.hp -= 1;
      warrior.damageEffect = 5;
      enemies.splice(i, 1);
    }
    if (enemy.damageEffect) enemy.damageEffect--;
  });

  if (boss) {
    boss.y += boss.speed;
    if (boss.damageEffect) boss.damageEffect--;
    if (Date.now() - boss.lastShot > 1500) {
      boss.bullets.push({ x: boss.x + boss.width / 2 - 2.5, y: boss.y + boss.height, speed: 2 });
      boss.lastShot = Date.now();
    }
    boss.bullets.forEach((b, i) => {
      b.y += b.speed;
      if (
        b.x < warrior.x + warrior.width &&
        b.x + 5 > warrior.x &&
        b.y < warrior.y + warrior.height &&
        b.y + 10 > warrior.y
      ) {
        warrior.hp -= 1;
        warrior.damageEffect = 5;
        boss.bullets.splice(i, 1);
      } else if (b.y > canvas.height) {
        boss.bullets.splice(i, 1);
      }
    });
  }

  barrels.forEach((barrel, i) => {
    barrel.y += barrel.speed;
    if (barrel.y > canvas.height) barrels.splice(i, 1);
  });

  checkCollisions();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (warrior.damageEffect) ctx.filter = "brightness(150%) hue-rotate(-50deg)";
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
    ctx.fillText("MINOTAURO", boss.x + boss.width / 2, boss.y + 20);
    ctx.fillText(`HP: ${boss.hp}`, boss.x + boss.width / 2, boss.y + 40);
    ctx.fillStyle = "orange";
    boss.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10));
  }

  ctx.fillStyle = "yellow";
  warrior.bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, 5, 10));

  barrels.forEach(barrel => {
    ctx.fillStyle = barrel.type === "buff" ? "green" : "purple";
    ctx.fillRect(barrel.x, barrel.y, barrel.width, barrel.height);
  });

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";

  // Bottom-right stats
  ctx.textAlign = "right";
  ctx.fillText(`HP: ${warrior.hp}`, canvas.width - 10, canvas.height - 10);
  ctx.fillText(`DMG: ${warrior.bulletDamage}`, canvas.width - 10, canvas.height - 30);
  ctx.fillText(`Rate: ${warrior.fireRate}`, canvas.width - 10, canvas.height - 50);

  ctx.textAlign = "left";
  ctx.fillText(`Kills (Wave): ${warrior.kills}`, 10, canvas.height - 10);
  ctx.fillText(`Total Kills: ${warrior.totalKills}`, 10, canvas.height - 30);
  ctx.fillText(`Wave: ${currentWave}`, 10, canvas.height - 50);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
setInterval(spawnEnemy, 2500);
setInterval(spawnBarrel, 6000);
