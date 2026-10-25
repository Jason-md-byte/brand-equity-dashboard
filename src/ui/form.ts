import { LAYER_IDS, LAYERS, SCORE_MAX, SCORE_MIN, clampScore, normalizeScores, type LayerId, type Scores } from '../core/cbbe';
import { escapeHtml, required } from './dom';

type Controls = { readonly range: HTMLInputElement; readonly num: HTMLInputElement };

export type FormApi = {
  setValues(brand: string, scores: Scores): void;
};

export type FormChange = (brand: string, scores: Scores) => void;

function layerMarkup(id: LayerId): string {
  const meta = LAYERS[id];
  return `
    <div class="control" data-layer="${id}">
      <div class="control-head">
        <label for="range-${id}">${escapeHtml(meta.label)}</label>
        <div class="num-wrap">
          <label class="sr-only" for="num-${id}">${escapeHtml(meta.label)} score, 0 to 10</label>
          <input id="num-${id}" class="num" type="number" inputmode="numeric" min="${SCORE_MIN}" max="${SCORE_MAX}" step="1" />
        </div>
      </div>
      <input id="range-${id}" class="range" type="range" min="${SCORE_MIN}" max="${SCORE_MAX}" step="1" aria-describedby="q-${id}" />
      <p class="control-q" id="q-${id}">${escapeHtml(meta.question)}</p>
      <p class="control-blurb">${escapeHtml(meta.blurb)}</p>
    </div>`;
}

export function mountForm(container: HTMLElement, brandInput: HTMLInputElement, onChange: FormChange): FormApi {
  container.innerHTML = LAYER_IDS.map(layerMarkup).join('');

  const controls = Object.fromEntries(
    LAYER_IDS.map((id): [LayerId, Controls] => [
      id,
      { range: required<HTMLInputElement>(container, `#range-${id}`), num: required<HTMLInputElement>(container, `#num-${id}`) },
    ]),
  ) as Record<LayerId, Controls>;

  const readScores = (): Scores =>
    normalizeScores(Object.fromEntries(LAYER_IDS.map((id) => [id, Number(controls[id].range.value)])));

  const emit = (): void => onChange(brandInput.value, readScores());

  for (const id of LAYER_IDS) {
    const { range, num } = controls[id];
    range.addEventListener('input', () => {
      num.value = range.value;
      emit();
    });
    num.addEventListener('input', () => {
      // Let people clear the field while typing; only valid numbers update the chart.
      if (num.value.trim() === '') return;
      range.value = String(clampScore(Number(num.value)));
      emit();
    });
    num.addEventListener('change', () => {
      num.value = String(clampScore(num.value.trim() === '' ? Number(range.value) : Number(num.value)));
      range.value = num.value;
      emit();
    });
  }
  brandInput.addEventListener('input', emit);

  return {
    setValues(brand, scores) {
      brandInput.value = brand;
      for (const id of LAYER_IDS) {
        controls[id].range.value = String(scores[id]);
        controls[id].num.value = String(scores[id]);
      }
      emit();
    },
  };
}
