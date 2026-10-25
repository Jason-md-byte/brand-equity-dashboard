import { describe, expect, it } from 'vitest';
import { auditFilename, buildAudit, normalizeScores } from './cbbe';
import { EXAMPLE_BRAND_NAME, EXAMPLE_SCORES } from './example';

describe('example brand', () => {
  it('is valid, already normalised, and clearly labelled fictional', () => {
    expect(normalizeScores(EXAMPLE_SCORES)).toEqual(EXAMPLE_SCORES);
    expect(EXAMPLE_BRAND_NAME.toLowerCase()).toContain('fictional');
  });
  it('produces a meaningful audit (recommendations and an imbalance)', () => {
    const audit = buildAudit(EXAMPLE_BRAND_NAME, EXAMPLE_SCORES);
    expect(audit.recommendations).toHaveLength(3);
    expect(audit.imbalances.length).toBeGreaterThan(0);
  });
});

describe('auditFilename', () => {
  it('slugifies the brand name', () => expect(auditFilename('Brindlewick Outfitters (fictional)')).toBe('cbbe-audit-brindlewick-outfitters-fictional.md'));
  it('falls back when nothing usable remains', () => expect(auditFilename('***')).toBe('cbbe-audit-brand.md'));
  it('truncates long names without a trailing dash', () => {
    const name = auditFilename(`${'a'.repeat(39)} bbbbbb`);
    expect(name).toBe(`cbbe-audit-${'a'.repeat(39)}.md`);
  });
});
