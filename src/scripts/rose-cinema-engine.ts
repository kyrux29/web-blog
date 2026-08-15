import type * as ThreeTypes from "three";
import {
  CAPRICORN_CONSTELLATION,
  VIRGO_CONSTELLATION,
  createRoseConstellation,
} from "./rose-cinema-constellations";

export interface RoseCinemaOptions {
  THREE: typeof ThreeTypes;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onCue?: (cue: string) => void;
}

export interface RoseCinemaEngine {
  start: (startAt?: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  destroy: () => void;
  isPaused: () => boolean;
  isRunning: () => boolean;
}

const DURATION = 53.5;
const MOBILE_QUERY = "(max-width: 720px)";

type TimedValue = readonly [number, number];
type TimedVector = readonly [number, number, number, number];

type FlockSeed = {
  phase: number;
  delay: number;
  radius: number;
  scale: number;
  speed: number;
  swirl: number;
  /** Most of the flock stays inside the doorway; only two bats cross lens. */
  closePass: number;
  flutter: number;
};

type MemoryCard = {
  group: ThreeTypes.Group;
  base: ThreeTypes.Vector3;
  stack: ThreeTypes.Vector3;
  finale: ThreeTypes.Vector3;
  baseRotation: ThreeTypes.Euler;
  backing: ThreeTypes.Mesh<ThreeTypes.PlaneGeometry, ThreeTypes.MeshStandardMaterial>;
  image: ThreeTypes.Mesh<ThreeTypes.PlaneGeometry, ThreeTypes.MeshBasicMaterial>;
};

// Position keys are authored in seconds instead of being re-mapped over an
// arc-length curve. That keeps the camera physically behind the swarm while
// it rises, rather than accidentally overtaking the petals on a long segment.
const CAMERA_KEYS: readonly TimedVector[] = [
  [0, 0, 0.12, 7.5],
  [2.4, 0, 0.1, 5.25],
  [6.3, 0, 0.04, -1.65],
  [10.5, 0, 2.35, -12.45],
  [15.4, 0, 12.8, -22.45],
  [22.4, 0, 23.05, -41.2],
  // The descent from the constellations is intentionally long and gentle;
  // it is motivated by the thread rather than an abrupt scene drop.
  [25.7, 0, 19.35, -43.65],
  [29.4, 0, 9.35, -50.2],
  [34.2, 0, 0.7, -60.25],
  [39.3, 0, 0.3, -69.18],
  [45.3, 0, 0.28, -70.2],
  [49.2, 0, 0.42, -83.8],
  [DURATION, 0, 0.1, -86.8],
] as const;

const FOV_TIME_MAP: readonly TimedValue[] = [
  [0, 43],
  [6.8, 47.5],
  [15.2, 43],
  [23, 41.5],
  [34, 40],
  [40, 37],
  [45.5, 37],
  [49.2, 35.4],
  [DURATION, 34.4],
] as const;

function seeded(index: number, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = clamp((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

/**
 * A time-aware cubic Hermite curve. Unlike a chain of ease-in-out segments,
 * its velocity is continuous at every authored beat, so the camera never
 * brakes and restarts between scenes.
 */
function sampleTimedCurve(points: readonly TimedValue[], time: number) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (time > end[0]) continue;
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 2)];
    const duration = Math.max(0.001, end[0] - start[0]);
    const t = clamp((time - start[0]) / duration);
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    const startSlope = (end[1] - previous[1]) / Math.max(0.001, end[0] - previous[0]);
    const endSlope = (next[1] - start[1]) / Math.max(0.001, next[0] - start[0]);
    return h00 * start[1] + h10 * duration * startSlope + h01 * end[1] + h11 * duration * endSlope;
  }
  return points[points.length - 1][1];
}

function sampleTimedVector(
  points: readonly TimedVector[],
  time: number,
  output: ThreeTypes.Vector3,
) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (time > end[0]) continue;
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 2)];
    const duration = Math.max(0.001, end[0] - start[0]);
    const t = clamp((time - start[0]) / duration);
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
    const h10 = t ** 3 - 2 * t ** 2 + t;
    const h01 = -2 * t ** 3 + 3 * t ** 2;
    const h11 = t ** 3 - t ** 2;
    const previousDuration = Math.max(0.001, end[0] - previous[0]);
    const nextDuration = Math.max(0.001, next[0] - start[0]);
    const startSlopeX = (end[1] - previous[1]) / previousDuration * duration;
    const startSlopeY = (end[2] - previous[2]) / previousDuration * duration;
    const startSlopeZ = (end[3] - previous[3]) / previousDuration * duration;
    const endSlopeX = (next[1] - start[1]) / nextDuration * duration;
    const endSlopeY = (next[2] - start[2]) / nextDuration * duration;
    const endSlopeZ = (next[3] - start[3]) / nextDuration * duration;
    output.set(
      h00 * start[1] + h10 * startSlopeX + h01 * end[1] + h11 * endSlopeX,
      h00 * start[2] + h10 * startSlopeY + h01 * end[2] + h11 * endSlopeY,
      h00 * start[3] + h10 * startSlopeZ + h01 * end[3] + h11 * endSlopeZ,
    );
    return output;
  }
  const last = points[points.length - 1];
  return output.set(last[1], last[2], last[3]);
}

function makeBatGeometry(THREE: typeof ThreeTypes) {
  const shape = new THREE.Shape();
  // Deliberately draw a winged silhouette rather than a symmetric leaf. The
  // small ears, scalloped trailing edge and a shallow extrusion keep bats
  // readable when the camera is moving without needing a texture atlas.
  shape.moveTo(0, 0.03);
  shape.lineTo(-0.12, 0.39);
  shape.lineTo(-0.26, 0.18);
  shape.bezierCurveTo(-0.5, 0.35, -0.88, 0.35, -1.16, 0.08);
  shape.bezierCurveTo(-1.04, -0.04, -0.92, -0.18, -0.82, -0.32);
  shape.bezierCurveTo(-0.64, -0.2, -0.47, -0.13, -0.34, -0.29);
  shape.bezierCurveTo(-0.2, -0.18, -0.11, -0.12, 0, -0.05);
  shape.bezierCurveTo(0.11, -0.12, 0.2, -0.18, 0.34, -0.29);
  shape.bezierCurveTo(0.47, -0.13, 0.64, -0.2, 0.82, -0.32);
  shape.bezierCurveTo(0.92, -0.18, 1.04, -0.04, 1.16, 0.08);
  shape.bezierCurveTo(0.88, 0.35, 0.5, 0.35, 0.26, 0.18);
  shape.lineTo(0.12, 0.39);
  shape.lineTo(0, 0.03);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    curveSegments: 12,
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  geometry.scale(0.42, 0.42, 0.42);
  geometry.translate(0, 0, -0.012);
  return geometry;
}

function makePetalGeometry(THREE: typeof ThreeTypes) {
  // A curved, cupped surface catches the key light differently across every
  // rotation. This replaces the former extruded cut-out, which read as a flat
  // heart/disc whenever a petal came close to the lens.
  const across = 10;
  const along = 11;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= along; row += 1) {
    const v = row / along;
    const width = Math.pow(Math.sin(v * Math.PI), 0.64) * (0.74 - v * 0.08);
    for (let column = 0; column <= across; column += 1) {
      const u = -1 + (column / across) * 2;
      const edgeFlutter = 1 + Math.sin((v * 4.2 + u * 2.6) * Math.PI) * 0.035;
      const x = u * width * edgeFlutter;
      const y = (v - 0.5) * 1.92 + Math.sin(v * Math.PI) * 0.035;
      // The cup rises through the centre, with a slight asymmetric twist.
      const z = Math.sin(v * Math.PI) * (1 - u * u) * 0.26 + u * v * 0.055 - v * 0.055;
      positions.push(x, y, z);
      const lightness = 0.58 + v * 0.34 + (1 - Math.abs(u)) * 0.08;
      colors.push(lightness, lightness * 0.9, lightness * 0.92);
    }
  }
  const rowSize = across + 1;
  for (let row = 0; row < along; row += 1) {
    for (let column = 0; column < across; column += 1) {
      const a = row * rowSize + column;
      const b = a + 1;
      const c = a + rowSize;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.scale(0.42, 0.42, 0.42);
  geometry.translate(0, 0, -0.03);
  return geometry;
}

function createGlow(THREE: typeof ThreeTypes, color: number, size: number, opacity: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,235,218,1)");
    gradient.addColorStop(0.16, "rgba(212,42,70,.82)");
    gradient.addColorStop(0.52, "rgba(104,17,28,.24)");
    gradient.addColorStop(1, "rgba(8,4,10,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ color, map: texture, transparent: true, opacity, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  return sprite;
}

function waitForImage(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0) return Promise.resolve();
  return image.decode().catch(() => undefined);
}

function createDoorway(THREE: typeof ThreeTypes) {
  const group = new THREE.Group();
  group.position.set(0, 0, -3.05);
  // Keep the threshold legible in the first dark shot.  These are still
  // oxblood surfaces, but the rim carries enough moonlight to read as a door
  // before the camera commits to the black interior.
  const trim = new THREE.MeshStandardMaterial({ color: 0x4a1024, metalness: 0.18, roughness: 0.56, emissive: 0x17030b, emissiveIntensity: 0.58, transparent: true });
  const trimEdge = new THREE.MeshStandardMaterial({ color: 0xa52848, metalness: 0.12, roughness: 0.48, emissive: 0x4d0b1a, emissiveIntensity: 0.78, transparent: true });
  const wood = new THREE.MeshStandardMaterial({ color: 0x2c0a18, roughness: 0.78, metalness: 0.03, emissive: 0x0f0208, emissiveIntensity: 0.34, transparent: true });
  const inset = new THREE.MeshStandardMaterial({ color: 0x16040b, roughness: 0.74, metalness: 0.02, emissive: 0x050103, emissiveIntensity: 0.36, transparent: true });
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x030105, transparent: true, opacity: 0.82, depthWrite: false });
  const materials: ThreeTypes.Material[] = [trim, trimEdge, wood, inset, voidMaterial];
  const geometries: ThreeTypes.BufferGeometry[] = [];

  const voidGeometry = new THREE.PlaneGeometry(3.9, 4.5);
  geometries.push(voidGeometry);
  const voidPlane = new THREE.Mesh(voidGeometry, voidMaterial);
  voidPlane.position.z = -0.16;
  group.add(voidPlane);

  const pillarGeometry = new THREE.BoxGeometry(0.34, 4.75, 0.5);
  geometries.push(pillarGeometry);
  const leftPillar = new THREE.Mesh(pillarGeometry, trim);
  const rightPillar = leftPillar.clone();
  leftPillar.position.set(-2.08, 0, 0);
  rightPillar.position.set(2.08, 0, 0);
  group.add(leftPillar, rightPillar);

  const innerPillarGeometry = new THREE.BoxGeometry(0.1, 4.45, 0.6);
  geometries.push(innerPillarGeometry);
  const innerLeft = new THREE.Mesh(innerPillarGeometry, trimEdge);
  const innerRight = innerLeft.clone();
  innerLeft.position.set(-1.82, 0.03, 0.08);
  innerRight.position.set(1.82, 0.03, 0.08);
  group.add(innerLeft, innerRight);

  const headerGeometry = new THREE.BoxGeometry(4.5, 0.26, 0.5);
  geometries.push(headerGeometry);
  const header = new THREE.Mesh(headerGeometry, trim);
  header.position.set(0, 2.32, 0);
  group.add(header);

  const archGeometry = new THREE.TorusGeometry(2.06, 0.13, 8, 36, Math.PI);
  geometries.push(archGeometry);
  const arch = new THREE.Mesh(archGeometry, trimEdge);
  arch.position.y = 0.3;
  group.add(arch);

  // A continuous moonlit outline keeps the arch legible while its interior is
  // deliberately near-black. It is a real tube in the scene rather than a
  // screen-space frame, so the flock can still fly through it.
  const outlinePoints: ThreeTypes.Vector3[] = [new THREE.Vector3(-2.12, -2.34, 0.42), new THREE.Vector3(-2.12, 0.28, 0.42)];
  for (let index = 1; index <= 14; index += 1) {
    const angle = Math.PI - (Math.PI * index) / 14;
    outlinePoints.push(new THREE.Vector3(Math.cos(angle) * 2.12, 0.28 + Math.sin(angle) * 2.12, 0.42));
  }
  outlinePoints.push(new THREE.Vector3(2.12, -2.34, 0.42));
  const outlineGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outlinePoints), 56, 0.075, 7, false);
  const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xd63b58, transparent: true, opacity: 0.74, depthWrite: false });
  const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  outline.renderOrder = -1;
  group.add(outline);
  geometries.push(outlineGeometry);
  materials.push(outlineMaterial);

  const leftHinge = new THREE.Group();
  const rightHinge = new THREE.Group();
  leftHinge.position.set(-0.06, 0, 0.12);
  rightHinge.position.set(0.06, 0, 0.12);
  const leafGeometry = new THREE.BoxGeometry(1.86, 4.3, 0.16);
  geometries.push(leafGeometry);
  const leftLeaf = new THREE.Mesh(leafGeometry, wood);
  const rightLeaf = new THREE.Mesh(leafGeometry, wood);
  leftLeaf.position.x = -0.93;
  rightLeaf.position.x = 0.93;
  leftHinge.add(leftLeaf);
  rightHinge.add(rightLeaf);

  // Two recessed panels and a slim spine per leaf give the door an old,
  // constructed materiality. They use shared geometry/materials so this only
  // affects the brief threshold shot, not the moving-film budget.
  const panelGeometry = new THREE.BoxGeometry(1.42, 1.6, 0.05);
  const railGeometry = new THREE.BoxGeometry(1.5, 0.055, 0.07);
  const spineGeometry = new THREE.BoxGeometry(0.055, 4.0, 0.07);
  geometries.push(panelGeometry, railGeometry, spineGeometry);
  const addLeafPanels = (hinge: ThreeTypes.Group, leafX: number) => {
    [-0.92, 0.92].forEach((y) => {
      const panel = new THREE.Mesh(panelGeometry, inset);
      panel.position.set(leafX, y, 0.112);
      hinge.add(panel);
    });
    [-1.83, 0, 1.83].forEach((y) => {
      const rail = new THREE.Mesh(railGeometry, trim);
      rail.position.set(leafX, y, 0.145);
      hinge.add(rail);
    });
    const spine = new THREE.Mesh(spineGeometry, trim);
    spine.position.set(leafX, 0, 0.145);
    hinge.add(spine);
  };
  addLeafPanels(leftHinge, -0.93);
  addLeafPanels(rightHinge, 0.93);
  group.add(leftHinge, rightHinge);

  // A quiet keyhole sigil is more Gothic than the previous glowing ring.
  const sigilGeometry = new THREE.CircleGeometry(0.2, 12);
  const sigilCoreGeometry = new THREE.CircleGeometry(0.105, 12);
  const keyStemGeometry = new THREE.BoxGeometry(0.075, 0.25, 0.025);
  geometries.push(sigilGeometry, sigilCoreGeometry, keyStemGeometry);
  const sigil = new THREE.Mesh(sigilGeometry, trimEdge);
  const sigilCore = new THREE.Mesh(sigilCoreGeometry, voidMaterial);
  const keyStem = new THREE.Mesh(keyStemGeometry, trimEdge);
  sigil.position.set(0, 0.13, 0.22);
  sigilCore.position.set(0, 0.13, 0.246);
  keyStem.position.set(0, -0.06, 0.225);
  group.add(sigil, sigilCore, keyStem);

  return { group, leftHinge, rightHinge, materials, geometries };
}

export async function createRoseCinemaEngine(
  root: HTMLElement,
  options: RoseCinemaOptions,
): Promise<RoseCinemaEngine> {
  const { THREE } = options;
  const canvas = root.querySelector<HTMLCanvasElement>("#rose-cinema-canvas");
  const letterCandidate = root.querySelector<HTMLElement>("#rose-cinema-letter");
  const iris = root.querySelector<HTMLElement>(".rose-cinema-vignette");
  if (!canvas || !letterCandidate) throw new Error("Rose cinema DOM is incomplete");
  const letterElement: HTMLElement = letterCandidate;

  const probe = document.createElement("canvas");
  if (!probe.getContext("webgl2")) throw new Error("WebGL2 is unavailable");

  const images = Array.from(root.querySelectorAll<HTMLImageElement>("[data-rose-texture]"));
  // The opening only needs the illustrated room and four small memory frames.
  // Portrait assets stay encrypted in the page but no longer block the first shot.
  const neededKeys = new Set(["painted-2", "photo-1", "photo-2", "photo-3", "photo-4", "photo-5"]);
  const neededImages = images.filter((image) => neededKeys.has(image.dataset.roseTexture ?? ""));
  await Promise.all(neededImages.map(waitForImage));

  const mobile = window.matchMedia(MOBILE_QUERY).matches;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const lite = mobile || connection?.saveData === true || deviceMemory <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  const horizontalCompression = mobile ? 0.56 : 1;
  let pixelRatio = Math.min(devicePixelRatio || 1, 1.25);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: !lite,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: "default",
    failIfMajorPerformanceCaveat: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setClearColor(0x08050d, 1);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08050d);
  scene.fog = new THREE.FogExp2(0x08050d, 0.018);
  const cameraRig = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(mobile ? 48 : 43, 1, 0.05, 155);
  cameraRig.add(camera);
  scene.add(cameraRig);

  const ambient = new THREE.AmbientLight(0x32111f, 1.12);
  const moon = new THREE.DirectionalLight(0xdde7f7, 1.46);
  moon.position.set(-8, 11, 5);
  const roseLight = new THREE.PointLight(0xcf2e49, 18, 22, 2);
  roseLight.position.set(0, 1, -15);
  const parchmentLight = new THREE.PointLight(0xeee1c8, 0, 13, 2);
  parchmentLight.position.set(0, 2, -68);
  scene.add(ambient, moon, roseLight, parchmentLight);

  const disposables: Array<{ dispose: () => void }> = [];
  const textureByName = new Map<string, ThreeTypes.Texture>();
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  for (const image of neededImages) {
    if (!image.naturalWidth) continue;
    const texture = new THREE.Texture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(2, maxAnisotropy);
    texture.needsUpdate = true;
    textureByName.set(image.dataset.roseTexture ?? "", texture);
    disposables.push(texture);
  }

  const world = new THREE.Group();
  scene.add(world);

  const doorway = createDoorway(THREE);
  // A portrait viewport has much less horizontal field-of-view than desktop.
  // Compress only the doorway set so its crimson frame remains readable
  // around the swarm instead of disappearing beyond both screen edges.
  doorway.group.scale.x = mobile ? 0.7 : 1;
  world.add(doorway.group);
  doorway.geometries.forEach((geometry) => disposables.push(geometry));
  doorway.materials.forEach((material) => disposables.push(material));

  const portalGlow = createGlow(THREE, 0xffffff, 3.55, 0.14);
  portalGlow.position.set(0, -0.12, -3.33);
  world.add(portalGlow);
  disposables.push(portalGlow.material, (portalGlow.material as ThreeTypes.SpriteMaterial).map!);

  const batGeometry = makeBatGeometry(THREE);
  const petalGeometry = makePetalGeometry(THREE);
  const flockCount = lite ? 30 : 54;
  const flockSeeds: FlockSeed[] = Array.from({ length: flockCount }, (_, index) => ({
    phase: seeded(index, 1) * Math.PI * 2,
    delay: seeded(index, 2) * 1.5,
    radius: 0.7 + seeded(index, 3) * 2.1,
    scale: 0.2 + seeded(index, 4) * 0.27,
    speed: 0.72 + seeded(index, 5) * 0.64,
    swirl: 2.35 + seeded(index, 6) * 1.25,
    // The body of the flock remains inside the Gothic threshold. Only two
    // bats deliberately pass near the lens to bridge the handoff.
    closePass: 0.15 + seeded(index, 7) * 2.15,
    flutter: 0.76 + seeded(index, 8) * 0.58,
  }));
  // Two deliberately-authored foreground bats create a clean silhouette
  // across the lens. They hide the DOM-to-WebGL handoff without resorting to
  // a flash, while the rest of the flock stays organically irregular.
  flockSeeds[0] = { phase: 0.18, delay: 0.04, radius: 0.18, scale: 0.32, speed: 1.04, swirl: 2.8, closePass: 3.15, flutter: 1.12 };
  flockSeeds[1] = { phase: Math.PI + 0.36, delay: 0.24, radius: 0.32, scale: 0.3, speed: 0.92, swirl: 2.56, closePass: 2.15, flutter: 0.94 };

  // The wing deformation happens on the GPU. It keeps the flock to one draw
  // call yet gives every silhouette a separate, three-dimensional wing beat
  // instead of the old whole-bat scale wobble.
  const batWingPhases = new Float32Array(flockCount);
  flockSeeds.forEach((seed, index) => { batWingPhases[index] = seed.phase; });
  batGeometry.setAttribute("aRoseWingPhase", new THREE.InstancedBufferAttribute(batWingPhases, 1));
  let batWingClock: { value: number } | null = null;
  const batMaterial = new THREE.MeshStandardMaterial({
    color: 0x070308,
    emissive: 0x1c0610,
    emissiveIntensity: 0.24,
    roughness: 0.7,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  batMaterial.onBeforeCompile = (shader) => {
    const wingUniform = { value: 0 };
    shader.uniforms.uRoseWingTime = wingUniform;
    batWingClock = wingUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float aRoseWingPhase;\nuniform float uRoseWingTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
float roseWingWeight = smoothstep(0.08, 0.94, abs(transformed.x));
float roseWingBeat = sin(uRoseWingTime * 12.8 + aRoseWingPhase);
transformed.z += roseWingBeat * roseWingWeight * 0.2;
transformed.y += (1.0 - cos(roseWingBeat)) * roseWingWeight * 0.032;`,
      );
  };
  batMaterial.customProgramCacheKey = () => "rose-bat-wings-v1";
  const petalMaterial = new THREE.MeshStandardMaterial({
    color: 0xd23b52,
    emissive: 0x6d1026,
    emissiveIntensity: 0.9,
    roughness: 0.5,
    metalness: 0.015,
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const bats = new THREE.InstancedMesh(batGeometry, batMaterial, flockCount);
  const petals = new THREE.InstancedMesh(petalGeometry, petalMaterial, flockCount);
  bats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bats.frustumCulled = false;
  petals.frustumCulled = false;
  world.add(bats, petals);
  disposables.push(batGeometry, petalGeometry, batMaterial, petalMaterial);

  const starCount = lite ? 620 : 1450;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starColor = new THREE.Color();
  for (let index = 0; index < starCount; index += 1) {
    const depth = seeded(index, 12);
    starPositions[index * 3] = (seeded(index, 10) - 0.5) * 58;
    starPositions[index * 3 + 1] = 4 + seeded(index, 11) * 42;
    starPositions[index * 3 + 2] = -33 - depth * 50;
    starColor.setHex(index % 11 === 0 ? 0xffc987 : index % 17 === 0 ? 0xef6680 : 0xdde7f7);
    starColor.multiplyScalar(0.58 + seeded(index, 13) * 0.42);
    starColors.set([starColor.r, starColor.g, starColor.b], index * 3);
  }
  const skyGeometry = new THREE.BufferGeometry();
  skyGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  skyGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const skyMaterial = new THREE.PointsMaterial({ color: 0xffffff, vertexColors: true, size: mobile ? 0.072 : 0.07, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const sky = new THREE.Points(skyGeometry, skyMaterial);
  sky.visible = false;
  world.add(sky);
  disposables.push(skyGeometry, skyMaterial);

  const constellationScale = mobile ? 0.43 : 1.12;
  const constellationX = mobile ? 1.5 : 6.4;
  const virgo = createRoseConstellation(THREE, VIRGO_CONSTELLATION, { mobile, scale: constellationScale, starSize: mobile ? 0.28 : 0.22, starOpacity: 1, lineOpacity: 0.78, lineColor: 0xd6dff2 });
  const capricorn = createRoseConstellation(THREE, CAPRICORN_CONSTELLATION, { mobile, scale: constellationScale, starSize: mobile ? 0.28 : 0.22, starOpacity: 1, lineOpacity: 0.75, lineColor: 0xe0d2e9 });
  virgo.group.position.set(-constellationX, 24.4, -51.5);
  capricorn.group.position.set(constellationX, 22.5, -52.3);
  virgo.group.rotation.y = 0.06;
  capricorn.group.rotation.y = -0.08;
  virgo.group.visible = false;
  capricorn.group.visible = false;
  world.add(virgo.group, capricorn.group);

  // A few petals physically land on the authored stars. That makes the sky
  // a consequence of the vortex instead of a separate layer fading in.
  world.updateMatrixWorld(true);
  const constellationLandingTargets = [
    ...VIRGO_CONSTELLATION.stars.map((star) => new THREE.Vector3(...star.position).applyMatrix4(virgo.group.matrixWorld)),
    ...CAPRICORN_CONSTELLATION.stars.map((star) => new THREE.Vector3(...star.position).applyMatrix4(capricorn.group.matrixWorld)),
  ];

  const threadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.7 * horizontalCompression, 21.7, -50.4),
    new THREE.Vector3(-1.2 * horizontalCompression, 22.4, -48.6),
    new THREE.Vector3(2.2 * horizontalCompression, 18.1, -43.2),
    new THREE.Vector3(0, 5.5, -44.5),
  ], false, "centripetal");
  const threadGeometry = new THREE.BufferGeometry().setFromPoints(threadCurve.getPoints(56));
  const threadMaterial = new THREE.LineBasicMaterial({ color: 0xd84259, transparent: true, opacity: 0, depthWrite: false });
  const redThread = new THREE.Line(threadGeometry, threadMaterial);
  redThread.visible = false;
  world.add(redThread);
  disposables.push(threadGeometry, threadMaterial);
  // One travelling ember gives the thread a clear source and destination. It
  // is intentionally tiny: the camera follows a physical filament rather
  // than being pushed through another abstract light effect.
  const threadEmber = createGlow(THREE, 0xd84259, 0.62, 0);
  threadEmber.visible = false;
  world.add(threadEmber);
  disposables.push(threadEmber.material, (threadEmber.material as ThreeTypes.SpriteMaterial).map!);

  const memoryWorld = new THREE.Group();
  world.add(memoryWorld);
  const roomTexture = textureByName.get("painted-2");
  let memoryBackdrop: ThreeTypes.Mesh<ThreeTypes.PlaneGeometry, ThreeTypes.MeshBasicMaterial> | null = null;
  if (roomTexture) {
    const geometry = new THREE.PlaneGeometry(9.6, 9.6);
    const material = new THREE.MeshBasicMaterial({ map: roomTexture, transparent: true, opacity: 0, depthWrite: false });
    memoryBackdrop = new THREE.Mesh(geometry, material);
    memoryBackdrop.position.set(0, 5.85, -59);
    memoryWorld.add(memoryBackdrop);
    disposables.push(geometry, material);
  }

  const memorySpecs: Array<[string, [number, number, number], [number, number]]> = [
    ["photo-1", [-3.15, 8.15, -48.7], [1.46, 1.64]],
    ["photo-3", [2.62, 7.05, -50.8], [1.76, 1.89]],
    ["photo-4", [-0.8, 4.85, -52.1], [1.48, 1.48]],
    ["photo-5", [3.02, 5.75, -54.1], [1.48, 1.55]],
  ];
  const memories: MemoryCard[] = [];
  memorySpecs.forEach(([key, rawPosition, size], index) => {
    const texture = textureByName.get(key);
    if (!texture) return;
    const group = new THREE.Group();
    const backingGeometry = new THREE.PlaneGeometry(size[0] * 1.12, size[1] * 1.12);
    const backingMaterial = new THREE.MeshStandardMaterial({ color: 0xeadcc4, roughness: 0.88, transparent: true, opacity: 0 });
    const backing = new THREE.Mesh(backingGeometry, backingMaterial);
    backing.position.z = -0.022;
    const imageGeometry = new THREE.PlaneGeometry(size[0], size[1]);
    const imageMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
    const image = new THREE.Mesh(imageGeometry, imageMaterial);
    group.add(backing, image);
    const base = new THREE.Vector3(rawPosition[0] * horizontalCompression, rawPosition[1], rawPosition[2]);
    group.position.copy(base).add(new THREE.Vector3(0, index % 2 ? -1.6 : 1.4, 2.3));
    const baseRotation = new THREE.Euler((seeded(index, 20) - 0.5) * 0.16, (seeded(index, 21) - 0.5) * 0.16, (seeded(index, 22) - 0.5) * 0.22);
    group.rotation.copy(baseRotation);
    group.scale.setScalar(0.04);
    group.visible = false;
    memoryWorld.add(group);
    memories.push({
      group,
      base,
      stack: new THREE.Vector3((index - 1.5) * 0.028, (index - 1.5) * 0.02, -68.4 - index * 0.02),
      finale: new THREE.Vector3(Math.cos(index / 4 * Math.PI * 2) * 4.1 * horizontalCompression, Math.sin(index / 4 * Math.PI * 2) * 2.35, -92.6 + (index % 2) * 0.4),
      baseRotation,
      backing,
      image,
    });
    disposables.push(backingGeometry, backingMaterial, imageGeometry, imageMaterial);
  });

  const envelope = new THREE.Group();
  envelope.position.set(0, 0, -69.45);
  envelope.scale.setScalar(0.01);
  envelope.visible = false;
  const envelopeBackMaterial = new THREE.MeshStandardMaterial({ color: 0xeadcc4, roughness: 0.88, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const flapMaterial = envelopeBackMaterial.clone();
  const innerPaperMaterial = envelopeBackMaterial.clone();
  const envelopeBackGeometry = new THREE.BoxGeometry(4.6, 2.85, 0.16);
  const envelopeBack = new THREE.Mesh(envelopeBackGeometry, envelopeBackMaterial);
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-2.25, 0);
  flapShape.lineTo(2.25, 0);
  flapShape.lineTo(0, -2.16);
  flapShape.closePath();
  const flapGeometry = new THREE.ShapeGeometry(flapShape);
  const flap = new THREE.Mesh(flapGeometry, flapMaterial);
  const flapHinge = new THREE.Group();
  flapHinge.position.set(0, 1.4, 0.13);
  flapHinge.add(flap);
  const innerPaperGeometry = new THREE.PlaneGeometry(3.82, 5.15);
  const innerPaper = new THREE.Mesh(innerPaperGeometry, innerPaperMaterial);
  innerPaper.position.set(0, 0.2, 0.2);
  const sealGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.11, 32);
  const sealMaterial = new THREE.MeshStandardMaterial({ color: 0x68111c, emissive: 0x26050c, roughness: 0.5 });
  const seal = new THREE.Mesh(sealGeometry, sealMaterial);
  seal.position.set(0, 0.15, 0.32);
  seal.rotation.x = Math.PI / 2;
  envelope.add(envelopeBack, flapHinge, innerPaper, seal);
  world.add(envelope);
  disposables.push(envelopeBackGeometry, envelopeBackMaterial, flapGeometry, flapMaterial, innerPaperGeometry, innerPaperMaterial, sealGeometry, sealMaterial);

  const finale = new THREE.Group();
  finale.position.set(0, 0, -94);
  finale.scale.setScalar(1.9);
  finale.visible = false;
  const finaleGlow = createGlow(THREE, 0xb52432, 6.8, 0.46);
  finale.add(finaleGlow);
  const finaleMaterial = new THREE.MeshStandardMaterial({ color: 0xa51f34, emissive: 0x3d0714, emissiveIntensity: 0.72, roughness: 0.64, vertexColors: true, side: THREE.DoubleSide });
  const finaleCount = lite ? 18 : 32;
  const finalePetals = new THREE.InstancedMesh(petalGeometry, finaleMaterial, finaleCount);
  finalePetals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  finalePetals.frustumCulled = false;
  finale.add(finalePetals);
  const finaleCoreGeometry = new THREE.SphereGeometry(0.44, 24, 20);
  const finaleCoreMaterial = new THREE.MeshStandardMaterial({ color: 0x611025, emissive: 0xd52c46, emissiveIntensity: 0.86, roughness: 0.34 });
  const finaleCore = new THREE.Mesh(finaleCoreGeometry, finaleCoreMaterial);
  finaleCore.position.z = -0.24;
  finale.add(finaleCore);
  world.add(finale);
  disposables.push(finaleGlow.material, (finaleGlow.material as ThreeTypes.SpriteMaterial).map!, finaleMaterial, finaleCoreGeometry, finaleCoreMaterial);

  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  const baseCameraTarget = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const futurePosition = new THREE.Vector3();
  const skyFocus = new THREE.Vector3(0, 23.3, -51.5);
  const vortexCameraFocus = new THREE.Vector3();
  const letterFocus = new THREE.Vector3(0, 0.5, -70.2);
  const batPosition = new THREE.Vector3();
  const batFuturePosition = new THREE.Vector3();
  const vortexPosition = new THREE.Vector3();
  const vortexFuturePosition = new THREE.Vector3();
  const blendedPosition = new THREE.Vector3();
  const blendedFuturePosition = new THREE.Vector3();
  const flightDirection = new THREE.Vector3();
  const cardPosition = new THREE.Vector3();
  const batDummy = new THREE.Object3D();
  const petalDummy = new THREE.Object3D();
  const finaleDummy = new THREE.Object3D();
  let currentTime = 0;
  let animationFrame = 0;
  let resizeFrame = 0;
  let lastFrameTime = 0;
  let lastProgressTime = 0;
  let slowFrames = 0;
  let lastFov = camera.fov;
  let lastLetter = -1;
  let lastIris = -1;
  let running = false;
  let paused = false;
  let destroyed = false;
  let lastCue = "";

  function updateDoor(time: number) {
    const opening = smoothstep(0.08, 2.35, time);
    const exit = smoothstep(5.9, 7.45, time);
    doorway.group.visible = time < 7.6;
    doorway.leftHinge.rotation.y = -opening * 1.06;
    doorway.rightHinge.rotation.y = opening * 1.06;
    doorway.materials.forEach((material) => {
      if ("opacity" in material) (material as ThreeTypes.Material & { opacity: number }).opacity = 1 - exit;
    });
    (portalGlow.material as ThreeTypes.SpriteMaterial).opacity = (0.08 + opening * 0.16) * (1 - exit);
    portalGlow.scale.setScalar(3.3 + opening * 0.9);
  }

  function getBatFlight(seed: FlockSeed, time: number, output: ThreeTypes.Vector3) {
    const local = clamp((time - seed.delay) / 8.4);
    const angle = seed.phase + time * seed.speed * 1.72;
    const outward = smoothstep(0, 0.22, local);
    const returning = smoothstep(0.2, 0.72, local);
    const radius = THREE.MathUtils.lerp(0.12 + seed.radius * outward, 0.46, returning);
    const z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(-3.05, seed.closePass, outward), -9.2, returning);
    output.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 1.14) * radius * 0.62 + Math.sin(seed.phase * 2) * 0.22,
      z,
    );
    return local;
  }

  function getVortexCameraFocus(time: number, output: ThreeTypes.Vector3) {
    const entry = smoothstep(4.25, 6.1, time);
    const lift = smoothstep(6.1, 15.6, time);
    return output.set(
      0,
      THREE.MathUtils.lerp(0.16, 23.8, lift),
      THREE.MathUtils.lerp(THREE.MathUtils.lerp(-4.8, -9.2, entry), -37.5, lift),
    );
  }

  function getVortexFlight(seed: FlockSeed, time: number, output: ThreeTypes.Vector3) {
    const entry = smoothstep(4.25 + seed.delay * 0.18, 6.1 + seed.delay * 0.24, time);
    const lift = smoothstep(6.1 + seed.delay * 0.4, 15.5 + seed.delay * 0.22, time);
    const theta = seed.phase + (time - 5.8) * seed.swirl;
    const radius = THREE.MathUtils.lerp(2.76 + seed.radius * 0.36, 0.22 + seeded(Math.round(seed.phase * 10), 32) * 0.2, lift);
    const centerY = THREE.MathUtils.lerp(0.1, 23.8, lift);
    const centerZ = THREE.MathUtils.lerp(THREE.MathUtils.lerp(-4.8, -9.2, entry), -37.5, lift);
    output.set(
      Math.cos(theta) * radius,
      centerY + Math.sin(theta * 1.08) * radius * 0.58,
      centerZ + Math.sin(theta * 0.72) * radius * 0.5,
    );
    return { lift, theta };
  }

  function updateFlock(time: number) {
    const petalFade = 1 - smoothstep(15.65, 17.8, time);
    bats.visible = time <= 10.8;
    petals.visible = time >= 3.7 && time <= 21.85;
    if (!bats.visible && !petals.visible) return;
    batMaterial.opacity = 0.96 * (1 - smoothstep(8.9, 10.8, time));
    if (batWingClock) batWingClock.value = time;
    let petalOpacity = petalFade;
    for (let index = 0; index < flockCount; index += 1) {
      const seed = flockSeeds[index];
      const local = getBatFlight(seed, time, batPosition);
      const { lift, theta } = getVortexFlight(seed, time, vortexPosition);
      const morph = smoothstep(4.55 + seed.delay * 0.62, 7.35 + seed.delay * 0.62, time);
      blendedPosition.copy(batPosition).lerp(vortexPosition, morph);
      const nextTime = Math.min(18.4, time + 0.045);
      getBatFlight(seed, nextTime, batFuturePosition);
      getVortexFlight(seed, nextTime, vortexFuturePosition);
      const nextMorph = smoothstep(4.55 + seed.delay * 0.62, 7.35 + seed.delay * 0.62, nextTime);
      blendedFuturePosition.copy(batFuturePosition).lerp(vortexFuturePosition, nextMorph);
      flightDirection.subVectors(blendedFuturePosition, blendedPosition);
      if (flightDirection.lengthSq() < 0.00001) flightDirection.set(0, 0, -1);
      else flightDirection.normalize();
      const activeIn = smoothstep(seed.delay, seed.delay + 0.48, time);
      const isConstellationPetal = index < constellationLandingTargets.length;
      const landingAt = index < VIRGO_CONSTELLATION.stars.length
        ? 14.15 + index * 0.5
        : 17.15 + (index - VIRGO_CONSTELLATION.stars.length) * 0.5;
      const landing = isConstellationPetal ? smoothstep(landingAt - 0.86, landingAt, time) : 0;
      const captureFade = isConstellationPetal ? 1 - smoothstep(landingAt, landingAt + 0.34, time) : 0;
      const activeOut = isConstellationPetal ? Math.max(petalFade, captureFade) : petalFade;
      const active = activeIn * activeOut;
      const lensPass = index < 2
        ? 1 + smoothstep(0.45 + index * 0.22, 1.8 + index * 0.22, time) * (1 - smoothstep(1.8 + index * 0.22, 2.8 + index * 0.22, time)) * (index === 0 ? 2.1 : 1.28)
        : 1;
      batDummy.position.copy(blendedPosition);
      const flightDepth = Math.max(0.12, Math.abs(flightDirection.z));
      const pitch = Math.atan2(flightDirection.y, flightDepth);
      const yaw = Math.atan2(flightDirection.x, flightDepth);
      batDummy.rotation.set(
        -pitch * 0.42 + Math.sin(time * 2.2 + index) * 0.026,
        yaw * 0.46 + Math.cos(time * 1.3 + index * 0.62) * 0.03,
        Math.sin(time * 1.45 + index * 1.4) * 0.11 + seed.phase * 0.14,
      );
      const batScale = seed.scale * active * (1 - morph) * lensPass;
      const wingSqueeze = 0.94 + Math.sin(time * 12.8 + seed.phase) * 0.075 * seed.flutter;
      batDummy.scale.set(batScale * wingSqueeze, batScale * 0.96, batScale);
      batDummy.updateMatrix();
      bats.setMatrixAt(index, batDummy.matrix);

      petalDummy.position.copy(blendedPosition);
      if (isConstellationPetal) petalDummy.position.lerp(constellationLandingTargets[index], landing);
      const turn = smoothstep(0.42, 0.96, morph);
      const vortexPitch = Math.sin(theta) * (0.14 + lift * 0.34);
      const vortexYaw = -Math.cos(theta) * (0.12 + lift * 0.34);
      const vortexRoll = theta - Math.PI / 2;
      petalDummy.rotation.set(
        THREE.MathUtils.lerp(-pitch * 0.35, vortexPitch, turn),
        THREE.MathUtils.lerp(yaw * 0.4, vortexYaw, turn),
        THREE.MathUtils.lerp(batDummy.rotation.z, vortexRoll, turn),
      );
      const petalScale = seed.scale * activeIn * THREE.MathUtils.lerp(0.18, 1.62, morph) * activeOut;
      petalDummy.scale.setScalar(petalScale);
      petalDummy.updateMatrix();
      petals.setMatrixAt(index, petalDummy.matrix);
      if (isConstellationPetal) petalOpacity = Math.max(petalOpacity, captureFade);
      // Keep the outgoing phase in the calculation so the flock has a
      // physical flight before returning through the threshold.
      void local;
    }
    petalMaterial.opacity = petalOpacity;
    bats.instanceMatrix.needsUpdate = true;
    petals.instanceMatrix.needsUpdate = true;
  }

  function updateSky(time: number) {
    const skyIn = smoothstep(11.2, 15.2, time);
    const skyOut = smoothstep(25.8, 28.5, time);
    sky.visible = time >= 10.5 && time <= 29;
    skyMaterial.opacity = skyIn * (1 - skyOut) * 0.88;
    virgo.group.visible = time >= 13.4 && time <= 26.6;
    capricorn.group.visible = time >= 16.1 && time <= 26.6;
    const virgoReveal = smoothstep(14.1, 18.1, time) * (1 - smoothstep(24.1, 26.2, time));
    const capricornReveal = smoothstep(17.1, 21.2, time) * (1 - smoothstep(24.5, 26.5, time));
    virgo.update(time, virgoReveal);
    capricorn.update(time + 0.38, capricornReveal);
    const threadReveal = smoothstep(21.2, 23.4, time) * (1 - smoothstep(26.2, 28.5, time));
    redThread.visible = threadReveal > 0.01;
    threadMaterial.opacity = threadReveal * 0.82;
    redThread.scale.setScalar(0.88 + threadReveal * 0.12);
    threadGeometry.setDrawRange(0, Math.max(2, Math.ceil(57 * threadReveal)));
    threadEmber.visible = threadReveal > 0.025;
    if (threadEmber.visible) {
      threadCurve.getPoint(Math.min(0.995, Math.max(0.015, threadReveal)), threadEmber.position);
      (threadEmber.material as ThreeTypes.SpriteMaterial).opacity = threadReveal * (1 - smoothstep(25.7, 28.5, time)) * 0.72;
      threadEmber.scale.setScalar(0.42 + threadReveal * 0.34);
    }
    // Tiny whole-sky drift gives the ascent parallax without moving the star
    // vertices every frame or turning this into a game-space background.
    sky.rotation.y = Math.sin(time * 0.075) * 0.035;
    sky.rotation.z = Math.sin(time * 0.048) * 0.018;
  }

  function updateMemories(time: number) {
    const memoryIn = smoothstep(25.5, 28.3, time);
    const memoryOut = smoothstep(32.75, 34.2, time);
    if (memoryBackdrop) {
      memoryBackdrop.visible = time >= 24.4 && time <= 35.7;
      memoryBackdrop.material.opacity = memoryIn * (1 - memoryOut) * 0.28;
    }
    memories.forEach((memory, index) => {
      const appear = smoothstep(25.7 + index * 0.38, 27.8 + index * 0.38, time);
      const stack = smoothstep(31.45, 33.15, time);
      const earlyVisible = appear > 0.01 && memoryOut < 0.98;
      // The photographs belong to the memory garden, then fold into the
      // envelope. Keeping them out of the finale lets the letter truly bloom
      // into one intimate flower instead of another collage.
      memory.group.visible = earlyVisible;
      cardPosition.copy(memory.base);
      cardPosition.y += Math.sin(time * 0.42 + index) * 0.16;
      cardPosition.x += Math.cos(time * 0.34 + index * 1.7) * 0.1 * horizontalCompression;
      cardPosition.lerp(memory.stack, stack);
      memory.group.position.copy(cardPosition);
      memory.group.scale.setScalar(THREE.MathUtils.lerp(0.04, 1, appear));
      memory.group.rotation.x = memory.baseRotation.x;
      memory.group.rotation.y = memory.baseRotation.y + stack * Math.PI * 0.46;
      memory.group.rotation.z = memory.baseRotation.z + Math.sin(time * 0.36 + index) * 0.035;
      const opacity = appear * (1 - memoryOut) * 0.96;
      memory.backing.material.opacity = opacity;
      memory.image.material.opacity = opacity;
    });
  }

  function updateEnvelope(time: number) {
    const envelopeIn = smoothstep(33.1, 36.1, time);
    const letterReveal = smoothstep(38.1, 39.25, time);
    const letterOut = smoothstep(45.1, 46.3, time);
    const envelopeOut = smoothstep(44.7, 47.1, time);
    envelope.visible = time >= 32.3 && time <= 47.3;
    envelope.scale.setScalar(THREE.MathUtils.lerp(0.01, 1, envelopeIn) * THREE.MathUtils.lerp(1, 0.48, envelopeOut));
    envelope.position.y = -envelopeOut * 2.2;
    envelope.rotation.x = envelopeOut * -0.58;
    const paperOpacity = envelopeIn * (1 - letterReveal) * (1 - envelopeOut);
    envelopeBackMaterial.opacity = paperOpacity;
    flapMaterial.opacity = paperOpacity;
    // The crisp DOM letter supplies the readable paper. Keeping this mesh
    // invisible avoids the old tall slab piercing through the envelope shot.
    innerPaperMaterial.opacity = 0;
    flapHinge.rotation.x = THREE.MathUtils.lerp(0, -2.56, smoothstep(35.7, 38.15, time));
    innerPaper.position.y = 0.2;
    innerPaper.position.z = 0.2;
    seal.visible = time < 37.9;
    parchmentLight.intensity = 20 * smoothstep(35.3, 38.8, time) * (1 - envelopeOut);

    const shown = letterReveal * (1 - letterOut);
    if (Math.abs(shown - lastLetter) > 0.012) {
      lastLetter = shown;
      letterElement.style.opacity = String(shown);
      letterElement.style.visibility = shown > 0.02 ? "visible" : "hidden";
      letterElement.style.transform = `translate(-50%, ${THREE.MathUtils.lerp(-44, -50, shown)}%) scale(${THREE.MathUtils.lerp(0.86, 1, shown)}) rotateX(${THREE.MathUtils.lerp(6, 0, shown)}deg)`;
      letterElement.setAttribute("aria-hidden", shown > 0.6 ? "false" : "true");
    }
  }

  function updateFinale(time: number) {
    const finaleIn = smoothstep(45.35, 50.95, time);
    finale.visible = time >= 45.15;
    if (!finale.visible) {
      finale.scale.setScalar(1.9);
      return;
    }
    // The flower no longer scales up as a single prop. Its petals begin at
    // the seal's centre, then open with uneven timing like a real bloom.
    finale.scale.setScalar(1.86 + finaleIn * 0.1);
    finale.rotation.z = (time - 45.15) * 0.006;
    (finaleGlow.material as ThreeTypes.SpriteMaterial).opacity = 0.018 + finaleIn * 0.18;
    finaleCore.scale.setScalar(0.08 + finaleIn * 0.72);
    finaleCore.rotation.y = time * 0.14;
    for (let index = 0; index < finaleCount; index += 1) {
      const ring = index < finaleCount * 0.34 ? 0 : index < finaleCount * 0.7 ? 1 : 2;
      const ringStart = ring === 0 ? 0 : ring === 1 ? Math.floor(finaleCount * 0.34) : Math.floor(finaleCount * 0.7);
      const ringSize = ring === 0 ? Math.floor(finaleCount * 0.34) : ring === 1 ? Math.floor(finaleCount * 0.36) : finaleCount - Math.floor(finaleCount * 0.7);
      const seedA = seeded(index, 54);
      const seedB = seeded(index, 55);
      const openAt = 45.34 + ring * 0.5 + seedA * 0.82;
      const open = smoothstep(openAt, openAt + 2.1 + seedB * 0.55, time);
      const angle = ((index - ringStart) / Math.max(1, ringSize)) * Math.PI * 2 + ring * 0.46 + seedA * 0.98 + time * (ring === 1 ? -0.021 : 0.016);
      const radius = [0.18, 0.72, 1.35][ring] * (0.83 + seedB * 0.24) * THREE.MathUtils.lerp(0.06, 1, open);
      finaleDummy.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * (0.76 + seedB * 0.16),
        -ring * 0.22 + Math.cos(angle * 2 + ring + seedA) * (0.12 + seedB * 0.12),
      );
      const curl = [0.24, 0.56, 0.86][ring] * THREE.MathUtils.lerp(0.22, 1, open);
      finaleDummy.rotation.set(
        Math.sin(angle + seedB) * curl,
        -Math.cos(angle - seedA) * curl,
        angle - Math.PI / 2 + (seedB - 0.5) * 0.34,
      );
      finaleDummy.scale.setScalar([0.72, 1.04, 1.34][ring] * THREE.MathUtils.lerp(0.05, 1, open));
      finaleDummy.updateMatrix();
      finalePetals.setMatrixAt(index, finaleDummy.matrix);
    }
    finalePetals.instanceMatrix.needsUpdate = true;
    roseLight.position.z = THREE.MathUtils.lerp(-14, -94, smoothstep(44.8, 50, time));
    roseLight.intensity = THREE.MathUtils.lerp(6, 12, finaleIn);
    const irisClose = smoothstep(51.7, DURATION, time);
    if (iris && Math.abs(irisClose - lastIris) > 0.012) {
      lastIris = irisClose;
      iris.style.setProperty("--rose-iris-close", String(irisClose));
    }
  }

  function updateCamera(time: number) {
    sampleTimedVector(CAMERA_KEYS, time, position);
    sampleTimedVector(CAMERA_KEYS, Math.min(DURATION, time + 0.12), futurePosition);
    tangent.subVectors(futurePosition, position);
    if (tangent.lengthSq() < 0.00001) tangent.set(0, 0, -1);
    else tangent.normalize();
    baseCameraTarget.copy(position).addScaledVector(tangent, 7.2);
    target.copy(baseCameraTarget);
    let targetWeight = 1;
    const vortexFocusBlend = smoothstep(4.35, 6.15, time) * (1 - smoothstep(14.6, 16.65, time));
    getVortexCameraFocus(time, vortexCameraFocus);
    const vortexWeight = vortexFocusBlend * 0.9;
    target.addScaledVector(vortexCameraFocus, vortexWeight);
    targetWeight += vortexWeight;
    const skyFocusBlend = smoothstep(13.5, 16.2, time) * (1 - smoothstep(22.4, 25.2, time));
    const skyWeight = skyFocusBlend * 0.88;
    target.addScaledVector(skyFocus, skyWeight);
    targetWeight += skyWeight;
    const letterFocusBlend = smoothstep(37.8, 40.2, time) * (1 - smoothstep(45.1, 47.1, time));
    const letterWeight = letterFocusBlend * 0.94;
    target.addScaledVector(letterFocus, letterWeight);
    targetWeight += letterWeight;
    target.multiplyScalar(1 / targetWeight);
    cameraRig.position.copy(position);
    camera.lookAt(target);
    const nextFov = mobile ? Math.max(47, sampleTimedCurve(FOV_TIME_MAP, time)) : sampleTimedCurve(FOV_TIME_MAP, time);
    if (Math.abs(nextFov - lastFov) > 0.012) {
      lastFov = nextFov;
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
    // Bank only while the camera is actually caught by the petal vortex.
    // A permanent sine wave reads as a game camera, especially on long holds.
    const vortexBank = smoothstep(6.2, 7.45, time) * (1 - smoothstep(14.3, 15.7, time));
    cameraRig.rotation.z = mobile ? 0 : Math.sin((time - 6.2) * 0.78) * THREE.MathUtils.degToRad(0.14) * vortexBank;
  }

  function cueFor(time: number) {
    if (time >= 46) return "finale";
    if (time >= 37.2) return "paper";
    if (time >= 13.2) return "chime";
    return "threshold";
  }

  function renderFrame(forceProgress = false) {
    if (destroyed) return;
    updateCamera(currentTime);
    updateDoor(currentTime);
    updateFlock(currentTime);
    updateSky(currentTime);
    updateMemories(currentTime);
    updateEnvelope(currentTime);
    updateFinale(currentTime);
    if (running) {
      const cue = cueFor(currentTime);
      if (cue !== lastCue) {
        lastCue = cue;
        options.onCue?.(cue);
      }
      const now = performance.now();
      if (forceProgress || now - lastProgressTime > 80 || currentTime >= DURATION) {
        lastProgressTime = now;
        options.onProgress?.(currentTime / DURATION);
      }
    }
    renderer.render(scene, camera);
  }

  function applySize() {
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderFrame(true);
  }

  function queueResize() {
    if (resizeFrame || destroyed) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      applySize();
    });
  }

  const resizeObserver = new ResizeObserver(queueResize);
  resizeObserver.observe(root);
  applySize();
  // This happens during `prepare`, while the CSS door is still on screen.
  // It prevents the first real frame from compiling shaders at the threshold.
  renderer.compile(scene, camera);

  function tick(now: number) {
    if (!running || paused || destroyed) return;
    const delta = Math.min(1 / 30, Math.max(0, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    if (delta > 0.022) slowFrames += 1;
    else slowFrames = Math.max(0, slowFrames - 1);
    if (slowFrames >= 10 && pixelRatio > 1) {
      pixelRatio = 1;
      slowFrames = 0;
      applySize();
    }
    currentTime = Math.min(DURATION, currentTime + delta);
    renderFrame();
    if (currentTime >= DURATION) {
      running = false;
      paused = false;
      animationFrame = 0;
      options.onProgress?.(1);
      options.onComplete?.();
      return;
    }
    animationFrame = window.requestAnimationFrame(tick);
  }

  function start(startAt = 0) {
    if (destroyed || running) return;
    currentTime = clamp(startAt, 0, DURATION - 0.01);
    lastCue = "";
    lastLetter = -1;
    lastIris = -1;
    running = true;
    paused = false;
    root.classList.remove("is-fallback");
    root.classList.add("is-webgl-ready");
    lastFrameTime = performance.now();
    renderFrame(true);
    animationFrame = window.requestAnimationFrame(tick);
  }

  function pause() {
    if (!running || paused || destroyed) return;
    paused = true;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function resume() {
    if (!running || !paused || destroyed) return;
    paused = false;
    lastFrameTime = performance.now();
    animationFrame = window.requestAnimationFrame(tick);
  }

  function reset() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    running = false;
    paused = false;
    currentTime = 0;
    lastCue = "";
    lastLetter = -1;
    lastIris = -1;
    letterElement.style.opacity = "0";
    letterElement.style.visibility = "hidden";
    letterElement.setAttribute("aria-hidden", "true");
    if (iris) iris.style.setProperty("--rose-iris-close", "0");
    renderFrame(true);
  }

  function destroy() {
    if (destroyed) return;
    reset();
    destroyed = true;
    if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();
    virgo.dispose();
    capricorn.dispose();
    disposables.forEach((resource) => resource.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    start,
    pause,
    resume,
    reset,
    destroy,
    isPaused: () => paused,
    isRunning: () => running,
  };
}
