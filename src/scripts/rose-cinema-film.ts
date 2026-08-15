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

const DURATION = 53.5;
const TAU = Math.PI * 2;
const PETAL_PALETTES = [
  ["#d85761", "#741127"],
  ["#bd2944", "#500916"],
  ["#92152e", "#26040e"],
  ["#d94e5a", "#7a1228"],
] as const;

type Seed = { a: number; b: number; c: number; d: number; e: number };
type Star = { x: number; y: number; r: number; twinkle: number; hue: number };
type Point = readonly [number, number];
type CardPose = { x: number; y: number; size: number; turn: number };
type MemoryPetal = Seed & { card: number; ring: number; slot: number };

const VIRGO: readonly Point[] = [
  [-.23, -.22], [-.08, -.11], [.08, -.22], [.2, -.02], [.1, .19], [.24, .35], [.04, .47], [-.15, .32],
] as const;
const CAPRICORN: readonly Point[] = [
  [.31, -.3], [.47, -.15], [.39, .04], [.55, .2], [.38, .36], [.2, .27], [.14, .08], [.25, -.07],
] as const;

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function lerp(a: number, b: number, amount: number) { return a + (b - a) * amount; }
function smooth(from: number, to: number, value: number) {
  const x = clamp((value - from) / Math.max(.001, to - from));
  return x * x * (3 - 2 * x);
}
function easeOut(value: number) { return 1 - (1 - clamp(value)) ** 3; }
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
  const letterCandidate = root.querySelector<HTMLElement>("#rose-cinema-letter");
  if (!canvasCandidate || !letterCandidate) throw new Error("Rose cinema canvas is unavailable");
  const canvas: HTMLCanvasElement = canvasCandidate;
  const letter: HTMLElement = letterCandidate;
  const contextCandidate = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!contextCandidate) throw new Error("Rose cinema 2D context is unavailable");
  const context: CanvasRenderingContext2D = contextCandidate;
  const petalSprites = PETAL_PALETTES.map(createPetalSprite);
  const vignette = root.querySelector<HTMLElement>(".rose-cinema-vignette");

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("[data-rose-texture]"));
  // Image decoding is opportunistic: encrypted builds can reveal these a beat
  // after the canvas is prepared, so a missing photograph never stalls film.
  await Promise.all(images.slice(0, 10).map(waitForImage));
  const photos = images.filter((image) => /^(photo|painted|portrait)-/.test(image.dataset.roseTexture ?? ""));

  const compact = window.matchMedia("(max-width: 720px)").matches;
  const particleCount = compact ? 34 : 58;
  const starCount = compact ? 155 : 286;
  const particles: Seed[] = Array.from({ length: particleCount }, (_, index) => ({
    a: seeded(index, 1), b: seeded(index, 2), c: seeded(index, 3), d: seeded(index, 4), e: seeded(index, 5),
  }));
  const orderedParticles = [...particles].sort((one, two) => one.c - two.c);
  // This is a distinct foreground flock rather than more of the later morph
  // particles. It makes the doorway breach feel like a curtain of bats
  // physically racing through the lens before the crimson world takes over.
  const curtainBats: Seed[] = Array.from({ length: compact ? 72 : 160 }, (_, index) => ({
    a: seeded(index, 201), b: seeded(index, 202), c: seeded(index, 203), d: seeded(index, 204), e: seeded(index, 205),
  }));
  const orderedCurtainBats = [...curtainBats].sort((one, two) => one.c - two.c);
  const stars: Star[] = Array.from({ length: starCount }, (_, index) => ({
    x: seeded(index, 10), y: seeded(index, 11), r: .35 + seeded(index, 12) * 1.45,
    twinkle: seeded(index, 13) * TAU, hue: seeded(index, 14),
  }));
  const memoryPositions: readonly Point[] = compact
    ? [[-.23, -.1], [.22, -.17], [.05, .23]]
    : [[-.25, -.12], [.18, -.22], [.31, .15], [-.14, .21]];
  const memoryPetals: MemoryPetal[] = Array.from({ length: compact ? 46 : 84 }, (_, index) => ({
    a: seeded(index, 101), b: seeded(index, 102), c: seeded(index, 103), d: seeded(index, 104), e: seeded(index, 105),
    card: index % memoryPositions.length,
    ring: Math.floor((index % 42) / 7),
    slot: index % 7,
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
  let cue = "";
  let lastIris = -1;
  let letterAccessible = false;

  const resize = () => {
    const bounds = root.getBoundingClientRect();
    width = Math.max(1, Math.floor(bounds.width));
    height = Math.max(1, Math.floor(bounds.height));
    dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.35 : 1.7);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
  };
  const observer = new ResizeObserver(() => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; resize(); render(time, true); });
  });
  observer.observe(root);
  resize();

  function fillBackground(t: number) {
    const dawn = smooth(42, 53.5, t);
    const wash = context.createRadialGradient(width * .5, height * .46, 0, width * .5, height * .46, Math.max(width, height) * .78);
    wash.addColorStop(0, mixColor("#25101f", "#3a111d", dawn));
    wash.addColorStop(.42, mixColor("#110914", "#180712", dawn));
    wash.addColorStop(1, "#050307");
    context.fillStyle = wash;
    context.fillRect(0, 0, width, height);

    const glow = context.createRadialGradient(width * .5, height * .52, 0, width * .5, height * .52, width * .62);
    glow.addColorStop(0, `rgba(174, 30, 58, ${.08 + dawn * .08})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  function drawDust(t: number, strength: number) {
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

  function drawThread(t: number, amount: number, fromY = .72, toY = .42) {
    if (amount <= .001) return;
    const x0 = width * .5;
    const y0 = height * fromY;
    const y1 = height * toY;
    const length = lerp(y0, y1, amount);
    context.save();
    context.lineCap = "round";
    context.lineWidth = 1.2 + amount * 1.4;
    context.shadowBlur = 14;
    context.shadowColor = "rgba(226, 45, 78, .7)";
    const gradient = context.createLinearGradient(x0, y0, x0, y1);
    gradient.addColorStop(0, "rgba(196, 30, 58, .02)");
    gradient.addColorStop(.35, "rgba(242, 77, 99, .92)");
    gradient.addColorStop(1, "rgba(238, 209, 175, .9)");
    context.strokeStyle = gradient;
    context.beginPath();
    context.moveTo(x0, y0);
    context.bezierCurveTo(x0 - width * .11, y0 - height * .1, x0 + width * .13, y0 - height * .22, x0 + Math.sin(t * .72) * 14, length);
    context.stroke();
    context.restore();
  }

  function drawDoor(t: number, opacity = 1) {
    const opening = smooth(1.25, 6.8, t);
    const focal = easeOut(smooth(0, 6.8, t));
    const scale = lerp(.83, 1.62, focal);
    const dw = Math.min(width * .54, height * .42) * scale;
    const dh = Math.min(height * .77, width * .82) * scale;
    const cx = width * .5;
    const base = height * .79 + focal * height * .19;
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
    context.translate(x, y); context.rotate(turn); context.scale(size, size);
    context.globalAlpha = alpha;
    context.shadowColor = "rgba(0, 0, 0, .7)"; context.shadowBlur = foreground ? 9 : 0;
    context.fillStyle = foreground ? "#070308" : "#2a1026";
    const leftWing = .72 + Math.sin(flap + .25) * .22;
    const rightWing = .72 + Math.sin(flap - .18) * .2;
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

  function drawBatCurtain(t: number) {
    const breath = smooth(1.06, 1.42, t) * (1 - smooth(5.58, 6.62, t));
    if (breath <= .001) return;
    const centerX = width * .5;
    const centerY = height * .59;
    const unit = Math.min(width, height);

    // Far silhouettes draw first. Larger bats are painted last so they pass
    // close to the viewer and naturally mask the doorway-to-film handoff.
    orderedCurtainBats.forEach((seed, index) => {
      const launch = 1.04 + seed.a * .52;
      const surge = easeOut(smooth(launch, launch + 1.06, t));
      const escape = smooth(4.18 + seed.d * .52, 5.92 + seed.d * .54, t);
      const originX = centerX + (seed.e - .5) * unit * .06;
      const originY = centerY + (seed.c - .5) * unit * .045;
      // The first landing points stay inside the frame, forming the dense bat
      // curtain. Only the second leg throws them beyond the lens.
      const midX = width * (-.06 + seed.b * 1.12);
      const midY = height * (-.08 + seed.d * 1.16);
      const endX = midX + (midX - centerX) * (.42 + seed.c * .48);
      const endY = midY + (midY - centerY) * (.42 + seed.c * .48);
      const wave = Math.sin(t * (3.2 + seed.e * 1.6) + seed.a * 18) * unit * (.006 + seed.c * .01);
      let x = lerp(originX, midX, surge);
      let y = lerp(originY, midY, surge) + wave;
      x = lerp(x, endX, escape);
      y = lerp(y, endY, escape);
      const nearLens = seed.c > .925 || index % 29 === 0;
      const midground = seed.c > .62;
      const size = unit * (.010 + seed.c * .023) * (nearLens ? 2.45 + seed.e * .82 : midground ? 1.18 : .76);
      const turn = Math.atan2(endY - originY, endX - originX) + Math.sin(t * 1.8 + seed.b * 8) * .11;
      const appear = smooth(launch, launch + .32, t);
      const vanish = 1 - smooth(5.42 + seed.a * .42, 6.62 + seed.a * .28, t);
      const alpha = breath * appear * vanish * (nearLens ? .96 : .52 + seed.c * .28);
      if (alpha <= .004) return;
      batShape(x, y, size, turn, t * (10.8 + seed.d * 5.5) + seed.e * 13, alpha, seed.c, nearLens);
    });
  }

  function petalShape(x: number, y: number, size: number, turn: number, alpha: number, shade: number) {
    context.save();
    context.translate(x, y); context.rotate(turn); context.globalAlpha = alpha;
    context.shadowColor = "rgba(211, 31, 75, .4)"; context.shadowBlur = shade > .9 ? 7 : 0;
    const sprite = petalSprites[Math.min(petalSprites.length - 1, Math.floor(shade * petalSprites.length))];
    context.drawImage(sprite, -size, -size, size * 2, size * 2);
    context.restore();
  }

  function drawCrimsonVortex(t: number, centerX: number, centerY: number, vortex: number) {
    const amount = smooth(7.85, 10.45, t) * (1 - smooth(15.0, 17.0, t));
    if (amount <= .001) return;
    const unit = Math.min(width, height);
    context.save();
    context.globalCompositeOperation = "screen";
    context.lineCap = "round";

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
      context.globalAlpha = amount * (.09 + (index % 3) * .022);
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

  function drawFlight(t: number) {
    const vortex = smooth(8.35, 15.7, t);
    const doorVisible = 1 - smooth(6.05, 8.85, t);
    if (doorVisible > .001) drawDoor(t, doorVisible);
    const centerX = width * .5;
    const centerY = lerp(height * .56, height * .29, vortex);
    const progress = clamp((t - .3) / 15);
    orderedParticles.forEach((seed) => {
      const exit = clamp((t - .55 - seed.a * 1.6) / 8.25);
      const drift = easeOut(exit);
      const entryX = centerX + (seed.a - .5) * width * .08;
      const entryY = height * (.55 + seed.b * .18);
      const angle = seed.a * TAU * 1.35 + t * (1.46 + seed.d * .72) + vortex * TAU * (2.2 + seed.c * 1.25);
      const radius = lerp(width * (.145 + seed.b * .23), width * (.024 + seed.b * .06), vortex);
      const swirlX = centerX + Math.cos(angle) * radius * (1 - vortex * .38);
      const swirlY = centerY + Math.sin(angle * 1.14) * radius * .52 - vortex * height * (.11 + seed.c * .16);
      const x = lerp(entryX, swirlX, drift);
      const y = lerp(entryY, swirlY, drift);
      const foreground = seed.c > .92 ? 1.42 : 1;
      const size = lerp(.35, .62 + seed.c * .92, drift) * Math.min(width, height) * .024 * foreground;
      const turn = Math.atan2(swirlY - entryY, swirlX - entryX) + seed.e * .4;
      const alpha = smooth(.15, 1.2, t - seed.a * .55) * (1 - smooth(15.1, 17.7, t));
      const morph = smooth(5.05 + seed.a * 1.55, 7.25 + seed.a * 1.55, t);
      if (alpha <= .001) return;
      batShape(x, y, size, turn, t * (13 + seed.d * 5) + seed.b * 9, alpha * (1 - morph) * (.66 + seed.c * .34), seed.c);
      petalShape(x, y, size * (1.05 + morph * .18), turn + Math.PI * (.04 + morph * .18), alpha * morph, seed.c);
    });
    drawBatCurtain(t);
    // It is painted over the distant petals so the eye can follow a single
    // rotating current rather than seeing a static cloud of shapes.
    drawCrimsonVortex(t, centerX, centerY, vortex);
    drawThread(t, smooth(3.4, 14.8, t), .73, .14);
    const portal = smooth(7.45, 11.9, t) * (1 - smooth(14.1, 17.2, t));
    if (portal > .001) {
      context.save(); context.globalCompositeOperation = "screen";
      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * .34);
      halo.addColorStop(0, `rgba(197, 36, 65, ${portal * .16})`); halo.addColorStop(.62, `rgba(51, 12, 35, ${portal * .08})`); halo.addColorStop(1, "transparent");
      context.fillStyle = halo; context.fillRect(0, 0, width, height); context.restore();
    }
    void progress;
  }

  function drawStars(t: number) {
    const fade = smooth(13.45, 19.1, t) * (1 - smooth(38.2, 42.1, t));
    if (fade <= .001) return;
    const rise = smooth(13.8, 19.5, t);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, `rgba(13, 15, 38, ${fade * .93})`);
    sky.addColorStop(.55, `rgba(17, 11, 32, ${fade * .76})`);
    sky.addColorStop(1, `rgba(35, 8, 28, ${fade * .3})`);
    context.fillStyle = sky; context.fillRect(0, 0, width, height);
    context.save(); context.globalCompositeOperation = "screen";
    stars.forEach((star, index) => {
      const y = (star.y * 1.24 - .1 - rise * .08) * height;
      const x = star.x * width + Math.sin(t * .16 + star.twinkle) * 4;
      const shine = .26 + (Math.sin(t * (1.1 + star.hue) + star.twinkle) + 1) * .2;
      context.fillStyle = star.hue > .7 ? `rgba(247, 205, 173, ${fade * shine})` : `rgba(205, 226, 255, ${fade * shine})`;
      context.beginPath(); context.arc(x, y, star.r * (1 + shine), 0, TAU); context.fill();
      if (index % 29 === 0) {
        const ray = (3 + shine * 7) * fade;
        context.strokeStyle = star.hue > .7 ? `rgba(255, 219, 180, ${fade * (.22 + shine * .3)})` : `rgba(220, 237, 255, ${fade * (.18 + shine * .28)})`;
        context.lineWidth = .65;
        context.beginPath(); context.moveTo(x - ray, y); context.lineTo(x + ray, y); context.moveTo(x, y - ray); context.lineTo(x, y + ray); context.stroke();
      }
    });
    context.restore();
  }

  function constellation(t: number, points: readonly Point[], alpha: number, delay: number) {
    const reveal = smooth(delay, delay + 3.9, t) * alpha;
    if (reveal <= .001) return;
    const px = (point: Point) => width * (.5 + point[0]);
    const py = (point: Point) => height * (.43 + point[1]);
    context.save(); context.globalCompositeOperation = "screen";
    const segments = Math.floor((points.length - 1) * reveal);
    // The first pass is a cool, continuous hairline: it makes the two figures
    // read as constellations rather than a UI diagram. A short red trace then
    // travels over it, carrying the film's single red-thread motif forward.
    context.strokeStyle = `rgba(214, 230, 255, ${reveal * .4})`; context.lineWidth = .8;
    context.beginPath();
    for (let index = 0; index <= segments; index += 1) {
      const point = points[index]; if (!point) continue;
      if (index) context.lineTo(px(point), py(point)); else context.moveTo(px(point), py(point));
    }
    context.stroke();
    context.strokeStyle = `rgba(210, 48, 73, ${reveal * .48})`; context.lineWidth = 1.05;
    context.setLineDash([1.2, 10]); context.lineDashOffset = -t * 24;
    context.stroke(); context.setLineDash([]);
    points.forEach((point, index) => {
      const appear = smooth(delay + index * .28, delay + index * .28 + .8, t) * alpha;
      if (!appear) return;
      const x = px(point); const y = py(point); const radius = 2.1 + (index % 3) * .7;
      context.shadowColor = "rgba(255, 198, 157, .9)"; context.shadowBlur = 12;
      context.fillStyle = `rgba(255, 232, 197, ${appear})`; context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fill();
    });
    context.restore();
  }

  function drawConstellations(t: number) {
    const alpha = smooth(18.05, 22.2, t) * (1 - smooth(34.2, 39.3, t));
    constellation(t, VIRGO, alpha, 18.65);
    constellation(t, CAPRICORN, alpha, 20.6);
    if (alpha > .001) drawThread(t, smooth(19.4, 25.1, t) * alpha, .68, .27);
  }

  function drawCard(image: HTMLImageElement, x: number, y: number, size: number, turn: number, opacity: number) {
    if (!image.naturalWidth || opacity <= .01) return;
    const cardW = size; const cardH = size * 1.18;
    context.save(); context.translate(x, y); context.rotate(turn); context.globalAlpha = opacity;
    context.shadowColor = "rgba(0, 0, 0, .65)"; context.shadowBlur = 28; context.shadowOffsetY = 12;
    context.fillStyle = "#e9dbc1"; context.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
    context.shadowBlur = 0;
    const inset = size * .075;
    context.save(); context.beginPath(); context.rect(-cardW / 2 + inset, -cardH / 2 + inset, cardW - inset * 2, cardH * .7); context.clip();
    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = (cardW - inset * 2) / (cardH * .7);
    let sw = image.naturalWidth; let sh = image.naturalHeight; let sx = 0; let sy = 0;
    if (sourceRatio > targetRatio) { sw = sh * targetRatio; sx = (image.naturalWidth - sw) / 2; }
    else { sh = sw / targetRatio; sy = (image.naturalHeight - sh) / 2; }
    context.drawImage(image, sx, sy, sw, sh, -cardW / 2 + inset, -cardH / 2 + inset, cardW - inset * 2, cardH * .7);
    context.restore();
    context.restore();
  }

  function getMemoryCardPose(index: number, t: number): CardPose {
    const position = memoryPositions[index % memoryPositions.length];
    const drift = Math.sin(t * .66 + index * 2.15);
    const unit = Math.min(width, height);
    return {
      x: width * (.5 + position[0] + drift * .014),
      y: height * (.5 + position[1] + Math.cos(t * .57 + index) * .018),
      size: unit * (index === 1 ? .225 : .17 + (index % 2) * .018),
      turn: (index - (memoryPositions.length - 1) / 2) * .11 + drift * .024,
    };
  }

  function drawMemories(t: number) {
    const inShot = smooth(26.2, 29.25, t);
    if (inShot <= .001) return;
    const selection = photos.length ? photos : images;
    if (!selection.length) return;
    memoryPositions.forEach((_, index) => {
      const pose = getMemoryCardPose(index, t);
      const arrive = smooth(26.2 + index * .34, 27.35 + index * .34, t);
      const dissolve = smooth(34.1 + index * .18, 36.85 + index * .18, t);
      drawCard(selection[index % selection.length], pose.x, pose.y, pose.size, pose.turn, inShot * arrive * (1 - dissolve));
    });
  }

  function drawMemoryWeave(t: number, poses: readonly CardPose[]) {
    const alpha = smooth(34, 36.35, t) * (1 - smooth(45.2, 48.1, t));
    if (alpha <= .001) return;
    const cx = width * .5;
    const cy = height * .52;
    context.save();
    context.lineCap = "round";
    context.globalCompositeOperation = "screen";
    poses.forEach((pose, index) => {
      const endX = cx + Math.cos(index * 1.7 + t * .28) * width * .055;
      const endY = cy + Math.sin(index * 1.2 + t * .31) * height * .045;
      context.globalAlpha = alpha * (.24 + index * .05);
      context.strokeStyle = index % 2 ? "#c72e47" : "#f2a36a";
      context.lineWidth = 1.05;
      context.beginPath();
      context.moveTo(pose.x, pose.y);
      context.bezierCurveTo(
        lerp(pose.x, cx, .35), pose.y - height * (.04 + index * .016),
        lerp(pose.x, cx, .72), cy + height * (.03 - index * .012),
        endX, endY,
      );
      context.stroke();
    });
    context.restore();
  }

  function drawMemoryDissolution(t: number) {
    const active = smooth(33.85, 35.2, t) * (1 - smooth(49.0, 50.15, t));
    if (active <= .001) return;
    const poses = memoryPositions.map((_, index) => getMemoryCardPose(index, t));
    const unit = Math.min(width, height);
    const cx = width * .5;
    const cy = height * .51;
    const roseReveal = smooth(44.45, 50.35, t);
    // Match the final rose scale exactly so the last storm particles land on
    // physical petals instead of expanding or snapping at the handoff.
    const flowerBase = unit * lerp(.075, .232, easeOut(roseReveal));
    drawMemoryWeave(t, poses);

    memoryPetals.forEach((seed, index) => {
      const releaseAt = 34.0 + seed.card * .18 + seed.c * .88;
      const release = smooth(releaseAt, releaseAt + 1.38, t);
      if (release <= .001) return;
      const source = poses[seed.card];
      const sourceX = source.x + (seed.a - .5) * source.size * .64;
      const sourceY = source.y + (seed.b - .5) * source.size * .72;
      const travel = smooth(35.85 + seed.c * .65, 42.45 + seed.c * .75, t);
      const spin = seed.a * TAU * 2.1 + (t - 34) * (1.2 + seed.d * 1.35);
      const stormRadius = unit * (.16 + seed.b * .26) * (1 - travel * .48);
      const stormX = cx + Math.cos(spin) * stormRadius;
      const stormY = cy + Math.sin(spin * 1.17) * stormRadius * .58 - travel * unit * (.025 + seed.e * .08);
      const petalIndex = seed.ring * 7 + seed.slot;
      const duplicate = Math.floor(index / 42);
      const irregularity = seeded(petalIndex, 91) - .5;
      const targetReveal = smooth(44.5 + (5 - seed.ring) * .15 + seeded(petalIndex, 92) * .46, 46.85 + (5 - seed.ring) * .19 + seeded(petalIndex, 92) * .52, t);
      const targetAngle = seed.slot / 7 * TAU + seed.ring * .34 + duplicate * .29 + irregularity * .42 + seeded(index, 96) * .16 + t * (.026 + seeded(petalIndex, 93) * .022);
      const targetRadius = flowerBase * (.1 + seed.ring * .18 + duplicate * .075) * (.18 + targetReveal * .82);
      const targetX = cx + Math.cos(targetAngle) * targetRadius;
      const targetY = cy + Math.sin(targetAngle) * targetRadius * (.46 + seeded(petalIndex, 94) * .13) + (duplicate ? unit * (.006 + seeded(index, 97) * .014) : 0);
      const settle = smooth(41.35 + seed.c * 1.05, 47.65 + seed.c * .75, t);
      const x = lerp(lerp(sourceX, stormX, travel), targetX, settle);
      const y = lerp(lerp(sourceY, stormY, travel), targetY, settle);
      const targetSize = flowerBase * (.21 + seed.ring * .092 + duplicate * .025) * (1 + irregularity * .28) * (.46 + targetReveal * .54);
      const size = lerp(unit * (.018 + seed.c * .017), targetSize, settle);
      const alpha = release * active * (.58 + seed.c * .26) * (1 - smooth(48.05 + seed.c * .4, 49.9 + seed.c * .35, t));
      petalShape(x, y, size, spin + Math.PI * .47 + settle * (targetAngle + Math.PI * .5 + irregularity * .15 - spin), alpha, seed.d);

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
    const reveal = smooth(44.45, 50.35, t);
    if (reveal <= .001) return;
    const cx = width * .5; const cy = height * .51; const base = Math.min(width, height) * lerp(.075, .232, easeOut(reveal));
    const stormCrossfade = smooth(46.2, 48.85, t);
    context.save(); context.globalCompositeOperation = "screen";
    const halo = context.createRadialGradient(cx, cy, 0, cx, cy, base * 3.2);
    halo.addColorStop(0, `rgba(215, 43, 75, ${reveal * .22})`); halo.addColorStop(.45, `rgba(111, 15, 41, ${reveal * .11})`); halo.addColorStop(1, "rgba(75, 7, 31, 0)"); context.fillStyle = halo; context.fillRect(0, 0, width, height);
    context.restore();
    // The six uneven rings deliberately read as a rose unfurling, rather than
    // a mathematically perfect radial flower.  The storm particles land in
    // these same rings a moment earlier, making the bloom feel earned.
    const layers = compact ? 28 : 42;
    for (let index = layers - 1; index >= 0; index -= 1) {
      const ring = Math.floor(index / 7); const within = index % 7;
      const irregularity = seeded(index, 91) - .5;
      const petalReveal = smooth(44.5 + (5 - ring) * .15 + seeded(index, 92) * .46, 46.85 + (5 - ring) * .19 + seeded(index, 92) * .52, t);
      const offset = seeded(index, 98) * .11 + (ring % 2 ? .16 : 0);
      const angle = within / 7 * TAU + ring * .34 + offset + irregularity * .42 + t * (.026 + seeded(index, 93) * .022);
      const distance = base * (.075 + ring * .18 + seeded(index, 99) * .035) * (.18 + petalReveal * .82);
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance * (.46 + seeded(index, 94) * .13);
      const size = base * (.21 + ring * .092 + seeded(index, 100) * .026) * (1 + irregularity * .28) * (.46 + petalReveal * .54);
      const alpha = petalReveal * (.28 + stormCrossfade * .72) * (.86 + ring * .028);
      petalShape(x, y, size, angle + Math.PI * .5 + irregularity * .18, alpha, seeded(index, 90));
    }
    for (let index = 0; index < 5; index += 1) {
      const curl = index / 5 * TAU + .35 + index * .11;
      const curlReveal = smooth(46.72 + index * .1, 48.22 + index * .1, t);
      petalShape(
        cx + Math.cos(curl) * base * (.035 + index * .006),
        cy + Math.sin(curl) * base * (.021 + index * .004),
        base * (.165 + index * .018),
        curl + Math.PI * .5 + .18,
        curlReveal,
        .18 + index * .1,
      );
    }
    const glintReveal = smooth(47.35, 50.15, t) * (1 - smooth(53.05, 53.5, t));
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

  function setLetter(t: number) {
    // The component owns the timed visual reveal so pause/resume remains
    // exact. The renderer only exposes the note to assistive technology after
    // the flower has had time to settle.
    const nextAccessible = t >= 49.55;
    if (nextAccessible === letterAccessible) return;
    letterAccessible = nextAccessible;
    letter.setAttribute("aria-hidden", nextAccessible ? "false" : "true");
  }

  function updateCue(t: number) {
    const next = t > 49.75 ? "paper" : t > 43.95 ? "finale" : t > 14.2 ? "threshold" : "";
    if (next && next !== cue) { cue = next; options.onCue?.(next); }
  }

  function render(t: number, force = false) {
    if (destroyed) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    fillBackground(t);
    drawDust(t, .85);
    drawStars(t);
    drawFlight(t);
    drawConstellations(t);
    drawMemories(t);
    drawMemoryDissolution(t);
    drawRose(t);
    setLetter(t);
    updateCue(t);
    const irisValue = smooth(53.08, 53.5, t);
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
    time = clamp(startAt, 0, DURATION - .01); cue = ""; lastIris = -1; paused = false; running = true;
    root.classList.remove("is-fallback"); root.classList.add("is-cinema-ready");
    previous = performance.now(); render(time, true); options.onProgress?.(time / DURATION); animation = requestAnimationFrame(tick);
  }
  function pause() { if (!running || paused || destroyed) return; paused = true; if (animation) cancelAnimationFrame(animation); animation = 0; }
  function resume() { if (!running || !paused || destroyed) return; paused = false; previous = performance.now(); animation = requestAnimationFrame(tick); }
  function reset() {
    if (animation) cancelAnimationFrame(animation); animation = 0; running = false; paused = false; time = 0; cue = ""; lastIris = -1; letterAccessible = false;
    letter.style.removeProperty("opacity"); letter.style.removeProperty("visibility"); letter.style.removeProperty("transform"); letter.setAttribute("aria-hidden", "true");
    if (vignette) vignette.style.setProperty("--rose-iris-close", "0"); render(0, true);
  }
  function destroy() { if (destroyed) return; reset(); destroyed = true; observer.disconnect(); if (resizeFrame) cancelAnimationFrame(resizeFrame); }

  render(0, true);
  return { start, pause, resume, reset, destroy, isPaused: () => paused, isRunning: () => running };
}
