// Pure amplitude/path math shared by the static (decoded) and live
// (AnalyserNode) waveform doodle. Kept framework-free so it is trivial to
// unit test and reuse from both the fallback and the animation loop.

export const WAVE_POINTS = 40;

export function fallbackPeaks(seed: number): number[] {
  let s = (seed + 1) * 9301;
  const out: number[] = [];
  for (let i = 0; i < WAVE_POINTS; i++) {
    s = (s * 9301 + 49297) % 233280;
    out.push(0.22 + (s / 233280) * 0.78);
  }
  return out;
}

export function buildWavePath(peaks: number[]): string {
  const cx = 50, cy = 50;
  let d = "";
  for (let loop = 0; loop < 3; loop++) {
    const pts: [number, number][] = [];
    for (let i = 0; i <= WAVE_POINTS; i++) {
      const p = peaks[i % WAVE_POINTS];
      const ang = (i / WAVE_POINTS) * Math.PI * 2 * (1 + loop * 0.18) + loop * 1.7;
      const rad = 10 + p * 32;
      pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 0.92]);
    }
    d += "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1) + " ";
    for (let i = 1; i < pts.length; i++) d += "L" + pts[i][0].toFixed(1) + "," + pts[i][1].toFixed(1) + " ";
  }
  return d;
}

export function livePeaksFromAnalyser(analyser: AnalyserNode): number[] {
  const buf = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buf);
  const block = Math.max(1, Math.floor(buf.length / WAVE_POINTS));
  const peaks: number[] = [];
  for (let i = 0; i < WAVE_POINTS; i++) {
    let max = 0;
    for (let j = 0; j < block; j++) {
      const v = Math.abs((buf[i * block + j] ?? 128) - 128) / 128;
      if (v > max) max = v;
    }
    peaks.push(Math.min(1, 0.18 + max * 1.7));
  }
  return peaks;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}
