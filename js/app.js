/**
 * Sanctuary App Coordinator
 * State management, theme switching, UI wiring, keyboard shortcuts,
 * preset sync/isolation, and mobile first-touch audio unlocking.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Engines
  const zenCanvas = new ZenCanvas('zen-main-canvas');
  const breathPacer = new BreathPacer('breath-canvas');
  const mindTools = new MindTools();
  const audio = window.sanctuaryAudio;

  // Global Mobile Audio Unlocker
  const unlockAudio = async () => {
    if (audio) await audio.resume();
    document.removeEventListener('pointerdown', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('click', unlockAudio);
  };
  document.addEventListener('pointerdown', unlockAudio, { passive: true, once: true });
  document.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
  document.addEventListener('click', unlockAudio, { passive: true, once: true });

  // 2. Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      const isActive = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    setTimeout(() => {
      if (tabId === 'tab-playground') {
        zenCanvas.resize();
      } else if (tabId === 'tab-breath') {
        breathPacer.resize();
      }
    }, 20);
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // 3. Theme Engine
  const themeSelector = document.getElementById('theme-selector');
  const themes = ['zen', 'cyberpunk', 'retro98', 'coquette', 'corporate', 'brainrot', 'lofi'];
  let currentThemeIndex = 0;

  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    if (themeSelector) themeSelector.value = themeName;
    zenCanvas.setThemePalette(themeName);
    currentThemeIndex = themes.indexOf(themeName);
    if (currentThemeIndex === -1) currentThemeIndex = 0;
    try {
      localStorage.setItem('sanctuary_theme', themeName);
    } catch (e) {}
  }

  if (themeSelector) {
    themeSelector.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }

  const savedTheme = localStorage.getItem('sanctuary_theme');
  if (savedTheme && themes.includes(savedTheme)) {
    applyTheme(savedTheme);
  }

  // 4. Audio Controls & Master Mute
  const muteBtn = document.getElementById('btn-master-mute');
  const muteIcon = document.getElementById('mute-icon');
  const muteText = document.getElementById('mute-text');

  function updateMuteUI(isMuted) {
    if (muteIcon) muteIcon.textContent = isMuted ? '🔇' : '🔊';
    if (muteText) muteText.textContent = isMuted ? 'Muted' : 'Sound On';
    if (muteBtn) muteBtn.style.opacity = isMuted ? '0.7' : '1.0';
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', async () => {
      await audio.resume();
      const isMuted = audio.toggleMute();
      updateMuteUI(isMuted);
    });
  }

  // Presets & Sliders Sync
  const allPresetButtons = document.querySelectorAll('[data-preset]');
  const channels = ['rain', 'lofi', 'fire', 'ocean', 'wind', 'binaural', 'purr'];

  function syncSlidersFromAudio(presetObj) {
    channels.forEach(ch => {
      const vol = presetObj[ch] !== undefined ? presetObj[ch] : 0;
      const slider = document.getElementById(`slider-${ch}`);
      const valDisplay = document.getElementById(`val-${ch}`);
      if (slider) slider.value = vol;
      if (valDisplay) valDisplay.textContent = `${Math.round(vol * 100)}%`;
    });
  }

  channels.forEach(ch => {
    const slider = document.getElementById(`slider-${ch}`);
    const valDisplay = document.getElementById(`val-${ch}`);
    if (slider) {
      slider.addEventListener('input', async (e) => {
        await audio.resume();
        allPresetButtons.forEach(b => b.classList.remove('active'));
        const val = parseFloat(e.target.value);
        audio.setChannelVolume(ch, val);
        if (valDisplay) valDisplay.textContent = `${Math.round(val * 100)}%`;
      });
    }
  });

  const masterSlider = document.getElementById('slider-master');
  const masterValDisplay = document.getElementById('val-master');
  if (masterSlider) {
    masterSlider.addEventListener('input', async (e) => {
      await audio.resume();
      const val = parseFloat(e.target.value);
      audio.setMasterVolume(val);
      if (masterValDisplay) masterValDisplay.textContent = `${Math.round(val * 100)}%`;
    });
  }

  // Preset Buttons Handling
  allPresetButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      await audio.resume();
      const presetName = btn.getAttribute('data-preset');
      
      allPresetButtons.forEach(b => {
        const isMatch = b.getAttribute('data-preset') === presetName;
        b.classList.toggle('active', isMatch);
      });

      const presetObj = audio.applyPreset(presetName);
      if (presetObj) {
        syncSlidersFromAudio(presetObj);
      }
      audio.playSingingBell(432, 0.2, 2.5);
    });
  });

  // Binaural frequency mode pills
  const binauralChips = document.querySelectorAll('.binaural-chip');
  binauralChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      await audio.resume();
      binauralChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const mode = chip.getAttribute('data-binaural');
      audio.setBinauralMode(mode);
    });
  });

  // Manual Tibetan Bell Button
  const chimeBtn = document.getElementById('btn-manual-chime');
  if (chimeBtn) {
    chimeBtn.addEventListener('click', async () => {
      await audio.resume();
      audio.playSingingBell(432, 0.35, 4.0);
      zenCanvas.createRipple(zenCanvas.width / 2, zenCanvas.height / 2);
    });
  }

  // 5. Canvas Mode Switcher
  const modePills = document.querySelectorAll('.mode-pill[data-mode]');
  const canvasHint = document.getElementById('canvas-hint');
  const hints = {
    fluid: 'Touch or drag to create glowing ripples & pentatonic chimes',
    bonsai: 'Tap the ground to grow fractal bonsai trees and blossoms',
    bubbles: 'Tap or glide across the bubble sheet to pop bubbles'
  };

  modePills.forEach(pill => {
    pill.addEventListener('click', () => {
      modePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const mode = pill.getAttribute('data-mode');
      zenCanvas.setMode(mode);
      if (canvasHint && hints[mode]) {
        canvasHint.textContent = hints[mode];
      }
    });
  });

  // 6. Thought Dissolver
  const dissolveBtn = document.getElementById('dissolve-btn');
  const thoughtInput = document.getElementById('thought-input');

  function triggerThoughtDissolve() {
    const text = thoughtInput.value.trim();
    if (!text) return;
    audio.resume();
    zenCanvas.startThoughtDissolve(text);
    thoughtInput.value = '';
    if (canvasHint) {
      canvasHint.textContent = '🌌 Watch your thought dissolve into serene stardust...';
      setTimeout(() => {
        const activePill = document.querySelector('.mode-pill.active[data-mode]');
        const m = activePill ? activePill.getAttribute('data-mode') : 'fluid';
        if (hints[m]) canvasHint.textContent = hints[m];
      }, 5000);
    }
  }

  if (dissolveBtn) {
    dissolveBtn.addEventListener('click', triggerThoughtDissolve);
  }
  if (thoughtInput) {
    thoughtInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        triggerThoughtDissolve();
      }
    });
  }

  // 7. Breath Pacer Controls
  const startBreathBtn = document.getElementById('btn-start-breath');
  const stopBreathBtn = document.getElementById('btn-stop-breath');
  const breathPatternButtons = document.querySelectorAll('.breath-pattern-btn');

  if (startBreathBtn) {
    startBreathBtn.addEventListener('click', async () => {
      await audio.resume();
      breathPacer.start();
    });
  }

  if (stopBreathBtn) {
    stopBreathBtn.addEventListener('click', () => {
      breathPacer.stop();
    });
  }

  breathPatternButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      breathPatternButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pattern = btn.getAttribute('data-pattern');
      breathPacer.setPattern(pattern);
    });
  });

  // 8. Keyboard Shortcuts
  window.addEventListener('keydown', async (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      await audio.resume();
      const isMuted = audio.toggleMute();
      updateMuteUI(isMuted);
    } else if (e.key === '1') {
      switchTab('tab-playground');
    } else if (e.key === '2') {
      switchTab('tab-soundscape');
    } else if (e.key === '3') {
      switchTab('tab-breath');
    } else if (e.key === '4') {
      switchTab('tab-mind');
    } else if (e.key === 't' || e.key === 'T') {
      currentThemeIndex = (currentThemeIndex + 1) % themes.length;
      applyTheme(themes[currentThemeIndex]);
    }
  });
});
