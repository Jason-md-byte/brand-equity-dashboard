import { LAYER_IDS, LAYERS, bandFor, type Scores } from '../core/cbbe';
import { colorForScore, pyramidSegments, radarAxisEnd, radarPolygon, radarRing, textColorFor } from '../core/geometry';

const PYRAMID_W = 400;
const PYRAMID_H = 300;
const RADAR_CX = 220;
const RADAR_CY = 165;
const RADAR_R = 112;

const describeScores = (scores: Scores): string =>
  [...LAYER_IDS].reverse().map((id) => `${LAYERS[id].label} ${scores[id]} out of 10, ${bandFor(scores[id])}`).join('; ');

export function renderPyramid(svg: SVGSVGElement, scores: Scores): void {
  const shapes = pyramidSegments(PYRAMID_W, PYRAMID_H)
    .map((seg) => {
      const fill = colorForScore(scores[seg.id]);
      const ink = textColorFor(fill);
      const label = LAYERS[seg.id].label;
      return `
        <g>
          <polygon points="${seg.points}" fill="${fill}" class="pyr-seg" />
          <text x="${seg.cx}" y="${seg.cy - 4}" text-anchor="middle" class="pyr-label" fill="${ink}">${label}</text>
          <text x="${seg.cx}" y="${seg.cy + 16}" text-anchor="middle" class="pyr-score" fill="${ink}">${scores[seg.id]}</text>
        </g>`;
    })
    .join('');
  svg.innerHTML = `
    <title id="pyramid-title">CBBE pyramid, darker means stronger</title>
    <desc id="pyramid-desc">${describeScores(scores)}.</desc>
    ${shapes}`;
}

export function renderRadar(svg: SVGSVGElement, scores: Scores): void {
  const rings = [2, 4, 6, 8, 10]
    .map((level) => `<polygon points="${radarRing(level, RADAR_CX, RADAR_CY, RADAR_R)}" class="radar-ring" />`)
    .join('');

  const axes = LAYER_IDS.map((id, i) => {
    const [ex, ey] = radarAxisEnd(i, 10, RADAR_CX, RADAR_CY, RADAR_R);
    const [lx, ly] = radarAxisEnd(i, 10, RADAR_CX, RADAR_CY, RADAR_R + 26);
    const anchor = Math.abs(lx - RADAR_CX) < 4 ? 'middle' : lx < RADAR_CX ? 'end' : 'start';
    const dy = ly < RADAR_CY - 40 ? -2 : ly > RADAR_CY + 40 ? 12 : 4;
    return `
      <line x1="${RADAR_CX}" y1="${RADAR_CY}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" class="radar-axis" />
      <text x="${lx.toFixed(1)}" y="${(ly + dy).toFixed(1)}" text-anchor="${anchor}" class="radar-label">${LAYERS[id].label}</text>`;
  }).join('');

  const dots = LAYER_IDS.map((id, i) => {
    const [x, y] = radarAxisEnd(i, scores[id], RADAR_CX, RADAR_CY, RADAR_R);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="radar-dot" />`;
  }).join('');

  svg.innerHTML = `
    <title id="radar-title">CBBE radar chart</title>
    <desc id="radar-desc">${describeScores(scores)}.</desc>
    ${rings}${axes}
    <polygon points="${radarPolygon(scores, RADAR_CX, RADAR_CY, RADAR_R)}" class="radar-shape" />
    ${dots}
    <text x="${RADAR_CX + 4}" y="${RADAR_CY - RADAR_R * 0.5 + 3}" class="radar-tick">5</text>
    <text x="${RADAR_CX + 4}" y="${RADAR_CY - RADAR_R + 3}" class="radar-tick">10</text>`;
}
