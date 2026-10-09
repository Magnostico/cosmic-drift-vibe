// ═══════════════════════════════════════════════════════
//  SPACE AUDIO ENGINE — Web Audio API & Embedded Audio
// ═══════════════════════════════════════════════════════

import { EMBEDDED_ROBLOX_LASER_MP3, EMBEDDED_EXPLOSION_MP3 } from './embeddedAudioData';

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
  private started = false;
  private disposed = false;

  // Decoded in-memory audio buffers for zero-latency Web Audio API
  private laserAudioBuffer: AudioBuffer | null = null;
  private explosionAudioBuffer: AudioBuffer | null = null;

  // Fallback Audio elements pool for guaranteed sound under any browser autoplay state
  private laserAudioElements: HTMLAudioElement[] = [];
  private explosionAudioElements: HTMLAudioElement[] = [];
  private laserPoolIdx = 0;
  private explosionPoolIdx = 0;

  constructor() {
    // Create instant HTMLAudioElement pools from embedded base64 data
    try {
      this.laserAudioElements = Array.from({ length: 8 }, () => {
        const a = new Audio(EMBEDDED_ROBLOX_LASER_MP3);
        a.volume = 0.9;
        return a;
      });
      this.explosionAudioElements = Array.from({ length: 4 }, () => {
        const a = new Audio(EMBEDDED_EXPLOSION_MP3);
        a.volume = 0.95;
        return a;
      });
    } catch (e) {
      console.warn('Audio pool creation notice:', e);
    }

    this.preloadAudioBuffers();
  }

  init() {
    if (this.disposed) return;
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.ctx.destination);
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      if (!this.started) {
        this.startAmbient();
        this.setupThrust();
        this.preloadAudioBuffers();
        this.started = true;
      }
    } catch (err) {
      console.warn('AudioContext init error:', err);
    }
  }

  private async preloadAudioBuffers() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.ctx.destination);
    }

    const ctx = this.ctx;

    // Decode embedded base64 laser MP3
    try {
      const laserRes = await fetch(EMBEDDED_ROBLOX_LASER_MP3);
      const laserArrayBuf = await laserRes.arrayBuffer();
      ctx.decodeAudioData(laserArrayBuf.slice(0), (buf) => {
        this.laserAudioBuffer = buf;
        console.log('✅ Roblox laser sound loaded in memory');
      });
    } catch (err) {
      console.warn('Laser decode error:', err);
    }

    // Decode embedded base64 explosion MP3
    try {
      const expRes = await fetch(EMBEDDED_EXPLOSION_MP3);
      const expArrayBuf = await expRes.arrayBuffer();
      ctx.decodeAudioData(expArrayBuf.slice(0), (buf) => {
        this.explosionAudioBuffer = buf;
        console.log('✅ 4-Second explosion sound loaded in memory');
      });
    } catch (err) {
      console.warn('Explosion decode error:', err);
    }
  }

  /** Direct registration for drag-and-dropped user files */
  async loadCustomAudio(type: 'laser' | 'explosion', blobUrl: string) {
    this.init();
    if (!this.ctx) return;
    try {
      const res = await fetch(blobUrl);
      const arrayBuf = await res.arrayBuffer();
      this.ctx.decodeAudioData(arrayBuf, (audioBuf) => {
        if (type === 'laser') {
          this.laserAudioBuffer = audioBuf;
        } else {
          this.explosionAudioBuffer = audioBuf;
        }
      });
    } catch (err) {
      console.warn('Custom audio decode error:', err);
    }
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
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.05;
    this.ambientGain.connect(this.masterGain);

    // Deep space drone
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

    // Cosmic background wind
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
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    this.thrustGain = ctx.createGain();
    this.thrustGain.gain.value = 0;
    this.thrustGain.connect(this.masterGain);

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
    this.init();
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
    this.init();
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
    this.init();
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
    this.init();
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
    this.init();
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
    this.init();
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

  /**
   * 4-Second Heavy Cinematic Explosion for Player and Enemy Ships
   */
  playExplosion() {
    this.init();

    // 1. Play HTMLAudioElement instance for instant playback
    if (this.explosionAudioElements.length > 0) {
      try {
        const a = this.explosionAudioElements[this.explosionPoolIdx % this.explosionAudioElements.length];
        this.explosionPoolIdx++;
        a.currentTime = 0;
        a.play().catch(e => console.debug('Explosion audio playback prevented:', e));
      } catch (err) {
        console.debug('Explosion audio error:', err);
      }
    }

    // 2. Play Web Audio Buffer
    if (this.ctx && this.masterGain) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      if (this.explosionAudioBuffer) {
        try {
          const src = ctx.createBufferSource();
          src.buffer = this.explosionAudioBuffer;
          const gain = ctx.createGain();
          gain.gain.value = 1.0;
          src.connect(gain);
          gain.connect(this.masterGain);
          src.start(t0);
        } catch (err) {
          console.debug('Explosion buffer error:', err);
        }
      }

      // 3. Layered 2.0-second deep cinematic sub-bass shockwave
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, t0);
      subOsc.frequency.exponentialRampToValueAtTime(16, t0 + 1.9);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.8, t0);
      subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);
      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(t0);
      subOsc.stop(t0 + 2.1);
    }
  }

  /**
   * Player Laser Cannon Blast (roblox-laser-gun.mp3)
   */
  playPlayerLaser() {
    this.init();

    // 1. Play HTMLAudioElement instance for instant playback
    if (this.laserAudioElements.length > 0) {
      try {
        const a = this.laserAudioElements[this.laserPoolIdx % this.laserAudioElements.length];
        this.laserPoolIdx++;
        a.currentTime = 0;
        a.play().catch(e => console.debug('Laser audio playback prevented:', e));
      } catch (err) {
        console.debug('Laser audio element error:', err);
      }
    }

    // 2. Play Web Audio Buffer
    if (this.ctx && this.masterGain) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      if (this.laserAudioBuffer) {
        try {
          const src = ctx.createBufferSource();
          src.buffer = this.laserAudioBuffer;
          const gain = ctx.createGain();
          gain.gain.value = 1.0;
          src.connect(gain);
          gain.connect(this.masterGain);
          src.start(t0);
        } catch (err) {
          console.debug('Laser buffer error:', err);
        }
      }
    }
  }

  /**
   * Enemy TIE-Fighter Laser Cannon Blast
   */
  playEnemyLaser() {
    this.init();

    // 1. Play HTMLAudioElement with pitch variation
    if (this.laserAudioElements.length > 0) {
      try {
        const a = this.laserAudioElements[this.laserPoolIdx % this.laserAudioElements.length];
        this.laserPoolIdx++;
        a.currentTime = 0;
        a.playbackRate = 0.85 + Math.random() * 0.15;
        a.play().catch(e => console.debug('Enemy laser playback prevented:', e));
      } catch (err) {
        console.debug('Enemy laser error:', err);
      }
    }

    // 2. Play Web Audio Buffer
    if (this.ctx && this.masterGain) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;

      if (this.laserAudioBuffer) {
        try {
          const src = ctx.createBufferSource();
          src.buffer = this.laserAudioBuffer;
          src.playbackRate.value = 0.85 + Math.random() * 0.15;
          const gain = ctx.createGain();
          gain.gain.value = 0.7;
          src.connect(gain);
          gain.connect(this.masterGain);
          src.start(t0);
        } catch (err) {
          console.debug('Enemy laser buffer error:', err);
        }
      }
    }
  }

  /** Shield impact / hull hit deflection */
  playHitImpact() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t0);
    osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  /** Target defeated / destroyed chime */
  playKillScore() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    [587.33, 880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, t0 + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0 + idx * 0.05);
      osc.stop(t0 + idx * 0.05 + 0.27);
    });
  }

  /** Mission / Objective completed fanfare */
  playMissionComplete() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0 + idx * 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, t0 + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t0 + idx * 0.08);
      osc.stop(t0 + idx * 0.08 + 0.48);
    });
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
    } catch (err) {
      console.debug('Audio dispose notice:', err);
    }
    this.ctx = null;
  }
}



