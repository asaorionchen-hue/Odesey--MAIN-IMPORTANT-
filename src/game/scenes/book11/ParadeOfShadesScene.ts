import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B11 } from '../../Constants';
import { drawShade, makeCrowd, CrowdShade, drawCrowd } from '../../ShadeSystem';
import { getTextureImage } from '../../Textures';
import { DialogueQueue, ClickQuote } from '../../DialogueSystem';
import { ReturnToShipScene } from './ReturnToShipScene';

const SCENE_WIDTH = 4800;
const FLOOR_Y = 620;
const UNDERWORLD_RISE = 320;

function getUnderworldPathY(x: number): number {
  const t = x / SCENE_WIDTH; // 0 to 1
  return FLOOR_Y - (t * t * UNDERWORLD_RISE);
}

interface ShadeEncounter {
  id: string;
  name: string;
  x: number;
  color: string;
  glowColor: string;
  glowRadius: number;
  glowOpacity: number;
  opacity: number;
  height: number;
  width: number;
  turnedAway?: boolean;
  hasStaff?: boolean;
  staffColor?: string;
  broadShoulders?: boolean;
  dlg: DialogueQueue | null;
  triggered: boolean;
  triggerRadius: number;
  drinksBlood?: boolean;
  fadingAway?: boolean;       // Achilles strides off
  fadeTimer?: number;
  silentNote?: string;        // Ajax
  odysseusPlea?: ClickQuote;  // Ajax — Odysseus tries to speak
}

export class ParadeOfShadesScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  crowd: CrowdShade[] = [];
  encounters: ShadeEncounter[] = [];
  activeEncounter: ShadeEncounter | null = null;

  openingQuote: ClickQuote;

  // Ajax interaction state
  ajaxPhase: 'none' | 'plea' | 'silence' = 'none';
  ajaxPlea: ClickQuote | null = null;
  ajaxSilenceNote: ClickQuote | null = null;

  constructor() {
    super();
    this.openingQuote = new ClickQuote(
      'Many other spirits of the dead came, each telling of their grief. I moved among them as through smoke, and they could not touch me, nor I them.',
      '#d4b96a', 13, 700
    );
  }

  onEnter() {
    this.player = new Player(
      this.engine,
      80, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.player.gravityFactor = 1.0;
    this.player.frozen = true; // frozen during opening quote
    this.engine.camera.x = 0;

    this.crowd = makeCrowd(200, [0, SCENE_WIDTH], [200, 580]);

    this.encounters = [
      // ── Agamemnon ──────────────────────────────────────────
      {
        id: 'agamemnon', name: 'Agamemnon', x: 600, color: B11.agamemnon_dark,
        glowColor: '#706898', glowRadius: 25, glowOpacity: 0.28, opacity: 0.72,
        height: 76, width: 20, drinksBlood: true,
        dlg: new DialogueQueue([
          { text: 'Son of Laertes, resourceful Odysseus — what blow of harsh fate brought you down here while you are still alive?', color: B11.agamemnon_dark, fontSize: 13, speaker: 'Agamemnon' },
          { text: 'I was killed by Aegisthus and my accursed wife. He invited me to his house and killed me at dinner, like an ox slaughtered at the manger.', color: B11.agamemnon_dark, fontSize: 13, speaker: 'Agamemnon' },
          { text: 'She did not even close my eyes as I died. There is nothing more pitiful, nothing more shameful, than what she did.', color: B11.agamemnon_dark, fontSize: 13, speaker: 'Agamemnon' },
          { text: 'Do not be too trusting even with your own wife. Do not reveal everything to her. Tell her some things and hide others. Though your homecoming will not be like mine, Odysseus — Penelope is too wise and good.', color: B11.agamemnon_dark, fontSize: 13, speaker: 'Agamemnon' },
        ]),
        triggered: false, triggerRadius: 200,
      },
      // ── Achilles ───────────────────────────────────────────
      {
        id: 'achilles', name: 'Achilles', x: 1400, color: B11.achilles_bright,
        glowColor: '#c0b8f0', glowRadius: 45, glowOpacity: 0.55, opacity: 0.92,
        height: 88, width: 22, broadShoulders: true, drinksBlood: true,
        dlg: new DialogueQueue([
          { text: 'Son of Laertes, resourceful Odysseus — what greater deed are you planning now? How did you dare to come down here where the dead live as mindless phantoms?', color: B11.achilles_bright, fontSize: 13, speaker: 'Achilles' },
          { text: 'Do not try to make light of death to me, Odysseus.', color: B11.achilles_bright, fontSize: 16, speaker: 'Achilles' },
          { text: 'I would rather be a hired hand on earth, working the land for some other poor man who had little to live on, than be king of all the wasted dead.', color: B11.achilles_bright, fontSize: 14, speaker: 'Achilles' },
          { text: 'But tell me about my son Neoptolemus — did he go to war and become a leader? Tell me anything. Tell me he is brave.', color: B11.achilles_bright, fontSize: 13, speaker: 'Achilles' },
          { text: 'Your son is beyond compare. He was first to enter the wooden horse. He fights with excellent judgment. He is your son.', color: '#a09070', fontSize: 13, speaker: 'Odysseus' },
          { text: 'The spirit of swift-footed Achilles strode away across the meadow of asphodel, rejoicing that his son was outstanding.', color: '#a09070', fontSize: 12 },
        ]),
        triggered: false, triggerRadius: 220, fadingAway: false, fadeTimer: 0,
      },
      // ── Ajax ───────────────────────────────────────────────
      {
        id: 'ajax', name: 'Ajax', x: 2200, color: '#9088b8',
        glowColor: '#7068a0', glowRadius: 30, glowOpacity: 0.33, opacity: 0.75,
        height: 90, width: 24, turnedAway: true, drinksBlood: true,
        dlg: null,
        triggered: false, triggerRadius: 200,
        silentNote: 'Ajax says nothing. He turns further away. The silence says everything.',
      },
      // ── Heracles shade ─────────────────────────────────────
      {
        id: 'heracles', name: 'The shade of Heracles', x: 3200, color: '#c0b8d8',
        glowColor: '#a098c0', glowRadius: 30, glowOpacity: 0.25, opacity: 0.63,
        height: 94, width: 26, hasStaff: false,
        dlg: new DialogueQueue([
          { text: 'Son of Laertes — you too are working out some miserable fate, as I once worked out beneath the rays of the sun.', color: '#c0b8d8', fontSize: 13, speaker: 'Heracles' },
          { text: 'I was the son of Zeus, yet I had endless suffering. I know what it is.', color: '#c0b8d8', fontSize: 13, speaker: 'Heracles' },
        ]),
        triggered: false, triggerRadius: 200,
      },
    ];
  }

  update(dt: number) {
    this.time += dt;
    const inp = { 
      isDown: (k: string[]) => this.engine.input.isDown(k), 
      mouse: this.engine.input.mouse,
      keys: this.engine.input.keys
    };

    // Opening quote (click-through)
    if (!this.openingQuote.dismissed) {
      this.openingQuote.update(dt, inp);
      if (this.openingQuote.dismissed) this.player.frozen = false;
      return;
    }

    // Ajax special interaction
    if (this.ajaxPhase === 'plea' && this.ajaxPlea) {
      this.ajaxPlea.update(dt, inp);
      if (this.ajaxPlea.dismissed) {
        this.ajaxPhase = 'silence';
        this.ajaxSilenceNote = new ClickQuote(
          'Ajax says nothing. He turns further away into Erebus. The silence is worse than any accusation.',
          '#a09070', 12, 600
        );
      }
      return;
    }
    if (this.ajaxPhase === 'silence' && this.ajaxSilenceNote) {
      this.ajaxSilenceNote.update(dt, inp);
      if (this.ajaxSilenceNote.dismissed) {
        this.ajaxPhase = 'none';
        // Ajax fades into darkness
        const ajax = this.encounters.find(e => e.id === 'ajax');
        if (ajax) { ajax.fadingAway = true; ajax.fadeTimer = 0; }
        this.player.frozen = false;
      }
      return;
    }

    this.player.update(dt);

    // Camera follow
    const targetX = Math.max(0, Math.min(this.player.x - 640, SCENE_WIDTH - 1280));
    this.engine.camera.x += (targetX - this.engine.camera.x) * 5 * dt;

    // Crowd drifts left (opposite player)
    for (const s of this.crowd) {
      s.x -= 12 * dt;
      if (s.x < -50) s.x += SCENE_WIDTH + 100;
    }

    // Check encounter triggers
    for (const enc of this.encounters) {
      if (!enc.triggered && Math.abs(this.player.x - enc.x) < enc.triggerRadius) {
        enc.triggered = true;
        this.activeEncounter = enc;

        // Ajax special: show Odysseus's plea
        if (enc.id === 'ajax' && this.ajaxPhase === 'none') {
          this.ajaxPhase = 'plea';
          this.ajaxPlea = new ClickQuote(
            'Ajax, son of great Telamon, could you not even in death forget your anger over those cursed arms? The gods made them a bane to us. We lost a tower of strength when you died. We grieve for you as we grieve for Achilles.',
            '#a09070', 13, 680
          );
          this.player.frozen = true;
        }
      }
    }

    // Update active dialogue (click-through)
    if (this.activeEncounter?.dlg && !this.activeEncounter.dlg.isComplete()) {
      this.activeEncounter.dlg.update(dt, inp);
      // Achilles: after last line (departure), start fade
      if (this.activeEncounter.id === 'achilles' && this.activeEncounter.dlg.isComplete()) {
        this.activeEncounter.fadingAway = true;
        this.activeEncounter.fadeTimer = 0;
      }
    }

    // Update fading shades
    for (const enc of this.encounters) {
      if (enc.fadingAway) {
        enc.fadeTimer = (enc.fadeTimer ?? 0) + dt;
        enc.opacity = Math.max(0, enc.opacity - dt * 0.25);
        enc.x += 30 * dt; // stride into dark
      }
    }

    for (const a of this.arrows) a.update(dt);
    this.arrows = this.arrows.filter(a => a.active);

    // Exit — transition directly to ReturnToShipScene (no punishment scene)
    if (this.player.x >= SCENE_WIDTH - 80 && this.engine.transitionState === 'none') {
      this.engine.switchScene(new ReturnToShipScene(), 800);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Erebus void ──────────────────────────────────────────────
    ctx.fillStyle = B11.erebus_black;
    ctx.fillRect(0, 0, 1280, 720);
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      ctx.globalAlpha = 0.05; // Ghostly moon
      ctx.drawImage(moonImg, 400, 80, 120, 120);
      ctx.restore();
    }

    // ── Underworld misty depth (rising path) ────────────────────
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    for (let lx = 0; lx <= SCENE_WIDTH; lx += 50) {
      ctx.lineTo(lx, getUnderworldPathY(lx));
    }
    ctx.lineTo(SCENE_WIDTH, FLOOR_Y);
    ctx.closePath();
    
    const depthGrad = ctx.createLinearGradient(0, FLOOR_Y - UNDERWORLD_RISE, 0, FLOOR_Y);
    depthGrad.addColorStop(0, 'rgba(26, 20, 40, 0.45)'); // underworld_mid-ish
    depthGrad.addColorStop(1, 'rgba(2, 1, 10, 0)');      // erebus_black-ish
    ctx.fillStyle = depthGrad;
    ctx.fill();
    ctx.restore();

    // ── Asphodel meadow ──────────────────────────────────────────
    this.drawAsphodel(ctx);

    // ── Far shade masses ─────────────────────────────────────────
    drawCrowd(ctx, this.crowd, B11.shade_faint, 0.18, this.time, -100, SCENE_WIDTH + 100, SCENE_WIDTH + 200);

    // ── Floor ────────────────────────────────────────────────────
    ctx.fillStyle = '#1e1c2c';
    ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 100);
    ctx.fillStyle = '#282638';
    ctx.fillRect(0, FLOOR_Y, SCENE_WIDTH, 2);

    // ── Shade encounters ─────────────────────────────────────────
    for (const enc of this.encounters) {
      if (enc.opacity <= 0.01) continue;
      drawShade(ctx, {
        x: enc.x, y: FLOOR_Y,
        height: enc.height, width: enc.width,
        color: enc.color, opacity: enc.opacity,
        glowColor: enc.glowColor, glowRadius: enc.glowRadius, glowOpacity: enc.glowOpacity,
        turnedAway: enc.turnedAway,
      });
      // Name label
      ctx.fillStyle = enc.color;
      ctx.font = '10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText(enc.name, enc.x, FLOOR_Y - enc.height - 14);
      ctx.globalAlpha = 1;
    }

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);

    // ── HUD: dialogue (camera-fixed) ────────────────────────────
    ctx.save();
    ctx.translate(camX, 0);

    // Opening quote
    if (!this.openingQuote.dismissed) {
      this.openingQuote.draw(ctx, 640, 140);
    }

    // Active shade dialogue
    if (this.activeEncounter?.dlg && !this.activeEncounter.dlg.isComplete()) {
      // Dark dialogue bar at bottom
      ctx.fillStyle = 'rgba(2,1,10,0.82)';
      ctx.fillRect(30, 80, 1220, 100);
      this.activeEncounter.dlg.draw(ctx, 640, 92, 1100);
    }

    // Ajax overlays
    if (this.ajaxPlea && this.ajaxPhase === 'plea') {
      this.ajaxPlea.draw(ctx, 640, 140);
    }
    if (this.ajaxSilenceNote && this.ajaxPhase === 'silence') {
      this.ajaxSilenceNote.draw(ctx, 640, 140);
    }

    ctx.restore();
  }

  private drawAsphodel(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = B11.asphodel_stem;
    const spacing = 28;
    for (let sx = 0; sx < SCENE_WIDTH; sx += spacing) {
      const h = 20 + (sx * 7 % 30);
      const sway = Math.sin(this.time * 0.2 + sx * 0.01) * 2;
      ctx.fillRect(sx + sway, FLOOR_Y - h, 2, h);
      ctx.fillStyle = B11.asphodel_bloom;
      ctx.beginPath();
      ctx.arc(sx + 1 + sway, FLOOR_Y - h - 5, 4 + (sx * 3 % 4), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = B11.asphodel_stem;
    }
  }
}
