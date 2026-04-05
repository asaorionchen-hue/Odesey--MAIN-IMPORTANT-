import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B12, DEFAULT_FADE_MS } from '../../Constants';
import { getTextureImage } from '../../Textures';
import { ClickQuote } from '../../DialogueSystem';

const SCENE_WIDTH = 1280;
const FLOOR_Y = 620;

export class CharybdisEscapeScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  phase: 'rowing' | 'complete' = 'rowing';

  // Surfing/Rowing mechanic
  rowX = 800;
  whirlpoolPull = 60;  // reduced pull speed to make it beatable
  playerStamina = 1.0; // 0 to 1
  rowingCooldown = 0;

  // Whirlpool
  whirlpoolAngle = 0;

  // Respawn
  respawnText = '';
  respawnTimer = 0;

  // End card
  endCardTimer = 0;

  // Completion quote
  completionQuote: ClickQuote | null = null;
  completionShown = false;

  onEnter() {
    this.player = new Player(
      this.engine, this.rowX, FLOOR_Y + 35, 'right',
      () => FLOOR_Y + 35,
      (a) => this.arrows.push(a)
    );
    this.engine.camera.x = 0;

    this.completionQuote = new ClickQuote(
      'For nine days I was carried along. On the tenth night the gods brought me to Ogygia, where Calypso lives.',
      B12.text_quote, 13, 800
    );
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };
    this.whirlpoolAngle += dt * 30;

    // Respawn overlay
    if (this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.rowX = 800;
        this.player.x = this.rowX;
        this.player.y = FLOOR_Y + 35;
        this.playerStamina = 1.0;
        this.rowingCooldown = 0;
      }
      return;
    }

    // Completion quote
    if (this.completionShown && this.completionQuote && !this.completionQuote.dismissed) {
      this.completionQuote.update(dt, inp);
      if (this.completionQuote.dismissed) {
        this.phase = 'complete';
        this.endCardTimer = 0;
      }
      return;
    }

    // End card
    if (this.phase === 'complete') {
      this.endCardTimer += dt;
      if (this.endCardTimer > 5.0) {
        import('../TitleScene').then(({ TitleScene }) => {
          this.engine.switchScene(new TitleScene(), DEFAULT_FADE_MS);
        });
      }
      return;
    }

    // Phase: Rowing
    if (this.phase === 'rowing') {
      this.player.update(dt);
      
      // Cooldown and stamina recovery
      if (this.rowingCooldown > 0) {
        this.rowingCooldown -= dt;
      } else {
        this.playerStamina = Math.min(1.0, this.playerStamina + dt * 0.4);
      }

      // Variable whirlpool pull based on proximity
      const pullMult = 1 + Math.max(0, (600 - this.rowX) / 400);
      this.rowX -= this.whirlpoolPull * pullMult * dt;

      // Row action (tap Right/D)
      if (this.engine.input.isDown(['ArrowRight', 'KeyD']) && this.rowingCooldown <= 0 && this.playerStamina > 0.05) {
        // Apply burst of speed, consume stamina, set cooldown
        this.rowX += 60;
        this.playerStamina -= 0.08;
        this.rowingCooldown = 0.2;
        this.engine.input.keys['ArrowRight'] = false; // consume
        this.engine.input.keys['KeyD'] = false; // consume
      }

      // Constrain player
      this.player.x = this.rowX;
      this.player.y = FLOOR_Y + 35;

      // Fail condition: swallowed by whirlpool
      if (this.rowX < 150) {
        this.respawnText = 'The sea spat you back out.';
        this.respawnTimer = 2.0;
        this.engine.shake(5, 500, 10);
      }

      // Success condition: rowed far enough right
      if (this.rowX >= 1200 && !this.completionShown) {
        this.completionShown = true;
        this.player.frozen = true;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // ── Sea ──────────────────────────────────────────────────────
    ctx.fillStyle = '#0a1828';
    ctx.fillRect(0, 0, 1280, 720);
    
    // Night sky moon
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      const moonX = 1000;
      const moonY = 120;
      const moonSize = 90;
      ctx.save();
      // Enhanced Moon glow
      const glowGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 130);
      glowGrad.addColorStop(0, 'rgba(184, 200, 232, 0.4)');
      glowGrad.addColorStop(0.3, 'rgba(80, 112, 160, 0.2)');
      glowGrad.addColorStop(1, 'rgba(80, 112, 160, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 130, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1.0;
      ctx.drawImage(moonImg, moonX - moonSize / 2, moonY - moonSize / 2, moonSize, moonSize);
      ctx.restore();
    }

    // Waves (moving fast toward whirlpool)
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#0e2030' : '#081420';
      // Fast scrolling waves
      const waveX = (i * 80 - this.time * 200) % 1280;
      const wy = FLOOR_Y - 20 + (i % 8) * 15 + Math.sin(this.time * 2 + i) * 5;
      ctx.fillRect(waveX >= 0 ? waveX : waveX + 1280, wy, 60, 8);
    }

    // ── Whirlpool (left side) ────────────────────────────────────
    const wpX = -20, wpY = FLOOR_Y + 40;
    const rings = [
      { r: 240, c: B12.whirlpool_rim, s: 8 },
      { r: 180, c: '#102030', s: 14 },
      { r: 120, c: '#081820', s: 22 },
      { r: 70, c: '#040c10', s: 36 },
      { r: 30, c: '#000000', s: 60 },
    ];
    for (const ring of rings) {
      ctx.save();
      ctx.translate(wpX, wpY);
      ctx.rotate((this.whirlpoolAngle * ring.s / 20) * Math.PI / 180);
      ctx.fillStyle = ring.c;
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Wreckage (Rowing plank) ──────────────────────────────────
    if (this.phase === 'rowing') {
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(this.rowX - 60, FLOOR_Y - 5, 120, 18);
      // Mast shard
      ctx.fillStyle = '#4a3018';
      ctx.fillRect(this.rowX - 20, FLOOR_Y - 20, 6, 20);
    }

    // ── Player ───────────────────────────────────────────────────
    this.player.draw(ctx);

    // ── Stamina meter ────────────────────────────────────────────
    if (this.phase === 'rowing') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(580, 20, 120, 16);
      ctx.fillStyle = this.playerStamina > 0.3 ? '#4a8a40' : '#c84040';
      ctx.fillRect(582, 22, 116 * this.playerStamina, 12);
      ctx.fillStyle = '#c8b080';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('STAMINA', 640, 50);
      
      // Pull indicator
      const pullMult = 1 + Math.max(0, (600 - this.rowX) / 400);
      if (pullMult > 1.2) {
        ctx.fillStyle = '#c84040';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('STRONG PULL!', 640, 70);
      }
    }

    // ── Instructions ─────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(340, 680, 600, 30);
    ctx.fillStyle = '#c8b080';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (this.phase === 'rowing') {
      ctx.fillText('Rhythmically press RIGHT to row away from Charybdis. Watch your stamina.', 640, 695);
    }

    // ── Respawn text ─────────────────────────────────────────────
    if (this.respawnTimer > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = '#c8b080';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.respawnText, 640, 360);
    }

    // ── Completion quote ─────────────────────────────────────────
    if (this.completionShown && this.completionQuote && !this.completionQuote.dismissed) {
      this.completionQuote.draw(ctx, 640, 120);
    }

    // ── End card ─────────────────────────────────────────────────
    if (this.phase === 'complete') {
      const alpha = Math.min(this.endCardTimer / 1.0, 1);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.globalAlpha = Math.min(this.endCardTimer / 2.0, 1);
      ctx.fillStyle = B12.divine_gold;
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BOOK XII — COMPLETE', 640, 320);
      ctx.fillStyle = '#a09070';
      ctx.font = '16px sans-serif';
      ctx.fillText('He survived Scylla. He survived Charybdis.', 640, 380);
      ctx.fillText('The gods were not finished with him yet.', 640, 406);
      ctx.globalAlpha = 1;
    }

    // Global Blue Atmospheric Tint
    ctx.save();
    ctx.resetTransform();
    ctx.fillStyle = 'rgba(26, 42, 74, 0.15)'; // Deep blue atmospheric tint
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
