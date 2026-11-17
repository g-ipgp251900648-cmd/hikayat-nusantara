export type MusicMood = 'outdoor' | 'indoor' | 'search' | 'victory';

class NusantaraAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;

  private isPlaying = false;
  private isMuted = false;
  private volume = 0.65;
  private isDucked = false;
  private mood: MusicMood = 'outdoor';
  private stepIndex = 0;
  private timerId: number | null = null;
  private initialized = false;

  // Cheerful D Major Pentatonic (D4, E4, F#4, A4, B4, D5, E5, F#5)
  private readonly outdoorScale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];
  // Serene Pelog-style Minor Pentatonic (D4, Eb4/F4, G4, A4, Bb4/C5, D5)
  private readonly indoorScale = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33, 698.46];

  private ensureContext(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.ambienceGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.ambienceGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applyVolumes();
      this.startAmbienceLoop();
      this.initialized = true;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  private startAmbienceLoop() {
    if (!this.ctx || !this.ambienceGain || this.ambienceSource) return;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Gentle brown/pink filtered river & breeze texture
      lastOut = (lastOut + 0.03 * white) / 1.03;
      data[i] = lastOut * 2.4;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;

    src.connect(filter);
    filter.connect(this.ambienceGain);
    src.start();
    this.ambienceSource = src;
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain || !this.ambienceGain) return;
    const now = this.ctx.currentTime;
    const effectiveMaster = this.isMuted ? 0 : this.volume;
    this.masterGain.gain.setTargetAtTime(effectiveMaster, now, 0.08);

    const musicTarget = this.isPlaying ? (this.isDucked ? 0.22 : 0.68) : 0;
    this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.15);
    this.sfxGain.gain.setTargetAtTime(0.85, now, 0.05);

    const ambTarget =
      this.isPlaying && !this.isDucked
        ? this.mood === 'outdoor'
          ? 0.14
          : 0.04
        : 0.02;
    this.ambienceGain.gain.setTargetAtTime(ambTarget, now, 0.25);
  }

  public startMusic() {
    if (!this.ensureContext()) return;
    this.isPlaying = true;
    this.applyVolumes();
    if (this.timerId === null) {
      this.scheduleNextStep();
    }
  }

  public pauseMusic() {
    this.isPlaying = false;
    this.applyVolumes();
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pauseMusic();
    } else {
      this.startMusic();
    }
    return this.isPlaying;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyVolumes();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyVolumes();
  }

  public setMood(mood: MusicMood) {
    if (this.mood === mood) return;
    this.mood = mood;
    this.stepIndex = 0;
    this.applyVolumes();
  }

  public setDucked(ducked: boolean) {
    this.isDucked = ducked;
    this.applyVolumes();
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      mood: this.mood,
      initialized: this.initialized,
    };
  }

  private scheduleNextStep() {
    if (!this.isPlaying) {
      this.timerId = null;
      return;
    }

    const tempoMs =
      this.mood === 'victory'
        ? 290
        : this.mood === 'outdoor'
        ? 390
        : this.mood === 'search'
        ? 440
        : 520;

    this.playPatternStep(this.stepIndex);
    this.stepIndex = (this.stepIndex + 1) % 16;

    this.timerId = window.setTimeout(() => this.scheduleNextStep(), tempoMs);
  }

  private playPatternStep(step: number) {
    if (!this.ctx || !this.musicGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const scale =
      this.mood === 'outdoor' || this.mood === 'victory'
        ? this.outdoorScale
        : this.indoorScale;

    // 1. Gambus plucked pattern
    const gambusPattern =
      this.mood === 'victory'
        ? [0, 2, 4, 5, 4, 2, 3, 5, 7, 5, 4, 2, 4, 5, 6, 5]
        : this.mood === 'outdoor'
        ? [0, 2, 4, 2, 3, 5, 4, 2, 1, 3, 4, 5, 4, 2, 1, 0]
        : [0, -1, 2, 4, -1, 3, 2, -1, 1, -1, 3, 4, 2, -1, 1, 0];

    const noteIdx = gambusPattern[step % gambusPattern.length];
    if (noteIdx >= 0 && noteIdx < scale.length) {
      this.triggerGambus(scale[noteIdx], now, this.mood === 'indoor' ? 0.11 : 0.15);
    }

    // 2. Seruling melody on expressive phrase beats
    if (step % 4 === 0) {
      const flutePhrase =
        this.mood === 'victory'
          ? [5, 7, 6, 5]
          : this.mood === 'outdoor'
          ? [4, 5, 6, 4]
          : [3, 4, 2, 0];
      const fIdx = flutePhrase[Math.floor(step / 4) % flutePhrase.length];
      if (scale[fIdx]) {
        this.triggerSeruling(scale[fIdx], now, this.mood === 'victory' ? 0.45 : 0.65);
      }
    }

    // 3. Gamelan shimmer accents on bar downbeats & half-bars
    if (step === 0 || step === 8 || (this.mood === 'search' && step === 12)) {
      const bellIdx = step === 0 ? 0 : step === 8 ? 4 : 3;
      this.triggerGamelan(scale[bellIdx] * 0.5, now, 0.14);
    }

    // 4. Soft Rebana percussion
    if (this.mood !== 'indoor' || step % 4 === 0) {
      if (step % 4 === 0) {
        this.triggerRebana(95, now, 0.12);
      } else if (step % 4 === 2) {
        this.triggerRebana(155, now, 0.06);
      }
    }
  }

  private triggerGambus(freq: number, time: number, amp: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4.5, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.4, time + 0.35);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.44);
  }

  private triggerSeruling(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 2, time);

    lfo.frequency.setValueAtTime(5.2, time);
    lfoGain.gain.setValueAtTime(3.2, time);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.075, time + 0.12);
    gain.gain.setValueAtTime(0.065, time + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    lfo.start(time);
    osc.start(time);
    lfo.stop(time + duration + 0.05);
    osc.stop(time + duration + 0.05);
  }

  private triggerGamelan(freq: number, time: number, amp: number, destination?: AudioNode) {
    if (!this.ctx) return;
    const dest = destination || this.musicGain;
    if (!dest) return;

    const partials = [1, 2.01, 2.98];
    partials.forEach((ratio, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, time);

      const pAmp = amp / (idx + 1);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(pAmp, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.15 - idx * 0.25);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 1.2);
    });
  }

  private triggerRebana(freq: number, time: number, amp: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.12);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(amp, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  // Sound Effects
  public playScrollFoundChime() {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, i) => {
      this.triggerGamelan(freq, now + i * 0.09, 0.2, this.sfxGain!);
    });
  }

  public playChestOpenSfx() {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(210, now + 0.22);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playVictoryFanfare() {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chord = [293.66, 369.99, 440.0, 587.33, 739.99, 880.0, 1174.66];
    chord.forEach((freq, i) => {
      this.triggerGamelan(freq, now + i * 0.08, 0.22, this.sfxGain!);
    });
  }

  public playSoftClick() {
    if (!this.ensureContext() || !this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const audioEngine = new NusantaraAudioEngine();

export function isSpeechNarrationSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopNarration() {
  if (isSpeechNarrationSupported()) {
    window.speechSynthesis.cancel();
  }
  audioEngine.setDucked(false);
}

export function speakMalayNarration(text: string, onEnd?: () => void): boolean {
  if (!isSpeechNarrationSupported()) return false;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const malayVoice =
    voices.find((v) => v.lang.toLowerCase().startsWith('ms')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('id'));
  if (malayVoice) {
    utter.voice = malayVoice;
    utter.lang = malayVoice.lang;
  } else {
    utter.lang = 'ms-MY';
  }
  utter.rate = 0.94;
  utter.pitch = 1.02;

  audioEngine.setDucked(true);
  utter.onend = () => {
    audioEngine.setDucked(false);
    onEnd?.();
  };
  utter.onerror = () => {
    audioEngine.setDucked(false);
    onEnd?.();
  };

  window.speechSynthesis.speak(utter);
  return true;
}
