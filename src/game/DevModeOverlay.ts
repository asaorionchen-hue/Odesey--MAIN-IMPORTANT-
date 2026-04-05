import { GameEngine } from '../engine/GameEngine';
import { DEV_SCENES, DevSceneEntry } from './DevSceneRegistry';
import { PALETTE } from './Constants';

const COLS = 4;
const CARD_W = 240;
const CARD_H = 135;
const GAP = 20;
const MARGIN_X = (1280 - (COLS * CARD_W + (COLS - 1) * GAP)) / 2;
const HEADER_H = 70;
const MARGIN_TOP = HEADER_H + 16;

export class DevModeOverlay {
  visible = false;
  scrollY = 0;
  maxScrollY = 0;
  hoveredIndex = -1;

  thumbnails: Map<number, HTMLCanvasElement> = new Map();
  loadingIndices: Set<number> = new Set();
  loadedAll = false;

  // Smooth scroll
  targetScrollY = 0;

  open() {
    this.visible = true;
    this.scrollY = 0;
    this.targetScrollY = 0;
    this.hoveredIndex = -1;

    // Calculate max scroll
    const rows = Math.ceil(DEV_SCENES.length / COLS);
    const contentH = MARGIN_TOP + rows * (CARD_H + GAP) + 40;
    this.maxScrollY = Math.max(0, contentH - 720);

    // Start generating thumbnails if not done
    if (!this.loadedAll) {
      this.generateThumbnails();
    }
  }

  close() {
    this.visible = false;
  }

  private async generateThumbnails() {
    // Create a hidden offscreen canvas + engine to render thumbnails
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1280;
    offCanvas.height = 720;
    const offEngine = new GameEngine(offCanvas);

    for (let i = 0; i < DEV_SCENES.length; i++) {
      if (this.thumbnails.has(i)) continue;
      this.loadingIndices.add(i);

      try {
        const entry = DEV_SCENES[i];
        const scene = await entry.factory();
        scene.engine = offEngine;
        offEngine.currentScene = scene;
        offEngine.camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
        offEngine.transitionState = 'none';

        // Call onEnter and run a brief update
        scene.onEnter();
        scene.update(0.016);

        // Render
        const offCtx = offCanvas.getContext('2d')!;
        offCtx.clearRect(0, 0, 1280, 720);
        offCtx.save();
        offCtx.translate(-offEngine.camera.x, -offEngine.camera.y);
        scene.draw(offCtx);
        offCtx.restore();

        // Scale down to thumbnail
        const thumb = document.createElement('canvas');
        thumb.width = CARD_W;
        thumb.height = CARD_H;
        const tCtx = thumb.getContext('2d')!;
        tCtx.imageSmoothingEnabled = false;
        tCtx.drawImage(offCanvas, 0, 0, 1280, 720, 0, 0, CARD_W, CARD_H);

        this.thumbnails.set(i, thumb);
      } catch (e) {
        console.warn(`Failed to capture thumbnail for scene ${i}:`, e);
      }

      this.loadingIndices.delete(i);
    }

    this.loadedAll = true;
  }

  update(dt: number, engine: GameEngine): boolean {
    if (!this.visible) return false;

    // Smooth scroll interpolation
    this.scrollY += (this.targetScrollY - this.scrollY) * Math.min(1, dt * 12);

    const mx = engine.input.mouse.x;
    const my = engine.input.mouse.y;

    // Escape to close
    if (engine.input.isDown(['Escape'])) {
      engine.input.keys['Escape'] = false;
      this.close();
      return true;
    }

    // Mouse wheel scrolling
    if (engine.input.wheelDelta) {
      this.targetScrollY += engine.input.wheelDelta;
      this.targetScrollY = Math.max(0, Math.min(this.maxScrollY, this.targetScrollY));
      engine.input.wheelDelta = 0;
    }

    // Arrow key scrolling
    if (engine.input.isDown(['ArrowDown'])) {
      this.targetScrollY = Math.min(this.maxScrollY, this.targetScrollY + 200 * dt);
    }
    if (engine.input.isDown(['ArrowUp'])) {
      this.targetScrollY = Math.max(0, this.targetScrollY - 200 * dt);
    }

    // Close button hit test (top-right)
    const closeBtnX = 1280 - 80;
    const closeBtnY = 20;
    if (engine.input.mouse.left) {
      if (mx >= closeBtnX && mx <= closeBtnX + 60 && my >= closeBtnY && my <= closeBtnY + 32) {
        this.close();
        engine.input.consumeMouse();
        return true;
      }
    }

    // Card hit-testing
    this.hoveredIndex = -1;
    for (let i = 0; i < DEV_SCENES.length; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = MARGIN_X + col * (CARD_W + GAP);
      const cy = MARGIN_TOP + row * (CARD_H + GAP) - this.scrollY;

      if (mx >= cx && mx <= cx + CARD_W && my >= cy && my <= cy + CARD_H + 28) {
        this.hoveredIndex = i;

        if (engine.input.mouse.left) {
          engine.input.consumeMouse();
          const entry = DEV_SCENES[i];
          entry.factory().then((scene) => {
            engine.switchScene(scene, 600);
            this.close();
          });
          return true;
        }
      }
    }

    return true; // consume all input while overlay is open
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;

    // Dark background
    ctx.fillStyle = 'rgba(2, 2, 8, 0.92)';
    ctx.fillRect(0, 0, 1280, 720);

    // Header
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = PALETTE.amber_gold;
    ctx.fillText('SCENE SELECTOR', 640, 40);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#686050';
    ctx.fillText('DEV MODE  ·  Click a scene to jump directly', 640, 62);

    // Close button
    const closeBtnX = 1280 - 80;
    const closeBtnY = 20;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a7a5a';
    ctx.fillText('✕ CLOSE', closeBtnX + 30, closeBtnY + 16);

    // Clip for cards area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, HEADER_H, 1280, 720 - HEADER_H);
    ctx.clip();

    // Draw cards
    for (let i = 0; i < DEV_SCENES.length; i++) {
      const entry = DEV_SCENES[i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = MARGIN_X + col * (CARD_W + GAP);
      const cy = MARGIN_TOP + row * (CARD_H + GAP) - this.scrollY;

      // Skip if off-screen
      if (cy + CARD_H + 30 < HEADER_H || cy > 720) continue;

      const hovered = this.hoveredIndex === i;

      // Hover glow
      if (hovered) {
        ctx.shadowColor = entry.color;
        ctx.shadowBlur = 18;
      }

      // Card background (dark)
      ctx.fillStyle = hovered ? '#1a1a28' : '#0e0e18';
      ctx.fillRect(cx, cy, CARD_W, CARD_H);

      // Border
      ctx.strokeStyle = hovered ? entry.color : '#2a2a3a';
      ctx.lineWidth = hovered ? 2 : 1;
      ctx.strokeRect(cx, cy, CARD_W, CARD_H);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Thumbnail or loading placeholder
      const thumb = this.thumbnails.get(i);
      if (thumb) {
        ctx.drawImage(thumb, cx, cy, CARD_W, CARD_H);

        // Subtle darkening overlay so text below reads well
        if (!hovered) {
          ctx.fillStyle = 'rgba(4, 4, 12, 0.25)';
          ctx.fillRect(cx, cy, CARD_W, CARD_H);
        }
      } else {
        // Loading shimmer
        const shimmer = 0.3 + 0.15 * Math.sin(Date.now() / 400 + i);
        ctx.fillStyle = `rgba(40, 40, 60, ${shimmer})`;
        ctx.fillRect(cx, cy, CARD_W, CARD_H);
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4a4a5a';
        ctx.fillText('Loading...', cx + CARD_W / 2, cy + CARD_H / 2);
      }

      // Label area below thumbnail
      const labelY = cy + CARD_H + 4;

      // Scene name
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = hovered ? '#ffffff' : '#c0b8a0';
      ctx.fillText(entry.name, cx + 4, labelY + 8);

      // Book label
      ctx.textAlign = 'right';
      ctx.font = '10px sans-serif';
      ctx.fillStyle = entry.color;
      ctx.globalAlpha = hovered ? 1.0 : 0.6;
      ctx.fillText(entry.book, cx + CARD_W - 4, labelY + 8);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();

    // Scroll indicator
    if (this.maxScrollY > 0) {
      const scrollPct = this.scrollY / this.maxScrollY;
      const trackH = 720 - HEADER_H - 40;
      const thumbH = Math.max(30, trackH * (720 / (720 + this.maxScrollY)));
      const thumbY = HEADER_H + 20 + scrollPct * (trackH - thumbH);

      ctx.fillStyle = 'rgba(100, 90, 70, 0.3)';
      ctx.fillRect(1268, HEADER_H + 20, 4, trackH);
      ctx.fillStyle = 'rgba(180, 160, 120, 0.5)';
      ctx.fillRect(1268, thumbY, 4, thumbH);
    }
  }
}
