/**
 * DUAA — Audio asset generator.
 *
 * Produces the two short cues the tasbeeh uses:
 *   assets/audio/tick.wav  — a soft marble "click" for every count
 *   assets/audio/chime.wav — a two-note bell when a target is completed
 *
 * They are synthesised (16-bit mono PCM, 44.1 kHz) rather than downloaded so
 * the repo carries no third-party audio licence and the app stays fully offline.
 * Re-run with `npm run audio:generate`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'audio');

const SAMPLE_RATE = 44100;

/** Additive synth: sum of partials with independent decay. */
function synth(durationSeconds, partials, envelope = (t, duration) => Math.exp(-6 * (t / duration))) {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float64Array(length);

  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    for (const partial of partials) {
      const decay = Math.exp(-partial.decay * t);
      value += partial.gain * decay * Math.sin(2 * Math.PI * partial.freq * t + (partial.phase ?? 0));
    }
    samples[i] = value * envelope(t, durationSeconds);
  }
  return samples;
}

function normalize(samples, peak = 0.72) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  if (max === 0) return samples;
  const factor = peak / max;
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) out[i] = samples[i] * factor;
  return out;
}

/** Short fade in/out to avoid a click at the buffer edges. */
function applyEdgeFade(samples, fadeSeconds = 0.004) {
  const fadeLength = Math.max(1, Math.floor(fadeSeconds * SAMPLE_RATE));
  const out = new Float64Array(samples);
  for (let i = 0; i < fadeLength; i += 1) {
    const gain = i / fadeLength;
    out[i] *= gain;
    out[out.length - 1 - i] *= gain;
  }
  return out;
}

function encodeWav(samples) {
  const dataLength = samples.length * 2; // 16-bit
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // format = PCM
  buffer.writeUInt16LE(1, 22); // channels = mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  let offset = 44;
  for (const sample of samples) {
    const clamped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }
  return buffer;
}

function buildTick() {
  // A woody transient: bright partials that die within ~45 ms.
  const samples = synth(0.05, [
    { freq: 1180, gain: 1.0, decay: 95 },
    { freq: 1760, gain: 0.55, decay: 130 },
    { freq: 2640, gain: 0.25, decay: 180, phase: 0.4 },
    { freq: 420, gain: 0.35, decay: 70 },
  ]);
  return encodeWav(applyEdgeFade(normalize(samples, 0.6), 0.002));
}

function buildChime() {
  // E5 then A5, bell-like (inharmonic partials), ~1.1 s total.
  const first = synth(
    1.1,
    [
      { freq: 659.25, gain: 1.0, decay: 3.4 },
      { freq: 1318.5, gain: 0.42, decay: 5.2 },
      { freq: 1976, gain: 0.18, decay: 7.1 },
      { freq: 2637, gain: 0.08, decay: 9.0 },
    ],
    () => 1,
  );
  const second = synth(
    1.1,
    [
      { freq: 880.0, gain: 1.0, decay: 3.1 },
      { freq: 1760.0, gain: 0.4, decay: 4.8 },
      { freq: 2640, gain: 0.16, decay: 6.6 },
      { freq: 3520, gain: 0.07, decay: 8.4 },
    ],
    () => 1,
  );

  const delay = Math.floor(0.26 * SAMPLE_RATE);
  const total = Math.max(first.length, delay + second.length);
  const mixed = new Float64Array(total);
  for (let i = 0; i < first.length; i += 1) mixed[i] += first[i] * 0.8;
  for (let i = 0; i < second.length; i += 1) mixed[delay + i] += second[i] * 0.85;

  return encodeWav(applyEdgeFade(normalize(mixed, 0.62), 0.01));
}

mkdirSync(OUT_DIR, { recursive: true });

const outputs = [
  ['tick.wav', buildTick()],
  ['chime.wav', buildChime()],
];

for (const [name, buffer] of outputs) {
  const path = join(OUT_DIR, name);
  writeFileSync(path, buffer);
  console.log(`✓ assets/audio/${name} — ${(buffer.length / 1024).toFixed(1)} KB`);
}

console.log('Audio assets generated.');
