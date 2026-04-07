import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE } from '../Constants';
import { CorridorScene } from './CorridorScene';
import { fillWithTexture, getTextureImage } from '../Textures';
import retroTreeUrl from '../../RetroTree.png';
import { drawThought } from '../DrawThought';
import { Suitor } from '../Suitor';
import { DustMotes } from '../DustMotes';

const treeImg = new Image();
treeImg.src = retroTreeUrl;

type HallPhase = 'trial' | 'fight' | 'victory_wait' | 'victory_text' | 'victory_done' | 'dead';

export class GreatHallScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  thoughtAlpha = 0;
  
  axes = Array.from({length: 12}, (_, i) => ({
    x: 580 + i * 126,
    y: 640,
    threaded: false
  }));
  
  embers: {x: number, y: number, life: number}[] = [];
  
  windowStars = Array.from({length: 120}, () => ({
    x: Math.random() * 2560 * 1.5,
    y: 120 + Math.random() * 160,
    phase: Math.random() * Math.PI * 2
  }));
  
  windowTrees = Array.from({length: 150}, (_, i) => ({
    x: i * 20 + (Math.random() * 20 - 10),
    height: 25 + Math.random() * 60,
    index: Math.floor(Math.random() * 8),
    flipped: Math.random() > 0.5
  }));

  backgroundCache: HTMLCanvasElement | null = null;
  filteredTreeMask: HTMLCanvasElement | null = null;
  windowClipPath: Path2D | null = null;
  flashMessage = '';
  flashTimer = 0;
  
  trialCompletedTime = 0;

  phase: HallPhase = 'trial';
  suitors: Suitor[] = [];
  fightTime = 0;
  victoryTimer = 0;
  victoryTextAlpha = 0;
  damageFlash = 0;
  deathFadeTimer = 0;
  dustMotes = new DustMotes({ sceneWidth: 2560, sceneHeight: 620, count: 25, color: '180, 160, 130', speed: 0.8 });

  onEnter(direction: 'left' | 'right' = 'left') {
    const spawnX = direction === 'right' ? 2460 : 120;
    const facing = direction === 'right' ? 'left' : 'right';

    this.player = new Player(
      this.engine, 
      spawnX, 640, facing, 
      () => 650,
      (arrow) => this.arrows.push(arrow)
    );
    this.engine.globalState.trialActive = true;
    this.engine.camera.x = Math.max(0, Math.min(this.player.x - 640, 2560 - 1280));
  }

  update(dt: number) {
    this.time += dt;
    // Thought fades in over 2s then stays
    if (this.thoughtAlpha < 1) this.thoughtAlpha = Math.min(1, this.thoughtAlpha + dt / 2);
    
    if (this.phase === 'trial') {
      this.updateTrial(dt);
    } else if (this.phase === 'fight') {
      this.updateFight(dt);
    } else if (this.phase === 'victory_wait') {
      this.victoryTimer += dt;
      if (this.victoryTimer >= 1.5) {
        this.phase = 'victory_text';
        this.victoryTimer = 0;
      }
    } else if (this.phase === 'victory_text') {
      this.victoryTimer += dt;
      if (this.victoryTimer < 1.0) {
        this.victoryTextAlpha = this.victoryTimer / 1.0;
      } else if (this.victoryTimer < 3.0) {
        this.victoryTextAlpha = 1.0;
      } else if (this.victoryTimer < 3.5) {
        this.victoryTextAlpha = 1.0 - (this.victoryTimer - 3.0) / 0.5;
      } else {
        this.phase = 'victory_done';
        this.victoryTimer = 0;
      }
    } else if (this.phase === 'victory_done') {
      this.victoryTimer += dt;
      if (this.victoryTimer >= 0.4 && this.engine.transitionState === 'none') {
        this.engine.switchScene(new CorridorScene(), 600);
      }
    } else if (this.phase === 'dead') {
      this.deathFadeTimer += dt;
      if (this.deathFadeTimer >= 2.5 && this.engine.input.isDown(['Space', 'Enter'])) {
        // Restart the fight
        this.phase = 'fight';
        this.player.frozen = false;
        this.player.x = 120;
        this.player.vx = 0;
        this.deathFadeTimer = 0;
        this.engine.globalState.playerHealth = this.engine.globalState.playerMaxHealth;
        this.engine.globalState.playerInvincibleTimer = 1.5;
        this.suitors = [
          new Suitor(600,  650, 0,   0),
          new Suitor(1100, 650, 300, 1),
          new Suitor(1700, 650, 600, 2),
          new Suitor(400,  650, 1200, 3),
          new Suitor(2000, 650, 1800, 4),
        ];
      }
    }
    
    // Embers (always)
    if (Math.random() < 0.2) {
      this.embers.push({ x: 1280 + (Math.random() * 40 - 20), y: 620, life: 0 });
    }
    for (const e of this.embers) {
      e.life += dt;
      e.y -= dt * 100;
      e.x += Math.sin(e.life * 5) * dt * 20;
    }
    this.embers = this.embers.filter(e => e.life < 1.6);
    
    if (this.flashTimer > 0) this.flashTimer -= dt;
    
    // Walk back
    if (this.phase === 'trial' && this.player.x <= 10 && this.engine.transitionState === 'none') {
      this.engine.goBack();
    }
    
    const targetCamX = Math.max(0, Math.min(this.player.x - 640, 2560 - 1280));
    this.engine.camera.x += (targetCamX - this.engine.camera.x) * 5 * dt;
    this.dustMotes.update(dt);
  }

  private updateTrial(dt: number) {
    this.player.update(dt);
    
    if (!this.engine.globalState.hasBow && Math.abs(this.player.x - 220) < 40) {
      this.engine.globalState.hasBow = true;
    }
    
    for (const arrow of this.arrows) {
      arrow.update(dt);
      
      if (arrow.active) {
        for (const axe of this.axes) {
          if (!axe.threaded) {
            const ringY = axe.y - 40;
            const dx = arrow.x - axe.x;
            const dy = arrow.y - ringY;
            
            if (dx*dx + dy*dy < 14*14) {
              axe.threaded = true;
              this.engine.globalState.axesThreaded++;
              
              this.engine.shake(3.5, 120, 22);
              this.engine.timeScale = 0.05;
              setTimeout(() => this.engine.timeScale = 1.0, 60);
              
              this.flashMessage = 'AXE THREADED';
              this.flashTimer = 2.0;
              
              if (this.engine.globalState.axesThreaded === 12) {
                this.engine.globalState.trialCompleted = true;
                this.flashMessage = 'THE TRIAL IS WON';
                this.flashTimer = 2.0;
                this.engine.shake(7.0, 220, 18);
                setTimeout(() => this.beginFight(), 2500);
              }
            } else {
              // The arrow hits the solid axe handle but does not go through the hole.
              // The user requested it should still be rendered until it leaves the scene,
              // so we don't deactivate it here. We simply let it continue moving.
            }
          }
        }
      }
      
      if (arrow.y >= 650) arrow.active = false;
    }
    this.arrows = this.arrows.filter(a => a.active);
  }

  private beginFight() {
    this.phase = 'fight';
    this.fightTime = 0;
    this.engine.globalState.hasBow = false;
    this.engine.globalState.trialActive = false;
    this.engine.globalState.playerHealth = this.engine.globalState.playerMaxHealth;
    this.engine.globalState.playerInvincibleTimer = 0;
    this.arrows = [];
    this.damageFlash = 0;
    
    this.suitors = [
      new Suitor(600,  650, 0,   0),
      new Suitor(1100, 650, 300, 1),
      new Suitor(1700, 650, 600, 2),
      new Suitor(400,  650, 1200, 3),
      new Suitor(2000, 650, 1800, 4),
    ];
  }

  private updateFight(dt: number) {
    this.fightTime += dt * 1000;
    this.player.update(dt);
    
    if (this.damageFlash > 0) this.damageFlash -= dt;
    
    // Update invincibility
    const gs = this.engine.globalState;
    if (gs.playerInvincibleTimer > 0) gs.playerInvincibleTimer -= dt;
    
    // Update suitors
    for (const s of this.suitors) {
      s.update(dt, this.player.x);
    }
    
    // Player attack → suitor damage
    if (this.player.isAttackHitActive) {
      const [hx, hy, hw, hh] = this.player.getAttackHitBox();
      for (const s of this.suitors) {
        if (!s.alive || s.state === 'dying' || s.state === 'dead') continue;
        const [sx, sy, sw, sh] = s.getHitBox();
        if (hx < sx + sw && hx + hw > sx && hy < sy + sh && hy + hh > sy) {
          const killed = s.takeDamage();
          this.engine.shake(killed ? 5 : 2.5, 100, 20);
          if (killed) {
            this.engine.timeScale = 0.08;
            setTimeout(() => this.engine.timeScale = 1.0, 80);
          }
        }
      }
    }
    
    // Suitor attack → player damage
    if (gs.playerInvincibleTimer <= 0) {
      for (const s of this.suitors) {
        if (!s.alive || s.state !== 'attack' || s.hasDamagedThisSwing) continue;
        const atkBox = s.getAttackHitBox();
        if (!atkBox) continue;
        const [ax, ay, aw, ah] = atkBox;
        // Player hitbox (roughly centered on player)
        const px = this.player.x - 14;
        const py = this.player.y - 70;
        const pw = 28;
        const ph = 70;
        if (ax < px + pw && ax + aw > px && ay < py + ph && ay + ah > py) {
          gs.playerHealth -= 0.5;
          gs.playerInvincibleTimer = 1.2; // 1.2s of i-frames
          s.hasDamagedThisSwing = true;
          this.damageFlash = 0.3;
          this.engine.shake(4, 150, 18);
          
          // Knockback player away from suitor
          const knockDir = this.player.x > s.x ? 1 : -1;
          this.player.vx = knockDir * 300;
          
          if (gs.playerHealth <= 0) {
            this.phase = 'dead';
            this.deathFadeTimer = 0;
            this.player.frozen = true;
            return;
          }
        }
      }
    }
    
    const allDead = this.suitors.every(s => !s.alive && s.state === 'dead');
    if (allDead && this.suitors.length > 0) {
      this.phase = 'victory_wait';
      this.victoryTimer = 0;
      this.player.frozen = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;
    
    // 1. Parallax Windows Content (Sky, Moon, Stars, Ocean, Trees)
    ctx.fillStyle = '#0a0d1f';
    ctx.fillRect(0, 0, 2560, 540); // Solid sky
    
    const hallMoonImg = getTextureImage('moon_phase_1');
    if (hallMoonImg) {
      ctx.save();
      // Removed parallax translation to keep moon centered in the window
      ctx.globalAlpha = 0.6;
      ctx.drawImage(hallMoonImg, 1280 - 30, 80 - 15, 60, 60);
      ctx.restore();
    }
    
    ctx.save();
    ctx.translate(camX * 0.05, 0);
    ctx.fillStyle = '#b8c8e8';
    for (const star of this.windowStars) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 2 + star.phase);
      ctx.fillRect(star.x, star.y, 2, 2);
    }
    ctx.globalAlpha = 1.0;
    
    ctx.translate(camX * 0.02, 0); // additional parallax for sea/trees
    const winY = 280, winW = 100, winH = 140;
    const horizonY = winY + 60;
    
    ctx.fillStyle = PALETTE.sea_dark;
    ctx.fillRect(-200, horizonY, 2560 * 1.5 + 400, winH + winW/2);
    ctx.fillStyle = PALETTE.sea_mid;
    ctx.fillRect(-200, horizonY, 2560 * 1.5 + 400, 2);
    ctx.fillStyle = '#0f1a30'; // waves
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(-200, horizonY + 15 + i * 15 + Math.sin(this.time * 2 + i) * 2, 2560 * 1.5 + 400, 2);
    }
    
    ctx.fillStyle = '#070a0c'; // Shoreline Hills
    ctx.beginPath();
    ctx.moveTo(-200, winY + winH + 50);
    for (let ix = -200; ix <= 2560 * 1.5 + 400; ix += 150) {
      ctx.lineTo(ix, winY + 90 + Math.sin(ix * 0.02) * 25 + Math.cos(ix * 0.005) * 15);
    }
    ctx.lineTo(2560 * 1.5 + 400, winY + winH + 50);
    ctx.fill();
    
    if (!this.filteredTreeMask && treeImg.complete && typeof document !== 'undefined') {
      this.filteredTreeMask = document.createElement('canvas');
      this.filteredTreeMask.width = treeImg.naturalWidth;
      this.filteredTreeMask.height = treeImg.naturalHeight;
      const tctx = this.filteredTreeMask.getContext('2d');
      if (tctx) {
        tctx.filter = `brightness(15%) hue-rotate(30deg) saturate(90%)`;
        tctx.drawImage(treeImg, 0, 0);
      }
    }

    if (this.filteredTreeMask) {
      for (const tree of this.windowTrees) {
        const col = tree.index % 4;
        const row = Math.floor(tree.index / 4);
        ctx.save();
        ctx.translate(tree.x, winY + winH - 5);
        if (tree.flipped) ctx.scale(-1, 1);
        ctx.drawImage(this.filteredTreeMask, col * 256, row * 256, 256, 256, -tree.height / 2, -tree.height, tree.height, tree.height);
        ctx.restore();
      }
    }
    ctx.restore(); // ends parallax stack
    
    // 2. Cached Foreground Wall, Benches, and Floor
    if (!this.backgroundCache && typeof document !== 'undefined') {
      this.backgroundCache = document.createElement('canvas');
      this.backgroundCache.width = 2560;
      this.backgroundCache.height = 720;
      const bctx = this.backgroundCache.getContext('2d');
      if (bctx) {
        // Wall (0 to 540)
        fillWithTexture(bctx, 'dirty', 'rgba(26, 24, 16, 0.65)', () => { bctx.fillRect(0, 0, 2560, 540); }, 0.18);
        
        // Window frames (removed moon window frame to clear artifact)
        const windowXs = [160, 440, 720, 1840, 2120, 2400];
        bctx.fillStyle = '#100e0a';
        for (const wx of windowXs) {
          bctx.fillRect(wx - 6, winY - 6, winW + 12, winH + 6);
          bctx.beginPath(); bctx.arc(wx + winW / 2, winY - 6, winW / 2 + 6, Math.PI, 0); bctx.fill();
        }
        
        // Punch holes
        bctx.globalCompositeOperation = 'destination-out';
        for (const wx of windowXs) {
          bctx.beginPath(); bctx.rect(wx, winY, winW, winH); bctx.arc(wx + winW / 2, winY, winW / 2, Math.PI, 0); bctx.fill();
        }
        bctx.beginPath(); bctx.rect(1280 - 60, 80, 120, 100); bctx.arc(1280, 80, 60, Math.PI, 0); bctx.fill();
        bctx.globalCompositeOperation = 'source-over';
        
        // Inner Shadows (Depth)
        for (const wx of windowXs) {
          const innerShadow = bctx.createLinearGradient(wx, winY - winW/2, wx, winY + winH);
          innerShadow.addColorStop(0, 'rgba(0,0,0,0.8)');
          innerShadow.addColorStop(0.3, 'rgba(0,0,0,0)');
          bctx.fillStyle = innerShadow;
          // Exact window shape with a 1-pixel overlap to avoid artifacts
          bctx.beginPath();
          bctx.rect(wx - 1, winY, winW + 2, winH + 1);
          bctx.arc(wx + winW / 2, winY, winW / 2 + 1, Math.PI, 0);
          bctx.fill();
        }
        // Benches (540 to 580)
        fillWithTexture(bctx, 'dirty', 'rgba(30, 26, 18, 0.8)', () => { bctx.fillRect(0, 540, 2560, 40); }, 0.2);
        bctx.fillStyle = '#4a4030';
        bctx.fillRect(0, 540, 2560, 4);
        bctx.fillStyle = '#1a1610';
        for (let bx = 0; bx <= 2560; bx += 120) bctx.fillRect(bx, 540, 2, 40);
        bctx.fillStyle = 'rgba(0,0,0,0.6)';
        bctx.fillRect(0, 576, 2560, 4);

        // Floor (580 to 720)
        fillWithTexture(bctx, 'dirty', 'rgba(16, 18, 22, 0.7)', () => { bctx.fillRect(0, 580, 2560, 140); }, 0.15);
        bctx.strokeStyle = 'rgba(0,0,0,0.3)';
        bctx.lineWidth = 2;
        for (let fx = 0; fx <= 2560; fx += 120) {
          bctx.beginPath(); bctx.moveTo(fx, 580); bctx.lineTo(fx + (fx - 1280) * 0.1, 720); bctx.stroke();
        }
        for (let fy = 580; fy <= 720; fy += 30) {
          bctx.beginPath(); bctx.moveTo(0, fy); bctx.lineTo(2560, fy); bctx.stroke();
        }
      }
    }
    
    if (this.backgroundCache) {
      ctx.drawImage(this.backgroundCache, 0, 0);
    }
    
    // Fire Shadow Under Hearth
    const fgrad = ctx.createRadialGradient(1280, 650, 0, 1280, 650, 600);
    fgrad.addColorStop(0, '#3a2808');
    fgrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fgrad;
    ctx.fillRect(1280 - 600, 650, 1200, 70);
    
    ctx.fillStyle = '#2a2010';
    ctx.fillRect(1160, 620, 240, 30);
    
    const flicker = Math.sin(this.time * 3.5 * Math.PI * 2) * 0.28 + (Math.random() * 0.12 - 0.06);
    const scale = 1 + flicker * 0.2;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(1100, 0, 360, 620);
    ctx.clip();
    
    const fireImg = getTextureImage('fire_hearth');
    if (fireImg && fireImg.complete) {
      const frameIndex = Math.floor(this.time * 10) % 8;
      const sw = 32, sh = 32;
      const dw = 160, dh = 160;
      ctx.drawImage(
        fireImg,
        frameIndex * sw, 0, sw, sh,
        1280 - dw/2, 620 - dh + 10, dw, dh
      );
    } else {
      const drawFireLayer = (w: number, h: number, c: string, a: number) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.ellipse(1280, 620, w/2, (h/2) * scale, 0, 0, Math.PI*2);
        ctx.fill();
      };
      
      drawFireLayer(140, 180, '#cc3300', 0.9);
      drawFireLayer(100, 160, '#ff6600', 0.85);
      drawFireLayer(70, 140, '#ff9920', 0.8);
      drawFireLayer(44, 110, '#ffcc44', 0.75);
      drawFireLayer(20, 80, '#ffffff', 0.4);
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
    
    ctx.fillStyle = '#ff6600';
    for (const e of this.embers) {
      ctx.globalAlpha = 1 - (e.life / 1.6);
      ctx.fillRect(e.x, e.y, 2, 2);
    }
    ctx.globalAlpha = 1.0;
    
    if (!this.windowClipPath && typeof Path2D !== 'undefined') {
      this.windowClipPath = new Path2D();
      this.windowClipPath.rect(0, 0, 2560, 720);
      const windowXs = [160, 440, 720, 1840, 2120, 2400];
      const winW = 100, winH = 140, winY = 280;
      for (const wx of windowXs) {
        this.windowClipPath.moveTo(wx, winY);
        this.windowClipPath.lineTo(wx, winY + winH);
        this.windowClipPath.lineTo(wx + winW, winY + winH);
        this.windowClipPath.lineTo(wx + winW, winY);
        this.windowClipPath.arc(wx + winW / 2, winY, winW / 2, 0, Math.PI, true);
        this.windowClipPath.closePath();
      }
      this.windowClipPath.moveTo(1280 - 60, 80);
      this.windowClipPath.lineTo(1280 - 60, 180);
      this.windowClipPath.lineTo(1280 + 60, 180);
      this.windowClipPath.lineTo(1280 + 60, 80);
      this.windowClipPath.arc(1280, 80, 60, 0, Math.PI, true);
      this.windowClipPath.closePath();
    }

    ctx.save();
    if (this.windowClipPath) ctx.clip(this.windowClipPath, 'evenodd');
    ctx.globalCompositeOperation = 'screen';
    const lgrad = ctx.createRadialGradient(1280, 620, 0, 1280, 620, 600);
    lgrad.addColorStop(0, `rgba(255, 136, 32, ${0.4 * scale})`);
    lgrad.addColorStop(1, 'rgba(255, 136, 32, 0)');
    ctx.fillStyle = lgrad;
    ctx.fillRect(1280 - 600, 620 - 600, 1200, 1200);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    
    if (this.phase === 'trial' && !this.engine.globalState.hasBow) {
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(220 - 30, 628 - 40, 60, 40);
      ctx.strokeStyle = '#3a2810';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(220, 628 - 28, 14, -Math.PI/2, Math.PI/2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.amber_gold;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pick up the bow', 220, 628 - 60);
    }
    
    // Vignette / Darkness radiating outwards from the fire
    ctx.save();
    if (this.windowClipPath) ctx.clip(this.windowClipPath, 'evenodd');
    const darkGrad = ctx.createRadialGradient(
      1280, 620, 150,
      1280, 620, 900
    );
    darkGrad.addColorStop(0, 'rgba(0,0,0,0)');
    darkGrad.addColorStop(1, 'rgba(0,2,8,0.7)'); // dark at edges
    ctx.fillStyle = darkGrad;
    // Fill the visible screen area to avoid drawing a massive 2560px gradient
    ctx.fillRect(camX, 0, 1280, 720);
    ctx.restore();
    
    for (const axe of this.axes) {
      ctx.fillStyle = '#3a2810';
      ctx.fillRect(axe.x - 4, axe.y - 26, 8, 26);
      ctx.fillStyle = '#3a3020';
      ctx.beginPath();
      ctx.moveTo(axe.x, axe.y - 54);
      ctx.lineTo(axe.x + 16, axe.y - 26);
      ctx.lineTo(axe.x - 16, axe.y - 26);
      ctx.fill();
      ctx.strokeStyle = axe.threaded ? PALETTE.amber_gold : '#2a2418';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(axe.x, axe.y - 40, 7, 0, Math.PI*2);
      ctx.stroke();
      if (axe.threaded) {
        ctx.globalCompositeOperation = 'screen';
        const agrad = ctx.createRadialGradient(axe.x, axe.y - 40, 0, axe.x, axe.y - 40, 12);
        agrad.addColorStop(0, 'rgba(255, 136, 32, 0.8)');
        agrad.addColorStop(1, 'rgba(255, 136, 32, 0)');
        ctx.fillStyle = agrad;
        ctx.fillRect(axe.x - 12, axe.y - 40 - 12, 24, 24);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    
    // Dust motes
    this.dustMotes.draw(ctx, this.engine.camera.x);
    
    // Suitors
    for (const s of this.suitors) {
      s.draw(ctx);
    }
    
    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);
    
    // Damage red flash overlay (covers scene)
    if (this.damageFlash > 0) {
      ctx.save();
      ctx.resetTransform();
      ctx.fillStyle = `rgba(180, 30, 20, ${this.damageFlash / 0.3 * 0.35})`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.restore();
    }
    
    // Invincibility blink — make player semi-transparent when i-frames active
    // (Already drawn above, so we overlay a masking effect — handled via next frame)
    
    // HUD
    ctx.save();
    ctx.translate(camX, 0);
    
    if (this.phase === 'trial') {
      ctx.fillStyle = '#1a1810';
      ctx.fillRect(20, 20, 120, 16);
      ctx.strokeStyle = '#4a4030';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 120, 16);
      
      const drawPct = this.player.state === 'bow_draw' ? this.player.bowDrawTime / 1.2 : 0;
      if (drawPct > 0) {
        const fillGrad = ctx.createLinearGradient(23, 23, 23 + 114, 23);
        fillGrad.addColorStop(0, '#ffee44');
        fillGrad.addColorStop(1, '#ff2200');
        ctx.fillStyle = fillGrad;
        ctx.fillRect(23, 23, 114 * drawPct, 10);
      }
      
      for (let i = 0; i < 12; i++) {
        const ax = 20 + i * 22;
        const ay = 44;
        if (i < this.engine.globalState.axesThreaded) {
          ctx.fillStyle = '#8a6030';
          ctx.fillRect(ax, ay, 18, 18);
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = 'rgba(255, 136, 32, 0.5)';
          ctx.fillRect(ax - 4, ay - 4, 26, 26);
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = '#2a2418';
          ctx.fillRect(ax, ay, 18, 18);
          ctx.strokeStyle = '#3a3428';
          ctx.strokeRect(ax, ay, 18, 18);
        }
      }
    }
    
    if (this.flashTimer > 0) {
      let alpha = 1.0;
      if (this.flashTimer > 1.8) alpha = (2.0 - this.flashTimer) / 0.2;
      else if (this.flashTimer < 0.6) alpha = this.flashTimer / 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = PALETTE.amber_gold;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.flashMessage, 640, 140);
      ctx.globalAlpha = 1.0;
    }
    
    if (this.phase === 'victory_text' && this.victoryTextAlpha > 0) {
      ctx.globalAlpha = this.victoryTextAlpha;
      ctx.fillStyle = '#d4b96a';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('The suitors are slain.', 640, 360);
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();

    // Health Hearts HUD (fight phase)
    if (this.phase === 'fight' || this.phase === 'dead') {
      ctx.save();
      ctx.resetTransform();
      const gs = this.engine.globalState;
      for (let i = 0; i < gs.playerMaxHealth; i++) {
        const hx = 20 + i * 28;
        const hy = 20;
        const isFull = i < Math.floor(gs.playerHealth);
        const isHalf = !isFull && i === Math.floor(gs.playerHealth) && (gs.playerHealth % 1) >= 0.5;
        
        // Heart shape
        ctx.save();
        ctx.translate(hx + 10, hy + 10);
        
        // Pulse when low health
        if (gs.playerHealth <= 1 && (isFull || isHalf)) {
          const pulse = 1 + Math.sin(this.time * 6) * 0.08;
          ctx.scale(pulse, pulse);
        }
        
        if (isFull) {
          // Full heart
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-2, -3, -10, -5, -10, 2);
          ctx.bezierCurveTo(-10, 7, 0, 12, 0, 15);
          ctx.bezierCurveTo(0, 12, 10, 7, 10, 2);
          ctx.bezierCurveTo(10, -5, 2, -3, 0, 3);
          ctx.closePath();
          ctx.fillStyle = '#cc2222';
          ctx.fill();
          // Highlight
          ctx.fillStyle = 'rgba(255,100,100,0.4)';
          ctx.beginPath();
          ctx.ellipse(-4, 1, 3, 2, -0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (isHalf) {
          // Half heart — draw empty background first
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-2, -3, -10, -5, -10, 2);
          ctx.bezierCurveTo(-10, 7, 0, 12, 0, 15);
          ctx.bezierCurveTo(0, 12, 10, 7, 10, 2);
          ctx.bezierCurveTo(10, -5, 2, -3, 0, 3);
          ctx.closePath();
          ctx.fillStyle = 'rgba(40,20,20,0.6)';
          ctx.fill();
          ctx.strokeStyle = '#4a2020';
          ctx.lineWidth = 1;
          ctx.stroke();
          // Clip left half and fill red
          ctx.save();
          ctx.beginPath();
          ctx.rect(-12, -8, 12, 26);
          ctx.clip();
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-2, -3, -10, -5, -10, 2);
          ctx.bezierCurveTo(-10, 7, 0, 12, 0, 15);
          ctx.bezierCurveTo(0, 12, 10, 7, 10, 2);
          ctx.bezierCurveTo(10, -5, 2, -3, 0, 3);
          ctx.closePath();
          ctx.fillStyle = '#cc2222';
          ctx.fill();
          ctx.restore();
        } else {
          // Empty heart
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-2, -3, -10, -5, -10, 2);
          ctx.bezierCurveTo(-10, 7, 0, 12, 0, 15);
          ctx.bezierCurveTo(0, 12, 10, 7, 10, 2);
          ctx.bezierCurveTo(10, -5, 2, -3, 0, 3);
          ctx.closePath();
          ctx.fillStyle = 'rgba(40,20,20,0.6)';
          ctx.fill();
          ctx.strokeStyle = '#4a2020';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    
    // Death overlay
    if (this.phase === 'dead') {
      ctx.save();
      ctx.resetTransform();
      const fadeAlpha = Math.min(this.deathFadeTimer / 1.5, 0.85);
      ctx.fillStyle = `rgba(20, 8, 8, ${fadeAlpha})`;
      ctx.fillRect(0, 0, 1280, 720);
      
      if (this.deathFadeTimer >= 1.0) {
        const textAlpha = Math.min((this.deathFadeTimer - 1.0) / 0.8, 1);
        ctx.globalAlpha = textAlpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#8a2020';
        ctx.font = '32px Georgia, serif';
        ctx.fillText('YOU HAVE FALLEN', 640, 320);
        
        ctx.fillStyle = '#6a4040';
        ctx.font = 'italic 15px Georgia, serif';
        ctx.fillText('The suitors have bested Odysseus...', 640, 370);
      }
      
      if (this.deathFadeTimer >= 2.5) {
        const blinkAlpha = 0.4 + Math.sin(this.time * 4) * 0.3;
        ctx.globalAlpha = blinkAlpha;
        ctx.fillStyle = '#686050';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Press Space to try again', 640, 430);
      }
      
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Odysseus thought — context-sensitive
    if (this.phase === 'trial' || this.phase === 'fight') {
      const trialText = this.phase === 'trial'
        ? 'I must shoot the arrow through each axe head.'
        : 'I must slay the suitors who plague my house.';
      ctx.save();
      ctx.translate(camX, 0);
      drawThought(ctx, trialText, this.thoughtAlpha);
      ctx.restore();
    }
  }
}
