import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { BedroomScene } from './BedroomScene';
import { fillWithTexture, getTextureImage } from '../Textures';
import { drawTorch } from '../Torch';
import retroTreeUrl from '../../RetroTree.png';
import { drawThought } from '../DrawThought';

const treeImg = new Image();
treeImg.src = retroTreeUrl;

export class CorridorScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  thoughtAlpha = 0;

  stars: { x: number, y: number, size: number, phase: number }[] = [];
  
  windowTrees = Array.from({length: 80}, (_, i) => ({
    x: i * 20 + (Math.random() * 20 - 10),
    height: 25 + Math.random() * 60,
    index: Math.floor(Math.random() * 8),
    flipped: Math.random() > 0.5
  }));
  filteredTreeMask: HTMLCanvasElement | null = null;

  constructor() {
    super();
    for (let i = 0; i < 90; i++) {
      this.stars.push({
        x: Math.random() * 1280,
        y: 220 - 140 + Math.random() * 280,
        size: Math.random() > 0.8 ? 2 : 1,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  onEnter(direction: 'left' | 'right' = 'left') {
    const spawnX = direction === 'right' ? 1140 : 100;
    const facing = direction === 'right' ? 'left' : 'right';

    this.player = new Player(
      this.engine,
      spawnX, 638, facing,
      () => 650,
      (arrow) => this.arrows.push(arrow)
    );
    this.engine.camera.x = Math.max(0, Math.min(this.player.x - 640, 1280 - 1280)); // 0
  }

  update(dt: number) {
    this.time += dt;
    // Thought fades in over 2s then stays
    if (this.thoughtAlpha < 1) this.thoughtAlpha = Math.min(1, this.thoughtAlpha + dt / 2);
    this.player.update(dt);

    for (const arrow of this.arrows) {
      arrow.update(dt);
      if (arrow.y >= 650) arrow.active = false;
    }
    this.arrows = this.arrows.filter(a => a.active);

    if (this.player.x >= 1160 && this.engine.transitionState === 'none') {
      this.engine.switchScene(new BedroomScene(), DEFAULT_FADE_MS);
    }

    // Walk back
    if (this.player.x <= 10 && this.engine.transitionState === 'none') {
      this.engine.goBack();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Ceiling — cobblestone texture
    fillWithTexture(ctx, 'cobblestone', 'rgba(6, 8, 14, 0.75)', () => {
      ctx.fillRect(0, 0, 1280, 120);
    }, 0.15);

    // Walls — cobblestone texture
    fillWithTexture(ctx, 'cobblestone', 'rgba(20, 24, 32, 0.65)', () => {
      ctx.fillRect(0, 120, 1280, 520);
    }, 0.15);

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



    const windowCenters = [80, 560, 1040];

    for (const wx of windowCenters) {
      // Window arch
      ctx.fillStyle = '#1e2430';
      ctx.fillRect(wx - 60 - 40, 220, 120 + 80, 280);
      ctx.beginPath();
      ctx.arc(wx, 220, 60 + 40, Math.PI, 0);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.rect(wx - 60, 220, 120, 280);
      ctx.arc(wx, 220, 60, Math.PI, 0);
      ctx.clip(); // Clip everything else to this window!

      // Night sky panel (Solid sky)
      ctx.fillStyle = '#0a0d1f';
      ctx.fill();

      // Stars within window area
      ctx.fillStyle = '#b8c8e8';
      for (const star of this.stars) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.time * 2 + star.phase);
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
      ctx.globalAlpha = 1.0;

      // Show moon ONLY in the middle window for focus
      if (wx === 560) {
        const moonImg = getTextureImage('moon_phase_1');
        if (moonImg) {
          ctx.save();
          const moonX = wx + 20;
          const moonY = 220 + 30;
          const moonSize = 40;
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#b8c8e8';
          ctx.beginPath(); ctx.arc(moonX, moonY, 25, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
          ctx.restore();
        }
      }

      const winY = 220, winW = 120, winH = 280;
      const horizonY = winY + 60;
      
      ctx.fillStyle = PALETTE.sea_dark;
      ctx.fillRect(-200, horizonY, 2560, winH);
      ctx.fillStyle = PALETTE.sea_mid;
      ctx.fillRect(-200, horizonY, 2560, 2);
      ctx.fillStyle = '#0f1a30'; // waves
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(-200, horizonY + 15 + i * 15 + Math.sin(this.time * 2 + i) * 2, 2560, 2);
      }

      // Shoreline Hills
      ctx.fillStyle = '#070a0c';
      ctx.beginPath();
      ctx.moveTo(-200, winY + winH + 50);
      for (let ix = -200; ix <= 2560; ix += 150) {
        ctx.lineTo(ix, winY + 90 + Math.sin(ix * 0.02) * 25 + Math.cos(ix * 0.005) * 15);
      }
      ctx.lineTo(2560, winY + winH + 50);
      ctx.fill();

      // Trees
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

      ctx.restore();

      // Moonbeam 
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(wx, 220);
      const angle = wx === 80 ? 8 : (wx === 560 ? 0 : -8);
      ctx.rotate(angle * Math.PI / 180);
      const pulse = Math.sin(this.time * 0.22) * 0.04;
      ctx.fillStyle = `rgba(184, 200, 232, ${0.14 + pulse})`;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(320, -50);
      ctx.lineTo(320, 50);
      ctx.lineTo(-50, 0);
      ctx.fill();
      ctx.restore();
    }

    // Torches 
    const torches = [
      { x: 320, y: 380, phase: 0.0 }, // Adjusted positions to be between windows
      { x: 800, y: 380, phase: 0.7 }
    ];

    for (const t of torches) {
      drawTorch(ctx, t.x, t.y, this.time, t.phase);

      const flicker = Math.sin(this.time * 2.8 + t.phase) * 0.2 + (Math.random() * 0.1);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rgrad = ctx.createRadialGradient(t.x, t.y - 8, 0, t.x, t.y - 8, 90);
      rgrad.addColorStop(0, `rgba(255, 136, 32, ${0.28 + flicker * 0.05})`);
      rgrad.addColorStop(1, 'rgba(255, 136, 32, 0)');
      ctx.fillStyle = rgrad;
      ctx.fillRect(t.x - 90, t.y - 98, 180, 180);
      ctx.restore();
    }


    // Floor — dirty cobblestone texture
    fillWithTexture(ctx, 'dirty', 'rgba(30, 32, 48, 0.65)', () => {
      ctx.fillRect(0, 650, 1280, 70);
    }, 0.15);

    // Moonbeam patches on floor
    const pulse = Math.sin(this.time * 0.22) * 0.04;
    ctx.fillStyle = `rgba(184, 200, 232, ${0.12 + pulse})`;
    const floorPatches = [120, 600, 1080];
    for (const fx of floorPatches) {
      ctx.beginPath();
      ctx.ellipse(fx, 650, 50, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }


    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);

    // Odysseus thought
    drawThought(ctx, 'My chambers lie ahead... Penelope waits.', this.thoughtAlpha);
  }
}
