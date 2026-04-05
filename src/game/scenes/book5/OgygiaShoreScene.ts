import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B5 } from '../../Constants';
import { ClickQuote, DialogueQueue } from '../../DialogueSystem';
import { CalypsoCaveScene } from './CalypsoCaveScene';
import { fillWithTexture, getTextureImage } from '../../Textures';

const SCENE_WIDTH = 2560;
const FLOOR_Y = 540;

export class OgygiaShoreScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  // Opening dialogue
  weepingQuote!: ClickQuote;
  quoteShown = false;

  // Hermes arrival
  hermesTriggered = false;
  hermesTimer = 0;
  hermesX = 2400;
  hermesY = 0;
  hermesArrived = false;

  // Dialogue sequences
  hermesDlg: DialogueQueue | null = null;
  calypsoResponseDlg: DialogueQueue | null = null;
  dialoguePhase: 'none' | 'weeping' | 'hermes' | 'calypso' = 'none';

  // Sand particles for ambiance
  foamParticles: { x: number; y: number; alpha: number; speed: number }[] = [];

  // Trees
  trees = [
    { x: 1800, type: 'cypress', h: 180, w: 14 },
    { x: 1960, type: 'poplar', h: 140, w: 18 },
    { x: 2100, type: 'alder', h: 110, w: 16 },
    { x: 2250, type: 'cypress', h: 200, w: 12 },
  ];

  onEnter() {
    this.player = new Player(
      this.engine,
      200, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.player.frozen = true;
    this.engine.camera.x = 0;

    // Weeping quote
    this.weepingQuote = new ClickQuote(
      'He sat on the rocks and wept, as always, weeping, his eyes never dry, his sweet life ebbing away with longing for home. The nymph no longer pleased him. But in the days he sat on the rocks and shores and wept and gazed across the barren sea toward home.',
      '#c8b080', 13, 700
    );
    this.dialoguePhase = 'weeping';

    // Foam particles
    for (let i = 0; i < 30; i++) {
      this.foamParticles.push({
        x: Math.random() * SCENE_WIDTH,
        y: FLOOR_Y - 10 + Math.random() * 8,
        alpha: Math.random() * 0.5,
        speed: 10 + Math.random() * 20,
      });
    }

    // Hermes dialogue
    this.hermesDlg = new DialogueQueue([
      { text: 'Zeus has sent me. I did not want this journey.', color: B5.hermes_glow, fontSize: 14, speaker: 'HERMES', speakerColor: B5.hermes_glow },
      { text: 'Who would willingly cross this endless, salty sea?', color: B5.hermes_glow, fontSize: 14, speaker: 'HERMES', speakerColor: B5.hermes_glow },
      { text: 'He says you have a man here — most unhappy of all who fought at Troy.', color: B5.hermes_glow, fontSize: 14, speaker: 'HERMES', speakerColor: B5.hermes_glow },
      { text: 'Zeus commands you to send him home. His fate is not to die here.', color: B5.hermes_glow, fontSize: 14, speaker: 'HERMES', speakerColor: B5.hermes_glow },
      { text: 'It is his destiny to see his family and reach home.', color: B5.hermes_glow, fontSize: 14, speaker: 'HERMES', speakerColor: B5.hermes_glow },
    ]);

    this.calypsoResponseDlg = new DialogueQueue([
      { text: 'You are cruel, you gods, the most jealous beings alive.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'You cannot bear to let a goddess sleep with a man, even openly, even if it is a man she loves.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'I saved him. I fed him. I promised to make him immortal.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'But if Zeus commands, I will send him. I have no way to disobey.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'Let him go. I will give him instructions so he reaches home safely.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
    ]);
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    // Phase: weeping quote
    if (this.dialoguePhase === 'weeping') {
      this.weepingQuote.update(dt, inp);
      if (this.weepingQuote.dismissed) {
        this.dialoguePhase = 'none';
        this.player.frozen = false;
      }
      return;
    }

    // Phase: hermes dialogue
    if (this.dialoguePhase === 'hermes' && this.hermesDlg) {
      this.hermesDlg.update(dt, inp);
      if (this.hermesDlg.done) {
        this.dialoguePhase = 'calypso';
      }
      return;
    }

    // Phase: calypso response
    if (this.dialoguePhase === 'calypso' && this.calypsoResponseDlg) {
      this.calypsoResponseDlg.update(dt, inp);
      if (this.calypsoResponseDlg.done) {
        this.dialoguePhase = 'none';
        this.player.frozen = false;
      }
      return;
    }

    // Normal gameplay
    this.player.update(dt);

    // Camera follow
    const targetX = Math.max(0, Math.min(this.player.x - 640, SCENE_WIDTH - 1280));
    this.engine.camera.x += (targetX - this.engine.camera.x) * 5 * dt;

    // Hermes trigger at x=800
    if (!this.hermesTriggered && this.player.x >= 800) {
      this.hermesTriggered = true;
      this.hermesX = 2400;
      this.hermesY = 0;
      this.player.frozen = true;
    }

    // Hermes descent animation
    if (this.hermesTriggered && !this.hermesArrived) {
      this.hermesTimer += dt;
      const t = Math.min(this.hermesTimer / 2.0, 1.0);
      this.hermesX = 2400 - (2400 - 1600) * t;
      this.hermesY = 0 + FLOOR_Y * t;
      if (t >= 1.0) {
        this.hermesArrived = true;
        this.dialoguePhase = 'hermes';
      }
    }

    // Foam animation
    for (const p of this.foamParticles) {
      p.x -= p.speed * dt;
      p.alpha = 0.2 + 0.3 * Math.sin(this.time * 2 + p.x * 0.01);
      if (p.x < 0) p.x = SCENE_WIDTH;
    }

    // Transition: reach right edge
    if (this.player.x >= 2500 && this.engine.transitionState === 'none' && this.dialoguePhase === 'none') {
      this.engine.switchScene(new CalypsoCaveScene(), 500);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Sky gradient (dawn) ──────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
    skyGrad.addColorStop(0, B5.sky_dawn_top);
    skyGrad.addColorStop(1, B5.sky_dawn_bottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, SCENE_WIDTH, 400);
    
    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 400;
      const moonY = 100;
      const moonSize = 64;
      ctx.save();
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 100);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 100, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }
    ctx.restore();

    // ── Horizon glow ─────────────────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4a7a9a';
    ctx.beginPath();
    ctx.ellipse(SCENE_WIDTH / 2, 396, SCENE_WIDTH / 2, 80, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Sea layers ───────────────────────────────────────────────
    const seaLayers = [
      { y: 396, h: 58, color: B5.sea_deep, scroll: 0 },
      { y: 418, h: 86, color: B5.sea_mid, scroll: 0 },
      { y: 446, h: 108, color: B5.sea_surface, scroll: 0 },
      { y: 490, h: 230, color: '#2a7a9a', scroll: 0 },
    ];
    for (const l of seaLayers) {
      ctx.fillStyle = l.color;
      const waveY = Math.sin(this.time * 0.4 * Math.PI * 2) * 3;
      ctx.fillRect(0 - camX * l.scroll, l.y + waveY, SCENE_WIDTH + 200, l.h);
    }

    // ── Foam particles ───────────────────────────────────────────
    ctx.fillStyle = B5.sea_foam;
    for (const p of this.foamParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, 6, 2);
    }
    ctx.globalAlpha = 1;

    // ── Sandy ground — sand texture ──────────────────────────────
    fillWithTexture(ctx, 'sand3', 'rgba(200, 168, 112, 0.35)', () => {
      ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 180);
    }, 0.18);
    // Wet sand strip
    fillWithTexture(ctx, 'sand1', 'rgba(138, 112, 72, 0.45)', () => {
      ctx.fillRect(0, FLOOR_Y - 8, SCENE_WIDTH, 14);
    }, 0.18);


    // ── Rocks ────────────────────────────────────────────────────
    const rocks = [
      { x: 280, y: 510, w: 48, h: 32, c: '#5a4a30' },
      { x: 600, y: 520, w: 28, h: 18, c: '#6a5a38' },
      { x: 1400, y: 515, w: 60, h: 36, c: '#5a4a30' },
      { x: 2100, y: 508, w: 36, h: 24, c: '#6a5a38' },
    ];
    for (const r of rocks) {
      ctx.fillStyle = r.c;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.w / 2, r.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Odysseus's sitting rock ──────────────────────────────────
    ctx.fillStyle = '#6a5a38';
    ctx.beginPath();
    ctx.ellipse(180, 520, 30, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Trees (right side approaching cave) ──────────────────────
    for (const t of this.trees) {
      this.drawTree(ctx, t.x, FLOOR_Y, t.type, t.h, t.w);
    }

    // ── Vines & flowers at base of cliff (right side) ────────────
    for (let vx = 2000; vx < 2500; vx += 30) {
      const vh = 20 + (vx * 7 % 30);
      ctx.fillStyle = B5.vine;
      ctx.fillRect(vx, FLOOR_Y - vh, 3, vh);
      // Flowers
      if (vx % 60 < 30) {
        const fc = ['#e8e0c8', '#6a4a8a', '#c8a870'][Math.floor(vx / 30) % 3];
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(vx + 1, FLOOR_Y - vh - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Hermes (golden figure) ───────────────────────────────────
    if (this.hermesTriggered) {
      ctx.save();
      // Glow
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = B5.hermes_glow;
      ctx.beginPath();
      ctx.arc(this.hermesX, this.hermesY - 30, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Figure
      ctx.fillStyle = B5.hermes_glow;
      // Head
      ctx.beginPath();
      ctx.arc(this.hermesX, this.hermesY - 60, 10, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.fillRect(this.hermesX - 6, this.hermesY - 50, 12, 30);
      // Legs
      ctx.fillRect(this.hermesX - 6, this.hermesY - 20, 4, 20);
      ctx.fillRect(this.hermesX + 2, this.hermesY - 20, 4, 20);

      // Winged sandals
      const flapAngle = Math.sin(this.time * 8 * Math.PI * 2) * 0.4;
      ctx.save();
      ctx.translate(this.hermesX - 8, this.hermesY - 2);
      ctx.rotate(flapAngle);
      ctx.fillStyle = '#f0e8c0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-12, -6);
      ctx.lineTo(-8, 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(this.hermesX + 8, this.hermesY - 2);
      ctx.rotate(-flapAngle);
      ctx.fillStyle = '#f0e8c0';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(12, -6);
      ctx.lineTo(8, 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);

    // ── Dialogue overlays (camera-fixed) ─────────────────────────
    ctx.save();
    ctx.translate(camX, 0);

    if (this.dialoguePhase === 'weeping') {
      this.weepingQuote.draw(ctx, 640 + camX, 140);
    }
    if (this.dialoguePhase === 'hermes' && this.hermesDlg) {
      this.hermesDlg.draw(ctx, 640 + camX, 140, 800);
    }
    if (this.dialoguePhase === 'calypso' && this.calypsoResponseDlg) {
      this.calypsoResponseDlg.draw(ctx, 640 + camX, 140, 800);
    }

    ctx.restore();

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, h: number, w: number) {
    // Trunk
    ctx.fillStyle = type === 'cypress' ? B5.cypress_dark : type === 'poplar' ? '#1a1408' : '#2a1e08';
    ctx.fillRect(x - w / 2, y - h, w, h);

    if (type === 'cypress') {
      // Narrow tall canopy
      ctx.fillStyle = '#162810';
      ctx.beginPath();
      ctx.moveTo(x, y - h - 60);
      ctx.lineTo(x + 18, y - h + 20);
      ctx.lineTo(x - 18, y - h + 20);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y - h - 40);
      ctx.lineTo(x + 14, y - h + 40);
      ctx.lineTo(x - 14, y - h + 40);
      ctx.fill();
    } else if (type === 'poplar') {
      // Round shimmering canopy
      const shimmer = Math.sin(this.time * 1.2) * 0.15;
      ctx.fillStyle = B5.poplar_silver;
      ctx.globalAlpha = 0.7 + shimmer;
      ctx.beginPath();
      ctx.ellipse(x, y - h - 30, 30, 45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8d0b8';
      ctx.globalAlpha = 0.5 - shimmer;
      ctx.beginPath();
      ctx.ellipse(x + 8, y - h - 25, 20, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Alder — broad irregular
      ctx.fillStyle = B5.alder_mid;
      ctx.beginPath();
      ctx.ellipse(x, y - h - 20, 35, 30, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x - 15, y - h - 10, 25, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
