/**
 * Sanctuary Audio Engine
 * Pure Web Audio API Procedural Soundscape & Synthesizer
 * No external audio files needed - 100% synthesized in real-time.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.generators = {};
    this.lofiTimer = null;
    this.lofiChordIndex = 0;
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
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
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
      const target = this.isMuted ? 0 : 0.8;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // --- Noise Buffer Helpers ---
  createPinkNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 5; // 5 seconds loop
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
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  createBrownNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.8; // boost
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

    // Filters for rain texture
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(250, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.rain, this.ctx.currentTime);

    noiseSource.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start();
    this.generators.rain = { source: noiseSource, gain: gainNode };
  }

  stopRain() {
    if (this.generators.rain) {
      try { this.generators.rain.source.stop(); } catch (e) {}
      this.generators.rain = null;
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
    lowpass.frequency.setValueAtTime(650, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.fire * 0.8, this.ctx.currentTime);

    noiseSource.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);
    noiseSource.start();

    // Procedural crackle pops
    const popInterval = setInterval(() => {
      if (!this.generators.fire || this.volumeLevels.fire <= 0.01) return;
      if (Math.random() < 0.45) {
        this.triggerFirePop(this.volumeLevels.fire);
      }
    }, 180);

    this.generators.fire = { source: noiseSource, gain: gainNode, interval: popInterval };
  }

  triggerFirePop(volume) {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.04);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200 + Math.random() * 2000, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume * (0.3 + Math.random() * 0.5), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.035);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  stopFire() {
    if (this.generators.fire) {
      try {
        clearInterval(this.generators.fire.interval);
        this.generators.fire.source.stop();
      } catch (e) {}
      this.generators.fire = null;
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
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    // LFO for wave swelling
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // ~12 second wave cycle
    lfoGain.gain.setValueAtTime(240, this.ctx.currentTime);
    lfo.connect(filter.frequency);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.ocean, this.ctx.currentTime);

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
        this.generators.ocean.source.stop();
        this.generators.ocean.lfo.stop();
      } catch (e) {}
      this.generators.ocean = null;
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
    bandpass.Q.setValueAtTime(1.8, this.ctx.currentTime);
    bandpass.frequency.setValueAtTime(450, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(200, this.ctx.currentTime);
    lfo.connect(bandpass.frequency);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(this.volumeLevels.wind * 0.7, this.ctx.currentTime);

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
        this.generators.wind.source.stop();
        this.generators.wind.lfo.stop();
      } catch (e) {}
      this.generators.wind = null;
    }
  }

  // --- Binaural Beats Generator ---
  startBinaural() {
    if (this.generators.binaural) return;
    const baseFreq = 216; // Sacred 432Hz subharmonic
    let offset = 6; // theta default
    if (this.binauralMode === 'alpha') offset = 10;
    if (this.binauralMode === 'delta') offset = 2.5;

    // Stereo Merger
    const merger = this.ctx.createChannelMerger(2);

    const oscLeft = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

    const oscRight = this.ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + offset, this.ctx.currentTime);

    const gainLeft = this.ctx.createGain();
    const gainRight = this.ctx.createGain();
    gainLeft.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gainRight.gain.setValueAtTime(0.5, this.ctx.currentTime);

    oscLeft.connect(gainLeft);
    gainLeft.connect(merger, 0, 0); // left channel

    oscRight.connect(gainRight);
    gainRight.connect(merger, 0, 1); // right channel

    const masterBinauralGain = this.ctx.createGain();
    masterBinauralGain.gain.setValueAtTime(this.volumeLevels.binaural * 0.35, this.ctx.currentTime);

    merger.connect(masterBinauralGain);
    masterBinauralGain.connect(this.masterGain);

    oscLeft.start();
    oscRight.start();

    this.generators.binaural = {
      oscLeft,
      oscRight,
      gain: masterBinauralGain,
      baseFreq
    };
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
        this.generators.binaural.oscLeft.stop();
        this.generators.binaural.oscRight.stop();
      } catch (e) {}
      this.generators.binaural = null;
    }
  }

  // --- Cat Purr Synthesizer ---
  startPurr() {
    if (this.generators.purr) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(26, this.ctx.currentTime);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(52, this.ctx.currentTime);

    // Tremolo LFO for purr chatter (23Hz)
    const tremolo = this.ctx.createOscillator();
    const tremoloGain = this.ctx.createGain();
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(23, this.ctx.currentTime);
    tremoloGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    // Breathing swell LFO (0.22Hz)
    const breathLfo = this.ctx.createOscillator();
    const breathGain = this.ctx.createGain();
    breathLfo.type = 'sine';
    breathLfo.frequency.setValueAtTime(0.22, this.ctx.currentTime);
    breathGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    const purrGain = this.ctx.createGain();
    purrGain.gain.setValueAtTime(this.volumeLevels.purr * 0.6, this.ctx.currentTime);

    tremolo.connect(purrGain.gain);
    breathLfo.connect(purrGain.gain);

    osc1.connect(purrGain);
    osc2.connect(purrGain);
    purrGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    tremolo.start();
    breathLfo.start();

    this.generators.purr = {
      osc1, osc2, tremolo, breathLfo, gain: purrGain
    };
  }

  stopPurr() {
    if (this.generators.purr) {
      try {
        this.generators.purr.osc1.stop();
        this.generators.purr.osc2.stop();
        this.generators.purr.tremolo.stop();
        this.generators.purr.breathLfo.stop();
      } catch (e) {}
      this.generators.purr = null;
    }
  }

  // --- Generative Lo-Fi Electric Piano Progression ---
  startLofi() {
    if (this.generators.lofi) return;
    this.generators.lofi = { active: true };
    this.scheduleNextLofiChord();
  }

  scheduleNextLofiChord() {
    if (!this.generators.lofi || !this.generators.lofi.active) return;
    if (this.volumeLevels.lofi > 0.01) {
      this.playGenerativeLofiChord();
    }
    // Chords change every 3.8 to 5.2 seconds
    const delay = 3800 + Math.random() * 1400;
    this.lofiTimer = setTimeout(() => this.scheduleNextLofiChord(), delay);
  }

  playGenerativeLofiChord() {
    if (!this.ctx || this.isMuted) return;

    // Rich soothing jazz/chill chords (frequencies in Hz)
    const chordProgressions = [
      // Dmaj9
      [146.83, 220.00, 277.18, 329.63, 440.00],
      // Bm9
      [123.47, 185.00, 246.94, 293.66, 370.00],
      // Gmaj7#11
      [98.00, 196.00, 246.94, 293.66, 370.00, 440.00],
      // Asus4 / A13
      [110.00, 164.81, 220.00, 293.66, 370.00],
      // F#m7
      [92.50, 185.00, 220.00, 277.18, 370.00],
      // Emaj9
      [82.41, 164.81, 246.94, 329.63, 392.00]
    ];

    const chord = chordProgressions[this.lofiChordIndex % chordProgressions.length];
    this.lofiChordIndex++;

    chord.forEach((freq, i) => {
      // Strum delay
      const strumOffset = i * (0.04 + Math.random() * 0.02);
      this.playRhodesNote(freq, strumOffset, this.volumeLevels.lofi);
    });

    // Occasional gentle high sparkle note
    if (Math.random() < 0.6) {
      const pentatonicSparkles = [587.33, 659.25, 739.99, 880.00, 987.77, 1174.66];
      const sparkleFreq = pentatonicSparkles[Math.floor(Math.random() * pentatonicSparkles.length)];
      setTimeout(() => {
        this.playSingingBell(sparkleFreq, this.volumeLevels.lofi * 0.45, 2.8);
      }, 800 + Math.random() * 1200);
    }
  }

  playRhodesNote(freq, delay, volume) {
    if (!this.ctx || this.isMuted) return;
    const startTime = this.ctx.currentTime + delay;
    const duration = 3.6 + Math.random() * 0.8;

    // Carrier oscillator (Warm sine)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle pitch drift / tape wow & flutter
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.setValueAtTime(4.2 + Math.random() * 0.8, startTime);
    vibratoGain.gain.setValueAtTime(freq * 0.003, startTime);
    vibrato.connect(osc.frequency);

    // Warm Lowpass Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.2, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + duration);

    // Amp Envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume * 0.18, startTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(volume * 0.08, startTime + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    vibrato.start(startTime);
    osc.start(startTime);
    vibrato.stop(startTime + duration);
    osc.stop(startTime + duration);
  }

  stopLofi() {
    if (this.lofiTimer) {
      clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
    this.generators.lofi = null;
  }

  // --- Sound Effects & Micro-Interactions ---

  // Tibetan / Solfeggio singing bowl chime
  playSingingBell(freq = 432, volume = 0.3, duration = 3.5) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const harmonics = [1, 2.76, 5.4, 8.93];
    const gains = [0.6, 0.25, 0.12, 0.05];

    harmonics.forEach((mult, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume * gains[i], now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    });
  }

  // Tactile Bubble Pop / Water Droplet sound
  playBubblePop(pitchMod = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = (480 + Math.random() * 260) * pitchMod;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.3, now + 0.055);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.065);
  }

  // Dissolver cosmic whoosh / stardust chime
  playDissolveEffect() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Cosmic shimmer arpeggio
    const notes = [528, 660, 792, 1056, 1320, 1584];
    notes.forEach((freq, idx) => {
      const delay = idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 1.5);
    });
  }

  // Breathing inhale / exhale guiding tone
  playBreathCue(type = 'inhale', duration = 4.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);

    const startFreq = type === 'inhale' ? 174 : 285;
    const endFreq = type === 'inhale' ? 285 : 174;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.4);
    gain.gain.linearRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // --- Controls & Sliders ---
  setChannelVolume(channel, value) {
    const val = Math.max(0, Math.min(1, parseFloat(value)));
    this.volumeLevels[channel] = val;

    if (val > 0.01) {
      if (channel === 'rain') this.startRain();
      if (channel === 'fire') this.startFire();
      if (channel === 'ocean') this.startOcean();
      if (channel === 'wind') this.startWind();
      if (channel === 'binaural') this.startBinaural();
      if (channel === 'purr') this.startPurr();
      if (channel === 'lofi') this.startLofi();
    }

    const gen = this.generators[channel];
    if (gen && gen.gain && this.ctx) {
      gen.gain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.08);
    }
  }

  // Preset Configurations
  applyPreset(presetName) {
    const presets = {
      'midnight-rain': { rain: 0.6, fire: 0.35, ocean: 0.0, wind: 0.1, lofi: 0.45, binaural: 0.15, purr: 0.0, chimes: 0.3 },
      'zen-garden': { rain: 0.15, fire: 0.0, ocean: 0.35, wind: 0.25, lofi: 0.3, binaural: 0.25, purr: 0.0, chimes: 0.5 },
      'cozy-fireplace': { rain: 0.3, fire: 0.7, ocean: 0.0, wind: 0.0, lofi: 0.4, binaural: 0.0, purr: 0.4, chimes: 0.1 },
      'adhd-focus-drone': { rain: 0.15, fire: 0.0, ocean: 0.0, wind: 0.1, lofi: 0.0, binaural: 0.6, purr: 0.0, chimes: 0.0 },
      'deep-sleep': { rain: 0.45, fire: 0.0, ocean: 0.5, wind: 0.15, lofi: 0.0, binaural: 0.4, purr: 0.2, chimes: 0.0 }
    };

    const target = presets[presetName];
    if (!target) return;

    Object.keys(target).forEach(channel => {
      this.setChannelVolume(channel, target[channel]);
    });
    return target;
  }
}

window.sanctuaryAudio = new AudioEngine();
