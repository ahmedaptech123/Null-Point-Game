import type { WeaponId } from "./config";

/**
 * Tiny synthesized sound kit. No external audio files, everything is
 * generated from oscillators and procedural noise so the game stays portable.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffer: AudioBuffer | null = null;
  muted = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.34;
    this.master.connect(this.ctx.destination);

    const length = Math.floor(this.ctx.sampleRate * 0.5);
    this.buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.34, this.ctx.currentTime, 0.02);
    }
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    slideTo?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 20), t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private burst(duration: number, volume: number, frequency: number, type: BiquadFilterType = "bandpass") {
    if (!this.ctx || !this.master || !this.buffer || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  shoot(weapon: WeaponId) {
    if (weapon === "pulse") {
      this.burst(0.075, 0.34, 1700);
      this.tone(170, 0.08, "square", 0.12, 54);
    } else if (weapon === "scatter") {
      this.burst(0.19, 0.55, 780, "lowpass");
      this.tone(92, 0.16, "sine", 0.25, 38);
    } else {
      this.tone(920, 0.22, "sawtooth", 0.16, 110);
      this.burst(0.12, 0.3, 2400);
      this.tone(58, 0.28, "sine", 0.28, 32);
    }
  }

  hit(headshot: boolean) {
    this.tone(headshot ? 1850 : 1240, 0.045, "sine", 0.16, headshot ? 1700 : 1080);
    if (headshot) this.tone(2640, 0.06, "triangle", 0.07);
  }

  kill() {
    this.tone(540, 0.08, "triangle", 0.13, 720);
    this.tone(860, 0.14, "sine", 0.1, 960, 0.05);
  }

  empty() {
    this.burst(0.035, 0.18, 2400);
  }

  reload() {
    this.burst(0.035, 0.22, 1800);
    this.burst(0.04, 0.18, 900);
    this.tone(220, 0.05, "square", 0.05);
  }

  damage() {
    this.burst(0.18, 0.28, 180, "lowpass");
    this.tone(74, 0.18, "sine", 0.24, 40);
  }

  hostileShot() {
    this.tone(360, 0.14, "sawtooth", 0.055, 90);
  }

  spawn() {
    this.tone(232, 0.22, "sine", 0.07, 580);
  }

  ui() {
    this.tone(560, 0.035, "square", 0.035, 600);
  }

  end(complete: boolean) {
    if (complete) {
      [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.24, "triangle", 0.11, f, i * 0.1));
    } else {
      [320, 240, 160].forEach((f, i) => this.tone(f, 0.3, "sawtooth", 0.08, f * 0.7, i * 0.13));
    }
  }
}
