/**
 * Pure scoring and recommendation logic for the CBBE (customer-based brand
 * equity) pyramid. No DOM, no I/O: everything here is deterministic and unit
 * tested.
 */

export const LAYER_IDS = ['salience', 'performance', 'imagery', 'judgments', 'feelings', 'resonance'] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export type Scores = Readonly<Record<LayerId, number>>;

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
/** Layers scoring below this are candidates for a recommendation. */
export const STRONG_THRESHOLD = 7;

export const BANDS = {
  critical: 'critical',
  weak: 'weak',
  developing: 'developing',
  strong: 'strong',
} as const;
export type Band = (typeof BANDS)[keyof typeof BANDS];

export type LayerMeta = {
  readonly id: LayerId;
  readonly label: string;
  /** The audit question shown beside the slider. */
  readonly question: string;
  /** Short plain-English description of what the layer means. */
  readonly blurb: string;
};

export const LAYERS: Readonly<Record<LayerId, LayerMeta>> = {
  salience: {
    id: 'salience',
    label: 'Salience',
    question: 'When people think of the category, how often and how easily does the brand come to mind?',
    blurb: 'Breadth and depth of awareness: recall, recognition and purchase situations.',
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    question: 'How well does the product or service meet functional needs?',
    blurb: 'Quality, reliability, service and value: the rational "what it does".',
  },
  imagery: {
    id: 'imagery',
    label: 'Imagery',
    question: 'How clearly do people picture who uses the brand and what it stands for?',
    blurb: 'Intangible associations: user profiles, personality, history and values.',
  },
  judgments: {
    id: 'judgments',
    label: 'Judgments',
    question: 'How favourably do customers evaluate the brand on quality, credibility and superiority?',
    blurb: 'Customers\' rational opinions: quality, credibility, consideration, superiority.',
  },
  feelings: {
    id: 'feelings',
    label: 'Feelings',
    question: 'What emotional reactions does the brand reliably trigger?',
    blurb: 'Emotional responses such as warmth, security, fun or social approval.',
  },
  resonance: {
    id: 'resonance',
    label: 'Resonance',
    question: 'How loyal, attached and engaged are customers with the brand?',
    blurb: 'Behavioural loyalty, attachment, sense of community and active engagement.',
  },
};

export function clampScore(value: number): number {
  if (Number.isNaN(value)) return SCORE_MIN;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}

export function normalizeScores(input: Partial<Record<LayerId, number>>): Scores {
  return {
    salience: clampScore(input.salience ?? 0),
    performance: clampScore(input.performance ?? 0),
    imagery: clampScore(input.imagery ?? 0),
    judgments: clampScore(input.judgments ?? 0),
    feelings: clampScore(input.feelings ?? 0),
    resonance: clampScore(input.resonance ?? 0),
  };
}

export function bandFor(score: number): Band {
  if (score < 3) return BANDS.critical;
  if (score < 5) return BANDS.weak;
  if (score < STRONG_THRESHOLD) return BANDS.developing;
  return BANDS.strong;
}

export function overallScore(scores: Scores): number {
  const total = LAYER_IDS.reduce((sum, id) => sum + scores[id], 0);
  return Math.round((total / LAYER_IDS.length) * 10) / 10;
}

/** Lowest score first; ties resolve foundation-first (pyramid order). */
export function rankLayers(scores: Scores): LayerId[] {
  return [...LAYER_IDS].sort((a, b) => scores[a] - scores[b] || LAYER_IDS.indexOf(a) - LAYER_IDS.indexOf(b));
}

export type Recommendation = {
  readonly priority: number;
  readonly layer: LayerId;
  readonly band: Band;
  readonly headline: string;
  readonly action: string;
};

type Advice = { readonly headline: string; readonly build: string; readonly sharpen: string };

const ADVICE: Readonly<Record<LayerId, Advice>> = {
  salience: {
    headline: 'Make the brand easier to remember and recall',
    build:
      'Start here, because every layer above depends on it. Link the brand to one clear category need, repeat a distinctive name, colour or sound across every touchpoint, and spend on reach before anything else.',
    sharpen:
      'Awareness is decent but shallow. Tie the brand to more buying situations ("when would I use this?") and keep distinctive assets consistent so recall happens without prompting.',
  },
  performance: {
    headline: 'Fix the product basics before promoting more',
    build:
      'Customers are not getting the functional promise. Collect the top three complaints, fix those first, and make service and reliability measurable so quality becomes a reason to choose you.',
    sharpen:
      'The product works but does not stand out. Identify the one attribute where you can be clearly better than alternatives and make it visible in packaging, onboarding and messaging.',
  },
  imagery: {
    headline: 'Define who the brand is for and what it stands for',
    build:
      'People cannot picture a typical customer or a personality. Pick one target user and three personality traits, then reflect them consistently in visuals, tone of voice and partnerships.',
    sharpen:
      'The image is forming but inconsistent. Audit recent content for off-brand tone or imagery, and add one story (origin, values or heritage) that makes the personality easy to repeat.',
  },
  judgments: {
    headline: 'Give customers solid reasons to rate the brand highly',
    build:
      'Customers do not yet see the brand as credible or better than alternatives. Add proof such as reviews, guarantees, expert endorsements and clear comparisons, so their judgment rests on evidence.',
    sharpen:
      'Opinions are positive but not decisive. Turn your strongest proof point into a headline claim and retire weaker claims that dilute credibility.',
  },
  feelings: {
    headline: 'Create a clear emotional payoff',
    build:
      'The brand triggers little emotion. Choose one or two feelings you want to own (for example reassurance or delight) and design specific moments in the customer journey that deliver them.',
    sharpen:
      'Feelings are present but uneven. Find the moments where customers already report positive emotion and amplify them, and smooth the moments that cause frustration.',
  },
  resonance: {
    headline: 'Turn satisfied customers into loyal advocates',
    build:
      'Loyalty is thin. Make sure the layers below are solid first, then add retention basics: a reason to come back, a way to hear from customers, and an easy way for them to recommend you.',
    sharpen:
      'Loyalty exists but is not yet active. Invest in community, member benefits or user-generated content so customers engage with the brand and not only buy from it.',
  },
};

/**
 * Plain-English recommendations for the weakest layers scoring below 7.
 * `limit` caps how many are returned (default 3).
 */
export function recommend(scores: Scores, limit = 3): Recommendation[] {
  return rankLayers(scores)
    .filter((id) => scores[id] < STRONG_THRESHOLD)
    .slice(0, limit)
    .map((layer, index) => {
      const band = bandFor(scores[layer]);
      const advice = ADVICE[layer];
      const isLow = band === BANDS.critical || band === BANDS.weak;
      return {
        priority: index + 1,
        layer,
        band,
        headline: advice.headline,
        action: isLow ? advice.build : advice.sharpen,
      };
    });
}

const GAP = 3;

/** Rule-based checks for lopsided profiles. */
export function detectImbalances(scores: Scores): string[] {
  const out: string[] = [];

  const substance = (scores.performance + scores.imagery) / 2;
  if (scores.salience - substance >= GAP) {
    out.push(
      'Known but not valued: awareness runs well ahead of performance and imagery. More advertising will mostly amplify a weak offer, so strengthen the middle of the pyramid first.',
    );
  }

  if (scores.performance - scores.imagery >= GAP) {
    out.push(
      'Strong functional product, weak personality: customers like what it does but cannot say what the brand stands for. That makes it easy to substitute on price.',
    );
  } else if (scores.imagery - scores.performance >= GAP) {
    out.push(
      'Strong image, weak product: the brand promises more than it delivers. Closing the functional gap protects the image from backlash.',
    );
  }

  if (scores.judgments - scores.feelings >= GAP) {
    out.push(
      'Rational but not emotional: customers respect the brand without feeling anything for it. Loyalty built on logic alone is fragile.',
    );
  } else if (scores.feelings - scores.judgments >= GAP) {
    out.push(
      'Emotional but not rational: customers feel warmly yet lack concrete reasons to trust the brand. Add proof points so feelings are backed by judgment.',
    );
  }

  const responses = (scores.judgments + scores.feelings) / 2;
  if (scores.resonance - responses >= 2) {
    out.push(
      'Resonance is not supported by customer responses below it. It may be habit or lack of alternatives rather than true attachment, so check whether it would survive a competitor launch.',
    );
  }

  return out;
}

export type Audit = {
  readonly brand: string;
  readonly scores: Scores;
  readonly overall: number;
  readonly ranking: readonly LayerId[];
  readonly recommendations: readonly Recommendation[];
  readonly imbalances: readonly string[];
};

export const DEFAULT_BRAND_NAME = 'Untitled brand';

export function buildAudit(brand: string, scores: Scores): Audit {
  return {
    brand: brand.trim() || DEFAULT_BRAND_NAME,
    scores,
    overall: overallScore(scores),
    ranking: rankLayers(scores),
    recommendations: recommend(scores),
    imbalances: detectImbalances(scores),
  };
}

/** Safe filename for a downloaded audit, e.g. "cbbe-audit-my-brand.md". */
export function auditFilename(brand: string): string {
  const slug = brand
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `cbbe-audit-${slug || 'brand'}.md`;
}

const escapeCell =(text: string): string => text.replace(/\|/g, '\\|');

const bandLabel = (band: Band): string => band.charAt(0).toUpperCase() + band.slice(1);

/** Render an audit as a markdown report. `date` is injected to keep this pure. */
export function auditToMarkdown(audit: Audit, date: string): string {
  const lines: string[] = [];
  lines.push(`# CBBE brand audit: ${escapeCell(audit.brand)}`, '', `Date: ${date}  `, `Overall score: **${audit.overall} / 10**`, '');
  lines.push('## Scores', '', '| Layer | Score | Band |', '| --- | --- | --- |');
  // Pyramid order from the top down reads most naturally in a report.
  for (const id of [...LAYER_IDS].reverse()) {
    const score = audit.scores[id];
    lines.push(`| ${LAYERS[id].label} | ${score} / 10 | ${bandLabel(bandFor(score))} |`);
  }
  lines.push('', '## Recommendations', '');
  if (audit.recommendations.length === 0) {
    lines.push('No layer scores below 7. Maintain what is working and re-audit regularly.');
  } else {
    for (const rec of audit.recommendations) {
      lines.push(`${rec.priority}. **${LAYERS[rec.layer].label} (${audit.scores[rec.layer]}/10): ${rec.headline}.** ${rec.action}`);
    }
  }
  lines.push('', '## Imbalances', '');
  if (audit.imbalances.length === 0) {
    lines.push('No major imbalances detected between layers.');
  } else {
    for (const note of audit.imbalances) lines.push(`- ${note}`);
  }
  lines.push(
    '',
    '---',
    '',
    'Framework: Keller (1993), "Conceptualizing, Measuring, and Managing Customer-Based Brand Equity", Journal of Marketing 57(1), 1-22. Scores are self-assessed on a 0-10 scale; treat this as a structured conversation starter, not a market-research result.',
    '',
  );
  return lines.join('\n');
}
