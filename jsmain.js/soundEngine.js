// js/soundEngine.js
// Generates simple magical sound effects with the Web Audio API.
// No external audio assets required, so the demo has zero network dependency for sound.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  setVolume(v) { this.volume = v; }

  _tone(freq, duration, type = 'sine', startGain = 0.4) {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(startGain * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  energyBall() {
    this._tone(420, 0.4, 'sine', 0.3);
    this._tone(640, 0.3, 'triangle', 0.15);
  }

  fireBlast() {
    const ctx = this._ensureCtx();
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5 * this.volume, ctx.currentTime);
    noise.connect(gain).connect(ctx.destination);
    noise.start();
    this._tone(90, 0.5, 'sawtooth', 0.4);
  }

  trail() { this._tone(900 + Math.random()*200, 0.08, 'sine', 0.08); }

  spellWheel() { this._tone(700, 0.15, 'triangle', 0.2); }

  elementChoose(_element) { this._tone(560, 0.25, 'square', 0.18); }

  portal() {
    this._tone(220, 0.8, 'sine', 0.25);
    this._tone(330, 0.8, 'sine', 0.15);
  }

  heart() { this._tone(523, 0.3, 'sine', 0.2); this._tone(659, 0.4, 'sine', 0.15); }

  power(up) { this._tone(up ? 880 : 220, 0.2, 'triangle', 0.2); }

  ultimate() {
    [200, 400, 600, 800].forEach((f, i) => setTimeout(() => this._tone(f, 0.5, 'sawtooth', 0.25), i * 100));
  }
}
