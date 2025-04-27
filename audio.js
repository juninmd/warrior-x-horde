// @ts-check
// audio.js - Sistema de áudio aprimorado para comportamentos de zumbis
const sounds = {
  gameStart: new Audio('game_start.mp3'),
  gameOver: new Audio('game_over.wav'),
  gameMusic: new Audio('music.mp3'),
  bossMusic: new Audio('music_boss.mp3'),
  playerShoot: new Audio('buff_damage.wav'),
  nerf: new Audio('buff_damage.wav'),
  buff_damage: new Audio('buff_damage.wav'),
  buff_health: new Audio('buff_health.wav'),
  buff_firerate: new Audio('buff_firerate.wav'),
  buff_speed: new Audio('buff_speed.wav'),
  buff_shield: new Audio('buff_speed.wav'),
  playerHit: new Audio('nerf.wav'),
  enemyHit: new Audio('buff_health.wav'),
  barrelPickup: new Audio('power_up.wav'),
  bossHit: new Audio('buff_firerate.wav'),
  bossDeath: new Audio('boss_death.mp3'),
  waveComplete: new Audio('wave_complete.wav'),
  bossWarning: new Audio('nerf.mp3'),
  bossPhaseChange: new Audio('nerf.wav'),
  bossCharge: new Audio('nerf.wav'),
  bossSpawn: new Audio('nerf.wav'),
  bossAreaAttack: new Audio('nerf.wav'),
  zombieGroan: new Audio('nerf.wav'),
  zombieSprint: new Audio('nerf.wav'),
  zombieSpawn: new Audio('nerf.wav')
};

// Pré-carregamento dos sons
function setupAudio() {
  sounds.gameMusic.loop = true;
  sounds.bossMusic.loop = true;

  // Configurar volumes iniciais
  sounds.gameMusic.volume = 0.4;
  sounds.bossMusic.volume = 0.5;

  for (const sound in sounds) {
    if (sounds[sound]) {
      sounds[sound].load();
    }
  }
}

// Reproduz sons ambientes para criar atmosfera de jogo
function playAmbientSounds(gameState) {
  // Sons diferentes baseados no estado do jogo
  if (gameState.bossSpawnCooldown > 0 && gameState.bossSpawnCooldown < gameState.maxBossSpawnCooldown * 0.5) {
    // Sons de tensão antes do boss
    if (Math.random() < 0.05) { // 5% de chance por chamada
      sounds.bossWarning.volume = 0.2 + Math.random() * 0.2;
      sounds.bossWarning.play().catch(e => { });
    }
  } else if (gameState.currentWave > 3) {
    // Sons mais intensos em ondas avançadas
    if (Math.random() < 0.03) { // 3% de chance por chamada
      sounds.zombieGroan.volume = 0.3 + Math.random() * 0.3;
      sounds.zombieGroan.play().catch(e => { });
    }
  }
}

// Configuração inicial
let isMusicMuted = false;
// Alternar estado de mudo/som
function toggleAudio() {
  isMusicMuted = !isMusicMuted;

  // Aplicar volume a todos os sons
  Object.keys(sounds).forEach(key => {
    const sound = sounds[key];
    if (sound) {
      sound.volume = isMusicMuted ? 0 : 0.5;
    }
  });

  // Volumes específicos para músicas
  sounds.gameMusic.volume = isMusicMuted ? 0 : 0.4;
  sounds.bossMusic.volume = isMusicMuted ? 0 : 0.5;
}
// Funções para gerenciar música de fundo
function playBackgroundMusic(isBossFight = false) {
  if (isBossFight) {
    sounds.gameMusic.pause();
    sounds.bossMusic.currentTime = 0;
    sounds.bossMusic.play();
  } else {
    sounds.bossMusic.pause();
    sounds.gameMusic.currentTime = 0;
    sounds.gameMusic.play();
  }
}


export { sounds, setupAudio,  playAmbientSounds, toggleAudio, playBackgroundMusic };