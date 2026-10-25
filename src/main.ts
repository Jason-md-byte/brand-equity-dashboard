import './style.css';
import { auditFilename, auditToMarkdown, buildAudit, type Audit, type Scores } from './core/cbbe';
import { EXAMPLE_BRAND_NAME, EXAMPLE_SCORES } from './core/example';
import { renderPyramid, renderRadar } from './ui/charts';
import { required } from './ui/dom';
import { mountForm } from './ui/form';
import { renderResults } from './ui/results';

const today = (): string => new Date().toISOString().slice(0, 10);

function init(): void {
  const doc = document;
  const radar = required<SVGSVGElement>(doc, '#radar');
  const pyramid = required<SVGSVGElement>(doc, '#pyramid');
  const status = required<HTMLElement>(doc, '#status');
  const resultEls = {
    brand: required<HTMLElement>(doc, '#summary-brand'),
    overall: required<HTMLElement>(doc, '#overall-num'),
    recs: required<HTMLElement>(doc, '#recs'),
    imbalances: required<HTMLElement>(doc, '#imbalances'),
  };

  let current: Audit = buildAudit(EXAMPLE_BRAND_NAME, EXAMPLE_SCORES);
  let statusTimer: number | undefined;

  const say = (message: string): void => {
    status.textContent = message;
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {
      status.textContent = '';
    }, 4000);
  };

  const update = (brand: string, scores: Scores): void => {
    current = buildAudit(brand, scores);
    renderResults(resultEls, current);
    renderPyramid(pyramid, current.scores);
    renderRadar(radar, current.scores);
  };

  const form = mountForm(required<HTMLElement>(doc, '#layer-controls'), required<HTMLInputElement>(doc, '#brand-name'), update);
  form.setValues(EXAMPLE_BRAND_NAME, EXAMPLE_SCORES);

  required<HTMLButtonElement>(doc, '#reset-btn').addEventListener('click', () => {
    form.setValues(EXAMPLE_BRAND_NAME, EXAMPLE_SCORES);
    say('Reset to the fictional example brand.');
  });

  required<HTMLButtonElement>(doc, '#download-btn').addEventListener('click', () => {
    const blob = new Blob([auditToMarkdown(current, today())], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement('a');
    link.href = url;
    link.download = auditFilename(current.brand);
    doc.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    say(`Downloaded ${link.download}.`);
  });

  required<HTMLButtonElement>(doc, '#copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(auditToMarkdown(current, today())).then(
      () => say('Markdown copied to clipboard.'),
      (error: unknown) => {
        console.error('Clipboard write failed', error);
        say('Copy was blocked by the browser. Use Download .md instead.');
      },
    );
  });
}

init();
