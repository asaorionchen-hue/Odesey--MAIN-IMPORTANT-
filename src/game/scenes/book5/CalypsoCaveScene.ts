import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B5 } from '../../Constants';
import { ClickQuote, DialogueQueue } from '../../DialogueSystem';
import { getTextureImage } from '../../Textures';

const SCENE_WIDTH = 1920;
const FLOOR_Y = 500;

export class CalypsoCaveScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  // Loom shuttle animation
  shuttlePct = 0;
  shuttleDir = 1;

  // Fires
  fireParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];

  // Dialogue
  farewellDlg: DialogueQueue | null = null;
  dialogueActive = false;
  dialogueTriggered = false;

  // Singing music notes
  singingNotes: { x: number; y: number; alpha: number }[] = [];

  onEnter() {
    this.player = new Player(
      this.engine,
      100, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.engine.camera.x = 0;

    // Farewell dialogue
    this.farewellDlg = new DialogueQueue([
      { text: 'Son of Laertes, resourceful Odysseus — so you want to go home to your own country now?', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'Well, I will help you on your way. But if you knew how much suffering is in store for you — you might stay here with me and become immortal.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'Goddess, do not be angry with me. I know Penelope cannot compare with you. She is mortal. You are immortal and ageless.', color: '#c8b080', fontSize: 14, speaker: 'ODYSSEUS', speakerColor: '#c8b080' },
      { text: 'But even so, every day I long to go home. If some god wrecks me again, I will endure it. By now I am used to suffering.', color: '#c8b080', fontSize: 14, speaker: 'ODYSSEUS', speakerColor: '#c8b080' },
    ]);

    // Singing notes
    for (let i = 0; i < 8; i++) {
      this.singingNotes.push({ x: 880 + (Math.random() - 0.5) * 60, y: 440 - Math.random() * 40, alpha: Math.random() * 0.4 });
    }
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    // Dialogue
    if (this.dialogueActive && this.farewellDlg) {
      this.farewellDlg.update(dt, inp);
      if (this.farewellDlg.done) {
        this.dialogueActive = false;
        this.player.frozen = false;
      }
      return;
    }

    this.player.update(dt);

    // Camera
    const targetX = Math.max(0, Math.min(this.player.x - 640, SCENE_WIDTH - 1280));
    this.engine.camera.x += (targetX - this.engine.camera.x) * 5 * dt;

    // Trigger dialogue near Calypso
    if (!this.dialogueTriggered && Math.abs(this.player.x - 880) < 200) {
      this.dialogueTriggered = true;
      this.dialogueActive = true;
      this.player.frozen = true;
    }

    // Loom shuttle
    this.shuttlePct += this.shuttleDir * 0.3 * dt;
    if (this.shuttlePct > 1) { this.shuttlePct = 1; this.shuttleDir = -1; }
    if (this.shuttlePct < 0) { this.shuttlePct = 0; this.shuttleDir = 1; }

    // Fire particles
    if (this.time % 0.1 < dt) {
      const firePositions = [
        { x: 120, y: 480 }, { x: 380, y: 485 },
        { x: 1540, y: 490 }, { x: 1780, y: 482 }
      ];
      for (const fp of firePositions) {
        this.fireParticles.push({
          x: fp.x + (Math.random() - 0.5) * 10,
          y: fp.y,
          vx: (Math.random() - 0.5) * 10,
          vy: -30 - Math.random() * 40,
          life: 0,
          maxLife: 0.6 + Math.random() * 0.4,
        });
      }
    }

    // Update fire particles
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      if (p.life > p.maxLife) this.fireParticles.splice(i, 1);
    }

    // Singing notes
    for (const n of this.singingNotes) {
      n.y -= 20 * dt;
      n.alpha = 0.2 + 0.2 * Math.sin(this.time * 2 + n.x * 0.1);
      if (n.y < 380) { n.y = 480; n.x = 880 + (Math.random() - 0.5) * 60; }
    }

    // Transition: reach right edge (after dialogue)
    if (this.player.x >= SCENE_WIDTH - 60 && this.engine.transitionState === 'none' && this.dialogueTriggered && !this.dialogueActive) {
      // Import raft building scene dynamically to avoid circular deps
      import('./RaftBuildingScene').then(({ RaftBuildingScene }) => {
        this.engine.switchScene(new RaftBuildingScene(), 500);
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Cave walls ───────────────────────────────────────────────
    ctx.fillStyle = B5.cave_wall;
    ctx.fillRect(0, 0, SCENE_WIDTH, 720);
    
    // Moon through entrance
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      const moonX = 100;
      const moonY = 160;
      const moonSize = 70;
      ctx.globalAlpha = 0.5;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }

    // ── Cave ceiling (irregular) ─────────────────────────────────
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, SCENE_WIDTH, 120);
    // Stalactites
    const stalactites = [
      { x: 0.15, l: 28, w: 8 }, { x: 0.32, l: 18, w: 5 },
      { x: 0.55, l: 35, w: 10 }, { x: 0.71, l: 22, w: 7 },
      { x: 0.88, l: 16, w: 5 },
    ];
    ctx.fillStyle = '#2a1e10';
    for (const s of stalactites) {
      const sx = s.x * SCENE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(sx - s.w / 2, 120);
      ctx.lineTo(sx, 120 + s.l);
      ctx.lineTo(sx + s.w / 2, 120);
      ctx.fill();
    }

    // ── Stone texture veins ──────────────────────────────────────
    ctx.strokeStyle = '#1a1408';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const vy = 180 + i * 50;
      ctx.beginPath();
      ctx.moveTo(0, vy);
      for (let vx = 0; vx < SCENE_WIDTH; vx += 40) {
        ctx.lineTo(vx, vy + Math.sin(vx * 0.02 + i) * 8);
      }
      ctx.stroke();
    }

    // ── Four fires ───────────────────────────────────────────────
    const firePositions = [
      { x: 120, y: 480 }, { x: 380, y: 485 },
      { x: 1540, y: 490 }, { x: 1780, y: 482 },
    ];
    for (const fp of firePositions) {
      // Base fire
      const flickerH = 18 + Math.sin(this.time * 6 + fp.x) * 4;
      ctx.fillStyle = '#e8901a';
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y - flickerH / 2, 10, flickerH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8c840';
      ctx.beginPath();
      ctx.ellipse(fp.x, fp.y - flickerH / 2, 5, flickerH / 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fire glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#c85010';
      ctx.beginPath();
      ctx.arc(fp.x, fp.y, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // ── Smoke particles ──────────────────────────────────────────
    ctx.fillStyle = '#2a1e2e';
    for (const p of this.fireParticles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = 0.3 * (1 - t);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + t * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Loom ─────────────────────────────────────────────────────
    const loomX = 800, loomY = 380, loomW = 280, loomH = 240;
    // Frame
    ctx.fillStyle = B5.loom_wood;
    ctx.fillRect(loomX, loomY, 8, loomH); // left
    ctx.fillRect(loomX + loomW - 8, loomY, 8, loomH); // right
    ctx.fillRect(loomX, loomY, loomW, 8); // top
    ctx.fillRect(loomX, loomY + loomH - 8, loomW, 8); // bottom
    // Warp threads
    ctx.strokeStyle = B5.loom_thread;
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const tx = loomX + 14 + i * 12;
      ctx.beginPath();
      ctx.moveTo(tx, loomY + 8);
      ctx.lineTo(tx, loomY + loomH - 8);
      ctx.stroke();
    }
    // Weft pattern (filled area)
    const weftH = loomH * 0.4;
    ctx.fillStyle = '#e8c840';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(loomX + 10, loomY + 10, loomW - 20, weftH);
    ctx.globalAlpha = 1;
    // Shuttle
    const shuttleX = loomX + 14 + this.shuttlePct * (loomW - 40);
    ctx.fillStyle = '#f0d040';
    ctx.fillRect(shuttleX, loomY + 10 + weftH - 4, 20, 8);

    // ── Calypso figure (at loom) ─────────────────────────────────
    const cx = 880, cy = 490;
    // Glow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = B5.flower_violet;
    ctx.beginPath();
    ctx.arc(cx, cy - 30, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Robe
    ctx.fillStyle = '#2a1e3a';
    ctx.fillRect(cx - 10, cy - 50, 20, 50);
    // Head
    ctx.fillStyle = '#e0d0c0';
    ctx.beginPath();
    ctx.arc(cx, cy - 56, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = '#c8a030';
    ctx.beginPath();
    ctx.arc(cx, cy - 60, 6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 6, cy - 60, 2, 14);
    ctx.fillRect(cx + 4, cy - 60, 2, 14);

    // ── Singing note particles ───────────────────────────────────
    ctx.fillStyle = B5.loom_thread;
    for (const n of this.singingNotes) {
      ctx.globalAlpha = n.alpha;
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♪', n.x, n.y);
    }
    ctx.globalAlpha = 1;

    // ── Vine curtain (entrance left) ─────────────────────────────
    ctx.fillStyle = B5.vine;
    for (let vx = 0; vx < 200; vx += 12) {
      const length = 200 + Math.sin(vx * 0.3) * 80;
      ctx.fillRect(vx, 0, 3, length);
      // Grape clusters
      if (vx % 24 < 12) {
        ctx.fillStyle = '#4a2a5a';
        for (let g = 0; g < 3; g++) {
          ctx.beginPath();
          ctx.arc(vx + 2, length - 10 + g * 6, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = B5.vine;
      }
      // Leaves
      ctx.fillStyle = '#1a3a0a';
      ctx.beginPath();
      ctx.ellipse(vx + 5, length * 0.5, 6, 3, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = B5.vine;
    }

    // ── Floor ────────────────────────────────────────────────────
    ctx.fillStyle = B5.cave_shadow;
    ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 220);

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);

    // ── Dialogue overlays ────────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    if (this.dialogueActive && this.farewellDlg) {
      this.farewellDlg.draw(ctx, 640 + camX, 140, 800);
    }
    ctx.restore();
  }
}
