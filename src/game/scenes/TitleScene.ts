import { Scene } from '../../engine/GameEngine';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { ApproachScene } from './ApproachScene';
import { CimmerianShoreScene } from './book11/CimmerianShoreScene';
import { OgygiaShoreScene } from './book5/OgygiaShoreScene';
import { CirceWarningScene } from './book12/CirceWarningScene';
import { getTextureImage } from '../Textures';
import { DevModeOverlay } from '../DevModeOverlay';

export class TitleScene extends Scene {
  time = 0;
  selectedIndex = 0;
  state: 'main' | 'credits' = 'main';
  static readonly MENU_Y = [400, 438, 476, 514, 552];

  devOverlay = new DevModeOverlay();

  stars: { x: number, y: number, size: number, phase: number }[] = [];

  constructor() {
    super();
    for (let i = 0; i < 220; i++) {
      this.stars.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        size: Math.random() > 0.8 ? 2 : 1,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt: number) {
    this.time += dt;

    // Dev overlay takes priority when visible
    if (this.devOverlay.visible) {
      this.devOverlay.update(dt, this.engine);
      return;
    }

    if (this.state === 'credits') {
      if (this.engine.input.isDown(['Escape'])) {
        this.state = 'main';
        this.engine.input.keys['Escape'] = false; // consume
      }
      // Return button click (centered, y=680, 160×36)
      const mx = this.engine.input.mouse.x;
      const my = this.engine.input.mouse.y;
      if (this.engine.input.mouse.left) {
        if (mx >= 640 - 80 && mx <= 640 + 80 && my >= 680 - 18 && my <= 680 + 18) {
          this.state = 'main';
          this.engine.input.consumeMouse();
        }
      }
      return;
    }

    // Keyboard navigation
    if (this.engine.input.isDown(['ArrowUp', 'KeyW'])) {
      this.selectedIndex = (this.selectedIndex - 1 + TitleScene.MENU_Y.length) % TitleScene.MENU_Y.length;
      this.engine.input.keys['ArrowUp'] = false;
      this.engine.input.keys['KeyW'] = false;
    }
    if (this.engine.input.isDown(['ArrowDown', 'KeyS'])) {
      this.selectedIndex = (this.selectedIndex + 1) % TitleScene.MENU_Y.length;
      this.engine.input.keys['ArrowDown'] = false;
      this.engine.input.keys['KeyS'] = false;
    }

    const confirm = this.engine.input.isDown(['Enter', 'Space', 'KeyE']);
    if (confirm) {
      const idx = this.selectedIndex;
      if (idx === 0) this.engine.switchScene(new ApproachScene(), DEFAULT_FADE_MS);
      else if (idx === 1) this.engine.switchScene(new CimmerianShoreScene(), DEFAULT_FADE_MS);
      else if (idx === 2) this.engine.switchScene(new OgygiaShoreScene(), DEFAULT_FADE_MS);
      else if (idx === 3) this.engine.switchScene(new CirceWarningScene(), DEFAULT_FADE_MS);
      else if (idx === 4) this.state = 'credits';
      
      this.engine.input.keys['Enter'] = false;
      this.engine.input.keys['Space'] = false;
      this.engine.input.keys['KeyE'] = false;
    }

    // Button clicks
    if (this.engine.transitionState === 'none') {
      const mx = this.engine.input.mouse.x;
      const my = this.engine.input.mouse.y;
      const clicked = this.engine.input.mouse.left;

      // Update selectedIndex on hover
      for (let i = 0; i < TitleScene.MENU_Y.length; i++) {
        const y = TitleScene.MENU_Y[i];
        if (Math.abs(mx - 640) < 180 && Math.abs(my - y) < 18) {
          this.selectedIndex = i;
          if (clicked) {
            if (i === 0) this.engine.switchScene(new ApproachScene(), DEFAULT_FADE_MS);
            else if (i === 1) this.engine.switchScene(new CimmerianShoreScene(), DEFAULT_FADE_MS);
            else if (i === 2) this.engine.switchScene(new OgygiaShoreScene(), DEFAULT_FADE_MS);
            else if (i === 3) this.engine.switchScene(new CirceWarningScene(), DEFAULT_FADE_MS);
            else if (i === 4) this.state = 'credits';
            this.engine.input.consumeMouse();
          }
        }
      }
    }

    // DEV button (bottom-left)
    if (this.engine.transitionState === 'none') {
      const mx = this.engine.input.mouse.x;
      const my = this.engine.input.mouse.y;
      if (this.engine.input.mouse.left) {
        if (mx >= 10 && mx <= 54 && my >= 694 && my <= 714) {
          this.devOverlay.open();
          this.engine.input.consumeMouse();
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, PALETTE.void);
    grad.addColorStop(1, PALETTE.sky_mid);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Stars
    ctx.fillStyle = PALETTE.star_color;
    for (const star of this.stars) {
      const alpha = 0.5 + 0.5 * Math.sin(this.time * 2 + star.phase);
      ctx.globalAlpha = alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;

    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    const moonX = 200;
    const moonY = 120;
    if (moonImg) {
      ctx.save();
      const moonSize = 90;
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 130);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 130, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    } else {
      // Enhanced Moon glow for fallback
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 130);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = PALETTE.moon_bright;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.sky_deep;
      ctx.beginPath();
      ctx.arc(moonX + 12, moonY - 4, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sea
    ctx.fillStyle = PALETTE.sea_dark;
    ctx.fillRect(0, 560, 1280, 160);

    ctx.fillStyle = PALETTE.sea_mid;
    for (let i = 0; i < 10; i++) {
      const y = 580 + i * 15;
      ctx.fillRect(0, y + Math.sin(this.time * 2 + i) * 2, 1280, 2);
    }

    // Palace
    ctx.fillStyle = '#080610';
    ctx.beginPath();
    const pts = [
      [180, 0], [180, -20], [160, -20], [160, -60], [140, -60], [140, -40],
      [120, -40], [120, -80], [100, -80], [100, -100], [80, -100], [80, -60],
      [60, -60], [60, -80], [40, -80], [40, -40], [20, -40], [20, -60],
      [0, -60], [0, -20], [-20, -20], [-20, 0]
    ];
    ctx.moveTo(640 + pts[0][0], 560 + pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(640 + pts[i][0], 560 + pts[i][1]);
    }
    ctx.fill();

    // Title text
    if (this.time > 0.8) {
      const alpha = Math.min((this.time - 0.8) / 2.2, 1.0);
      ctx.globalAlpha = alpha;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '72px sans-serif';
      (ctx as any).letterSpacing = '12px';
      ctx.fillStyle = '#2a1a00';
      ctx.fillText('ODYSSEY', 640 + 3, 220 + 3);
      ctx.fillStyle = PALETTE.amber_gold;
      ctx.fillText('ODYSSEY', 640, 220);

      ctx.font = '16px sans-serif';
      (ctx as any).letterSpacing = '3px';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('THE GAME', 640, 220 + 40 + 14);

      ctx.globalAlpha = 1.0;
      (ctx as any).letterSpacing = '0px';
    }

    // Buttons
    if (this.time > 3.2) {
      const alpha = Math.min((this.time - 3.2) / 1.0, 1.0);
      ctx.globalAlpha = alpha;

      const mx = this.engine.input.mouse.x;
      const my = this.engine.input.mouse.y;

      ctx.font = '18px sans-serif';

      const drawBtn = (idx: number, text: string, color: string, hoverColor: string) => {
        const y = TitleScene.MENU_Y[idx];
        const selected = this.selectedIndex === idx;
        ctx.fillStyle = selected ? hoverColor : color;
        ctx.fillText(text, 640, y);

        if (selected) {
          // Selector dots
          ctx.fillStyle = PALETTE.amber_gold;
          ctx.beginPath();
          ctx.arc(640 - 200, y, 3, 0, Math.PI * 2);
          ctx.arc(640 + 200, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      ctx.font = '16px sans-serif';
      drawBtn(0, 'Book XXI  —  The Trial of the Bow', PALETTE.amber_gold, '#ffffff');
      drawBtn(1, 'Book XI  —  The Land of the Dead', '#8080c0', '#c0b8f0');
      drawBtn(2, 'Book V  —  The Island of Ogygia', '#6aaa8a', '#a0e8c0');
      drawBtn(3, 'Book XII  —  The Strait of Terror', '#c07070', '#f0a0a0');
      drawBtn(4, 'Credits', '#a09070', PALETTE.amber_gold);

      ctx.globalAlpha = 1.0;
    }

    // Credits
    if (this.state === 'credits') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, 1280, 720);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = '20px sans-serif';
      ctx.fillStyle = PALETTE.amber_gold;
      ctx.fillText('ODYSSEY', 640, 300);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#a09070';
      ctx.fillText('The Epic Adventure', 640, 330);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#686050';
      ctx.fillText('Based on Homer\'s Odyssey', 640, 370);
      ctx.fillText('Translated by Emily Wilson', 640, 390);

      ctx.fillStyle = '#8a7a5a';
      ctx.fillText('Lead Design & Development: Asa Chen', 640, 420);
      ctx.fillText('Applied Researcher, Tester & Implementation Specialist: Egan Blair', 640, 440);
      ctx.fillText('In-depth Scene Research: Elias Kelly', 640, 460);

      // Return button (fixed to viewport bottom, centered)
      const btnX = 640 - 80;
      const btnY = 680 - 18;
      const btnW = 160;
      const btnH = 36;
      const bmx = this.engine.input.mouse.x;
      const bmy = this.engine.input.mouse.y;
      const hover = bmx >= btnX && bmx <= btnX + btnW && bmy >= btnY && bmy <= btnY + btnH;

      ctx.fillStyle = hover ? '#2a2818' : '#1a1810';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = '#4a4030';
      ctx.lineWidth = 1;
      ctx.strokeRect(btnX, btnY, btnW, btnH);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = hover ? '#ffffff' : '#d4b96a';
      ctx.fillText('Return', 640, 680);
    }

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();

    // DEV button (bottom-left, subtle)
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const dmx = this.engine.input.mouse.x;
    const dmy = this.engine.input.mouse.y;
    const devHover = dmx >= 10 && dmx <= 54 && dmy >= 694 && dmy <= 714;
    ctx.fillStyle = devHover ? '#d4b96a' : '#4a4a5a';
    ctx.globalAlpha = devHover ? 0.8 : 0.35;
    ctx.fillText('DEV', 16, 704);
    ctx.restore();

    // Dev mode overlay
    this.devOverlay.draw(ctx);
  }
}
