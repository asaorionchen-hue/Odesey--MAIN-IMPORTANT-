import { Input } from './Input';
import { DEFAULT_FADE_MS } from '../game/Constants';

export abstract class Scene {
  engine!: GameEngine;
  abstract update(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
  onEnter(direction: 'left' | 'right' = 'left') {}
  onExit() {}
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  currentScene: Scene | null = null;
  nextScene: Scene | null = null;
  
  sceneHistory: (new () => Scene)[] = [];
  nextSceneDirection: 'left' | 'right' = 'left';
  
  lastTime = 0;
  timeScale = 1.0;
  
  transitionState = 'none'; // 'none', 'out', 'in'
  transitionTimer = 0;
  transitionDurationOut = 500;
  transitionDurationIn = 500;
  
  camera = { x: 0, y: 0, shakeX: 0, shakeY: 0 };
  shakeStrength = 0;
  shakeDecay = 0;
  
  globalState = {
    axesThreaded: 0,
    arrowsFired: 0,
    trialActive: false,
    hasBow: false,
    trialCompleted: false
  };

  isPaused = false;
  animationFrameId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(canvas);
  }

  start(initialScene: Scene) {
    this.switchScene(initialScene, 0);
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
    this.input.cleanup();
  }

  loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    this.update(dt * this.timeScale);
    this.draw();
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  update(dt: number) {
    if (this.input.isDown(['Escape'])) {
      this.input.keys['Escape'] = false; // consume
      if (this.currentScene && this.currentScene.constructor.name !== 'TitleScene' && this.transitionState === 'none') {
        this.isPaused = !this.isPaused;
      }
    }

    if (this.isPaused) {
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      if (this.input.mouse.left) {
        if (Math.abs(mx - 640) < 100) {
          if (Math.abs(my - 360) < 20) {
            this.isPaused = false;
            this.input.consumeMouse();
          } else if (Math.abs(my - 420) < 20) {
            this.isPaused = false;
            this.input.consumeMouse();
            import('../game/scenes/TitleScene').then(({ TitleScene }) => {
              this.switchScene(new TitleScene(), DEFAULT_FADE_MS);
            });
          }
        }
        this.input.consumeMouse();
      }
      return;
    }

    if (this.shakeStrength > 0) {
      this.camera.shakeX = (Math.random() * 2 - 1) * this.shakeStrength;
      this.camera.shakeY = (Math.random() * 2 - 1) * this.shakeStrength;
      this.shakeStrength -= this.shakeDecay * dt;
      if (this.shakeStrength < 0) {
        this.shakeStrength = 0;
        this.camera.shakeX = 0;
        this.camera.shakeY = 0;
      }
    }

    if (this.transitionState === 'out') {
      this.transitionTimer += dt * 1000; // Use dt in ms
      if (this.transitionTimer >= this.transitionDurationOut) {
        if (this.currentScene) this.currentScene.onExit();
        this.currentScene = this.nextScene;
        this.currentScene!.engine = this;
        this.currentScene!.onEnter(this.nextSceneDirection);
        this.transitionState = 'in';
        this.transitionTimer = 0;
        this.camera.shakeX = 0;
        this.camera.shakeY = 0;
        this.shakeStrength = 0;
      }
    } else if (this.transitionState === 'in') {
      this.transitionTimer += dt * 1000;
      if (this.transitionTimer >= this.transitionDurationIn) {
        this.transitionState = 'none';
      }
    }

    if (this.currentScene) {
      this.currentScene.update(dt);
    }
  }

  draw() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x + this.camera.shakeX, -this.camera.y + this.camera.shakeY);
    
    if (this.currentScene) {
      this.currentScene.draw(this.ctx);
    }
    
    this.ctx.restore();
    
    if (this.transitionState === 'out') {
      const alpha = Math.min(this.transitionTimer / this.transitionDurationOut, 1);
      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else if (this.transitionState === 'in') {
      const alpha = Math.max(1 - this.transitionTimer / this.transitionDurationIn, 0);
      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.isPaused) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      this.ctx.font = '48px sans-serif';
      this.ctx.fillStyle = '#ffcc44'; // amber_gold
      this.ctx.fillText('PAUSED', 640, 240);
      
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      this.ctx.font = '24px sans-serif';
      
      const hoverResume = Math.abs(mx - 640) < 100 && Math.abs(my - 360) < 20;
      this.ctx.fillStyle = hoverResume ? '#ffffff' : '#a09070';
      this.ctx.fillText('Resume', 640, 360);
      
      const hoverQuit = Math.abs(mx - 640) < 100 && Math.abs(my - 420) < 20;
      this.ctx.fillStyle = hoverQuit ? '#ffcc44' : '#686050';
      this.ctx.fillText('Quit to Title', 640, 420);
    }
  }

  switchScene(scene: Scene, transitionMs = DEFAULT_FADE_MS, direction: 'left' | 'right' = 'left') {
    if (this.transitionState !== 'none') return;
    
    if (direction === 'left' && this.currentScene && this.currentScene.constructor.name !== 'TitleScene') {
      this.sceneHistory.push(this.currentScene.constructor as new () => Scene);
    }
    if (scene.constructor.name === 'TitleScene') {
      this.sceneHistory = [];
    }
    
    this.nextScene = scene;
    this.nextSceneDirection = direction;
    this.transitionDurationOut = transitionMs;
    this.transitionDurationIn = transitionMs;
    this.transitionTimer = 0;
    this.transitionState = 'out';
  }

  goBack() {
    const PrevClass = this.sceneHistory.pop();
    if (PrevClass) {
      this.switchScene(new PrevClass(), DEFAULT_FADE_MS, 'right');
    }
  }

  shake(strength: number, durationMs: number, decay: number) {
    this.shakeStrength = strength;
    this.shakeDecay = decay;
  }
}
