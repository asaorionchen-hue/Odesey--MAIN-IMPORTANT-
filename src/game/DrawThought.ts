/**
 * Draws an Odysseus inner-thought caption at the bottom of the screen.
 *
 * The text is rendered in an italic serif style, faintly,
 * so it feels like an intimate first-person narration rather than a UI element.
 *
 * @param ctx    Canvas 2D context (already offset by camera if needed)
 * @param text   The thought string, e.g. "I must thread the arrow through each axe head."
 * @param alpha  Overall opacity (0–1). Caller may animate this.
 * @param screenW  Width of the visible viewport (default 1280)
 * @param screenH  Height of the visible viewport (default 720)
 */
export function drawThought(
  ctx: CanvasRenderingContext2D,
  text: string,
  alpha = 1.0,
  screenW = 1280,
  screenH = 720
): void {
  if (alpha <= 0) return;

  ctx.save();

  const y = screenH - 36;
  const cx = screenW / 2;

  // ─── Dark backing strip ───────────────────────────────────────
  ctx.globalAlpha = alpha * 0.65;
  const stripGrad = ctx.createLinearGradient(0, y - 28, 0, y + 20);
  stripGrad.addColorStop(0, 'rgba(0,0,0,0)');
  stripGrad.addColorStop(0.25, 'rgba(0,0,0,0.7)');
  stripGrad.addColorStop(0.75, 'rgba(0,0,0,0.7)');
  stripGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(0, y - 28, screenW, 48);

  // ─── Vignette at bar edges ────────────────────────────────────
  ctx.globalAlpha = alpha * 0.4;
  const vigL = ctx.createLinearGradient(0, 0, 160, 0);
  vigL.addColorStop(0, 'rgba(0,0,0,0.6)');
  vigL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vigL;
  ctx.fillRect(0, y - 28, 160, 48);

  const vigR = ctx.createLinearGradient(screenW, 0, screenW - 160, 0);
  vigR.addColorStop(0, 'rgba(0,0,0,0.6)');
  vigR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vigR;
  ctx.fillRect(screenW - 160, y - 28, 160, 48);

  // ─── Italic text with enhanced drop shadow ────────────────────
  ctx.globalAlpha = alpha;
  ctx.font = 'italic 15px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Drop shadow layer
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  // Golden-cream colour — matches the game's PALETTE.amber_gold tones
  ctx.fillStyle = '#c8b888';
  ctx.fillText(text, cx, y);

  ctx.restore();
}
