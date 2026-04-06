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

  // Subtle dark backing strip so text is legible over any background
  ctx.globalAlpha = alpha * 0.45;
  const stripGrad = ctx.createLinearGradient(0, y - 24, 0, y + 16);
  stripGrad.addColorStop(0, 'rgba(0,0,0,0)');
  stripGrad.addColorStop(0.4, 'rgba(0,0,0,0.55)');
  stripGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(cx - 480, y - 24, 960, 40);

  // Italic text
  ctx.globalAlpha = alpha;
  ctx.font = 'italic 15px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Very faint shadow for depth
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;

  // Golden-cream colour — matches the game's PALETTE.amber_gold tones
  ctx.fillStyle = '#c8b888';
  ctx.fillText(text, cx, y);

  ctx.restore();
}
