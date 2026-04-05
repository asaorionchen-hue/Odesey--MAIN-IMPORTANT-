import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B5 } from '../../Constants';
import { DialogueQueue } from '../../DialogueSystem';
import { getTextureImage } from '../../Textures';

const FLOOR_Y = 540;

interface CraftTree {
  x: number; species: string; color: string;
  felled: boolean; fellTimer: number; fellAngle: number;
  smoothed: boolean; smoothProgress: number;
  pickedUp: boolean; placed: boolean;
}

export class RaftBuildingScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  stage = 1; // 1=felling, 2=smoothing, 3=assembly, 4=provisioning
  dayTransitionTimer = 0;
  dayTransitionText = '';
  showDayCard = false;

  trees: CraftTree[] = [];
  // Raft frame
  raftPlanksPlaced = 0;
  mastBuilt = false;
  mastAnimTimer = 0;
  carrying = false;

  // Stage 4
  provisionStep = 0;
  provisionTimer = 0;
  calypsoX = 900;
  calypsoWalking = false;

  // Farewell
  farewellDlg: DialogueQueue | null = null;
  farewellActive = false;

  onEnter() {
    this.player = new Player(
      this.engine, 100, FLOOR_Y, 'right',
      () => FLOOR_Y,
      (a) => this.arrows.push(a)
    );
    this.engine.camera.x = 0;

    this.trees = [
      { x: 200, species: 'alder', color: '#2a1e08', felled: false, fellTimer: 0, fellAngle: 0, smoothed: false, smoothProgress: 0, pickedUp: false, placed: false },
      { x: 420, species: 'poplar', color: '#1a1408', felled: false, fellTimer: 0, fellAngle: 0, smoothed: false, smoothProgress: 0, pickedUp: false, placed: false },
      { x: 660, species: 'alder', color: '#2a1e08', felled: false, fellTimer: 0, fellAngle: 0, smoothed: false, smoothProgress: 0, pickedUp: false, placed: false },
      { x: 880, species: 'cypress', color: '#0e1a0a', felled: false, fellTimer: 0, fellAngle: 0, smoothed: false, smoothProgress: 0, pickedUp: false, placed: false },
      { x: 1080, species: 'poplar', color: '#1a1408', felled: false, fellTimer: 0, fellAngle: 0, smoothed: false, smoothProgress: 0, pickedUp: false, placed: false },
    ];

    this.farewellDlg = new DialogueQueue([
      { text: 'Odysseus, go home. I send you away gladly.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'Keep the Great Bear on your left as you sail.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'After seventeen days you will see the mountains of Scheria.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'May you be happy there.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'If you knew what suffering is waiting — you would stay here with me and be immortal.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
      { text: 'But your fate pulls you, and I cannot hold you.', color: B5.flower_violet, fontSize: 14, speaker: 'CALYPSO', speakerColor: B5.flower_violet },
    ]);
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };
    const interact = this.engine.input.isDown(['KeyE', 'Space', 'Enter']);

    // Day transition card
    if (this.showDayCard) {
      this.dayTransitionTimer += dt;
      if (this.dayTransitionTimer > 2.0) {
        this.showDayCard = false;
        this.dayTransitionTimer = 0;
      }
      return;
    }

    // Farewell dialogue
    if (this.farewellActive && this.farewellDlg) {
      this.farewellDlg.update(dt, inp);
      if (this.farewellDlg.done) {
        this.farewellActive = false;
        // Transition to departure
        import('./CalypsoDepartureScene').then(({ CalypsoDepartureScene }) => {
          this.engine.switchScene(new CalypsoDepartureScene(), 800);
        });
      }
      return;
    }

    this.player.update(dt);

    // Stage 1: Tree felling
    if (this.stage === 1) {
      for (const t of this.trees) {
        if (t.felled) {
          // Animate falling
          if (t.fellAngle < 90) {
            t.fellTimer += dt;
            t.fellAngle = Math.min(90, (t.fellTimer / 0.8) * 90);
          }
          continue;
        }
        if (Math.abs(this.player.x - t.x) < 40 && interact) {
          this.player.startAttack();
          t.felled = true;
          t.fellTimer = 0;
          this.engine.input.keys['KeyE'] = false;
          this.engine.input.keys['Space'] = false;
        }
      }
      if (this.trees.every(t => t.felled && t.fellAngle >= 90)) {
        this.stage = 2;
        this.showDayCard = true;
        this.dayTransitionText = 'DAY TWO';
      }
    }

    // Stage 2: Log smoothing
    if (this.stage === 2) {
      for (const t of this.trees) {
        if (t.smoothed) continue;
        if (Math.abs(this.player.x - t.x) < 40 && interact) {
          t.smoothProgress += dt / 1.5;
          if (t.smoothProgress >= 1) {
            t.smoothed = true;
            t.smoothProgress = 1;
          }
        }
      }
      if (this.trees.every(t => t.smoothed)) {
        this.stage = 3;
        this.showDayCard = true;
        this.dayTransitionText = 'DAY THREE';
      }
    }

    // Stage 3: Raft assembly
    if (this.stage === 3) {
      if (!this.carrying) {
        // Pick up nearest unplaced log
        for (const t of this.trees) {
          if (t.placed || t.pickedUp) continue;
          if (Math.abs(this.player.x - t.x) < 40 && interact) {
            t.pickedUp = true;
            this.carrying = true;
            this.engine.input.keys['KeyE'] = false;
            this.engine.input.keys['Space'] = false;
            break;
          }
        }
      } else {
        // Place in raft frame
        if (Math.abs(this.player.x - 660) < 180 && interact) {
          const carried = this.trees.find(t => t.pickedUp && !t.placed);
          if (carried) {
            carried.placed = true;
            carried.pickedUp = false;
            this.carrying = false;
            this.raftPlanksPlaced++;
            this.engine.input.keys['KeyE'] = false;
            this.engine.input.keys['Space'] = false;
          }
        }
      }

      if (this.raftPlanksPlaced >= 5 && !this.mastBuilt) {
        this.mastBuilt = true;
        this.mastAnimTimer = 0;
      }
      if (this.mastBuilt) {
        this.mastAnimTimer += dt;
        if (this.mastAnimTimer > 1.2) {
          this.stage = 4;
          this.showDayCard = true;
          this.dayTransitionText = 'DAY FOUR';
          this.player.frozen = true;
        }
      }
    }

    // Stage 4: Provisioning (scripted)
    if (this.stage === 4) {
      this.provisionTimer += dt;
      if (!this.calypsoWalking && this.provisionTimer > 0.5) {
        this.calypsoWalking = true;
      }
      if (this.calypsoWalking && this.calypsoX > 540) {
        this.calypsoX -= 80 * dt;
      }
      // Place provisions one by one
      const provisionTimes = [3.0, 4.5, 6.0, 7.5];
      for (let i = 0; i < provisionTimes.length; i++) {
        if (this.provisionTimer > provisionTimes[i] && this.provisionStep <= i) {
          this.provisionStep = i + 1;
        }
      }
      if (this.provisionTimer > 9.0 && !this.farewellActive) {
        this.farewellActive = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // ── Sky ──────────────────────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
    skyGrad.addColorStop(0, '#2a4a6a');
    skyGrad.addColorStop(1, '#6a9aaa');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 400);
    
    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      const moonX = 1100;
      const moonY = 100;
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

      ctx.globalAlpha = 0.3; // Faint daylight moon?
      ctx.drawImage(moonImg, moonX - moonSize/2, moonY - moonSize/2, moonSize, moonSize);
      ctx.restore();
    }

    // Sea
    ctx.fillStyle = B5.sea_surface;
    ctx.fillRect(0, 400, 1280, 140);

    // Ground
    ctx.fillStyle = B5.sand_dry;
    ctx.fillRect(0, FLOOR_Y, 1280, 180);

    // ── Trees / Logs ─────────────────────────────────────────────
    for (const t of this.trees) {
      if (!t.felled) {
        // Standing tree
        ctx.fillStyle = t.color;
        ctx.fillRect(t.x - 6, FLOOR_Y - 120, 12, 120);
        ctx.fillStyle = '#2a4a1a';
        ctx.beginPath();
        ctx.ellipse(t.x, FLOOR_Y - 130, 24, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (!t.placed) {
        // Falling or fallen log
        ctx.save();
        ctx.translate(t.x, FLOOR_Y);
        ctx.rotate((t.fellAngle * Math.PI) / 180);
        const logColor = t.smoothed ? '#6a4828' : '#4a3018';
        ctx.fillStyle = logColor;
        ctx.fillRect(-6, -120, 12, 120);
        if (t.fellAngle < 90) {
          ctx.fillStyle = '#2a4a1a';
          ctx.beginPath();
          ctx.ellipse(0, -130, 24, 40, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Smoothing progress bar
        if (this.stage === 2 && !t.smoothed && t.smoothProgress > 0) {
          ctx.fillStyle = '#2a1a08';
          ctx.fillRect(t.x - 30, FLOOR_Y - 150, 60, 6);
          ctx.fillStyle = '#c8a030';
          ctx.fillRect(t.x - 30, FLOOR_Y - 150, 60 * t.smoothProgress, 6);
        }
      }
    }

    // ── Raft frame ───────────────────────────────────────────────
    if (this.stage >= 3) {
      const rx = 500, ry = FLOOR_Y - 80, rw = 320, rh = 80;
      // Frame border
      ctx.strokeStyle = B5.raft_wood;
      ctx.lineWidth = 4;
      ctx.strokeRect(rx, ry, rw, rh);

      // Placed planks
      for (let i = 0; i < this.raftPlanksPlaced; i++) {
        ctx.fillStyle = '#6a4828';
        ctx.fillRect(rx + 4 + i * 62, ry + 4, 58, rh - 8);
      }

      // Empty slots
      for (let i = this.raftPlanksPlaced; i < 5; i++) {
        ctx.fillStyle = '#2a1808';
        ctx.fillRect(rx + 4 + i * 62, ry + 4, 58, rh - 8);
      }

      // Mast
      if (this.mastBuilt) {
        const mastH = Math.min((this.mastAnimTimer / 1.2) * 120, 120);
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(rx + rw / 2 - 4, ry - mastH, 8, mastH);
        if (mastH >= 120) {
          // Sail
          ctx.fillStyle = '#c8b090';
          ctx.fillRect(rx + rw / 2 + 6, ry - 110, 60, 50);
          // Wicker railing
          ctx.strokeStyle = '#8a6a30';
          ctx.lineWidth = 2;
          ctx.strokeRect(rx - 2, ry - 10, rw + 4, 10);
        }
      }

      // Provisions
      if (this.stage === 4) {
        const provisions = [
          { color: '#4a1a1a', ox: -80 }, { color: '#2a3a5a', ox: -40 },
          { color: '#6a4a28', ox: 20 }, { color: '#2a1e3a', ox: 60 },
        ];
        for (let i = 0; i < this.provisionStep; i++) {
          ctx.fillStyle = provisions[i].color;
          ctx.fillRect(rx + rw / 2 + provisions[i].ox - 8, ry - 10, 16, 10);
        }
      }
    }

    // ── Calypso (Stage 4) ────────────────────────────────────────
    if (this.stage === 4) {
      ctx.fillStyle = '#2a1e3a';
      ctx.fillRect(this.calypsoX - 8, FLOOR_Y - 50, 16, 50);
      ctx.fillStyle = '#e0d0c0';
      ctx.beginPath();
      ctx.arc(this.calypsoX, FLOOR_Y - 56, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8a030';
      ctx.beginPath();
      ctx.arc(this.calypsoX, FLOOR_Y - 60, 6, Math.PI, 0);
      ctx.fill();
    }

    // ── Carrying indicator ───────────────────────────────────────
    if (this.carrying) {
      ctx.fillStyle = '#6a4828';
      ctx.fillRect(this.player.x - 20, this.player.y - 70, 40, 6);
    }

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);

    // ── Day transition card ──────────────────────────────────────
    if (this.showDayCard) {
      const alpha = this.dayTransitionTimer < 0.5 ? this.dayTransitionTimer / 0.5
        : this.dayTransitionTimer > 1.5 ? 1 - (this.dayTransitionTimer - 1.5) / 0.5
        : 1;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * Math.max(0, alpha)})`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = B5.text_quote;
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.dayTransitionText, 640, 360);
      ctx.globalAlpha = 1;
    }

    // ── Instructions ─────────────────────────────────────────────
    if (!this.showDayCard) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(440, 20, 400, 36);
      ctx.fillStyle = '#c8b080';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.stage === 1) ctx.fillText('Walk to each tree and press E to fell it', 640, 38);
      else if (this.stage === 2) ctx.fillText('Stand on each log and hold E to smooth it', 640, 38);
      else if (this.stage === 3 && !this.carrying) ctx.fillText('Press E near a log to pick it up', 640, 38);
      else if (this.stage === 3 && this.carrying) ctx.fillText('Walk to the raft frame and press E to place', 640, 38);
      else if (this.stage === 4) ctx.fillText('Calypso provisions the raft...', 640, 38);
    }

    // ── Farewell dialogue ────────────────────────────────────────
    if (this.farewellActive && this.farewellDlg) {
      this.farewellDlg.draw(ctx, 640, 140, 800);
    }

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }

  startAttack() {
    // Alias for player attack used by tree felling
    this.player.startAttack();
  }
}
