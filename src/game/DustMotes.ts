/**
 * Ambient dust motes / floating particles.
 *
 * Instantiate in a scene, call update(dt) and draw(ctx, camX).
 * Particles drift slowly upward with gentle sine sway.
 */
export class DustMotes {
  particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    phase: number;
    life: number;
    maxLife: number;
    alpha: number;
  }[] = [];

  private sceneWidth: number;
  private sceneHeight: number;
  private count: number;
  private color: string;
  private maxSize: number;
  private speed: number;

  constructor(opts: {
    sceneWidth?: number;
    sceneHeight?: number;
    count?: number;
    color?: string;
    maxSize?: number;
    speed?: number;
  } = {}) {
    this.sceneWidth = opts.sceneWidth ?? 1280;
    this.sceneHeight = opts.sceneHeight ?? 720;
    this.count = opts.count ?? 40;
    this.color = opts.color ?? '200, 195, 180';   // warm dust RGB
    this.maxSize = opts.maxSize ?? 2.5;
    this.speed = opts.speed ?? 1.0;

    // Pre-populate so particles are already visible on scene enter
    for (let i = 0; i < this.count; i++) {
      this.particles.push(this.spawn(true));
    }
  }

  private spawn(randomLife = false) {
    const maxLife = 4 + Math.random() * 6;
    return {
      x: Math.random() * this.sceneWidth,
      y: Math.random() * this.sceneHeight,
      vx: (Math.random() - 0.5) * 8 * this.speed,
      vy: -(5 + Math.random() * 12) * this.speed,
      size: 0.5 + Math.random() * this.maxSize,
      phase: Math.random() * Math.PI * 2,
      life: randomLife ? Math.random() * maxLife : 0,
      maxLife,
      alpha: 0,
    };
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt + Math.sin(p.life * 1.2 + p.phase) * 6 * dt;
      p.y += p.vy * dt;

      // Fade in first 20%, fade out last 20%
      const t = p.life / p.maxLife;
      if (t < 0.2) {
        p.alpha = t / 0.2;
      } else if (t > 0.8) {
        p.alpha = (1 - t) / 0.2;
      } else {
        p.alpha = 1;
      }

      if (p.life >= p.maxLife) {
        this.particles[i] = this.spawn();
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camX = 0) {
    const viewLeft = camX - 40;
    const viewRight = camX + 1280 + 40;

    for (const p of this.particles) {
      if (p.x < viewLeft || p.x > viewRight) continue;
      ctx.globalAlpha = p.alpha * 0.35;
      ctx.fillStyle = `rgb(${this.color})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}
