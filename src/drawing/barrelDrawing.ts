
import { barrelSprites } from '../sprites.js';
import { Barrel } from '../types';

const COLORS = {
  text: "white",
};

export function drawBarrels(ctx: CanvasRenderingContext2D, barrels: Barrel[]): void {
  barrels.forEach(barrel => {
    const sprite = barrelSprites[barrel.barrelType];
    if (!sprite) throw new Error(`Sprite not found for barrel type: ${barrel.barrelType}`);
    ctx.drawImage(sprite, barrel.x, barrel.y, barrel.width, barrel.height);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`HP: ${barrel.hp}`, barrel.x + barrel.width / 2, barrel.y + 40);
  });
}
