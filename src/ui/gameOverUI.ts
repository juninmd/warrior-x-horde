import { GameState } from '../types';

const COLORS = {
  text: "white",
};

export function drawGameOver(ctx: CanvasRenderingContext2D, gameState: GameState): void {
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

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('highScore', gameState.highScore.toString());
  }
}
