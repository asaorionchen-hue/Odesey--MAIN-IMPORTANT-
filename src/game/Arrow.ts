import { PALETTE } from './Constants';

export class Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime = 0;
  active = true;

  constructor(x: number, y: number, vx: number, vy: number) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }

  update(dt: number) {
    if (!this.active) return;
    // this.vy += 120 * dt; // Gravity removed to allow straight shots through axes
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime += dt;
    if (this.lifetime > 4.0) this.active = false;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    
    // Arrow shaft
    ctx.fillStyle = "#8a6830";
    ctx.fillRect(-10, -1.5, 20, 3);
    
    // Tip
    ctx.fillStyle = "#4a3820";
    ctx.beginPath();
    ctx.moveTo(10, -2.5);
    ctx.lineTo(14, 0);
    ctx.lineTo(10, 2.5);
    ctx.fill();
    
    // Fletching
    ctx.fillStyle = "#6a5828";
    ctx.fillRect(-12, -2.5, 4, 5);
    
    ctx.restore();
  }
}
