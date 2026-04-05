import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { CourtyardScene } from './CourtyardScene';
import retroTreeUrl from '../../RetroTree.png';
import { fillWithTexture, getPattern, getTextureImage } from '../Textures';

const treeImg = new Image();
treeImg.src = retroTreeUrl;

export class ApproachScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  
  stars: {x: number, y: number, size: number}[] = [];
  
  farTreesCache: HTMLCanvasElement | null = null;
  midTreesCache: HTMLCanvasElement | null = null;
  
  farHillSurfaceCache: HTMLCanvasElement | null = null;
  midHillSurfaceCache: HTMLCanvasElement | null = null;
  foregroundSurfaceCache: HTMLCanvasElement | null = null;
  
  groundPoints = [
    { x: 0,    y: 640 },
    { x: 500,  y: 620 },
    { x: 1000, y: 590 },
    { x: 1500, y: 550 },
    { x: 2000, y: 510 },
    { x: 2500, y: 470 },
    { x: 3000, y: 440 },
    { x: 3500, y: 420 },
    { x: 4000, y: 400 },
    { x: 4500, y: 390 },
    { x: 5000, y: 380 }
  ];
  
  farHillPoints = [
    { x: 0,    y: 460 },
    { x: 1000, y: 440 },
    { x: 2000, y: 455 },
    { x: 3000, y: 430 },
    { x: 4000, y: 445 },
    { x: 5000, y: 420 }
  ];

  midHillPoints = [
    { x: 0,    y: 540 },
    { x: 800,  y: 520 },
    { x: 1600, y: 560 },
    { x: 2400, y: 530 },
    { x: 3200, y: 550 },
    { x: 4000, y: 510 },
    { x: 5000, y: 530 }
  ];

  constructor() {
    super();
    for(let i=0; i<250; i++) {
      this.stars.push({
        x: Math.random() * 5000,
        y: Math.random() * 400,
        size: Math.random() > 0.8 ? 2 : 1
      });
    }
  }

  onEnter(direction: 'left' | 'right' = 'left') {
    const spawnX = direction === 'right' ? 4900 : 100;
    const facing = direction === 'right' ? 'left' : 'right';

    this.player = new Player(
      this.engine, 
      spawnX, 610, facing, 
      (x) => this.getFloorY(x),
      (arrow) => this.arrows.push(arrow)
    );
    this.engine.camera.x = Math.max(0, Math.min(this.player.x - 640, 5000 - 1280));
  }

  getFloorY(x: number) {
    if (x <= 0) return this.groundPoints[0].y;
    if (x >= 5000) return this.groundPoints[this.groundPoints.length - 1].y;
    for (let i = 0; i < this.groundPoints.length - 1; i++) {
      const p1 = this.groundPoints[i];
      const p2 = this.groundPoints[i+1];
      if (x >= p1.x && x <= p2.x) {
        const t = (x - p1.x) / (p2.x - p1.x);
        return p1.y + t * (p2.y - p1.y);
      }
    }
    return 620;
  }

  update(dt: number) {
    this.time += dt;
    this.player.update(dt);
    
    for (const arrow of this.arrows) {
      arrow.update(dt);
      if (arrow.y >= this.getFloorY(arrow.x)) {
        arrow.active = false; // hit ground
      }
    }
    this.arrows = this.arrows.filter(a => a.active);
    
    // Camera follow
    const targetCamX = Math.max(0, Math.min(this.player.x - 640, 5000 - 1280));
    this.engine.camera.x += (targetCamX - this.engine.camera.x) * 5 * dt;
    
    // Check exit
    if (this.player.x >= 4900 && this.engine.transitionState === 'none') {
      this.engine.switchScene(new CourtyardScene(), DEFAULT_FADE_MS);
    }
    
    // Walk back (though no previous scene, handles edge gracefully or popping back)
    if (this.player.x <= 10 && this.engine.transitionState === 'none') {
      this.engine.goBack();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const camX = this.engine.camera.x;
    
    // Sky (locked to camera/screen)
    const skyP = 0; // 0 parallax means fixed to screen
    const skyX = -camX * skyP;

    ctx.save();
    ctx.translate(camX + skyX, 0); // Offset engine's -camX
    
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, PALETTE.void);
    grad.addColorStop(1, PALETTE.sky_mid);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Stars
    ctx.fillStyle = PALETTE.star_color;
    for (const star of this.stars) {
      if (star.x >= 0 && star.x <= 1280) { // Screen space
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }

    // Moon
    const moonImg = getTextureImage('moon_phase_1');
    const moonX = 260;
    const moonY = 140;

    if (moonImg) {
      ctx.save();
      const moonSize = 80;
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
      ctx.fillStyle = PALETTE.moon_bright;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moonlight rays
    ctx.fillStyle = PALETTE.ray_color;
    const rays = [
      { angle: -42, length: 900, width: 40, opacity: 0.08 },
      { angle: -38, length: 850, width: 30, opacity: 0.06 },
      { angle: -45, length: 820, width: 25, opacity: 0.05 },
      { angle: -35, length: 780, width: 20, opacity: 0.05 },
      { angle: -48, length: 750, width: 18, opacity: 0.04 }
    ];
    ctx.globalCompositeOperation = 'lighter';
    for (const ray of rays) {
      ctx.globalAlpha = ray.opacity;
      ctx.save();
      ctx.translate(moonX, moonY);
      ctx.rotate(ray.angle * Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(0, -ray.width / 2);
      ctx.lineTo(ray.length, -ray.width);
      ctx.lineTo(ray.length, ray.width);
      ctx.lineTo(0, ray.width / 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.restore(); // end sky layer
    
    // Distant sea (now 1:1 scroll)
    ctx.save();
    ctx.fillStyle = PALETTE.sea_dark;
    ctx.fillRect(0, 360, 5000, 360); // Full scene width
    ctx.fillStyle = PALETTE.sea_mid;
    ctx.fillRect(0, 360, 5000, 2);
    // waves
    ctx.fillStyle = '#0f1a30';
    for(let i=0; i<24; i++) {
      const y = 380 + i * 15;
      ctx.fillRect(0, y + Math.sin(this.time * 2 + i) * 2, 5000, 2);
    }
    ctx.restore();
    
    // Trees - Helper
    const drawSpriteTree = (x: number, y: number, typeIndex: number, th: number, flipped = false, brightness = 35) => {
      if (!treeImg.complete || treeImg.naturalHeight === 0) return;
      const col = typeIndex % 4;
      const row = Math.floor(typeIndex / 4);
      const sX = col * 256;
      const sY = row * 256;
      const width = th; 
      ctx.save();
      ctx.translate(x, y);
      if (flipped) ctx.scale(-1, 1);
      ctx.filter = `brightness(${brightness}%) hue-rotate(30deg) saturate(80%)`;
      ctx.drawImage(treeImg, sX, sY, 256, 256, -width / 2, -th + 15, width, th);
      ctx.restore();
    };

    // Layer 1: Far Hills (parallax 0.35)
    ctx.save();
    ctx.translate(camX * 0.65, 0);

    if (!this.farHillSurfaceCache && treeImg.complete) {
      this.farHillSurfaceCache = document.createElement('canvas');
      this.farHillSurfaceCache.width = 5000;
      this.farHillSurfaceCache.height = 720;
      const fctx = this.farHillSurfaceCache.getContext('2d');
      const gImg = getTextureImage('grass1');
      if (fctx && gImg && gImg.complete) {
        // Path
        fctx.beginPath();
        fctx.moveTo(this.farHillPoints[0].x, this.farHillPoints[0].y);
        for(let i=1; i<this.farHillPoints.length; i++) fctx.lineTo(this.farHillPoints[i].x, this.farHillPoints[i].y);
        fctx.lineTo(5000, 720); fctx.lineTo(0, 720); fctx.closePath();
        fctx.clip();

        // Random Scatter
        const scale = 0.18 / 12;
        const tw = gImg.width * scale;
        const th = gImg.height * scale;
        for (let i = 0; i < 40000; i++) {
          const rx = Math.random() * 5000;
          const ry = 400 + Math.random() * 320;
          const rot = Math.random() * Math.PI * 2;
          fctx.save();
          fctx.translate(rx, ry);
          fctx.rotate(rot);
          fctx.globalAlpha = 0.7 + Math.random() * 0.3;
          fctx.drawImage(gImg, -tw/2, -th/2, tw, th);
          fctx.restore();
        }
        // Final Tint
        fctx.fillStyle = 'rgba(13, 18, 34, 0.85)';
        fctx.fillRect(0, 0, 5000, 720);
      }
    }
    if (this.farHillSurfaceCache) ctx.drawImage(this.farHillSurfaceCache, 0, 0);

    // Trees on far hills (Dense Forest Cached)
    if (!this.farTreesCache && treeImg.complete && treeImg.naturalHeight > 0) {
      this.farTreesCache = document.createElement('canvas');
      this.farTreesCache.width = 5000;
      this.farTreesCache.height = 720;
      const octx = this.farTreesCache.getContext('2d');
      if (octx) {
        const drawOff = (tx: number, ty: number, tIdx: number, th: number, flip: boolean, br: number) => {
          const col = tIdx % 4;
          const row = Math.floor(tIdx / 4);
          octx.save();
          octx.translate(tx, ty);
          if (flip) octx.scale(-1, 1);
          octx.filter = `brightness(${br}%) hue-rotate(30deg) saturate(80%)`;
          octx.drawImage(treeImg, col * 256, row * 256, 256, 256, -th / 2, -th + 15, th, th);
          octx.restore();
        };

        const getFarHillY = (xPos: number) => {
          const clampedX = Math.max(0, Math.min(xPos, 5000));
          for (let j = 0; j < this.farHillPoints.length - 1; j++) {
            const p1 = this.farHillPoints[j];
            const p2 = this.farHillPoints[j+1];
            if (clampedX >= p1.x && clampedX <= p2.x) {
              return p1.y + ((clampedX - p1.x) / (p2.x - p1.x)) * (p2.y - p1.y);
            }
          }
          return 450;
        };

        for (let i = 0; i < 600; i++) {
          const rx = -100 + Math.random() * 5250;
          const ry = getFarHillY(rx) + Math.random() * 95;
          const hash = Math.abs(Math.sin(rx * 123.45 + ry * 678.9)) * 10000;
          if (hash % 100 < 52) continue;
          
          const tIdx = 4 + Math.floor(hash % 3);
          const th = 150 + (hash % 50);
          drawOff(rx, ry, tIdx, th, (Math.floor(hash) % 2 === 0), 8 + (hash % 4));
        }

        // 8 focused crest trees for specific gaps
        for (let i = 0; i < 8; i++) {
          const rx = 400 + i * 650 + (Math.sin(i) * 150);
          const ry = getFarHillY(rx);
          drawOff(rx, ry, 4, 180, i % 2 === 0, 10);
        }
      }
    }
    if (this.farTreesCache) {
      ctx.drawImage(this.farTreesCache, 0, 0);
    }
    ctx.restore();

    // Layer 2: Mid Hills (parallax 0.65)
    ctx.save();
    ctx.translate(camX * 0.35, 0);

    if (!this.midHillSurfaceCache && treeImg.complete) {
      this.midHillSurfaceCache = document.createElement('canvas');
      this.midHillSurfaceCache.width = 5000;
      this.midHillSurfaceCache.height = 720;
      const mctx = this.midHillSurfaceCache.getContext('2d');
      const gImg = getTextureImage('grass1');
      if (mctx && gImg && gImg.complete) {
        mctx.beginPath();
        mctx.moveTo(this.midHillPoints[0].x, this.midHillPoints[0].y);
        for(let i=1; i<this.midHillPoints.length; i++) mctx.lineTo(this.midHillPoints[i].x, this.midHillPoints[i].y);
        mctx.lineTo(5000, 720); mctx.lineTo(0, 720); mctx.closePath();
        mctx.clip();

        const scale = 0.18 / 10;
        const tw = gImg.width * scale;
        const th = gImg.height * scale;
        for (let i = 0; i < 30000; i++) {
          const rx = Math.random() * 5000;
          const ry = 500 + Math.random() * 220;
          const rot = Math.random() * Math.PI * 2;
          mctx.save();
          mctx.translate(rx, ry);
          mctx.rotate(rot);
          mctx.globalAlpha = 0.7 + Math.random() * 0.3;
          mctx.drawImage(gImg, -tw/2, -th/2, tw, th);
          mctx.restore();
        }
        mctx.fillStyle = 'rgba(20, 26, 46, 0.85)';
        mctx.fillRect(0, 0, 5000, 720);
      }
    }
    if (this.midHillSurfaceCache) ctx.drawImage(this.midHillSurfaceCache, 0, 0);

    // Trees on mid hills (Dense Forest Cached)
    if (!this.midTreesCache && treeImg.complete && treeImg.naturalHeight > 0) {
      this.midTreesCache = document.createElement('canvas');
      this.midTreesCache.width = 5000;
      this.midTreesCache.height = 720;
      const octx = this.midTreesCache.getContext('2d');
      if (octx) {
        const drawOff = (tx: number, ty: number, tIdx: number, th: number, flip: boolean, br: number) => {
          const col = tIdx % 4;
          const row = Math.floor(tIdx / 4);
          octx.save();
          octx.translate(tx, ty);
          if (flip) octx.scale(-1, 1);
          octx.filter = `brightness(${br}%) hue-rotate(30deg) saturate(80%)`;
          octx.drawImage(treeImg, col * 256, row * 256, 256, 256, -th / 2, -th + 15, th, th);
          octx.restore();
        };

        const getMidHillY = (xPos: number) => {
          const clampedX = Math.max(0, Math.min(xPos, 5000));
          for (let j = 0; j < this.midHillPoints.length - 1; j++) {
            const p1 = this.midHillPoints[j];
            const p2 = this.midHillPoints[j+1];
            if (clampedX >= p1.x && clampedX <= p2.x) {
              return p1.y + ((clampedX - p1.x) / (p2.x - p1.x)) * (p2.y - p1.y);
            }
          }
          return 520;
        };

        for (let i = 0; i < 500; i++) {
          const rx = -100 + Math.random() * 5250;
          const ry = getMidHillY(rx) + Math.random() * 160;
          const hash = Math.abs(Math.sin(rx * 56.78 + ry * 987.6)) * 10000;
          if (hash % 100 < 48) continue;
          
          const tIdx = 0 + Math.floor(hash % 4);
          const th = 210 + (hash % 60);
          drawOff(rx, ry, tIdx, th, (Math.floor(hash) % 2 === 0), 15 + (hash % 5));
        }

        // 6 focused mid crest trees
        for (let i = 0; i < 6; i++) {
          const rx = 800 + i * 600 + (Math.cos(i) * 200);
          const ry = getMidHillY(rx);
          drawOff(rx, ry, 1, 280, i % 2 !== 0, 18);
        }
      }
    }
    if (this.midTreesCache) {
      ctx.drawImage(this.midTreesCache, 0, 0);
    }
    ctx.restore();

    // Foreground (parallax 1.0)
    
    if (!this.foregroundSurfaceCache && treeImg.complete) {
      this.foregroundSurfaceCache = document.createElement('canvas');
      this.foregroundSurfaceCache.width = 5000;
      this.foregroundSurfaceCache.height = 720;
      const gctx = this.foregroundSurfaceCache.getContext('2d');
      const gImg = getTextureImage('grass1');
      if (gctx && gImg && gImg.complete) {
        gctx.beginPath();
        gctx.moveTo(this.groundPoints[0].x, this.groundPoints[0].y);
        for(let i=1; i<this.groundPoints.length; i++) gctx.lineTo(this.groundPoints[i].x, this.groundPoints[i].y);
        gctx.lineTo(5000, 720); gctx.lineTo(0, 720); gctx.closePath();
        gctx.clip();

        const scale = 0.09;
        const tw = gImg.width * scale;
        const th = gImg.height * scale;
        for (let i = 0; i < 25000; i++) {
          const rx = Math.random() * 5000;
          const ry = 360 + Math.random() * 360;
          const rot = Math.random() * Math.PI * 2;
          gctx.save();
          gctx.translate(rx, ry);
          gctx.rotate(rot);
          gctx.globalAlpha = 0.7 + Math.random() * 0.3;
          gctx.drawImage(gImg, -tw/2, -th/2, tw, th);
          gctx.restore();
        }
        gctx.fillStyle = 'rgba(12, 30, 26, 0.85)';
        gctx.fillRect(0, 0, 5000, 720);
      }
    }
    if (this.foregroundSurfaceCache) ctx.drawImage(this.foregroundSurfaceCache, 0, 0);

    // Dirt path with blended edges
    const pathPat = getPattern('dirt_path', ctx, 0.055);
    
    const drawPathStroke = (width: number, alpha: number, isTint = false) => {
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(this.groundPoints[0].x, this.groundPoints[0].y);
      for(let i=1; i<this.groundPoints.length; i++) {
        ctx.lineTo(this.groundPoints[i].x, this.groundPoints[i].y);
      }
      ctx.globalAlpha = alpha;
      if (isTint) {
        ctx.strokeStyle = 'rgba(40, 35, 28, 0.6)';
        ctx.stroke();
      } else if (pathPat) {
        ctx.save();
        ctx.strokeStyle = pathPat;
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1.0;
    };

    // Outer blend (very wide, faint)
    ctx.save();
    // Clip path to the ground polygon to prevent it from bleeding into the ocean
    ctx.beginPath();
    ctx.moveTo(this.groundPoints[0].x, this.groundPoints[0].y);
    for(let i=1; i<this.groundPoints.length; i++) {
      ctx.lineTo(this.groundPoints[i].x, this.groundPoints[i].y);
    }
    ctx.lineTo(5000, 720);
    ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.clip();

    drawPathStroke(103, 0.15);
    // Middle blend
    drawPathStroke(79, 0.35);
    // Main path texture
    drawPathStroke(55, 0.8);
    // Main path tint
    drawPathStroke(55, 1.0, true);
    ctx.restore();
    
    // Boulders
    const drawBoulder = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
      fillWithTexture(ctx, 'cobblestone_2', `rgba(${r}, ${g}, ${b}, 0.7)`, () => {
        ctx.beginPath();
        ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI*2);
        ctx.fill();
      }, 1.8);
    };
    
    drawBoulder(90, this.getFloorY(90) + 5, 80, 60, 74, 76, 82);
    drawBoulder(90+70, this.getFloorY(160) + 5, 50, 42, 54, 60, 80);
    drawBoulder(90+110, this.getFloorY(200) + 5, 36, 30, 46, 52, 72);
    drawBoulder(90+30, this.getFloorY(120) + 5, 24, 20, 52, 58, 78);
    
    drawBoulder(1210, this.getFloorY(1210) + 5, 64, 48, 74, 82, 104);
    drawBoulder(1210+60, this.getFloorY(1270) + 5, 44, 36, 70, 78, 98);
    drawBoulder(1210+100, this.getFloorY(1310) + 5, 36, 30, 76, 84, 112);
    
    drawBoulder(2110, this.getFloorY(2110) + 5, 28, 22, 58, 64, 80);
    drawBoulder(2110+30, this.getFloorY(2140) + 5, 20, 16, 54, 60, 76);
    
    // Main forest trees
    drawSpriteTree(2600, this.getFloorY(2600), 0, 320);
    drawSpriteTree(2820, this.getFloorY(2820), 1, 380, true);
    drawSpriteTree(2980, this.getFloorY(2980), 2, 340);
    drawSpriteTree(2440, this.getFloorY(2440), 11, 280); // dead snag
    drawSpriteTree(3050, this.getFloorY(3050), 3, 400);
    
    // Additional background-ish trees on the main ground
    drawSpriteTree(1500, this.getFloorY(1500), 4, 300);
    drawSpriteTree(1700, this.getFloorY(1700), 5, 380, true);
    drawSpriteTree(1900, this.getFloorY(1900), 6, 280);
    drawSpriteTree(2200, this.getFloorY(2200), 1, 360);
    drawSpriteTree(2720, this.getFloorY(2720), 2, 320, true);
    drawSpriteTree(3200, this.getFloorY(3200), 4, 340);
    drawSpriteTree(3400, this.getFloorY(3400), 5, 380);
    drawSpriteTree(3600, this.getFloorY(3600), 0, 310, true);
    drawSpriteTree(3800, this.getFloorY(3800), 3, 420);
    drawSpriteTree(4000, this.getFloorY(4000), 6, 300);
    drawSpriteTree(4200, this.getFloorY(4200), 1, 340, true);
    drawSpriteTree(4400, this.getFloorY(4400), 2, 360);
    drawSpriteTree(4600, this.getFloorY(4600), 5, 390);
    drawSpriteTree(4800, this.getFloorY(4800), 3, 350);
    drawSpriteTree(5050, this.getFloorY(5050), 0, 420, true);
    

    
    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);

    // ── Foreground trees (Parallax > 1.0) ─────────────────────────
    
    // Near Foreground (1.3x)
    ctx.save();
    ctx.translate(-camX * 0.3, 0); // 1.3x effective (engine already did 1.0x)
    
    const drawForegroundPine = (x: number, y: number, th: number, brightness = 25) => {
      if (!treeImg.complete || treeImg.naturalHeight === 0) return;
      const width = th;
      ctx.save();
      ctx.translate(x, y);
      
      const windAngle = Math.sin(this.time * 1.5 + x * 0.005) * 0.025;
      ctx.rotate(windAngle);
      
      ctx.filter = `brightness(${brightness}%) hue-rotate(30deg) saturate(90%)`;
      ctx.drawImage(treeImg, 0, 0, 256, 256, -width / 2, -th + 15, width, th);
      ctx.restore();
    };

    drawForegroundPine(400, 750, 600);
    drawForegroundPine(1200, 750, 650);
    drawForegroundPine(1800, 750, 700);
    drawForegroundPine(2600, 750, 620);
    drawForegroundPine(3200, 750, 580);
    drawForegroundPine(4000, 750, 690);
    drawForegroundPine(4800, 750, 650);
    drawForegroundPine(5400, 750, 620);
    drawForegroundPine(6000, 750, 680);
    drawForegroundPine(6500, 750, 640);
    ctx.restore();

    // Extreme Foreground (1.5x)
    ctx.save();
    ctx.translate(-camX * 0.5, 0); // 1.5x total
    
    drawForegroundPine(100, 800, 750, 10);
    drawForegroundPine(800, 800, 800, 15);
    drawForegroundPine(1600, 800, 820, 12);
    drawForegroundPine(2500, 800, 900, 12);
    drawForegroundPine(3400, 800, 780, 14);
    drawForegroundPine(4200, 800, 850, 14);
    drawForegroundPine(4900, 800, 880, 11);
    drawForegroundPine(5600, 800, 800, 13);
    drawForegroundPine(6300, 800, 880, 10);
    drawForegroundPine(6800, 800, 850, 12);
    ctx.restore();

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
