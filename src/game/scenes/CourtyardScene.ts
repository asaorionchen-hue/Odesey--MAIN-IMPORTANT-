import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { GreatHallScene } from './GreatHallScene';
import retroTreeUrl from '../../RetroTree.png';
import { fillWithTexture, getTextureImage } from '../Textures';
import { drawTorch } from '../Torch';

const treeImg = new Image();
treeImg.src = retroTreeUrl;

export class CourtyardScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  
  stars: {x: number, y: number, size: number}[] = [];

  constructor() {
    super();
    for(let i=0; i<160; i++) {
      this.stars.push({
        x: Math.random() * 1600, // Viewport + buffer
        y: Math.random() * 260,
        size: Math.random() > 0.8 ? 2 : 1
      });
    }
  }

  onEnter(direction: 'left' | 'right' = 'left') {
    const spawnX = direction === 'right' ? 2360 : 160;
    const facing = direction === 'right' ? 'left' : 'right';
    
    this.player = new Player(
      this.engine, 
      spawnX, 610, facing, 
      () => 620,
      (arrow) => this.arrows.push(arrow)
    );
    this.engine.camera.x = Math.max(0, Math.min(this.player.x - 640, 2560 - 1280));
  }

  update(dt: number) {
    this.time += dt;
    this.player.update(dt);
    
    for (const arrow of this.arrows) {
      arrow.update(dt);
      if (arrow.y >= 620) arrow.active = false;
    }
    this.arrows = this.arrows.filter(a => a.active);
    
    const targetCamX = Math.max(0, Math.min(this.player.x - 640, 2560 - 1280));
    this.engine.camera.x += (targetCamX - this.engine.camera.x) * 5 * dt;
    
    if (this.player.x >= 2380 && this.engine.transitionState === 'none') {
      this.engine.switchScene(new GreatHallScene(), DEFAULT_FADE_MS);
    }
    
    // Walk back
    if (this.player.x <= 10 && this.engine.transitionState === 'none') {
      this.engine.goBack();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;
    
    // Sky
    // Sky
    const skyP = 0; // Fixed to screen
    const skyX = -camX * skyP;

    ctx.save();
    ctx.translate(camX + skyX, 0);
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, PALETTE.void);
    grad.addColorStop(1, PALETTE.sky_mid);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    
    // Stars
    ctx.fillStyle = PALETTE.star_color;
    for(const star of this.stars) {
      if (star.x >= 0 && star.x <= 1280) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }
    
    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    const moonX = 640;
    const moonY = 100;

    if (moonImg) {
      ctx.save();
      const moonSize = 72;
      
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 120);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 120, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    } else {
      // Fallback
      ctx.fillStyle = '#5070a0';
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 28 + 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
      
      ctx.fillStyle = PALETTE.moon_bright;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 28, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = PALETTE.sky_deep;
      ctx.beginPath();
      ctx.arc(moonX + 9, moonY - 3, 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    
    // Back wall — cobblestone texture
    fillWithTexture(ctx, 'cobblestone', 'rgba(30, 36, 48, 0.72)', () => {
      ctx.fillRect(0, 260, 2560, 380);
    }, 0.18);
    
    ctx.strokeStyle = '#141820';
    ctx.lineWidth = 2;
    for (let y = 260; y < 640; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2560, y);
      ctx.stroke();
      const offset = (y / 40) % 2 === 0 ? 0 : 40;
      for (let x = offset; x < 2560; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 40);
        ctx.stroke();
      }
    }
    
    // Pilasters
    const pilasterXs = [340, 680, 1020, 1360, 1700, 2040];
    ctx.fillStyle = '#262e3a';
    for (const px of pilasterXs) {
      ctx.fillRect(px - 14, 280, 28, 340);
    }
    
    // Entrance arch left
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(60 - 70 - 60, 340, 60, 280); // left pillar
    ctx.fillRect(60 + 70, 340, 60, 280); // right pillar
    ctx.beginPath();
    ctx.arc(60, 340, 70 + 60, Math.PI, 0);
    ctx.arc(60, 340, 70, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = '#04060f';
    ctx.beginPath();
    ctx.arc(60, 340, 70, Math.PI, 0);
    ctx.lineTo(60 + 70, 620);
    ctx.lineTo(60 - 70, 620);
    ctx.fill();
    
    // Palace doors right
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(2240 - 70 - 24, 340 - 24, 140 + 48, 280 + 24);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(2240 - 70, 340, 140, 280);
    ctx.fillStyle = '#2a1c08';
    for(let i=1; i<6; i++) {
      ctx.fillRect(2240 - 70 + i * (140/6), 340, 2, 280);
    }
    ctx.fillStyle = '#282830';
    ctx.fillRect(2240 - 70, 400, 140, 10);
    ctx.fillRect(2240 - 70, 480, 140, 10);
    ctx.fillRect(2240 - 70, 560, 140, 10);
    
    // Shrine
    ctx.fillStyle = '#2a3040';
    ctx.fillRect(1200 - 60, 590, 120, 30);
    ctx.fillStyle = '#242c38';
    ctx.fillRect(1200 - 25, 510, 50, 80);
    ctx.fillStyle = '#2e3848';
    ctx.fillRect(1200 - 15, 420, 30, 90);
    ctx.fillStyle = '#222c36';
    ctx.fillRect(1200 - 40 - 7, 530, 14, 60);
    ctx.fillRect(1200 + 40 - 7, 530, 14, 60);
    
    // Torches (drawn behind trees/bushes)
    const torches = [
      { x: 800, y: 400 },
      { x: 2100, y: 400 }
    ];
    
    for (let i = 0; i < torches.length; i++) {
      const t = torches[i];
      drawTorch(ctx, t.x, t.y, this.time, i * 1.5);
      
      const phase = i * 1.5;
      const flicker = Math.sin(this.time * 3.2 + phase) * 0.2 + (Math.random() * 0.1);
      
      // Light radius
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rgrad = ctx.createRadialGradient(t.x, t.y - 8, 0, t.x, t.y - 8, 120);
      rgrad.addColorStop(0, `rgba(255, 136, 32, ${0.25 + flicker*0.05})`);
      rgrad.addColorStop(1, 'rgba(255, 136, 32, 0)');
      ctx.fillStyle = rgrad;
      ctx.fillRect(t.x - 120, t.y - 128, 240, 240);
      ctx.restore();
    }
    
    // Trees (replaced with sprite)
    const drawSpriteTree = (x: number, y: number, typeIndex: number, th: number) => {
      if (!treeImg.complete || treeImg.naturalHeight === 0) return;
      const col = typeIndex % 4;
      const row = Math.floor(typeIndex / 4);
      const width = th; 
      ctx.save();
      ctx.translate(x, y);
      // Dark green with a blueish tint
      ctx.filter = 'brightness(35%) hue-rotate(30deg) saturate(90%)';
      // Draw the tree frame
      ctx.drawImage(treeImg, col * 256, row * 256, 256, 256, -width / 2, -th, width, th);
      ctx.restore();
    };
    drawSpriteTree(240, 620, 5, 420);
    drawSpriteTree(480, 620, 4, 380);
    drawSpriteTree(1460, 620, 4, 460); // Tall green tree
    drawSpriteTree(1820, 620, 5, 400);
    
    // Courtyard Bushes
    const drawBush = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
      ctx.fill();
    };
    
    const bushColors = ['#101e12', '#0e1c10', '#0c1a0e'];
    for (let bx = 120; bx < 2200; bx += 140) {
      // Skip around shrine and pilasters
      if (Math.abs(bx - 1200) < 150) continue; 
      if (Math.abs(bx - 340) < 60 || Math.abs(bx - 680) < 60 || Math.abs(bx - 1020) < 60 || 
          Math.abs(bx - 1360) < 60 || Math.abs(bx - 1700) < 60 || Math.abs(bx - 2040) < 60) continue;
      
      // Use pseudo-random based on x coordinate to avoid flickering on re-renders
      const pseudoRand1 = (bx * 13 % 100) / 100;
      const pseudoRand2 = (bx * 17 % 100) / 100;
      const pseudoRand3 = (bx * 23 % 100) / 100;

      const bw = 60 + pseudoRand1 * 40;
      const bh = 30 + pseudoRand2 * 15;
      const bc = bushColors[Math.floor(pseudoRand3 * bushColors.length)];
      
      drawBush(bx, 620 - bh/2 + 5, bw, bh, bc);
      
      if (pseudoRand1 > 0.5) {
        drawBush(bx + 30, 620 - bh/3 + 5, bw * 0.8, bh * 0.8, bushColors[(Math.floor(pseudoRand3 * bushColors.length) + 1) % bushColors.length]);
      }
    }
    
    // Ground — dirty cobblestone texture, more yellow tint
    fillWithTexture(ctx, 'dirty', 'rgba(195, 185, 100, 0.4)', () => {
      ctx.fillRect(0, 620, 2560, 100);
    }, 0.18);
    
    
    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
