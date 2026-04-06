import { Scene } from '../../engine/GameEngine';
import { Player } from '../Player';
import { Arrow } from '../Arrow';
import { PALETTE, DEFAULT_FADE_MS } from '../Constants';
import { fillWithTexture, getTextureImage } from '../Textures';
import retroTreeUrl from '../../RetroTree.png';

const treeImg = new Image();
treeImg.src = retroTreeUrl;

export class BedroomScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;
  
  endingState = 0; // 0: not started, 1-7: steps
  endingTimer = 0;

  onEnter(direction: 'left' | 'right' = 'left') {
    const spawnX = direction === 'right' ? 1160 : 100;
    const facing = direction === 'right' ? 'left' : 'right';
    
    this.player = new Player(
      this.engine, 
      spawnX, 638, facing, 
      () => 650,
      (arrow) => this.arrows.push(arrow)
    );
    this.engine.camera.x = 0;
  }

  update(dt: number) {
    this.time += dt;
    
    if (this.endingState === 0) {
      this.player.update(dt);
      if (this.player.x >= 760) {
        this.player.x = 760;
        this.player.vx = 0;
        this.player.state = 'idle';
        this.player.frozen = true;
        this.endingState = 1;
        this.endingTimer = 0;
      }
      
      // Walk back (only if haven't crossed ending trigger yet)
      if (this.player.x <= 10 && this.engine.transitionState === 'none') {
        this.engine.goBack();
      }
    } else {
      this.endingTimer += dt * 1000;
      
      if (this.endingTimer >= 13300) {
        this.endingState = 7;
        if (this.engine.input.isDown(['Space', 'Enter'])) {
          this.engine.globalState.axesThreaded = 0;
          this.engine.globalState.arrowsFired = 0;
          this.engine.globalState.trialActive = false;
          this.engine.globalState.hasBow = false;
          this.engine.globalState.trialCompleted = false;
          this.engine.globalState.playerHealth = this.engine.globalState.playerMaxHealth;
          this.engine.globalState.playerInvincibleTimer = 0;
          
          import('./TitleScene').then(({ TitleScene }) => {
            this.engine.switchScene(new TitleScene(), DEFAULT_FADE_MS);
          });
        }
      } else if (this.endingTimer >= 12100) {
        this.endingState = 6;
      } else if (this.endingTimer >= 8900) {
        this.endingState = 5;
      } else if (this.endingTimer >= 5000) {
        this.endingState = 4;
      } else if (this.endingTimer >= 3200) {
        this.endingState = 3;
      } else if (this.endingTimer >= 1200) {
        this.endingState = 2;
      }
    }
    
    for (const arrow of this.arrows) {
      arrow.update(dt);
      if (arrow.y >= 650) arrow.active = false;
    }
    this.arrows = this.arrows.filter(a => a.active);
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Ceiling — cobblestone texture
    fillWithTexture(ctx, 'cobblestone', 'rgba(4, 6, 10, 0.78)', () => {
      ctx.fillRect(0, 0, 1280, 140);
    }, 0.15);
    
    // Walls — cobblestone texture
    fillWithTexture(ctx, 'cobblestone', 'rgba(14, 16, 32, 0.68)', () => {
      ctx.fillRect(0, 140, 1280, 500);
    }, 0.15);
    
    ctx.strokeStyle = '#080a18';
    ctx.lineWidth = 2;
    for (let y = 140; y < 640; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
      const offset = (y / 50) % 2 === 0 ? 0 : 40;
      for (let x = offset; x < 1280; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 50); ctx.stroke();
      }
    }
    
    // Tapestries
    const drawTapestry = (x: number, y: number, cb: string, cp: string, bc: string, fc: string) => {
      ctx.fillStyle = cb;
      ctx.fillRect(x - 40, y, 80, 160);
      ctx.strokeStyle = bc;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 40, y, 80, 160);
      ctx.fillStyle = cp;
      ctx.beginPath(); ctx.arc(x, y + 80, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = fc;
      for(let i=0; i<8; i++) {
        ctx.fillRect(x - 40 + i*10 + 2, y + 160, 6, 10);
      }
    };
    drawTapestry(300, 200, '#1a1828', '#241e30', '#302838', '#2a2230');
    drawTapestry(900, 200, '#181826', '#22202e', '#2e2836', '#28202e');
    
    // Window
    ctx.fillStyle = '#1e2030';
    ctx.fillRect(60 - 90, 180, 180, 360);
    ctx.beginPath(); ctx.arc(60, 180, 90, Math.PI, 0); ctx.fill();
    
    ctx.fillStyle = `rgba(184, 200, 232, 0.15)`;
    ctx.fillRect(60 - 80, 180, 75, 115);
    ctx.fillRect(60 + 5, 180, 75, 115);
    ctx.fillRect(60 - 80, 300, 75, 115);
    ctx.fillRect(60 + 5, 300, 75, 115);
    ctx.fillRect(60 - 80, 420, 75, 115);
    ctx.fillRect(60 + 5, 420, 75, 115);
    ctx.beginPath(); ctx.arc(60, 180, 80, Math.PI, 0); ctx.fill();
    
    // Moon in window
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      // Clip moon to window area
      ctx.beginPath();
      ctx.arc(60, 180, 80, Math.PI, 0);
      ctx.rect(60 - 80, 180, 160, 350);
      ctx.clip();
      
      const moonX = 60 + 30; // Positioned in a top pane
      const moonY = 180 + 20;
      const moonSize = 50;
      
      // Glow
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#b8c8e8';
      ctx.beginPath(); ctx.arc(moonX, moonY, 30, 0, Math.PI*2); ctx.fill();
      
      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }
    
    // Moonbeam
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(60, 180);
    ctx.rotate(12 * Math.PI / 180);
    const pulse = Math.sin(this.time * 0.18) * 0.04;
    ctx.fillStyle = `rgba(184, 200, 232, ${0.18 + pulse})`;
    ctx.beginPath();
    ctx.moveTo(-100, 0);
    ctx.lineTo(320, -100);
    ctx.lineTo(320, 100);
    ctx.lineTo(-100, 0);
    ctx.fill();
    ctx.restore();
    
    // Floor — dirty cobblestone texture
    fillWithTexture(ctx, 'dirty', 'rgba(26, 28, 40, 0.65)', () => {
      ctx.fillRect(0, 650, 1280, 70);
    }, 0.15);
    
    // Moonbeam patch
    ctx.fillStyle = `rgba(184, 200, 232, ${0.12 + pulse})`;
    ctx.beginPath();
    ctx.ellipse(80, 650, 100, 30, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Bed frame back
    ctx.fillStyle = '#2a1e08';
    ctx.fillRect(600 - 150, 650 - 100, 300, 100);
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(600 - 150, 650 - 180, 18, 180); // back left
    ctx.fillRect(600 + 150 - 18, 650 - 180, 18, 180); // back right
    
    // Olive Tree
    ctx.save();
    ctx.translate(840, 650);
    
    // Olive Tree (Pre-made asset)
    if (treeImg.complete && treeImg.naturalHeight > 0) {
      const size = 650;
      const typeIndex = 2; // Selection for a gnarly-looking tree
      const col = typeIndex % 4;
      const row = Math.floor(typeIndex / 4);
      
      ctx.save();
      // Position the base of the tree near the back of the bed frame
      ctx.translate(0, -90);
      
      // Filter it to fit the dark bedroom aesthetic
      ctx.filter = `brightness(25%) sepia(20%) hue-rotate(15deg) saturate(110%)`;
      ctx.drawImage(treeImg, col * 256, row * 256, 256, 256, -size / 2 + 20, -size, size, size);
      ctx.restore();
    }
    
    // Fireflies in the tree
    for (let i = 0; i < 25; i++) {
      // Deterministic pseudo-random positions roughly mapping to the new tree's canopy
      const fx = Math.sin(i * 13.5) * 160 + 20;
      const fy = Math.cos(i * 7.2) * 180 - 450;
      
      // Slow twinkle effect
      const twinkle = Math.sin(this.time * 1.5 + i * 2.1) * 0.5 + 0.5;
      
      ctx.fillStyle = `rgba(255, 200, 50, ${twinkle * 0.8})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.5 + twinkle * 0.5, 0, Math.PI*2);
      ctx.fill();
      
      // Glow
      ctx.fillStyle = `rgba(255, 150, 20, ${twinkle * 0.3})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 4 + twinkle * 2, 0, Math.PI*2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // Bed frame front
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(600 - 160, 650 - 80, 320, 80);
    ctx.fillRect(600 - 160, 650 - 180, 18, 180); // front left
    ctx.fillRect(600 + 160 - 18, 650 - 180, 18, 180); // front right
    ctx.fillStyle = '#b0a888';
    ctx.fillRect(600 - 150, 650 - 90, 300, 20); // linen
    
    // Player
    this.player.draw(ctx);
    for (const arrow of this.arrows) arrow.draw(ctx);
    
    // Ending Sequence Overlays
    if (this.endingState >= 2) {
      let dimAlpha = 0;
      if (this.endingState === 2) {
        dimAlpha = Math.min((this.endingTimer - 1200) / DEFAULT_FADE_MS, 1) * 0.85;
      } else {
        dimAlpha = 0.85;
      }
      ctx.fillStyle = `rgba(40, 34, 46, ${dimAlpha})`;
      ctx.fillRect(0, 0, 1280, 720);
    }
    
    if (this.endingState >= 3) {
      let overAlpha = 0;
      if (this.endingState === 3) {
        overAlpha = Math.min((this.endingTimer - 3200) / DEFAULT_FADE_MS, 1) * 0.82;
      } else {
        overAlpha = 0.82;
      }
      ctx.fillStyle = `rgba(0, 0, 0, ${overAlpha})`;
      ctx.fillRect(0, 0, 1280, 720);
    }
    
    ctx.textAlign = 'center';
    
    if (this.endingState >= 4) {
      let textAlpha = 1;
      if (this.endingState === 4) {
        textAlpha = Math.min((this.endingTimer - 5000) / DEFAULT_FADE_MS, 1);
      }
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = PALETTE.amber_gold;
      ctx.font = '28px sans-serif';
      ctx.fillText('THE TRIAL IS WON', 640, 360);
      ctx.globalAlpha = 1;
    }
    
    if (this.endingState >= 5) {
      let subAlpha = 1;
      if (this.endingState === 5) {
        subAlpha = Math.min((this.endingTimer - 8900) / DEFAULT_FADE_MS, 1);
      }
      ctx.globalAlpha = subAlpha;
      ctx.fillStyle = '#a09070';
      ctx.font = '14px sans-serif';
      ctx.fillText('Odysseus strings the great bow.', 640, 360 + 60);
      ctx.fillText('The axes fall silent.', 640, 360 + 80);
      ctx.fillText('He has come home.', 640, 360 + 100);
      ctx.globalAlpha = 1;
    }
    
    if (this.endingState >= 6) {
      let promptAlpha = 1;
      if (this.endingState === 6) {
        promptAlpha = Math.min((this.endingTimer - 12100) / 1200, 1);
      }
      ctx.globalAlpha = promptAlpha;
      ctx.fillStyle = '#686050';
      ctx.font = '11px sans-serif';
      ctx.fillText('Press Space to begin again', 640, 360 + 140);
      ctx.globalAlpha = 1;
    }
  }
}
