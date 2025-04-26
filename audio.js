// audio.js - Sistema de áudio do jogo

// Definição de todos os sons do jogo
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
  superCannon: new Audio("boss_death.mp3")
};

// Configuração inicial
let isMusicMuted = false;

function setupAudio() {
  // Configurar looping para músicas
  sounds.gameMusic.loop = true;
  sounds.bossMusic.loop = true;

  // Configurar volumes iniciais
  sounds.gameMusic.volume = 0.4;
  sounds.bossMusic.volume = 0.5;

  // Expor a função de toggle para uso global
  window.toggleAudio = toggleAudio;
}

// Alternar estado de mudo/som
function toggleAudio() {
  isMusicMuted = !isMusicMuted;

  // Aplicar volume a todos os sons
  Object.values(sounds).forEach(sound => {
    sound.volume = isMusicMuted ? 0 : 0.5;
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

export { sounds, setupAudio, toggleAudio, playBackgroundMusic };