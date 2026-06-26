// SVG F-16 HUD overlay. All elements updated via setAttribute per frame.
// ponytail: single SVG, no frameworks, green phosphor #39FF14.

const PITCH_PX_PER_DEG = 8;
const HEADING_PX_PER_DEG = 4;
const SPEED_PX_PER_KNOT = 0.3;
const ALT_PX_PER_FT = 0.002;

export interface FlightState {
  pitch: number;      // radians
  roll: number;       // radians
  headingDeg: number;
  speed: number;
  altitude: number;
  gForce: number;
}

export class Hud {
  private svg: SVGSVGElement;
  private pitchLadder: SVGGElement;
  private speedLadder: SVGGElement;
  private altLadder: SVGGElement;
  private headingTape: SVGGElement;
  private fpm: SVGGElement;
  private gText: SVGTextElement;

  constructor() {
    this.svg = document.querySelector('#hud-svg')!;
    this.pitchLadder = this.svg.querySelector('#pitch-ladder')!;
    this.speedLadder = this.svg.querySelector('#speed-ladder')!;
    this.altLadder = this.svg.querySelector('#alt-ladder')!;
    this.headingTape = this.svg.querySelector('#heading-tape')!;
    this.fpm = this.svg.querySelector('#fpm')!;
    this.gText = this.svg.querySelector('#g-text')!;
    this.buildPitchLadder();
    this.buildSpeedLadder();
    this.buildAltLadder();
    this.buildHeadingTape();
  }

  update(s: FlightState): void {
    const pitchDeg = s.pitch * 180 / Math.PI;
    const bankDeg = s.roll * 180 / Math.PI;

    // pitch ladder: rotate by bank, translate by pitch
    this.pitchLadder.setAttribute(
      'transform',
      `rotate(${bankDeg} 400 300) translate(0 ${pitchDeg * PITCH_PX_PER_DEG})`,
    );

    // speed ladder: scroll by speed
    const speedOffset = (s.speed - 480) * SPEED_PX_PER_KNOT;
    this.speedLadder.setAttribute('transform', `translate(0 ${speedOffset})`);

    // alt ladder: scroll by altitude
    const altOffset = (s.altitude - 15000) * ALT_PX_PER_FT;
    this.altLadder.setAttribute('transform', `translate(0 ${-altOffset})`);

    // heading tape: scroll by heading
    this.headingTape.setAttribute(
      'transform',
      `translate(${-(s.headingDeg * HEADING_PX_PER_DEG)} 0)`,
    );

    // FPM: moves with pitch + roll offset
    const fpmX = 400 + Math.sin(s.roll) * 60;
    const fpmY = 300 - pitchDeg * PITCH_PX_PER_DEG;
    this.fpm.setAttribute('transform', `translate(${fpmX} ${fpmY})`);

    // G-force text
    this.gText.textContent = `G ${s.gForce.toFixed(1)}`;
  }

  private buildPitchLadder(): void {
    let html = '';
    for (let deg = -30; deg <= 30; deg += 5) {
      const y = 300 - deg * PITCH_PX_PER_DEG;
      const w = deg === 0 ? 200 : 80;
      const sw = deg === 0 ? 2.5 : 1.5;
      html += `<line x1="${400 - w/2}" y1="${y}" x2="${400 + w/2}" y2="${y}" stroke="#39FF14" stroke-width="${sw}"/>`;
      if (deg !== 0) {
        html += `<text x="${400 - w/2 - 6}" y="${y + 4}" fill="#39FF14" font-size="12" text-anchor="end">${Math.abs(deg)}</text>`;
        html += `<text x="${400 + w/2 + 6}" y="${y + 4}" fill="#39FF14" font-size="12">${Math.abs(deg)}</text>`;
      }
    }
    this.pitchLadder.innerHTML = html;
  }

  private buildSpeedLadder(): void {
    let html = '';
    for (let kts = 280; kts <= 680; kts += 20) {
      const y = 300 - (kts - 480) * SPEED_PX_PER_KNOT;
      html += `<line x1="170" y1="${y}" x2="190" y2="${y}" stroke="#39FF14" stroke-width="1.5"/>`;
      html += `<text x="165" y="${y + 4}" fill="#39FF14" font-size="11" text-anchor="end">${kts}</text>`;
    }
    html += `<rect x="168" y="294" width="28" height="12" fill="none" stroke="#39FF14" stroke-width="2"/>`;
    this.speedLadder.innerHTML = html;
  }

  private buildAltLadder(): void {
    let html = '';
    for (let ft = 0; ft <= 45000; ft += 1000) {
      const y = 300 + (ft - 15000) * ALT_PX_PER_FT;
      html += `<line x1="610" y1="${y}" x2="630" y2="${y}" stroke="#39FF14" stroke-width="1.5"/>`;
      html += `<text x="635" y="${y + 4}" fill="#39FF14" font-size="11">${(ft/1000).toFixed(0)}</text>`;
    }
    html += `<rect x="604" y="294" width="30" height="12" fill="none" stroke="#39FF14" stroke-width="2"/>`;
    this.altLadder.innerHTML = html;
  }

  private buildHeadingTape(): void {
    let html = '';
    for (let deg = 0; deg <= 360; deg += 10) {
      const x = 400 + deg * HEADING_PX_PER_DEG;
      const major = deg % 30 === 0;
      const h = major ? 12 : 6;
      html += `<line x1="${x}" y1="40" x2="${x}" y2="${40 + h}" stroke="#39FF14" stroke-width="${major ? 2 : 1.5}"/>`;
      if (major) {
        const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}`;
        html += `<text x="${x}" y="68" fill="#39FF14" font-size="12" text-anchor="middle">${label}</text>`;
      }
    }
    html += `<polygon points="400,80 394,72 406,72" fill="#39FF14"/>`;
    this.headingTape.innerHTML = html;
  }
}
