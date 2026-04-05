export interface DialogueLine {
  text: string;
  color?: string;
  fontSize?: number;
  fadeInMs?: number;
  speaker?: string;       // optional speaker label above text
  speakerColor?: string;
}

/**
 * Click-through dialogue queue.
 * Text fades in, then stays until the player clicks or presses Space/Enter/E.
 * A small "▸" prompt appears when the text is fully visible.
 */
export class DialogueQueue {
  lines: DialogueLine[];
  currentIndex = 0;
  fadeTimer = 0;    // ms for fade-in
  ready = false;    // true when fade-in complete and waiting for click
  done = false;
  private advanceRequested = false;

  constructor(lines: DialogueLine[]) {
    this.lines = lines;
  }

  get current(): DialogueLine | null {
    if (this.done || this.currentIndex >= this.lines.length) return null;
    return this.lines[this.currentIndex];
  }

  /** Call once per frame. Pass the engine input so we can detect clicks. */
  update(dt: number, input?: { isDown?: (keys: string[]) => boolean; mouse?: { left: boolean } }) {
    if (this.done) return;
    const line = this.current;
    if (!line) { this.done = true; return; }

    this.fadeTimer += dt * 1000;
    const fadeInMs = line.fadeInMs ?? 600;

    if (this.fadeTimer >= fadeInMs) {
      this.ready = true;
    }

    // Check for advance input
    if (this.ready) {
      let clicked = false;
      if (input?.isDown) {
        clicked = input.isDown(['Space', 'Enter', 'KeyE']);
      }
      if (input?.mouse?.left) {
        clicked = true;
        input.mouse.left = false; // consume
      }
      if (this.advanceRequested) {
        clicked = true;
        this.advanceRequested = false;
      }
      if (clicked) {
        this.advance();
      }
    }
  }

  /** Programmatically advance to next line */
  requestAdvance() {
    this.advanceRequested = true;
  }

  private advance() {
    this.currentIndex++;
    this.fadeTimer = 0;
    this.ready = false;
    if (this.currentIndex >= this.lines.length) {
      this.done = true;
    }
  }

  isComplete() { return this.done; }

  reset() {
    this.currentIndex = 0;
    this.fadeTimer = 0;
    this.ready = false;
    this.done = false;
  }

  /**
   * Draw the current dialogue line centred with word-wrap.
   * Shows a "▸" click-prompt when ready.
   */
  draw(ctx: CanvasRenderingContext2D, cx: number, y: number, maxWidth = 800) {
    const line = this.current;
    if (!line) return;

    const color = line.color ?? '#d4b96a';
    const fontSize = line.fontSize ?? 14;
    const fadeInMs = line.fadeInMs ?? 600;
    const alpha = Math.min(this.fadeTimer / fadeInMs, 1);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Speaker label
    if (line.speaker) {
      ctx.fillStyle = line.speakerColor ?? '#a09070';
      ctx.font = `small-caps 11px 'Georgia', serif`;
      ctx.textAlign = 'center';
      ctx.fillText(line.speaker, cx, y - 6);
      y += 14;
    }

    ctx.fillStyle = color;
    ctx.font = `italic ${fontSize}px 'Georgia', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Word-wrap
    const words = line.text.split(' ');
    const lineHeight = fontSize * 1.55;
    let currentLine = '';
    const drawLines: string[] = [];

    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && currentLine) {
        drawLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) drawLines.push(currentLine);

    for (let i = 0; i < drawLines.length; i++) {
      ctx.fillText(drawLines[i], cx, y + i * lineHeight);
    }

    // Click-to-continue prompt
    if (this.ready) {
      const promptY = y + drawLines.length * lineHeight + 12;
      const blink = Math.sin(Date.now() / 400) > 0;
      if (blink) {
        ctx.globalAlpha = alpha * 0.5;
        ctx.font = `11px 'Georgia', serif`;
        ctx.fillStyle = '#686050';
        ctx.fillText('▸  click to continue', cx, promptY);
      }
    }

    ctx.restore();
  }

  drawHeight(ctx: CanvasRenderingContext2D, maxWidth = 800): number {
    const line = this.current;
    if (!line) return 0;
    const fontSize = line.fontSize ?? 14;
    const lineHeight = fontSize * 1.55;
    ctx.font = `italic ${fontSize}px 'Georgia', serif`;
    const words = line.text.split(' ');
    let rows = 1; let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxWidth && cur) { rows++; cur = w; }
      else cur = t;
    }
    return rows * lineHeight;
  }
}

/**
 * Click-through quote overlay.
 * Shows text in a dark box. Stays until player clicks.
 * Returns true when dismissed.
 */
export class ClickQuote {
  text: string;
  color: string;
  fontSize: number;
  maxWidth: number;
  fadeTimer = 0;
  ready = false;
  dismissed = false;

  constructor(text: string, color = '#d4b96a', fontSize = 13, maxWidth = 700) {
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.maxWidth = maxWidth;
  }

  update(dt: number, input?: { isDown?: (keys: string[]) => boolean; mouse?: { left: boolean }; keys?: { [key: string]: boolean } }) {
    if (this.dismissed) return;
    this.fadeTimer += dt * 1000;
    if (this.fadeTimer >= 600) this.ready = true;

    if (this.ready) {
      let clicked = false;
      if (input?.isDown) clicked = input.isDown(['Space', 'Enter', 'KeyE']);
      if (input?.mouse?.left) { 
        clicked = true; 
        input.mouse.left = false; 
      }
        if (clicked) {
          this.dismissed = true;
          // consume the keys used so they don't trigger anything else this frame
          if (input?.isDown && input.keys) {
              input.keys['Space'] = false;
              input.keys['Enter'] = false;
              input.keys['KeyE'] = false;
          }
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D, cx = 640, cy = 300) {
    if (this.dismissed) return;
    const alpha = Math.min(this.fadeTimer / 600, 1);

    ctx.save();
    // Dark box
    ctx.globalAlpha = alpha * 0.88;
    ctx.fillStyle = 'rgba(2,1,10,0.88)';
    const boxW = this.maxWidth + 48;
    const boxH = 180;
    ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = `italic ${this.fontSize}px 'Georgia', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = this.text.split(' ');
    const lh = this.fontSize * 1.6;
    let cur = ''; const rows: string[] = [];
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > this.maxWidth && cur) { rows.push(cur); cur = w; }
      else cur = t;
    }
    if (cur) rows.push(cur);

    const totalH = rows.length * lh;
    for (let i = 0; i < rows.length; i++) {
      ctx.fillText(rows[i], cx, cy - totalH / 2 + i * lh + lh / 2);
    }

    // Click prompt
    if (this.ready) {
      const blink = Math.sin(Date.now() / 400) > 0;
      if (blink) {
        ctx.globalAlpha = alpha * 0.45;
        ctx.font = `11px 'Georgia', serif`;
        ctx.fillStyle = '#686050';
        ctx.fillText('▸  click to continue', cx, cy + totalH / 2 + 20);
      }
    }

    ctx.restore();
  }
}

/**
 * Legacy helper — kept for backward compat but prefer ClickQuote for new code.
 */
export function drawQuoteOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  alpha: number,
  cx = 640,
  cy = 360,
  maxWidth = 700,
  color = '#d4b96a',
  fontSize = 14
) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.88;
  ctx.fillStyle = 'rgba(2,1,10,0.85)';
  ctx.fillRect(cx - maxWidth / 2 - 24, cy - 80, maxWidth + 48, 160);
  ctx.globalAlpha = alpha;

  ctx.fillStyle = color;
  ctx.font = `italic ${fontSize}px 'Georgia', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = text.split(' ');
  const lh = fontSize * 1.6;
  let cur = ''; const rows: string[] = [];
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxWidth && cur) { rows.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) rows.push(cur);

  const totalH = rows.length * lh;
  for (let i = 0; i < rows.length; i++) {
    ctx.fillText(rows[i], cx, cy - totalH / 2 + i * lh + lh / 2);
  }
  ctx.restore();
}
