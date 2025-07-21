


interface ActiveBuff {
  id: string;
  name: string;
  endTime: number;
  x: number;
  y: number;
  speedY: number;
  color: string;
}

const activeBuffs: ActiveBuff[] = [];
const BUFF_DISPLAY_DURATION = 3000; // 3 seconds
const BUFF_START_X_OFFSET = 50; // Starting X position from left edge
const BUFF_START_Y = 100; // Starting Y position for the first buff
const BUFF_LINE_HEIGHT = 30; // Space between buffs
const BUFF_SCROLL_SPEED = 0.05; // Pixels per millisecond

export function addBuff(name: string, color: string = 'yellow'): void {
  const newBuff: ActiveBuff = {
    id: `buff-${Date.now()}-${Math.random()}`,
    name: name,
    endTime: Date.now() + BUFF_DISPLAY_DURATION,
    x: BUFF_START_X_OFFSET,
    y: BUFF_START_Y + activeBuffs.length * BUFF_LINE_HEIGHT, // Initial Y based on existing buffs
    speedY: BUFF_SCROLL_SPEED,
    color: color,
  };
  activeBuffs.push(newBuff);
}

export function updateBuffs(deltaTime: number): void {
  for (let i = activeBuffs.length - 1; i >= 0; i--) {
    const buff = activeBuffs[i];
    buff.y -= buff.speedY * deltaTime; // Move buff upwards

    if (Date.now() > buff.endTime) {
      activeBuffs.splice(i, 1); // Remove expired buff
    }
  }
}

export function drawBuffs(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 5;

  activeBuffs.forEach(buff => {
    ctx.fillStyle = buff.color;
    ctx.fillText(buff.name, buff.x, buff.y);
  });

  ctx.restore();
}
