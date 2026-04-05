import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { BedroomScene } from './BedroomScene';
import { fillWithTexture, getTextureImage } from '../Textures';
import { drawTorch } from '../Torch';

export class CorridorScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  
  stars: {x: number, y: number, size: number}[] = [];

  constructor() {
    super();
    for(let i=0; i<30; i++) {
      this.stars.push({
        x: 80 - 60 + Math.random() * 120,
        y: 220 - 140 + Math.random() * 280,
        size: Math.random() > 0.8 ? 2 : 1
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
      ctx.fillRect(0, 120, 580, 520);
    }, 0.15);
    fillWithTexture(ctx, 'cobblestone', 'rgba(20, 24, 32, 0.65)', () => {
      ctx.fillRect(640, 120, 640, 520);
    }, 0.15);
    
    ctx.strokeStyle = '#0c1018';
    ctx.lineWidth = 2;
    for (let y = 120; y < 640; y += 44) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(580, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(640, y); ctx.lineTo(1280, y); ctx.stroke();
      const offset = (y / 44) % 2 === 0 ? 0 : 35;
      for (let x = offset; x < 580; x += 70) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke();
      }
      for (let x = 640 + offset; x < 1280; x += 70) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 44); ctx.stroke();
      }
    }
    
    // Window arch
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(80 - 60 - 40, 220, 120 + 80, 280);
    ctx.beginPath();
    ctx.arc(80, 220, 60 + 40, Math.PI, 0);
    ctx.fill();
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      const moonX = 80 + 20;
      const moonY = 220 + 30;
      const moonSize = 40;
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#b8c8e8';
      ctx.beginPath(); ctx.arc(moonX, moonY, 25, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }
    
    // Night sky panel
    ctx.fillStyle = '#0a0d1f';
    ctx.fillRect(80 - 60, 220, 120, 280);
    ctx.beginPath();
    ctx.arc(80, 220, 60, Math.PI, 0);
    ctx.fill();
    
    ctx.fillStyle = PALETTE.star_color;
    for(const star of this.stars) {
      const dx = star.x - 80;
      const dy = star.y - 220;
      if (star.y > 220 || (dx*dx + dy*dy < 60*60)) {
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }
    
    // Moonbeam
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(80, 220);
    ctx.rotate(8 * Math.PI / 180);
    const pulse = Math.sin(this.time * 0.22) * 0.04;
    ctx.fillStyle = `rgba(184, 200, 232, ${0.14 + pulse})`;
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(320, -50);
    ctx.lineTo(320, 50);
    ctx.lineTo(-50, 0);
    ctx.fill();
    ctx.restore();
    
    // Torches (drawn behind door/curtain)
    const torches = [
      { x: 240, y: 380, phase: 0.0 },
      { x: 460, y: 380, phase: 0.7 },
      { x: 720, y: 380, phase: 1.4 },
      { x: 940, y: 380, phase: 2.1 }
    ];
    
    for (const t of torches) {
      drawTorch(ctx, t.x, t.y, this.time, t.phase);
      
      const flicker = Math.sin(this.time * 2.8 + t.phase) * 0.2 + (Math.random() * 0.1);
      
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const rgrad = ctx.createRadialGradient(t.x, t.y - 8, 0, t.x, t.y - 8, 90);
      rgrad.addColorStop(0, `rgba(255, 136, 32, ${0.28 + flicker*0.05})`);
      rgrad.addColorStop(1, 'rgba(255, 136, 32, 0)');
      ctx.fillStyle = rgrad;
      ctx.fillRect(t.x - 90, t.y - 98, 180, 180);
      ctx.restore();
    }
    
    // Door right
    ctx.fillStyle = '#2a1a08';
    ctx.fillRect(1020 - 70, 650 - 280, 140, 280);
    ctx.fillStyle = '#140c04';
    for(let i=1; i<6; i++) {
      ctx.fillRect(1020 - 70 + i * (140/6), 650 - 280, 2, 280);
    }
    ctx.fillStyle = '#1e1e20';
    ctx.fillRect(1020 - 70, 650 - 220, 140, 10);
    ctx.fillRect(1020 - 70, 650 - 140, 140, 10);
    ctx.fillRect(1020 - 70, 650 - 60, 140, 10);
    
    // Curtain
    ctx.fillStyle = '#8a7040';
    ctx.fillRect(1020 - 90, 650 - 280 - 10, 180, 6);
    ctx.fillStyle = '#6a1010';
    ctx.beginPath();
    ctx.moveTo(1020 - 90, 650 - 280 - 4);
    ctx.lineTo(1020 + 90, 650 - 280 - 4);
    ctx.lineTo(1020 + 90, 650 - 280 - 4 + 300);
    ctx.lineTo(1020 + 70, 650 - 280 - 4 + 280);
    ctx.lineTo(1020, 650 - 280 - 4 + 300);
    ctx.lineTo(1020 - 70, 650 - 280 - 4 + 280);
    ctx.lineTo(1020 - 90, 650 - 280 - 4 + 300);
    ctx.fill();
    
    // Floor — dirty cobblestone texture
    fillWithTexture(ctx, 'dirty', 'rgba(30, 32, 48, 0.65)', () => {
      ctx.fillRect(0, 650, 1280, 70);
    }, 0.15);
    
    // Moonbeam patch
    ctx.fillStyle = `rgba(184, 200, 232, ${0.12 + pulse})`;
    ctx.beginPath();
    ctx.ellipse(120, 650, 50, 15, 0, 0, Math.PI*2);
    ctx.fill();
    
    
    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);
  }
}
