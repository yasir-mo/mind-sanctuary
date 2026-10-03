/**
 * Sanctuary Breath Pacer
 * Sacred geometry breathing guides with HRV coherence and physiological sigh pacing.
 */

class BreathPacer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.phaseLabelEl = document.getElementById('breath-phase-label');
    this.timerLabelEl = document.getElementById('breath-timer-label');
    this.cycleCountEl = document.getElementById('breath-cycle-count');

    this.pattern = 'coherence'; // 'coherence', 'box', '478', 'sigh'
    this.patterns = {
      coherence: {
        name: 'Coherence 5.5s',
        phases: [
          { name: 'Inhale Slowly', duration: 5.5, type: 'inhale' },
          { name: 'Exhale Smoothly', duration: 5.5, type: 'exhale' }
        ]
      },
      box: {
        name: 'Box Breathing (4-4-4-4)',
        phases: [
          { name: 'Inhale', duration: 4.0, type: 'inhale' },
          { name: 'Hold Gently', duration: 4.0, type: 'hold-in' },
          { name: 'Exhale', duration: 4.0, type: 'exhale' },
          { name: 'Rest in Stillness', duration: 4.0, type: 'hold-out' }
        ]
      },
      '478': {
        name: '4-7-8 Deep Calm',
        phases: [
          { name: 'Inhale Quietly', duration: 4.0, type: 'inhale' },
          { name: 'Hold Peacefully', duration: 7.0, type: 'hold-in' },
          { name: 'Slow Whoosh Exhale', duration: 8.0, type: 'exhale' }
        ]
      },
      sigh: {
        name: 'Physiological Sigh',
        phases: [
          { name: 'Deep Inhale', duration: 2.5, type: 'inhale' },
          { name: 'Top-up Inhale', duration: 1.5, type: 'inhale' },
          { name: 'Long Extended Exhale', duration: 6.0, type: 'exhale' }
        ]
      }
    };

    this.currentPhaseIndex = 0;
    this.phaseStartTime = 0;
    this.cycleCount = 0;
    this.isRunning = false;
    this.expansion = 0.2; // 0.0 to 1.0
    this.targetExpansion = 0.2;
    this.animationId = null;
    this.themePalette = {
      primary: '#38bdf8',
      secondary: '#a78bfa',
      accent: '#f472b6'
    };

    this.init();
  }

  init() {
    if (!this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.drawStatic();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width, 360);
    this.canvas.width = size * (window.devicePixelRatio || 1);
    this.canvas.height = size * (window.devicePixelRatio || 1);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
  }

  setPattern(patternKey) {
    if (this.patterns[patternKey]) {
      this.pattern = patternKey;
      this.currentPhaseIndex = 0;
      this.phaseStartTime = performance.now();
      if (this.isRunning) {
        this.triggerPhaseCue();
      }
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentPhaseIndex = 0;
    this.phaseStartTime = performance.now();
    this.cycleCount = 0;
    if (this.cycleCountEl) this.cycleCountEl.textContent = '0';
    this.triggerPhaseCue();
    this.loop = this.loop.bind(this);
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.phaseLabelEl) this.phaseLabelEl.textContent = 'Ready to begin';
    if (this.timerLabelEl) this.timerLabelEl.textContent = '--';
    this.drawStatic();
  }

  triggerPhaseCue() {
    const config = this.patterns[this.pattern];
    const phase = config.phases[this.currentPhaseIndex];

    if (this.phaseLabelEl) {
      this.phaseLabelEl.textContent = phase.name;
    }

    if (window.sanctuaryAudio) {
      if (phase.type === 'inhale') {
        window.sanctuaryAudio.playBreathCue('inhale', phase.duration);
      } else if (phase.type === 'exhale') {
        window.sanctuaryAudio.playBreathCue('exhale', phase.duration);
      } else {
        window.sanctuaryAudio.playSingingBell(432, 0.12, 2.0);
      }
    }
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    const config = this.patterns[this.pattern];
    const phase = config.phases[this.currentPhaseIndex];
    const elapsed = (timestamp - this.phaseStartTime) / 1000;
    const progress = Math.min(1.0, elapsed / phase.duration);
    const remaining = Math.max(0, phase.duration - elapsed);

    if (this.timerLabelEl) {
      this.timerLabelEl.textContent = remaining.toFixed(1) + 's';
    }

    // Calculate smooth expansion curve
    if (phase.type === 'inhale') {
      this.expansion = 0.2 + 0.75 * Math.sin(progress * Math.PI / 2);
    } else if (phase.type === 'exhale') {
      this.expansion = 0.95 - 0.75 * Math.sin(progress * Math.PI / 2);
    } else if (phase.type === 'hold-in') {
      this.expansion = 0.95 + Math.sin(progress * Math.PI * 4) * 0.02;
    } else if (phase.type === 'hold-out') {
      this.expansion = 0.2 + Math.sin(progress * Math.PI * 4) * 0.015;
    }

    // Check phase transition
    if (elapsed >= phase.duration) {
      this.currentPhaseIndex = (this.currentPhaseIndex + 1) % config.phases.length;
      if (this.currentPhaseIndex === 0) {
        this.cycleCount++;
        if (this.cycleCountEl) this.cycleCountEl.textContent = this.cycleCount;
      }
      this.phaseStartTime = timestamp;
      this.triggerPhaseCue();
    }

    this.render(timestamp);
    this.animationId = requestAnimationFrame(this.loop);
  }

  render(timestamp) {
    if (!this.ctx) return;
    const w = parseFloat(this.canvas.style.width);
    const h = parseFloat(this.canvas.style.height);
    const cx = w / 2;
    const cy = h / 2;
    const maxR = w * 0.42;

    this.ctx.clearRect(0, 0, w, h);

    const curR = maxR * this.expansion;
    const time = timestamp * 0.001;

    // Concentric glowing lotus rings
    const petals = 8;
    for (let p = 0; p < petals; p++) {
      const angle = (p * Math.PI * 2 / petals) + (time * 0.15);
      const px = cx + Math.cos(angle) * (curR * 0.45);
      const py = cy + Math.sin(angle) * (curR * 0.45);

      this.ctx.beginPath();
      this.ctx.arc(px, py, curR * 0.55, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.themePalette.primary;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = 0.35 + (this.expansion * 0.25);
      this.ctx.stroke();
    }

    // Central pulsing orb
    const grad = this.ctx.createRadialGradient(cx, cy, 2, cx, cy, curR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.3, this.themePalette.primary);
    grad.addColorStop(0.7, this.themePalette.secondary);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, curR, 0, Math.PI * 2);
    this.ctx.fillStyle = grad;
    this.ctx.globalAlpha = 0.5 + (this.expansion * 0.3);
    this.ctx.fill();

    // Subtle outer halo
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, curR * 1.08, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.themePalette.accent;
    this.ctx.lineWidth = 1.5;
    this.ctx.globalAlpha = 0.6;
    this.ctx.stroke();

    this.ctx.globalAlpha = 1.0;
  }

  drawStatic() {
    if (!this.ctx) return;
    const w = parseFloat(this.canvas.style.width || 300);
    const h = parseFloat(this.canvas.style.height || 300);
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, w * 0.25, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.themePalette.primary;
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.4;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
  }
}

window.BreathPacer = BreathPacer;
