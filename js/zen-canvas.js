/**
 * Sanctuary Zen Canvas Engine
 * High-performance 60FPS generative graphics & physics playgrounds.
 */

class ZenCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.activeMode = 'fluid'; // 'fluid', 'dissolve', 'bonsai', 'bubbles'
    this.width = 0;
    this.height = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.particles = [];
    this.ripples = [];
    this.bonsaiTrees = [];
    this.bubbles = [];
    this.petals = [];
    this.mouse = { x: -1000, y: -1000, px: -1000, py: -1000, isDown: false, speed: 0 };
    this.themePalette = {
      primary: '#a78bfa',
      secondary: '#38bdf8',
      accent: '#f472b6',
      bg: '#0f172a',
      glow: 'rgba(167, 139, 250, 0.4)'
    };
    this.animationFrameId = null;
    this.dissolving = false;
    this.dissolveBlackhole = { x: 0, y: 0, radius: 0, maxRadius: 180, active: false };

    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
    this.setupMode(this.activeMode);
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
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
      'cyberpunk': { primary: '#f43f5e', secondary: '#06b6d4', accent: '#e879f9', bg: '#090d16', glow: 'rgba(6, 182, 212, 0.45)' },
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

  bindEvents() {
    const updateCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const dx = x - this.mouse.x;
      const dy = y - this.mouse.y;
      this.mouse.speed = Math.sqrt(dx * dx + dy * dy);
      this.mouse.px = this.mouse.x;
      this.mouse.py = this.mouse.y;
      this.mouse.x = x;
      this.mouse.y = y;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      updateCoords(e);
      if (this.activeMode === 'fluid' && this.mouse.speed > 2) {
        this.addFluidParticle(this.mouse.x, this.mouse.y, this.mouse.px, this.mouse.py);
      } else if (this.activeMode === 'bubbles' && this.mouse.isDown) {
        this.checkBubblePop(this.mouse.x, this.mouse.y);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.mouse.isDown = true;
      updateCoords(e);
      this.handlePointerDown(this.mouse.x, this.mouse.y);
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      this.mouse.isDown = true;
      updateCoords(e);
      this.handlePointerDown(this.mouse.x, this.mouse.y);
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      updateCoords(e);
      if (this.activeMode === 'fluid') {
        this.addFluidParticle(this.mouse.x, this.mouse.y, this.mouse.px, this.mouse.py);
      } else if (this.activeMode === 'bubbles') {
        this.checkBubblePop(this.mouse.x, this.mouse.y);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.isDown = false;
    });
  }

  handlePointerDown(x, y) {
    if (window.sanctuaryAudio) {
      window.sanctuaryAudio.resume();
    }

    if (this.activeMode === 'fluid') {
      this.createRipple(x, y);
      const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(note, 0.22, 2.5);
      }
    } else if (this.activeMode === 'bonsai') {
      this.growBonsaiTree(x, this.height);
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
      this.growBonsaiTree(this.width * 0.5, this.height - 20, 110, -Math.PI / 2, 7);
      this.initPetalField();
    } else if (mode === 'bubbles') {
      this.initBubbleGrid();
    }
  }

  // --- MODE 1: FLUID & SAND RIPPLES ---
  initFluidParticles() {
    const count = Math.min(160, Math.floor((this.width * this.height) / 7000));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 2.5,
        alpha: 0.2 + Math.random() * 0.6,
        hueOffset: Math.random() * 40 - 20
      });
    }
  }

  addFluidParticle(x, y, px, py) {
    const dx = x - px;
    const dy = y - py;
    const speed = Math.min(8, Math.sqrt(dx * dx + dy * dy));
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: dx * 0.2 + (Math.random() - 0.5) * 1.2,
        vy: dy * 0.2 + (Math.random() - 0.5) * 1.2,
        radius: 2 + Math.random() * 3,
        alpha: 0.8,
        life: 1.0,
        decay: 0.012 + Math.random() * 0.015,
        isTrail: true
      });
    }
  }

  createRipple(x, y) {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 160 + Math.random() * 80,
      alpha: 0.9,
      speed: 2.2 + Math.random() * 1.2
    });
  }

  updateFluid() {
    // Update ambient particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isTrail) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= p.decay;
        p.alpha = p.life * 0.8;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        // Floating ambient particle
        p.x += p.vx;
        p.y += p.vy;

        // Gentle mouse avoidance
        const mdx = p.x - this.mouse.x;
        const mdy = p.y - this.mouse.y;
        const dist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (mdx / dist) * force;
          p.vy += (mdy / dist) * force;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
        if (p.y < 0) p.y = this.height;
        if (p.y > this.height) p.y = 0;
      }
    }

    // Update ripples
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
    // Draw ripples
    this.ripples.forEach(r => {
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.themePalette.primary;
      this.ctx.globalAlpha = r.alpha * 0.7;
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Second harmonic ring
      if (r.radius > 20) {
        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius * 0.65, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.themePalette.secondary;
        this.ctx.globalAlpha = r.alpha * 0.4;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    });

    // Draw connecting fluid lines between nearby particles
    this.ctx.lineWidth = 0.6;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 75) {
          const lineAlpha = (1 - dist / 75) * 0.25 * (p1.alpha + p2.alpha) * 0.5;
          this.ctx.strokeStyle = this.themePalette.secondary;
          this.ctx.globalAlpha = lineAlpha;
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.stroke();
        }
      }
    }

    // Draw particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.isTrail ? this.themePalette.accent : this.themePalette.primary;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = p.isTrail ? 12 : 6;
      this.ctx.shadowColor = this.themePalette.primary;
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  // --- MODE 2: THOUGHT DISSOLVER / STARDUST VORTEX ---
  startThoughtDissolve(text) {
    if (!text || text.trim() === '') return;
    this.activeMode = 'dissolve';
    this.particles = [];
    this.dissolving = true;
    this.dissolveBlackhole = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 0,
      maxRadius: 65,
      active: true,
      angle: 0
    };

    // Render text to temporary offscreen canvas to sample particle points
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d');
    offCanvas.width = this.width;
    offCanvas.height = this.height;

    offCtx.fillStyle = '#ffffff';
    offCtx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    // Wrap text into multiple lines if needed
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const width = offCtx.measureText(currentLine + ' ' + words[i]).width;
      if (width < this.width * 0.75) {
        currentLine += ' ' + words[i];
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    const lineHeight = 46;
    const startY = (this.height / 2) - ((lines.length - 1) * lineHeight / 2);
    lines.forEach((line, idx) => {
      offCtx.fillText(line, this.width / 2, startY + (idx * lineHeight));
    });

    // Sample pixel density
    const imgData = offCtx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;
    const step = 4; // density sampling

    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        const idx = (y * this.width + x) * 4;
        if (data[idx + 3] > 128) {
          const originX = x + (Math.random() - 0.5) * 2;
          const originY = y + (Math.random() - 0.5) * 2;
          this.particles.push({
            x: originX,
            y: originY,
            originX: originX,
            originY: originY,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            targetX: this.width / 2,
            targetY: this.height / 2,
            radius: 1.5 + Math.random() * 2,
            alpha: 1.0,
            orbitAngle: Math.random() * Math.PI * 2,
            orbitRadius: Math.sqrt(Math.pow(originX - this.width / 2, 2) + Math.pow(originY - this.height / 2, 2)),
            orbitSpeed: 0.04 + Math.random() * 0.04,
            decayRate: 0.006 + Math.random() * 0.008,
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
    this.dissolveBlackhole.angle += 0.05;
    if (this.dissolveBlackhole.radius < this.dissolveBlackhole.maxRadius) {
      this.dissolveBlackhole.radius += 0.8;
    }

    const bh = this.dissolveBlackhole;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Gravitational swirl toward center
      p.orbitRadius = Math.max(0, p.orbitRadius - (1.8 + (p.orbitRadius / 80)));
      p.orbitAngle += p.orbitSpeed * (1 + 100 / (p.orbitRadius + 20));

      p.x = bh.x + Math.cos(p.orbitAngle) * p.orbitRadius + (Math.random() - 0.5) * 2;
      p.y = bh.y + Math.sin(p.orbitAngle) * p.orbitRadius + (Math.random() - 0.5) * 2;

      p.alpha -= p.decayRate;

      if (p.orbitRadius <= 8 || p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length === 0) {
      this.dissolveBlackhole.active = false;
      this.dissolving = false;
      // Spawn congratulatory serenity sparkle
      this.createRipple(this.width / 2, this.height / 2);
      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(528, 0.4, 4.0);
      }
    }
  }

  drawDissolve() {
    const bh = this.dissolveBlackhole;
    if (bh.active) {
      // Draw cosmic event horizon / accretion disc glow
      const grad = this.ctx.createRadialGradient(bh.x, bh.y, 4, bh.x, bh.y, bh.radius * 2);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
      grad.addColorStop(0.3, this.themePalette.glow);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(bh.x, bh.y, bh.radius * 2, 0, Math.PI * 2);
      this.ctx.fill();

      // Swirling rings
      this.ctx.save();
      this.ctx.translate(bh.x, bh.y);
      this.ctx.rotate(bh.angle);
      this.ctx.strokeStyle = this.themePalette.accent;
      this.ctx.lineWidth = 1.5;
      this.ctx.globalAlpha = 0.4;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, bh.radius * 1.4, bh.radius * 0.6, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Draw stardust particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.hue;
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = p.hue;
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  // --- MODE 3: PROCEDURAL BONSAI & ZEN FOREST ---
  growBonsaiTree(startX, startY, length = 100, angle = -Math.PI / 2, depth = 7) {
    const tree = {
      branches: [],
      blossoms: [],
      windPhase: Math.random() * Math.PI * 2,
      growing: true
    };

    const buildBranch = (x, y, len, ang, dep, parentIndex = -1) => {
      if (dep <= 0) {
        // Leaf / Blossom
        tree.blossoms.push({
          x,
          y,
          radius: 3 + Math.random() * 4,
          color: Math.random() > 0.3 ? this.themePalette.accent : this.themePalette.secondary,
          alpha: 0,
          targetAlpha: 0.85 + Math.random() * 0.15,
          scale: 0
        });
        return;
      }

      const endX = x + Math.cos(ang) * len;
      const endY = y + Math.sin(ang) * len;

      const branchIdx = tree.branches.length;
      tree.branches.push({
        x1: x,
        y1: y,
        x2: endX,
        y2: endY,
        length: len,
        angle: ang,
        depth: dep,
        currentProgress: 0,
        width: Math.max(1.2, dep * 1.6),
        completed: false
      });

      // Branch splits
      const splitCount = dep > 4 ? 2 : (Math.random() < 0.75 ? 2 : 3);
      for (let s = 0; s < splitCount; s++) {
        const angleSpread = (0.35 + Math.random() * 0.3) * (s === 0 ? -1 : 1);
        const lenMultiplier = 0.7 + Math.random() * 0.18;
        buildBranch(endX, endY, len * lenMultiplier, ang + angleSpread, dep - 1, branchIdx);
      }
    };

    buildBranch(startX, startY, length, angle, depth);
    this.bonsaiTrees.push(tree);

    if (window.sanctuaryAudio) {
      window.sanctuaryAudio.playSingingBell(392, 0.2, 3.0);
    }
  }

  initPetalField() {
    this.petals = [];
    for (let i = 0; i < 35; i++) {
      this.petals.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: 0.5 + Math.random() * 1.2,
        vy: 0.8 + Math.random() * 1.0,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.03,
        size: 3 + Math.random() * 3,
        color: this.themePalette.accent
      });
    }
  }

  updateBonsai() {
    // Update wind and growth
    this.bonsaiTrees.forEach(tree => {
      tree.windPhase += 0.02;

      // Animate branch emergence
      tree.branches.forEach(b => {
        if (b.currentProgress < 1.0) {
          b.currentProgress = Math.min(1.0, b.currentProgress + 0.04);
        }
      });

      // Animate blossoms
      tree.blossoms.forEach(bl => {
        if (bl.scale < 1.0) {
          bl.scale = Math.min(1.0, bl.scale + 0.03);
          bl.alpha = bl.scale * bl.targetAlpha;
        }
      });
    });

    // Update drifting petals
    this.petals.forEach(pt => {
      pt.x += pt.vx + Math.sin(pt.y * 0.01) * 0.5;
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
      const windOffset = Math.sin(tree.windPhase) * 4;

      // Draw branches
      tree.branches.forEach(b => {
        if (b.currentProgress <= 0) return;
        const curX2 = b.x1 + (b.x2 - b.x1) * b.currentProgress + (b.depth < 3 ? windOffset * (4 - b.depth) * 0.3 : 0);
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

      // Draw blossoms
      tree.blossoms.forEach(bl => {
        if (bl.scale <= 0) return;
        this.ctx.beginPath();
        this.ctx.arc(bl.x + windOffset * 0.8, bl.y, bl.radius * bl.scale, 0, Math.PI * 2);
        this.ctx.fillStyle = bl.color;
        this.ctx.globalAlpha = bl.alpha;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = bl.color;
        this.ctx.fill();
      });
    });

    // Draw drifting petals
    this.petals.forEach(pt => {
      this.ctx.save();
      this.ctx.translate(pt.x, pt.y);
      this.ctx.rotate(pt.rot);
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, pt.size * 1.6, pt.size * 0.8, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = pt.color;
      this.ctx.globalAlpha = 0.7;
      this.ctx.fill();
      this.ctx.restore();
    });

    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
  }

  // --- MODE 4: TACTILE BUBBLE WRAP / PEBBLE POPPER ---
  initBubbleGrid() {
    this.bubbles = [];
    const radius = 26;
    const gap = 16;
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
          radius: radius,
          popped: false,
          popProgress: 0,
          alpha: 0.75,
          hue: (c * 15 + r * 20) % 360,
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
      if (dist < b.baseRadius) {
        b.popped = true;
        b.scale = 1.4;

        if (window.sanctuaryAudio) {
          const pitchMod = 0.8 + (idx % 12) * 0.08;
          window.sanctuaryAudio.playBubblePop(pitchMod);
        }

        // Spawn mini pop particles
        for (let k = 0; k < 6; k++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 3;
          this.particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: 2 + Math.random() * 2,
            alpha: 1.0,
            life: 1.0,
            decay: 0.04,
            isTrail: true
          });
        }

        // Auto-regenerate after 3 seconds for infinite popping satisfaction
        setTimeout(() => {
          b.popped = false;
          b.scale = 0.2;
        }, 3200);
      }
    });
  }

  updateBubbles() {
    this.bubbles.forEach(b => {
      if (b.popped) {
        if (b.scale > 0) b.scale = Math.max(0, b.scale - 0.1);
      } else {
        if (b.scale < 1.0) b.scale = Math.min(1.0, b.scale + 0.08);
      }
    });

    // Update pop particles
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

      // Outer bubble glow
      const grad = this.ctx.createRadialGradient(
        b.x - currentRadius * 0.3,
        b.y - currentRadius * 0.3,
        currentRadius * 0.1,
        b.x,
        b.y,
        currentRadius
      );
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      grad.addColorStop(0.6, `hsla(${b.hue}, 80%, 65%, 0.4)`);
      grad.addColorStop(1, `hsla(${b.hue}, 90%, 50%, 0.15)`);

      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Specular highlight
      this.ctx.beginPath();
      this.ctx.arc(b.x - currentRadius * 0.35, b.y - currentRadius * 0.35, currentRadius * 0.25, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      this.ctx.fill();

      // Border rim
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, currentRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${b.hue}, 80%, 75%, 0.6)`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    });

    // Draw pop particles
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.themePalette.accent;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
  }

  // --- MAIN ANIMATION LOOP ---
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
