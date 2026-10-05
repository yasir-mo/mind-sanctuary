/**
 * Sanctuary Audio Engine
 * Pure Web Audio API Procedural Soundscape & Synthesizer
 * Built with speaker-safe dynamics compression, phone speaker EQ guards,
 * polyphony voice limiting, strict preset isolation, and smooth lo-fi FM generation.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.hpFilter = null;
    this.lpFilter = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.generators = {};
    this.lofiTimer = null;
    this.lofiChordIndex = 0;
    this.activeVoices = [];
    this.maxConcurrentVoices = 6;
    this.allChannels = ['rain', 'fire', 'ocean', 'wind', 'lofi', 'binaural', 'purr'];
    this.volumeLevels = {
      rain: 0.35,
      fire: 0.0,
      ocean: 0.25,
      wind: 0.0,
      lofi: 0.3,
      binaural: 0.15,
      purr: 0.0,
      chimes: 0.25
    };
    this.binauralMode = 'theta'; // alpha (10Hz), theta (6Hz), delta (2.5Hz)
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    // 1. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // 2. Speaker Safety EQ - Highpass guard (removes sub-bass DC offsets that strain phone speakers)
    this.hpFilter = this.ctx.createBiquadFilter();
    this.hpFilter.type = 'highpass';
    this.hpFilter.frequency.setValueAtTime(45, this.ctx.currentTime);
    this.hpFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // 3. Speaker Safety EQ - Lowpass gentle smoothing (removes harsh digital aliasing)
    this.lpFilter = this.ctx.createBiquadFilter();
    this.lpFilter.type = 'lowpass';
    this.lpFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);
    this.lpFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    // 4. Studio Dynamics Compressor / Brickwall Limiter (prevents overlap clipping & speaker blowout)
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(8, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

    // Master Chain: MasterGain -> HPFilter -> LPFilter -> Compressor -> Destination
    this.masterGain.connect(this.hpFilter);
    this.hpFilter.connect(this.lpFilter);
    this.lpFilter.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.initialized = true;
  }

  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume deferred:', e);
      }
    }
  }

  setMasterVolume(val) {
    if (!this.masterGain || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, val));
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : clamped, this.ctx.currentTime, 0.05);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : 0.75;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // --- Voice Stealing & Polyphony Management ---
  registerVoice(nodes, gainNode) {
    this.activeVoices = this.activeVoices.filter(v => v.active && performance.now() < v.endTime);

    if (this.activeVoices.length >= this.maxConcurrentVoices) {
      const oldest = this.activeVoices.shift();
      if (oldest && oldest.gainNode && this.ctx) {
        try {
          oldest.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
          oldest.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.04);
        } catch (e) {}
      }
    }

    const voiceRecord = {
      nodes,
      gainNode,
      active: true,
      endTime: performance.now() + 4000
    };
    this.activeVoices.push(voiceRecord);
    return voiceRecord;
  }

  clearAllActiveVoices() {
    this.activeVoices.forEach(v => {
      if (v.gainNode && this.ctx) {
        try {
          v.gainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
        } catch (e) {}
      }
    });
    this.activeVoices = [];
  }

  // --- Noise Buffer Generation ---
  createPinkNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  createBrownNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.2;
    }
    return buffer;
  }

  // --- Rain Generator ---
  startRain() {
    if (this.generators.rain) return;
    const pinkBuffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1250, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(300, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.rain * 0.45, this.ctx.currentTime);

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
    this.generators.rain = { source: noiseSource, gain: gainNode };
  }

  stopRain() {
    if (this.generators.rain) {
      try {
        this.generators.rain.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.rain && this.generators.rain.source) {
            try { this.generators.rain.source.stop(); } catch (e) {}
          }
          this.generators.rain = null;
        }, 80);
      } catch (e) {
        this.generators.rain = null;
      }
    }
  }

  // --- Fireplace Crackle ---
  startFire() {
    if (this.generators.fire) return;
    const brownBuffer = this.createBrownNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    noiseSource.loop = true;

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(600, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.fire * 0.4, this.ctx.currentTime);

    noiseSource.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);
    noiseSource.start();

    const popInterval = setInterval(() => {
      if (!this.generators.fire || this.volumeLevels.fire <= 0.005) return;
      if (Math.random() < 0.35) {
        this.triggerFirePop(this.volumeLevels.fire);
      }
    }, 220);

    this.generators.fire = { source: noiseSource, gain: gainNode, interval: popInterval };
  }

  triggerFirePop(volume) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90 + Math.random() * 180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.035);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const targetVol = Math.min(0.25, volume * (0.15 + Math.random() * 0.2));
    gain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.035);
  }

  stopFire() {
    if (this.generators.fire) {
      try {
        clearInterval(this.generators.fire.interval);
        this.generators.fire.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.fire && this.generators.fire.source) {
            try { this.generators.fire.source.stop(); } catch (e) {}
          }
          this.generators.fire = null;
        }, 80);
      } catch (e) {
        this.generators.fire = null;
      }
    }
  }

  // --- Ocean Tide Waves ---
  startOcean() {
    if (this.generators.ocean) return;
    const pinkBuffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.075, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(filter.frequency);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.ocean * 0.4, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
    lfo.start();
    this.generators.ocean = { source: noiseSource, lfo, gain: gainNode };
  }

  stopOcean() {
    if (this.generators.ocean) {
      try {
        this.generators.ocean.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.ocean) {
            try {
              this.generators.ocean.source.stop();
              this.generators.ocean.lfo.stop();
            } catch (e) {}
          }
          this.generators.ocean = null;
        }, 80);
      } catch (e) {
        this.generators.ocean = null;
      }
    }
  }

  // --- Forest Breeze / Wind ---
  startWind() {
    if (this.generators.wind) return;
    const pinkBuffer = this.createPinkNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = pinkBuffer;
    noiseSource.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.Q.setValueAtTime(1.5, this.ctx.currentTime);
    bandpass.frequency.setValueAtTime(420, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(180, this.ctx.currentTime);
    lfo.connect(bandpass.frequency);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.wind * 0.35, this.ctx.currentTime);

    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
    lfo.start();
    this.generators.wind = { source: noiseSource, lfo, gain: gainNode };
  }

  stopWind() {
    if (this.generators.wind) {
      try {
        this.generators.wind.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.wind) {
            try {
              this.generators.wind.source.stop();
              this.generators.wind.lfo.stop();
            } catch (e) {}
          }
          this.generators.wind = null;
        }, 80);
      } catch (e) {
        this.generators.wind = null;
      }
    }
  }

  // --- Binaural Waves ---
  startBinaural() {
    if (this.generators.binaural) return;
    const baseFreq = 216;
    let offset = 6;
    if (this.binauralMode === 'alpha') offset = 10;
    if (this.binauralMode === 'delta') offset = 2.5;

    const merger = this.ctx.createChannelMerger(2);

    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + offset, this.ctx.currentTime);

    const gainLeft = this.ctx.createGain();
    const gainRight = this.ctx.createGain();
    gainLeft.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gainRight.gain.setValueAtTime(0.4, this.ctx.currentTime);

    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0);

    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1);

    const masterBinauralGain = this.ctx.createGain();
    masterBinauralGain.gain.setValueAtTime(this.volumeLevels.binaural * 0.25, this.ctx.currentTime);

    merger.connect(masterBinauralGain);
    masterBinauralGain.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    this.generators.binaural = { oscLeft, oscRight, gain: masterBinauralGain, baseFreq };
  }

  setBinauralMode(mode) {
    this.binauralMode = mode;
    if (this.generators.binaural) {
      let offset = 6;
      if (mode === 'alpha') offset = 10;
      if (mode === 'delta') offset = 2.5;
      this.generators.binaural.oscRight.frequency.setTargetAtTime(
        this.generators.binaural.baseFreq + offset,
        this.ctx.currentTime,
        0.5
      );
    }
  }

  stopBinaural() {
    if (this.generators.binaural) {
      try {
        this.generators.binaural.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.binaural) {
            try {
              this.generators.binaural.oscLeft.stop();
              this.generators.binaural.oscRight.stop();
            } catch (e) {}
          }
          this.generators.binaural = null;
        }, 80);
      } catch (e) {
        this.generators.binaural = null;
      }
    }
  }

  // --- Purring Cat ---
  startPurr() {
    if (this.generators.purr) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(22, this.ctx.currentTime);
    tremoloGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    const breathLfo = this.ctx.createOscillator();
    const breathGain = this.ctx.createGain();
    breathLfo.type = 'sine';
    breathLfo.frequency.setValueAtTime(0.22, this.ctx.currentTime);
    breathGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    const purrGain = this.ctx.createGain();
    purrGain.gain.setValueAtTime(this.volumeLevels.purr * 0.35, this.ctx.currentTime);

    tremolo.connect(purrGain.gain);
    breathLfo.connect(purrGain.gain);

    osc1.connect(purrGain);
    osc2.connect(purrGain);
    purrGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    tremolo.start();
    breathLfo.start();

    this.generators.purr = { osc1, osc2, tremolo, breathLfo, gain: purrGain };
  }

  stopPurr() {
    if (this.generators.purr) {
      try {
        this.generators.purr.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        setTimeout(() => {
          if (this.generators.purr) {
            try {
              this.generators.purr.osc1.stop();
              this.generators.purr.osc2.stop();
              this.generators.purr.tremolo.stop();
              this.generators.purr.breathLfo.stop();
            } catch (e) {}
          }
          this.generators.purr = null;
        }, 80);
      } catch (e) {
        this.generators.purr = null;
      }
    }
  }

  // --- Generative Lo-Fi Background Music FM Synthesizer ---
  startLofi() {
    if (this.generators.lofi && this.generators.lofi.active) return;
    this.generators.lofi = { active: true };
    this.scheduleNextLofiChord();
  }

  scheduleNextLofiChord() {
    if (!this.generators.lofi || !this.generators.lofi.active) return;
    if (this.volumeLevels.lofi > 0.005 && !this.isMuted) {
      this.playGenerativeLofiChord();
    }
    const delay = 4200 + Math.random() * 1200;
    this.lofiTimer = setTimeout(() => this.scheduleNextLofiChord(), delay);
  }

  playGenerativeLofiChord() {
    if (!this.ctx || this.isMuted) return;

    const chordProgressions = [
      [146.83, 220.00, 277.18, 329.63, 440.00],
      [123.47, 185.00, 246.94, 293.66, 370.00],
      [130.81, 196.00, 246.94, 293.66, 392.00],
      [110.00, 164.81, 220.00, 293.66, 370.00],
      [164.81, 220.00, 261.63, 329.63, 392.00],
      [138.59, 185.00, 220.00, 277.18, 370.00]
    ];

    const chord = chordProgressions[this.lofiChordIndex % chordProgressions.length];
    this.lofiChordIndex++;

    chord.forEach((freq, i) => {
      const strumOffset = i * 0.045;
      this.playRhodesNote(freq, strumOffset, this.volumeLevels.lofi);
    });

    if (Math.random() < 0.5) {
      const pentatonicSparkles = [587.33, 659.25, 739.99, 880.00, 987.77];
      const sparkleFreq = pentatonicSparkles[Math.floor(Math.random() * pentatonicSparkles.length)];
      setTimeout(() => {
        if (this.generators.lofi && this.generators.lofi.active) {
          this.playSingingBell(sparkleFreq, this.volumeLevels.lofi * 0.35, 2.5);
        }
      }, 1200 + Math.random() * 800);
    }
  }

  playRhodesNote(freq, delay, volume) {
    if (!this.ctx || this.isMuted) return;
    const startTime = this.ctx.currentTime + delay;
    const duration = 3.8;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(3.8 + Math.random() * 0.5, startTime);
    vibratoGain.gain.setValueAtTime(freq * 0.002, startTime);
    vibrato.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.8, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + duration);

    const gain = this.ctx.createGain();
    const peakGain = Math.min(0.14, volume * 0.12);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.07);
    gain.gain.exponentialRampToValueAtTime(peakGain * 0.45, startTime + 0.9);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    vibrato.start(startTime);
    osc.start(startTime);
    vibrato.stop(startTime + duration);
    osc.stop(startTime + duration);

    this.registerVoice([osc, vibrato], gain);
  }

  stopLofi() {
    if (this.lofiTimer) {
      clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
    this.generators.lofi = null;
  }

  // --- Sound Effects & Chimes ---
  playSingingBell(freq = 432, volume = 0.25, duration = 3.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const harmonics = [1, 2.76, 5.4];
    const harmonicWeights = [0.55, 0.2, 0.08];

    const masterBellGain = this.ctx.createGain();
    const peak = Math.min(0.25, volume * 0.6);
    masterBellGain.gain.setValueAtTime(0.0001, now);
    masterBellGain.gain.linearRampToValueAtTime(peak, now + 0.025);
    masterBellGain.gain.exponentialRampToValueAtTime(0.00001, now + duration);
    masterBellGain.connect(this.masterGain);

    const oscillators = [];
    harmonics.forEach((mult, i) => {
      const targetF = freq * mult;
      if (targetF > 12000) return;

      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(targetF, now);
      oscGain.gain.setValueAtTime(harmonicWeights[i], now);

      osc.connect(oscGain);
      oscGain.connect(masterBellGain);

      osc.start(now);
      osc.stop(now + duration);
      oscillators.push(osc);
    });

    this.registerVoice(oscillators, masterBellGain);
  }

  playBubblePop(pitchMod = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = Math.min(1100, (480 + Math.random() * 200) * pitchMod);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, now + 0.045);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.055);

    this.registerVoice([osc], gain);
  }

  playDissolveEffect() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [528, 660, 792, 1056, 1320];

    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 1.25);
    });
  }

  playBreathCue(type = 'inhale', duration = 4.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, now);

    const startFreq = type === 'inhale' ? 180 : 260;
    const endFreq = type === 'inhale' ? 260 : 180;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + duration * 0.35);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // --- Channel Volume & Proper Teardown ---
  stopChannel(channel) {
    if (channel === 'rain') this.stopRain();
    else if (channel === 'fire') this.stopFire();
    else if (channel === 'ocean') this.stopOcean();
    else if (channel === 'wind') this.stopWind();
    else if (channel === 'binaural') this.stopBinaural();
    else if (channel === 'purr') this.stopPurr();
    else if (channel === 'lofi') this.stopLofi();
  }

  setChannelVolume(channel, value) {
    const val = Math.max(0, Math.min(1, parseFloat(value)));
    this.volumeLevels[channel] = val;

    if (val <= 0.005) {
      this.stopChannel(channel);
      return;
    }

    // Start if not active
    if (channel === 'rain') this.startRain();
    else if (channel === 'fire') this.startFire();
    else if (channel === 'ocean') this.startOcean();
    else if (channel === 'wind') this.startWind();
    else if (channel === 'binaural') this.startBinaural();
    else if (channel === 'purr') this.startPurr();
    else if (channel === 'lofi') this.startLofi();

    const gen = this.generators[channel];
    if (gen && gen.gain && this.ctx) {
      const scaling = channel === 'lofi' ? 0.35 : (channel === 'binaural' ? 0.25 : 0.45);
      gen.gain.gain.setTargetAtTime(val * scaling, this.ctx.currentTime, 0.08);
    }
  }

  // Preset Configurations with complete isolation
  applyPreset(presetName) {
    const presets = {
      'midnight-rain': { rain: 0.55, fire: 0.3, ocean: 0.0, wind: 0.1, lofi: 0.4, binaural: 0.15, purr: 0.0 },
      'zen-garden': { rain: 0.15, fire: 0.0, ocean: 0.3, wind: 0.2, lofi: 0.3, binaural: 0.2, purr: 0.0 },
      'cozy-fireplace': { rain: 0.25, fire: 0.6, ocean: 0.0, wind: 0.0, lofi: 0.35, binaural: 0.0, purr: 0.35 },
      'adhd-focus-drone': { rain: 0.15, fire: 0.0, ocean: 0.0, wind: 0.1, lofi: 0.0, binaural: 0.5, purr: 0.0 },
      'deep-sleep': { rain: 0.4, fire: 0.0, ocean: 0.45, wind: 0.12, lofi: 0.0, binaural: 0.35, purr: 0.2 }
    };

    const target = presets[presetName];
    if (!target) return null;

    // Reset/fade previous voices
    this.clearAllActiveVoices();

    // Explicitly apply new volume or cleanly stop inactive channels
    this.allChannels.forEach(channel => {
      const targetVol = target[channel] !== undefined ? target[channel] : 0.0;
      this.setChannelVolume(channel, targetVol);
    });

    return target;
  }
}

window.sanctuaryAudio = new AudioEngine();
