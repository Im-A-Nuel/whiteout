import { CanvasTexture, NearestFilter, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from "three";

/** Sprites become textures with no smoothing, so every texel stays a hard pixel in 3D too. */
const loader = new TextureLoader();
const shared = new Map<string, Texture>();

function crisp(t: Texture): Texture {
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** One shared texture per sprite name. */
export function sprite(name: string): Texture {
  let t = shared.get(name);
  if (!t) {
    t = crisp(loader.load(`/sprites/${name}.png`));
    shared.set(name, t);
  }
  return t;
}

/** A private copy for sprite sheets, so each billboard can scroll its own frame. */
export function sheet(name: string, frames: number): Texture {
  const t = crisp(loader.load(`/sprites/${name}.png`));
  t.repeat.set(1 / frames, 1);
  return t;
}

/** A tiling texture for drifting fog. */
export function tiling(name: string, repeat = 1): Texture {
  const t = crisp(loader.load(`/sprites/${name}.png`));
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** A small label such as `A` or `3`, drawn once, for the coordinates on the temple wall. */
export function label(text: string, family: string): Texture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.font = `700 22px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#14102a";
  ctx.fillText(text, size / 2 + 1, size / 2 + 2);
  ctx.fillStyle = "#eaf1f7";
  ctx.fillText(text, size / 2, size / 2 + 1);
  return crisp(new CanvasTexture(canvas));
}
