class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicEnabled: boolean = true;

  // Ambient procedural music nodes & scheduler state
  private musicBus: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicTimer: number | null = null;
  private musicRunning: boolean = false;
  private stepIndex: number = 0;

  // Calm minimalist ambient progression (Fmaj7 - G6 - Em7 - Am9 - Dm9 - Cmaj7)
  private readonly chords: number[][] = [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 329.63], // G6
    [164.81, 196.0, 246.94, 293.66], // Em7
    [220.0, 261.63, 329.63, 392.0, 493.88], // Am9
    [146.83, 220.0, 261.63, 329.63], // Dm9
    [130.81, 196.0, 246.94, 329.63], // Cmaj7
  ];

  // Gentle pentatonic glass-harp melody pool (C5, D5, E5, G5, A5, C6)
  private readonly melodyNotes: number[] = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.pauseMusicLoop();
        } else if (this.musicEnabled && !this.muted && this.ctx) {
          this.startMusic();
        }
      });
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    this.syncMusicState();
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.syncMusicState();
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getSfxContext(): AudioContext | null {
    if (this.muted) return null;
    return this.getContext();
  }

  public unlockAndStartMusic() {
    const ctx = this.getContext();
    if (!ctx) return;
    if (this.musicEnabled && !this.muted) {
      this.startMusic();
    }
  }

  private syncMusicState() {
    if (this.muted || !this.musicEnabled) {
      this.stopMusic();
    } else if (this.ctx) {
      this.startMusic();
    }
  }

  private ensureMusicBus(ctx: AudioContext) {
    if (this.musicBus && this.musicFilter) return;

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, ctx.currentTime);
    filter.Q.setValueAtTime(0.6, ctx.currentTime);

    // Subtle warm echo delay for ambient spaciousness
    const delay = ctx.createDelay(1.0);
    delay.delayTime.setValueAtTime(0.42, ctx.currentTime);
    const delayFeedback = ctx.createGain();
    delayFeedback.gain.setValueAtTime(0.28, ctx.currentTime);
    const delayWet = ctx.createGain();
    delayWet.gain.setValueAtTime(0.26, ctx.currentTime);

    filter.connect(bus);
    filter.connect(delay);
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(bus);

    bus.connect(ctx.destination);

    this.musicFilter = filter;
    this.musicBus = bus;
  }

  public startMusic() {
    if (this.muted || !this.musicEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.ensureMusicBus(ctx);
    if (this.musicBus) {
      const now = ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0.32, now, 0.45);
    }

    if (this.musicRunning) return;
    this.musicRunning = true;

    const triggerStep = () => {
      if (!this.musicRunning || this.muted || !this.musicEnabled) return;
      const audioCtx = this.ctx;
      if (!audioCtx || audioCtx.state !== 'running' || !this.musicFilter) return;

      const step = this.stepIndex++;
      const chordIdx = Math.floor(step / 8) % this.chords.length;
      const chord = this.chords[chordIdx];
      const now = audioCtx.currentTime;

      // Soft warm pad chord at start of every 8-step bar (~6.4s per chord)
      if (step % 8 === 0) {
        chord.slice(0, 3).forEach((freq, idx) => {
          this.playPadVoice(audioCtx, freq, now + idx * 0.06, 5.8, 0.042);
        });
      }

      // Gentle sparse glass-marimba arpeggio notes
      if (step % 2 === 0 || step % 5 === 0) {
        const noteFreq =
          step % 4 === 0
            ? chord[step % chord.length] * 2
            : this.melodyNotes[(step * 3 + chordIdx) % this.melodyNotes.length];
        this.playBellNote(audioCtx, noteFreq, now + 0.03, 1.9, 0.038);
      }
    };

    triggerStep();
    this.musicTimer = window.setInterval(triggerStep, 820);
  }

  private pauseMusicLoop() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicRunning = false;
  }

  public stopMusic() {
    this.pauseMusicLoop();
    if (this.ctx && this.musicBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(0.0001, now, 0.15);
    }
  }

  private playPadVoice(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ) {
    if (!this.musicFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private playBellNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number
  ) {
    if (!this.musicFilter) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.musicFilter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  public playSelect() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.055);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playDeselect() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playPour(targetFillLevel: number, count: number) {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const baseFreq = 260 + targetFillLevel * 75;

    for (let i = 0; i < Math.max(1, count); i++) {
      const start = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const fStart = baseFreq + i * 48;
      osc.frequency.setValueAtTime(fStart, start);
      osc.frequency.exponentialRampToValueAtTime(fStart * 1.24, start + 0.09);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.115);
    }
  }

  public playBottleComplete() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playInvalid() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.08);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playUndo() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.075);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playVictory() {
    const ctx = this.getSfxContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.5];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  }
}

export const soundEngine = new SoundEngine();
