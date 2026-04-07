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

function getBackgroundHillY(x: number): number {
  if (x < 600) return FLOOR_Y; 
  // Majestic hill rising smoothly from the ground
  if (x <= 2200) {
    const t = (x - 600) / 1600;
    // Smooth S-curve
    const ease = (1 - Math.cos(t * Math.PI)) / 2;
    return FLOOR_Y - ease * 350; // Peak reaches 350px high
  }
  return FLOOR_Y - 350; // Massive plateau
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
    for (const s of this.crowd) { 
      s.x -= 8 * dt; 
      // Wrap ghosts back to the far right of the hill
      if (s.x < 1100) s.x += 2100;
      
      // Pin y to the hill surface at this x position
      const hillY = getBackgroundHillY(s.x);
      // Only allow ghosts on the upper portion of the hill (above FLOOR_Y - 80)
      const maxY = FLOOR_Y - 80;
      s.y = hillY + (s.scale * 0.3) * (maxY - hillY);
      // Clamp so they never go below the upper hill line
      if (s.y > maxY) s.y = maxY;
    }
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
    const cloud1Img = getTextureImage('clouds_1');
    const cloud2Img = getTextureImage('clouds_2');
    
    if (cloud1Img && cloud1Img.complete && cloud1Img.naturalWidth > 0 && 
        cloud2Img && cloud2Img.complete && cloud2Img.naturalWidth > 0) {
      
      const c1W = cloud1Img.naturalWidth * 2.5;
      const c1H = cloud1Img.naturalHeight * 2.5;
      const c2W = cloud2Img.naturalWidth * 2.5;
      const c2H = cloud2Img.naturalHeight * 2.5;
      
      // Far clouds
      ctx.save();
      ctx.translate(camX * 0.98, 0);
      const gap1 = c1W * 1.5;
      for (let i = -1; i <= 6; i++) {
        ctx.globalAlpha = 0.45;
        ctx.filter = `brightness(25%) sepia(30%) hue-rotate(210deg)`;
        ctx.drawImage(cloud1Img, i * gap1, -20, c1W, c1H);
      }
      ctx.filter = 'none';
      ctx.restore();
      
      // Near clouds
      ctx.save();
      ctx.translate(camX * 0.95, 0);
      const gap2 = c2W * 1.8;
      for (let i = -1; i <= 6; i++) {
        ctx.globalAlpha = 0.65;
        ctx.filter = `brightness(20%) sepia(40%) hue-rotate(220deg)`;
        ctx.drawImage(cloud2Img, i * gap2 + (c2W * 0.6), 40, c2W, c2H);
      }
      ctx.filter = 'none';
      ctx.restore();
      
    } else {
      ctx.save();
      ctx.translate(camX, 0);
      ctx.fillStyle = B11.cimmerian_grey;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(0, 0, 1280, 250);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ── Oceanus sea — painted ON TOP of clouds to cut them off at the horizon ──
    // No parallax on the sea fill so it fully covers every cloud layer beneath it
    const HORIZON_Y = 440;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    // Solid opaque sea that hides everything below the horizon
    const seaGrad = ctx.createLinearGradient(0, HORIZON_Y, 0, 720);
    seaGrad.addColorStop(0, '#0a0e1a');  // Slightly lighter at the horizon so the line is visible
    seaGrad.addColorStop(0.05, '#060810');
    seaGrad.addColorStop(1, '#020408');
    ctx.fillStyle = seaGrad;
    // Extra-wide fill from far left to far right so no gap at any camera position
    ctx.fillRect(-200, HORIZON_Y, SCENE_WIDTH + 2000, 300);
    
    // Visible horizon line — thin bright stroke so the sky/sea boundary is clear
    ctx.strokeStyle = 'rgba(80, 90, 130, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-200, HORIZON_Y);
    ctx.lineTo(SCENE_WIDTH + 2000, HORIZON_Y);
    ctx.stroke();
    
    // Subtle wave lines on the sea
    ctx.fillStyle = '#0e1020';
    for (let i = 0; i < 10; i++) {
      const wy = HORIZON_Y + 30 + i * 16 + Math.sin(this.time * 0.4 + i) * 2;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(-200, wy, SCENE_WIDTH + 2000, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Ship ─────────────────────────────────────────────────────
    this.drawShip(ctx);

    // ── Dead land (hill polygon) ─────────────────────────────────
    ctx.save();
    // Parallax anchors it in the background depth
    ctx.translate(-camX * 0.15, 0);
    
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    // Trace the beautiful hill contour
    for (let lx = 0; lx <= SCENE_WIDTH + 800; lx += 20) {
      ctx.lineTo(lx, getBackgroundHillY(lx));
    }
    // Drop solidly to floor
    ctx.lineTo(SCENE_WIDTH + 800, FLOOR_Y);
    ctx.closePath();
    
    const landGrad = ctx.createLinearGradient(0, 200, 0, FLOOR_Y);
    landGrad.addColorStop(0, '#533c7d'); // Highly visible solid purple peak!
    landGrad.addColorStop(1, '#2c1e48'); // Distinct dark purple base
    ctx.fillStyle = landGrad;
    ctx.fill();
    ctx.restore();

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
    ctx.save();
    // Match hill's parallax so ghosts move with the terrain
    ctx.translate(-camX * 0.15, 0);
    // Use huge xMin/xMax to prevent drawCrowd from re-wrapping (we handle it in update)
    drawCrowd(ctx, this.crowd, B11.shade_faint, 0.18, this.time, -99999, 99999, 1);
    ctx.restore();

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
