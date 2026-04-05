import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B11 } from '../../Constants';
import { drawShade, makeCrowd, CrowdShade, drawCrowd, drawBloodTrench } from '../../ShadeSystem';
import { DialogueQueue, ClickQuote, drawQuoteOverlay } from '../../DialogueSystem';
import { ParadeOfShadesScene } from './ParadeOfShadesScene';
import { getTextureImage } from '../../Textures';

const FLOOR_Y = 620;
const TRENCH_X = 900;
const SCENE_WIDTH = 2000;
const UNDERWORLD_RISE = 180;

function getUnderworldPathY(x: number): number {
  const t = x / SCENE_WIDTH;
  return FLOOR_Y - (t * t * UNDERWORLD_RISE);
}

type TrenchPhase =
  | 'arrive_quote'     // opening quote (click-through)
  | 'elpenor_approach' // Elpenor drifts in
  | 'elpenor_speak'    // Elpenor dialogue (click-through)
  | 'odysseus_promise' // Odysseus's promise (click-through)
  | 'anticlea_block'   // Anticlea approaches, player must block
  | 'tiresias_arrive'  // Tiresias walks toward trench
  | 'tiresias_drink'   // Tiresias kneels and drinks
  | 'tiresias_speak'   // 3-part prophecy (click-through)
  | 'anticlea_drink'   // Anticlea allowed to drink
  | 'anticlea_speak'   // Anticlea dialogue (click-through)
  | 'anticlea_explains'// Anticlea explains death
  | 'embrace'          // 3 embrace attempts
  | 'complete';

export class TrenchScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  phase: TrenchPhase = 'arrive_quote';
  phaseTimer = 0;

  farCrowd: CrowdShade[] = [];
  midCrowd: CrowdShade[] = [];
  ash: { x: number; y: number; vy: number; alpha: number }[] = [];

  elpenorX = 280;
  anticleaX = 1200;
  tiresiasX = 1500;

  // Opening quote
  arriveQuote = new ClickQuote(
    'The souls of the dead came swarming up from Erebus — brides, young men, old men who had suffered much, tender girls with hearts new to sorrow. The many crowded round the trench from every direction with a wondrous cry, and pale fear seized me.',
    '#d4b96a', 13, 720
  );

  // Elpenor dialogue (spec-accurate, click-through)
  elpenorDlg = new DialogueQueue([
    { text: 'Son of Laertes, resourceful Odysseus — did you leave me behind like that without a tear?', color: B11.elpenor_young, fontSize: 13, speaker: 'Elpenor' },
    { text: 'Do not leave me unmourned and unburied behind you when you go back. I beg you — do not leave me.', color: B11.elpenor_young, fontSize: 13, speaker: 'Elpenor' },
    { text: 'Burn me with my armor. Heap up a mound for me on the grey sea shore. Plant my oar upon the tomb — the oar I used to row when I was alive with my companions.', color: B11.elpenor_young, fontSize: 13, speaker: 'Elpenor' },
  ]);

  // Odysseus promise
  odysseusPromise = new ClickQuote(
    'Unhappy man — I will do this for you. I will not forget.',
    '#a09070', 13, 600
  );

  // Tiresias prophecy (spec 3-part, click-through)
  tiresDlg = new DialogueQueue([
    { text: 'You seek a honey-sweet homecoming, shining Odysseus, but a god will make it hard for you. I do not think Poseidon will let go of his anger — he is furious because you blinded his son.', color: B11.tiresias_white, fontSize: 13, speaker: 'Tiresias' },
    { text: 'Even so you may reach home if you restrain yourself and your companions. When you reach the island of Thrinacia you must pass by and not harm the cattle of the sun god Helios. If you harm them I foresee destruction for your ship and crew. Even if you yourself escape you will come home late, in terrible shape, in a stranger\'s ship, to find trouble waiting in your house.', color: B11.tiresias_white, fontSize: 13, speaker: 'Tiresias' },
    { text: 'But after you have killed the suitors in your halls — whether by cunning or with the sharp bronze — you must take a well-made oar and travel until you reach men who know nothing of the sea. When a wayfarer says your oar is a winnowing-fan — there plant it and make sacrifice to Poseidon. Then a gentle death will come to you from the sea, in comfortable old age. This is the truth.', color: B11.tiresias_white, fontSize: 13, speaker: 'Tiresias' },
  ]);

  // Anticlea (spec-accurate, click-through)
  anticleaDlg = new DialogueQueue([
    { text: 'My child — how did you come here under the misty dark, still living? It is hard for the living to see this place.', color: B11.anticlea_pale, fontSize: 13, speaker: 'Anticlea' },
    { text: 'Your faithful wife Penelope is still in your halls. She weeps away the nights and days.', color: B11.anticlea_pale, fontSize: 13, speaker: 'Anticlea' },
    { text: 'Your son Telemachus tends your estate. He sits at the feasts that men invite him to. But he waits for you.', color: B11.anticlea_pale, fontSize: 13, speaker: 'Anticlea' },
    { text: 'Your father stays in the country on your estate. He does not come to town. He sleeps among the farm workers, grieving terribly for you.', color: B11.anticlea_pale, fontSize: 13, speaker: 'Anticlea' },
    { text: 'And it was longing for you, my brilliant Odysseus, your gentle ways, your kind heart — that took away my sweet life.', color: B11.anticlea_pale, fontSize: 14, speaker: 'Anticlea' },
  ]);

  // Anticlea explains death after embrace
  anticleaExplains = new ClickQuote(
    'This is the way of mortals when they die. The sinews no longer hold the flesh and bones together — the fire burns them all away once the spirit leaves the white bones, and the soul flutters away like a dream.',
    B11.anticlea_pale, 13, 660
  );

  // Embrace
  embraceAttempts = 0;
  embraceQuote: ClickQuote | null = null;
  embraceCooldown = 0;

  // (sword swing replaced by Player attack animation)

  onEnter() {
    this.player = new Player(
      this.engine,
      TRENCH_X, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.player.gravityFactor = 1.0;
    this.player.frozen = true;
    this.engine.camera.x = 0;

    this.farCrowd = makeCrowd(120, [0, 2000], [160, 380]);
    this.midCrowd = makeCrowd(50, [0, 2000], [350, 550]);

    for (let i = 0; i < 80; i++) {
      this.ash.push({ x: Math.random() * 1280, y: Math.random() * 720, vy: -(20 + Math.random() * 40), alpha: 0.1 + Math.random() * 0.25 });
    }
  }

  update(dt: number) {
    this.time += dt;
    const inp = { 
      isDown: (k: string[]) => this.engine.input.isDown(k), 
      mouse: this.engine.input.mouse,
      keys: this.engine.input.keys
    };

    // Ash
    for (const p of this.ash) {
      p.y += p.vy * dt;
      if (p.y < -10) { p.y = 730; p.x = Math.random() * 1280; }
    }

    // Crowd drift toward trench
    for (const s of this.farCrowd) {
      const dir = s.x < TRENCH_X ? 4 : -4;
      s.x += dir * dt;
    }
    for (const s of this.midCrowd) {
      const dir = s.x < TRENCH_X ? 6 : -6;
      s.x += dir * dt;
      if (Math.abs(s.x - TRENCH_X) < 80) s.x += (s.x < TRENCH_X ? -1 : 1) * 20 * dt;
    }



    if (this.embraceCooldown > 0) this.embraceCooldown -= dt;

    switch (this.phase) {
      case 'arrive_quote':
        this.arriveQuote.update(dt, inp);
        if (this.arriveQuote.dismissed) this.setPhase('elpenor_approach');
        break;

      case 'elpenor_approach':
        this.phaseTimer += dt;
        if (this.elpenorX < TRENCH_X - 120) this.elpenorX += 40 * dt;
        if (this.phaseTimer > 2) this.setPhase('elpenor_speak');
        break;

      case 'elpenor_speak':
        this.elpenorDlg.update(dt, inp);
        if (this.elpenorDlg.isComplete()) this.setPhase('odysseus_promise');
        break;

      case 'odysseus_promise':
        this.odysseusPromise.update(dt, inp);
        if (this.odysseusPromise.dismissed) this.setPhase('anticlea_block');
        break;

      case 'anticlea_block':
        this.player.frozen = false;
        this.phaseTimer += dt;
        // Anticlea drifts toward trench
        if (this.anticleaX > TRENCH_X + 80) this.anticleaX -= 20 * dt;
        // Attack animation repels anticlea
        // Global attack now handled in Player.ts
        if (this.player.isAttackHitActive && Math.abs(this.player.x - this.anticleaX) < 140) {
          this.anticleaX = Math.min(this.anticleaX + 80 * dt, 1200);
        }
        // Tiresias approaches after 5s
        if (this.phaseTimer > 5 && this.tiresiasX > TRENCH_X + 30) {
          this.tiresiasX -= 35 * dt;
        }
        if (this.phaseTimer > 8) this.setPhase('tiresias_drink');
        break;

      case 'tiresias_drink':
        this.player.frozen = true;
        this.phaseTimer += dt;
        if (this.phaseTimer > 2) this.setPhase('tiresias_speak');
        break;

      case 'tiresias_speak':
        this.tiresDlg.update(dt, inp);
        if (this.tiresDlg.isComplete()) this.setPhase('anticlea_drink');
        break;

      case 'anticlea_drink':
        this.phaseTimer += dt;
        if (this.anticleaX > TRENCH_X + 50) this.anticleaX -= 25 * dt;
        if (this.phaseTimer > 2.5) this.setPhase('anticlea_speak');
        break;

      case 'anticlea_speak':
        this.anticleaDlg.update(dt, inp);
        if (this.anticleaDlg.isComplete()) this.setPhase('embrace');
        break;

      case 'embrace':
        this.player.frozen = false;
        // Player presses E near Anticlea to attempt embrace
        if (this.embraceAttempts < 3 && this.embraceCooldown <= 0 &&
            this.engine.input.isDown(['KeyE']) &&
            Math.abs(this.player.x - this.anticleaX) < 90) {
          this.engine.input.keys['KeyE'] = false;
          this.embraceAttempts++;
          this.embraceCooldown = 1.5;
          this.embraceQuote = new ClickQuote(
            'Three times I moved towards her, and my heart urged me to embrace her. Three times she fluttered out of my arms like a shadow or a dream.',
            '#d4b96a', 13, 660
          );
        }
        if (this.embraceQuote && !this.embraceQuote.dismissed) {
          this.embraceQuote.update(dt, inp);
        }
        if (this.embraceAttempts >= 3 && (!this.embraceQuote || this.embraceQuote.dismissed)) {
          this.setPhase('anticlea_explains');
        }
        this.player.update(dt);
        break;

      case 'anticlea_explains':
        this.player.frozen = true;
        this.anticleaExplains.update(dt, inp);
        if (this.anticleaExplains.dismissed) this.setPhase('complete');
        break;

      case 'complete':
        this.phaseTimer += dt;
        if (this.phaseTimer > 1.5 && this.engine.transitionState === 'none') {
          this.engine.switchScene(new ParadeOfShadesScene(), 800);
        }
        break;
    }

    if (this.phase !== 'embrace') {
      this.player.update(dt);
    }
    this.arrows = this.arrows.filter(a => a.active);
  }

  private setPhase(p: TrenchPhase) {
    this.phase = p;
    this.phaseTimer = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;
    // ── Erebus void ──────────────────────────────────────────────
    ctx.fillStyle = B11.erebus_black;
    ctx.fillRect(0, 0, 1280, 720);
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 255;
      const moonY = 205;
      const moonSize = 110;
      ctx.save();
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 140);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.12)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.08)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.06;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }

    // ── Underworld misty depth (rising path) ────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    for (let lx = 0; lx <= SCENE_WIDTH; lx += 40) {
      ctx.lineTo(lx, getUnderworldPathY(lx));
    }
    ctx.lineTo(SCENE_WIDTH, FLOOR_Y);
    ctx.closePath();
    
    const depthGrad = ctx.createLinearGradient(0, FLOOR_Y - UNDERWORLD_RISE, 0, FLOOR_Y);
    depthGrad.addColorStop(0, 'rgba(26, 20, 40, 0.35)');
    depthGrad.addColorStop(1, 'rgba(2, 1, 10, 0)');
    ctx.fillStyle = depthGrad;
    ctx.fill();
    ctx.restore();

    // ── Far + mid shade crowds ───────────────────────────────────
    drawCrowd(ctx, this.farCrowd, B11.shade_faint, 0.22, this.time, 0, 2000, 2000);
    drawCrowd(ctx, this.midCrowd, B11.shade_dim, 0.35, this.time, 0, 2000, 2000);

    // ── Wailing text fragments ───────────────────────────────────
    ctx.font = '9px serif';
    ctx.fillStyle = '#303050';
    ctx.globalAlpha = 0.2;
    const frags = ['...', 'ohh', '...', '...', 'ohh', '...'];
    for (let i = 0; i < 14; i++) {
      const fx = 60 + (i * 100 + this.time * 8) % 1200;
      const fy = 180 + (i * 37) % 400;
      ctx.fillText(frags[i % frags.length], fx, fy);
    }
    ctx.globalAlpha = 1;

    // ── Ash particles ────────────────────────────────────────────
    ctx.fillStyle = B11.ash_grey;
    for (const p of this.ash) {
      ctx.globalAlpha = p.alpha;
      ctx.fillRect(p.x, p.y, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // ── Floor ────────────────────────────────────────────────────
    ctx.fillStyle = '#100e18';
    ctx.fillRect(0, FLOOR_Y, 1280, 100);
    ctx.fillStyle = '#1a1820';
    ctx.fillRect(0, FLOOR_Y, 1280, 3);

    // ── Blood trench ─────────────────────────────────────────────
    drawBloodTrench(ctx, TRENCH_X, FLOOR_Y, 120, 40, this.time, 1.0);

    // ── Shades ───────────────────────────────────────────────────

    // Elpenor
    if (this.phase !== 'arrive_quote') {
      drawShade(ctx, { x: this.elpenorX, y: FLOOR_Y, height: 68, width: 17, color: B11.elpenor_young, opacity: 0.75, glowColor: '#9088b8', glowRadius: 20, glowOpacity: 0.28, headTilt: 16 });
      ctx.fillStyle = B11.elpenor_young;
      ctx.font = '10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText('Elpenor', this.elpenorX, FLOOR_Y - 85);
      ctx.globalAlpha = 1;
    }

    // Anticlea
    const showAnticlea = ['anticlea_block','tiresias_arrive','tiresias_drink','tiresias_speak','anticlea_drink','anticlea_speak','embrace','anticlea_explains','complete'].includes(this.phase);
    if (showAnticlea) {
      const dissolving = this.phase === 'embrace' && this.embraceQuote && !this.embraceQuote.dismissed;
      const ancOpacity = dissolving ? 0.06 : this.phase === 'anticlea_block' ? 0.6 : 0.8;
      drawShade(ctx, { x: this.anticleaX, y: FLOOR_Y, height: 63, width: 15, color: B11.anticlea_pale, opacity: ancOpacity, glowColor: '#b0a8d0', glowRadius: 18, glowOpacity: 0.22, armsOutstretched: true });
      ctx.fillStyle = B11.anticlea_pale;
      ctx.font = '10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText('Anticlea', this.anticleaX, FLOOR_Y - 78);
      ctx.globalAlpha = 1;
    }

    // Block prompt (top-third with dark box)
    if (this.phase === 'anticlea_block') {
      ctx.save();
      ctx.fillStyle = 'rgba(2,1,10,0.7)';
      ctx.fillRect(640 - 280, 45, 560, 30);
      ctx.fillStyle = B11.text_quote;
      ctx.font = 'italic 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Hold her back — press Space or Z to attack', 640, 64);
      ctx.restore();
    }

    // Tiresias
    const showTiresias = ['tiresias_drink','tiresias_speak','anticlea_drink','anticlea_speak','embrace','anticlea_explains','complete'].includes(this.phase);
    if (showTiresias || (this.phase === 'anticlea_block' && this.phaseTimer > 5)) {
      const tFloat = 12 * Math.sin(this.time * 0.7);
      drawShade(ctx, { x: TRENCH_X + 50, y: FLOOR_Y, height: 86, width: 20, color: B11.tiresias_white, opacity: 1.0, glowColor: B11.tiresias_glow, glowRadius: 55, glowOpacity: 0.65, hasStaff: true, staffColor: B11.gold_pale, staffHeight: 115, float: tFloat });
      ctx.fillStyle = B11.tiresias_white;
      ctx.font = '10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('Tiresias', TRENCH_X + 50, FLOOR_Y - 102);
    }

    // Player
    this.player.draw(ctx);

    // ── Dialogue overlays (camera-fixed) ─────────────────────────
    ctx.save();
    ctx.translate(camX, 0);

    if (this.phase === 'arrive_quote') {
      this.arriveQuote.draw(ctx, 640, 140);
    }
    if (this.phase === 'elpenor_speak') {
      this.elpenorDlg.draw(ctx, 640, 140, 800);
    }
    if (this.phase === 'odysseus_promise') {
      this.odysseusPromise.draw(ctx, 640, 140);
    }
    if (this.phase === 'tiresias_speak') {
      this.tiresDlg.draw(ctx, 640, 140, 840);
    }
    if (this.phase === 'anticlea_speak') {
      this.anticleaDlg.draw(ctx, 640, 140, 800);
    }
    if (this.phase === 'embrace') {
      const remaining = 3 - this.embraceAttempts;
      if (remaining > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(2,1,10,0.7)';
        ctx.fillRect(640 - 280, 45, 560, 30);
        ctx.fillStyle = B11.text_quote;
        ctx.font = 'italic 12px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Press E near your mother to reach for her  (${remaining} remaining)`, 640, 64);
        ctx.restore();
      }
      if (this.embraceQuote && !this.embraceQuote.dismissed) {
        this.embraceQuote.draw(ctx, 640, 140);
      }
    }
    if (this.phase === 'anticlea_explains') {
      this.anticleaExplains.draw(ctx, 640, 140);
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
