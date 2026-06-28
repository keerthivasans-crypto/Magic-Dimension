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

  /* =========================================================
     NEW: element spell sounds (appended — existing methods
     above are untouched). Built from oscillators + filtered
     noise bursts only, so no external audio assets are needed.
     ========================================================= */

  // Shared helper: a filtered burst of white noise, used for
  // crackle/whoosh/rumble textures below.
  _noiseBurst(duration, filterType = 'lowpass', filterFreq = 1000, gainStart = 0.3, filterSweepTo = null) {
    const ctx = this._ensureCtx();
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, ctx.currentTime);
    if (filterSweepTo !== null) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterSweepTo), ctx.currentTime + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainStart * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  }

  // 🔥 Fire: crackling noise bed (bandpass, sizzling) + a low ember rumble + occasional pop.
  playFire() {
    this._noiseBurst(0.5, 'bandpass', 2200, 0.22, 800); // sizzle/crackle
    this._tone(85, 0.6, 'sawtooth', 0.25);               // low rumble
    setTimeout(() => this._noiseBurst(0.08, 'highpass', 3000, 0.15), 120); // ember pop
  }

  // ❄️ Ice: bright tinkling chimes + airy high-frequency shimmer noise.
  playIce() {
    [1320, 1760, 2100].forEach((f, i) => setTimeout(() => this._tone(f, 0.35, 'sine', 0.15), i * 70));
    this._noiseBurst(0.4, 'highpass', 4000, 0.08); // frosty shimmer
  }

  // ⚡ Lightning: sharp noise crack + fast downward zap sweep + distant thunder rumble.
  playLightning() {
    this._noiseBurst(0.12, 'highpass', 5000, 0.4);   // crack
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.25); // zap sweep
    gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => this._noiseBurst(0.8, 'lowpass', 300, 0.18, 80), 100); // distant thunder rumble
  }

  // 🌪️ Wind: a sweeping filtered-noise whoosh, rising then falling in tone.
  playWind() {
    this._noiseBurst(0.9, 'bandpass', 300, 0.25, 1400);
    setTimeout(() => this._noiseBurst(0.6, 'bandpass', 1400, 0.15, 250), 250);
  }

  // 🌿 Nature: soft ascending kalimba-like chime sequence.
  playNature() {
    [392, 440, 523, 659].forEach((f, i) => setTimeout(() => this._tone(f, 0.4, 'triangle', 0.18), i * 90));
  }

  // 🌑 Shadow: low dissonant drone with a faint hiss of dark noise underneath.
  playShadow() {
    this._tone(110, 0.8, 'sawtooth', 0.18);
    this._tone(116, 0.8, 'sine', 0.12); // slightly detuned for dissonance
    this._noiseBurst(0.7, 'lowpass', 500, 0.1);
  }

  // 🌌 Galaxy: ethereal layered sine tones with slow shimmering motion.
  playGalaxy() {
    [330, 440, 550, 660].forEach((f, i) => {
      const ctx = this._ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(f * 1.05, ctx.currentTime + 1.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12 * this.volume, ctx.currentTime + 0.3 + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.4);
    });
  }

  // 🌈 Rainbow: a bright ascending arpeggio across six tones.
  playRainbow() {
    [523, 587, 659, 698, 784, 880].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.16), i * 60));
  }

  // 💠 Neon: a fast synth laser/zap sweep with a bright square-wave edge.
  playNeon() {
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    this._tone(1600, 0.12, 'sine', 0.1); // bright edge tick
  }
}
