import type * as ThreeTypes from "three";

/**
 * Small, authored constellation maps for the Rose Door sky sequence.
 *
 * The coordinates are deliberately local rather than astronomical. They keep
 * the silhouettes legible when the camera is moving and can be grouped and
 * placed anywhere in the cinematic world without a HUD, a label, or a lookup
 * texture. The z offsets are gentle enough to catch parallax while preserving
 * the traditional line drawing from a mobile-sized screen.
 */
export type RoseConstellationId = "virgo" | "capricorn";

export type RoseConstellationVector = readonly [number, number, number];

export type RoseStarTone = "moon" | "warm" | "rose";

export interface RoseConstellationStar {
  /** Stable identifier used by the line segments below. */
  readonly id: string;
  /** Local cinematic coordinates, in world units. */
  readonly position: RoseConstellationVector;
  /** Relative brightness. The anchor star should be 1. */
  readonly intensity: number;
  readonly tone: RoseStarTone;
  /** A deterministic phase value, useful for a custom shader later. */
  readonly twinklePhase: number;
}

export interface RoseConstellationSegment {
  readonly from: string;
  readonly to: string;
  /** Subtle hierarchy keeps the map from looking like a UI diagram. */
  readonly opacity?: number;
}

export interface RoseConstellationDefinition {
  readonly id: RoseConstellationId;
  readonly stars: readonly RoseConstellationStar[];
  readonly segments: readonly RoseConstellationSegment[];
}

/**
 * Virgo / Xử Nữ: a long, graceful branch ending at a distinctly brighter
 * Spica. The soft bend in its spine reads much more clearly than a literal
 * astronomical chart during the upward camera move.
 */
export const VIRGO_CONSTELLATION: RoseConstellationDefinition = {
  id: "virgo",
  stars: [
    { id: "vindemiatrix", position: [-3.85, 2.85, -0.14], intensity: 0.63, tone: "moon", twinklePhase: 0.12 },
    { id: "zavijava", position: [-2.35, 1.7, 0.09], intensity: 0.48, tone: "warm", twinklePhase: 0.56 },
    { id: "porrima", position: [-0.78, 0.92, -0.18], intensity: 0.72, tone: "moon", twinklePhase: 0.26 },
    { id: "spica", position: [0.74, -2.85, 0.26], intensity: 1, tone: "rose", twinklePhase: 0.82 },
    { id: "auva", position: [1.46, 0.05, 0.18], intensity: 0.5, tone: "warm", twinklePhase: 0.42 },
    { id: "heze", position: [2.72, 1.5, -0.03], intensity: 0.59, tone: "moon", twinklePhase: 0.67 },
    { id: "syrma", position: [3.9, 3.05, 0.12], intensity: 0.46, tone: "warm", twinklePhase: 0.94 },
  ],
  segments: [
    { from: "vindemiatrix", to: "zavijava", opacity: 0.42 },
    { from: "zavijava", to: "porrima", opacity: 0.56 },
    { from: "porrima", to: "spica", opacity: 0.8 },
    { from: "porrima", to: "auva", opacity: 0.47 },
    { from: "auva", to: "heze", opacity: 0.56 },
    { from: "heze", to: "syrma", opacity: 0.4 },
  ],
};

/**
 * Capricorn / Ma Kết: two high horns converge into a low sea-goat tail. The
 * wide crown and compressed lower turn retain its recognisable angular shape
 * even if the scene crops a little on a phone.
 */
export const CAPRICORN_CONSTELLATION: RoseConstellationDefinition = {
  id: "capricorn",
  stars: [
    { id: "dabih", position: [-3.7, 2.35, 0.14], intensity: 0.71, tone: "warm", twinklePhase: 0.18 },
    { id: "omega", position: [-2.12, 0.68, -0.1], intensity: 0.45, tone: "moon", twinklePhase: 0.47 },
    { id: "deneb-algedi", position: [-0.55, -1.2, 0.22], intensity: 0.77, tone: "moon", twinklePhase: 0.74 },
    { id: "nashira", position: [1.18, -1.98, -0.18], intensity: 0.68, tone: "rose", twinklePhase: 0.33 },
    { id: "algedi", position: [2.72, 0.2, 0.1], intensity: 0.6, tone: "warm", twinklePhase: 0.88 },
    { id: "giedi", position: [3.8, 2.36, -0.05], intensity: 0.54, tone: "moon", twinklePhase: 0.61 },
    { id: "bos", position: [0.94, 1.16, -0.26], intensity: 0.41, tone: "warm", twinklePhase: 0.05 },
  ],
  segments: [
    { from: "dabih", to: "omega", opacity: 0.48 },
    { from: "omega", to: "deneb-algedi", opacity: 0.67 },
    { from: "deneb-algedi", to: "nashira", opacity: 0.76 },
    { from: "nashira", to: "algedi", opacity: 0.62 },
    { from: "algedi", to: "giedi", opacity: 0.52 },
    { from: "bos", to: "deneb-algedi", opacity: 0.38 },
    { from: "bos", to: "algedi", opacity: 0.38 },
  ],
};

export const ROSE_CONSTELLATIONS = [VIRGO_CONSTELLATION, CAPRICORN_CONSTELLATION] as const;

export interface RoseConstellationRenderOptions {
  /** A smaller drawing prevents a constellation from spilling off mobile. */
  readonly scale?: number;
  readonly starSize?: number;
  readonly starOpacity?: number;
  readonly lineOpacity?: number;
  readonly lineColor?: number;
  readonly mobile?: boolean;
}

export interface RoseConstellationRenderable {
  readonly group: ThreeTypes.Group;
  readonly stars: ThreeTypes.Points<ThreeTypes.BufferGeometry, ThreeTypes.PointsMaterial>;
  readonly lines: ThreeTypes.LineSegments<ThreeTypes.BufferGeometry, ThreeTypes.LineBasicMaterial>;
  /** Use the film clock; no per-frame allocations or per-star draw calls. */
  update: (time: number, reveal?: number) => void;
  setReveal: (reveal: number) => void;
  dispose: () => void;
}

const toneHex: Record<RoseStarTone, number> = {
  moon: 0xd9e6ff,
  warm: 0xffd8a6,
  rose: 0xff6a81,
};

function clampUnit(value: number) {
  return Math.min(1, Math.max(0, value));
}

function createStarGeometry(
  THREE: typeof ThreeTypes,
  definition: RoseConstellationDefinition,
) {
  const positions = new Float32Array(definition.stars.length * 3);
  const colors = new Float32Array(definition.stars.length * 3);
  const color = new THREE.Color();

  definition.stars.forEach((star, index) => {
    positions.set(star.position, index * 3);
    color.setHex(toneHex[star.tone]).multiplyScalar(0.48 + star.intensity * 0.52);
    colors.set([color.r, color.g, color.b], index * 3);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Creates one batched star field. It intentionally uses Points instead of
 * sprites: Seven physical stars are rendered in one draw call, stay sharp at
 * a low DPR, and do not introduce alpha-sorting artefacts while the camera
 * moves through the sky.
 */
export function createConstellationStarPoints(
  THREE: typeof ThreeTypes,
  definition: RoseConstellationDefinition,
  options: Pick<RoseConstellationRenderOptions, "mobile" | "starOpacity" | "starSize"> = {},
) {
  const geometry = createStarGeometry(THREE, definition);
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: options.starSize ?? (options.mobile ? 0.16 : 0.13),
    vertexColors: true,
    transparent: true,
    opacity: options.starOpacity ?? 0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

/** Builds the thin, intentionally incomplete filaments between authored stars. */
export function createConstellationLineSegments(
  THREE: typeof ThreeTypes,
  definition: RoseConstellationDefinition,
  options: Pick<RoseConstellationRenderOptions, "lineColor" | "lineOpacity"> = {},
) {
  const byId = new Map(definition.stars.map((star) => [star.id, star]));
  const positions: number[] = [];
  const colors: number[] = [];
  const baseColor = new THREE.Color(options.lineColor ?? 0xb9b1d4);

  definition.segments.forEach((segment) => {
    const from = byId.get(segment.from);
    const to = byId.get(segment.to);
    if (!from || !to) return;
    positions.push(...from.position, ...to.position);
    const brightness = (segment.opacity ?? 0.5) * 0.7;
    colors.push(
      baseColor.r * brightness,
      baseColor.g * brightness,
      baseColor.b * brightness,
      baseColor.r * brightness,
      baseColor.g * brightness,
      baseColor.b * brightness,
    );
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: options.lineOpacity ?? 0,
    depthWrite: false,
  });
  return new THREE.LineSegments(geometry, material);
}

/**
 * A compact, ready-to-place constellation group. `update` keeps the motion
 * almost imperceptible: the scene breathes rather than jittering, while the
 * engine itself owns the camera path and the reveal timing.
 */
export function createRoseConstellation(
  THREE: typeof ThreeTypes,
  definition: RoseConstellationDefinition,
  options: RoseConstellationRenderOptions = {},
): RoseConstellationRenderable {
  const group = new THREE.Group();
  const stars = createConstellationStarPoints(THREE, definition, options);
  const lines = createConstellationLineSegments(THREE, definition, options);
  const scale = options.scale ?? (options.mobile ? 0.76 : 1);
  group.scale.setScalar(scale);
  group.add(lines, stars);

  const baseStarOpacity = options.starOpacity ?? 0.95;
  const baseLineOpacity = options.lineOpacity ?? 0.62;
  let reveal = 0;

  const setReveal = (nextReveal: number) => {
    reveal = clampUnit(nextReveal);
    stars.material.opacity = baseStarOpacity * reveal;
    lines.material.opacity = baseLineOpacity * reveal;
    // Draw the map star-by-star and segment-by-segment. This gives the sky
    // a physical formation beat rather than fading in a finished diagram.
    stars.geometry.setDrawRange(0, Math.ceil(definition.stars.length * reveal));
    lines.geometry.setDrawRange(0, Math.ceil(definition.segments.length * reveal) * 2);
  };

  const update = (time: number, nextReveal = reveal) => {
    setReveal(nextReveal);
    // A shared opacity pulse is stable on low-end phones and costs no extra
    // geometry updates. Keep it very small so this reads as a night sky, not
    // as a game HUD.
    const shimmer = 0.92 + Math.sin(time * 0.62 + definition.stars[0].twinklePhase * Math.PI * 2) * 0.08;
    stars.material.opacity = baseStarOpacity * reveal * shimmer;
    group.rotation.z = Math.sin(time * 0.085 + definition.stars.length) * 0.012;
  };

  setReveal(0);

  return {
    group,
    stars,
    lines,
    update,
    setReveal,
    dispose: () => {
      stars.geometry.dispose();
      stars.material.dispose();
      lines.geometry.dispose();
      lines.material.dispose();
      group.remove(lines, stars);
    },
  };
}
