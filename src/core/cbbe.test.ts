import { describe, expect, it } from 'vitest';
import {
  LAYER_IDS,
  auditToMarkdown,
  bandFor,
  buildAudit,
  clampScore,
  detectImbalances,
  normalizeScores,
  overallScore,
  rankLayers,
  recommend,
  type Scores,
} from './cbbe';

const make = (over: Partial<Scores> = {}): Scores => ({
  salience: 5,
  performance: 5,
  imagery: 5,
  judgments: 5,
  feelings: 5,
  resonance: 5,
  ...over,
});

const allStrong = make({ salience: 8, performance: 8, imagery: 8, judgments: 8, feelings: 8, resonance: 8 });

describe('clampScore', () => {
  it('keeps in-range integers', () => expect(clampScore(7)).toBe(7));
  it('clamps high and low', () => {
    expect(clampScore(99)).toBe(10);
    expect(clampScore(-4)).toBe(0);
  });
  it('rounds to the nearest integer', () => expect(clampScore(6.6)).toBe(7));
  it('treats NaN and infinities safely', () => {
    expect(clampScore(Number.NaN)).toBe(0);
    expect(clampScore(Number.POSITIVE_INFINITY)).toBe(10);
  });
});

describe('normalizeScores', () => {
  it('fills missing layers with 0 and clamps the rest', () => {
    const s = normalizeScores({ salience: 12, imagery: 4 });
    expect(s.salience).toBe(10);
    expect(s.imagery).toBe(4);
    expect(s.resonance).toBe(0);
    expect(Object.keys(s)).toEqual([...LAYER_IDS]);
  });
});

describe('bandFor', () => {
  it.each([
    [0, 'critical'],
    [2, 'critical'],
    [3, 'weak'],
    [4, 'weak'],
    [5, 'developing'],
    [6, 'developing'],
    [7, 'strong'],
    [10, 'strong'],
  ] as const)('score %i is %s', (score, band) => expect(bandFor(score)).toBe(band));
});

describe('overallScore', () => {
  it('averages to one decimal', () => {
    expect(overallScore(make())).toBe(5);
    expect(overallScore(make({ salience: 10, resonance: 0 }))).toBe(5);
    expect(overallScore(make({ salience: 6 }))).toBe(5.2);
  });
});

describe('rankLayers', () => {
  it('sorts ascending by score', () => {
    const r = rankLayers(make({ imagery: 1, feelings: 3 }));
    expect(r[0]).toBe('imagery');
    expect(r[1]).toBe('feelings');
  });
  it('breaks ties foundation-first', () => {
    expect(rankLayers(make())).toEqual([...LAYER_IDS]);
  });
  it('does not mutate the input', () => {
    const s = make({ resonance: 0 });
    rankLayers(s);
    expect(Object.keys(s)).toEqual([...LAYER_IDS]);
  });
});

describe('recommend', () => {
  it('returns the weakest layers below 7, limited, in priority order', () => {
    const recs = recommend(make({ salience: 2, imagery: 3, feelings: 4, performance: 8 }));
    expect(recs.map((r) => r.layer)).toEqual(['salience', 'imagery', 'feelings']);
    expect(recs.map((r) => r.priority)).toEqual([1, 2, 3]);
  });
  it('honours a custom limit', () => {
    expect(recommend(make({ salience: 1 }), 1)).toHaveLength(1);
  });
  it('returns nothing when every layer is strong', () => {
    expect(recommend(allStrong)).toEqual([]);
  });
  it('uses different copy for low bands and the developing band', () => {
    const [low] = recommend(make({ salience: 1 }));
    const [mid] = recommend(make({ salience: 6, performance: 9, imagery: 9, judgments: 9, feelings: 9, resonance: 9 }));
    expect(low?.band).toBe('critical');
    expect(mid?.band).toBe('developing');
    expect(low?.action).not.toEqual(mid?.action);
    expect(low?.headline.length).toBeGreaterThan(5);
  });
  it('has copy for every layer in both modes', () => {
    for (const id of LAYER_IDS) {
      const others = Object.fromEntries(LAYER_IDS.filter((l) => l !== id).map((l) => [l, 9]));
      const low = recommend({ ...make(others), [id]: 0 }, 6).find((r) => r.layer === id);
      const mid = recommend({ ...make(others), [id]: 6 }, 6).find((r) => r.layer === id);
      expect(low?.action).toBeTruthy();
      expect(mid?.action).toBeTruthy();
      expect(low?.action).not.toEqual(mid?.action);
    }
  });
});

describe('detectImbalances', () => {
  it('is empty for a balanced profile', () => expect(detectImbalances(make())).toEqual([]));
  it('flags awareness far above substance', () => {
    const out = detectImbalances(make({ salience: 9, performance: 4, imagery: 4 }));
    expect(out.some((m) => m.includes('Known but not valued'))).toBe(true);
  });
  it('flags head/heart skew in either direction', () => {
    expect(detectImbalances(make({ judgments: 9, feelings: 4 })).some((m) => m.includes('Rational but not emotional'))).toBe(true);
    expect(detectImbalances(make({ judgments: 3, feelings: 8 })).some((m) => m.includes('Emotional but not rational'))).toBe(true);
  });
  it('flags resonance unsupported by responses', () => {
    const out = detectImbalances(make({ resonance: 9, judgments: 5, feelings: 5 }));
    expect(out.some((m) => m.includes('Resonance'))).toBe(true);
  });
  it('flags performance/imagery gap in either direction', () => {
    expect(detectImbalances(make({ performance: 9, imagery: 4 })).some((m) => m.includes('functional'))).toBe(true);
    expect(detectImbalances(make({ performance: 3, imagery: 8 })).some((m) => m.includes('image'))).toBe(true);
  });
});

describe('buildAudit and markdown export', () => {
  const audit = buildAudit('  Testbrand  ', make({ salience: 9, performance: 2, imagery: 3, resonance: 1 }));

  it('trims the brand name and computes derived data', () => {
    expect(audit.brand).toBe('Testbrand');
    expect(audit.overall).toBe(4.2);
    expect(audit.ranking[0]).toBe('resonance');
    expect(audit.recommendations.length).toBeGreaterThan(0);
  });
  it('falls back to a default brand name', () => expect(buildAudit('   ', make()).brand).toBe('Untitled brand'));

  it('renders a markdown document with all sections', () => {
    const md = auditToMarkdown(audit, '2026-01-02');
    expect(md).toContain('# CBBE brand audit: Testbrand');
    expect(md).toContain('2026-01-02');
    expect(md).toContain('| Salience | 9 / 10 |');
    expect(md).toContain('## Recommendations');
    expect(md).toContain('## Imbalances');
    expect(md).toContain('Keller (1993)');
  });
  it('states clearly when nothing needs work', () => {
    const md = auditToMarkdown(buildAudit('Solid', allStrong), '2026-01-02');
    expect(md).toContain('No layer scores below 7');
    expect(md).toContain('No major imbalances');
  });
  it('escapes pipes in the brand name', () => {
    expect(auditToMarkdown(buildAudit('A|B', make()), '2026-01-02')).toContain('A\\|B');
  });
});
