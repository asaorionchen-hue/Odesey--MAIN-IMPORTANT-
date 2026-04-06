/**
 * Shared texture loader — loads pixel-art tile images once and
 * exposes reusable CanvasPattern objects for every scene.
 */

import cobblestoneUrl from '../Free_pixel_tiles_pack/cobblestone_3.png';
import dirtyUrl from '../Free_pixel_tiles_pack/dirty_2.png';
import sand1Url from '../Free_pixel_tiles_pack/sand_1.png';
import sand3Url from '../Free_pixel_tiles_pack/sand_3.png';
import grass1Url from '../Free_pixel_tiles_pack/grass_1.png';
import grass3Url from '../Free_pixel_tiles_pack/grass_3.png';
import cobblestone2Url from '../Free_pixel_tiles_pack/cobblestone_2.png';
import dirtPathUrl from '../dirt path.png';
import moonPhase1Url from '../Moon_Phase_1.png';
import torchAnimatedUrl from '../Torch Animated.png';
import fireHearthUrl from '../Pixel fire asset pack v1.2/Pixel Fire Asset Pack Floored/fire asset red floored/Group 5 - 5/Group 5 - 5.png';
import tileSetGregoUrl from '../tile-set-grego.png';

/* ------------------------------------------------------------------ */
/*  Raw Image elements (loaded once, shared across scenes)            */
/* ------------------------------------------------------------------ */

interface TextureEntry {
  img: HTMLImageElement;
  ready: boolean;
}

const TEXTURE_SOURCES: Record<string, string> = {
  cobblestone: cobblestoneUrl,
  dirty: dirtyUrl,
  sand1: sand1Url,
  sand3: sand3Url,
  grass1: grass1Url,
  grass3: grass3Url,
  cobblestone_2: cobblestone2Url,
  dirt_path: dirtPathUrl,
  moon_phase_1: moonPhase1Url,
  torch: torchAnimatedUrl,
  fire_hearth: fireHearthUrl,
  tile_set_grego: tileSetGregoUrl,
};

const textures: Record<string, TextureEntry> = {};

// Kick off loading immediately on import
for (const [name, url] of Object.entries(TEXTURE_SOURCES)) {
  const img = new Image();
  img.src = url;
  const entry: TextureEntry = { img, ready: false };
  img.onload = () => { entry.ready = true; };
  textures[name] = entry;
}

/* ------------------------------------------------------------------ */
/*  Pattern cache (one per ctx × name, since patterns are ctx-bound)  */
/* ------------------------------------------------------------------ */

// WeakMap keyed on ctx prevents memory leaks when ctx is discarded
const patternCache = new WeakMap<
  CanvasRenderingContext2D,
  Record<string, CanvasPattern | null>
>();

/**
 * Returns a repeating CanvasPattern for the named texture,
 * or `null` if the image hasn't loaded yet.
 * An optional scale parameter resizes the image onto an offscreen canvas
 * before creating the pattern, avoiding browser compatibility issues.
 */
export function getPattern(
  name: string,
  ctx: CanvasRenderingContext2D,
  scale: number = 1.0
): CanvasPattern | null {
  const entry = textures[name];
  if (!entry || !entry.ready) return null;

  let map = patternCache.get(ctx);
  if (!map) {
    map = {};
    patternCache.set(ctx, map);
  }

  const cacheKey = `${name}_${scale}`;

  if (map[cacheKey] === undefined) {
    if (scale === 1.0) {
      map[cacheKey] = ctx.createPattern(entry.img, 'repeat');
    } else {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.floor(entry.img.width * scale));
      offscreen.height = Math.max(1, Math.floor(entry.img.height * scale));
      const octx = offscreen.getContext('2d');
      if (octx) {
        // Draw the image scaled down into the small offscreen canvas square
        octx.drawImage(entry.img, 0, 0, offscreen.width, offscreen.height);
        map[cacheKey] = ctx.createPattern(offscreen, 'repeat');
      } else {
        // Fallback if offscreen canvas fails
        map[cacheKey] = ctx.createPattern(entry.img, 'repeat');
      }
    }
  }
  return map[cacheKey];
}

/**
 * Helper: fills the current path (or rect) with a tiled texture,
 * then overlays a semi-transparent tint so the texture blends with
 * the scene's existing colour palette.
 *
 * @param ctx          Canvas context
 * @param textureName  Key into `TEXTURE_SOURCES`
 * @param tintColor    CSS colour string for the overlay (use an rgba with alpha)
 * @param fillFn       Callback that performs the actual ctx.fill / ctx.fillRect call.
 *                     It is invoked twice — once for the texture, once for the tint.
 * @param scale        Optional texture scale (default 0.18 for ~47px patches, 1/3 of sprite)
 */
export function fillWithTexture(
  ctx: CanvasRenderingContext2D,
  textureName: string,
  tintColor: string,
  fillFn: () => void,
  scale = 0.18,
) {
  const pattern = getPattern(textureName, ctx, scale);
  if (pattern) {
    ctx.save();
    ctx.fillStyle = pattern;
    fillFn();
    ctx.restore();
  }
  // Tint overlay — always drawn so scenes still look fine before images load
  ctx.save();
  ctx.fillStyle = tintColor;
  fillFn();
  ctx.restore();
}

/**
 * Returns the raw Image element for the named texture,
 * or null if it doesn't exist.
 */
export function getTextureImage(name: string): HTMLImageElement | null {
  const entry = textures[name];
  return entry ? entry.img : null;
}
