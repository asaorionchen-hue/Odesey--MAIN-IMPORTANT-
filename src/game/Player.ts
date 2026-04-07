import { Input } from '../engine/Input';
import { GameEngine } from '../engine/GameEngine';
import { PALETTE } from './Constants';
import { Arrow } from './Arrow';

import imgRunRightSrc from '../Odesus-run-right.png';
import imgRunLeftSrc from '../Odesus-run-Left.png';
import imgIdleSrc from '../Idle-ezgif.png';
import imgAttackRightSrc from '../Odesus-attack right.png';
import imgAttackLeftSrc from '../Odesus-attack-left.png';

const imgRunRight = new Image(); imgRunRight.src = imgRunRightSrc;
const imgRunLeft = new Image(); imgRunLeft.src = imgRunLeftSrc;
const imgIdle = new Image(); imgIdle.src = imgIdleSrc;
const imgAttackRight = new Image(); imgAttackRight.src = imgAttackRightSrc;
const imgAttackLeft = new Image(); imgAttackLeft.src = imgAttackLeftSrc;

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  facing: 'left' | 'right' = 'right';
  state: 'idle' | 'walk' | 'jump' | 'bow_draw' | 'bow_idle' | 'attack' = 'idle';
  allowJump: boolean = false;
  
  bowDrawTime = 0;
  animTime = 0;
  attackTime = 0;
  attackFrame = 0;
  
  // Physics constants
  gravity = 980;
  gravityFactor = 1.0;   // Scenes override this (< 1 for reduced gravity)
  walkSpeed = 180;
  jumpVelocity = -420;
  decelerationFactor = 12;
  
  width = 28;
  height = 56;
  
  engine: GameEngine;
  getFloorY: (x: number) => number;
  onFireArrow: (arrow: Arrow) => void;

  frozen = false;

  constructor(engine: GameEngine, x: number, y: number, facing: 'left'|'right', getFloorY: (x: number) => number, onFireArrow: (arrow: Arrow) => void) {
    this.engine = engine;
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.getFloorY = getFloorY;
    this.onFireArrow = onFireArrow;
  }

  /** Whether the attack hit zone is currently active (frames 12–18) */
  get isAttackHitActive(): boolean {
    return this.state === 'attack' && this.attackFrame >= 12 && this.attackFrame <= 18;
  }

  /** Get the hit zone rectangle in world coords [x, y, w, h] */
  getAttackHitBox(): [number, number, number, number] {
    const bodyHalf = this.width / 2; // 14px
    const swordReach = 60;
    if (this.facing === 'right') {
      // From player's left edge to sword tip in front
      return [this.x - bodyHalf, this.y - 70, bodyHalf + swordReach, 70];
    } else {
      return [this.x - swordReach, this.y - 70, swordReach + bodyHalf, 70];
    }
  }

  /** Trigger the attack animation */
  startAttack() {
    if (this.state === 'attack') return;
    this.state = 'attack';
    this.attackTime = 0;
    this.attackFrame = 0;
    
    // Stop horizontal movement when initiating an attack
    this.vx = 0;
  }

  update(dt: number) {
    if (this.frozen) return;
    
    this.animTime += dt;
    
    const input = this.engine.input;

    // Attack animation — locks movement, plays to completion
    if (this.state === 'attack') {
      this.attackTime += dt;
      this.attackFrame = Math.floor(this.attackTime * 18); // 18 fps
      if (this.attackFrame >= 25) {
        this.state = 'idle';
        this.attackTime = 0;
        this.attackFrame = 0;
      }
      // Still apply gravity during attack
      this.vy += this.gravity * this.gravityFactor * dt;
      this.y += this.vy * dt;
      const floorY = this.getFloorY(this.x);
      if (this.y >= floorY && this.vy > 0) { this.y = floorY; this.vy = 0; }
      return;
    }

    // Global attack trigger (available in any scene)
    if (this.state !== 'bow_draw' && !this.frozen) {
      if (input.isDown(['KeyZ', 'KeyE']) || (!this.engine.globalState.hasBow && input.mouse.left)) {
        this.startAttack();
        return;
      }
    }
    
    // Bow mechanics
    if (this.engine.globalState.hasBow) {
      if (input.mouse.left || input.isDown(['KeyF'])) {
        this.state = 'bow_draw';
        this.bowDrawTime += dt;
        if (this.bowDrawTime > 1.2) this.bowDrawTime = 1.2;
        
        // Face mouse
        const screenMouseX = input.mouse.x;
        const worldMouseX = screenMouseX + this.engine.camera.x;
        this.facing = worldMouseX > this.x ? 'right' : 'left';
      } else if (this.state === 'bow_draw') {
        // Fire arrow
        if (this.bowDrawTime >= 0.15) {
          const drawPct = this.bowDrawTime / 1.2;
          const speed = 400 + 800 * drawPct;
          
          const screenMouseX = input.mouse.x;
          const screenMouseY = input.mouse.y;
          const worldMouseX = screenMouseX + this.engine.camera.x;
          const worldMouseY = screenMouseY + this.engine.camera.y;
          
          const dx = worldMouseX - this.x;
          const dy = worldMouseY - (this.y - 40);
          const angle = Math.atan2(dy, dx);
          
          const arrow = new Arrow(this.x, this.y - 40, Math.cos(angle) * speed, Math.sin(angle) * speed);
          this.onFireArrow(arrow);
          this.engine.globalState.arrowsFired++;
        }
        this.bowDrawTime = 0;
        this.state = 'bow_idle';
      }
    }

    // Movement
    if (this.state !== 'bow_draw') {
      let moveDir = 0;
      if (input.isDown(['ArrowLeft', 'KeyA'])) moveDir -= 1;
      if (input.isDown(['ArrowRight', 'KeyD'])) moveDir += 1;
      
      if (moveDir !== 0) {
        this.vx = moveDir * this.walkSpeed;
        this.facing = moveDir > 0 ? 'right' : 'left';
        if (this.vy === 0) this.state = 'walk';
      } else {
        this.vx -= this.vx * this.decelerationFactor * dt;
        if (Math.abs(this.vx) < 1) this.vx = 0;
        if (this.vy === 0) this.state = this.engine.globalState.hasBow ? 'bow_idle' : 'idle';
      }
      
      if (input.isDown(['ArrowUp', 'KeyW', 'Space']) && this.vy === 0 && this.allowJump) {
        this.vy = this.jumpVelocity;
        this.state = 'jump';
      }
    } else {
      // Decelerate while drawing
      this.vx -= this.vx * this.decelerationFactor * dt;
      if (Math.abs(this.vx) < 1) this.vx = 0;
    }

    this.vy += this.gravity * this.gravityFactor * dt;
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    const floorY = this.getFloorY(this.x);
    if (this.y >= floorY && this.vy > 0) {
      this.y = floorY;
      this.vy = 0;
      if (this.state === 'jump') this.state = 'idle';
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Ground shadow
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Character Image
    let imgToDraw = imgIdle;
    let cols = 1;
    let rows = 1;
    let totalFrames = 1;
    let animSpeed = 1; // Frames per second
    
    if (this.state === 'attack') {
      imgToDraw = this.facing === 'right' ? imgAttackRight : imgAttackLeft;
      cols = 5;
      rows = 5;
      totalFrames = 25;
      animSpeed = 18;
    } else if (this.state === 'walk') {
      imgToDraw = this.facing === 'right' ? imgRunRight : imgRunLeft;
      cols = 5;
      rows = 5;
      totalFrames = 25;
      animSpeed = 12; // Slowed playback speed
    } else {
      imgToDraw = imgIdle;
      cols = 1;
      rows = 1;
      totalFrames = 1;
      animSpeed = 1;
    }
    
    const currentFrame = this.state === 'attack'
      ? Math.min(this.attackFrame, totalFrames - 1)
      : Math.floor(this.animTime * animSpeed) % totalFrames;
    const col = currentFrame % cols;
    const row = Math.floor(currentFrame / cols);
    
    ctx.save();
    if (imgToDraw === imgIdle && this.facing === 'left') {
      ctx.scale(-1, 1);
    }
    
    if (imgToDraw.complete && imgToDraw.naturalHeight > 0) {
      const frameWidth = imgToDraw.naturalWidth / cols;
      const frameHeight = imgToDraw.naturalHeight / rows;
      
      // Scale the image so its height is roughly 143px (increased by ~15 pixels)
      const targetHeight = 143;
      const scale = targetHeight / frameHeight;
      const w = frameWidth * scale;
      const h = targetHeight;
      
      // Scaled up yOffset proportionally to keep feet touching ground
      let yOffset = 31;
      if (this.state === 'walk') {
        yOffset -= 11; // proportional adjustment for running
      }
      if (this.state === 'attack') {
        yOffset -= 15; // raise attack animation
      }
      
      // Draw centered horizontally, resting on the ground (y=0) + yOffset
      ctx.drawImage(
        imgToDraw, 
        col * frameWidth, row * frameHeight, frameWidth, frameHeight, // Source rect
        -w / 2, -h + yOffset, w, h // Destination rect
      );
    }
    ctx.restore();
    
    // Bow
    if (this.engine.globalState.hasBow) {
      ctx.strokeStyle = "#3a2810";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.facing === 'right') {
        ctx.arc(10, -40, 14, -Math.PI/2, Math.PI/2);
      } else {
        ctx.arc(-10, -40, 14, Math.PI/2, -Math.PI/2);
      }
      ctx.stroke();
      
      if (this.state === 'bow_draw') {
        // Draw string pulled back
        ctx.strokeStyle = '#8a7850';
        ctx.beginPath();
        if (this.facing === 'right') {
          ctx.moveTo(10, -54);
          ctx.lineTo(10 - 10 * (this.bowDrawTime/1.2), -40);
          ctx.lineTo(10, -26);
        } else {
          ctx.moveTo(-10, -54);
          ctx.lineTo(-10 + 10 * (this.bowDrawTime/1.2), -40);
          ctx.lineTo(-10, -26);
        }
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
}
