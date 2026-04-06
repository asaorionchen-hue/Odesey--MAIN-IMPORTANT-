/**
 * Suitor — an animated enemy that chases and attacks the player.
 *
 * Drawing is fully procedural (no sprite sheet required).
 * States: spawn → idle → walk → attack → (dying → dead)
 *
 * Each suitor has a tunic colour so they look distinct.
 */

export type SuitorState = 'spawn' | 'idle' | 'walk' | 'attack' | 'dying' | 'dead';

// Visual variety
const TUNIC_COLORS = [
  { body: '#3a1828', limb: '#2a1020', belt: '#6a4830' },   // dark crimson
  { body: '#1a2838', limb: '#0e1828', belt: '#4a5a6a' },   // navy blue
  { body: '#2a2a18', limb: '#1a1a0e', belt: '#6a6030' },   // olive drab
  { body: '#2e1830', limb: '#1e0e20', belt: '#5a3860' },   // purple
  { body: '#1a3028', limb: '#0e2018', belt: '#3a6a50' },   // teal
];

export class Suitor {
  x: number;
  y: number;
  facing: 'left' | 'right' = 'left';
  state: SuitorState = 'spawn';

  // Timers
  spawnDelay: number;       // ms before appearing
  spawnTimer = 0;           // accumulates
  animTime = 0;
  attackTime = 0;
  attackCooldown = 0;       // seconds until next attack
  deathTimer = 0;
  hitFlash = 0;             // >0 → draw white

  // Stats
  hp = 2;                   // takes 2 hits to die
  alive = true;
  opacity = 0;

  // AI tuning
  walkSpeed = 70;
  aggroRange = 400;         // start walking when player is this close
  attackRange = 60;         // swing when this close
  attackDuration = 0.6;     // seconds for full swing animation
  attackDamageFrame = 0.3;  // the moment damage is dealt
  hasDamagedThisSwing = false;

  // Appearance
  colorIndex: number;

  constructor(x: number, y: number, spawnDelayMs: number, colorIndex: number) {
    this.x = x;
    this.y = y;
    this.spawnDelay = spawnDelayMs;
    this.colorIndex = colorIndex % TUNIC_COLORS.length;
    // Randomise speed slightly so they don't stack
    this.walkSpeed = 60 + Math.random() * 40;
    this.attackCooldown = 0.4 + Math.random() * 0.3;
  }

  /** Returns axis-aligned bounding box [x, y, w, h] for hit detection */
  getHitBox(): [number, number, number, number] {
    return [this.x - 18, this.y - 80, 36, 80];
  }

  /** Returns the weapon swing hitbox during attack frame */
  getAttackHitBox(): [number, number, number, number] | null {
    if (this.state !== 'attack') return null;
    if (this.attackTime < this.attackDamageFrame - 0.08 || this.attackTime > this.attackDamageFrame + 0.12) return null;
    const offX = this.facing === 'right' ? 20 : -20 - 50;
    return [this.x + offX, this.y - 65, 50, 50];
  }

  /** Take a hit. Returns true if the suitor died. */
  takeDamage(): boolean {
    if (!this.alive || this.state === 'dying' || this.state === 'dead') return false;
    this.hp--;
    this.hitFlash = 0.15;
    if (this.hp <= 0) {
      this.state = 'dying';
      this.deathTimer = 0;
      return true;
    }
    return false;
  }

  update(dt: number, playerX: number) {
    if (this.state === 'dead') return;

    this.animTime += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // ------- Spawn phase -------
    if (this.state === 'spawn') {
      this.spawnTimer += dt * 1000;
      if (this.spawnTimer >= this.spawnDelay) {
        this.state = 'idle';
      }
      this.opacity = Math.min(1, this.spawnTimer / (this.spawnDelay + 600));
      return;
    }
    // Finish fading in
    if (this.opacity < 1) this.opacity = Math.min(1, this.opacity + dt / 0.6);

    // ------- Dying -------
    if (this.state === 'dying') {
      this.deathTimer += dt;
      this.opacity = Math.max(0, 1 - this.deathTimer / 0.5);
      if (this.deathTimer >= 0.5) {
        this.state = 'dead';
        this.alive = false;
      }
      return;
    }

    // ------- AI -------
    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    this.facing = dx < 0 ? 'left' : 'right';

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // Attack state
    if (this.state === 'attack') {
      this.attackTime += dt;
      if (this.attackTime >= this.attackDuration) {
        this.state = 'idle';
        this.attackTime = 0;
        this.attackCooldown = 0.8 + Math.random() * 0.6;
        this.hasDamagedThisSwing = false;
      }
      return;
    }

    // Decide to walk or attack
    if (dist <= this.attackRange && this.attackCooldown <= 0) {
      this.state = 'attack';
      this.attackTime = 0;
      this.hasDamagedThisSwing = false;
    } else if (dist <= this.aggroRange && dist > this.attackRange) {
      this.state = 'walk';
      const dir = dx > 0 ? 1 : -1;
      this.x += dir * this.walkSpeed * dt;
    } else {
      this.state = 'idle';
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === 'dead' || this.opacity <= 0.01) return;

    const palette = TUNIC_COLORS[this.colorIndex];
    const flashing = this.hitFlash > 0;
    const bodyColor = flashing ? '#ffffff' : palette.body;
    const limbColor = flashing ? '#dddddd' : palette.limb;
    const beltColor = flashing ? '#ffffff' : palette.belt;
    const skinColor = flashing ? '#ffffff' : '#c8a878';
    const headColor = flashing ? '#ffffff' : '#1a1420';

    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);

    const flip = this.facing === 'left' ? 1 : -1;

    // Shadow under feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- animation offsets ---
    let legPhase = 0;
    let armSwing = 0;
    let bodyBob = 0;
    let swordAngle = 0;

    if (this.state === 'walk') {
      legPhase = Math.sin(this.animTime * 8) * 12;
      bodyBob = Math.abs(Math.sin(this.animTime * 8)) * 2;
      armSwing = Math.sin(this.animTime * 8) * 15;
    } else if (this.state === 'attack') {
      const t = this.attackTime / this.attackDuration;
      // Wind up (0–0.4), strike (0.4–0.6), recover (0.6–1.0)
      if (t < 0.4) {
        swordAngle = -60 * (t / 0.4);        // wind back
        armSwing = -20 * (t / 0.4);
      } else if (t < 0.6) {
        const st = (t - 0.4) / 0.2;
        swordAngle = -60 + 150 * st;          // slash forward
        armSwing = -20 + 60 * st;
      } else {
        const rt = (t - 0.6) / 0.4;
        swordAngle = 90 - 90 * rt;            // return
        armSwing = 40 - 40 * rt;
      }
    } else if (this.state === 'dying') {
      // Fall over
      const t = Math.min(this.deathTimer / 0.4, 1);
      ctx.rotate(t * flip * -1.2);
      ctx.translate(0, t * 15);
    }

    // Legs
    ctx.save();
    ctx.fillStyle = limbColor;
    // Left leg
    ctx.save();
    ctx.translate(-6 * flip, -6);
    ctx.rotate(legPhase * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 28);
    // Sandal
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(-4, 26, 8, 4);
    ctx.restore();

    // Right leg
    ctx.save();
    ctx.translate(6 * flip, -6);
    ctx.rotate(-legPhase * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 28);
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(-4, 26, 8, 4);
    ctx.restore();
    ctx.restore();

    // Body / tunic
    ctx.save();
    ctx.translate(0, -bodyBob);

    // Torso
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.lineTo(12, -50);
    ctx.lineTo(-12, -50);
    ctx.closePath();
    ctx.fill();

    // Belt
    ctx.fillStyle = beltColor;
    ctx.fillRect(-14, -16, 28, 5);

    // Back arm
    ctx.save();
    ctx.fillStyle = limbColor;
    ctx.translate(-10 * flip, -44);
    ctx.rotate((-armSwing) * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 22);
    // Hand
    ctx.fillStyle = skinColor;
    ctx.fillRect(-2, 20, 5, 5);
    ctx.restore();

    // Front arm + sword
    ctx.save();
    ctx.fillStyle = limbColor;
    ctx.translate(10 * flip, -44);
    ctx.rotate(armSwing * Math.PI / 180);
    ctx.fillRect(-3, 0, 6, 22);
    // Hand
    ctx.fillStyle = skinColor;
    ctx.fillRect(-2, 20, 5, 5);

    // Sword
    ctx.save();
    ctx.translate(0, 24);
    ctx.rotate(swordAngle * Math.PI / 180 * flip);
    // Blade
    ctx.fillStyle = '#8a9ab0';
    ctx.fillRect(-1.5, 0, 3, 30);
    // Guard
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(-5, -2, 10, 4);
    // Pommel
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.arc(0, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    // Blade tip (pointed)
    ctx.fillStyle = '#b0c0d0';
    ctx.beginPath();
    ctx.moveTo(-1.5, 30);
    ctx.lineTo(0, 36);
    ctx.lineTo(1.5, 30);
    ctx.fill();
    ctx.restore(); // sword
    ctx.restore(); // front arm

    // Head
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.ellipse(0, -58 - bodyBob, 10, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (small dots, angry)
    ctx.fillStyle = flashing ? '#ffffff' : '#cc3030';
    const eyeX = 4 * flip;
    ctx.fillRect(eyeX - 1, -60 - bodyBob, 2, 2);
    ctx.fillRect(eyeX + (flip > 0 ? -6 : 4), -60 - bodyBob, 2, 2);

    // Hair / helmet crest
    ctx.fillStyle = flashing ? '#ffffff' : '#2a1e10';
    ctx.beginPath();
    ctx.ellipse(0, -66 - bodyBob, 11, 6, 0, Math.PI, 0);
    ctx.fill();

    ctx.restore(); // body bob

    // Danger glow when attacking
    if (this.state === 'attack') {
      const t = this.attackTime / this.attackDuration;
      if (t > 0.3 && t < 0.65) {
        ctx.globalCompositeOperation = 'screen';
        const glow = ctx.createRadialGradient(0, -40, 0, 0, -40, 50);
        glow.addColorStop(0, 'rgba(200, 60, 40, 0.15)');
        glow.addColorStop(1, 'rgba(200, 60, 40, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-50, -90, 100, 100);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    ctx.restore(); // main save
  }
}
