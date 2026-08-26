/**
 * A small, deliberately hand-drawn film renderer for Rose Door.  It keeps the
 * expensive work in one 2D canvas, which makes the scene feel more like an
 * illustrated title sequence than a collection of WebGL primitives.
 */
export interface RoseCinemaFilmOptions {
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onCue?: (cue: string) => void;
}

export interface RoseCinemaFilm {
  start: (startAt?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void;
  isPaused: () => boolean;
  isRunning: () => boolean;
}

// One timeline owns every hand-off. Keeping the chapters here prevents a
// visual tweak in one shot from leaving a hard gap in the next one.
const SCENE = {
  duration: 84.5,
  door: { in: 0, out: 6.6 },
  // The night is already waiting behind the foreground flock.  Keeping it
  // separate from the stars lets the bats perform a true lens wipe instead
  // of fading into another plum-coloured background.
  night: { in: 1.82, full: 2.42 },
  bats: {
    in: .82,
    out: 12.7,
    waves: [.78, 1.34, 1.9] as const,
    morphIn: 2.38,
    morphOut: 4.28,
  },
  vortex: { in: 3.25, out: 10.45 },
  blooms: { in: 3.7, formed: 5.65, dissolve: 7.85, out: 11.65 },
  // The sky must remain present while the memories are projected.  It is the
  // room the images inhabit, not an introductory screen that disappears.
  stars: { in: 9.85, out: 83.9 },
  zodiac: { in: 12.35, out: 76.8 },
  memories: {
    in: 19.5,
    out: 52.1,
    chapterStarts: [19.5, 27.65, 35.8, 43.95] as const,
    chapterLength: 8.15,
  },
  dissolve: { in: 50.2, out: 63.15 },
  rose: { in: 56.55, settled: 62.7, scatterIn: 64.1, scatterOut: 68.2, out: 69.15 },
  // The flower breaks into the exact motes that later settle on the glyph
  // mask.  Keeping these beats explicit prevents a hidden cross-fade between
  // the rose and the final dust lettering.
  thanks: { in: 66.8, formed: 71.85, out: 83.9 },
  // Keep the final thank-you on screen instead of closing it in a black iris.
  iris: { in: 90, out: 91 },
} as const;
const DURATION = SCENE.duration;
const TAU = Math.PI * 2;
type FilmCue = { at: number; name: string; handoffOnly?: boolean };
const FILM_CUES: readonly FilmCue[] = [
  { at: .18, name: "door" },
  { at: .82, name: "bat-wave-1" },
  { at: 1.34, name: "bat-wave-2" },
  { at: 1.9, name: "bat-wave-3" },
  { at: 2.08, name: "takeover", handoffOnly: true },
  { at: 2.38, name: "bat-veil" },
  { at: SCENE.vortex.in, name: "petal-vortex" },
  { at: SCENE.blooms.in, name: "petals-born" },
  { at: SCENE.blooms.formed, name: "blooms-formed" },
  { at: SCENE.blooms.dissolve, name: "bloom-to-stars" },
  { at: SCENE.stars.in, name: "stars" },
  { at: SCENE.zodiac.in, name: "virgo" },
  { at: 15.8, name: "capricorn" },
  { at: 19.08, name: "memory-streak-1" },
  { at: 19.5, name: "memory-1" },
  { at: 20.18, name: "memory-glint-1" },
  { at: 20.86, name: "memory-glint-2" },
  { at: 21.54, name: "memory-glint-3" },
  { at: 27.23, name: "memory-streak-2" },
  { at: 27.65, name: "memory-2" },
  { at: 28.33, name: "memory-glint-1" },
  { at: 29.01, name: "memory-glint-2" },
  { at: 29.69, name: "memory-glint-3" },
  { at: 35.38, name: "memory-streak-3" },
  { at: 35.8, name: "memory-3" },
  { at: 36.48, name: "memory-glint-1" },
  { at: 37.16, name: "memory-glint-2" },
  { at: 37.84, name: "memory-glint-3" },
  { at: 43.53, name: "memory-streak-4" },
  { at: 43.95, name: "memory-4" },
  { at: 44.63, name: "memory-glint-1" },
  { at: 45.31, name: "memory-glint-2" },
  { at: 45.99, name: "memory-glint-3" },
  { at: SCENE.dissolve.in, name: "memory-dissolve" },
  { at: SCENE.rose.in, name: "finale" },
  { at: SCENE.rose.settled, name: "rose-settle" },
  { at: SCENE.rose.scatterIn, name: "rose-scatter" },
  { at: SCENE.thanks.in, name: "thanks" },
  { at: SCENE.thanks.formed, name: "thanks-formed" },
  { at: 76.4, name: "thanks-glint-1" },
  { at: 80.2, name: "thanks-glint-2" },
  { at: 83.6, name: "end-tail" },
] as const;
const PETAL_PALETTES = [
  ["#d85761", "#741127"],
  ["#bd2944", "#500916"],
  ["#92152e", "#26040e"],
  ["#d94e5a", "#7a1228"],
] as const;

const MEMORY_BRUSH_SWEEPS = [
  { cx: -.04, cy: -.29, a: -.035, len: 1.56, thick: .29, dir: 1 },
  { cx: .035, cy: -.03, a: .018, len: 1.64, thick: .36, dir: 1 },
  { cx: -.025, cy: .27, a: -.024, len: 1.55, thick: .3, dir: 1 },
  { cx: .08, cy: .04, a: .008, len: 1.48, thick: .39, dir: 1 },
] as const;

type Seed = { a: number; b: number; c: number; d: number; e: number };
type Star = { x: number; y: number; r: number; twinkle: number; hue: number };
type Meteor = {
  start: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  bend: number;
  depth: number;
  tone: number;
  hero: boolean;
  phase: number;
  strength: number;
  targetImage: number;
};
type Point = readonly [number, number];
type DiaryPose = { x: number; y: number; width: number; height: number; turn: number; gutter: number };
type DiaryPhotoShape = "deckle" | "oval" | "vellum" | "ribbon" | "rose";
type DiaryPhotoPose = {
  x: number;
  y: number;
  width: number;
  height: number;
  turn: number;
  shape: DiaryPhotoShape;
};
type MemoryFramePose = {
  x: number;
  y: number;
  width: number;
  height: number;
  turn: number;
  shape: "hero" | "moon" | "petal";
};
type MemoryLobePose = { x: number; y: number; width: number; height: number; turn: number; depth: number };
type MemoryPetal = Seed & { card: number };
type FilmStage = { x: number; y: number; unit: number; portrait: boolean };
type OpeningFlowerSpec = { x: number; y: number; scale: number; tilt: number; haze: number };
type ThanksMoteTarget = { glyph: number; x: number; y: number; order: number; phase: number };
type ConstellationName = "virgo" | "capricorn";
type ConstellationLayout = { x: number; y: number; scale: number };

const VIRGO: readonly Point[] = [
  [-.23, -.22], [-.08, -.11], [.08, -.22], [.2, -.02], [.1, .19], [.24, .35], [.04, .47], [-.15, .32],
] as const;
const CAPRICORN: readonly Point[] = [
  [.31, -.3], [.47, -.15], [.39, .04], [.55, .2], [.38, .36], [.2, .27], [.14, .08], [.25, -.07],
] as const;

const CONSTELLATION_ORIGINS: Record<ConstellationName, Point> = {
  virgo: [.005, .125],
  capricorn: [.345, .03],
};

// A massive overflowing garden. 30 flowers in landscape, 15 in portrait.
const OPENING_BOUQUET = {
  landscape: [
    { x: -0.8, y: -0.3, scale: 0.5, tilt: -0.2, haze: 0.8 },
    { x: -0.5, y: -0.25, scale: 0.7, tilt: 0.1, haze: 0.9 },
    { x: -0.2, y: -0.35, scale: 0.4, tilt: -0.1, haze: 0.6 },
    { x: 0.1, y: -0.28, scale: 0.6, tilt: 0.3, haze: 0.8 },
    { x: 0.4, y: -0.32, scale: 0.5, tilt: -0.2, haze: 0.7 },
    { x: 0.7, y: -0.25, scale: 0.65, tilt: 0.1, haze: 0.9 },
    { x: 0.9, y: -0.1, scale: 0.45, tilt: -0.3, haze: 0.6 },
    { x: -0.9, y: 0.0, scale: 0.55, tilt: 0.2, haze: 0.7 },
    { x: -0.65, y: 0.1, scale: 0.8, tilt: -0.1, haze: 1.0 },
    { x: -0.35, y: 0.05, scale: 0.7, tilt: 0.2, haze: 0.8 },
    { x: -0.1, y: -0.05, scale: 0.9, tilt: -0.2, haze: 1.1 },
    { x: 0.2, y: 0.1, scale: 0.85, tilt: 0.1, haze: 1.0 },
    { x: 0.5, y: 0.0, scale: 0.65, tilt: -0.15, haze: 0.8 },
    { x: 0.8, y: 0.15, scale: 0.75, tilt: 0.25, haze: 0.9 },
    { x: -0.75, y: 0.3, scale: 0.6, tilt: -0.2, haze: 0.7 },
    { x: -0.45, y: 0.4, scale: 0.85, tilt: 0.1, haze: 1.0 },
    { x: -0.15, y: 0.35, scale: 1.0, tilt: -0.1, haze: 1.2 },
    { x: 0.15, y: 0.45, scale: 0.8, tilt: 0.2, haze: 0.9 },
    { x: 0.45, y: 0.35, scale: 0.95, tilt: -0.3, haze: 1.1 },
    { x: 0.75, y: 0.4, scale: 0.7, tilt: 0.15, haze: 0.8 },
    { x: -0.55, y: -0.1, scale: 0.5, tilt: 0.2, haze: 0.7 },
    { x: 0.35, y: -0.15, scale: 0.45, tilt: -0.1, haze: 0.6 },
    { x: -0.25, y: 0.25, scale: 0.65, tilt: 0.3, haze: 0.8 },
    { x: 0.3, y: 0.25, scale: 0.55, tilt: -0.25, haze: 0.7 },
    { x: -0.05, y: 0.15, scale: 0.75, tilt: 0.1, haze: 0.9 },
    { x: 0.65, y: -0.15, scale: 0.5, tilt: -0.2, haze: 0.7 },
    { x: -0.85, y: 0.2, scale: 0.4, tilt: 0.15, haze: 0.6 },
    { x: 0.85, y: 0.25, scale: 0.45, tilt: -0.1, haze: 0.6 },
    { x: -0.3, y: -0.15, scale: 0.55, tilt: 0.25, haze: 0.7 },
    { x: 0.05, y: -0.2, scale: 0.5, tilt: -0.15, haze: 0.6 },
  ],
  portrait: [
    { x: -0.35, y: -0.5, scale: 0.6, tilt: -0.2, haze: 0.8 },
    { x: 0.1, y: -0.55, scale: 0.5, tilt: 0.1, haze: 0.7 },
    { x: 0.35, y: -0.4, scale: 0.65, tilt: -0.3, haze: 0.85 },
    { x: -0.2, y: -0.3, scale: 0.75, tilt: 0.2, haze: 0.9 },
    { x: 0.25, y: -0.2, scale: 0.55, tilt: -0.1, haze: 0.7 },
    { x: -0.4, y: -0.1, scale: 0.7, tilt: 0.3, haze: 0.85 },
    { x: 0.05, y: -0.05, scale: 0.9, tilt: -0.15, haze: 1.1 },
    { x: 0.4, y: 0.1, scale: 0.65, tilt: 0.2, haze: 0.8 },
    { x: -0.25, y: 0.15, scale: 0.85, tilt: -0.25, haze: 1.0 },
    { x: 0.15, y: 0.25, scale: 0.8, tilt: 0.1, haze: 0.95 },
    { x: -0.35, y: 0.4, scale: 0.6, tilt: -0.1, haze: 0.75 },
    { x: 0.0, y: 0.45, scale: 0.75, tilt: 0.3, haze: 0.9 },
    { x: 0.35, y: 0.35, scale: 0.5, tilt: -0.2, haze: 0.65 },
    { x: -0.15, y: 0.55, scale: 0.65, tilt: 0.15, haze: 0.8 },
    { x: 0.25, y: 0.6, scale: 0.55, tilt: -0.1, haze: 0.7 },
  ],
} as const satisfies Record<"landscape" | "portrait", readonly OpeningFlowerSpec[]>;

// Petal counts per flower: 180 particles / 30 flowers = 6 petals/flower (landscape).
// 90 particles / 15 flowers = 6 petals/flower (portrait).
const OPENING_RING_PLAN = {
  wide: [2, 4],
  compact: [2, 4],
} as const;

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function lerp(a: number, b: number, amount: number) { return a + (b - a) * amount; }
function smooth(from: number, to: number, value: number) {
  const x = clamp((value - from) / Math.max(.001, to - from));
  return x * x * (3 - 2 * x);
}
function easeOut(value: number) { return 1 - (1 - clamp(value)) ** 3; }
function easeInOut(value: number) {
  const x = clamp(value);
  return x < .5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}
function seeded(index: number, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}
function mixColor(a: string, b: string, amount: number) {
  const parse = (value: string) => value.match(/[\da-f]{2}/gi)?.map((part) => Number.parseInt(part, 16)) ?? [0, 0, 0];
  const aa = parse(a); const bb = parse(b);
  const part = (index: number) => Math.round(lerp(aa[index], bb[index], amount)).toString(16).padStart(2, "0");
  return `#${part(0)}${part(1)}${part(2)}`;
}
function paintPetalPath(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(-.7, .2);
  context.bezierCurveTo(-.7, -.28, -.36, -.93, .11, -.93);
  context.bezierCurveTo(.62, -.84, .98, -.29, .66, .16);
  context.bezierCurveTo(.43, .52, -.22, .75, -.7, .2);
  context.closePath();
}

function paintBatPath(context: CanvasRenderingContext2D, flap: number) {
  const leftWing = .72 + flap * .22;
  const rightWing = .72 + flap * .2;
  context.beginPath();
  context.moveTo(0, -.03);
  context.bezierCurveTo(-.12, -.18, -.16, -.38, -.25, -.44);
  context.bezierCurveTo(-.36, -.25, -.55, -.25, -.94, -leftWing);
  context.bezierCurveTo(-.87, -.1, -.68, .13, -.48, .08);
  context.bezierCurveTo(-.35, .28, -.2, .16, 0, .24);
  context.bezierCurveTo(.2, .16, .35, .28, .48, .08);
  context.bezierCurveTo(.68, .13, .87, -.1, .94, -rightWing);
  context.bezierCurveTo(.55, -.25, .36, -.25, .25, -.44);
  context.bezierCurveTo(.16, -.38, .12, -.18, 0, -.03);
  context.closePath();
}

function createBatSprite(flap: number) {
  const surface = document.createElement("canvas");
  surface.width = 240;
  surface.height = 160;
  const sprite = surface.getContext("2d");
  if (!sprite) return surface;
  sprite.translate(120, 110);
  sprite.scale(110, 110);
  sprite.fillStyle = "#32122d";
  paintBatPath(sprite, flap);
  sprite.fill();
  sprite.strokeStyle = "rgba(215, 103, 137, .24)";
  sprite.lineWidth = .018;
  sprite.stroke();
  return surface;
}

function createPetalSprite(palette: readonly [string, string]) {
  const surface = document.createElement("canvas");
  surface.width = 320;
  surface.height = 320;
  const sprite = surface.getContext("2d");
  if (!sprite) return surface;
  sprite.translate(160, 160);
  sprite.scale(150, 150);
  const gradient = sprite.createLinearGradient(-.55, -.3, .7, .45);
  gradient.addColorStop(0, palette[0]);
  gradient.addColorStop(.48, palette[1]);
  gradient.addColorStop(1, "#3b091b");
  sprite.fillStyle = gradient;
  paintPetalPath(sprite);
  sprite.fill();
  sprite.strokeStyle = "rgba(242, 207, 180, .17)";
  sprite.lineWidth = .022;
  sprite.stroke();
  sprite.strokeStyle = "rgba(246, 211, 187, .18)";
  sprite.lineWidth = .018;
  sprite.beginPath(); sprite.moveTo(-.48, .08); sprite.quadraticCurveTo(.02, -.08, .58, -.18); sprite.stroke();
  sprite.strokeStyle = "rgba(243, 189, 162, .11)";
  sprite.lineWidth = .012;
  sprite.beginPath(); sprite.moveTo(-.39, .19); sprite.quadraticCurveTo(.05, .03, .55, -.08); sprite.stroke();
  return surface;
}

function createOpeningRosetteSprite(petalSprites: readonly HTMLCanvasElement[], variant: number) {
  const surface = document.createElement("canvas");
  surface.width = 320;
  surface.height = 320;
  const sprite = surface.getContext("2d");
  if (!sprite) return surface;

  sprite.translate(160, 160);
  const drawRing = (count: number, radius: number, size: number, turn: number, alpha: number) => {
    for (let index = 0; index < count; index += 1) {
      const angle = (index + .5) / count * TAU + turn;
      const petal = petalSprites[(index + variant) % petalSprites.length];
      sprite.save();
      sprite.rotate(angle);
      sprite.translate(radius, 0);
      sprite.rotate((index % 2 ? .08 : -.06) + variant * .025);
      sprite.globalAlpha = alpha * (.9 + seeded(index + variant * 11, 730) * .1);
      sprite.drawImage(petal, -size * .5, -size * .5, size, size);
      sprite.restore();
    }
  };

  // Nine cached petals make a dark, layered rose bed. The six live petals
  // transformed from bats remain above this sprite, preserving continuity
  // while making every flower read as a full bloom rather than a six-point icon.
  drawRing(6, 60, 128, variant * .17, .68);
  drawRing(3, 24, 108, .4 + variant * .2, .82);
  const core = sprite.createRadialGradient(0, 0, 2, 0, 0, 42);
  core.addColorStop(0, "rgba(255, 202, 151, .62)");
  core.addColorStop(.18, "rgba(197, 45, 72, .66)");
  core.addColorStop(1, "rgba(57, 5, 24, 0)");
  sprite.fillStyle = core;
  sprite.beginPath(); sprite.arc(0, 0, 42, 0, TAU); sprite.fill();
  return surface;
}

function createMeteorSprite(tone: number) {
  const surface = document.createElement("canvas");
  surface.width = 512;
  surface.height = 96;
  const sprite = surface.getContext("2d");
  if (!sprite) return surface;

  const palettes = [
    ["rgba(255, 159, 139, 0)", "rgba(233, 92, 120, .34)", "rgba(255, 226, 196, .98)"],
    ["rgba(165, 193, 255, 0)", "rgba(154, 190, 255, .3)", "rgba(231, 242, 255, .98)"],
    ["rgba(255, 204, 143, 0)", "rgba(242, 157, 102, .32)", "rgba(255, 242, 211, .98)"],
  ] as const;
  const palette = palettes[tone % palettes.length];
  const headX = 486;
  const centerY = 48;
  const tail = sprite.createLinearGradient(6, centerY, headX, centerY);
  tail.addColorStop(0, palette[0]);
  tail.addColorStop(.58, palette[1]);
  tail.addColorStop(.88, palette[2]);
  tail.addColorStop(1, "rgba(255, 255, 255, 1)");
  sprite.lineCap = "round";
  sprite.strokeStyle = tail;
  sprite.lineWidth = 12;
  sprite.beginPath();
  sprite.moveTo(8, centerY + 4);
  sprite.bezierCurveTo(196, centerY + 1, 356, centerY - 3, headX, centerY);
  sprite.stroke();

  const filament = sprite.createLinearGradient(84, centerY, headX, centerY);
  filament.addColorStop(0, "rgba(255, 255, 255, 0)");
  filament.addColorStop(.7, palette[2]);
  filament.addColorStop(1, "rgba(255, 255, 255, 1)");
  sprite.strokeStyle = filament;
  sprite.lineWidth = 1.5;
  sprite.beginPath();
  sprite.moveTo(72, centerY);
  sprite.quadraticCurveTo(325, centerY - 2, headX, centerY);
  sprite.stroke();

  const glow = sprite.createRadialGradient(headX, centerY, 0, headX, centerY, 21);
  glow.addColorStop(0, "rgba(255, 255, 255, 1)");
  glow.addColorStop(.18, palette[2]);
  glow.addColorStop(.48, palette[1]);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  sprite.fillStyle = glow;
  sprite.beginPath(); sprite.arc(headX, centerY, 21, 0, TAU); sprite.fill();
  return surface;
}

function waitForImage(image: HTMLImageElement, timeout = 900) {
  if (image.complete && image.naturalWidth) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.removeEventListener("load", settle);
      image.removeEventListener("error", settle);
      resolve();
    };
    const timer = window.setTimeout(settle, timeout);
    image.addEventListener("load", settle, { once: true });
    image.addEventListener("error", settle, { once: true });
  });
}

export async function createRoseCinemaFilm(
  root: HTMLElement,
  options: RoseCinemaFilmOptions,
): Promise<RoseCinemaFilm> {
  const canvasCandidate = root.querySelector<HTMLCanvasElement>("#rose-cinema-canvas");
  if (!canvasCandidate) throw new Error("Rose cinema canvas is unavailable");
  const canvas: HTMLCanvasElement = canvasCandidate;
  const thanks = root.querySelector<HTMLElement>("#rose-cinema-thanks");
  // Keep the first-view canvas transparent until the foreground flock covers
  // the DOM doorway; this avoids swapping between two visibly different doors.
  const contextCandidate = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!contextCandidate) throw new Error("Rose cinema 2D context is unavailable");
  const context: CanvasRenderingContext2D = contextCandidate;
  const petalSprites = PETAL_PALETTES.map(createPetalSprite);
  const openingRosettes = [0, 1, 2].map((variant) => createOpeningRosetteSprite(petalSprites, variant));
  const batSprites = [-.92, 0, .92].map(createBatSprite);
  const meteorSprites = [0, 1, 2].map(createMeteorSprite);
  const vignette = root.querySelector<HTMLElement>(".rose-cinema-vignette");

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("[data-rose-texture]"));
  // Image decoding is opportunistic: encrypted builds can reveal these a beat
  // after the canvas is prepared, so a missing photograph never stalls film.
  await Promise.all(images.slice(0, 20).map(waitForImage));
  const textureIndex = (image: HTMLImageElement) => Number.parseInt((image.dataset.roseTexture ?? "").split("-").at(-1) ?? "0", 10) || 0;
  const photos = images
    .filter((image) => /^photo-/.test(image.dataset.roseTexture ?? ""))
    .sort((one, two) => textureIndex(one) - textureIndex(two));
  const glimpses = images
    .filter((image) => /^painted-/.test(image.dataset.roseTexture ?? ""))
    .sort((one, two) => textureIndex(one) - textureIndex(two));
  const memorySurfaceCache = new WeakMap<HTMLImageElement, {
    surface: HTMLCanvasElement;
    width: number;
    height: number;
    source: string;
  }>();

  const compact = window.matchMedia("(max-width: 720px)").matches;
  // The three waves share this one flock. The very same travellers become
  // petals later, so the opening reads as a transformation rather than two
  // unrelated particle systems.
  const particleCount = compact ? 90 : 180;
  const starCount = compact ? 155 : 286;
  const particles: Seed[] = Array.from({ length: particleCount }, (_, index) => ({
    a: seeded(index, 1), b: seeded(index, 2), c: seeded(index, 3), d: seeded(index, 4), e: seeded(index, 5),
  }));
  const orderedParticles = [...particles].sort((one, two) => one.c - two.c);
  const foregroundBatCount = compact ? 12 : 18;
  const foregroundBats: Seed[] = Array.from({ length: foregroundBatCount }, (_, index) => ({
    a: seeded(index, 151), b: seeded(index, 152), c: seeded(index, 153), d: seeded(index, 154), e: seeded(index, 155),
  }));
  const stars: Star[] = Array.from({ length: starCount }, (_, index) => ({
    x: seeded(index, 10), y: seeded(index, 11), r: .35 + seeded(index, 12) * 1.45,
    twinkle: seeded(index, 13) * TAU, hue: seeded(index, 14),
  }));
  // The supporting photographs arrive after the hero has had a clean breath.
  // Meteor timing reads this same value, so light and image remain synchronized.
  const photoStagger = compact ? .78 : .68;
  const meteorWaves = [
    { start: 13.7, count: compact ? 3 : 5, strength: .72, targetImage: -1 },
    { start: SCENE.memories.in - 1.5, count: compact ? 3 : 5, strength: .78, targetImage: -1 },
    ...SCENE.memories.chapterStarts.flatMap((chapterStart, chapter) => (
      [0, 1, 2, 3].map((slot) => ({
        // The leading meteor reaches the photograph just as its brush mask
        // starts to develop. Every image change therefore has a physical edit
        // instead of an unrelated decorative shower.
        start: chapterStart + slot * photoStagger - .42,
        count: slot === 0 ? (compact ? 3 : 4) : slot === 3 ? (compact ? 1 : 2) : (compact ? 2 : 3),
        strength: slot === 0 ? 1 : slot === 3 ? .58 : .76,
        targetImage: chapter * 4 + slot,
      }))
    )),
    { start: SCENE.thanks.in + .75, count: compact ? 3 : 5, strength: .64, targetImage: -1 },
    { start: SCENE.thanks.in + 4.35, count: compact ? 3 : 5, strength: .58, targetImage: -1 },
    { start: SCENE.thanks.in + 8.15, count: compact ? 3 : 5, strength: .62, targetImage: -1 },
    { start: SCENE.thanks.in + 12.05, count: compact ? 3 : 5, strength: .56, targetImage: -1 },
  ].sort((one, two) => one.start - two.start);
  const meteors: Meteor[] = meteorWaves.flatMap((meteorWave, wave) => {
    const { start: waveStart, count, strength, targetImage } = meteorWave;
    return Array.from({ length: count }, (_, index) => {
      const id = wave * 17 + index;
      const depth = index === 0 ? .94 : .18 + seeded(id, 612) * .76;
      // A real meteor shower shares one radiant. Mixing directions made a
      // single reverse/curved streak read like an unrelated UI flourish.
      const direction = 1;
      const startX = -.2 - seeded(id, 614) * .16;
      const startY = -.1 + seeded(id, 615) * .55;
      return {
        start: waveStart + index * (.115 + seeded(id, 616) * .105),
        duration: (targetImage >= 0 ? .92 : 1.26)
          + seeded(id, 617) * (targetImage >= 0 ? .28 : .42)
          + (1 - depth) * .18,
        startX,
        startY,
        endX: startX + direction * (1.12 + seeded(id, 618) * .42),
        endY: startY + .25 + seeded(id, 619) * .34,
        bend: targetImage >= 0 ? 0 : (seeded(id, 620) - .5) * .014,
        depth,
        tone: (wave + index) % meteorSprites.length,
        hero: index === 0 || (!compact && strength >= .9 && index === 4),
        phase: seeded(id, 621) * TAU,
        strength,
        targetImage,
      };
    });
  });
  // The storm and the finished bloom share one set of logical petals. Keeping
  // their counts equal avoids drawing two dense flowers during the handoff.
  const flowerPetalCount = compact ? 32 : 49;
  const memoryPetals: MemoryPetal[] = Array.from({ length: flowerPetalCount }, (_, index) => ({
    a: seeded(index, 101), b: seeded(index, 102), c: seeded(index, 103), d: seeded(index, 104), e: seeded(index, 105),
    // The active sky slide presents four photographs per chapter. Mapping the
    // storm to those same four slots makes the petals visibly leave all the
    // photographs the viewer has just seen.
    card: index % 4,
  }));

  let width = 1;
  let height = 1;
  let dpr = 1;
  let animation = 0;
  let resizeFrame = 0;
  let running = false;
  let paused = false;
  let destroyed = false;
  let time = 0;
  let previous = 0;
  let cueIndex = 0;
  let lastIris = -1;
  let handoffMode = false;
  let thanksMaskKey = "";
  let thanksMaskTargets: ThanksMoteTarget[] = [];
  let thanksMoteX: number[] = [];
  let thanksMoteY: number[] = [];
  let thanksMoteFlight: number[] = [];

  const getThanksFontSize = () => compact
    ? clamp(width * .16, 52, 92)
    : clamp(width * .12, 64, 154);

  const resize = () => {
    const bounds = root.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width));
    height = Math.max(1, Math.floor(bounds.height));
    // Keep a firm pixel budget on large/retina screens. Canvas animation stays
    // smooth while CSS still presents it at the exact viewport size.
    const pixelBudget = width <= 720 ? 1_650_000 : 3_650_000;
    const budgetDpr = Math.sqrt(pixelBudget / Math.max(1, width * height));
    dpr = Math.min(window.devicePixelRatio || 1, width <= 720 ? 1.45 : 1.8, budgetDpr);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    // Build the tiny glyph mask while the canvas is preparing or resizing,
    // never on the finale's first visible frame.
    const thanksFontSize = getThanksFontSize();
    const thanksGlyphs = ["T", "h", "a", "n", "k", "y", "o", "u"];
    context.font = `400 ${thanksFontSize}px "DM Serif Display", Georgia, serif`;
    getThanksMaskTargets(thanksFontSize, thanksGlyphs, thanksGlyphs.map((glyph) => context.measureText(glyph).width));
  };
  const observer = new ResizeObserver(() => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); render(time, true); });
  });
  observer.observe(root);
  resize();
  void document.fonts?.ready?.then(() => {
    thanksMaskKey = "";
    resize();
    render(time, true);
  });

  function filmStage(): FilmStage {
    return {
      x: width * .5,
      y: height * .5,
      unit: Math.min(width, height),
      portrait: width < height * .82,
    };
  }

  // Every scene derives its optical centre from this one camera path. The
  // motion is deliberately shallow: the world lifts toward the stars, then
  // settles back for the memories and the final flower without jumping cuts.
  function sceneFocus(t: number): FilmStage {
    const stage = filmStage();
    const skyLift = smooth(SCENE.vortex.in + .8, SCENE.stars.in + 3.7, t)
      * (1 - smooth(SCENE.memories.in + 2.8, SCENE.memories.in + 5.2, t));
    const memorySettle = smooth(SCENE.zodiac.out - 3.1, SCENE.memories.in + 2.2, t)
      * (1 - smooth(SCENE.memories.out - 2.1, SCENE.rose.in + 2.2, t));
    const finaleSettle = smooth(SCENE.dissolve.in + 2.4, SCENE.rose.settled, t);
    return {
      ...stage,
      y: stage.y + stage.unit * (-.082 * skyLift + .015 * memorySettle + .012 * finaleSettle),
    };
  }

  function constellationLayout(name: ConstellationName, t: number): ConstellationLayout {
    const focus = sceneFocus(t);
    if (focus.portrait) {
      return {
        x: focus.x,
        y: focus.y + focus.unit * (name === "virgo" ? -.25 : .25),
        scale: focus.unit * .68,
      };
    }
    return {
      x: focus.x + focus.unit * (name === "virgo" ? -.27 : .27),
      y: focus.y,
      scale: focus.unit * .78,
    };
  }

  function constellationPosition(name: ConstellationName, point: Point, t: number) {
    const layout = constellationLayout(name, t);
    const origin = CONSTELLATION_ORIGINS[name];
    return {
      x: layout.x + (point[0] - origin[0]) * layout.scale,
      y: layout.y + (point[1] - origin[1]) * layout.scale,
    };
  }

  function starPosition(star: Star, t: number) {
    const rise = smooth(SCENE.stars.in - 1.3, SCENE.zodiac.in, t);
    return {
      x: star.x * width + Math.sin(t * .16 + star.twinkle) * 4,
      y: (star.y * 1.18 - .07 - rise * .055) * height,
    };
  }

  function fillBackground(t: number) {
    context.save();
    context.globalAlpha = handoffMode ? smooth(.92, 2.24, t) : 1;
    const dawn = smooth(SCENE.dissolve.in, SCENE.rose.settled + 1.5, t);
    const ascent = smooth(SCENE.vortex.in + 3.6, SCENE.zodiac.in, t)
      * (1 - smooth(SCENE.memories.in + 5.2, SCENE.memories.in + 10.3, t));
    const memory = smooth(SCENE.memories.in - 2.2, SCENE.memories.in + 2.8, t)
      * (1 - smooth(SCENE.memories.out - 1.8, SCENE.rose.in + 3.1, t));
    const focus = sceneFocus(t);
    const wash = context.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, Math.max(width, height) * .78);
    wash.addColorStop(0, mixColor(mixColor("#25101f", "#141331", ascent), "#3a111d", dawn));
    wash.addColorStop(.42, mixColor(mixColor("#110914", "#090c21", ascent), "#180712", dawn));
    wash.addColorStop(1, "#050307");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(focus.x, focus.y, 0, focus.x, focus.y, width * .62);
    glow.addColorStop(0, `rgba(174, 30, 58, ${.08 + dawn * .08 + memory * .025})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  // A slow halo is the film's visual through-line: it begins as light behind
  // the door, becomes the mouth of the vortex, then settles underneath the
  // final flower.  It avoids a hard cut between the otherwise very different
  // shots without adding another visible UI layer.
  function drawMoonHalo(t: number) {
    const threshold = smooth(.2, SCENE.door.out - 1.1, t);
    const sky = smooth(SCENE.stars.in - 2.3, SCENE.zodiac.in - 1.2, t)
      * (1 - smooth(SCENE.memories.in + 6.7, SCENE.memories.in + 12.6, t));
    const finale = smooth(SCENE.dissolve.in - 1.2, SCENE.rose.settled, t);
    const amount = Math.max(threshold * .42, sky * .38, finale * .6);
    if (amount <= .001) return;
    const focus = sceneFocus(t);
    const unit = focus.unit;
    const cx = focus.x;
    const cy = focus.y;
    const radius = unit * lerp(.2, .38, Math.max(sky, finale));
    context.save();
    context.globalCompositeOperation = "screen";
    const halo = context.createRadialGradient(cx, cy, radius * .04, cx, cy, radius * 1.28);
    halo.addColorStop(0, `rgba(219, 54, 86, ${amount * .075})`);
    halo.addColorStop(.42, `rgba(114, 43, 102, ${amount * .045})`);
    halo.addColorStop(1, "rgba(34, 10, 35, 0)");
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);

    // Two almost imperceptible rings keep the central energy alive.  Their
    // drift is intentionally slower than the particles, like a camera moving
    // through a room rather than a decorative spinner.
    context.lineWidth = .75;
    context.strokeStyle = `rgba(237, 183, 148, ${amount * .08})`;
    for (let index = 0; index < 2; index += 1) {
      const phase = t * (.06 + index * .014) + index * 1.42;
      context.beginPath();
      context.ellipse(cx, cy, radius * (.68 + index * .17), radius * (.36 + index * .08), phase, 0, TAU);
      context.stroke();
    }
    context.restore();
  }

  function drawDust(t: number, strength: number) {
    if (strength <= .001) return;
    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 28; index += 1) {
      const x = (seeded(index, 34) * 1.18 - .09) * width + Math.sin(t * .13 + index) * 18;
      const y = (seeded(index, 35) * 1.12 - .06) * height - t * (3 + seeded(index, 36) * 6);
      const alpha = strength * (.025 + seeded(index, 37) * .05);
      context.fillStyle = `rgba(247, 221, 183, ${alpha})`;
      context.beginPath(); context.arc(x, y % (height * 1.12), .6 + seeded(index, 38) * 1.8, 0, TAU); context.fill();
    }
    context.restore();
  }

  function drawDoor(t: number, opacity = 1) {
    const opening = smooth(1.25, SCENE.door.out - 2.35, t);
    const focal = easeOut(smooth(0, SCENE.door.out - 2.55, t));
    const scale = lerp(.83, 1.62, focal);
    const focus = sceneFocus(Math.min(t, SCENE.door.out - 1.1));
    const dw = Math.min(width * .46, height * .36) * scale;
    const dh = dw * 1.72;
    const cx = focus.x;
    // Scaling around the optical centre keeps the threshold locked in place;
    // only the camera moves toward it.
    const base = focus.y + dh * .5;
    const arch = dw * .5;

    context.save();
    context.globalAlpha = opacity;
    context.translate(cx, base);
    context.scale(1, 1);
    context.shadowColor = "rgba(0, 0, 0, .9)";
    context.shadowBlur = 38;
    context.fillStyle = "#060408";
    context.beginPath();
    context.moveTo(-dw / 2, 0); context.lineTo(-dw / 2, -dh + arch);
    context.arc(0, -dh + arch, arch, Math.PI, 0); context.lineTo(dw / 2, 0); context.closePath(); context.fill();
    context.shadowBlur = 0;

    // Stone arch and its gentle moon edge.
    context.lineWidth = Math.max(2, dw * .023);
    context.strokeStyle = "rgba(199, 157, 111, .28)";
    context.beginPath();
    context.moveTo(-dw / 2, 0); context.lineTo(-dw / 2, -dh + arch);
    context.arc(0, -dh + arch, arch, Math.PI, 0); context.lineTo(dw / 2, 0); context.stroke();

    const leafWidth = dw * .495;
    const gap = opening * dw * .26;
    const drawLeaf = (side: number) => {
      const hinge = side * (gap * .5);
      const outer = side * (gap * .5 + leafWidth);
      const grad = context.createLinearGradient(hinge, -dh, outer, 0);
      grad.addColorStop(0, "#1e0b18"); grad.addColorStop(.55, "#3e0d1d"); grad.addColorStop(1, "#120811");
      context.fillStyle = grad;
      context.beginPath();
      context.moveTo(hinge, 0); context.lineTo(hinge, -dh + arch);
      context.quadraticCurveTo(hinge + side * arch, -dh - arch * .14, outer, -dh + arch);
      context.lineTo(outer, 0); context.closePath(); context.fill();
      context.strokeStyle = "rgba(226, 158, 133, .16)"; context.lineWidth = 1;
      for (let panel = 0; panel < 3; panel += 1) {
        const py = -dh * (.15 + panel * .25);
        context.strokeRect(Math.min(hinge, outer) + leafWidth * .13, py - dh * .145, leafWidth * .74, dh * .19);
      }
    };
    drawLeaf(-1); drawLeaf(1);
    const red = context.createRadialGradient(0, -dh * .42, 1, 0, -dh * .42, dw * .28 + opening * dw * .5);
    red.addColorStop(0, `rgba(193, 34, 63, ${.22 + opening * .2})`);
    red.addColorStop(1, "rgba(80, 9, 24, 0)");
    context.fillStyle = red; context.fillRect(-dw, -dh, dw * 2, dh);
    context.restore();
  }

  function batShape(
    x: number,
    y: number,
    size: number,
    turn: number,
    flap: number,
    alpha: number,
    depth: number,
    foreground = false,
  ) {
    context.save();
    context.translate(x, y); context.rotate(turn);
    context.globalAlpha = alpha;
    if (!foreground) {
      const frame = Math.max(0, Math.min(2, Math.round((Math.sin(flap) + 1) * .5 * 2)));
      context.drawImage(batSprites[frame], -size * 1.08, -size, size * 2.16, size * 1.45);
      context.restore();
      return;
    }
    context.scale(size, size);
    context.shadowColor = "rgba(0, 0, 0, .7)"; context.shadowBlur = foreground ? 9 : 0;
    context.fillStyle = foreground ? "#070308" : "#2a1026";
    paintBatPath(context, Math.sin(flap));
    context.fill();
    if (foreground && size > 10) {
      context.strokeStyle = `rgba(210, 225, 246, ${.12 + depth * .14})`;
      context.lineWidth = .035;
      context.beginPath(); context.moveTo(-.18, -.06); context.quadraticCurveTo(0, -.19, .18, -.06); context.stroke();
      context.fillStyle = "rgba(5, 2, 5, .9)";
      context.beginPath(); context.ellipse(0, .02, .095, .16, 0, 0, TAU); context.fill();
    }
    context.restore();
  }

  function petalShape(
    x: number,
    y: number,
    size: number,
    turn: number,
    alpha: number,
    shade: number,
    widthScale = 1,
  ) {
    context.save();
    context.translate(x, y); context.rotate(turn); context.globalAlpha = alpha;
    context.shadowColor = "rgba(211, 31, 75, .4)"; context.shadowBlur = shade > .9 ? 7 : 0;
    const sprite = petalSprites[Math.min(petalSprites.length - 1, Math.floor(shade * petalSprites.length))];
    context.drawImage(sprite, -size * widthScale, -size, size * 2 * widthScale, size * 2);
    context.restore();
  }

  // In the middle of the flock-to-petal change, a few wing edges tear into
  // fine red filaments.  This is cheap (only every fourth traveller draws it)
  // but makes the morph read as one physical event rather than two sprites
  // cross-fading over one another.
  function drawWingFilaments(
    x: number,
    y: number,
    size: number,
    turn: number,
    morph: number,
    alpha: number,
    phase: number,
  ) {
    const amount = Math.sin(clamp(morph) * Math.PI) * alpha;
    if (amount <= .012) return;
    context.save();
    context.translate(x, y); context.rotate(turn);
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    context.globalAlpha = amount * .58;
    context.strokeStyle = "rgba(236, 69, 94, .85)";
    context.shadowColor = "rgba(211, 29, 68, .9)";
    context.shadowBlur = 7;
    context.lineWidth = Math.max(.5, size * .036);
    for (let wing = -1; wing <= 1; wing += 2) {
      const peel = size * (.48 + Math.sin(phase + wing) * .08);
      context.beginPath();
      context.moveTo(wing * size * .08, -size * .03);
      context.bezierCurveTo(
        wing * size * .3, -size * (.24 + morph * .12),
        wing * peel, -size * (.12 + morph * .48),
        wing * peel * (1.22 + morph * .72), -size * (.22 + morph * .78),
      );
      context.stroke();
    }
    context.restore();
  }

  function drawMagicalWake(
    x: number,
    y: number,
    previousX: number,
    previousY: number,
    size: number,
    alpha: number,
    warmth: number,
  ) {
    if (alpha <= .008) return;
    context.save();
    context.globalCompositeOperation = "screen";
    const wake = context.createLinearGradient(previousX, previousY, x, y);
    wake.addColorStop(0, "rgba(176, 40, 78, 0)");
    wake.addColorStop(.6, warmth > .52 ? "rgba(244, 132, 124, .36)" : "rgba(190, 213, 255, .3)");
    wake.addColorStop(1, warmth > .52 ? "rgba(255, 219, 175, .82)" : "rgba(224, 235, 255, .78)");
    context.globalAlpha = alpha;
    context.strokeStyle = wake;
    context.shadowColor = warmth > .52 ? "rgba(221, 57, 91, .7)" : "rgba(190, 215, 255, .55)";
    context.shadowBlur = compact ? 0 : Math.min(10, size * .25);
    context.lineCap = "round";
    context.lineWidth = Math.max(.45, size * .035);
    context.beginPath(); context.moveTo(previousX, previousY); context.quadraticCurveTo(lerp(previousX, x, .55), previousY - size * .08, x, y); context.stroke();
    const glint = Math.max(1.7, Math.min(5.5, size * .2));
    context.globalAlpha = alpha * .72;
    context.strokeStyle = warmth > .52 ? "#ffd6ad" : "#e0edff";
    context.lineWidth = .55;
    context.beginPath(); context.moveTo(x - glint, y); context.lineTo(x + glint, y); context.moveTo(x, y - glint); context.lineTo(x, y + glint); context.stroke();
    context.restore();
  }

  function drawCrimsonVortex(t: number, centerX: number, centerY: number, vortex: number) {
    const amount = smooth(SCENE.vortex.in, SCENE.vortex.in + 2.6, t)
      * (1 - smooth(SCENE.vortex.out - 2.2, SCENE.vortex.out, t));
    if (amount <= .001) return;
    const unit = Math.min(width, height);
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";

    // Velvet ribbons lead the eye into the opening before the individual
    // petals tighten into the centre.  Because they are only six paths, they
    // add cinematic depth without the soft, over-bright look of a full-screen
    // particle blur.
    for (let index = 0; index < 6; index += 1) {
      const phase = index / 6 * TAU + t * (.31 + index * .012);
      const outerRadius = unit * (.31 + (index % 3) * .045) * (1 - vortex * .24);
      const innerRadius = unit * (.035 + (index % 2) * .014);
      const startX = centerX + Math.cos(phase) * outerRadius * 1.34;
      const startY = centerY + Math.sin(phase) * outerRadius * .55;
      const bendX = centerX + Math.cos(phase + .92) * outerRadius * .72;
      const bendY = centerY + Math.sin(phase + .92) * outerRadius * .38;
      const endX = centerX + Math.cos(phase + 2.24) * innerRadius;
      const endY = centerY + Math.sin(phase + 2.24) * innerRadius * .72;
      const ribbon = context.createLinearGradient(startX, startY, endX, endY);
      ribbon.addColorStop(0, "rgba(89, 14, 40, 0)");
      ribbon.addColorStop(.43, index % 2 ? "rgba(180, 33, 65, .32)" : "rgba(228, 71, 91, .28)");
      ribbon.addColorStop(1, "rgba(243, 174, 128, .06)");
      context.globalAlpha = amount * (.42 + index * .035);
      context.strokeStyle = ribbon;
      context.lineWidth = unit * (.010 + (index % 3) * .004);
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        lerp(startX, bendX, .55), lerp(startY, bendY, .26),
        lerp(bendX, endX, .42), lerp(bendY, endY, .72),
        endX, endY,
      );
      context.stroke();
    }

    // A small set of hand-drawn ellipses gives the petal field a readable
    // rotational current. It is intentionally sparse: the petals remain the
    // surface of the vortex, instead of being hidden by an effect layer.
    for (let index = 0; index < 8; index += 1) {
      const phase = index * .72 + t * (.56 + index * .018);
      const contraction = 1 - vortex * (.34 + index * .025);
      const rx = unit * (.31 - index * .027) * contraction;
      const ry = rx * (.26 + (index % 3) * .026);
      const start = phase + (index % 2 ? .42 : 0);
      const sweep = Math.PI * (.7 + (index % 3) * .11);
      context.globalAlpha = amount * (.075 + (index % 3) * .019);
      context.lineWidth = index % 3 === 0 ? 1.3 : .72;
      context.strokeStyle = index % 3 === 0 ? "#d84a58" : "#9e1734";
      context.beginPath();
      context.ellipse(centerX, centerY, Math.max(1, rx), Math.max(1, ry), phase * .18, start, start + sweep);
      context.stroke();
    }

    const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, unit * .26);
    core.addColorStop(0, `rgba(217, 52, 76, ${amount * (.11 + vortex * .08)})`);
    core.addColorStop(.38, `rgba(111, 16, 41, ${amount * .12})`);
    core.addColorStop(1, "rgba(64, 7, 27, 0)");
    context.globalAlpha = 1;
    context.fillStyle = core;
    context.fillRect(0, 0, width, height);
    context.restore();
  }

  function openingFlowerSpec(flower: number, portrait: boolean) {
    return (portrait ? OPENING_BOUQUET.portrait : OPENING_BOUQUET.landscape)[flower];
  }

  function openingFlowerCentre(flower: number, focus: FilmStage) {
    const spec = openingFlowerSpec(flower, focus.portrait);
    return {
      x: focus.x + spec.x * focus.unit,
      y: focus.y + spec.y * focus.unit,
      spec,
    };
  }

  function openingFlowerPose(index: number, t: number, focus: FilmStage) {
    const flowerCount = focus.portrait ? OPENING_BOUQUET.portrait.length : OPENING_BOUQUET.landscape.length;
    const flower = index % flowerCount;
    const ordinal = Math.floor(index / flowerCount);
    const plan = compact ? OPENING_RING_PLAN.compact : OPENING_RING_PLAN.wide;
    let ring = 0;
    let within = ordinal;
    while (ring < plan.length - 1 && within >= plan[ring]) {
      within -= plan[ring];
      ring += 1;
    }
    const petalsInRing = plan[ring];
    const shell = ring / Math.max(1, plan.length - 1);
    const { x: centreX, y: centreY, spec } = openingFlowerCentre(flower, focus);
    const irregularity = (seeded(index, 222) - .5) * (.16 + shell * .16);
    const breathEnvelope = smooth(SCENE.blooms.formed - .2, SCENE.blooms.formed + .55, t)
      * (1 - smooth(SCENE.blooms.dissolve - .35, SCENE.blooms.dissolve + .25, t));
    const breathing = Math.sin(t * (.28 + flower * .025) + flower * 2.17)
      * (.008 + shell * .01) * breathEnvelope;
    const angle = (within + .5) / petalsInRing * TAU
      + ring * .57 + spec.tilt + irregularity + breathing;
    const scallop = 1 + Math.sin(angle * 2 + ring * .88 + flower) * (.038 + shell * .055);
    const distance = focus.unit * (.011 + shell * (focus.portrait ? .112 : .106))
      * spec.scale * scallop;
    const cupLift = (1 - shell) * focus.unit * (.008 + spec.scale * .004);
    return {
      x: centreX + Math.cos(angle) * distance,
      y: centreY + Math.sin(angle) * distance * .74 - cupLift,
      angle,
      size: focus.unit * (.011 + shell * .022) * spec.scale
        * (.9 + seeded(index, 223) * .13),
      flower,
      ring,
    };
  }

  function openingBloomReveal(t: number) {
    return smooth(SCENE.blooms.in + .18, SCENE.blooms.formed + .35, t)
      * (1 - smooth(SCENE.blooms.dissolve + .2, SCENE.blooms.out, t));
  }

  function drawOpeningFlowerGlow(t: number, focus: FilmStage) {
    const reveal = openingBloomReveal(t);
    if (reveal <= .001) return;
    context.save();
    context.globalCompositeOperation = "screen";
    const flowerCount = focus.portrait ? OPENING_BOUQUET.portrait.length : OPENING_BOUQUET.landscape.length;
    for (let flower = 0; flower < flowerCount; flower += 1) {
      const { x, y, spec } = openingFlowerCentre(flower, focus);
      const radius = focus.unit * (.12 + spec.scale * .055);
      const shadow = context.createRadialGradient(x, y + radius * .22, radius * .03, x, y + radius * .22, radius * 1.15);
      shadow.addColorStop(0, `rgba(90, 8, 35, ${reveal * (.18 + spec.haze * .05)})`);
      shadow.addColorStop(.58, `rgba(130, 20, 52, ${reveal * .06 * spec.haze})`);
      shadow.addColorStop(1, "rgba(32, 3, 15, 0)");
      context.fillStyle = shadow;
      context.fillRect(x - radius * 1.25, y - radius, radius * 2.5, radius * 2.45);

      const mist = context.createRadialGradient(x, y - radius * .09, 0, x, y - radius * .09, radius);
      mist.addColorStop(0, `rgba(255, 110, 125, ${reveal * (.065 + spec.haze * .035)})`);
      mist.addColorStop(.42, `rgba(181, 36, 50, ${reveal * .055 * spec.haze})`);
      mist.addColorStop(1, "rgba(56, 6, 26, 0)");
      context.fillStyle = mist;
      context.fillRect(x - radius, y - radius * 1.1, radius * 2, radius * 2);
    }
    context.restore();
  }

  function drawOpeningFlowerUnderlay(t: number, focus: FilmStage) {
    const reveal = openingBloomReveal(t);
    if (reveal <= .001) return;
    const bloomIn = smooth(SCENE.blooms.in + .18, SCENE.blooms.formed + .35, t);
    const flowerCount = focus.portrait ? OPENING_BOUQUET.portrait.length : OPENING_BOUQUET.landscape.length;
    context.save();
    for (let flower = 0; flower < flowerCount; flower += 1) {
      const { x, y, spec } = openingFlowerCentre(flower, focus);
      const rosette = openingRosettes[flower % openingRosettes.length];
      const size = focus.unit * (.245 + spec.scale * .06) * (.9 + bloomIn * .1);
      context.save();
      context.translate(x, y);
      context.rotate(spec.tilt + (flower % 3 - 1) * .08);
      context.globalAlpha = reveal * (.46 + spec.haze * .07);
      context.drawImage(rosette, -size * .5, -size * .5, size, size);
      context.restore();
    }
    context.restore();
  }

  function drawOpeningFlowerAccents(t: number, focus: FilmStage) {
    const reveal = openingBloomReveal(t);
    if (reveal <= .001) return;
    context.save();
    context.globalCompositeOperation = "screen";
    const flowerCount = focus.portrait ? OPENING_BOUQUET.portrait.length : OPENING_BOUQUET.landscape.length;
    for (let flower = 0; flower < flowerCount; flower += 1) {
      const { x, y, spec } = openingFlowerCentre(flower, focus);
      const coreRadius = focus.unit * (.006 + spec.scale * .0035);
      const core = context.createRadialGradient(x, y - coreRadius * .6, 0, x, y - coreRadius * .6, coreRadius * 3.4);
      core.addColorStop(0, `rgba(255, 218, 175, ${reveal * (.48 + spec.haze * .2)})`);
      core.addColorStop(.22, `rgba(235, 85, 94, ${reveal * .52})`);
      core.addColorStop(1, "rgba(105, 14, 42, 0)");
      context.fillStyle = core;
      context.fillRect(x - coreRadius * 3.5, y - coreRadius * 4.1, coreRadius * 7, coreRadius * 7);

      const glints = flower % 3 === 0 ? 1 : 0;
      for (let glint = 0; glint < glints; glint += 1) {
        const phase = flower * 4.1 + glint * 2.42;
        const orbit = focus.unit * (.028 + glint * .014) * spec.scale;
        const gx = x + Math.cos(phase + t * .32) * orbit;
        const gy = y - coreRadius * 1.7 + Math.sin(phase * 1.21 + t * .25) * orbit * .56;
        const ray = focus.unit * (.0032 + glint * .0008);
        context.globalAlpha = reveal * (.25 + spec.haze * .12) * (.72 + Math.sin(t * 1.75 + phase) * .28);
        context.strokeStyle = glint === 0 ? "#ffe0bd" : "#f49aa0";
        context.lineWidth = Math.max(.55, focus.unit * .0008);
        context.beginPath();
        context.moveTo(gx - ray, gy); context.lineTo(gx + ray, gy);
        context.moveTo(gx, gy - ray); context.lineTo(gx, gy + ray);
        context.stroke();
      }
    }
    context.restore();
  }

  function openingStarMotion(index: number, seed: Seed, t: number) {
    const wave = index % 3;
    const star = stars[(index * 17 + wave * 31) % stars.length];
    const depart = SCENE.blooms.dissolve + seed.c * .42;
    return {
      target: starPosition(star, t),
      // One smoothstep is already an eased pass-through. The previous nested
      // ease made every petal stop, sprint, then stop again.
      travel: smooth(depart, SCENE.blooms.out + seed.c * .5, t),
    };
  }

  function drawOpeningFlowerStardust(t: number, focus: FilmStage) {
    const amount = smooth(SCENE.blooms.dissolve - .18, SCENE.stars.in + .65, t)
      * (1 - smooth(SCENE.stars.in + 3.4, SCENE.zodiac.in + 1.15, t));
    if (amount <= .001) return;
    const flowerCount = focus.portrait ? OPENING_BOUQUET.portrait.length : OPENING_BOUQUET.landscape.length;
    // Every single petal shatters and disperses into the sky.
    const count = particleCount;
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    for (let index = 0; index < count; index += 1) {
      const seed = orderedParticles[index];
      const flowerIndex = index % flowerCount;
      const sourceIndex = index;
      const source = openingFlowerPose(sourceIndex, t, focus);
      const { target, travel } = openingStarMotion(index, seed, t);
      if (travel <= .001 || travel >= .999) continue;
      const x = lerp(source.x, target.x, travel);
      const y = lerp(source.y, target.y, travel)
        - Math.sin(travel * Math.PI) * focus.unit * (.03 + seed.e * .07);
      const tailTravel = Math.max(0, travel - .08);
      const tailX = lerp(source.x, target.x, tailTravel);
      const tailY = lerp(source.y, target.y, tailTravel)
        - Math.sin(tailTravel * Math.PI) * focus.unit * (.03 + seed.e * .07);
      const light = amount * (.4 + seeded(index, 239) * .5) * Math.sin(travel * Math.PI);
      if (light <= .001) continue;
      const trail = context.createLinearGradient(tailX, tailY, x, y);
      trail.addColorStop(0, "rgba(216, 59, 93, 0)");
      trail.addColorStop(1, flowerIndex % 2 === 0 ? "rgba(255, 226, 194, .85)" : "rgba(243, 122, 128, .8)");
      context.globalAlpha = light;
      context.strokeStyle = trail;
      context.lineWidth = Math.max(.6, focus.unit * .0015);
      context.beginPath(); context.moveTo(tailX, tailY); context.lineTo(x, y); context.stroke();
      context.fillStyle = flowerIndex % 2 === 0 ? "#ffe0bd" : "#f5939c";
      context.beginPath(); context.arc(x, y, Math.max(.95, focus.unit * .002), 0, TAU); context.fill();
    }
    context.restore();
  }

  function drawFlight(t: number) {
    const vortex = smooth(SCENE.vortex.in + .45, SCENE.vortex.out - 1.2, t);
    const doorVisible = 1 - smooth(SCENE.door.out - 3.15, SCENE.door.out, t);
    if (!handoffMode && doorVisible > .001) drawDoor(t, doorVisible);
    const focus = sceneFocus(t);
    const centerX = focus.x;
    const centerY = focus.y;
    // Paint the silk current first so birds and petals remain crisply cut out
    // in front of it.  The old order put the current over the flock and made
    // the handoff read flatter on small displays.
    drawCrimsonVortex(t, centerX, centerY, vortex);
    drawOpeningFlowerGlow(t, focus);
    drawOpeningFlowerUnderlay(t, focus);
    orderedParticles.forEach((seed, index) => {
      const wave = index % 3;
      const launchAt = SCENE.bats.waves[wave] + seed.a * .72;
      const launch = smooth(launchAt, launchAt + 1.86, t);
      const appear = smooth(launchAt, launchAt + .28, t);
      const fade = 1 - smooth(SCENE.bats.out - 1.75 + seed.b * .55, SCENE.bats.out, t);
      const alpha = appear * fade;
      if (alpha <= .001) return;

      const originX = centerX + (seed.e - .5) * focus.unit * .055;
      const originY = centerY + focus.unit * (.015 + (seed.c - .5) * .075);
      const midX = width * (.015 + seed.b * .97);
      const midY = height * (.035 + seed.d * .9);
      const arc = Math.sin(launch * Math.PI) * focus.unit * (.035 + seed.e * .11) * (wave === 1 ? 1 : -1);
      const burstX = lerp(originX, midX, launch);
      const burstY = lerp(originY, midY, launch) + arc;

      const angle = seed.a * TAU * 1.4 + t * (.82 + seed.d * .38) + vortex * TAU * (.62 + seed.c * .42);
      const radius = lerp(focus.unit * (.24 + seed.b * .34), focus.unit * (.045 + seed.b * .095), vortex);
      const swirlX = centerX + Math.cos(angle) * radius * (1 - vortex * .28);
      const swirlY = centerY + Math.sin(angle * 1.12) * radius * .54 - vortex * focus.unit * (.02 + seed.c * .07);
      const swirlStart = launchAt + .72;
      const swirlBlend = smooth(swirlStart, swirlStart + 2.15, t) * .82;
      let x = lerp(burstX, swirlX, swirlBlend);
      let y = lerp(burstY, swirlY, swirlBlend);

      // The flock does not jump to a second particle system. Every bird folds
      // into a petal, settles into one of three flowers, then leaves that exact
      // flower as a point of light.
      const flower = openingFlowerPose(index, t, focus);
      const formStart = SCENE.blooms.in + wave * .055 + seed.a * .24;
      const form = smooth(formStart, formStart + 2.12, t);
      x = lerp(x, flower.x, form);
      y = lerp(y, flower.y, form) - Math.sin(form * Math.PI) * focus.unit * (.018 + seed.e * .035);

      const { target: starTarget, travel: starTravel } = openingStarMotion(index, seed, t);
      x = lerp(x, starTarget.x, starTravel);
      y = lerp(y, starTarget.y, starTravel) - Math.sin(starTravel * Math.PI) * focus.unit * (.03 + seed.e * .07);

      const nearLens = seed.c > .94 || index % 43 === 0;
      const depthScale = nearLens ? 2.2 + seed.e * .72 : .72 + seed.c * .78;
      const size = focus.unit * (.0085 + seed.c * .0185) * depthScale * lerp(.34, 1, launch) * (compact ? 1.35 : 1);
      const directionX = lerp(midX - originX, swirlX - burstX, swirlBlend);
      const directionY = lerp(midY - originY, swirlY - burstY, swirlBlend);
      const flightTurn = clamp(Math.atan2(directionY, directionX), -.58, .58)
        + Math.sin(t * 1.2 + seed.e * 9) * .08;
      const flowerTurn = flower.angle + Math.PI * .5;
      const turn = lerp(flightTurn, flowerTurn, form);
      const morphStart = SCENE.bats.morphIn + wave * .14 + seed.a * .24;
      const morph = smooth(morphStart, morphStart + 1.86, t);
      const batAlpha = alpha * (1 - morph) * (.6 + seed.c * .38);
      const petalAlpha = alpha * morph * (1 - smooth(.62, 1, starTravel));
      if (batAlpha > .003) batShape(x, y, size, turn, t * (11.8 + seed.d * 6.2) + seed.b * 9, batAlpha, seed.c, nearLens);
      if (!compact && index % 8 === 0) drawWingFilaments(x, y, size, turn, morph, alpha, t * 4.1 + seed.e * 16);
      const petalSize = lerp(size * (1.03 + morph * .2), flower.size, form) * (1 - starTravel * .72);
      if (petalAlpha > .003) petalShape(x, y, petalSize, turn + Math.PI * (.04 + morph * .15), petalAlpha, seed.c, .74 + seed.e * .16);
      if (index % (compact ? 24 : 16) === 0) {
        const wakeLength = focus.unit * (.016 + seed.c * .032);
        drawMagicalWake(
          x,
          y,
          x - Math.cos(turn) * wakeLength,
          y - Math.sin(turn) * wakeLength,
          size,
          alpha * (.18 + morph * .28) * (1 - starTravel * .72),
          seed.e,
        );
      }
    });
    drawOpeningFlowerAccents(t, focus);
    drawOpeningFlowerStardust(t, focus);
    const portal = smooth(SCENE.vortex.in, SCENE.vortex.in + 4.4, t)
      * (1 - smooth(SCENE.vortex.out - 2.6, SCENE.vortex.out, t));
    if (portal > .001) {
      context.save(); context.globalCompositeOperation = "screen";
      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, focus.unit * .34);
      halo.addColorStop(0, `rgba(197, 36, 65, ${portal * .16})`); halo.addColorStop(.62, `rgba(51, 12, 35, ${portal * .08})`); halo.addColorStop(1, "transparent");
      context.fillStyle = halo; context.fillRect(0, 0, width, height); context.restore();
    }
  }

  // Large silhouettes pass close to the lens and become the natural edit
  // point between the DOM doorway and the illustrated night.
  function drawForegroundBatCurtain(t: number) {
    const enter = smooth(.88, 2.04, t);
    const leave = 1 - smooth(2.24, 4.48, t);
    const amount = enter * leave;
    if (amount <= .001) return;
    const focus = sceneFocus(t);
    const unit = focus.unit;
    const veil = smooth(1.18, 2.02, t) * (1 - smooth(2.32, 3.42, t));
    context.save();
    context.fillStyle = `rgba(5, 2, 7, ${veil * .62})`;
    context.fillRect(0, 0, width, height);
    context.restore();

    const anchors: readonly Point[] = compact
      ? [[.5, .47], [.22, .22], [.78, .2], [.18, .52], [.82, .5], [.27, .78], [.74, .79], [.5, .14], [.5, .84], [.06, .35], [.94, .66], [.5, .58]]
      : [[.5, .48], [.23, .23], [.77, .21], [.18, .51], [.82, .49], [.27, .77], [.74, .79], [.5, .14], [.5, .85], [.06, .3], [.94, .7], [.34, .43], [.67, .42], [.37, .65], [.64, .66], [.1, .86], [.9, .13], [.5, .58]];

    foregroundBats.forEach((seed, index) => {
      const start = .72 + seed.a * .38;
      const travel = easeOut(smooth(start, 2.06 + seed.d * .3, t));
      if (travel <= .001) return;
      const anchor = anchors[index % anchors.length];
      const arc = Math.sin(travel * Math.PI) * unit * (seed.e - .5) * .24;
      const x = lerp(focus.x + (seed.b - .5) * unit * .035, width * anchor[0], travel) + arc;
      const y = lerp(focus.y + (seed.c - .5) * unit * .05, height * anchor[1], travel) - Math.abs(arc) * .22;
      const hero = index < 2;
      const heroSize = index === 0 ? (compact ? .62 : .66) : (compact ? .5 : .54);
      const size = unit * lerp(.018, hero ? heroSize : .17 + seed.c * .2, travel);
      const dx = width * anchor[0] - focus.x;
      const dy = height * anchor[1] - focus.y;
      const turn = clamp(Math.atan2(dy, dx), -.52, .52) + Math.sin(t * 1.7 + seed.a * 9) * .06;
      context.save();
      if (!compact && (hero || index < 3)) context.filter = `blur(${lerp(0, hero ? 2.8 : 1.2, travel)}px)`;
      batShape(x, y, size, turn, t * (8.7 + seed.d * 3.2) + seed.e * 8, amount * (.76 + seed.c * .24), seed.c, true);
      context.restore();
    });
  }

  function drawStars(t: number) {
    const night = smooth(SCENE.night.in, SCENE.night.full, t)
      * (1 - smooth(SCENE.stars.out - 2.2, SCENE.stars.out, t));
    const mainFade = smooth(SCENE.stars.in, SCENE.stars.in + 2.75, t)
      * (1 - smooth(SCENE.stars.out - 3.25, SCENE.stars.out, t));
    if (night <= .001 && mainFade <= .001) return;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, `rgba(8, 13, 35, ${night * .97})`);
    sky.addColorStop(.52, `rgba(16, 10, 31, ${night * .9})`);
    sky.addColorStop(1, `rgba(38, 7, 27, ${night * .5})`);
    context.fillStyle = sky; context.fillRect(0, 0, width, height);
    context.save(); context.globalCompositeOperation = "screen";
    stars.forEach((star, index) => {
      const distant = index % 13 === 0 ? night * .14 : 0;
      const perStar = smooth(
        SCENE.stars.in + seeded(index, 226) * 2.2,
        SCENE.stars.in + 1.1 + seeded(index, 226) * 2.6,
        t,
      );
      const fade = Math.max(distant, mainFade * perStar);
      if (fade <= .001) return;
      const { x, y } = starPosition(star, t);
      const shine = .26 + (Math.sin(t * (1.1 + star.hue) + star.twinkle) + 1) * .2;
      context.fillStyle = star.hue > .7 ? `rgba(247, 205, 173, ${fade * shine})` : `rgba(205, 226, 255, ${fade * shine})`;
      context.beginPath(); context.arc(x, y, star.r * (1 + shine), 0, TAU); context.fill();
      if (index % 23 === 0) {
        const ray = (3 + shine * 7) * fade;
        context.strokeStyle = star.hue > .7 ? `rgba(255, 219, 180, ${fade * (.22 + shine * .3)})` : `rgba(220, 237, 255, ${fade * (.18 + shine * .28)})`;
        context.lineWidth = .65;
        context.beginPath(); context.moveTo(x - ray, y); context.lineTo(x + ray, y); context.moveTo(x, y - ray); context.lineTo(x, y + ray); context.stroke();
      }
    });
    context.restore();
  }

  function drawMeteorShowers(t: number) {
    let hasActiveMeteor = false;
    for (const meteor of meteors) {
      if (t >= meteor.start && t <= meteor.start + meteor.duration) {
        hasActiveMeteor = true;
        break;
      }
    }
    if (!hasActiveMeteor) return;
    const focus = sceneFocus(t);
    const unit = focus.unit;
    context.save();
    context.globalCompositeOperation = "screen";

    meteors.forEach((meteor) => {
      if (t < meteor.start || t > meteor.start + meteor.duration) return;
      const progress = clamp((t - meteor.start) / meteor.duration);
      const visibility = smooth(0, .09, progress) * (1 - smooth(.82, 1, progress));
      if (visibility <= .001) return;
      const direction = meteor.endX > meteor.startX ? 1 : -1;
      let startX = meteor.startX * width;
      let startY = meteor.startY * height;
      let endX = meteor.endX * width;
      let endY = meteor.endY * height;

      if (meteor.targetImage >= 0) {
        const pose = memoryFramePose(t, meteor.targetImage, photos[meteor.targetImage % photos.length]);
        const crossingX = pose.x + Math.cos(meteor.phase) * pose.width * .2;
        const crossingY = pose.y + Math.sin(meteor.phase * 1.3) * pose.height * .18;
        const verticalTravel = unit * (.22 + meteor.depth * .18);
        startX = direction > 0 ? -unit * .22 : width + unit * .22;
        endX = direction > 0 ? width + unit * .22 : -unit * .22;
        startY = crossingY - verticalTravel * .54;
        endY = crossingY + verticalTravel * .46;

        // Supporting meteors converge near the incoming image rather than all
        // cutting through its face. The first meteor is the editorial wipe;
        // the rest form a lighter fan around it.
        if (!meteor.hero) {
          const offset = Math.sin(meteor.phase) * pose.height * .28;
          startY += offset;
          endY += offset;
          const centreBias = (crossingX - (startX + endX) * .5) * .08;
          startX += centreBias;
          endX += centreBias;
        }
      } else if (meteor.start >= SCENE.thanks.in) {
        // Finale meteors stay in the upper sky so the assembled dust letters
        // remain readable and retain a calm, dark centre.
        startY = (-.08 + (Math.sin(meteor.phase) + 1) * .09) * height;
        endY = startY + height * (.13 + meteor.depth * .11);
      }

      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const normalX = -dy / distance;
      const normalY = dx / distance;
      const curve = Math.sin(progress * Math.PI) * meteor.bend * unit;
      const curveVelocity = Math.cos(progress * Math.PI) * Math.PI * meteor.bend * unit;
      const x = lerp(startX, endX, progress) + normalX * curve;
      const y = lerp(startY, endY, progress) + normalY * curve;
      const velocityX = dx + normalX * curveVelocity;
      const velocityY = dy + normalY * curveVelocity;
      const angle = Math.atan2(velocityY, velocityX);
      const tailLength = unit * (.1 + meteor.depth * .22) * (meteor.hero ? 1.12 : 1);
      const trailHeight = 5 + meteor.depth * 13 + (meteor.hero ? 4 : 0);
      const alpha = visibility * meteor.strength * (.26 + meteor.depth * .6);
      const sprite = meteorSprites[meteor.tone % meteorSprites.length];

      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.globalAlpha = alpha;
      // The cached sprite contains its glow and colour falloff; scaling one
      // bitmap is far cheaper than constructing gradients for every meteor.
      const spriteWidth = tailLength / .949;
      context.drawImage(sprite, -tailLength, -trailHeight * .5, spriteWidth, trailHeight);

      if (meteor.hero) {
        // Three detached fragments give the closest meteor a photographic
        // shutter-trail without applying blur to the entire canvas.
        for (let spark = 1; spark <= 3; spark += 1) {
          const lag = tailLength * (.2 + spark * .19);
          const lift = Math.sin(t * 1.15 + meteor.phase + spark) * trailHeight * .24;
          context.globalAlpha = alpha * (.18 + spark * .06);
          context.fillStyle = spark === 2 ? "#d9eaff" : "#ffd8b4";
          context.beginPath();
          context.arc(-lag, lift, .55 + meteor.depth * .48, 0, TAU);
          context.fill();
        }

        const ray = 3.2 + meteor.depth * 4.4;
        context.globalAlpha = alpha * (.52 + Math.sin(t * 1.3 + meteor.phase) * .1);
        context.strokeStyle = "#fff5df";
        context.lineWidth = .7;
        context.beginPath();
        context.moveTo(-ray, 0); context.lineTo(ray, 0);
        context.moveTo(0, -ray); context.lineTo(0, ray);
        context.stroke();
      }
      context.restore();
    });
    context.restore();
  }

  // The last petals do not simply disappear when the sky arrives: their
  // highlights climb upward and become a small, warm subset of the starfield.
  // It gives the vortex a destination and makes the later constellations feel
  // earned rather than introduced as a new screen.
  function drawPetalStardustBridge(t: number) {
    const appear = smooth(SCENE.vortex.in + 4.25, SCENE.stars.in + .7, t);
    const fade = 1 - smooth(SCENE.zodiac.in + .1, SCENE.zodiac.in + 3.7, t);
    const amount = appear * fade;
    if (amount <= .001) return;
    const focus = sceneFocus(t);
    const unit = focus.unit;
    const originX = focus.x;
    const originY = focus.y;
    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < (compact ? 24 : 42); index += 1) {
      const star = stars[(index * 17 + 9) % stars.length];
      const startAngle = seeded(index, 71) * TAU;
      const startRadius = unit * (.025 + seeded(index, 72) * .13);
      const startX = originX + Math.cos(startAngle) * startRadius;
      const startY = originY + Math.sin(startAngle) * startRadius * .56;
      const target = starPosition(star, t);
      const targetX = target.x;
      const targetY = target.y;
      const travel = easeInOut(smooth(
        SCENE.vortex.in + 5.05 + seeded(index, 74) * 1.7,
        SCENE.zodiac.in - 1.2 + seeded(index, 74) * 1.85,
        t,
      ));
      const x = lerp(startX, targetX, travel);
      const y = lerp(startY, targetY, travel) - Math.sin(travel * Math.PI) * unit * (.024 + seeded(index, 75) * .062);
      const tail = Math.min(1, travel * 1.8) * amount;
      context.globalAlpha = amount * (.2 + seeded(index, 76) * .32);
      context.strokeStyle = index % 4 ? "rgba(241, 171, 131, .8)" : "rgba(205, 226, 255, .8)";
      context.lineWidth = .55 + seeded(index, 77) * .45;
      context.beginPath();
      context.moveTo(lerp(startX, x, Math.max(0, travel - .1)), lerp(startY, y, Math.max(0, travel - .1)) + tail * unit * .015);
      context.lineTo(x, y);
      context.stroke();
      context.globalAlpha = amount * (.34 + seeded(index, 78) * .45);
      context.fillStyle = index % 4 ? "#ffd9b8" : "#d9eaff";
      context.beginPath(); context.arc(x, y, .8 + seeded(index, 79) * 1.35, 0, TAU); context.fill();
    }
    context.restore();
  }

  function drawZodiacAura(t: number, alpha: number) {
    if (alpha <= .001) return;
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";
    (["virgo", "capricorn"] as const).forEach((name, group) => {
      const layout = constellationLayout(name, t);
      for (let index = 0; index < 2; index += 1) {
        const turn = t * (.048 + index * .01) + index * 1.47 + group * .8;
        const radius = layout.scale * (.3 + index * .09);
        context.globalAlpha = alpha * (.038 - index * .009);
        context.strokeStyle = index === 1 ? "#d5a879" : "#b9d3ff";
        context.lineWidth = .6 + index * .15;
        context.beginPath();
        context.ellipse(layout.x, layout.y, radius, radius * (.42 + index * .04), turn, .35, Math.PI * 1.22);
        context.stroke();
      }
    });
    context.restore();
  }

  function constellation(t: number, name: ConstellationName, points: readonly Point[], alpha: number, delay: number) {
    const reveal = smooth(delay, delay + 3.9, t);
    if (reveal <= .001 || alpha <= .001) return;
    const position = (point: Point) => constellationPosition(name, point, t);
    context.save(); context.globalCompositeOperation = "screen";
    const pathProgress = (points.length - 1) * reveal;
    const completeSegments = Math.floor(pathProgress);
    const segmentProgress = pathProgress - completeSegments;
    context.strokeStyle = `rgba(214, 230, 255, ${alpha * .62})`; context.lineWidth = 1;
    context.beginPath();
    const first = position(points[0]);
    context.moveTo(first.x, first.y);
    for (let index = 1; index <= completeSegments; index += 1) {
      const point = points[index];
      if (!point) continue;
      const next = position(point);
      context.lineTo(next.x, next.y);
    }
    if (completeSegments < points.length - 1 && segmentProgress > .001) {
      const from = position(points[completeSegments]);
      const to = position(points[completeSegments + 1]);
      context.lineTo(lerp(from.x, to.x, segmentProgress), lerp(from.y, to.y, segmentProgress));
    }
    context.stroke();
    points.forEach((point, index) => {
      const appear = smooth(delay + index * .28, delay + index * .28 + .8, t) * alpha;
      if (appear <= .001) return;
      const { x, y } = position(point); const radius = 2.1 + (index % 3) * .7;
      context.shadowColor = "rgba(255, 198, 157, .9)"; context.shadowBlur = 12;
      context.fillStyle = `rgba(255, 232, 197, ${appear})`; context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fill();
    });
    context.restore();
  }

  function drawConstellations(t: number) {
    const reveal = smooth(SCENE.zodiac.in, SCENE.zodiac.in + 3.8, t)
      * (1 - smooth(SCENE.zodiac.out - 2.9, SCENE.zodiac.out, t));
    // Once photographs arrive the constellations retreat into the sky rather
    // than competing with faces, but they never disappear between slides.
    const memoryVeil = smooth(SCENE.memories.in - .5, SCENE.memories.in + 2.2, t)
      * (1 - smooth(SCENE.dissolve.out - 1.2, SCENE.dissolve.out + .7, t));
    // When the final wording begins, they recede into a barely-there horizon
    // so the eye can read the word before returning to the sky.
    const thanksVeil = smooth(SCENE.thanks.in - .3, SCENE.thanks.in + 1.35, t);
    const alpha = reveal * lerp(1, .13, memoryVeil) * lerp(1, .14, thanksVeil);
    drawZodiacAura(t, alpha);
    constellation(t, "virgo", VIRGO, alpha, SCENE.zodiac.in + .18);
    constellation(t, "capricorn", CAPRICORN, alpha, SCENE.zodiac.in + 3.45);
  }

  function drawImageCover(image: HTMLImageElement, x: number, y: number, cardW: number, cardH: number, zoom = 1) {
    const focalX = clamp(Number(image.dataset.focalX ?? .5));
    const focalY = clamp(Number(image.dataset.focalY ?? .5));
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = cardW / cardH;
    let sw = image.naturalWidth / zoom; let sh = image.naturalHeight / zoom;
    if (sourceRatio > targetRatio) sw = sh * targetRatio;
    else sh = sw / targetRatio;
    const sx = clamp(focalX * image.naturalWidth - sw / 2, 0, image.naturalWidth - sw);
    const sy = clamp(focalY * image.naturalHeight - sh / 2, 0, image.naturalHeight - sh);
    context.drawImage(image, sx, sy, sw, sh, x, y, cardW, cardH);
  }

  function memoryLobePath(lobeW: number, lobeH: number) {
    context.beginPath();
    context.moveTo(-lobeW * .43, lobeH * .16);
    context.bezierCurveTo(-lobeW * .49, -lobeH * .12, -lobeW * .24, -lobeH * .53, lobeW * .05, -lobeH * .51);
    context.bezierCurveTo(lobeW * .37, -lobeH * .48, lobeW * .51, -lobeH * .12, lobeW * .38, lobeH * .17);
    context.bezierCurveTo(lobeW * .24, lobeH * .43, -lobeW * .12, lobeH * .54, -lobeW * .43, lobeH * .16);
    context.closePath();
  }

  function getMemoryLobePose(index: number, t: number, chapter: number, image?: HTMLImageElement): MemoryLobePose {
    const focus = sceneFocus(t);
    const unit = focus.unit;
    const start = SCENE.memories.chapterStarts[chapter];
    const nextStart = SCENE.memories.chapterStarts[chapter + 1] ?? SCENE.memories.out;
    const direction = chapter % 2 ? -1 : 1;
    const open = smooth(start, start + .88, t) * (1 - smooth(nextStart - .78, nextStart, t));
    const bud = chapter === 3 ? smooth(SCENE.dissolve.in, SCENE.memories.out, t) : 0;
    const angle = index / 4 * TAU + (t - start) * .095 * direction + chapter * .47 - Math.PI * .5;
    const depth = .5 + Math.cos(angle) * .5;
    const orbitXBase = compact ? unit * .18 : unit * (chapter === 2 ? .15 : .255);
    const orbitYBase = compact ? unit * .15 : unit * (chapter === 2 ? .225 : .12);
    const orbit = open * (1 - bud * .82);
    const ratio = image?.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 1;
    const ratioMix = clamp((clamp(ratio, .72, 1.42) - .72) / .7);
    const lobeH = unit * lerp(compact ? .37 : .29, compact ? .57 : .53, depth) * lerp(.72, 1, open) * (1 - bud * .12);
    const lobeW = lobeH * lerp(.66, .92, ratioMix);
    return {
      x: focus.x + Math.cos(angle) * orbitXBase * orbit,
      y: focus.y + Math.sin(angle) * orbitYBase * orbit,
      width: lobeW,
      height: lobeH,
      // The aperture rotates, but the memories themselves remain almost
      // upright. Full quarter-turns made faces read like loose cards caught
      // in a spinner rather than photographs held by a living flower.
      turn: Math.sin(angle) * .105
        + direction * (index % 2 ? .028 : -.028)
        + Math.sin(t * .18 + index * 1.7) * .018,
      depth,
    };
  }

  function drawMemoryLobe(image: HTMLImageElement, pose: MemoryLobePose, opacity: number, t: number, chapter: number) {
    if (!image.naturalWidth || opacity <= .004) return;
    context.save();
    context.translate(pose.x, pose.y); context.rotate(pose.turn);
    context.globalAlpha = opacity;
    if (pose.depth > .72) {
      context.shadowColor = "rgba(0, 0, 0, .64)";
      context.shadowBlur = compact ? 10 : 16;
      context.shadowOffsetY = compact ? 5 : 8;
    }
    memoryLobePath(pose.width, pose.height);
    context.fillStyle = "#160810"; context.fill();
    context.shadowBlur = 0; context.shadowOffsetY = 0;
    memoryLobePath(pose.width, pose.height); context.clip();
    drawImageCover(image, -pose.width / 2, -pose.height / 2, pose.width, pose.height, 1.035 + pose.depth * .025);
    const grade = context.createLinearGradient(-pose.width * .45, -pose.height * .48, pose.width * .44, pose.height * .48);
    grade.addColorStop(0, `rgba(255, 228, 191, ${.12 + pose.depth * .08})`);
    grade.addColorStop(.34, "rgba(255, 230, 200, 0)");
    grade.addColorStop(.78, `rgba(91, 8, 35, ${.13 + (1 - pose.depth) * .2})`);
    grade.addColorStop(1, "rgba(15, 2, 10, .26)");
    context.fillStyle = grade; context.fillRect(-pose.width / 2, -pose.height / 2, pose.width, pose.height);
    context.restore();

    context.save();
    context.translate(pose.x, pose.y); context.rotate(pose.turn);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = opacity * (.25 + pose.depth * .42);
    memoryLobePath(pose.width, pose.height);
    context.strokeStyle = pose.depth > .7 ? "rgba(255, 211, 170, .78)" : "rgba(196, 76, 104, .38)";
    context.lineWidth = pose.depth > .7 ? 1.15 : .7; context.stroke();
    if (pose.depth > .68) {
      const glint = 2.4 + (Math.sin(t * 1.8 + chapter * 1.7) + 1) * 2;
      const gx = pose.width * .05; const gy = -pose.height * .49;
      context.strokeStyle = "rgba(255, 226, 184, .96)";
      context.beginPath(); context.moveTo(gx - glint, gy); context.lineTo(gx + glint, gy); context.moveTo(gx, gy - glint); context.lineTo(gx, gy + glint); context.stroke();
    }
    context.restore();
  }

  function drawGlimpseIris(t: number) {
    if (!glimpses.length) return;
    const boundaries = [SCENE.memories.in, ...SCENE.memories.chapterStarts.slice(1)] as number[];
    let closest = 0; let distance = Number.POSITIVE_INFINITY;
    boundaries.forEach((boundary, index) => {
      const nextDistance = Math.abs(t - boundary);
      if (nextDistance < distance) { closest = index; distance = nextDistance; }
    });
    const amount = 1 - smooth(.15, 1.55, distance);
    const image = glimpses[closest % glimpses.length];
    if (!image?.naturalWidth || amount <= .002) return;
    const focus = sceneFocus(t);
    const radius = focus.unit * lerp(.11, compact ? .265 : .285, easeOut(amount));

    context.save();
    const transitionGlow = context.createRadialGradient(focus.x, focus.y, radius * .06, focus.x, focus.y, radius * 2.0);
    transitionGlow.addColorStop(0, `rgba(255, 198, 140, ${amount * .12})`);
    transitionGlow.addColorStop(.28, `rgba(196, 45, 72, ${amount * .22})`);
    transitionGlow.addColorStop(.52, `rgba(105, 18, 48, ${amount * .16})`);
    transitionGlow.addColorStop(1, "rgba(31, 5, 23, 0)");
    context.fillStyle = transitionGlow;
    context.fillRect(0, 0, width, height);
    context.restore();

    // A six-blade crimson aperture grows around the incoming memory. It hides
    // the chapter swap with an object that belongs to the film instead of a
    // generic cross-fade or an empty pause between photo groups.
    context.save();
    context.translate(focus.x, focus.y);
    context.globalCompositeOperation = "source-over";
    for (let blade = 0; blade < 6; blade += 1) {
      context.save();
      context.rotate(blade / 6 * TAU + t * .035);
      context.translate(0, -radius * .72);
      context.rotate(Math.PI * .5);
      context.scale(radius * .74, radius * .94);
      context.globalAlpha = amount * (.16 + blade % 2 * .035);
      context.fillStyle = blade % 2 ? "#b92c49" : "#68142d";
      paintPetalPath(context);
      context.fill();
      context.restore();
    }
    context.restore();

    context.save();
    context.translate(focus.x, focus.y);
    context.globalAlpha = amount * .9;
    context.beginPath(); context.ellipse(0, 0, radius, radius * .72, t * .025, 0, TAU); context.clip();
    drawImageCover(image, -radius, -radius * .72, radius * 2, radius * 1.44, 1.06);
    const shade = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    shade.addColorStop(0, "rgba(255, 218, 181, .04)"); shade.addColorStop(.7, "rgba(77, 8, 31, .24)"); shade.addColorStop(1, "rgba(8, 2, 8, .72)");
    context.fillStyle = shade; context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
    context.save(); context.translate(focus.x, focus.y); context.globalCompositeOperation = "screen";
    for (let blade = 0; blade < 6; blade += 1) {
      const angle = blade / 6 * TAU + t * .06;
      context.globalAlpha = amount * (.18 + blade * .018);
      context.strokeStyle = blade % 2 ? "#c53a50" : "#e0ad77"; context.lineWidth = .8;
      context.beginPath(); context.ellipse(0, 0, radius * (1.08 + blade * .055), radius * (.53 + blade * .022), angle, .12, Math.PI * 1.04); context.stroke();
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * TAU + t * .11;
      const orbit = radius * (1.08 + seeded(index, 203) * .38);
      const gx = Math.cos(angle) * orbit;
      const gy = Math.sin(angle) * orbit * .68;
      const twinkle = .25 + (Math.sin(t * (1.5 + seeded(index, 204)) + index * 1.7) + 1) * .28;
      const ray = 1.4 + seeded(index, 205) * 2.7;
      context.globalAlpha = amount * twinkle;
      context.strokeStyle = index % 3 ? "#ffd7aa" : "#d7e8ff";
      context.lineWidth = .6;
      context.beginPath();
      context.moveTo(gx - ray, gy); context.lineTo(gx + ray, gy);
      context.moveTo(gx, gy - ray); context.lineTo(gx, gy + ray);
      context.stroke();
    }
    context.restore();
  }

  function drawMemories(t: number) {
    if (!photos.length || t < SCENE.memories.in - .9 || t > SCENE.memories.out + .3) return;
    drawGlimpseIris(t);
    let chapter = 0;
    SCENE.memories.chapterStarts.forEach((start, index) => { if (t >= start) chapter = index; });
    const start = SCENE.memories.chapterStarts[chapter];
    const end = SCENE.memories.chapterStarts[chapter + 1] ?? SCENE.memories.out;
    // Give the central rose-iris a clean beat of its own. Letting the four
    // lobes arrive immediately placed two different faces on top of each
    // other at every chapter boundary and weakened the transition.
    const chapterAlpha = smooth(start + .94, start + 1.46, t) * (1 - smooth(end - .76, end, t));
    if (chapterAlpha <= .002) return;
    const lobes = Array.from({ length: 4 }, (_, index) => {
      const image = photos[(chapter * 4 + index) % photos.length];
      return image ? { image, pose: getMemoryLobePose(index, t, chapter, image), index } : null;
    }).filter((entry): entry is { image: HTMLImageElement; pose: MemoryLobePose; index: number } => Boolean(entry));
    lobes.sort((one, two) => one.pose.depth - two.pose.depth).forEach(({ image, pose, index }) => {
      const stagger = smooth(start + index * .07, start + .55 + index * .07, t);
      drawMemoryLobe(image, pose, chapterAlpha * stagger * (.38 + pose.depth * .62), t, chapter);
    });

    // Sparse dew-like highlights keep the dark chapters romantic without
    // turning the photographs into another particle field.
    const focus = sceneFocus(t);
    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < (compact ? 5 : 7); index += 1) {
      const angle = index / (compact ? 5 : 7) * TAU + t * .045 + chapter * .61;
      const orbit = focus.unit * (.19 + seeded(index + chapter * 7, 211) * .13);
      const x = focus.x + Math.cos(angle) * orbit;
      const y = focus.y + Math.sin(angle) * orbit * .55;
      const twinkle = .22 + (Math.sin(t * 1.7 + index * 2.1) + 1) * .22;
      const ray = 1.2 + seeded(index, 212) * 2.2;
      context.globalAlpha = chapterAlpha * twinkle;
      context.strokeStyle = index % 3 ? "#f2b37f" : "#d8e8ff";
      context.lineWidth = .55;
      context.beginPath(); context.moveTo(x - ray, y); context.lineTo(x + ray, y); context.moveTo(x, y - ray); context.lineTo(x, y + ray); context.stroke();
    }
    context.restore();
  }

  // The earlier rose-iris placed four photos on screen at once. This second
  // pass treats every memory as a single film frame developed by starlight:
  // five curved pieces arrive one after another, meet without a grid, then
  // peel away to reveal the next photograph.
  function memoryFramePose(t: number, imageIndex = 0, image?: HTMLImageElement): MemoryFramePose {
    const focus = sceneFocus(t);
    const chapter = Math.floor(imageIndex / 4);
    const mirror = chapter % 2 ? -1 : 1;
    // One hero and three lunar fragments share the sky without sitting behind
    // each other. Values are bounded by the optical unit, so the composition
    // remains stable across landscape displays and narrow phones.
    const arrangement = focus.portrait ? [
      [0, -.16, .86, .72, -.006],
      [-.32, .35, .27, .27, -.015],
      [0, .39, .27, .27, .008],
      [.32, .35, .27, .27, -.012],
    ] as const : [
      [-.155, -.02, .6, .58, -.012],
      [.305, -.255, .34, .265, .02],
      [.335, .06, .3, .275, -.014],
      [-.285, .31, .34, .235, .012],
    ] as const;
    const [offsetX, offsetY, maxWidth, maxHeight, turn] = arrangement[imageIndex % arrangement.length];
    let poseWidth = focus.unit * maxWidth;
    let poseHeight = focus.unit * maxHeight;
    if (image?.naturalWidth && image.naturalHeight) {
      // Preserve the real 9:16 portrait sources. The previous .68 floor
      // removed roughly one fifth of cinema-07 / cinema-16 before masking.
      const sourceRatio = clamp(image.naturalWidth / image.naturalHeight, .56, 1.56);
      const boxRatio = poseWidth / poseHeight;
      if (sourceRatio > boxRatio) poseHeight = poseWidth / sourceRatio;
      else poseWidth = poseHeight * sourceRatio;
    }
    return {
      // Alternating the cluster left/right gives every chapter a new camera
      // composition without inventing another transition language.
      x: focus.x + focus.unit * offsetX * mirror,
      y: focus.y + focus.unit * offsetY,
      width: poseWidth,
      height: poseHeight,
      turn: turn * mirror + Math.sin(t * .14 + imageIndex * .83) * .006,
      // Scale, placement, and light establish hierarchy. Keeping the aperture
      // open prevents circular/petal masks from cutting faces in small photos.
      shape: "hero",
    };
  }

  function memoryFramePath(pose: MemoryFramePose) {
    const x = pose.x - pose.width / 2;
    const y = pose.y - pose.height / 2;
    const radius = Math.min(pose.width, pose.height) * .075;
    if (pose.shape === "moon") {
      context.beginPath();
      context.ellipse(pose.x, pose.y, pose.width * .5, pose.height * .5, 0, 0, TAU);
      context.closePath();
      return;
    }
    if (pose.shape === "petal") {
      context.beginPath();
      context.moveTo(x + pose.width * .08, y + pose.height * .54);
      context.bezierCurveTo(
        x + pose.width * .1, y + pose.height * .16,
        x + pose.width * .48, y + pose.height * .02,
        x + pose.width * .9, y + pose.height * .18,
      );
      context.bezierCurveTo(
        x + pose.width * .99, y + pose.height * .47,
        x + pose.width * .77, y + pose.height * .88,
        x + pose.width * .28, y + pose.height * .96,
      );
      context.bezierCurveTo(
        x + pose.width * .08, y + pose.height * .87,
        x + pose.width * .025, y + pose.height * .67,
        x + pose.width * .08, y + pose.height * .54,
      );
      context.closePath();
      return;
    }
    context.beginPath();
    // A continuous, gently imperfect film aperture. The old centre notches
    // made the frame look torn and produced sharp black wedges while a second
    // photograph was still developing.
    context.moveTo(x + radius, y + radius * .18);
    context.bezierCurveTo(
      x + pose.width * .24, y + radius * .035,
      x + pose.width * .42, y + radius * .18,
      x + pose.width * .58, y + radius * .04,
    );
    context.bezierCurveTo(
      x + pose.width * .77, y + radius * .025,
      x + pose.width - radius * .18, y + radius * .1,
      x + pose.width, y + radius,
    );
    context.lineTo(x + pose.width, y + pose.height - radius);
    context.quadraticCurveTo(x + pose.width, y + pose.height, x + pose.width - radius, y + pose.height);
    context.bezierCurveTo(
      x + pose.width * .72, y + pose.height - radius * .025,
      x + pose.width * .56, y + pose.height - radius * .12,
      x + pose.width * .38, y + pose.height + radius * .02,
    );
    context.bezierCurveTo(
      x + pose.width * .22, y + pose.height - radius * .035,
      x + radius * .18, y + pose.height - radius * .08,
      x, y + pose.height - radius,
    );
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y + radius * .25, x + radius, y + radius * .18);
    context.closePath();
  }

  function memorySurface(image: HTMLImageElement, pose: MemoryFramePose) {
    // Keep the canvas cache below a predictable memory ceiling on 4K screens.
    // The source is graded once, then smoothly scaled by the main renderer.
    const surfaceScale = Math.min(1, Math.sqrt(720_000 / Math.max(1, pose.width * pose.height)));
    const surfaceWidth = Math.max(1, Math.round(pose.width * surfaceScale));
    const surfaceHeight = Math.max(1, Math.round(pose.height * surfaceScale));
    const source = image.currentSrc || image.src;
    const cached = memorySurfaceCache.get(image);
    if (cached && cached.width === surfaceWidth && cached.height === surfaceHeight && cached.source === source) {
      return cached.surface;
    }
    const surface = document.createElement("canvas");
    surface.width = surfaceWidth; surface.height = surfaceHeight;
    const painter = surface.getContext("2d", { alpha: false });
    if (!painter) return surface;
    painter.imageSmoothingEnabled = true; painter.imageSmoothingQuality = "high";
    const focalX = clamp(Number(image.dataset.focalX ?? .5));
    const focalY = clamp(Number(image.dataset.focalY ?? .5));
    const zoom = 1.018;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = surfaceWidth / surfaceHeight;
    let sw = image.naturalWidth / zoom; let sh = image.naturalHeight / zoom;
    if (sourceRatio > targetRatio) sw = sh * targetRatio;
    else sh = sw / targetRatio;
    const sx = clamp(focalX * image.naturalWidth - sw / 2, 0, image.naturalWidth - sw);
    const sy = clamp(focalY * image.naturalHeight - sh / 2, 0, image.naturalHeight - sh);
    painter.drawImage(image, sx, sy, sw, sh, 0, 0, surfaceWidth, surfaceHeight);
    const grade = painter.createLinearGradient(surfaceWidth * .05, surfaceHeight * .02, surfaceWidth * .95, surfaceHeight * .98);
    grade.addColorStop(0, "rgba(230, 239, 255, .13)");
    grade.addColorStop(.3, "rgba(255, 226, 188, .045)");
    grade.addColorStop(.78, "rgba(93, 8, 35, .13)");
    grade.addColorStop(1, "rgba(11, 2, 15, .25)");
    painter.fillStyle = grade; painter.fillRect(0, 0, surfaceWidth, surfaceHeight);

    // The grade is baked into the cached surface: a cool moonlit shoulder and
    // a soft edge vignette give every source image the same nocturnal film
    // language without paying for filters on every animation frame.
    painter.globalCompositeOperation = "screen";
    const moon = painter.createRadialGradient(
      surfaceWidth * .24, surfaceHeight * .12, 0,
      surfaceWidth * .24, surfaceHeight * .12, Math.max(surfaceWidth, surfaceHeight) * .78,
    );
    moon.addColorStop(0, "rgba(213, 231, 255, .11)");
    moon.addColorStop(.42, "rgba(246, 210, 178, .035)");
    moon.addColorStop(1, "rgba(255, 255, 255, 0)");
    painter.fillStyle = moon; painter.fillRect(0, 0, surfaceWidth, surfaceHeight);
    painter.globalCompositeOperation = "source-over";
    const vignetteGrade = painter.createRadialGradient(
      surfaceWidth * .5, surfaceHeight * .44, Math.min(surfaceWidth, surfaceHeight) * .2,
      surfaceWidth * .5, surfaceHeight * .44, Math.max(surfaceWidth, surfaceHeight) * .72,
    );
    vignetteGrade.addColorStop(.48, "rgba(7, 5, 18, 0)");
    vignetteGrade.addColorStop(.8, "rgba(9, 4, 17, .08)");
    vignetteGrade.addColorStop(1, "rgba(7, 2, 12, .32)");
    painter.fillStyle = vignetteGrade; painter.fillRect(0, 0, surfaceWidth, surfaceHeight);
    memorySurfaceCache.set(image, { surface, width: surfaceWidth, height: surfaceHeight, source });
    return surface;
  }

  function watercolorBrushPath(pose: MemoryFramePose, strokeIndex: number, progress: number) {
    const s = MEMORY_BRUSH_SWEEPS[strokeIndex % MEMORY_BRUSH_SWEEPS.length];
    const cx = pose.x - pose.width / 2 + pose.width * (0.5 + s.cx);
    const cy = pose.y - pose.height / 2 + pose.height * (0.5 + s.cy);

    // Stroke sweeps from startX to endX
    const fullLen = pose.width * s.len * 0.5;
    const startX = cx - Math.cos(s.a) * fullLen * s.dir;
    const startY = cy - Math.sin(s.a) * fullLen * s.dir;
    const endX = cx + Math.cos(s.a) * fullLen * s.dir;
    const endY = cy + Math.sin(s.a) * fullLen * s.dir;

    const currentX = lerp(startX, endX, progress * 0.5);
    const currentY = lerp(startY, endY, progress * 0.5);
    const currentLen = Math.max(0.1, fullLen * progress);
    const currentThick = Math.max(0.1, pose.height * s.thick * (0.3 + 0.7 * progress));

    // One continuous emulsion band is enough. The previous satellite ovals
    // made a clover / letter-B silhouette that looked like broken image data,
    // even after their connector artefacts were removed.
    context.beginPath();
    context.ellipse(currentX, currentY, currentLen, currentThick, s.a, 0, TAU);
  }

  function drawMemoryBrushStroke(
    image: HTMLImageElement,
    pose: MemoryFramePose,
    strokeIndex: number,
    enter: number,
    leave: number,
    age = 0,
    slotDuration = 1,
    wet = true,
    strength = 1,
  ) {
    if (!image.naturalWidth || enter <= .001) return;

    // Brush strokes sweep across the paper. The sweeping motion continues even
    // after the stroke has reached full opacity.
    const strokeProgress = enter * (1 - leave * leave * .2);
    const strokeAlpha = enter * (1 - leave * leave) * strength;

    if (strokeAlpha <= .002 || strokeProgress <= .002) return;

    context.save();
    context.translate(pose.x, pose.y);
    context.rotate(pose.turn);
    context.translate(-pose.x, -pose.y);
    context.globalAlpha = strokeAlpha;

    // Clip to the outer photo frame
    memoryFramePath(pose); context.clip();

    // Mask by this specific expanding brush stroke
    watercolorBrushPath(pose, strokeIndex, Math.max(0.01, strokeProgress));
    context.clip();

    // Subtle Ken Burns zoom effect inside the piecewise photo frame
    const kenBurns = 1.0 + (age / slotDuration) * 0.055;
    context.translate(pose.x, pose.y);
    context.scale(kenBurns, kenBurns);
    context.translate(-pose.x, -pose.y);

    const surface = memorySurface(image, pose);
    context.drawImage(surface, pose.x - pose.width / 2, pose.y - pose.height / 2, pose.width, pose.height);
    context.restore();

    // Watercolor wet edge effect for the brush stroke
    const wetEdge = smooth(.15, .8, enter) * (1 - smooth(.2, .9, leave)) * strength;
    if (wet && wetEdge > .01) {
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = wetEdge * .09;
      context.strokeStyle = strokeIndex % 2 ? "#ecd6c0" : "#c96a76";
      context.lineWidth = compact ? .65 : .8;

      context.translate(pose.x, pose.y);
      context.rotate(pose.turn);
      context.translate(-pose.x, -pose.y);

      // Keep the wet edge inside its own projected image. Without this clip
      // the oversized brush ellipses turn into distracting loops across the
      // whole sky whenever several photographs are visible at once.
      memoryFramePath(pose); context.clip();
      watercolorBrushPath(pose, strokeIndex, Math.max(0.01, strokeProgress * 1.03));
      context.stroke();
      context.restore();
    }
  }

  function drawMemoryMoonVeil(t: number) {
    if (t < SCENE.memories.in - .25 || t > SCENE.memories.out + .2) return;
    let chapter = 0;
    SCENE.memories.chapterStarts.forEach((start, index) => { if (t >= start) chapter = index; });
    const start = SCENE.memories.chapterStarts[chapter];
    const end = SCENE.memories.chapterStarts[chapter + 1] ?? SCENE.memories.out;
    const local = t - start;
    const chapterDuration = end - start;
    const focus = sceneFocus(t);

    // One broad silk-light pass belongs to the chapter, not to every image.
    // It creates a poetic exposure change while leaving the sky and faces calm.
    const veil = smooth(-.06, .34, local) * (1 - smooth(1.72, 2.5, local));
    if (veil > .002) {
      const travel = smooth(-.05, 1.95, local);
      const diagonal = Math.atan2(height * .28, width);
      const span = Math.hypot(width, height);
      const band = Math.max(44, focus.unit * .11);
      const x = lerp(-span * .58, span * .58, travel);
      context.save();
      context.translate(focus.x, focus.y);
      context.rotate(diagonal);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = veil;
      const silk = context.createLinearGradient(x - band * 1.8, 0, x + band * 1.8, 0);
      silk.addColorStop(0, "rgba(185, 211, 255, 0)");
      silk.addColorStop(.35, "rgba(204, 225, 255, .025)");
      silk.addColorStop(.5, "rgba(255, 226, 193, .105)");
      silk.addColorStop(.65, "rgba(215, 230, 255, .035)");
      silk.addColorStop(1, "rgba(185, 211, 255, 0)");
      context.fillStyle = silk;
      context.fillRect(-span, -span, span * 2, span * 2);
      context.restore();
    }

    // A nearly still lunar pool keeps three photographs feeling like one
    // composition. It fades before the chapter edit so the meteor can lead the
    // eye into the next memory without a bright cross-fade.
    const atmosphere = smooth(.22, 1.4, local)
      * (1 - smooth(chapterDuration - 1.75, chapterDuration - .35, local));
    if (atmosphere > .002) {
      const driftX = focus.x + Math.sin((local + chapter) * .16) * focus.unit * .045;
      const driftY = focus.y - focus.unit * .025;
      const pool = context.createRadialGradient(
        driftX, driftY, focus.unit * .04,
        driftX, driftY, focus.unit * (compact ? .46 : .57),
      );
      pool.addColorStop(0, `rgba(190, 213, 255, ${atmosphere * .032})`);
      pool.addColorStop(.44, `rgba(122, 63, 111, ${atmosphere * .025})`);
      pool.addColorStop(1, "rgba(44, 12, 47, 0)");
      context.save();
      context.globalCompositeOperation = "screen";
      context.fillStyle = pool;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  }

  function drawMemoryImage(image: HTMLImageElement, imageIndex: number, t: number, age: number, slotDuration: number) {
    // Encrypted assets can finish hydrating after the film has started. Skip
    // this frame instead of caching a black / zero-sized surface; the image is
    // picked up automatically on the next frame after it has decoded.
    if (!image.complete || image.naturalWidth <= 1 || image.naturalHeight <= 1) return;
    const role = imageIndex % 4;
    const isHero = role === 0;
    const enterWindow = Math.min(isHero ? 1.28 : 1.48, slotDuration * .24);
    const basePose = memoryFramePose(t, imageIndex, image);
    const focus = sceneFocus(t);
    const placement = smooth(.08, enterWindow, age);
    const pose: MemoryFramePose = isHero ? {
      ...basePose,
      y: basePose.y + (1 - placement) * focus.unit * .022,
    } : {
      ...basePose,
      x: lerp(focus.x + (basePose.x - focus.x) * .38, basePose.x, placement),
      y: lerp(focus.y + (basePose.y - focus.y) * .38, basePose.y, placement),
    };
    // Supporting memories bow out first. The hero remains alone for the final
    // beat, so the next transition has a clear visual subject to inherit.
    const exitWindow = Math.min(isHero ? 1.08 : 1.52 + role * .12, slotDuration * .3);
    const overall = smooth(.08, enterWindow, age)
      * (1 - smooth(slotDuration - exitWindow, slotDuration - .04, age));
    if (overall <= .002) return;
    const treatment = imageIndex % 4;
    const roleOpacity = isHero ? 1 : compact ? .94 - role * .025 : .95 - role * .025;

    const assembling = smooth(.12, .42, age) * (1 - smooth(1.35, 1.95, age));
    if (assembling > .01 && isHero) {
      context.save();
      context.globalCompositeOperation = "screen";
      context.globalAlpha = assembling * (isHero ? .095 : .055);
      const glow = context.createRadialGradient(pose.x, pose.y, 0, pose.x, pose.y, pose.width * .68);
      glow.addColorStop(0, "rgba(221, 234, 255, .46)");
      glow.addColorStop(.46, "rgba(176, 77, 115, .13)");
      glow.addColorStop(1, "transparent");
      context.fillStyle = glow;
      context.fillRect(pose.x - pose.width * .7, pose.y - pose.height * .7, pose.width * 1.4, pose.height * 1.4);
      context.restore();
    }

    // Four related, but not repetitive, ways for a memory to develop.  The
    // photograph is never a card on a page: it is projected directly into the
    // star field by a ribbon, petal aperture, wet exposure, or comet sweep.
    const strokeCount = isHero ? compact ? 3 : 4 : 0;
    const developed = isHero ? smooth(.5, 1.5, age) : smooth(.22, 1.16, age);
    const brushStrength = isHero ? 1 - smooth(.92, 1.62, age) : 0;
    // A faint whole exposure sits beneath the brush. Individual strokes can
    // now be read as light developing one photograph, not disconnected image
    // fragments appearing over a black sky.
    const underpainting = isHero
      ? smooth(.04, .46, age) * (1 - smooth(.72, 1.42, age)) * overall
      : 0;
    if (underpainting > .002) {
      context.save();
      context.translate(pose.x, pose.y); context.rotate(pose.turn); context.translate(-pose.x, -pose.y);
      memoryFramePath(pose); context.clip();
      context.globalAlpha = underpainting * .3;
      const surface = memorySurface(image, pose);
      context.drawImage(surface, pose.x - pose.width / 2, pose.y - pose.height / 2, pose.width, pose.height);
      context.restore();
    }
    // The expensive multi-stroke reveal only exists while the photograph is
    // developing. Once it is whole we draw one cached surface per frame; this
    // both calms the picture and removes the old 11-draw hot path.
    if (brushStrength > .002) {
      for (let i = 0; i < strokeCount; i += 1) {
        const offset = treatment === 1 ? (strokeCount - 1 - i) : i;
        const stagger = treatment === 2 ? .13 : .16;
        const enter = smooth(.14 + offset * stagger, .72 + offset * (stagger + .08), age);
        const leave = smooth(slotDuration - exitWindow + i * .05, slotDuration - .08 + i * .02, age);
        drawMemoryBrushStroke(
          image,
          pose,
          (i + treatment * 2) % 8,
          enter * overall,
          leave,
          age,
          slotDuration,
          i === 1,
          brushStrength,
        );
      }
    }

    if (developed > .002) {
      context.save();
      context.translate(pose.x, pose.y); context.rotate(pose.turn); context.translate(-pose.x, -pose.y);
      memoryFramePath(pose); context.clip();
      context.globalAlpha = developed * overall * roleOpacity;
      const kenBurns = 1 + age / Math.max(1, slotDuration) * (isHero ? .036 : .022);
      context.translate(pose.x, pose.y); context.scale(kenBurns, kenBurns); context.translate(-pose.x, -pose.y);
      const surface = memorySurface(image, pose);
      const bleedX = pose.width * .012;
      const bleedY = pose.height * .012;
      context.drawImage(
        surface,
        pose.x - pose.width / 2 - bleedX,
        pose.y - pose.height / 2 - bleedY,
        pose.width + bleedX * 2,
        pose.height + bleedY * 2,
      );
      context.restore();

      // One restrained starlight seam replaces the old network-like glow.
      // It sweeps once across the developed image, then leaves the photograph
      // still enough to be read.
      const seamProgress = smooth(1.15, 2.45, age);
      const seam = smooth(1.15, 1.5, age) * (1 - smooth(2.35, 2.72, age));
      if (seam > .002 && isHero) {
        context.save();
        context.translate(pose.x, pose.y); context.rotate(pose.turn); context.translate(-pose.x, -pose.y);
        memoryFramePath(pose); context.clip();
        context.globalCompositeOperation = "screen";
        const seamX = pose.x + (seamProgress - .5) * pose.width * .94;
        const sheen = context.createLinearGradient(seamX - pose.width * .09, 0, seamX + pose.width * .09, 0);
        sheen.addColorStop(0, "rgba(214, 230, 255, 0)");
        sheen.addColorStop(.48, `rgba(255, 224, 189, ${seam * .14})`);
        sheen.addColorStop(.52, `rgba(220, 235, 255, ${seam * .19})`);
        sheen.addColorStop(1, "rgba(214, 230, 255, 0)");
        context.fillStyle = sheen;
        context.fillRect(pose.x - pose.width * .65, pose.y - pose.height * .65, pose.width * 1.3, pose.height * 1.3);

        // Three small stars ride the same developing seam. They make the
        // brush feel made from starlight without adding an unrelated particle
        // cloud over the photograph.
        for (let glint = 0; glint < 2; glint += 1) {
          const gy = pose.y + (glint - .5) * pose.height * .34
            + Math.sin(glint * 2.1 + imageIndex) * pose.height * .035;
          const twinkle = .62 + (Math.sin(t * (1.05 + glint * .16) + imageIndex * .9) + 1) * .18;
          const ray = (1.35 + glint * .55) * twinkle;
        context.globalAlpha = seam * (.27 + glint * .085) * roleOpacity;
          context.strokeStyle = glint === 1 ? "#fff0cf" : "#d9e9ff";
          context.lineWidth = .58;
          context.beginPath();
          context.moveTo(seamX - ray, gy); context.lineTo(seamX + ray, gy);
          context.moveTo(seamX, gy - ray); context.lineTo(seamX, gy + ray);
          context.stroke();
        }
        context.restore();
      }
    }
    const assembled = smooth(.96, Math.min(1.72, slotDuration * .3), age)
      * (1 - smooth(slotDuration - exitWindow, slotDuration - exitWindow * .34, age));
    if (assembled > .002) {
      context.save(); context.translate(pose.x, pose.y); context.rotate(pose.turn); context.translate(-pose.x, -pose.y);
      context.globalCompositeOperation = "screen";
      context.globalAlpha = assembled * (isHero ? .14 : .075) * roleOpacity;
      memoryFramePath(pose);
      context.strokeStyle = isHero ? "rgba(231, 216, 201, .74)" : "rgba(202, 221, 247, .58)";
      context.lineWidth = isHero ? .85 : .65;
      context.stroke();
      context.restore();
    }
  }

  function drawSkySlides(t: number) {
    if (!photos.length || t < SCENE.memories.in - .2 || t > SCENE.memories.out + .15) return;
    let chapter = 0;
    SCENE.memories.chapterStarts.forEach((start, index) => { if (t >= start) chapter = index; });
    const overlap = compact ? .64 : .72;
    const drawChapter = (chapterIndex: number, heroOnly = false) => {
      const start = SCENE.memories.chapterStarts[chapterIndex];
      const naturalEnd = SCENE.memories.chapterStarts[chapterIndex + 1] ?? SCENE.memories.out;
      // The hero always owns the same extended end time, both before and after
      // a boundary. Previously its duration changed at the boundary, so an
      // image faded out and immediately popped back in behind the next slide.
      const heroEnd = chapterIndex < SCENE.memories.chapterStarts.length - 1
        ? naturalEnd + overlap
        : naturalEnd;
      const chapterTime = t - start;
      // The hero establishes the shot, then three fragments settle around it.
      // Their authored poses barely overlap, so drawing them later preserves
      // every photograph without transferring the occlusion onto the hero.
      for (const slot of heroOnly ? [0] : [0, 1, 2, 3]) {
        const imageIndex = chapterIndex * 4 + slot;
        const image = photos[imageIndex % photos.length];
        if (!image) continue;
        const arrive = slot * photoStagger;
        const age = chapterTime - arrive;
        const end = slot === 0 ? heroEnd : naturalEnd;
        const duration = Math.max(.8, end - start - arrive);
        if (age < 0 || age > duration + .12) continue;
        drawMemoryImage(image, imageIndex, t, age, duration);
      }
    };

    // Let the previous hero dissolve underneath the next one. The meteor and
    // moonlight now pass through a real visual hand-off instead of an empty sky.
    const chapterStart = SCENE.memories.chapterStarts[chapter];
    if (chapter > 0 && t < chapterStart + overlap) drawChapter(chapter - 1, true);
    drawChapter(chapter);

  }

  // The memory act is a single nocturnal diary rather than sixteen cards.
  // Each chapter uses a different piece of paper choreography, while the same
  // smoked-leather cover and starlit spine keep the sequence continuous.
  function diaryPose(t: number): DiaryPose {
    const focus = sceneFocus(t);
    const baseWidth = focus.portrait
      ? Math.min(width * .9, height * .66)
      : Math.min(width * .82, height * 1.34);
    const baseHeight = focus.portrait
      ? Math.min(height * .68, baseWidth * 1.35)
      : Math.min(height * .72, baseWidth * .61);
    let chapter = 0;
    SCENE.memories.chapterStarts.forEach((start, index) => { if (t >= start) chapter = index; });
    const chapterStart = SCENE.memories.chapterStarts[chapter];
    const chapterEnd = SCENE.memories.chapterStarts[chapter + 1] ?? SCENE.memories.out;
    const chapterProgress = clamp((t - chapterStart) / Math.max(.001, chapterEnd - chapterStart));
    // This is a small, authored camera drift rather than a perpetual float.
    // It keeps the paper alive while the photographs develop, then settles at
    // each page turn so the next chapter has a clear physical origin.
    const breath = Math.sin(chapterProgress * Math.PI);
    const drifts = [
      [-.012, .006, -.008],
      [.01, -.006, .006],
      [-.008, .008, -.005],
      [.006, -.004, .004],
    ] as const;
    const [driftX, driftY, driftTurn] = drifts[chapter] ?? drifts[0];
    const diaryWidth = baseWidth * (1 + breath * .012);
    const diaryHeight = baseHeight * (1 + breath * .012);
    return {
      x: focus.x + baseWidth * driftX * breath,
      y: focus.y + (focus.portrait ? focus.unit * .012 : 0) + baseHeight * driftY * breath,
      width: diaryWidth,
      height: diaryHeight,
      turn: driftTurn * breath + Math.sin(t * .13) * .0018,
      gutter: diaryWidth * (focus.portrait ? .025 : .012),
    };
  }

  function diaryLeafPath(pageWidth: number, pageHeight: number, looseness = 1) {
    const left = -pageWidth / 2;
    const top = -pageHeight / 2;
    const notch = Math.min(pageWidth, pageHeight) * .018 * looseness;
    context.beginPath();
    context.moveTo(left + notch * 2.1, top + notch * .35);
    context.bezierCurveTo(left + pageWidth * .24, top - notch * .35, left + pageWidth * .39, top + notch * .72, left + pageWidth * .51, top + notch * .08);
    context.bezierCurveTo(left + pageWidth * .68, top - notch * .42, left + pageWidth * .84, top + notch * .56, left + pageWidth - notch * .8, top + notch * .12);
    context.quadraticCurveTo(left + pageWidth + notch * .25, top + pageHeight * .22, left + pageWidth - notch * .15, top + pageHeight * .48);
    context.quadraticCurveTo(left + pageWidth + notch * .4, top + pageHeight * .74, left + pageWidth - notch * .75, top + pageHeight - notch * .3);
    context.bezierCurveTo(left + pageWidth * .73, top + pageHeight + notch * .5, left + pageWidth * .56, top + pageHeight - notch * .28, left + pageWidth * .46, top + pageHeight + notch * .18);
    context.bezierCurveTo(left + pageWidth * .3, top + pageHeight + notch * .48, left + pageWidth * .13, top + pageHeight - notch * .55, left + notch * .8, top + pageHeight - notch * .22);
    context.quadraticCurveTo(left - notch * .22, top + pageHeight * .7, left + notch * .12, top + pageHeight * .48);
    context.quadraticCurveTo(left - notch * .28, top + pageHeight * .23, left + notch * 2.1, top + notch * .35);
    context.closePath();
  }

  function diaryPhotoPath(photoWidth: number, photoHeight: number, shape: DiaryPhotoShape) {
    if (shape === "oval") {
      context.beginPath(); context.ellipse(0, 0, photoWidth / 2, photoHeight / 2, 0, 0, TAU); context.closePath();
      return;
    }
    if (shape === "rose") {
      context.beginPath();
      for (let index = 0; index <= 24; index += 1) {
        const angle = index / 24 * TAU - Math.PI * .5;
        const pulse = .82 + Math.sin(angle * 6) * .12 + Math.sin(angle * 3 + .7) * .045;
        const x = Math.cos(angle) * photoWidth * .5 * pulse;
        const y = Math.sin(angle) * photoHeight * .5 * pulse;
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      return;
    }
    const left = -photoWidth / 2;
    const top = -photoHeight / 2;
    const edge = Math.min(photoWidth, photoHeight) * (shape === "ribbon" ? .025 : .035);
    context.beginPath();
    context.moveTo(left + edge * 1.4, top + edge * .2);
    context.bezierCurveTo(left + photoWidth * .28, top - edge * .25, left + photoWidth * .66, top + edge * .28, left + photoWidth - edge, top + edge * .1);
    context.quadraticCurveTo(left + photoWidth + edge * .18, top + photoHeight * .5, left + photoWidth - edge * .5, top + photoHeight - edge * .35);
    context.bezierCurveTo(left + photoWidth * .7, top + photoHeight + edge * .28, left + photoWidth * .31, top + photoHeight - edge * .3, left + edge * .65, top + photoHeight - edge * .08);
    context.quadraticCurveTo(left - edge * .16, top + photoHeight * .48, left + edge * 1.4, top + edge * .2);
    context.closePath();
  }

  function diarySurface(image: HTMLImageElement, photo: DiaryPhotoPose) {
    // The source photographs can fill a 4K spread, but allocating sixteen
    // full CSS-size canvases would retain hundreds of megabytes. Match the
    // renderer's pixel budget instead: one capped upload per photograph is
    // enough detail after the main canvas DPR is reduced on large displays.
    const maxEdge = compact ? 640 : 1024;
    const maxArea = compact ? 340_000 : 720_000;
    const sourceArea = Math.max(1, photo.width * photo.height);
    const cacheScale = Math.min(
      1,
      maxEdge / Math.max(1, photo.width, photo.height),
      Math.sqrt(maxArea / sourceArea),
    );
    const surfaceWidth = Math.max(1, Math.round(photo.width * cacheScale));
    const surfaceHeight = Math.max(1, Math.round(photo.height * cacheScale));
    const source = image.currentSrc || image.src;
    const cached = memorySurfaceCache.get(image);
    if (cached && cached.width === surfaceWidth && cached.height === surfaceHeight && cached.source === source) {
      return cached.surface;
    }
    const surface = document.createElement("canvas");
    surface.width = surfaceWidth; surface.height = surfaceHeight;
    const painter = surface.getContext("2d", { alpha: false });
    if (!painter) return surface;
    painter.imageSmoothingEnabled = true; painter.imageSmoothingQuality = "high";
    const focalX = clamp(Number(image.dataset.focalX ?? .5));
    const focalY = clamp(Number(image.dataset.focalY ?? .5));
    const zoom = 1.025;
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = surfaceWidth / surfaceHeight;
    let sw = image.naturalWidth / zoom; let sh = image.naturalHeight / zoom;
    if (sourceRatio > targetRatio) sw = sh * targetRatio; else sh = sw / targetRatio;
    const sx = clamp(focalX * image.naturalWidth - sw / 2, 0, image.naturalWidth - sw);
    const sy = clamp(focalY * image.naturalHeight - sh / 2, 0, image.naturalHeight - sh);
    painter.drawImage(image, sx, sy, sw, sh, 0, 0, surfaceWidth, surfaceHeight);
    memorySurfaceCache.set(image, { surface, width: surfaceWidth, height: surfaceHeight, source });
    return surface;
  }

  // Photographs should develop like an exposure spreading through vellum, not
  // like a UI panel whose rectangular width is being animated. The main wash
  // originates at the stitched spine, then three soft pools meet it at their
  // own pace. At full reveal the exact silhouette is still controlled by the
  // outer diaryPhotoPath clip.
  function diaryDevelopPath(photoWidth: number, photoHeight: number, reveal: number, phase: number) {
    const amount = easeInOut(reveal);
    const left = -photoWidth / 2;
    const top = -photoHeight / 2;
    if (amount >= .998) {
      context.beginPath(); context.rect(left, top, photoWidth, photoHeight); return;
    }
    const edge = left + photoWidth * (.05 + amount * .95);
    const tide = photoWidth * (.035 + (1 - amount) * .028);
    const waveA = Math.sin(phase * TAU) * tide;
    const waveB = Math.cos(phase * TAU * 1.7) * tide;
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(edge + waveA, top);
    context.bezierCurveTo(edge - tide * .9, top + photoHeight * .22, edge + waveB, top + photoHeight * .39, edge - waveA * .55, top + photoHeight * .53);
    context.bezierCurveTo(edge + tide, top + photoHeight * .7, edge - waveB * .75, top + photoHeight * .87, edge + waveA * .4, top + photoHeight);
    context.lineTo(left, top + photoHeight);
    context.closePath();

    const pool = smooth(.18, .88, amount);
    if (pool <= .002) return;
    const poolX = left + photoWidth * (.18 + amount * .67);
    const poolY = top + photoHeight * (.2 + phase * .46);
    context.moveTo(poolX + photoWidth * .18 * pool, poolY);
    context.ellipse(poolX, poolY, photoWidth * (.09 + pool * .16), photoHeight * (.07 + pool * .14), phase * .7, 0, TAU);
    context.ellipse(
      poolX - photoWidth * (.12 + phase * .07),
      poolY + photoHeight * (.16 - phase * .08),
      photoWidth * (.05 + pool * .12),
      photoHeight * (.05 + pool * .1),
      -.45 + phase,
      0,
      TAU,
    );
  }

  function drawDiaryStitches(
    t: number,
    page: DiaryPose,
    photosOnPage: readonly DiaryPhotoPose[],
    start: number,
    opacity: number,
    tone: "city" | "green" | "blue" | "winter",
  ) {
    if (opacity <= .002) return;
    const threadTone = tone === "blue" ? "rgba(186, 216, 239, .68)" : tone === "green" ? "rgba(189, 213, 187, .62)" : "rgba(238, 186, 151, .66)";
    context.save(); context.globalCompositeOperation = "screen"; context.lineCap = "round";
    photosOnPage.forEach((photo, index) => {
      const reveal = smooth(start + .06 + index * .16, start + .86 + index * .21, t);
      if (reveal <= .01) return;
      const side = photo.x < page.x ? -1 : 1;
      const spineX = page.x + side * page.gutter * .45;
      const travelX = lerp(spineX, photo.x - side * photo.width * .2, easeOut(reveal));
      const travelY = lerp(page.y, photo.y, easeOut(reveal));
      context.globalAlpha = opacity * reveal * (.13 + index * .014);
      context.strokeStyle = threadTone; context.lineWidth = .55;
      context.setLineDash([page.width * .014, page.width * .026]); context.lineDashOffset = -t * 16 - index * 8;
      context.beginPath(); context.moveTo(spineX, page.y);
      context.bezierCurveTo(
        lerp(spineX, travelX, .35), page.y + (photo.y - page.y) * .12,
        lerp(spineX, travelX, .72), travelY - (photo.y - page.y) * .1,
        travelX,
        travelY,
      );
      context.stroke(); context.setLineDash([]);
      if (reveal < .95) {
        context.globalAlpha = opacity * (1 - reveal) * .7;
        context.fillStyle = tone === "blue" ? "#d8ebff" : "#f1bd95";
        context.beginPath(); context.arc(travelX, travelY, compact ? 1.1 : 1.45, 0, TAU); context.fill();
      }
    });
    context.restore();
  }

  function drawDiaryPhoto(
    image: HTMLImageElement | undefined,
    photo: DiaryPhotoPose,
    opacity: number,
    reveal: number,
    tone: "city" | "green" | "blue" | "winter",
    scaleX = 1,
    zoomFactor = 1.0,
  ) {
    if (!image?.naturalWidth || opacity <= .002 || reveal <= .002 || scaleX <= .01) return;
    const developing = 1 - easeOut(reveal);
    const settleScale = 1 + developing * .022;
    context.save();
    context.translate(photo.x, photo.y); context.rotate(photo.turn); context.scale(scaleX * settleScale, settleScale);
    context.globalAlpha = opacity;
    diaryPhotoPath(photo.width, photo.height, photo.shape); context.clip();
    const phase = seeded(Math.round(photo.width + photo.height * 1.7 + Math.abs(photo.turn) * 1000), 518);
    diaryDevelopPath(photo.width, photo.height, reveal, phase); context.clip();

    // Zoom the photograph inside the frame for a smooth Ken Burns effect
    context.save();
    context.scale(zoomFactor, zoomFactor);
    const surface = diarySurface(image, photo);
    context.drawImage(surface, -photo.width / 2, -photo.height / 2, photo.width, photo.height);
    const grade = context.createLinearGradient(-photo.width * .48, -photo.height * .48, photo.width * .5, photo.height * .5);
    if (tone === "green") {
      grade.addColorStop(0, "rgba(193, 218, 183, .12)"); grade.addColorStop(.56, "rgba(22, 57, 43, .02)"); grade.addColorStop(1, "rgba(8, 24, 23, .28)");
    } else if (tone === "blue") {
      grade.addColorStop(0, "rgba(195, 221, 239, .14)"); grade.addColorStop(.54, "rgba(24, 57, 83, .02)"); grade.addColorStop(1, "rgba(5, 15, 29, .3)");
    } else if (tone === "winter") {
      grade.addColorStop(0, "rgba(245, 232, 225, .15)"); grade.addColorStop(.5, "rgba(91, 34, 47, .015)"); grade.addColorStop(1, "rgba(24, 7, 17, .28)");
    } else {
      grade.addColorStop(0, "rgba(255, 226, 185, .15)"); grade.addColorStop(.52, "rgba(95, 23, 45, .01)"); grade.addColorStop(1, "rgba(14, 4, 12, .28)");
    }
    context.fillStyle = grade; context.fillRect(-photo.width / 2, -photo.height / 2, photo.width, photo.height);
    if (developing > .012) {
      const flare = context.createRadialGradient(
        -photo.width * (.24 - phase * .12),
        photo.height * (.13 - phase * .18),
        0,
        -photo.width * (.24 - phase * .12),
        photo.height * (.13 - phase * .18),
        Math.max(photo.width, photo.height) * (.24 + developing * .32),
      );
      flare.addColorStop(0, tone === "blue" ? `rgba(220, 240, 255, ${developing * .28})` : `rgba(255, 210, 175, ${developing * .26})`);
      flare.addColorStop(.45, tone === "blue" ? `rgba(160, 205, 240, ${developing * .12})` : `rgba(215, 120, 140, ${developing * .1})`);
      flare.addColorStop(1, "rgba(20, 4, 16, 0)");
      context.globalCompositeOperation = "screen"; context.globalAlpha = opacity;
      context.fillStyle = flare; context.fillRect(-photo.width / 2, -photo.height / 2, photo.width, photo.height);
      context.globalCompositeOperation = "source-over";
    }
    context.restore();

    context.globalCompositeOperation = "screen";
    context.globalAlpha = opacity * (.28 + (1 - developing) * .12);
    diaryPhotoPath(photo.width, photo.height, photo.shape);
    context.strokeStyle = tone === "blue" ? "rgba(200, 228, 245, .78)" : "rgba(240, 198, 158, .76)";
    context.lineWidth = .85; context.stroke();
    context.restore();
  }

  function drawDiaryLeaves(page: DiaryPose, opacity: number, tone: "city" | "green" | "blue" | "winter") {
    const leafWidth = page.width * (compact ? .86 : .475);
    const leafHeight = page.height * .91;
    const leaves = compact ? [0] : [-1, 1];
    const palette = tone === "blue"
      ? ["#111b29", "#283847", "#0c111b"]
      : tone === "green"
        ? ["#142019", "#304030", "#0b130f"]
        : tone === "winter"
          ? ["#241721", "#3b2430", "#150b13"]
          : ["#21151e", "#3a2330", "#130a11"];
    leaves.forEach((side) => {
      const x = page.x + side * (leafWidth * .5 + page.gutter * .7);
      const cant = side * (compact ? 0 : .0035);
      context.save(); context.translate(x, page.y); context.rotate(page.turn + cant); context.globalAlpha = opacity;
      diaryLeafPath(leafWidth, leafHeight, .72);
      const paper = context.createLinearGradient(-leafWidth * .5, 0, leafWidth * .5, 0);
      if (side < 0) {
        paper.addColorStop(0, palette[0]); paper.addColorStop(.72, palette[1]); paper.addColorStop(1, palette[2]);
      } else {
        paper.addColorStop(0, palette[2]); paper.addColorStop(.28, palette[1]); paper.addColorStop(1, palette[0]);
      }
      context.fillStyle = paper; context.fill();
      context.save(); diaryLeafPath(leafWidth, leafHeight, .72); context.clip();
      // Sparse grain follows the leaf rather than the whole viewport. It
      // suggests paper fibres without a costly turbulence/filter layer.
      context.globalCompositeOperation = "screen";
      for (let index = 0; index < 8; index += 1) {
        const y = -leafHeight * .4 + leafHeight * (index + .6) / 8;
        const bend = (seeded(index, tone === "blue" ? 814 : 817) - .5) * leafHeight * .016;
        context.globalAlpha = opacity * (.018 + seeded(index, 818) * .014);
        context.strokeStyle = index % 3 ? "#c7b4a8" : "#9db4c4";
        context.lineWidth = .42;
        context.beginPath(); context.moveTo(-leafWidth * .42, y);
        context.bezierCurveTo(-leafWidth * .17, y + bend, leafWidth * .16, y - bend * .8, leafWidth * .42, y + bend * .38); context.stroke();
      }
      const inward = side === 0 ? 1 : -side;
      const fold = context.createLinearGradient(inward * leafWidth * .5, 0, -inward * leafWidth * .5, 0);
      fold.addColorStop(0, "rgba(4, 2, 7, .38)"); fold.addColorStop(.18, "rgba(12, 5, 12, .1)"); fold.addColorStop(1, "rgba(226, 210, 194, 0)");
      context.globalAlpha = opacity * .72; context.fillStyle = fold; context.fillRect(-leafWidth * .5, -leafHeight * .5, leafWidth, leafHeight);
      context.restore();
      context.globalCompositeOperation = "screen"; context.globalAlpha = opacity * .38;
      diaryLeafPath(leafWidth, leafHeight, .72);
      context.strokeStyle = tone === "blue" ? "rgba(179, 208, 230, .46)" : "rgba(221, 165, 150, .44)";
      context.lineWidth = .72; context.stroke(); context.restore();
    });
  }

  function drawDiaryBase(page: DiaryPose, opacity: number, open: number, tone: "city" | "green" | "blue" | "winter") {
    if (opacity <= .002 || open <= .002) return;
    const spread = easeOut(open);
    context.save(); context.translate(page.x, page.y); context.rotate(page.turn); context.scale(.06 + spread * .94, 1);
    context.globalAlpha = opacity;
    context.shadowColor = "rgba(0, 0, 0, .72)"; context.shadowBlur = compact ? 12 : 24; context.shadowOffsetY = compact ? 7 : 12;
    diaryLeafPath(page.width * 1.035, page.height * 1.055, 1.2);
    const cover = context.createLinearGradient(-page.width / 2, -page.height / 2, page.width / 2, page.height / 2);
    cover.addColorStop(0, "#220711"); cover.addColorStop(.48, "#4a0a20"); cover.addColorStop(1, "#16050e");
    context.fillStyle = cover; context.fill();
    context.shadowBlur = 0; context.shadowOffsetY = 0;
    diaryLeafPath(page.width, page.height);
    const leaf = context.createLinearGradient(-page.width / 2, -page.height / 2, page.width / 2, page.height / 2);
    const tint = tone === "green" ? "#17231e" : tone === "blue" ? "#121d2a" : tone === "winter" ? "#261a22" : "#28171f";
    leaf.addColorStop(0, "#0f0a0e"); leaf.addColorStop(.44, tint); leaf.addColorStop(.53, "#160d14"); leaf.addColorStop(1, "#0b080c");
    context.fillStyle = leaf; context.fill();
    context.clip();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < 7; index += 1) {
      const y = -page.height * .42 + page.height * (index + .38) / 7;
      context.globalAlpha = opacity * (.018 + seeded(index, 310) * .018);
      context.strokeStyle = index % 2 ? "#c49a78" : "#90a8bb";
      context.lineWidth = .45;
      context.beginPath();
      context.moveTo(-page.width * .46, y);
      context.bezierCurveTo(-page.width * .18, y + Math.sin(index) * 3, page.width * .19, y - Math.cos(index) * 3, page.width * .46, y + 1);
      context.stroke();
    }
    context.restore();

    // The leather cover is deliberately one silhouette, but the content sits
    // on separate leaves. This gives the photo choreography a true gutter and
    // a visible physical depth when a chapter turns.
    drawDiaryLeaves(page, opacity * spread, tone);

    context.save(); context.translate(page.x, page.y); context.rotate(page.turn); context.globalCompositeOperation = "screen";
    const spine = context.createLinearGradient(-page.gutter * 2.4, 0, page.gutter * 2.4, 0);
    spine.addColorStop(0, "rgba(171, 110, 91, 0)"); spine.addColorStop(.42, `rgba(202, 176, 145, ${opacity * .08})`);
    spine.addColorStop(.5, `rgba(223, 226, 212, ${opacity * .38})`); spine.addColorStop(.58, `rgba(202, 176, 145, ${opacity * .08})`); spine.addColorStop(1, "rgba(171, 110, 91, 0)");
    context.fillStyle = spine; context.fillRect(-page.gutter * 2.4, -page.height * .47, page.gutter * 4.8, page.height * .94);
    context.restore();
  }

  function chapterEnvelope(t: number, chapter: number) {
    const start = SCENE.memories.chapterStarts[chapter];
    const end = SCENE.memories.chapterStarts[chapter + 1] ?? SCENE.memories.out;
    // Cross the chapter boundary above half exposure on both leaves. The
    // painted veil can then read as moonlit paper instead of a black flash.
    const enter = smooth(start - .36, start + .36, t);
    const exit = chapter === 3
      ? 1 - smooth(SCENE.dissolve.in + .15, SCENE.memories.out + .28, t)
      : 1 - smooth(end - .38, end + .58, t);
    return enter * exit;
  }

  function drawDiaryVeil(t: number, page: DiaryPose, chapter: number, opacity: number) {
    const image = glimpses[chapter % Math.max(1, glimpses.length)];
    if (!image?.naturalWidth || opacity <= .002) return;
    const start = SCENE.memories.chapterStarts[chapter];
    const reveal = smooth(start - .26, start + .04, t) * (1 - smooth(start + .34, start + 1.2, t));
    if (reveal <= .002) return;
    context.save(); context.translate(page.x, page.y); context.rotate(page.turn);
    diaryLeafPath(page.width * .97, page.height * .94); context.clip();
    context.globalAlpha = reveal * opacity * .14;
    drawImageCover(image, -page.width * .49, -page.height * .47, page.width * .98, page.height * .94, 1.08);
    const veil = context.createRadialGradient(0, 0, page.height * .05, 0, 0, page.width * .62);
    veil.addColorStop(0, "rgba(116, 38, 60, .04)"); veil.addColorStop(1, "rgba(6, 3, 8, .92)");
    context.fillStyle = veil; context.fillRect(-page.width / 2, -page.height / 2, page.width, page.height);
    context.restore();
  }

  function drawPageCurl(
    page: DiaryPose,
    progress: number,
    opacity: number,
    direction: 1 | -1 = 1,
    tone: "city" | "green" | "blue" = "city",
  ) {
    if (progress <= .002 || progress >= .998 || opacity <= .002) return;
    const x = page.x + direction * page.width * (.52 - progress * 1.04);
    const curlWidth = page.width * (.055 + Math.sin(progress * Math.PI) * .065);
    context.save(); context.translate(page.x, page.y); context.rotate(page.turn); diaryLeafPath(page.width, page.height); context.clip(); context.translate(-page.x, -page.y);
    const fold = context.createLinearGradient(x - curlWidth, 0, x + curlWidth, 0);
    const tint = tone === "blue" ? "165, 205, 235" : tone === "green" ? "180, 215, 190" : "245, 205, 175";
    fold.addColorStop(0, "rgba(9, 4, 8, 0)"); fold.addColorStop(.32, `rgba(88, 43, 65, ${opacity * .26})`);
    fold.addColorStop(.5, `rgba(${tint}, ${opacity * .58})`); fold.addColorStop(.68, `rgba(47, 14, 31, ${opacity * .38})`); fold.addColorStop(1, "rgba(8, 3, 7, 0)");
    context.fillStyle = fold;
    context.beginPath();
    context.moveTo(x - direction * curlWidth, page.y - page.height * .53);
    context.quadraticCurveTo(x + direction * curlWidth * .8, page.y, x - direction * curlWidth * .5, page.y + page.height * .53);
    context.lineTo(x + direction * curlWidth, page.y + page.height * .53);
    context.quadraticCurveTo(x + direction * curlWidth * 1.7, page.y, x + direction * curlWidth * .45, page.y - page.height * .53);
    context.closePath(); context.fill();
    const sheen = Math.sin(progress * Math.PI);
    if (sheen > .15) {
      context.globalCompositeOperation = "screen";
      context.globalAlpha = opacity * sheen * .32;
      context.strokeStyle = `rgba(${tint}, .9)`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, page.y - page.height * .5);
      context.quadraticCurveTo(x + direction * curlWidth * .9, page.y, x, page.y + page.height * .5);
      context.stroke();
    }
    context.restore();
  }

  function cityPhotoPoses(page: DiaryPose): DiaryPhotoPose[] {
    if (compact) return [
      { x: page.x - page.width * .16, y: page.y - page.height * .3, width: page.width * .62, height: page.height * .29, turn: -.018, shape: "deckle" },
      { x: page.x + page.width * .035, y: page.y - page.height * .035, width: page.width * .73, height: page.height * .58, turn: .012, shape: "vellum" },
      { x: page.x - page.width * .23, y: page.y + page.height * .31, width: page.width * .38, height: page.height * .24, turn: -.035, shape: "oval" },
      { x: page.x + page.width * .26, y: page.y + page.height * .3, width: page.width * .35, height: page.height * .23, turn: .028, shape: "deckle" },
    ];
    return [
      { x: page.x - page.width * .255, y: page.y - page.height * .035, width: page.width * .45, height: page.height * .72, turn: -.012, shape: "deckle" },
      { x: page.x + page.width * .255, y: page.y - page.height * .05, width: page.width * .43, height: page.height * .78, turn: .014, shape: "vellum" },
      { x: page.x - page.width * .025, y: page.y + page.height * .255, width: page.width * .255, height: page.height * .31, turn: -.035, shape: "oval" },
      { x: page.x - page.width * .285, y: page.y + page.height * .29, width: page.width * .275, height: page.height * .24, turn: .026, shape: "deckle" },
    ];
  }

  function drawCityDiary(t: number, page: DiaryPose, opacity: number) {
    if (opacity <= .002) return;
    const start = SCENE.memories.chapterStarts[0]; const end = SCENE.memories.chapterStarts[1];
    drawDiaryBase(page, opacity, smooth(start - .18, start + .7, t), "city");
    drawDiaryVeil(t, page, 0, opacity);
    const poses = cityPhotoPoses(page);
    drawDiaryStitches(t, page, poses, start, opacity, "city");
    poses.forEach((photo, index) => {
      const reveal = smooth(start + .34 + index * .22, start + 1.14 + index * .24, t);
      const quiet = compact && index !== 1 ? .58 : 1;
      const zoomFactor = 1.0 + Math.max(0, t - (start + .34 + index * .22)) * 0.006;
      drawDiaryPhoto(photos[index], photo, opacity * quiet, reveal, "city", 1, zoomFactor);
    });
    drawPageCurl(page, smooth(end - .92, end + .32, t), opacity, 1, "city");
  }

  function greenPhotoPoses(page: DiaryPose): DiaryPhotoPose[] {
    if (compact) return [
      { x: page.x - page.width * .23, y: page.y - page.height * .13, width: page.width * .43, height: page.height * .68, turn: -.015, shape: "vellum" },
      { x: page.x + page.width * .23, y: page.y - page.height * .11, width: page.width * .43, height: page.height * .71, turn: .014, shape: "vellum" },
      { x: page.x - page.width * .21, y: page.y + page.height * .12, width: page.width * .45, height: page.height * .69, turn: .018, shape: "deckle" },
      { x: page.x + page.width * .21, y: page.y + page.height * .1, width: page.width * .43, height: page.height * .72, turn: -.018, shape: "deckle" },
    ];
    return [-.37, -.125, .125, .37].map((offset, index) => ({
      x: page.x + page.width * offset,
      y: page.y + page.height * (index % 2 ? .025 : -.018),
      width: page.width * .215,
      height: page.height * (index === 1 ? .73 : index === 2 ? .76 : .7),
      turn: (index - 1.5) * .012,
      shape: index === 1 || index === 2 ? "vellum" : "deckle",
    }));
  }

  function drawGreenDiary(t: number, page: DiaryPose, opacity: number) {
    if (opacity <= .002) return;
    const start = SCENE.memories.chapterStarts[1]; const end = SCENE.memories.chapterStarts[2];
    drawDiaryBase(page, opacity, smooth(start - .18, start + .72, t), "green");
    drawDiaryVeil(t, page, 1, opacity);
    const foldAway = smooth(end - 1.18, end + .22, t);
    const poses = greenPhotoPoses(page);
    drawDiaryStitches(t, page, poses, start, opacity * (1 - foldAway * .45), "green");
    poses.forEach((target, index) => {
      const open = easeOut(smooth(start - .28 + index * .12, start + .72 + index * .14, t));
      const pairVisibility = compact
        ? index < 2
          ? 1 - smooth(start + 3.18, start + 4.12, t)
          : smooth(start + 3.05, start + 4.05, t)
        : 1;
      const x = lerp(page.x, target.x, open * (1 - foldAway));
      const photo = { ...target, x, turn: target.turn * open * (1 - foldAway) };
      const zoomFactor = 1.0 + Math.max(0, t - (start - .28 + index * .12)) * 0.006;
      drawDiaryPhoto(photos[4 + index], photo, opacity * pairVisibility, open, "green", .14 + open * .86 * (1 - foldAway * .88), zoomFactor);
    });
    if (foldAway > .02) {
      context.save(); context.translate(page.x, page.y); context.rotate(page.turn); context.globalCompositeOperation = "screen";
      context.globalAlpha = opacity * foldAway * .24;
      const line = context.createLinearGradient(-page.width * .08, 0, page.width * .08, 0);
      line.addColorStop(0, "rgba(179, 204, 178, 0)"); line.addColorStop(.5, "rgba(216, 224, 202, .8)"); line.addColorStop(1, "rgba(179, 204, 178, 0)");
      context.fillStyle = line; context.fillRect(-page.width * .08, -page.height * .44, page.width * .16, page.height * .88); context.restore();
    }
    drawPageCurl(page, smooth(end - .86, end + .2, t), opacity * (1 - foldAway * .36), -1, "green");
  }

  function bluePhotoPoses(page: DiaryPose): DiaryPhotoPose[] {
    if (compact) return [
      { x: page.x - page.width * .1, y: page.y - page.height * .31, width: page.width * .68, height: page.height * .25, turn: -.035, shape: "ribbon" },
      { x: page.x + page.width * .12, y: page.y - page.height * .1, width: page.width * .72, height: page.height * .25, turn: .035, shape: "ribbon" },
      { x: page.x - page.width * .12, y: page.y + page.height * .13, width: page.width * .45, height: page.height * .36, turn: -.022, shape: "ribbon" },
      { x: page.x + page.width * .1, y: page.y + page.height * .34, width: page.width * .45, height: page.height * .35, turn: .024, shape: "ribbon" },
    ];
    return [
      { x: page.x - page.width * .27, y: page.y - page.height * .22, width: page.width * .4, height: page.height * .3, turn: -.028, shape: "ribbon" },
      { x: page.x + page.width * .23, y: page.y - page.height * .18, width: page.width * .4, height: page.height * .3, turn: .025, shape: "ribbon" },
      { x: page.x - page.width * .13, y: page.y + page.height * .19, width: page.width * .235, height: page.height * .48, turn: -.022, shape: "ribbon" },
      { x: page.x + page.width * .22, y: page.y + page.height * .2, width: page.width * .235, height: page.height * .48, turn: .022, shape: "ribbon" },
    ];
  }

  function drawBlueRibbon(page: DiaryPose, opacity: number, reveal: number) {
    if (opacity <= .002 || reveal <= .002) return;
    context.save(); context.translate(page.x, page.y); context.rotate(page.turn); diaryLeafPath(page.width * .97, page.height * .94); context.clip();
    context.globalAlpha = opacity;
    context.lineCap = "round"; context.lineJoin = "round";
    context.strokeStyle = "rgba(18, 34, 52, .88)"; context.lineWidth = page.height * (compact ? .15 : .17);
    context.setLineDash([page.width * 1.8 * reveal, page.width * 2]);
    context.beginPath();
    if (compact) {
      context.moveTo(-page.width * .26, -page.height * .44);
      context.bezierCurveTo(page.width * .34, -page.height * .3, -page.width * .36, -.02 * page.height, page.width * .24, page.height * .1);
      context.bezierCurveTo(page.width * .38, page.height * .2, -page.width * .28, page.height * .32, page.width * .2, page.height * .46);
    } else {
      context.moveTo(-page.width * .46, -page.height * .3);
      context.bezierCurveTo(-page.width * .02, -page.height * .52, page.width * .2, -page.height * .12, page.width * .42, -.03 * page.height);
      context.bezierCurveTo(page.width * .22, page.height * .1, -page.width * .35, page.height * .1, -page.width * .18, page.height * .32);
      context.bezierCurveTo(page.width * .02, page.height * .5, page.width * .3, page.height * .24, page.width * .46, page.height * .31);
    }
    context.stroke();
    context.setLineDash([]); context.globalCompositeOperation = "screen"; context.globalAlpha = opacity * .2;
    context.strokeStyle = "#a9c8dc"; context.lineWidth = .8; context.stroke(); context.restore();
  }

  function drawBlueDiary(t: number, page: DiaryPose, opacity: number) {
    if (opacity <= .002) return;
    const start = SCENE.memories.chapterStarts[2]; const end = SCENE.memories.chapterStarts[3];
    drawDiaryBase(page, opacity, smooth(start - .18, start + .72, t), "blue");
    drawDiaryVeil(t, page, 2, opacity);
    const ribbonReveal = smooth(start - .25, start + .95, t);
    const retract = smooth(end - 1.42, end + .24, t);
    drawBlueRibbon(page, opacity * (1 - retract * .72), ribbonReveal);
    const poses = bluePhotoPoses(page);
    drawDiaryStitches(t, page, poses, start, opacity * (1 - retract * .52), "blue");
    poses.forEach((target, index) => {
      const reveal = smooth(start - .22 + index * .18, start + .7 + index * .2, t);
      const photo = {
        ...target,
        x: lerp(target.x, page.x, retract),
        y: lerp(target.y, page.y + (index - 1.5) * page.height * .045, retract),
        turn: target.turn * (1 - retract),
      };
      const zoomFactor = 1.0 + Math.max(0, t - (start - .22 + index * .18)) * 0.006;
      drawDiaryPhoto(photos[8 + index], photo, opacity * (1 - retract * .45), reveal, "blue", 1 - retract * .82, zoomFactor);
    });
    drawPageCurl(page, smooth(end - .86, end + .18, t), opacity * (1 - retract * .34), 1, "blue");
  }

  function winterPhotoPoses(page: DiaryPose): DiaryPhotoPose[] {
    if (compact) return [
      { x: page.x, y: page.y, width: page.width * .92, height: page.height * .9, turn: 0, shape: "deckle" },
      { x: page.x - page.width * .22, y: page.y - page.height * .17, width: page.width * .39, height: page.height * .46, turn: -.024, shape: "rose" },
      { x: page.x + page.width * .22, y: page.y - page.height * .14, width: page.width * .4, height: page.height * .5, turn: .022, shape: "vellum" },
      { x: page.x, y: page.y + page.height * .22, width: page.width * .42, height: page.height * .48, turn: -.012, shape: "rose" },
    ];
    return [
      { x: page.x, y: page.y, width: page.width * .95, height: page.height * .88, turn: 0, shape: "deckle" },
      { x: page.x - page.width * .31, y: page.y - page.height * .08, width: page.width * .25, height: page.height * .64, turn: -.022, shape: "rose" },
      { x: page.x + page.width * .31, y: page.y - page.height * .06, width: page.width * .25, height: page.height * .65, turn: .022, shape: "vellum" },
      { x: page.x, y: page.y + page.height * .05, width: page.width * .29, height: page.height * .7, turn: -.008, shape: "rose" },
    ];
  }

  function drawWinterDiary(t: number, page: DiaryPose, opacity: number) {
    if (opacity <= .002) return;
    const start = SCENE.memories.chapterStarts[3];
    drawDiaryBase(page, opacity, smooth(start - .18, start + .72, t), "winter");
    drawDiaryVeil(t, page, 3, opacity);
    const dissolve = smooth(SCENE.dissolve.in, SCENE.memories.out + .22, t);
    const mapping = [14, 12, 13, 15] as const;
    const poses = winterPhotoPoses(page);
    drawDiaryStitches(t, page, poses, start, opacity * (1 - dissolve * .68), "winter");
    poses.forEach((photo, index) => {
      const reveal = smooth(start - .26 + index * .16, start + .62 + index * .18, t);
      const depth = index ? 1 : .63;
      const tremble = (seeded(index, 333) - .5) * page.width * .006 * dissolve;
      const zoomFactor = 1.0 + Math.max(0, t - (start - .26 + index * .16)) * 0.006;
      drawDiaryPhoto(
        photos[mapping[index]],
        { ...photo, x: photo.x + tremble, y: photo.y - tremble * .38, turn: photo.turn + tremble / page.width * .4 },
        opacity * depth * (1 - dissolve * (index ? .38 : .64)),
        reveal,
        "winter",
        1,
        zoomFactor,
      );
    });
  }

  function drawDiaryMemories(t: number) {
    if (!photos.length || t < SCENE.memories.in - .3 || t > SCENE.memories.out + .45) return;
    const page = diaryPose(t);
    const renderers = [drawCityDiary, drawGreenDiary, drawBlueDiary, drawWinterDiary] as const;
    renderers.forEach((drawChapter, chapter) => {
      const opacity = chapterEnvelope(t, chapter);
      if (opacity > .002) drawChapter(t, page, opacity);
    });
  }

  function rosePetalPose(index: number, t: number, base: number) {
    const ring = Math.floor(index / 7);
    const within = index % 7;
    const maxRing = Math.floor((flowerPetalCount - 1) / 7);
    const irregularity = seeded(index, 91) - .5;
    const reveal = smooth(
      SCENE.rose.in + (maxRing - ring) * .12 + seeded(index, 92) * .4,
      SCENE.rose.settled - .9 + (maxRing - ring) * .14 + seeded(index, 92) * .42,
      t,
    );
    const offset = seeded(index, 98) * .11 + (ring % 2 ? .16 : 0);
    const angle = within / 7 * TAU + ring * .34 + offset + irregularity * .42 + t * (.026 + seeded(index, 93) * .022);
    return {
      angle,
      distance: base * (.075 + ring * .18 + seeded(index, 99) * .035) * (.18 + reveal * .82),
      size: base * (.165 + ring * .057 + seeded(index, 100) * .022) * (1 + irregularity * .24) * (.46 + reveal * .54),
      reveal,
      irregularity,
    };
  }

  function roseScatterPose(index: number, focus: FilmStage, shard = 0) {
    const petalIndex = index % flowerPetalCount;
    const base = focus.unit * .232 * (compact ? 1.32 : 1);
    const petal = rosePetalPose(petalIndex, SCENE.rose.scatterIn, base);
    const sourceX = focus.x + Math.cos(petal.angle) * petal.distance;
    const sourceY = focus.y + Math.sin(petal.angle) * petal.distance * (.46 + seeded(petalIndex, 94) * .13);
    const spread = seeded(index + shard * 37, 531);
    const burstAngle = petal.angle + (spread - .5) * 1.65 + (shard - 1.5) * .045;
    const burstRadius = focus.unit * (.46 + seeded(index + shard * 19, 532) * .34 + shard * .022);
    return {
      petal,
      sourceX,
      sourceY,
      targetX: focus.x + Math.cos(burstAngle) * burstRadius,
      targetY: focus.y + Math.sin(burstAngle) * burstRadius * (compact ? .72 : .58)
        - focus.unit * (.035 + seeded(index + shard * 11, 533) * .11),
      burstAngle,
    };
  }

  function drawMemoryDissolution(t: number) {
    const active = smooth(SCENE.dissolve.in, SCENE.dissolve.in + 1.05, t)
      * (1 - smooth(SCENE.dissolve.out - .65, SCENE.dissolve.out, t));
    if (active <= .001) return;
    // The last projection sheds directly into the storm.  This keeps the
    // visual causality intact after removing the physical diary backdrop.
    const finalChapterBase = (SCENE.memories.chapterStarts.length - 1) * 4;
    const sourceSlides = [0, 1, 2, 3].map((slot) => {
      const imageIndex = Math.min(photos.length - 1, finalChapterBase + slot);
      return memoryFramePose(t, imageIndex, photos[imageIndex]);
    });
    const focus = sceneFocus(t);
    const unit = focus.unit;
    const cx = focus.x;
    const cy = focus.y;
    const roseReveal = smooth(SCENE.rose.in, SCENE.rose.settled, t);
    // Match the final rose scale exactly so the last storm particles land on
    // physical petals instead of expanding or snapping at the handoff.
    const flowerBase = unit * lerp(.075, .232, easeOut(roseReveal)) * (compact ? 1.32 : 1);

    memoryPetals.forEach((seed, index) => {
      const releaseAt = SCENE.dissolve.in + .45 + seed.card * .08 + seed.c * .38;
      const release = smooth(releaseAt, releaseAt + .72, t);
      if (release <= .001) return;
      // Every travelling petal begins inside the final image projection, so
      // its light visibly breaks into petals rather than fading between acts.
      const source = sourceSlides[seed.card % sourceSlides.length];
      const localX = (seed.a - .5) * source.width * .76;
      const localY = (seed.b - .5) * source.height * .72;
      const sourceCos = Math.cos(source.turn);
      const sourceSin = Math.sin(source.turn);
      const sourceX = source.x + localX * sourceCos - localY * sourceSin;
      const sourceY = source.y + localX * sourceSin + localY * sourceCos;
      const travel = smooth(SCENE.dissolve.in + 1.15 + seed.c * .55, SCENE.rose.in + 1.85 + seed.c * .7, t);
      const spin = seed.a * TAU * 2.1 + (t - SCENE.dissolve.in) * (1.05 + seed.d * 1.18);
      const stormRadius = unit * (.16 + seed.b * .26) * (1 - travel * .48);
      const stormX = cx + Math.cos(spin) * stormRadius;
      const stormY = cy + Math.sin(spin * 1.17) * stormRadius * .58 - travel * unit * (.025 + seed.e * .08);
      const target = rosePetalPose(index, t, flowerBase);
      const targetX = cx + Math.cos(target.angle) * target.distance;
      const targetY = cy + Math.sin(target.angle) * target.distance * (.46 + seeded(index, 94) * .13);
      const settle = smooth(SCENE.rose.in + .2 + seed.c * .8, SCENE.rose.settled - .15 + seed.c * .28, t);
      const x = lerp(lerp(sourceX, stormX, travel), targetX, settle);
      const y = lerp(lerp(sourceY, stormY, travel), targetY, settle);
      const size = lerp(unit * (.018 + seed.c * .017), target.size, settle);
      const bloomHandoff = smooth(SCENE.rose.settled - 1.9, SCENE.dissolve.out - .2, t);
      const alpha = release * active * (.58 + seed.c * .26) * (1 - bloomHandoff);
      petalShape(x, y, size, spin + Math.PI * .47 + settle * (target.angle + Math.PI * .5 + target.irregularity * .18 - spin), alpha, seeded(index, 90), .72 + seed.e * .16);

      if (index % 19 === 0 && release > .7 && alpha > .08) {
        context.save();
        context.globalCompositeOperation = "screen";
        context.globalAlpha = alpha * .72;
        context.strokeStyle = "#f2a36a";
        context.lineWidth = .65;
        const glint = 2 + seed.c * 3;
        context.beginPath(); context.moveTo(x - glint, y); context.lineTo(x + glint, y); context.moveTo(x, y - glint); context.lineTo(x, y + glint); context.stroke();
        context.restore();
      }
    });
  }

  function drawRose(t: number) {
    const bloomReveal = smooth(SCENE.rose.in, SCENE.rose.settled, t);
    const scatter = easeInOut(smooth(SCENE.rose.scatterIn, SCENE.rose.scatterOut, t));
    const exit = 1 - smooth(SCENE.rose.scatterOut, SCENE.rose.out, t);
    const reveal = bloomReveal * exit;
    if (reveal <= .001) return;
    const focus = sceneFocus(t);
    const cx = focus.x; const cy = focus.y;
    const baseRaw = focus.unit * lerp(.075, .232, easeOut(bloomReveal)) * (compact ? 1.32 : 1);
    const settle = smooth(SCENE.rose.settled - 1.55, SCENE.rose.settled, t);
    const base = baseRaw * (1 + Math.sin(t * 1.34) * .012 * settle);
    const stormCrossfade = smooth(SCENE.rose.settled - 1.9, SCENE.dissolve.out - .2, t);
    context.save(); context.globalCompositeOperation = "screen";
    const halo = context.createRadialGradient(cx, cy, 0, cx, cy, base * 3.2);
    halo.addColorStop(0, `rgba(215, 43, 75, ${reveal * (1 - scatter * .82) * (.22 + settle * .035)})`); halo.addColorStop(.45, `rgba(111, 15, 41, ${reveal * (1 - scatter * .72) * .11})`); halo.addColorStop(1, "rgba(75, 7, 31, 0)"); context.fillStyle = halo; context.fillRect(0, 0, width, height);
    // A scaled radial reflection keeps the floor glow soft at every edge. The
    // previous linear fill exposed its rectangular canvas bounds behind the
    // flower and made the final shot look like a UI panel.
    context.save();
    context.translate(cx, cy + base * .72);
    context.scale(1, .28);
    const reflection = context.createRadialGradient(0, 0, 0, 0, 0, base * 2.35);
    reflection.addColorStop(0, `rgba(205, 36, 69, ${reveal * .09})`);
    reflection.addColorStop(.48, `rgba(92, 11, 38, ${reveal * .035})`);
    reflection.addColorStop(1, "rgba(46, 5, 22, 0)");
    context.fillStyle = reflection;
    context.fillRect(-base * 2.4, -base * 2.4, base * 4.8, base * 4.8);
    context.restore();
    context.restore();
    // The storm and the flower use the exact same staggered petal layout, so
    // the last moving particles settle without a positional snap.
    for (let index = flowerPetalCount - 1; index >= 0; index -= 1) {
      const ring = Math.floor(index / 7);
      const petal = rosePetalPose(index, t, base);
      const bloomX = cx + Math.cos(petal.angle) * petal.distance;
      const bloomY = cy + Math.sin(petal.angle) * petal.distance * (.46 + seeded(index, 94) * .13);
      const burst = roseScatterPose(index, focus);
      const curve = Math.sin(scatter * Math.PI) * focus.unit * (seeded(index, 534) - .5) * .18;
      const x = lerp(bloomX, burst.targetX, scatter) - Math.sin(burst.burstAngle) * curve;
      const y = lerp(bloomY, burst.targetY, scatter) + Math.cos(burst.burstAngle) * curve * .55;
      const alpha = petal.reveal * (.06 + stormCrossfade * .94) * (.86 + ring * .028)
        * (1 - scatter * .68) * exit;
      petalShape(
        x,
        y,
        petal.size * lerp(1, .16, scatter),
        petal.angle + Math.PI * .5 + petal.irregularity * .18 + scatter * (seeded(index, 535) - .5) * 3.4,
        alpha,
        seeded(index, 90),
        .68 + seeded(index, 101) * .17,
      );
    }

    context.save();
    const coreFade = 1 - smooth(SCENE.rose.scatterIn, SCENE.rose.scatterIn + .9, t);
    const core = context.createRadialGradient(cx, cy, 0, cx, cy, base * .34);
    core.addColorStop(0, `rgba(20, 2, 10, ${reveal * coreFade * .72})`);
    core.addColorStop(.62, `rgba(77, 8, 27, ${reveal * coreFade * .32})`);
    core.addColorStop(1, "rgba(77, 8, 27, 0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(cx, cy, base * .36, 0, TAU);
    context.fill();
    context.restore();
    for (let index = 0; index < 5; index += 1) {
      const curl = index / 5 * TAU + .35 + index * .11;
      const curlReveal = smooth(SCENE.rose.settled - 2.25 + index * .1, SCENE.rose.settled - .75 + index * .1, t);
      const curlScatter = easeInOut(smooth(SCENE.rose.scatterIn + index * .045, SCENE.rose.scatterOut - .22 + index * .025, t));
      const sourceX = cx + Math.cos(curl) * base * (.035 + index * .006);
      const sourceY = cy + Math.sin(curl) * base * (.021 + index * .004);
      const burst = roseScatterPose(flowerPetalCount + index, focus, 1);
      petalShape(
        lerp(sourceX, burst.targetX, curlScatter),
        lerp(sourceY, burst.targetY, curlScatter) - Math.sin(curlScatter * Math.PI) * focus.unit * .06,
        base * (.165 + index * .018) * lerp(1, .14, curlScatter),
        curl + Math.PI * .5 + .18 + curlScatter * 2.1,
        curlReveal * (1 - curlScatter * .72) * exit,
        .18 + index * .1,
        .62 + index * .035,
      );
    }

    // A handful of late petals orbit once around the settled bloom, then melt
    // away. It lets the final note arrive over a living image rather than a
    // completely static backdrop.
    const orbit = smooth(SCENE.rose.settled - 1.4, SCENE.rose.settled + 1.15, t)
      * (1 - smooth(SCENE.rose.scatterIn - .65, SCENE.rose.scatterIn - .12, t));
    if (orbit > .001) {
      for (let index = 0; index < (compact ? 7 : 12); index += 1) {
        const phase = index / (compact ? 7 : 12) * TAU + t * (.4 + seeded(index, 145) * .09);
        const radius = base * (.78 + seeded(index, 146) * .5) * (1 - orbit * .23);
        const x = cx + Math.cos(phase) * radius;
        const y = cy + Math.sin(phase) * radius * .48 - orbit * base * .06;
        petalShape(
          x,
          y,
          base * (.06 + seeded(index, 147) * .035),
          phase + Math.PI * .5,
          orbit * (.32 + seeded(index, 148) * .22),
          seeded(index, 149),
          .76,
        );
      }
    }
    const glintReveal = smooth(SCENE.rose.settled - 1.25, SCENE.rose.settled + 1.2, t)
      * (1 - smooth(SCENE.rose.scatterIn - .45, SCENE.rose.scatterIn + .15, t));
    if (glintReveal > .001) {
      context.save();
      context.globalCompositeOperation = "screen";
      for (let index = 0; index < (compact ? 7 : 12); index += 1) {
        const angle = seeded(index, 119) * TAU;
        const radius = base * (.7 + seeded(index, 120) * .62);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * .56;
        const twinkle = .38 + (Math.sin(t * (1.8 + seeded(index, 121)) + index * 2.4) + 1) * .3;
        const size = 1.8 + seeded(index, 122) * 2.9;
        context.globalAlpha = glintReveal * twinkle;
        context.strokeStyle = index % 3 ? "#f2a36a" : "#d6e6ff";
        context.lineWidth = .7;
        context.beginPath(); context.moveTo(x - size, y); context.lineTo(x + size, y); context.moveTo(x, y - size); context.lineTo(x, y + size); context.stroke();
      }
      context.restore();
    }
  }

  function getThanksMaskTargets(fontSize: number, glyphs: readonly string[], widths: readonly number[]) {
    const key = `${compact}:${Math.round(fontSize)}:${widths.map((glyphWidth) => Math.round(glyphWidth)).join(",")}`;
    if (key === thanksMaskKey && thanksMaskTargets.length) return thanksMaskTargets;

    thanksMaskKey = key;
    thanksMaskTargets = [];
    const sample = document.createElement("canvas");
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) return thanksMaskTargets;
    const padding = Math.ceil(fontSize * .22);
    const baseline = Math.ceil(fontSize * 1.03);

    glyphs.forEach((glyph, glyphIndex) => {
      const glyphWidth = widths[glyphIndex];
      sample.width = Math.max(1, Math.ceil(glyphWidth + padding * 2));
      sample.height = Math.max(1, Math.ceil(fontSize * 1.34));
      sampleContext.clearRect(0, 0, sample.width, sample.height);
      sampleContext.fillStyle = "#fff";
      sampleContext.font = `400 ${fontSize}px "DM Serif Display", Georgia, serif`;
      sampleContext.textBaseline = "alphabetic";
      sampleContext.fillText(glyph, padding, baseline);
      const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data;
      const candidates: Array<{ x: number; y: number }> = [];
      const stride = 3;
      for (let y = 0; y < sample.height; y += stride) {
        for (let x = 0; x < sample.width; x += stride) {
          if (pixels[(y * sample.width + x) * 4 + 3] > 112) candidates.push({ x, y });
        }
      }
      if (!candidates.length) return;
      const perGlyph = Math.round(clamp(
        candidates.length * (compact ? .27 : .205),
        compact ? 40 : 54,
        compact ? 76 : 112,
      ));
      const bucket = candidates.length / perGlyph;
      for (let order = 0; order < perGlyph; order += 1) {
        // Stratified sampling keeps every part of a glyph represented and
        // avoids the duplicate random points that made the old dust word look
        // patchy rather than typeset.
        const pick = Math.min(
          candidates.length - 1,
          Math.floor(order * bucket + seeded(glyphIndex * 131 + order, 610) * bucket),
        );
        const point = candidates[pick];
        thanksMaskTargets.push({
          glyph: glyphIndex,
          x: point.x - padding - glyphWidth * .5,
          y: point.y - baseline,
          order,
          phase: perGlyph <= 1 ? 0 : order / (perGlyph - 1),
        });
      }
    });
    thanksMoteX.length = thanksMaskTargets.length;
    thanksMoteY.length = thanksMaskTargets.length;
    thanksMoteFlight.length = thanksMaskTargets.length;
    return thanksMaskTargets;
  }

  // The final word exists only as stardust on the visible canvas.  The DOM
  // equivalent is screen-reader text (plus a reduced-motion fallback), so no
  // solid glyph can appear over the particle construction.
  function drawThankYouAssembly(t: number) {
    const reveal = smooth(SCENE.thanks.in, SCENE.thanks.in + .72, t)
      * (1 - smooth(SCENE.thanks.out - 1.1, SCENE.thanks.out, t));
    if (reveal <= .001) return;

    const focus = sceneFocus(t);
    const fontSize = getThanksFontSize();
    const glyphs = ["T", "h", "a", "n", "k", "y", "o", "u"];
    const tracking = fontSize * -.048;
    const wordGap = fontSize * .21;

    context.save();
    context.font = `400 ${fontSize}px "DM Serif Display", Georgia, serif`;
    const widths = glyphs.map((glyph) => context.measureText(glyph).width);
    const total = widths.reduce((sum, glyphWidth) => sum + glyphWidth + tracking, wordGap) - tracking;
    let cursor = focus.x - total * .5;
    const baseline = focus.y + fontSize * .205;

    // A quiet oval of midnight gives the dust enough contrast without
    // flattening the star sky at the edges.
    const veil = context.createRadialGradient(focus.x, focus.y, fontSize * .12, focus.x, focus.y, Math.max(total * .72, fontSize * 2.25));
    veil.addColorStop(0, `rgba(4, 3, 10, ${reveal * .66})`);
    veil.addColorStop(.5, `rgba(7, 4, 13, ${reveal * .38})`);
    veil.addColorStop(1, "rgba(6, 3, 10, 0)");
    context.fillStyle = veil;
    context.fillRect(0, 0, width, height);

    const glyphPoses: Array<{ x: number; width: number; start: number; end: number }> = [];
    glyphs.forEach((_, index) => {
      if (index === 5) cursor += wordGap;
      const glyphWidth = widths[index];
      const glyphStart = SCENE.thanks.in + .04 + index * .17;
      glyphPoses.push({ x: cursor + glyphWidth * .5, width: glyphWidth, start: glyphStart, end: glyphStart + 1.72 });
      cursor += glyphWidth + tracking;
    });

    const targets = getThanksMaskTargets(fontSize, glyphs, widths);
    context.globalCompositeOperation = "screen";

    // First pass: continue the physical trajectories of the scattering rose,
    // cache every mote position, and draw only sparse motion trails.
    targets.forEach((target, targetIndex) => {
      const glyph = glyphPoses[target.glyph];
      if (!glyph) return;
      const start = glyph.start + target.phase * .92;
      const end = glyph.end + target.phase * .62;
      const flight = t >= SCENE.thanks.formed ? 1 : smooth(start, end, t);
      thanksMoteFlight[targetIndex] = flight;
      if (flight <= .001) {
        thanksMoteX[targetIndex] = Number.NaN;
        thanksMoteY[targetIndex] = Number.NaN;
        return;
      }
      const targetX = glyph.x + target.x;
      const targetY = baseline + target.y;
      if (flight >= .999) {
        thanksMoteX[targetIndex] = targetX;
        thanksMoteY[targetIndex] = targetY;
        return;
      }
      const shard = Math.floor(targetIndex / flowerPetalCount);
      const burst = roseScatterPose(targetIndex, focus, shard);
      const liveScatter = smooth(SCENE.rose.scatterIn, SCENE.rose.scatterOut, t);
      const sourceX = lerp(burst.sourceX, burst.targetX, liveScatter);
      const sourceY = lerp(burst.sourceY, burst.targetY, liveScatter);
      const bend = (seeded(targetIndex, 515) - .5) * focus.unit * .24;
      const arc = Math.sin(flight * Math.PI);
      const x = lerp(sourceX, targetX, flight) - Math.sin(burst.burstAngle) * bend * arc;
      const y = lerp(sourceY, targetY, flight) - focus.unit * (.055 + seeded(targetIndex, 516) * .075) * arc;
      thanksMoteX[targetIndex] = x;
      thanksMoteY[targetIndex] = y;

      if (targetIndex % 9 === 0 && flight < .94) {
        const previous = Math.max(0, flight - .1);
        const previousX = lerp(sourceX, targetX, previous) - Math.sin(burst.burstAngle) * bend * Math.sin(previous * Math.PI);
        const previousY = lerp(sourceY, targetY, previous) - focus.unit * (.055 + seeded(targetIndex, 516) * .075) * Math.sin(previous * Math.PI);
        context.globalAlpha = reveal * (1 - flight) * .34;
        context.strokeStyle = targetIndex % 4 ? "#ffd8b2" : "#d6e6ff";
        context.lineWidth = .48;
        context.beginPath(); context.moveTo(previousX, previousY); context.lineTo(x, y); context.stroke();
      }
    });

    // Travelling dust remains deliberately faint. The letter becomes legible
    // only when motes lock onto their glyph targets, making the assembly read
    // as a transformation instead of a bright cloud obscuring solid text.
    context.beginPath();
    targets.forEach((_, targetIndex) => {
      const flight = thanksMoteFlight[targetIndex] ?? 0;
      if (flight < .05 || flight >= .94) return;
      const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const radius = .32 + seeded(targetIndex, 520) * .42;
      context.moveTo(x + radius, y); context.arc(x, y, radius, 0, TAU);
    });
    context.globalAlpha = reveal * .22;
    context.fillStyle = "#e8d6c6";
    context.fill();

    // Second pass: three quiet brightness families make the dust breathe at
    // different rates. The minimum brightness stays high enough that the
    // letterforms never disappear while their stars twinkle.
    const toneGroups = [
      { color: "#ffe0bd", alpha: .82, speed: .72 },
      { color: "#d6e6ff", alpha: .9, speed: .91 },
      { color: "#fff7e8", alpha: .98, speed: 1.08 },
    ] as const;
    toneGroups.forEach((tone, toneIndex) => {
      context.beginPath();
      targets.forEach((target, targetIndex) => {
        const familySeed = (targetIndex + target.glyph * 3) % 11;
        const family = familySeed < 5 ? 0 : familySeed < 9 ? 1 : 2;
        if (family !== toneIndex) return;
        const flight = thanksMoteFlight[targetIndex] ?? 0;
        const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
        if (flight < .42 || !Number.isFinite(x) || !Number.isFinite(y)) return;
        const lock = smooth(.58, .97, flight);
        const twinkle = .78 + (Math.sin(t * (tone.speed + seeded(targetIndex, 517) * .38) + targetIndex * .73) + 1) * .11;
        const radius = ((compact ? .86 : .98) + seeded(targetIndex, 519) * (compact ? 1 : 1.18))
          * lerp(.28, 1, lock) * twinkle;
        context.moveTo(x + radius, y); context.arc(x, y, radius, 0, TAU);
      });
      context.globalAlpha = reveal * tone.alpha;
      context.fillStyle = tone.color;
      context.fill();
    });

    context.beginPath();
    targets.forEach((_, targetIndex) => {
      if (targetIndex % 4 !== 0) return;
      const flight = thanksMoteFlight[targetIndex] ?? 0;
      if (flight < .72) return;
      const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const lock = smooth(.72, .98, flight);
      const radius = ((compact ? .9 : 1.05) + seeded(targetIndex, 521) * .92) * 1.85 * lock;
      context.moveTo(x + radius, y); context.arc(x, y, radius, 0, TAU);
    });
    context.globalAlpha = reveal * .2;
    context.fillStyle = "#ffd9b5";
    context.fill();

    ["#ffe0bd", "#d6e6ff"].forEach((tone, toneIndex) => {
      context.beginPath();
      targets.forEach((_, targetIndex) => {
        if (targetIndex % 17 !== 0 || (thanksMoteFlight[targetIndex] ?? 0) < .82) return;
        if ((targetIndex % 3 === 0 ? 1 : 0) !== toneIndex) return;
        const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const pulse = .68 + (Math.sin(t * (.78 + seeded(targetIndex, 518) * .48) + targetIndex) + 1) * .32;
        const ray = (compact ? 2.35 : 3.4) * pulse;
        context.moveTo(x - ray, y); context.lineTo(x + ray, y);
        context.moveTo(x, y - ray); context.lineTo(x, y + ray);
        if (targetIndex % 39 === 0) {
          const diagonal = ray * .58;
          context.moveTo(x - diagonal, y - diagonal); context.lineTo(x + diagonal, y + diagonal);
          context.moveTo(x + diagonal, y - diagonal); context.lineTo(x - diagonal, y + diagonal);
        }
      });
      context.globalAlpha = reveal * .68;
      context.strokeStyle = tone;
      context.lineWidth = .58;
      context.stroke();
    });

    context.beginPath();
    targets.forEach((_, targetIndex) => {
      if (targetIndex % 19 !== 0) return;
      const flight = thanksMoteFlight[targetIndex] ?? 0;
      if (flight <= .72 || flight >= .999) return;
      const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      const snap = Math.sin(smooth(.72, .98, flight) * Math.PI);
      const ray = (compact ? 2.2 : 3.4) * snap;
      context.moveTo(x - ray, y); context.lineTo(x + ray, y);
      context.moveTo(x, y - ray); context.lineTo(x, y + ray);
    });
    context.globalAlpha = reveal * .55;
    context.strokeStyle = "#fff8e8";
    context.lineWidth = .68;
    context.stroke();

    // A slow highlight travels across the completed dust phrase. It wakes only
    // stars near the moving front instead of flashing the whole word at once.
    if (t >= SCENE.thanks.formed - .35) {
      const cycle = ((t - SCENE.thanks.formed + .35) % 5.4 + 5.4) % 5.4 / 5.4;
      const sweepX = focus.x - total * .67 + cycle * total * 1.34;
      const spread = fontSize * .2;
      context.beginPath();
      targets.forEach((_, targetIndex) => {
        if (targetIndex % 2 || (thanksMoteFlight[targetIndex] ?? 0) < .96) return;
        const x = thanksMoteX[targetIndex]; const y = thanksMoteY[targetIndex];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const proximity = 1 - clamp(Math.abs(x - sweepX) / spread);
        if (proximity <= .05) return;
        const ray = (compact ? 1.25 : 1.7) * (.5 + proximity * 1.25);
        context.moveTo(x - ray, y); context.lineTo(x + ray, y);
        context.moveTo(x, y - ray); context.lineTo(x, y + ray);
      });
      context.globalAlpha = reveal * .72;
      context.strokeStyle = "#fff7e7";
      context.lineWidth = .5;
      context.stroke();
    }
    context.restore();
  }

  function drawThankYouSparkles(t: number) {
    const reveal = smooth(SCENE.thanks.formed - .45, SCENE.thanks.formed + .9, t)
      * (1 - smooth(SCENE.thanks.out - .8, SCENE.thanks.out, t));
    if (reveal <= .001) return;
    const focus = sceneFocus(t);
    // Keep the centre clean for readability; the permanent sparkles orbit the
    // word rather than sitting on top of its letterforms.
    const count = compact ? 10 : 16;
    context.save();
    context.globalCompositeOperation = "screen";
    for (let index = 0; index < count; index += 1) {
      const angle = seeded(index, 404) * TAU;
      const radius = focus.unit * (.31 + seeded(index, 405) * .33);
      const drift = Math.sin(t * (.75 + seeded(index, 406) * .65) + index) * focus.unit * .012;
      const x = focus.x + Math.cos(angle) * radius + drift;
      const y = focus.y + Math.sin(angle) * radius * .31 - Math.cos(angle * 1.8) * focus.unit * .035;
      const pulse = .32 + (Math.sin(t * (2.1 + seeded(index, 407)) + index * 1.7) + 1) * .28;
      const size = (index % 6 === 0 ? 5.8 : 1.45 + seeded(index, 408) * 2.15) * pulse;
      context.globalAlpha = reveal * (.38 + seeded(index, 409) * .5) * pulse;
      context.strokeStyle = index % 3 ? "#f2a36a" : "#d6e6ff";
      context.lineWidth = index % 7 === 0 ? .9 : .55;
      context.beginPath();
      context.moveTo(x - size, y); context.lineTo(x + size, y);
      context.moveTo(x, y - size); context.lineTo(x, y + size);
      context.stroke();
      if (index % 7 === 0) {
        context.fillStyle = "#fff0d7";
        context.beginPath(); context.arc(x, y, 1.1 + pulse, 0, TAU); context.fill();
      }
    }
    context.restore();
  }

  function setFinaleAccessibility(t: number) {
    // The canvas is decorative, so the visual finale receives a real DOM
    // equivalent for assistive technology.
    if (thanks) {
      const thanksVisible = t >= SCENE.thanks.in && t <= SCENE.thanks.out;
      thanks.setAttribute("aria-hidden", thanksVisible ? "false" : "true");
    }
  }

  function updateCue(t: number) {
    while (cueIndex < FILM_CUES.length && t >= FILM_CUES[cueIndex].at) {
      const next = FILM_CUES[cueIndex];
      cueIndex += 1;
      if (next.handoffOnly && !handoffMode) continue;
      options.onCue?.(next.name);
    }
  }

  function render(t: number, force = false) {
    if (destroyed) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    fillBackground(t);
    drawMoonHalo(t);
    const dustStrength = Math.max(
      smooth(.2, 1.15, t) * (1 - smooth(SCENE.door.out - 1.5, SCENE.door.out, t)) * .32,
      smooth(SCENE.vortex.in, SCENE.vortex.in + 1.2, t) * (1 - smooth(SCENE.vortex.out - 1.2, SCENE.vortex.out, t)) * .42,
      smooth(SCENE.stars.in, SCENE.stars.in + 2.1, t) * (1 - smooth(SCENE.zodiac.out - 1, SCENE.zodiac.out, t)) * .09,
      smooth(SCENE.dissolve.in, SCENE.dissolve.in + 1.5, t) * (1 - smooth(SCENE.iris.in, SCENE.iris.out, t)) * .34,
    );
    drawDust(t, dustStrength);
    drawStars(t);
    drawMeteorShowers(t);
    drawFlight(t);
    drawConstellations(t);
    drawSkySlides(t);
    drawMemoryMoonVeil(t);
    drawMemoryDissolution(t);
    drawRose(t);
    drawThankYouAssembly(t);
    drawThankYouSparkles(t);
    drawForegroundBatCurtain(t);
    setFinaleAccessibility(t);
    updateCue(t);
    const irisValue = smooth(SCENE.iris.in, SCENE.iris.out, t);
    if (vignette && (force || Math.abs(irisValue - lastIris) > .012)) {
      vignette.style.setProperty("--rose-iris-close", String(irisValue)); lastIris = irisValue;
    }
  }

  function tick(now: number) {
    if (!running || paused || destroyed) return;
    const elapsed = Math.min(.05, Math.max(0, (now - previous) / 1000));
    previous = now; time = Math.min(DURATION, time + elapsed);
    render(time); options.onProgress?.(time / DURATION);
    if (time >= DURATION) { running = false; animation = 0; options.onComplete?.(); return; }
    animation = requestAnimationFrame(tick);
  }

  function start(startAt = 0) {
    if (destroyed || running) return;
    handoffMode = root.classList.contains("is-handoff");
    time = clamp(startAt, 0, DURATION - .01);
    cueIndex = FILM_CUES.findIndex((entry) => entry.at >= time - .015);
    if (cueIndex < 0) cueIndex = FILM_CUES.length;
    lastIris = -1; paused = false; running = true;
    root.classList.remove("is-fallback"); root.classList.add("is-cinema-ready");
    previous = performance.now(); render(time, true); options.onProgress?.(time / DURATION); animation = requestAnimationFrame(tick);
  }
  function pause() { if (!running || paused || destroyed) return; paused = true; if (animation) cancelAnimationFrame(animation); animation = 0; }
  function resume() { if (!running || !paused || destroyed) return; paused = false; previous = performance.now(); animation = requestAnimationFrame(tick); }
  function reset() {
    if (animation) cancelAnimationFrame(animation); animation = 0; running = false; paused = false; time = 0; cueIndex = 0; lastIris = -1;
    handoffMode = false;
    thanks?.setAttribute("aria-hidden", "true");
    if (vignette) vignette.style.setProperty("--rose-iris-close", "0"); render(0, true);
  }
  function destroy() { if (destroyed) return; reset(); destroyed = true; observer.disconnect(); if (resizeFrame) cancelAnimationFrame(resizeFrame); }

  render(0, true);
  return { start, pause, resume, reset, destroy, isPaused: () => paused, isRunning: () => running };
}
