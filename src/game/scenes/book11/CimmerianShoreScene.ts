import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B11 } from '../../Constants';
import { getTextureImage } from '../../Textures';
import { makeCrowd, CrowdShade, drawCrowd } from '../../ShadeSystem';
import { ClickQuote } from '../../DialogueSystem';
import { TrenchScene } from './TrenchScene';
import { fillWithTexture } from '../../Textures';

const SCENE_WIDTH = 3200;
const FLOOR_Y = 610;

// Background hill from flat shore up to spirits field
function getBackgroundHillY(x: number): number {
  if (x < 600) return FLOOR_Y; // flat shore
  if (x > 3000) return FLOOR_Y; // flat far end
  // Hill between x=600..1200 rises, plateau 1200..2600, descends 2600..3000
  if (x <= 1200) {
    const t = (x - 600) / 600;
    return FLOOR_Y - t * t * 80; // ease-in rise to 80px above FLOOR_Y
  }
  if (x <= 2600) {
    return FLOOR_Y - 80; // plateau at top of hill
  }
  // 2600..3000 descend back
  const t = (x - 2600) / 400;
  return FLOOR_Y - 80 + t * t * 80;
}

export class CimmerianShoreScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  // Click-through quote sequence (Circe's instructions → voyage text)
  quotes: ClickQuote[] = [];
  quoteIndex = 0;

  // Ritual state
  nearRitual = false;
  ritualStarted = false;
  ritualTimer = 0;
  ritualStep = 0;
  trenchFillPct = 0;

  // Ritual click-through quote
  ritualQuote: ClickQuote | null = null;

  // Distant shade crowd
  crowd: CrowdShade[] = [];
  mistOffset = 0;

  onEnter() {
    this.player = new Player(
      this.engine,
      80, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.player.gravityFactor = 1.0;
    this.player.frozen = true; // frozen during opening quotes
    this.engine.camera.x = 0;

    this.crowd = makeCrowd(60, [600, 3200], [340, 580]);

    // Circe's instructions + voyage quote — click through each
    this.quotes = [
      new ClickQuote(
        'Circe told Odysseus to sail north to the ends of the earth, to the land of the Cimmerians where the sun never shines, and to perform the ritual at the shore of the river Oceanus.',
        '#d4b96a', 13, 700
      ),
      new ClickQuote(
        '"When you get there, dig a trench about a cubit\'s length in each direction. Around it pour libations for all the dead — first with honey mixed with milk, then sweet wine, then water. Sprinkle white barley meal. Then cut the throats of the sheep so the dark blood flows into the trench."',
        '#d4b96a', 12, 700
      ),
      new ClickQuote(
        'We reached the limits of the world, the deep-flowing Oceanus. There lie the land and city of the Cimmerians, covered in mist and cloud. The shining sun never looks on them with his rays. Deadly night is outspread over those wretched mortals.',
        '#d4b96a', 13, 700
      ),
    ];
  }

  update(dt: number) {
    this.time += dt;
    this.mistOffset += dt * 18;

    const inp = { 
      isDown: (k: string[]) => this.engine.input.isDown(k), 
      mouse: this.engine.input.mouse,
      keys: this.engine.input.keys
    };

    // Opening click-through quotes
    if (this.quoteIndex < this.quotes.length) {
      const q = this.quotes[this.quoteIndex];
      q.update(dt, inp);
      if (q.dismissed) {
        this.quoteIndex++;
        if (this.quoteIndex >= this.quotes.length) {
          this.player.frozen = false;
        }
      }
      return; // freeze game during quotes
    }

    // Ritual quote (click-through)
    if (this.ritualQuote && !this.ritualQuote.dismissed) {
      this.ritualQuote.update(dt, inp);
      if (this.ritualQuote.dismissed) {
        this.ritualStarted = true;
        this.ritualTimer = 0;
      }
      return;
    }

    if (!this.ritualStarted) {
      this.player.update(dt);

      // Camera follow
      const targetX = Math.max(0, Math.min(this.player.x - 640, SCENE_WIDTH - 1280));
      this.engine.camera.x += (targetX - this.engine.camera.x) * 5 * dt;

      // Near ritual site
      this.nearRitual = Math.abs(this.player.x - 2400) < 80;
      if (this.nearRitual && this.engine.input.isDown(['KeyE', 'Space'])) {
        this.engine.input.keys['Space'] = false;
        this.engine.input.keys['KeyE'] = false;
        this.player.frozen = true;
        // Show ritual quote (click-through)
        this.ritualQuote = new ClickQuote(
          'I dug a trench as long and wide as a forearm, and around it I poured libations for all the dead — first with honey mixed with milk, then sweet wine, then water. I sprinkled white barley meal. Then I cut the throats of the sheep and let the dark blood flow into the trench.',
          '#d4b96a', 13, 700
        );
      }
    } else {
      // Ritual cutscene (timed visual sequence after quote dismissed)
      this.ritualTimer += dt * 1000;

      // Steps: 0-1000 trench | 1000-2500 honey | 2500-4000 wine | 4000-5500 water
      // 5500-7000 barley | 7000-8000 sheep silhouettes | 8000-10000 blood fills
      this.ritualStep = 0;
      if (this.ritualTimer > 800)  this.ritualStep = 1; // trench
      if (this.ritualTimer > 2000) this.ritualStep = 2; // honey+milk
      if (this.ritualTimer > 3200) this.ritualStep = 3; // wine
      if (this.ritualTimer > 4400) this.ritualStep = 4; // water
      if (this.ritualTimer > 5600) this.ritualStep = 5; // barley
      if (this.ritualTimer > 6800) this.ritualStep = 6; // sheep
      if (this.ritualTimer > 8200) this.ritualStep = 7; // blood

      if (this.ritualTimer > 8200) {
        this.trenchFillPct = Math.min((this.ritualTimer - 8200) / 2000, 1);
      }

      // Transition after blood fills
      if (this.ritualTimer > 11000 && this.engine.transitionState === 'none') {
        this.engine.switchScene(new TrenchScene(), 1000);
      }
    }

    // Update crowd drift
    for (const s of this.crowd) { s.x -= 8 * dt; }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Absent sky (no stars, no moon — spec requires none) ──────
    ctx.save();
    ctx.translate(camX, 0);
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 720);
    skyGrad.addColorStop(0, B11.erebus_black);
    skyGrad.addColorStop(1, '#0a0818');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 350;
      const moonY = 150;
      const moonSize = 100;
      ctx.save();
      
      // Enhanced Moon glow (faint for Cimmeria)
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 150);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.15)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.08)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 150, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.08; // Very faint through mist
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }
    
    ctx.restore();

    // ── Cimmerian cloud ceiling ──────────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    ctx.fillStyle = B11.cimmerian_grey;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, 1280, 250);
    ctx.globalAlpha = 1;
    ctx.fillStyle = B11.underworld_mid;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 8; i++) {
      const wx = (i * 180 + this.time * 6) % 1280;
      ctx.beginPath();
      ctx.ellipse(wx, 100 + i * 18, 120, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Oceanus sea (left side) ──────────────────────────────────
    ctx.save();
    ctx.translate(-camX * 0.05, 0);
    const seaGrad = ctx.createLinearGradient(0, 440, 0, 720);
    seaGrad.addColorStop(0, '#060810');
    seaGrad.addColorStop(1, '#020408');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 440, 700, 280);
    ctx.fillStyle = '#0e1020';
    for (let i = 0; i < 10; i++) {
      const wy = 470 + i * 16 + Math.sin(this.time * 0.4 + i) * 2;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, wy, 700, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Ship ─────────────────────────────────────────────────────
    this.drawShip(ctx);

    // ── Dead land (hill polygon) ─────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(600, FLOOR_Y);
    // Sample the hill terrain
    for (let lx = 600; lx <= 3000; lx += 20) {
      ctx.lineTo(lx, getBackgroundHillY(lx));
    }
    ctx.lineTo(3000, FLOOR_Y);
    ctx.lineTo(SCENE_WIDTH, FLOOR_Y);
    ctx.lineTo(SCENE_WIDTH, 280);
    ctx.lineTo(600, 280);
    ctx.closePath();
    const landGrad = ctx.createLinearGradient(600, 0, SCENE_WIDTH, 0);
    landGrad.addColorStop(0, '#0a0818');
    landGrad.addColorStop(1, '#04020c');
    ctx.fillStyle = landGrad;
    ctx.fill();

    // ── Ground — dirty cobblestone texture ────────────────────────
    fillWithTexture(ctx, 'dirty', 'rgba(26, 16, 16, 0.72)', () => {
      ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 130);
    }, 0.18);
    ctx.fillStyle = '#221818';
    ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 4);

    const grassX = [200, 400, 700, 1000, 1400, 1800, 2100, 2500, 2800, 3100];
    ctx.fillStyle = '#1e1c10';
    for (const gx of grassX) {
      for (let j = 0; j < 5; j++) {
        ctx.fillRect(gx + j * 5, FLOOR_Y - 6 - (j % 3) * 3, 2, 6 + (j % 3) * 3);
      }
    }

    // ── Mist ─────────────────────────────────────────────────────
    ctx.save();
    ctx.globalAlpha = 0.4;
    const mistGrad = ctx.createLinearGradient(0, 500, 0, 630);
    mistGrad.addColorStop(0, 'rgba(26,20,40,0)');
    mistGrad.addColorStop(0.4, 'rgba(26,20,40,0.6)');
    mistGrad.addColorStop(1, 'rgba(26,20,40,0)');
    ctx.fillStyle = mistGrad;
    for (let m = 0; m < 3; m++) {
      const mx = ((this.mistOffset * (0.8 + m * 0.2)) % (SCENE_WIDTH + 400)) - 200;
      ctx.fillRect(mx, 480, SCENE_WIDTH / 2, 140);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Background shades ────────────────────────────────────────
    drawCrowd(ctx, this.crowd, B11.shade_faint, 0.18, this.time, -200, SCENE_WIDTH + 200, SCENE_WIDTH + 400);

    // ── Ritual cutscene visuals (z-index 1–2: behind player) ─────
    if (this.ritualStarted) {
      this.drawRitual(ctx);
    }

    // ── Player (z-index 10) ──────────────────────────────────────
    this.player.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);

    // ── Ritual site marker + dig text (IN FRONT of player) ──────
    if (!this.ritualStarted && this.quoteIndex >= this.quotes.length) {
      const rx = 2400;
      const ry = FLOOR_Y;
      const shimmerAlpha = 0.15 + 0.1 * Math.sin(this.time * 2);
      ctx.fillStyle = B11.blood_dark;
      ctx.globalAlpha = shimmerAlpha;
      ctx.beginPath();
      ctx.ellipse(rx, ry - 2, 35, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (this.nearRitual) {
        // Dark box behind prompt
        ctx.save();
        ctx.fillStyle = 'rgba(2,1,10,0.7)';
        ctx.fillRect(rx - 130, ry - 52, 260, 28);
        ctx.fillStyle = B11.text_quote;
        ctx.font = '13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press E — Dig the trench', rx, ry - 34);
        ctx.restore();
      }
    }

    // ── Click-through quotes (camera-fixed) ──────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    if (this.quoteIndex < this.quotes.length) {
      this.quotes[this.quoteIndex].draw(ctx, 640, 140);
    }
    if (this.ritualQuote && !this.ritualQuote.dismissed) {
      this.ritualQuote.draw(ctx, 640, 140);
    }
    ctx.restore();

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  private drawShip(ctx: CanvasRenderingContext2D) {
    const sx = 80, sy = 490;
    ctx.fillStyle = '#1e1808';
    ctx.beginPath();
    ctx.moveTo(sx - 80, sy + 40);
    ctx.lineTo(sx + 80, sy + 40);
    ctx.lineTo(sx + 90, sy + 20);
    ctx.lineTo(sx - 90, sy + 20);
    ctx.fill();
    ctx.fillStyle = '#2e2818';
    ctx.fillRect(sx - 80, sy + 20, 170, 6);
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(sx - 3, sy - 90, 6, 110);
    ctx.fillStyle = '#1a1810';
    ctx.fillRect(sx - 20, sy - 80, 40, 50);
  }

  private drawRitual(ctx: CanvasRenderingContext2D) {
    const rx = 2400, ry = FLOOR_Y;
    const step = this.ritualStep;

    // Trench
    if (step >= 1) {
      ctx.fillStyle = B11.trench_earth;
      ctx.fillRect(rx - 50, ry - 36, 100, 36);
      ctx.fillStyle = B11.trench_dark;
      ctx.fillRect(rx - 46, ry - 32, 92, 28);
    }

    // Libation layers
    if (step >= 2 && this.trenchFillPct === 0) {
      const layers = [
        { min: 2, color: '#c8a020', a: 0.55 }, // honey & milk
        { min: 3, color: '#6a1020', a: 0.6 },  // wine
        { min: 4, color: '#1a2030', a: 0.35 }, // water
        { min: 5, color: '#c8b880', a: 0.45 }, // barley
      ];
      for (const l of layers) {
        if (step >= l.min) {
          ctx.fillStyle = l.color;
          ctx.globalAlpha = l.a;
          ctx.fillRect(rx - 44, ry - 30, 88, 24);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Sheep silhouettes
    if (step >= 6 && this.trenchFillPct < 0.15) {
      ctx.fillStyle = '#1a1018';
      // Ram
      ctx.beginPath();
      ctx.ellipse(rx - 60, ry - 10, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(rx - 72, ry - 24, 4, 14);
      ctx.fillRect(rx - 56, ry - 24, 4, 14);
      // Ewe
      ctx.beginPath();
      ctx.ellipse(rx + 60, ry - 10, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Blood fill
    if (step >= 7 || this.trenchFillPct > 0) {
      const bh = 28 * this.trenchFillPct;
      ctx.fillStyle = B11.blood_mid;
      ctx.fillRect(rx - 44, ry - 4 - bh, 88, bh);
      if (this.trenchFillPct > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const gr = ctx.createRadialGradient(rx, ry - 18, 0, rx, ry - 18, 60);
        gr.addColorStop(0, `rgba(200,30,30,${0.45 * this.trenchFillPct})`);
        gr.addColorStop(1, 'rgba(200,30,30,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(rx - 60, ry - 78, 120, 120);
        ctx.restore();
      }
    }
  }
}
