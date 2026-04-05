import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B11, DEFAULT_FADE_MS } from '../../Constants';
import { drawShade } from '../../ShadeSystem';
import { ClickQuote } from '../../DialogueSystem';
import { TitleScene } from '../TitleScene';
import { getTextureImage } from '../../Textures';

const SCENE_WIDTH = 2000;
const FLOOR_Y = 610;

interface PressingShade {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  phase: number;
}

export class ReturnToShipScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  endingStarted = false;
  pressers: PressingShade[] = [];
  crowdDarkness = 0;

  // Opening panic quote (click-through)
  panicQuote = new ClickQuote(
    'Then pale fear seized me, thinking that Persephone might send up from Hades the head of the Gorgon, the terrible monster. I turned back at once to the ship and told my companions to untie the stern cables.',
    '#d4b96a', 13, 700
  );

  // Ending sequence — click-through quotes
  endingQuotes: ClickQuote[] = [];
  endingIndex = 0;
  awaitingFinalInput = false;

  onEnter() {
    this.player = new Player(
      this.engine,
      1920, FLOOR_Y, 'left',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.player.gravityFactor = 1.0;
    this.player.frozen = true; // frozen during opening quote
    this.engine.camera.x = SCENE_WIDTH - 1280;

    for (let i = 0; i < 40; i++) {
      this.pressers.push({
        x: 1920 + 60 + Math.random() * 600,
        y: FLOOR_Y - 20 - Math.random() * 80,
        speed: 55 + Math.random() * 30,
        opacity: 0.2 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.endingQuotes = [
      new ClickQuote(
        'The current of Oceanus bore our ship along, first with our rowing, then with a fair wind.',
        '#d4b96a', 14, 680
      ),
      new ClickQuote(
        'He has been to the land of the dead and returned. He knows now what he must do. He is going home.',
        '#a09070', 15, 700
      ),
    ];
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    // Opening panic quote
    if (!this.panicQuote.dismissed) {
      this.panicQuote.update(dt, inp);
      if (this.panicQuote.dismissed) this.player.frozen = false;
      return;
    }

    if (!this.endingStarted) {
      this.player.update(dt);

      // Gravity is now consistent with overworld (1.0)
      this.player.gravityFactor = 1.0;

      const targetX = Math.max(0, Math.min(this.player.x - 640, SCENE_WIDTH - 1280));
      this.engine.camera.x += (targetX - this.engine.camera.x) * 5 * dt;

      // Move pressing shades toward player
      for (const s of this.pressers) {
        const dir = this.player.x - s.x;
        s.x += (dir > 0 ? -1 : 1) * -s.speed * dt;
        s.y = FLOOR_Y - 20 + Math.sin(this.time + s.phase) * 15;
      }

      // Crowd darkness
      const nearby = this.pressers.filter(s => s.x > this.player.x && s.x < this.player.x + 200).length;
      const targetDark = Math.min(nearby / 15, 0.65);
      this.crowdDarkness += (targetDark - this.crowdDarkness) * 3 * dt;

      if (this.player.x <= 100) {
        this.endingStarted = true;
        this.player.frozen = true;
        this.player.gravityFactor = 1.0;
      }
    } else {
      // Ending sequence — click through quotes
      for (const s of this.pressers) {
        s.opacity = Math.max(0, s.opacity - dt * 0.4);
      }

      if (this.endingIndex < this.endingQuotes.length) {
        const q = this.endingQuotes[this.endingIndex];
        q.update(dt, inp);
        if (q.dismissed) this.endingIndex++;
      } else if (!this.awaitingFinalInput) {
        this.awaitingFinalInput = true;
      } else {
        // Wait for final Space/Enter
        if (this.engine.input.isDown(['Space', 'Enter'])) {
          this.engine.globalState.axesThreaded = 0;
          this.engine.globalState.arrowsFired = 0;
          this.engine.globalState.trialActive = false;
          this.engine.globalState.hasBow = false;
          this.engine.globalState.trialCompleted = false;
          this.engine.switchScene(new TitleScene(), DEFAULT_FADE_MS);
        }
      }
    }

    for (const a of this.arrows) a.update(dt);
    this.arrows = this.arrows.filter(a => a.active);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Sky: slowly brightening ──────────────────────────────────
    const shipNear = 1 - Math.min(Math.max(this.player.x - 80, 0) / 800, 1);
    const skyR = Math.floor(shipNear * 6);
    const skyG = Math.floor(shipNear * 8);
    const skyB = Math.floor(6 + shipNear * 14);
    ctx.fillStyle = `rgb(${skyR},${skyG},${skyB})`;
    ctx.fillRect(0, 0, 1280, 720);
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 845;
      const moonY = 165;
      const moonSize = 90;
      ctx.save();
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 120);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.3)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.15)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.15;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }

    // Oceanus on left
    if (!this.endingStarted) {
      const distX = this.player.x - 80;
      const seaAlpha = Math.max(0, 1 - distX / 600);
      ctx.globalAlpha = seaAlpha;
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 440, 400, 280);
      ctx.fillStyle = '#0e1020';
      for (let i = 0; i < 8; i++) {
        const wy = 465 + i * 18 + Math.sin(this.time * 0.4 + i) * 2;
        ctx.globalAlpha = seaAlpha * 0.5;
        ctx.fillRect(0, wy, 400, 2);
      }
      ctx.globalAlpha = 1;
    }

    // ── Ground ───────────────────────────────────────────────────
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 130);

    // ── Pressing shades ──────────────────────────────────────────
    for (const s of this.pressers) {
      if (s.opacity <= 0.02) continue;
      drawShade(ctx, { x: s.x, y: s.y, height: 48, width: 12, color: B11.shade_faint, opacity: s.opacity });
    }

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);

    // ── Crowd darkness ───────────────────────────────────────────
    if (this.crowdDarkness > 0.05) {
      ctx.fillStyle = B11.erebus_black;
      ctx.globalAlpha = this.crowdDarkness;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = 1;
      if (this.crowdDarkness > 0.4) {
        ctx.save();
        ctx.translate(camX, 0);
        ctx.fillStyle = B11.shade_body;
        ctx.font = 'italic 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = (this.crowdDarkness - 0.4) / 0.25;
        ctx.fillText('Keep moving — do not let them surround you', 640 + camX, 380);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    // ── Overlays (camera-fixed) ──────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);

    // Opening panic quote
    if (!this.panicQuote.dismissed) {
      this.panicQuote.draw(ctx, 640 + camX, 280);
    }

    // Ending quotes
    if (this.endingStarted && this.endingIndex < this.endingQuotes.length) {
      this.endingQuotes[this.endingIndex].draw(ctx, 640 + camX, 300);
    }

    // Final prompt
    if (this.awaitingFinalInput) {
      const blink = Math.sin(Date.now() / 400) > 0;
      if (blink) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#686050';
        ctx.font = '11px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Space to begin again', 640 + camX, 400);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
