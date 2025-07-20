
import { Player } from '../types';

const COLORS = {
  shield: "rgba(0, 200, 255, 0.5)",
  player: "blue",
};

export function drawAllies(ctx: CanvasRenderingContext2D, allies: Player[]): void {
  allies.forEach(ally => {
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(ally.x, ally.y, ally.width, ally.height);
    if (ally.shield > 0) {
      ctx.beginPath();
      ctx.arc(ally.x + ally.width / 2, ally.y + ally.height / 2, 40, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.shield;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });
}
