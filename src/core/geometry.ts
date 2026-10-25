/**
 * Pure geometry and colour helpers for the radar and pyramid charts.
 * Returning strings and numbers keeps rendering code trivial and testable.
 */
import { LAYER_IDS, SCORE_MAX, SCORE_MIN, type LayerId, type Scores } from './cbbe';

export type Point = readonly [number, number];

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();
const toPoints = (pts: readonly Point[]): string => pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');

/** Position of axis `index` (0 = straight up, clockwise) at `value` on a 0-10 scale. */
export function radarAxisEnd(index: number, value: number, cx: number, cy: number, radius: number): Point {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / LAYER_IDS.length;
  const r = (radius * value) / SCORE_MAX;
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export function radarPolygon(scores: Scores, cx: number, cy: number, radius: number): string {
  return toPoints(LAYER_IDS.map((id, i) => radarAxisEnd(i, scores[id], cx, cy, radius)));
}

export function radarRing(level: number, cx: number, cy: number, radius: number): string {
  return toPoints(LAYER_IDS.map((_, i) => radarAxisEnd(i, level, cx, cy, radius)));
}

export type PyramidSegment = {
  readonly id: LayerId;
  readonly points: string;
  readonly cx: number;
  readonly cy: number;
};

/**
 * Keller's pyramid: salience at the base, performance/imagery above it,
 * judgments/feelings above that, resonance at the apex. Rows are equal height
 * slices of a triangle; the two middle rows are split down the centre line.
 */
export function pyramidSegments(width: number, height: number): PyramidSegment[] {
  const midX = width / 2;
  const rowH = height / 4;
  // The apex keeps a flat top (22% of the width) so the top label fits.
  const apexRatio = 0.22;
  const halfWidthAt = (y: number): number => (apexRatio + (1 - apexRatio) * (y / height)) * midX;

  const full = (id: LayerId, row: number): PyramidSegment => {
    const top = row * rowH;
    const bottom = top + rowH;
    const pts: Point[] = [
      [midX - halfWidthAt(top), top],
      [midX + halfWidthAt(top), top],
      [midX + halfWidthAt(bottom), bottom],
      [midX - halfWidthAt(bottom), bottom],
    ];
    return { id, points: toPoints(pts), cx: midX, cy: top + rowH / 2 };
  };

  const half = (id: LayerId, row: number, side: 'left' | 'right'): PyramidSegment => {
    const top = row * rowH;
    const bottom = top + rowH;
    const sign = side === 'left' ? -1 : 1;
    const outerTop = midX + sign * halfWidthAt(top);
    const outerBottom = midX + sign * halfWidthAt(bottom);
    const pts: Point[] = [
      [midX, top],
      [outerTop, top],
      [outerBottom, bottom],
      [midX, bottom],
    ];
    // Centroid-ish label anchor: midway between the centre line and the outer edge at mid-height.
    const outerMid = midX + sign * halfWidthAt(top + rowH / 2);
    return { id, points: toPoints(pts), cx: (midX + outerMid) / 2, cy: top + rowH / 2 };
  };

  return [
    full('resonance', 0),
    half('judgments', 1, 'left'),
    half('feelings', 1, 'right'),
    half('performance', 2, 'left'),
    half('imagery', 2, 'right'),
    full('salience', 3),
  ];
}

// ---- colour -------------------------------------------------------------

const LIGHT: readonly [number, number, number] = [0xe8, 0xef, 0xee];
const DEEP: readonly [number, number, number] = [0x06, 0x3a, 0x3a];

const hex2 = (n: number): string => Math.round(n).toString(16).padStart(2, '0');

export function colorForScore(score: number): string {
  const t = (Math.min(SCORE_MAX, Math.max(SCORE_MIN, score)) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const [r, g, b] = [0, 1, 2].map((i) => (LIGHT[i] ?? 0) + ((DEEP[i] ?? 0) - (LIGHT[i] ?? 0)) * t);
  return `#${hex2(r ?? 0)}${hex2(g ?? 0)}${hex2(b ?? 0)}`;
}

const channel = (v: number): number => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const INK = '#0a1118';
const WHITE = '#ffffff';

/** Whichever of near-black or white reads better on `background`. */
export function textColorFor(background: string): string {
  return contrastRatio(background, WHITE) >= contrastRatio(background, INK) ? WHITE : INK;
}
