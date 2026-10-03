/**
 * Sanctuary Zen Canvas Engine
 * 60FPS generative graphics with mobile-optimized pointer events,
 * touch-first gesture handling, and responsive DPR scaling.
 */

class ZenCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.activeMode = 'fluid'; // 'fluid', 'dissolve', 'bonsai', 'bubbles'
    this.width = 0;
    this.height = 0;
    this.dpr = Math.min(2, window.devicePixelRatio || 1); // Cap DPR at 2 for mobile GPU efficiency
    this.particles = [];
    this.ripples = [];
    this.bonsaiTrees = [];
    this.bubbles = [];
    this.petals = [];
    this.mouse = { x: -1000, y: -1000, px: -1000, py: -1000, isDown: false, speed: 0, hasInteracted: false };
    this.themePalette = {
      primary: '#34d399',
      secondary: '#38bdf8',
      accent: '#fbbf24',
      bg: '#064e3b',
      glow: 'rgba(52, 211, 153, 0.35)'
    };
    this.animationFrameId = null;
    this.dissolving = false;
    this.dissolveBlackhole = { x: 0, y: 0, radius: 0, maxRadius: 180, active: false };
    this.idleTimer = 0;

    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
    this.bindPointerEvents();
    this.setupMode(this.activeMode);
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform before scale
    this.ctx.scale(this.dpr, this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    if (this.activeMode === 'bubbles') {
      this.initBubbleGrid();
    }
  }

  setThemePalette(theme) {
    const palettes = {
      'zen': { primary: '#34d399', secondary: '#38bdf8', accent: '#fbbf24', bg: '#064e3b', glow: 'rgba(52, 211, 153, 0.35)' },
      'cyberpunk': { primary: '#06b6d4', secondary: '#f43f5e', accent: '#e879f9', bg: '#090d16', glow: 'rgba(6, 182, 212, 0.45)' },
      'retro98': { primary: '#008080', secondary: '#ffffff', accent: '#ff0080', bg: '#004040', glow: 'rgba(0, 128, 128, 0.5)' },
      'coquette': { primary: '#f472b6', secondary: '#fb7185', accent: '#fbcfe8', bg: '#4a044e', glow: 'rgba(244, 114, 182, 0.4)' },
      'corporate': { primary: '#60a5fa', secondary: '#94a3b8', accent: '#fbbf24', bg: '#0f172a', glow: 'rgba(96, 165, 250, 0.3)' },
      'brainrot': { primary: '#a855f7', secondary: '#ec4899', accent: '#22c55e', bg: '#180828', glow: 'rgba(168, 85, 247, 0.45)' },
      'lofi': { primary: '#f59e0b', secondary: '#d97706', accent: '#fb923c', bg: '#291b12', glow: 'rgba(245, 158, 11, 0.35)' }
    };

    if (palettes[theme]) {
      this.themePalette = palettes[theme];
    }
  }

  bindPointerEvents() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    // Unified Pointer Events (works flawlessly for touch, mouse, and stylus)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      this.mouse.isDown = true;
      this.mouse.hasInteracted = true;
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;
      this.mouse.px = pos.x;
      this.mouse.py = pos.y;
      this.mouse.speed = 0;

      this.handleTap(pos.x, pos.y);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const pos = getPos(e);
      const dx = pos.x - (this.mouse.x > -500 ? this.mouse.x : pos.x);
      const dy = pos.y - (this.mouse.y > -500 ? this.mouse.y : pos.y);
      this.mouse.speed = Math.sqrt(dx * dx + dy * dy);
      this.mouse.px = this.mouse.x;
      this.mouse.py = this.mouse.y;
      this.mouse.x = pos.x;
      this.mouse.y = pos.y;

      if (this.activeMode === 'fluid' && (this.mouse.isDown || this.mouse.speed > 2.5)) {
        this.addFluidParticle(this.mouse.x, this.mouse.y, this.mouse.px, this.mouse.py);
      } else if (this.activeMode === 'bubbles' && this.mouse.isDown) {
        this.checkBubblePop(this.mouse.x, this.mouse.y);
      }
    });

    const handlePointerUp = (e) => {
      this.mouse.isDown = false;
      try {
        if (this.canvas.hasPointerCapture(e.pointerId)) {
          this.canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    };

    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointercancel', handlePointerUp);
    this.canvas.addEventListener('pointerleave', () => {
      this.mouse.isDown = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });
  }

  handleTap(x, y) {
    if (window.sanctuaryAudio) {
      window.sanctuaryAudio.resume();
    }

    if (this.activeMode === 'fluid') {
      this.createRipple(x, y);
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33];
      const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(note, 0.2, 2.4);
      }
    } else if (this.activeMode === 'bonsai') {
      this.growBonsaiTree(x, this.height - 10, Math.min(100, this.height * 0.28), -Math.PI / 2, 6);
    } else if (this.activeMode === 'bubbles') {
      this.checkBubblePop(x, y);
    }
  }

  setMode(mode) {
    this.activeMode = mode;
    this.setupMode(mode);
  }

  setupMode(mode) {
    this.particles = [];
    this.ripples = [];
    this.bonsaiTrees = [];
    this.bubbles = [];
    this.petals = [];

    if (mode === 'fluid') {
      this.initFluidParticles();
    } else if (mode === 'bonsai') {
      this.growBonsaiTree(this.width * 0.5, this.height - 10, Math.min(110, this.height * 0.3), -Math.PI / 2, 6);
      this.initPetalField();
    } else if (mode === 'bubbles') {
      this.initBubbleGrid();
    }
  }

  // --- MODE 1: FLUID & RIPPLES ---
  initFluidParticles() {
    const count = Math.min(120, Math.floor((this.width * this.height) / 7500));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: 1.5 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  addFluidParticle(x, y, px, py) {
    const dx = x - px;
    const dy = y - py;
    const speed = Math.min(6, Math.sqrt(dx * dx + dy * dy));
    const count = this.mouse.isDown ? 3 : 2;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: dx * 0.15 + (Math.random() - 0.5) * 0.8,
        vy: dy * 0.15 + (Math.random() - 0.5) * 0.8,
        radius: 1.8 + Math.random() * 2.5,
        alpha: 0.75,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.012,
        isTrail: true
      });
    }
  }

  createRipple(x, y) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: Math.min(180, this.width * 0.4),
      alpha: 0.85,
      speed: 2.2 + Math.random() * 0.8
    });
  }

  updateFluid() {
    this.idleTimer += 0.01;

    // Ambient particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isTrail) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= p.decay;
        p.alpha = p.life * 0.75;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        p.x += p.vx + Math.sin(this.idleTimer + i) * 0.15;
        p.y += p.vy + Math.cos(this.idleTimer + i) * 0.15;

        // Pointer avoidance
        if (this.mouse.x > 0) {
          const mdx = p.x - this.mouse.x;
          const mdy = p.y - this.mouse.y;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist < 100 && dist > 0) {
            const force = (100 - dist) / 100 * 0.6;
            p.vx += (mdx / dist) * force;
            p.vy += (mdy / dist) * force;
          }
        }

        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      }
    }

    // Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha = Math.max(0, 1 - (r.radius / r.maxRadius));
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  drawFluid() {
    // Ripples
    this.ripples.forEach(r => {
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.themePalette.primary;
      this.ctx.globalAlpha = r.alpha * 0.65;
      this.ctx.lineWidth = 2.0;
      this.ctx.stroke();

      if (r.radius > 25) {
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.themePalette.secondary;
        this.ctx.globalAlpha = r.alpha * 0.35;
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
      }
    });

    // Connecting lines
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 65) {
          const lineAlpha = (1 - dist / 65) * 0.2 * (p1.alpha + p2.alpha) * 0.5;
          this.ctx.strokeStyle = this.themePalette.secondary;
          this.ctx.globalAlpha = lineAlpha;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    // Particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.isTrail ? this.themePalette.accent : this.themePalette.primary;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  // --- MODE 2: THOUGHT DISSOLVER ---
  startThoughtDissolve(text) {
    if (!text || text.trim() === '') return;
    this.activeMode = 'dissolve';
    this.particles = [];
    this.dissolving = true;
    this.dissolveBlackhole = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 0,
      maxRadius: Math.min(65, this.width * 0.2),
      active: true,
      angle: 0
    };

    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = this.width;
    offCanvas.height = this.height;

    const fontSize = this.width < 480 ? 24 : 32;
    offCtx.fillStyle = '#ffffff';
    offCtx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const width = offCtx.measureText(currentLine + ' ' + words[i]).width;
      if (width < this.width * 0.8) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    const lineHeight = fontSize * 1.3;
    const startY = (this.height / 2) - ((lines.length - 1) * lineHeight / 2);
    lines.forEach((line, idx) => {
      offCtx.fillText(line, this.width / 2, startY + (idx * lineHeight));
    });

    const imgData = offCtx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    const step = this.width < 480 ? 5 : 4;

    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        const idx = (y * this.width + x) * 4;
        if (data[idx + 3] > 128) {
          const originX = x + (Math.random() - 0.5) * 2;
          const originY = y + (Math.random() - 0.5) * 2;
          this.particles.push({
            x: originX,
            y: originY,
            originX,
            originY,
            radius: 1.5 + Math.random() * 2,
            alpha: 1.0,
            orbitAngle: Math.random() * Math.PI * 2,
            orbitRadius: Math.sqrt(Math.pow(originX - this.width / 2, 2) + Math.pow(originY - this.height / 2, 2)),
            orbitSpeed: 0.04 + Math.random() * 0.03,
            decayRate: 0.007 + Math.random() * 0.006,
            hue: Math.random() > 0.5 ? this.themePalette.accent : this.themePalette.secondary
          });
        }
      }
    }

    if (window.sanctuaryAudio) {
      window.sanctuaryAudio.playDissolveEffect();
    }
  }

  updateDissolve() {
    if (!this.dissolveBlackhole.active) return;
    this.dissolveBlackhole.angle += 0.04;
    if (this.dissolveBlackhole.radius < this.dissolveBlackhole.maxRadius) {
      this.dissolveBlackhole.radius += 0.7;
    }

    const bh = this.dissolveBlackhole;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.orbitRadius = Math.max(0, p.orbitRadius - (1.6 + (p.orbitRadius / 75)));
      p.orbitAngle += p.orbitSpeed * (1 + 90 / (p.orbitRadius + 20));

      p.x = bh.x + Math.cos(p.orbitAngle) * p.orbitRadius;
      p.y = bh.y + Math.sin(p.orbitAngle) * p.orbitRadius;
      p.alpha -= p.decayRate;

      if (p.orbitRadius <= 6 || p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length === 0) {
      this.dissolveBlackhole.active = false;
      this.dissolving = false;
      this.createRipple(this.width / 2, this.height / 2);
      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(528, 0.35, 3.5);
      }
    }
  }

  drawDissolve() {
    const bh = this.dissolveBlackhole;
    if (bh.active) {
      const grad = this.ctx.createRadialGradient(bh.x, bh.y, 4, bh.x, bh.y, bh.radius * 2);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      grad.addColorStop(0.3, this.themePalette.glow);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(bh.x, bh.y, bh.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.hue;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  // --- MODE 3: BONSAI & ZEN FOREST ---
  growBonsaiTree(startX, startY, length = 90, angle = -Math.PI / 2, depth = 6) {
    const tree = {
      branches: [],
      blossoms: [],
      windPhase: Math.random() * Math.PI * 2
    };

    const buildBranch = (x, y, len, ang, dep) => {
      if (dep <= 0) {
        tree.blossoms.push({
          x,
          y,
          radius: 3 + Math.random() * 3,
          color: Math.random() > 0.35 ? this.themePalette.accent : this.themePalette.secondary,
          alpha: 0,
          targetAlpha: 0.85,
          scale: 0
        });
        return;
      }

      const endX = x + Math.cos(ang) * len;
      const endY = y + Math.sin(ang) * len;

      tree.branches.push({
        x1: x,
        y1: y,
        x2: endX,
        y2: endY,
        length: len,
        angle: ang,
        depth: dep,
        currentProgress: 0,
        width: Math.max(1.0, dep * 1.4)
      });

      const splits = dep > 3 ? 2 : (Math.random() < 0.65 ? 2 : 3);
      for (let s = 0; s < splits; s++) {
        const angleSpread = (0.32 + Math.random() * 0.25) * (s === 0 ? -1 : 1);
        const lenMultiplier = 0.72 + Math.random() * 0.15;
        buildBranch(endX, endY, len * lenMultiplier, ang + angleSpread, dep - 1);
      }
    };

    buildBranch(startX, startY, length, angle, depth);
    this.bonsaiTrees.push(tree);

    if (window.sanctuaryAudio) {
      window.sanctuaryAudio.playSingingBell(392, 0.18, 2.5);
    }
  }

  initPetalField() {
    this.petals = [];
    const count = this.width < 480 ? 20 : 30;
    for (let i = 0; i < count; i++) {
      this.petals.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0.4 + Math.random() * 0.9,
        vy: 0.6 + Math.random() * 0.8,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.025,
        size: 2.5 + Math.random() * 2.5,
        color: this.themePalette.accent
      });
    }
  }

  updateBonsai() {
    this.bonsaiTrees.forEach(tree => {
      tree.windPhase += 0.02;
      tree.branches.forEach(b => {
        if (b.currentProgress < 1.0) {
          b.currentProgress = Math.min(1.0, b.currentProgress + 0.04);
        }
      });
      tree.blossoms.forEach(bl => {
        if (bl.scale < 1.0) {
          bl.scale = Math.min(1.0, bl.scale + 0.03);
          bl.alpha = bl.scale * bl.targetAlpha;
        }
      });
    });

    this.petals.forEach(pt => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.rot += pt.vRot;

      if (pt.y > this.height) {
        pt.y = -10;
        pt.x = Math.random() * this.width;
      }
      if (pt.x > this.width) {
        pt.x = -10;
      }
    });
  }

  drawBonsai() {
    this.bonsaiTrees.forEach(tree => {
      const windOffset = Math.sin(tree.windPhase) * 3.5;

      tree.branches.forEach(b => {
        if (b.currentProgress <= 0) return;
        const curX2 = b.x1 + (b.x2 - b.x1) * b.currentProgress + (b.depth < 3 ? windOffset * (3 - b.depth) * 0.25 : 0);
        const curY2 = b.y1 + (b.y2 - b.y1) * b.currentProgress;

        this.ctx.beginPath();
        this.ctx.moveTo(b.x1, b.y1);
        this.ctx.lineTo(curX2, curY2);
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = b.width;
        this.ctx.lineCap = 'round';
        this.ctx.globalAlpha = 0.85;
        this.ctx.stroke();
      });

      tree.blossoms.forEach(bl => {
        if (bl.scale <= 0) return;
        this.ctx.beginPath();
        this.ctx.arc(bl.x + windOffset * 0.6, bl.y, bl.radius * bl.scale, 0, Math.PI * 2);
        this.ctx.fillStyle = bl.color;
        this.ctx.globalAlpha = bl.alpha;
        this.ctx.fill();
      });
    });

    this.petals.forEach(pt => {
      this.ctx.save();
      this.ctx.translate(pt.x, pt.y);
      this.ctx.rotate(pt.rot);
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, pt.size * 1.5, pt.size * 0.8, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = pt.color;
      this.ctx.globalAlpha = 0.65;
      this.ctx.fill();
      this.ctx.restore();
    });

    this.ctx.globalAlpha = 1;
  }

  // --- MODE 4: TACTILE BUBBLE WRAP ---
  initBubbleGrid() {
    this.bubbles = [];
    const radius = this.width < 480 ? 22 : 25;
    const gap = this.width < 480 ? 12 : 15;
    const cols = Math.floor(this.width / (radius * 2 + gap));
    const rows = Math.floor(this.height / (radius * 2 + gap));
    const offsetX = (this.width - (cols * (radius * 2 + gap) - gap)) / 2 + radius;
    const offsetY = (this.height - (rows * (radius * 2 + gap) - gap)) / 2 + radius;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bubbles.push({
          x: offsetX + c * (radius * 2 + gap),
          y: offsetY + r * (radius * 2 + gap),
          baseRadius: radius,
          popped: false,
          hue: (c * 18 + r * 22) % 360,
          scale: 1.0
        });
      }
    }
  }

  checkBubblePop(x, y) {
    this.bubbles.forEach((b, idx) => {
      if (b.popped) return;
      const dx = x - b.x;
      const dy = y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.baseRadius * 1.1) {
        b.popped = true;
        b.scale = 1.3;

        if (window.sanctuaryAudio) {
          const pitchMod = 0.85 + (idx % 10) * 0.06;
          window.sanctuaryAudio.playBubblePop(pitchMod);
        }

        // Mini burst particles
        for (let k = 0; k < 5; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 2.5;
          this.particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 1.8 + Math.random() * 1.5,
            alpha: 1.0,
            life: 1.0,
            decay: 0.05,
            isTrail: true
          });
        }

        setTimeout(() => {
          b.popped = false;
          b.scale = 0.2;
        }, 3000);
      }
    });
  }

  updateBubbles() {
    this.bubbles.forEach(b => {
      if (b.popped) {
        if (b.scale > 0) b.scale = Math.max(0, b.scale - 0.12);
      } else {
        if (b.scale < 1.0) b.scale = Math.min(1.0, b.scale + 0.07);
      }
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= p.decay;
      p.alpha = p.life;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  drawBubbles() {
    this.bubbles.forEach(b => {
      if (b.scale <= 0) return;
      const currentRadius = b.baseRadius * b.scale;

      const grad = this.ctx.createRadialGradient(
        b.x - currentRadius * 0.3,
        b.y - currentRadius * 0.3,
        currentRadius * 0.1,
        b.x,
        b.y,
        currentRadius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
      grad.addColorStop(0.6, `hsla(${b.hue}, 75%, 60%, 0.35)`);
      grad.addColorStop(1, `hsla(${b.hue}, 85%, 45%, 0.12)`);

      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Highlight
      this.ctx.beginPath();
      this.ctx.arc(b.x - currentRadius * 0.32, b.y - currentRadius * 0.32, currentRadius * 0.22, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.fill();

      // Border rim
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${b.hue}, 75%, 70%, 0.55)`;
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();
    });

    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.themePalette.accent;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  // --- MAIN LOOP ---
  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.activeMode === 'fluid') {
      this.updateFluid();
      this.drawFluid();
    } else if (this.activeMode === 'dissolve') {
      this.updateDissolve();
      this.drawDissolve();
    } else if (this.activeMode === 'bonsai') {
      this.updateBonsai();
      this.drawBonsai();
    } else if (this.activeMode === 'bubbles') {
      this.updateBubbles();
      this.drawBubbles();
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}

window.ZenCanvas = ZenCanvas;
