import { LAYERS, bandFor, type Audit } from '../core/cbbe';
import { escapeHtml } from './dom';

export type ResultEls = {
  readonly brand: HTMLElement;
  readonly overall: HTMLElement;
  readonly recs: HTMLElement;
  readonly imbalances: HTMLElement;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function renderResults(els: ResultEls, audit: Audit): void {
  els.brand.textContent = audit.brand;
  els.overall.textContent = audit.overall.toFixed(1);

  els.recs.innerHTML =
    audit.recommendations.length === 0
      ? '<li class="empty">Every layer scores 7 or higher. Maintain what is working and re-audit regularly.</li>'
      : audit.recommendations
          .map((rec) => {
            const label = LAYERS[rec.layer].label;
            const score = audit.scores[rec.layer];
            return `
              <li class="rec">
                <div class="rec-head">
                  <span class="rec-layer">${escapeHtml(label)}</span>
                  <span class="badge badge-${bandFor(score)}">${score}/10 &middot; ${capitalize(rec.band)}</span>
                </div>
                <p class="rec-title">${escapeHtml(rec.headline)}</p>
                <p class="rec-body">${escapeHtml(rec.action)}</p>
              </li>`;
          })
          .join('');

  els.imbalances.innerHTML =
    audit.imbalances.length === 0
      ? '<li class="empty">No major imbalances between layers.</li>'
      : audit.imbalances.map((note) => `<li>${escapeHtml(note)}</li>`).join('');
}
