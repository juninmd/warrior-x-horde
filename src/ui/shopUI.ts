import { GameState, Entities, Player, Upgrade } from '../types';
import { upgrades } from '../upgrades';

export function drawShopUI(ctx: CanvasRenderingContext2D, entities: Entities, gameState: GameState): void {
  const shopWidth = 400;
  const shopHeight = 500;
  const shopX = (ctx.canvas.width / 2) - (shopWidth / 2);
  const shopY = (ctx.canvas.height / 2) - (shopHeight / 2);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(shopX, shopY, shopWidth, shopHeight);

  // Border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(shopX, shopY, shopWidth, shopHeight);

  // Title
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Upgrade Shop', shopX + shopWidth / 2, shopY + 40);

  // Coins display
  ctx.font = '20px Arial';
  ctx.fillText(`Coins: ${gameState.coins}`, shopX + shopWidth / 2, shopY + 80);

  // Upgrades list
  let startY = shopY + 120;
  upgrades.forEach(upgrade => {
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${upgrade.name} (Lv ${upgrade.level}/${upgrade.maxLevel})`, shopX + 20, startY);
    ctx.fillText(`Cost: ${upgrade.cost} Coins`, shopX + 20, startY + 20);
    ctx.fillText(upgrade.description, shopX + 20, startY + 40);

    // Buy button
    const buttonX = shopX + shopWidth - 100;
    const buttonY = startY - 15;
    const buttonWidth = 80;
    const buttonHeight = 30;

    ctx.fillStyle = (gameState.coins >= upgrade.cost && upgrade.level < upgrade.maxLevel) ? 'green' : 'gray';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.strokeStyle = 'white';
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Buy', buttonX + buttonWidth / 2, buttonY + 20);

    startY += 70;
  });

  // Close button
  const closeButtonX = shopX + shopWidth - 40;
  const closeButtonY = shopY + 10;
  ctx.fillStyle = 'red';
  ctx.fillRect(closeButtonX, closeButtonY, 30, 30);
  ctx.strokeStyle = 'white';
  ctx.strokeRect(closeButtonX, closeButtonY, 30, 30);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('X', closeButtonX + 15, closeButtonY + 22);
}

export function handleShopClick(e: MouseEvent, entities: Entities, gameState: GameState): void {
  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const shopWidth = 400;
  const shopHeight = 500;
  const shopX = (rect.width / 2) - (shopWidth / 2);
  const shopY = (rect.height / 2) - (shopHeight / 2);

  // Check close button
  const closeButtonX = shopX + shopWidth - 40;
  const closeButtonY = shopY + 10;
  if (x > closeButtonX && x < closeButtonX + 30 && y > closeButtonY && y < closeButtonY + 30) {
    gameState.isShopOpen = false;
    return;
  }

  // Check buy buttons
  let startY = shopY + 120;
  upgrades.forEach(upgrade => {
    const buttonX = shopX + shopWidth - 100;
    const buttonY = startY - 15;
    const buttonWidth = 80;
    const buttonHeight = 30;

    if (x > buttonX && x < buttonX + buttonWidth && y > buttonY && y < buttonY + buttonHeight) {
      if (gameState.coins >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
        gameState.coins -= upgrade.cost;
        upgrade.level++;
        upgrade.applyEffect(entities.allies[0], gameState); // Apply effect to main player
        // For reinforcement HP, you might need to update existing reinforcements or apply to new ones.
        // For now, we apply to the main player for simplicity.
        upgrade.cost = Math.floor(upgrade.cost * 1.5); // Increase cost for next level
      }
    }
    startY += 70;
  });
}
