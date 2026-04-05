import { Scene } from '../../../engine/GameEngine';
import { Player } from '../../Player';
import { Arrow } from '../../Arrow';
import { B12 } from '../../Constants';
import { getTextureImage } from '../../Textures';
import { DialogueQueue } from '../../DialogueSystem';
import { drawTorch } from '../../Torch';

export class CirceWarningScene extends Scene {
  player!: Player;
  arrows: Arrow[] = [];
  time = 0;

  warningDlg!: DialogueQueue;
  dialogueStarted = false;

  // Torch flicker
  torchPhases = [0, 1.2];

  onEnter() {
    this.player = new Player(
      this.engine, 400, 540, 'right',
      () => 540,
      (a) => this.arrows.push(a)
    );
    this.engine.camera.x = 0;

    this.warningDlg = new DialogueQueue([
      { text: 'First you will come to the Sirens. Plug your men\'s ears with wax. If you want to hear them, have your men tie you to the mast.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'After the Sirens you will face two paths. On one side are the Wandering Rocks — no ship has ever passed through.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'The other way has two cliffs. In one lives Scylla. She has twelve feet and six necks, each with a head, each with three rows of teeth.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'No ship has passed without her taking men. Each head snatches one man from the crew.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'The other cliff is lower. Under it is Charybdis — she swallows the sea three times a day. Not even Poseidon could save you.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'Hug Scylla\'s cliff. Better to lose six men than everyone.', color: '#f0d060', fontSize: 15, speaker: 'CIRCE', speakerColor: B12.circe_glow },
      { text: 'Circe — tell me honestly — can I fight Scylla while she takes my men?', color: '#c8b080', fontSize: 13, speaker: 'ODYSSEUS', speakerColor: '#c8b080' },
      { text: 'Stubborn man. Scylla is not mortal. She is a deathless evil. Running is your only option. Do not stop to fight or she will take six more.', color: '#c8a030', fontSize: 13, speaker: 'CIRCE', speakerColor: B12.circe_glow },
    ]);
  }

  update(dt: number) {
    this.time += dt;
    const inp = { isDown: (k: string[]) => this.engine.input.isDown(k), mouse: this.engine.input.mouse };

    if (!this.dialogueStarted) {
      this.dialogueStarted = true;
      this.player.frozen = true;
    }

    this.warningDlg.update(dt, inp);

    if (this.warningDlg.done && this.engine.transitionState === 'none') {
      import('./StraitApproachScene').then(({ StraitApproachScene }) => {
        this.engine.switchScene(new StraitApproachScene(), 600);
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Hall
    ctx.fillStyle = B12.circe_hall;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillRect(0, 540, 1280, 180);
    
    // High window with moon
    ctx.fillStyle = '#0a0814';
    ctx.beginPath();
    ctx.arc(640, 120, 60, Math.PI, 0);
    ctx.rect(580, 120, 120, 80);
    ctx.fill();
    
    const moonImg = getTextureImage('moon_phase_1');
    if (moonImg) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(moonImg, 640 - 25, 120 - 10, 50, 50);
      ctx.restore();
    }

    // Torches (drawn behind tapestries)
    const torchXs = [200, 1080];
    for (let ti = 0; ti < torchXs.length; ti++) {
      const tx = torchXs[ti];
      
      drawTorch(ctx, tx, 340, this.time, this.torchPhases[ti]);
      
      const flicker = Math.sin(this.time * 6 + this.torchPhases[ti]) * 4;
      
      // Glow
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ffa020';
      ctx.beginPath();
      ctx.arc(tx, 300, 80 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Tapestries
    ctx.fillStyle = '#2a1a3a';
    ctx.fillRect(300, 200, 80, 280);
    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(900, 200, 80, 280);


    // Circe
    const cx = 700, cy = 460;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = B12.circe_glow;
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = B12.circe_robe;
    ctx.fillRect(cx - 12, cy - 50, 24, 50);
    ctx.fillStyle = '#e0d0c0';
    ctx.beginPath();
    ctx.arc(cx, cy - 56, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8c840';
    ctx.beginPath();
    ctx.arc(cx, cy - 62, 8, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - 8, cy - 62, 2, 16);
    ctx.fillRect(cx + 6, cy - 62, 2, 16);

    // Player
    this.player.draw(ctx);

    // Dialogue
    this.warningDlg.draw(ctx, 640, 120, 900);
  }
}
