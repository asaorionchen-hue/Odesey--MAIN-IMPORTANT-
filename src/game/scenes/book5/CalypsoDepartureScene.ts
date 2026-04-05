import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B5, B12, DEFAULT_FADE_MS } from '../../Constants';
import { DialogueQueue } from '../../DialogueSystem';
import { getTextureImage } from '../../Textures';

const SCENE_WIDTH = 3840;

interface WaveSurge {
  height: number; color: string; foam: string; delay: number;
  active: boolean; x: number;
}

export class CalypsoDepartureScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  panX = 0;

  // Storm
  stormTriggered = false;
  stormTimer = 0;
  stormPhase: 'none' | 'darkening' | 'waves' | 'break' | 'ino' = 'none';
  lightningflashes: { time: number; x: number; dur: number }[] = [];

  // Poseidon dialogue
  poseidonDlg: DialogueQueue | null = null;
  poseidonDlgActive = false;

  // Ino
  inoVisible = false;
  inoDlg: DialogueQueue | null = null;
  inoDlgActive = false;

  // Wave surges
  waveSurges: WaveSurge[] = [];
  raftBroken = false;
  raftTilt = 0;

  // Raft
  raftY = 560;
  raftBobPhase = 0;

  // Stars for night
  stars: { x: number; y: number; size: number }[] = [];

  // Complete flag
  completed = false;

  onEnter() {
    this.player = new Player(
      this.engine, 200, this.raftY - 60, 'right',
      () => this.raftY - 60,
      (a) => this.arrows.push(a)
    );
    this.player.frozen = true;
    this.engine.camera.x = 0;

    for (let i = 0; i < 400; i++) {
      this.stars.push({ x: Math.random() * 1280, y: Math.random() * 200, size: Math.random() > 0.8 ? 2 : 1 });
    }

    this.poseidonDlg = new DialogueQueue([
      { text: 'So the gods have changed their minds while I was away.', color: '#6a9aff', fontSize: 14, speaker: 'POSEIDON', speakerColor: '#6a9aff' },
      { text: 'He has reached the coast — but he will suffer more first.', color: '#6a9aff', fontSize: 14, speaker: 'POSEIDON', speakerColor: '#6a9aff' },
      { text: 'I will give him his fill of trouble.', color: '#6a9aff', fontSize: 14, speaker: 'POSEIDON', speakerColor: '#6a9aff' },
    ]);

    this.inoDlg = new DialogueQueue([
      { text: 'Poor man. Why does Poseidon hate you so?', color: '#e8e0d0', fontSize: 14, speaker: 'INO', speakerColor: '#c8d8e8' },
      { text: 'Take this veil and tie it around your chest.', color: '#e8e0d0', fontSize: 14, speaker: 'INO', speakerColor: '#c8d8e8' },
      { text: 'It is divine — you will not drown and you will not be hurt.', color: '#e8e0d0', fontSize: 14, speaker: 'INO', speakerColor: '#c8d8e8' },
      { text: 'When you reach land untie it and throw it back into the sea, looking away.', color: '#e8e0d0', fontSize: 14, speaker: 'INO', speakerColor: '#c8d8e8' },
    ]);

    this.waveSurges = [
      { height: 180, color: '#0e2030', foam: '#c8dce8', delay: 0, active: false, x: 1400 },
      { height: 220, color: '#0a1828', foam: '#c8dce8', delay: 1.2, active: false, x: 1400 },
      { height: 260, color: '#060e14', foam: '#c8dce8', delay: 2.6, active: false, x: 1400 },
    ];
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    // Poseidon dialogue
    if (this.poseidonDlgActive && this.poseidonDlg) {
      this.poseidonDlg.update(dt, inp);
      if (this.poseidonDlg.done) {
        this.poseidonDlgActive = false;
        this.stormPhase = 'waves';
        this.stormTimer = 0;
      }
    }

    // Ino dialogue
    if (this.inoDlgActive && this.inoDlg) {
      this.inoDlg.update(dt, inp);
      if (this.inoDlg.done) {
        this.inoDlgActive = false;
        this.completed = true;
      }
    }

    // Auto-pan
    if (!this.stormTriggered || this.stormPhase === 'none') {
      this.panX += 60 * dt;
    }
    this.engine.camera.x = this.panX;
    this.player.x = this.panX + 200;
    this.player.y = this.raftY - 60;

    // Raft bob
    this.raftBobPhase += dt;
    this.raftY = 560 + Math.sin(this.raftBobPhase * 0.6 * Math.PI * 2) * 4;

    // Storm trigger
    if (!this.stormTriggered && this.panX >= 2800) {
      this.stormTriggered = true;
      this.stormPhase = 'darkening';
      this.stormTimer = 0;
      this.lightningflashes = [
        { time: 0.8, x: 0.6, dur: 0.08 },
        { time: 1.6, x: 0.3, dur: 0.06 },
        { time: 2.4, x: 0.8, dur: 0.10 },
      ];
    }

    // Storm phases
    if (this.stormPhase === 'darkening') {
      this.stormTimer += dt;
      if (this.stormTimer > 3.0) {
        this.poseidonDlgActive = true;
      }
    }

    if (this.stormPhase === 'waves') {
      this.stormTimer += dt;
      for (const w of this.waveSurges) {
        if (!w.active && this.stormTimer > w.delay) {
          w.active = true;
          w.x = this.panX + 1400;
        }
        if (w.active) {
          w.x -= 200 * dt;
        }
      }
      // Raft tilt
      this.raftTilt = Math.sin(this.stormTimer * 2) * 30;

      // Raft breaks after 3.8s
      if (this.stormTimer > 3.8 && !this.raftBroken) {
        this.raftBroken = true;
        this.engine.shake(8, 1000, 8);
        this.stormPhase = 'ino';
        this.stormTimer = 0;
      }
    }

    if (this.stormPhase === 'ino') {
      this.stormTimer += dt;
      if (this.stormTimer > 1.5 && !this.inoVisible) {
        this.inoVisible = true;
      }
      if (this.stormTimer > 3.0 && !this.inoDlgActive) {
        this.inoDlgActive = true;
      }
    }

    // Transition after completion
    if (this.completed) {
      this.completed = false; // prevent double calls
      // Chapter transition to Book XII
      import('../book12/CirceWarningScene').then(({ CirceWarningScene }) => {
        this.engine.switchScene(new CirceWarningScene(), DEFAULT_FADE_MS);
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;

    // ── Sky (day/night cycle) ────────────────────────────────────
    const phases = ['dawn', 'day', 'dusk', 'night', 'dawn', 'day', 'dusk'] as const;
    const phaseWidth = 548;
    const colors = {
      dawn: { top: '#2a2a4a', bottom: '#8a5a3a' },
      day: { top: '#3a5a8a', bottom: '#6a9aaa' },
      dusk: { top: '#2a1a2a', bottom: '#8a3a1a' },
      night: { top: '#0a0a1a', bottom: '#1a1a2e' },
    };

    // Determine current phase based on camera X
    const phaseIndex = Math.min(Math.floor(camX / phaseWidth), phases.length - 1);
    const phaseT = (camX % phaseWidth) / phaseWidth;
    const currPhase = colors[phases[phaseIndex]];
    const nextPhase = colors[phases[Math.min(phaseIndex + 1, phases.length - 1)]];

    const lerpColor = (a: string, b: string, t: number) => {
      const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
      const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
      const r = Math.round(pa[0] + (pb[0]-pa[0])*t);
      const g = Math.round(pa[1] + (pb[1]-pa[1])*t);
      const bl = Math.round(pa[2] + (pb[2]-pa[2])*t);
      return `rgb(${r},${g},${bl})`;
    };

    // Storm override
    let skyTop = lerpColor(currPhase.top, nextPhase.top, phaseT);
    let skyBot = lerpColor(currPhase.bottom, nextPhase.bottom, phaseT);
    if (this.stormPhase !== 'none' && this.stormTriggered) {
      const darkT = Math.min(this.stormTimer / 3.0, 1);
      skyTop = lerpColor(skyTop, '#1a1a2a', darkT);
      skyBot = lerpColor(skyBot, '#1a1a2a', darkT);
    }

    // Sky (day/night cycle) - locked to screen
    const skyP = 0;
    const skyX = -camX * skyP;

    ctx.save();
    ctx.translate(camX + skyX, 0); // Offset engine's -camX
    
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 400);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, SCENE_WIDTH, 400);

    // Sun/Moon montage loop
    if (this.stormPhase === 'none' || !this.stormTriggered) {
      const cycleT = (camX % phaseWidth) / phaseWidth; // 0 to 1
      const isDay = phases[phaseIndex] === 'dawn' || phases[phaseIndex] === 'day' || phases[phaseIndex] === 'dusk';
      
      const arcWidth = 1000;
      const arcH = 300;
      // Start below horizon, peak at 100, end below horizon
      const objX = camX + 1280 * cycleT;
      const objY = 420 - Math.sin(cycleT * Math.PI) * arcH;

      if (isDay) {
        // Sun
        ctx.fillStyle = '#ffeedd';
        ctx.beginPath();
        ctx.arc(objX, objY, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.time * 2);
        ctx.fillStyle = '#ffaa44';
        ctx.beginPath();
        ctx.arc(objX, objY, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // Moon
        const moonImg = getTextureImage('moon_phase_1');
        if (moonImg) {
          ctx.save();
          const moonSize = 75;
          
          // Enhanced Moon glow
          const glowGrad = ctx.createRadialGradient(objX, objY, 0, objX, objY, 110);
          glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
          glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
          glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(objX, objY, 110, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.globalAlpha = 1;
          ctx.drawImage(moonImg, objX - moonSize / 2, objY - moonSize / 2, moonSize, moonSize);
          ctx.restore();
        } else {
          // Fallback legacy moon
          ctx.fillStyle = '#ddeeff';
          ctx.beginPath();
          ctx.arc(objX, objY, 30, 0, Math.PI * 2);
          ctx.fill();
          // Moon glow
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#88aadd';
          ctx.beginPath();
          ctx.arc(objX, objY, 45, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Stars during night phases
    const isNightish = phases[phaseIndex] === 'night' || phases[phaseIndex] === 'dusk';
    if (isNightish) {
      ctx.fillStyle = '#e8e0d0';
      for (const s of this.stars) {
        // Star is on screen if its translated position is within viewport bounds
        if (s.x > -skyX - 100 && s.x < -skyX + 1380) {
          ctx.fillRect(s.x, s.y, s.size, s.size);
        }
      }

      // Great Bear constellation
      const bearStars = [
        { x: 0, y: 0 }, { x: 20, y: -8 }, { x: 42, y: -12 }, { x: 60, y: -6 },
        { x: 80, y: 4 }, { x: 65, y: 18 }, { x: 48, y: 24 },
      ];
      const bx = 1000, by = 60;
      ctx.fillStyle = '#e8e0d0';
      for (const bs of bearStars) {
        ctx.beginPath();
        ctx.arc(bx + bs.x, by + bs.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#6a6860';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx + bearStars[0].x, by + bearStars[0].y);
      for (let i = 1; i < bearStars.length; i++) {
        ctx.lineTo(bx + bearStars[i].x, by + bearStars[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Lightning
    if (this.stormTriggered) {
      for (const lf of this.lightningflashes) {
        if (Math.abs(this.stormTimer - lf.time) < lf.dur) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.fillRect(0, 0, 1280, 720);
        }
      }
    }

    // Cloud polygons during storm
    if (this.stormTriggered && this.stormPhase !== 'none') {
      ctx.fillStyle = '#0a0810';
      for (let i = 0; i < 8; i++) {
        const cx2 = 160 * i;
        ctx.beginPath();
        ctx.ellipse(cx2, 80 + Math.sin(i * 1.3) * 30, 120, 50, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // ── Sea ──────────────────────────────────────────────────────
    ctx.fillStyle = B5.sea_mid;
    ctx.fillRect(0, 400, SCENE_WIDTH, 320);

    // ── Wave surges (storm) ──────────────────────────────────────
    for (const w of this.waveSurges) {
      if (!w.active) continue;
      ctx.fillStyle = w.color;
      ctx.fillRect(w.x, 720 - w.height, 200, w.height);
      ctx.fillStyle = w.foam;
      ctx.fillRect(w.x, 720 - w.height, 200, 6);
    }

    // ── Raft ─────────────────────────────────────────────────────
    if (!this.raftBroken) {
      ctx.save();
      const raftCX = this.panX + 200;
      const raftCY = this.raftY;
      ctx.translate(raftCX, raftCY);
      ctx.rotate((this.raftTilt * Math.PI) / 180);
      // Hull
      ctx.fillStyle = '#6a4828';
      ctx.fillRect(-160, 0, 320, 30);
      // Mast
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(-4, -120, 8, 120);
      // Sail (billow)
      const billow = Math.sin(this.time * 0.5 * Math.PI * 2) * 8;
      ctx.fillStyle = '#c8b090';
      ctx.beginPath();
      ctx.moveTo(6, -110);
      ctx.quadraticCurveTo(56 + billow, -70, 6, -30);
      ctx.fill();
      ctx.restore();
    } else {
      // Scattered planks
      for (let i = 0; i < 5; i++) {
        const px = this.panX + 100 + i * 60 + Math.sin(this.time + i) * 20;
        const py = 560 + Math.cos(this.time * 0.8 + i) * 8;
        ctx.fillStyle = '#6a4828';
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.sin(this.time + i * 2) * 0.3);
        ctx.fillRect(-20, -3, 40, 6);
        ctx.restore();
      }
    }

    // ── Player ───────────────────────────────────────────────────
    if (!this.raftBroken) {
      this.player.draw(ctx);
    }

    // ── Ino (glowing bird) ───────────────────────────────────────
    if (this.inoVisible) {
      const ix = this.panX + 640;
      const iy = 480 + Math.sin(this.time * 2) * 10;
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#c8d8e8';
      ctx.beginPath();
      ctx.arc(ix, iy, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8e0d0';
      // Bird body
      ctx.beginPath();
      ctx.ellipse(ix, iy, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Wings
      const wing = Math.sin(this.time * 6) * 0.4;
      ctx.save();
      ctx.translate(ix - 10, iy);
      ctx.rotate(-0.5 + wing);
      ctx.fillRect(-16, -2, 16, 4);
      ctx.restore();
      ctx.save();
      ctx.translate(ix + 10, iy);
      ctx.rotate(0.5 - wing);
      ctx.fillRect(0, -2, 16, 4);
      ctx.restore();
      ctx.restore();
    }

    // ── Dialogue overlays (viewport fixed) ───────────────────────
    ctx.save();
    ctx.translate(camX, 0);
    if (this.poseidonDlgActive && this.poseidonDlg) {
      this.poseidonDlg.draw(ctx, 640 + camX, 140, 800);
    }
    if (this.inoDlgActive && this.inoDlg) {
      this.inoDlg.draw(ctx, 640 + camX, 140, 800);
    }
    ctx.restore();

    // ── Chapter transition card ──────────────────────────────────
    if (this.completed) {
      ctx.save();
      ctx.translate(camX, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = B12.divine_gold;
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BOOK XII — SCYLLA AND CHARYBDIS', 640 + camX, 360);
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
