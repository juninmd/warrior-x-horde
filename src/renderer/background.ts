
export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawVerticalRoad(ctx);
}

function drawVerticalRoad(ctx: CanvasRenderingContext2D): void {
  const roadWidth = ctx.canvas.width;
  const roadX = (ctx.canvas.width - roadWidth) / 1;

  ctx.fillStyle = "black";
  ctx.fillRect(roadX, 0, roadWidth, ctx.canvas.height);

  ctx.strokeStyle = "#ecf0f1";
  ctx.lineWidth = 8;
  for (let i = 0; i < ctx.canvas.height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(roadX + roadWidth / 2 - 1, i);
    ctx.lineTo(roadX + roadWidth / 2 - 1, i + 20);
    ctx.stroke();
  }
}
