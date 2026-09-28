// ═══════════════════════════════════════════════════════
//  PROCEDURAL SPACE AUDIO ENGINE — Web Audio API
// ═══════════════════════════════════════════════════════

export class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private thrustGain: GainNode | null = null;
  private thrustOsc: OscillatorNode | null = null;
  private thrustNoise: AudioBufferSourceNode | null = null;
  private thrustFilter: BiquadFilterNode | null = null;
  private ambientDrone: OscillatorNode | null = null;
  private ambientDrone2: OscillatorNode | null = null;
  private ambientNoise: AudioBufferSourceNode | null = null;
  private isThrusting = false;
  private started = false;
  private disposed = false;

  init() {
    if (this.started || this.disposed) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(this.ctx.destination);

    this.startAmbient();
    this.setupThrust();
    this.started = true;
  }

  private createNoiseBuffer(duration = 2): AudioBuffer {
    const ctx = this.ctx!;
    const size = ctx.sampleRate * duration;
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startAmbient() {
    const ctx = this.ctx!;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.06;
    this.ambientGain.connect(this.masterGain!);

    // Deep space drone — layered oscillators
    this.ambientDrone = ctx.createOscillator();
    this.ambientDrone.type = 'sine';
    this.ambientDrone.frequency.value = 38;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 80;
    this.ambientDrone.connect(droneFilter);
    droneFilter.connect(this.ambientGain);
    this.ambientDrone.start();

    this.ambientDrone2 = ctx.createOscillator();
    this.ambientDrone2.type = 'sine';
    this.ambientDrone2.frequency.value = 57;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    this.ambientDrone2.connect(g2);
    g2.connect(this.ambientGain);
    this.ambientDrone2.start();

    // Subtle filtered noise for "cosmic wind"
    const noiseBuf = this.createNoiseBuffer(4);
    this.ambientNoise = ctx.createBufferSource();
    this.ambientNoise.buffer = noiseBuf;
    this.ambientNoise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 200;
    noiseFilter.Q.value = 0.5;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.3;
    this.ambientNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ambientGain);
    this.ambientNoise.start();
  }

  private setupThrust() {
    const ctx = this.ctx!;
    this.thrustGain = ctx.createGain();
    this.thrustGain.gain.value = 0;
    this.thrustGain.connect(this.masterGain!);

    // Engine rumble oscillator
    this.thrustOsc = ctx.createOscillator();
    this.thrustOsc.type = 'sawtooth';
    this.thrustOsc.frequency.value = 55;
    this.thrustFilter = ctx.createBiquadFilter();
    this.thrustFilter.type = 'lowpass';
    this.thrustFilter.frequency.value = 300;
    this.thrustFilter.Q.value = 2;
    this.thrustOsc.connect(this.thrustFilter);
    this.thrustFilter.connect(this.thrustGain);
    this.thrustOsc.start();

    // Engine noise layer
    const noiseBuf = this.createNoiseBuffer(2);
    this.thrustNoise = ctx.createBufferSource();
    this.thrustNoise.buffer = noiseBuf;
    this.thrustNoise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 600;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;
    this.thrustNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.thrustGain);
    this.thrustNoise.start();
  }

  /** Call every frame: intensity 0-1 based on thrust level */
  updateThrust(intensity: number) {
    if (!this.ctx || !this.thrustGain || !this.thrustFilter) return;
    const t = this.ctx.currentTime;
    this.thrustGain.gain.setTargetAtTime(intensity * 0.35, t, 0.05);
    this.thrustFilter.frequency.setTargetAtTime(200 + intensity * 800, t, 0.08);
    if (this.thrustOsc) {
      this.thrustOsc.frequency.setTargetAtTime(45 + intensity * 60, t, 0.1);
    }
  }

  /** Gear change — short frequency sweep */
  playGearShift(gearLevel: number) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 300 + gearLevel * 200;
    const g = ctx.createGain();
    g.gain.value = 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Transition whoosh — noise sweep */
  playTransition() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const buf = this.createNoiseBuffer(1.5);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    filter.frequency.exponentialRampToValueAtTime(4000, ctx.currentTime + 0.4);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 1.2);
    filter.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + 1.5);
  }

  /** Planet click — tonal ping */
  playPlanetClick() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1320;
    osc2.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
    const g = ctx.createGain();
    g.gain.value = 0.12;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(g);
    osc2.connect(g);
    g.connect(this.masterGain);
    osc.start(); osc2.start();
    osc.stop(ctx.currentTime + 0.45);
    osc2.stop(ctx.currentTime + 0.45);
  }

  /** UI button click — subtle tick */
  playUIClick() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.value = 0.08;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /** Toggle mode sound — ascending/descending */
  playToggle(on: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = on ? 500 : 700;
    osc.frequency.exponentialRampToValueAtTime(on ? 800 : 400, ctx.currentTime + 0.12);
    const g = ctx.createGain();
    g.gain.value = 0.1;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  /** Brake sound — low rumble */
  playBrake() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 80;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    const g = ctx.createGain();
    g.gain.value = 0.1;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  /** Cinematic heavy explosion sound synthesis */
  playExplosion() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    // 1. Initial supersonic crack / transient (sharp burst)
    const crackOsc = ctx.createOscillator();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(450, t0);
    crackOsc.frequency.exponentialRampToValueAtTime(30, t0 + 0.12);
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.4, t0);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
    crackOsc.connect(crackGain);
    crackGain.connect(this.masterGain);
    crackOsc.start(t0);
    crackOsc.stop(t0 + 0.16);

    // 2. Deep sub-bass boom (hull disintegration shockwave)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t0);
    subOsc.frequency.exponentialRampToValueAtTime(25, t0 + 1.2);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.6, t0);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.4);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t0);
    subOsc.stop(t0 + 1.45);

    // 3. Fiery roar & thermal debris noise (decaying rumble)
    const noiseBuf = this.createNoiseBuffer(2.5);
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, t0);
    noiseFilter.frequency.exponentialRampToValueAtTime(60, t0 + 2.0);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.2);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseSrc.start(t0);
    noiseSrc.stop(t0 + 2.3);
  }

  dispose() {
    this.disposed = true;
    try {
      this.ambientDrone?.stop();
      this.ambientDrone2?.stop();
      this.ambientNoise?.stop();
      this.thrustOsc?.stop();
      this.thrustNoise?.stop();
      this.ctx?.close();
    } catch {}
    this.ctx = null;
  }
}
