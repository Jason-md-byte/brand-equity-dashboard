import { describe, expect, it } from 'vitest';
import {
  colorForScore,
  contrastRatio,
  pyramidSegments,
  radarAxisEnd,
  radarPolygon,
  radarRing,
  textColorFor,
} from './geometry';
import type { Scores } from './cbbe';

const full: Scores = { salience: 10, performance: 10, imagery: 10, judgments: 10, feelings: 10, resonance: 10 };
const zero: Scores = { salience: 0, performance: 0, imagery: 0, judgments: 0, feelings: 0, resonance: 0 };

const parse = (poly: string) => poly.split(' ').map((p) => p.split(',').map(Number) as [number, number]);

describe('radar geometry', () => {
  it('places the first axis straight up', () => {
    const [x, y] = radarAxisEnd(0, 10, 100, 100, 80);
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(20);
  });
  it('scales radius linearly with score', () => {
    const [, y] = radarAxisEnd(0, 5, 100, 100, 80);
    expect(y).toBeCloseTo(60);
  });
  it('produces six points for a full polygon', () => {
    expect(parse(radarPolygon(full, 100, 100, 80))).toHaveLength(6);
  });
  it('collapses to the centre for zero scores', () => {
    for (const [x, y] of parse(radarPolygon(zero, 100, 100, 80))) {
      expect(x).toBeCloseTo(100);
      expect(y).toBeCloseTo(100);
    }
  });
  it('builds concentric rings', () => {
    const ring = parse(radarRing(5, 100, 100, 80));
    expect(ring).toHaveLength(6);
    expect(ring[0]?.[1]).toBeCloseTo(60);
  });
});

describe('pyramid geometry', () => {
  const segs = pyramidSegments(400, 300);
  it('returns one segment per layer', () => {
    expect(segs.map((s) => s.id).sort()).toEqual(['feelings', 'imagery', 'judgments', 'performance', 'resonance', 'salience']);
  });
  it('stacks resonance on top and salience at the base', () => {
    const top = segs.find((s) => s.id === 'resonance');
    const base = segs.find((s) => s.id === 'salience');
    expect(top?.cy).toBeLessThan(base?.cy ?? 0);
  });
  it('puts performance left of imagery and judgments left of feelings', () => {
    const cx = (id: string) => segs.find((s) => s.id === id)?.cx ?? 0;
    expect(cx('performance')).toBeLessThan(cx('imagery'));
    expect(cx('judgments')).toBeLessThan(cx('feelings'));
  });
  it('keeps every vertex inside the canvas', () => {
    for (const s of segs) {
      for (const [x, y] of parse(s.points)) {
        expect(x).toBeGreaterThanOrEqual(-0.001);
        expect(x).toBeLessThanOrEqual(400.001);
        expect(y).toBeGreaterThanOrEqual(-0.001);
        expect(y).toBeLessThanOrEqual(300.001);
      }
    }
  });
});

describe('colour helpers', () => {
  it('interpolates from light to deep and clamps', () => {
    expect(colorForScore(0)).toBe('#e8efee');
    expect(colorForScore(10)).toBe('#063a3a');
    expect(colorForScore(99)).toBe('#063a3a');
    expect(colorForScore(-3)).toBe('#e8efee');
  });
  it('computes known contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
  it('picks a text colour with at least 4.5:1 contrast for every score', () => {
    for (let s = 0; s <= 10; s += 1) {
      const bg = colorForScore(s);
      expect(contrastRatio(bg, textColorFor(bg))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
