import { getTextureImage } from './Textures';

/**
 * Draws an animated wall torch using the sprite sheet.
 * The sprite sheet is expected to be 2x4 frames of 64x64 pixels.
 */
export function drawTorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  phase: number = 0
) {
  const img = getTextureImage('torch');
  if (!img) {
    // Fallback procedural torch if asset not loaded
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(x - 3, y - 10, 6, 20);
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(x, y - 15, 6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const fps = 10;
  const totalFrames = 8;
  const frame = Math.floor((time + phase) * fps) % totalFrames;

  const frameWidth = 64;
  const frameHeight = 64;
  const cols = 4;

  const col = frame % cols;
  const row = Math.floor(frame / cols);

  ctx.drawImage(
    img,
    col * frameWidth, row * frameHeight, frameWidth, frameHeight,
    x - 32, y - 48, 64, 64 // Positioned so the flame base is near the anchor
  );
}
