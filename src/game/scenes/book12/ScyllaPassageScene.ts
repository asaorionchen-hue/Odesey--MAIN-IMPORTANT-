import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B12 } from '../../Constants';
import { getTextureImage } from '../../Textures';
import { ClickQuote } from '../../DialogueSystem';

const SCENE_WIDTH = 3200;
const DECK_Y = 500;
const FORCED_SPEED = 80;

interface CrewMember {
  id: string; x: number; alive: boolean;
}

interface ScyllaHead {
  triggeredAtX: number; crewId: string; headId: number;
  phase: 'waiting' | 'descending' | 'grabbing' | 'retracting' | 'done';
  timer: number;
  neckY: number;
}

export class ScyllaPassageScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  shipX = 0;

  crew: CrewMember[] = [];
  heads: ScyllaHead[] = [];

  // Whirlpool
  whirlpoolAngle = 0;

  // Narrator quote
  narratorQuote: ClickQuote | null = null;
  narratorShown = false;
  attackCount = 0;

  // No fight flash
  noFightFlash = 0;

  onEnter() {
    this.player = new Player(
      this.engine, 100, DECK_Y - 60, 'right',
      () => DECK_Y - 60,
      (a) => this.arrows.push(a)
    );
    this.player.frozen = false;
    this.engine.camera.x = 0;

    this.crew = [
      { id: 'helmsman_left', x: 40, alive: true },
      { id: 'oarsman_front', x: 120, alive: true },
      { id: 'oarsman_mid_left', x: 200, alive: true },
      { id: 'oarsman_mid_right', x: 280, alive: true },
      { id: 'oarsman_back', x: 360, alive: true },
      { id: 'helmsman_right', x: 440, alive: true },
    ];

    this.heads = [
      { triggeredAtX: 600, crewId: 'helmsman_left', headId: 1, phase: 'waiting', timer: 0, neckY: 0 },
      { triggeredAtX: 900, crewId: 'oarsman_front', headId: 2, phase: 'waiting', timer: 0, neckY: 0 },
      { triggeredAtX: 1200, crewId: 'oarsman_mid_left', headId: 3, phase: 'waiting', timer: 0, neckY: 0 },
      { triggeredAtX: 1500, crewId: 'oarsman_mid_right', headId: 4, phase: 'waiting', timer: 0, neckY: 0 },
      { triggeredAtX: 1800, crewId: 'oarsman_back', headId: 5, phase: 'waiting', timer: 0, neckY: 0 },
      { triggeredAtX: 2100, crewId: 'helmsman_right', headId: 6, phase: 'waiting', timer: 0, neckY: 0 },
    ];

    this.narratorQuote = new ClickQuote(
      'That was the most pitiful sight I ever witnessed in my travels through the seas that men endure.',
      B12.text_quote, 14, 800
    );
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    // Narrator quote
    if (this.narratorShown && this.narratorQuote && !this.narratorQuote.dismissed) {
      this.narratorQuote.update(dt, inp);
    }

    // No fight flash timer
    if (this.noFightFlash > 0) this.noFightFlash -= dt;

    // Block attacks
    if (this.engine.input.isDown(['KeyF', 'KeyX'])) {
      this.noFightFlash = 0.8;
      this.engine.input.keys['KeyF'] = false;
      this.engine.input.keys['KeyX'] = false;
    }

    // Forced scroll
    this.shipX += FORCED_SPEED * dt;
    this.engine.camera.x = this.shipX;

    // Player confined to ship deck
    this.player.update(dt);
    this.player.x = Math.max(this.shipX + 20, Math.min(this.player.x, this.shipX + 460));
    this.player.y = DECK_Y - 60;

    // Whirlpool
    this.whirlpoolAngle += dt * 20;

    // Head attacks
    for (const h of this.heads) {
      if (h.phase === 'waiting' && this.shipX >= h.triggeredAtX) {
        h.phase = 'descending';
        h.timer = 0;
      }

      if (h.phase === 'descending') {
        h.timer += dt;
        h.neckY = Math.min((h.timer / 1.2) * (DECK_Y - 100), DECK_Y - 100);
        if (h.timer >= 1.2) {
          h.phase = 'grabbing';
          h.timer = 0;
          // Flash
          this.engine.shake(3, 150, 20);
        }
      }

      if (h.phase === 'grabbing') {
        h.timer += dt;
        if (h.timer >= 0.4) {
          // Snatch crew
          const crewMember = this.crew.find(c => c.id === h.crewId);
          if (crewMember) crewMember.alive = false;
          h.phase = 'retracting';
          h.timer = 0;
          this.attackCount++;

          if (this.attackCount === 3 && !this.narratorShown) {
            this.narratorShown = true;
          }
        }
      }

      if (h.phase === 'retracting') {
        h.timer += dt;
        h.neckY = Math.max((1 - h.timer / 0.8) * (DECK_Y - 100), 0);
        if (h.timer >= 0.8) {
          h.phase = 'done';
        }
      }
    }

    // Transition
    if (this.shipX >= 3100 && this.engine.transitionState === 'none') {
      import('./CharybdisEscapeScene').then(({ CharybdisEscapeScene }) => {
        this.engine.switchScene(new CharybdisEscapeScene(), 300);
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;
    
    // ── Sea ──────────────────────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    ctx.fillStyle = '#0e2030';
    ctx.fillRect(0, 0, 1280, 720);
    
    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 500;
      const moonY = 140;
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

    // Foam
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = 'rgba(200, 220, 232, 0.2)';
      const fx = (i * 80 + this.time * 30) % (SCENE_WIDTH + 1280);
      ctx.fillRect(fx, DECK_Y + 60 + Math.sin(i * 2.3) * 10, 20, 2);
    }

    // ── Scylla cliff (top) ───────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    ctx.fillStyle = B12.cliff_base;
    ctx.fillRect(0, 0, 1280, 200);
    // Texture
    ctx.strokeStyle = '#0a0808';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      const vy = 20 + i * 16;
      ctx.moveTo(0, vy);
      for (let vx = 0; vx < 1280; vx += 30) {
        ctx.lineTo(vx, vy + Math.sin((vx + camX) * 0.03 + i * 1.5) * 6);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Cave opening
    const caveX = 1400;
    ctx.fillStyle = '#060404';
    ctx.beginPath();
    ctx.ellipse(caveX, 200, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // Mist
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#1a1414';
    ctx.beginPath();
    ctx.ellipse(caveX + Math.sin(this.time * 0.2) * 10, 200, 80, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // ── Scylla heads (neck + head) ───────────────────────────────
    for (const h of this.heads) {
      if (h.phase === 'waiting' || h.phase === 'done') continue;
      const crewMember = this.crew.find(c => c.id === h.crewId);
      if (!crewMember) continue;
      const targetX = this.shipX + crewMember.x;

      // Neck segments (serpentine)
      ctx.strokeStyle = B12.scylla_neck;
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(caveX, 200);
      const segments = 8;
      for (let si = 1; si <= segments; si++) {
        const t = si / segments;
        const ny = 200 + h.neckY * t;
        const nx = caveX + (targetX - caveX) * t + Math.sin(t * Math.PI * 3 + this.time * 4) * 20;
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();

      // Head
      const headX = caveX + (targetX - caveX);
      const headY = 200 + h.neckY;
      ctx.fillStyle = B12.scylla_neck;
      ctx.beginPath();
      ctx.ellipse(headX, headY, 25, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      // Teeth
      ctx.fillStyle = B12.scylla_teeth;
      for (let row = 0; row < 3; row++) {
        for (let t = 0; t < 4; t++) {
          const tx = headX - 15 + t * 10;
          const ty = headY + 10 + row * 4;
          ctx.fillRect(tx, ty, 3, 4);
        }
      }

      // Scream flash during grab
      if (h.phase === 'grabbing') {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.shipX + crewMember.x, DECK_Y - 24, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // ── Charybdis whirlpool (bottom) ─────────────────────────────
    const wpX = 2400, wpY = 680;
    const rings = [
      { r: 200, c: B12.whirlpool_rim, s: 8 },
      { r: 140, c: '#102030', s: 14 },
      { r: 90, c: '#081820', s: 22 },
      { r: 50, c: '#040c10', s: 36 },
      { r: 20, c: '#000000', s: 60 },
    ];
    for (const ring of rings) {
      ctx.save();
      ctx.translate(wpX, wpY);
      ctx.rotate((this.whirlpoolAngle * ring.s / 20) * Math.PI / 180);
      ctx.fillStyle = ring.c;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Foam arcs
    ctx.strokeStyle = B12.spray;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    for (let fi = 0; fi < 6; fi++) {
      ctx.save();
      ctx.translate(wpX, wpY);
      ctx.rotate((this.whirlpoolAngle + fi * 60) * Math.PI / 180);
      ctx.beginPath();
      ctx.arc(0, 0, 180, 0, 0.3);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // ── Ship ─────────────────────────────────────────────────────
    ctx.fillStyle = '#2a1808';
    ctx.beginPath();
    ctx.moveTo(this.shipX, DECK_Y);
    ctx.lineTo(this.shipX + 40, DECK_Y + 60);
    ctx.lineTo(this.shipX + 440, DECK_Y + 60);
    ctx.lineTo(this.shipX + 480, DECK_Y);
    ctx.fill();
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(this.shipX + 20, DECK_Y - 6, 440, 6);

    // Crew
    for (const c of this.crew) {
      if (!c.alive) continue;
      ctx.fillStyle = B12.crew_silhouette;
      const cx2 = this.shipX + c.x;
      ctx.fillRect(cx2 - 8, DECK_Y - 45, 16, 48);
      ctx.beginPath();
      ctx.arc(cx2, DECK_Y - 49, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    this.player.draw(ctx);

    // ── No fight flash ───────────────────────────────────────────
    if (this.noFightFlash > 0) {
      const camX = this.engine.camera.x;
      ctx.save();
      ctx.translate(camX, 0);
      ctx.fillStyle = 'rgba(200, 64, 48, 0.6)';
      ctx.fillRect(300 + camX, 60, 680, 36);
      ctx.fillStyle = '#ff8080';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('You cannot fight Scylla.', 640 + camX, 78);
      ctx.restore();
    }

    // ── Narrator quote ───────────────────────────────────────────
    if (this.narratorShown && this.narratorQuote && !this.narratorQuote.dismissed) {
      const camX = this.engine.camera.x;
      ctx.save();
      ctx.translate(camX, 0);
      this.narratorQuote.draw(ctx, 640 + camX, 120);
      ctx.restore();
    }

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
