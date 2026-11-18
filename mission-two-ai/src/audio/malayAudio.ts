export type MusicMood = 'idle' | 'garden' | 'flight' | 'checkpoint' | 'balai' | 'victory';

class MalayAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private unlocked = false;
  private playing = false;
  private muted = false;
  private volume = 0.55;
  private mood: MusicMood = 'idle';
  private stepIndex = 0;
  private timerId: number | null = null;

  // Malay-inspired slendro / pelog / pentatonic scale frequencies (D4-A5 range)
  private readonly gardenNotes = [293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0, 329.63];
  private readonly flightNotes = [329.63, 392.0, 440.0, 587.33, 523.25, 440.0, 392.0, 523.25];
  private readonly balaiNotes = [261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 261.63];
  private readonly victoryNotes = [392.0, 440.0, 523.25, 587.33, 659.25, 587.33, 523.25, 783.99];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.musicGain.gain.value = 0.001;
      this.sfxGain.gain.value = 0.85;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockFromUserGesture(autoStartMood?: MusicMood): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.unlocked = true;
    if (autoStartMood && !this.playing) {
      this.setMood(autoStartMood);
      this.play();
    }
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  public play(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.unlocked = true;
    if (this.playing) return;
    this.playing = true;
    if (this.mood === 'idle') this.mood = 'garden';
    this.fadeMusicTarget();
    this.scheduleNextBeat();
  }

  public pause(): void {
    this.playing = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    }
  }

  public setMood(nextMood: MusicMood): void {
    if (this.mood === nextMood) return;
    this.mood = nextMood;
    this.stepIndex = 0;
    if (this.playing) {
      this.fadeMusicTarget();
      if (this.timerId !== null) {
        window.clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.scheduleNextBeat();
    }
  }

  private fadeMusicTarget(): void {
    if (!this.musicGain || !this.ctx) return;
    const target =
      this.mood === 'idle'
        ? 0.0001
        : this.mood === 'checkpoint'
          ? 0.22
          : this.mood === 'balai'
            ? 0.42
            : 0.65;
    this.musicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  private getStepIntervalMs(): number {
    switch (this.mood) {
      case 'flight':
        return 320;
      case 'checkpoint':
        return 620;
      case 'balai':
        return 560;
      case 'victory':
        return 290;
      case 'garden':
      default:
        return 440;
    }
  }

  private scheduleNextBeat(): void {
    if (!this.playing || this.mood === 'idle') return;
    this.playBeatNote();
    this.timerId = window.setTimeout(() => {
      this.scheduleNextBeat();
    }, this.getStepIntervalMs());
  }

  private playBeatNote(): void {
    if (!this.ctx || !this.musicGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes =
      this.mood === 'flight'
        ? this.flightNotes
        : this.mood === 'balai'
          ? this.balaiNotes
          : this.mood === 'victory'
            ? this.victoryNotes
            : this.gardenNotes;

    const idx = this.stepIndex % notes.length;
    const freq = notes[idx];

    // 1. Seruling Melayu (warm breathy sine+triangle flute tone)
    if (this.stepIndex % 2 === 0 || this.mood === 'victory') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      // Gentle ornamental vibrato
      osc.frequency.linearRampToValueAtTime(freq * 1.008, now + 0.14);
      osc.frequency.linearRampToValueAtTime(freq, now + 0.3);

      const peak = this.mood === 'balai' ? 0.075 : 0.095;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.45);
    }

    // 2. Gambus plucked string accent
    const pluckOsc = this.ctx.createOscillator();
    const pluckGain = this.ctx.createGain();
    pluckOsc.type = 'triangle';
    pluckOsc.frequency.setValueAtTime(freq * 0.5, now);
    pluckGain.gain.setValueAtTime(0.07, now);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    pluckOsc.connect(pluckGain);
    pluckGain.connect(this.musicGain);
    pluckOsc.start(now);
    pluckOsc.stop(now + 0.26);

    // 3. Light Rebana frame-drum pulse on flight / victory / garden downbeats
    if (
      (this.mood === 'flight' || this.mood === 'victory') ||
      (this.mood === 'garden' && idx % 2 === 0)
    ) {
      const drumOsc = this.ctx.createOscillator();
      const drumGain = this.ctx.createGain();
      drumOsc.type = 'sine';
      const baseHz = idx % 2 === 0 ? 115 : 165;
      drumOsc.frequency.setValueAtTime(baseHz, now);
      drumOsc.frequency.exponentialRampToValueAtTime(58, now + 0.09);
      drumGain.gain.setValueAtTime(idx % 2 === 0 ? 0.11 : 0.06, now);
      drumGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      drumOsc.connect(drumGain);
      drumGain.connect(this.musicGain);
      drumOsc.start(now);
      drumOsc.stop(now + 0.13);
    }

    // 4. Gamelan shimmer on phrase downbeat
    if (idx === 0 || (this.mood === 'victory' && idx % 2 === 1)) {
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq * 2, now);
      bellGain.gain.setValueAtTime(0.045, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      bell.connect(bellGain);
      bellGain.connect(this.musicGain);
      bell.start(now);
      bell.stop(now + 0.58);
    }

    this.stepIndex += 1;
  }

  public playLiftSfx(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.09);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playGamelanCorrect(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.0001, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.11, now + i * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.55);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.58);
    });
  }

  public playGentleTryAgain(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [349.23, 293.66].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.11);
      gain.gain.setValueAtTime(0.07, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.11 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.25);
    });
  }

  public playCollisionBump(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playVictoryFanfare(): void {
    if (!this.unlocked || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const notes = [392.0, 440.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.09);
      gain.gain.setValueAtTime(0.11, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.65);
    });
  }
}

export const malayAudio = new MalayAudioEngine();
