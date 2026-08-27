/**
 * Web Audio API procedural synthesizer for ASMR fruit peeling sounds.
 * 0 MP3 dependencies — 100% generated in real-time.
 * Follows SPEC.md §3: "soàn soạt" pitch modulated with peeling speed, "pop" on completion, quiet background.
 */

export class PeelAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Peeling continuous friction node graph
  private frictionNoiseSource: AudioBufferSourceNode | null = null;
  private frictionFilter: BiquadFilterNode | null = null;
  private frictionGain: GainNode | null = null;
  private isFrictionPlaying: boolean = false;

  // Master Gain
  private masterGain: GainNode | null = null;

  constructor() {
    // Lazy init audio context on first interaction
  }

  private initContext(): void {
    if (this.ctx) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.setupFrictionLoop();
  }

  public resume(): void {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Tạo noise loop cho tiếng dao gọt "soàn soạt"
   */
  private setupFrictionLoop(): void {
    if (!this.ctx || !this.masterGain) return;

    // Tạo buffer 1 giây chứa pinkish noise
    const bufferSize = this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(
      1,
      bufferSize,
      this.ctx.sampleRate
    );
    const data = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter 1-pole pinkish
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5 + white * 0.1;
    }

    this.frictionFilter = this.ctx.createBiquadFilter();
    this.frictionFilter.type = 'bandpass';
    this.frictionFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.frictionFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    this.frictionGain = this.ctx.createGain();
    this.frictionGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.frictionFilter.connect(this.frictionGain);
    this.frictionGain.connect(this.masterGain);

    this.frictionNoiseSource = this.ctx.createBufferSource();
    this.frictionNoiseSource.buffer = noiseBuffer;
    this.frictionNoiseSource.loop = true;
    this.frictionNoiseSource.start();
    this.frictionNoiseSource.connect(this.frictionFilter);
    this.isFrictionPlaying = true;
  }

  /**
   * Cập nhật âm thanh tuốt theo tốc độ (deg/frame)
   */
  public updateFriction(speedDegPerFrame: number, isPeeling: boolean): void {
    if (!this.ctx || !this.frictionGain || !this.frictionFilter || this.isMuted)
      return;

    const now = this.ctx.currentTime;
    if (!isPeeling || speedDegPerFrame <= 0.5) {
      // Dừng âm thanh ma sát mượt mà
      this.frictionGain.gain.setTargetAtTime(0.0001, now, 0.04);
      return;
    }

    // Tốc độ càng cao -> pitch tăng từ 600Hz đến 2400Hz
    const normalizedSpeed = Math.min(1.0, speedDegPerFrame / 60);
    const targetFreq = 700 + normalizedSpeed * 1800;
    const targetVolume = Math.min(0.35, 0.08 + normalizedSpeed * 0.25);

    this.frictionFilter.frequency.setTargetAtTime(targetFreq, now, 0.03);
    this.frictionGain.gain.setTargetAtTime(targetVolume, now, 0.02);
  }

  /**
   * Âm "pop" giòn tan khi hoàn thành vòng / PERFECT
   */
  public playPop(isPerfect: boolean = true): void {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;

    // Oscillator chính (pitch glide lên tạo tiếng "pop" căng mọng)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const startFreq = isPerfect ? 480 : 380;
    const peakFreq = isPerfect ? 960 : 640;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.06);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isPerfect ? 0.22 : 0.14));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.25);

    // Thêm tiếng harmonic nhỏ phụ họa
    if (isPerfect) {
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();

      chime.type = 'triangle';
      chime.frequency.setValueAtTime(1320, now + 0.02);
      chime.frequency.exponentialRampToValueAtTime(1760, now + 0.15);

      chimeGain.gain.setValueAtTime(0.15, now + 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      chime.connect(chimeGain);
      chimeGain.connect(this.masterGain);

      chime.start(now + 0.02);
      chime.stop(now + 0.3);
    }
  }

  /**
   * Âm "toạc" khi đứt dải vỏ (disconnect / rách)
   */
  public playRip(): void {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.09);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  public stopAll(): void {
    if (this.frictionGain && this.ctx) {
      this.frictionGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public destroy(): void {
    this.stopAll();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
  }
}
