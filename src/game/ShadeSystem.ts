import { B11 } from './Constants';

export interface ShadeDrawOptions {
  x: number;
  y: number;
  height?: number;
  width?: number;
  color?: string;
  opacity?: number;
  glowColor?: string;
  glowRadius?: number;
  glowOpacity?: number;
  armsOutstretched?: boolean;
  turnedAway?: boolean;
  hasStaff?: boolean;
  staffColor?: string;
  staffHeight?: number;
  headTilt?: number;    // degrees, for Elpenor's broken neck
  float?: number;       // extra upward offset
}

/**
 * Draw a single shade figure on the canvas.
 * The origin (x, y) is the foot position of the shade.
 */
export function drawShade(ctx: CanvasRenderingContext2D, opts: ShadeDrawOptions) {
  const {
    x, y,
    height = 70,
    width = 16,
    color = B11.shade_body,
    opacity = 0.7,
    glowColor,
    glowRadius = 20,
    glowOpacity = 0.3,
    armsOutstretched = false,
    turnedAway = false,
    hasStaff = false,
    staffColor = B11.gold_pale,
    staffHeight = 90,
    headTilt = 0,
    float = 0,
  } = opts;

  ctx.save();
  ctx.translate(x, y - float + 3);
  if (turnedAway) ctx.scale(-1, 1);

  // Glow
  if (glowColor) {
    const grd = ctx.createRadialGradient(0, -height / 2, 0, 0, -height / 2, glowRadius);
    grd.addColorStop(0, glowColor.replace(')', `, ${glowOpacity})`).replace('rgb', 'rgba'));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grd;
    ctx.fillRect(-glowRadius, -height / 2 - glowRadius, glowRadius * 2, glowRadius * 2);
  }

  ctx.globalAlpha = opacity;

  // Body — simple humanoid silhouette
  const hw = width / 2;
  const headR = width * 0.6;

  // Legs
  ctx.fillStyle = color;
  ctx.fillRect(-hw * 0.6, -height * 0.5, hw * 0.55, height * 0.5);
  ctx.fillRect(hw * 0.05, -height * 0.5, hw * 0.55, height * 0.5);

  // Torso
  ctx.fillRect(-hw, -height, width, height * 0.52);

  // Head
  ctx.save();
  ctx.translate(0, -height - headR * 0.6);
  ctx.rotate(headTilt * Math.PI / 180);
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Arms
  if (armsOutstretched) {
    ctx.fillRect(-hw - width * 1.5, -height * 0.82, width * 1.5, hw * 0.7);
    ctx.fillRect(hw, -height * 0.82, width * 1.5, hw * 0.7);
  } else {
    ctx.fillRect(-hw - width * 0.4, -height * 0.82, width * 0.4, hw * 0.7);
    ctx.fillRect(hw, -height * 0.82, width * 0.4, hw * 0.7);
  }

  // Staff
  if (hasStaff) {
    ctx.globalAlpha = opacity;
    ctx.fillStyle = staffColor;
    ctx.fillRect(hw + 2, -staffHeight, 4, staffHeight);
    // golden tip
    ctx.beginPath();
    ctx.arc(hw + 4, -staffHeight, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draw a crowd of faint background shades drifting in a direction.
 * shades[] is an array of {x, y, phase} — initialise once and move each frame.
 */
export interface CrowdShade {
  x: number;
  y: number;
  phase: number;
  scale: number;
}

export function makeCrowd(count: number, xRange: [number, number], yRange: [number, number]): CrowdShade[] {
  const out: CrowdShade[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: xRange[0] + Math.random() * (xRange[1] - xRange[0]),
      y: yRange[0] + Math.random() * (yRange[1] - yRange[0]),
      phase: Math.random() * Math.PI * 2,
      scale: 0.4 + Math.random() * 0.5,
    });
  }
  return out;
}

export function updateCrowd(crowd: CrowdShade[], dt: number, driftX: number, driftY = 0) {
  for (const s of crowd) {
    s.x += driftX * dt;
    s.y += driftY * dt;
  }
}

export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  crowd: CrowdShade[],
  color: string,
  baseOpacity: number,
  time: number,
  xMin: number,
  xMax: number,
  wrapWidth: number
) {
  for (const s of crowd) {
    // wrap around
    if (s.x < xMin) s.x += wrapWidth;
    if (s.x > xMax) s.x -= wrapWidth;

    const pulse = 0.7 + 0.3 * Math.sin(time * 0.8 + s.phase);
    drawShade(ctx, {
      x: s.x,
      y: s.y,
      height: 50 * s.scale,
      width: 12 * s.scale,
      color,
      opacity: baseOpacity * pulse,
    });
  }
}

/**
 * Draw the Homeric blood trench with glow and ripple.
 */
export function drawBloodTrench(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  depth: number,
  time: number,
  fillPct = 1.0
) {
  // Earth walls
  ctx.fillStyle = B11.trench_earth;
  ctx.fillRect(x - width / 2 - 8, y - depth, width + 16, depth + 8);

  // Blood fill
  if (fillPct > 0) {
    const bh = depth * fillPct;
    ctx.fillStyle = B11.blood_mid;
    ctx.fillRect(x - width / 2, y - bh, width, bh);

    // Ripple
    const rAlpha = 0.3 + 0.2 * Math.sin(time * 3);
    ctx.fillStyle = B11.blood_bright;
    ctx.globalAlpha = rAlpha;
    for (let i = 0; i < 3; i++) {
      const ry = y - bh * (0.3 + i * 0.2) + Math.sin(time * 2 + i) * 2;
      ctx.fillRect(x - width / 2 + 4, ry, width - 8, 2);
    }
    ctx.globalAlpha = 1;

    // Blood glow
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const grd = ctx.createRadialGradient(x, y - depth * 0.3, 0, x, y - depth * 0.3, 80);
    grd.addColorStop(0, `rgba(180, 30, 30, 0.5)`);
    grd.addColorStop(1, 'rgba(180, 30, 30, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 80, y - depth * 0.3 - 80, 160, 160);
    ctx.restore();
  }
}
