import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B12 } from '../../Constants';
import { getTextureImage } from '../../Textures';

const SCENE_WIDTH = 2560;
const DECK_Y = 560;

export class StraitApproachScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  shipX = 200;

  // Mast binding
  bindingPhase: 'free' | 'prompt' | 'bound' | 'released' = 'free';
  boundTimer = 0;
  bindingTilt = 0;

  // Siren visual
  sirenMouthOpen = 0;

  onEnter() {
    this.player = new Player(
      this.engine, 400, DECK_Y - 60, 'right',
      () => DECK_Y - 60,
      (a) => this.arrows.push(a)
    );
    this.engine.camera.x = 0;
  }

  update(dt: number) {
    this.time += dt;

    // Ship moves forward
    if (this.bindingPhase !== 'bound') {
      this.shipX += 40 * dt;
    } else {
      this.shipX += 60 * dt; // faster when bound (crew focuses on rowing)
    }

    // Camera follows ship
    this.engine.camera.x = Math.max(0, this.shipX - 200);

    // Siren mouth animation
    this.sirenMouthOpen = (Math.sin(this.time * 0.6 * Math.PI * 2) + 1) / 2;

    // Mast binding mechanic
    if (this.bindingPhase === 'free' && this.shipX >= 600) {
      this.bindingPhase = 'prompt';
    }

    if (this.bindingPhase === 'prompt') {
      // Player must walk to mast and press interact
      this.player.update(dt);
      // Constrain to ship
      this.player.x = Math.max(this.shipX + 20, Math.min(this.player.x, this.shipX + 460));
      this.player.y = DECK_Y - 60;

      const mastWorldX = this.shipX + 180;
      if (Math.abs(this.player.x - mastWorldX) < 30 && this.engine.input.isDown(['KeyE', 'Space', 'Enter'])) {
        this.bindingPhase = 'bound';
        this.boundTimer = 0;
        this.player.frozen = true;
        this.player.x = mastWorldX;
        this.engine.input.keys['KeyE'] = false;
        this.engine.input.keys['Space'] = false;
      }
    }

    if (this.bindingPhase === 'bound') {
      this.boundTimer += dt * 1000;
      this.player.x = this.shipX + 180;
      this.player.y = DECK_Y - 60;

      // Tilt toward sirens
      const sirenDist = Math.abs(this.shipX + 180 - 800);
      const maxTilt = 12;
      this.bindingTilt = maxTilt * Math.max(0, 1 - sirenDist / 600);

      if (this.boundTimer >= 18000) {
        this.bindingPhase = 'released';
        this.player.frozen = false;
      }
    }

    if (this.bindingPhase === 'released') {
      this.player.update(dt);
      this.player.x = Math.max(this.shipX + 20, Math.min(this.player.x, this.shipX + 460));
      this.player.y = DECK_Y - 60;
    }

    // Transition
    if (this.shipX >= 2400 && this.engine.transitionState === 'none') {
      import('./ScyllaPassageScene').then(({ ScyllaPassageScene }) => {
        this.engine.switchScene(new ScyllaPassageScene(), 400);
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Sea ──────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    ctx.fillStyle = '#0a1828';
    ctx.fillRect(0, 0, 1280, 720);
    // Waves
    for (let i = 0; i < 12; i++) {
      const wy = 400 + i * 25;
      ctx.fillStyle = i % 2 === 0 ? '#0e2030' : '#0a1828';
      const waveOff = Math.sin(this.time * 0.8 * Math.PI * 2 + i * 0.5) * 5;
      ctx.fillRect(0, wy + waveOff, 1280, 15);
    }
    
    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 200;
      const moonY = 100;
      const moonSize = 80;
      ctx.save();
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 120);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }
    
    ctx.restore();

    // ── Siren Island ─────────────────────────────────────────────
    const sx = 800, sy = 200;
    ctx.fillStyle = '#1a1010';
    ctx.beginPath();
    ctx.moveTo(sx - 100, sy + 180);
    ctx.lineTo(sx - 60, sy + 40);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + 60, sy + 50);
    ctx.lineTo(sx + 100, sy + 180);
    ctx.fill();
    // Meadow
    ctx.fillStyle = '#2a3a1a';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 120, 80, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bone piles
    ctx.fillStyle = '#c8c0a8';
    for (let bi = 0; bi < 8; bi++) {
      const bx = sx - 60 + bi * 16;
      const by = sy + 140 + Math.sin(bi * 3) * 10;
      ctx.fillRect(bx, by, 4, 6);
      ctx.fillRect(bx + 2, by - 3, 2, 4);
    }

    // Siren figures
    const sirenPositions = [{ x: sx - 20, y: sy + 100 }, { x: sx + 20, y: sy + 95 }];
    for (const sp of sirenPositions) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = B12.siren_glow;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 10, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = B12.siren_color;
      ctx.fillRect(sp.x - 4, sp.y - 20, 8, 20);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y - 24, 5, 0, Math.PI * 2);
      ctx.fill();
      // Mouth
      ctx.fillStyle = '#2a1020';
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y - 22, 2, 1 + this.sirenMouthOpen * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Song arcs
    ctx.strokeStyle = B12.song_arc;
    ctx.lineWidth = 1;
    for (let ai = 0; ai < 4; ai++) {
      const r = 40 + ai * 60 + Math.sin(this.time * 0.4 * Math.PI * 2 + ai) * 20;
      ctx.globalAlpha = 0.15 * (1 - ai * 0.2);
      ctx.beginPath();
      ctx.arc(sx, sy + 100, r, -0.6, 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Ship ─────────────────────────────────────────────────────
    const shipDrawX = this.shipX;
    // Hull
    ctx.fillStyle = '#2a1808';
    ctx.beginPath();
    ctx.moveTo(shipDrawX, DECK_Y);
    ctx.lineTo(shipDrawX + 40, DECK_Y + 60);
    ctx.lineTo(shipDrawX + 440, DECK_Y + 60);
    ctx.lineTo(shipDrawX + 480, DECK_Y);
    ctx.fill();
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(shipDrawX + 20, DECK_Y - 6, 440, 6);

    // Oars
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 2;
    for (let oi = 0; oi < 8; oi++) {
      const ox = shipDrawX + 40 + oi * 50;
      const rowAngle = Math.sin(this.time * 0.5 * Math.PI * 2 + oi * 0.3) * 0.4;
      ctx.save();
      ctx.translate(ox, DECK_Y + 30);
      ctx.rotate(0.3 + rowAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 60);
      ctx.stroke();
      ctx.restore();
    }

    // Mast
    const mastX = shipDrawX + 180;
    ctx.fillStyle = '#4a3018';
    ctx.fillRect(mastX - 4, DECK_Y - 160, 8, 160);

    // Rope binding visual
    if (this.bindingPhase === 'bound') {
      ctx.strokeStyle = '#8a6a40';
      ctx.lineWidth = 2;
      for (let ri = 0; ri < 4; ri++) {
        const ry = DECK_Y - 90 + ri * 16;
        ctx.beginPath();
        ctx.moveTo(mastX - 12, ry);
        ctx.lineTo(mastX + 12, ry);
        ctx.stroke();
      }
    }

    // ── Player (with tilt when bound) ────────────────────────────
    ctx.save();
    if (this.bindingPhase === 'bound') {
      ctx.translate(this.player.x, this.player.y);
      ctx.rotate((this.bindingTilt * Math.PI) / 180);
      ctx.translate(-this.player.x, -this.player.y);
    }
    this.player.draw(ctx);
    ctx.restore();

    // ── Prompt ───────────────────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    if (this.bindingPhase === 'prompt') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(440 + camX, 20, 400, 36);
      ctx.fillStyle = '#c8b080';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('WALK TO THE MAST AND PRESS E', 640 + camX, 38);
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
