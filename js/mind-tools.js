/**
 * Sanctuary Mind Tools & Decompression Modules
 * Validating permission slips, micro-step unblockers, and anti-burnout tools.
 */

class MindTools {
  constructor() {
    this.slips = [
      {
        title: "Official Permission Slip",
        text: "Permission granted to completely ignore all unread notifications, emails, and pull requests for the rest of this evening without feeling an ounce of guilt.",
        stamp: "APPROVED • ZERO GUILT",
        issuer: "Department of Nervous System Recovery"
      },
      {
        title: "Certificate of Mental Truce",
        text: "You have solved enough hard problems, navigated enough context switches, and thought enough deep thoughts today. Your brain has earned its rest.",
        stamp: "VERIFIED REST",
        issuer: "Council of Restful Humans"
      },
      {
        title: "Anti-Optimization Waiver",
        text: "You are hereby exempt from having to optimize, monetize, or improve anything right now. You are permitted to simply exist and enjoy this moment.",
        stamp: "EXEMPT",
        issuer: "Bureau of Unproductive Bliss"
      },
      {
        title: "Doomscroll Immunity Pass",
        text: "The world's crises will still be there tomorrow. Right now, your sole responsibility is to replenish your dopamine and recharge your spirit.",
        stamp: "DETOX ACTIVE",
        issuer: "Sanctuary Well-Being Division"
      },
      {
        title: "ADHD Hyperfocus Pardon",
        text: "It is completely fine that you researched 47 unrelated rabbit holes today. Close all 63 browser tabs in peace. Fresh start granted.",
        stamp: "TAB AMNESTY",
        issuer: "Global Neurodivergent Alliance"
      },
      {
        title: "Build-Break Immunity",
        text: "The code will compile tomorrow. That edge case can wait. The compiler doesn't judge you, and neither do we.",
        stamp: "MERGE BLOCKED FOR REST",
        issuer: "Zen Engineering Union"
      }
    ];

    this.wisdomQuotes = [
      "“Almost everything will work again if you unplug it for a few minutes, including you.” — Anne Lamott",
      "“Rest is not the reward for good work; rest is the prerequisite for all good life.”",
      "“Your worth is not measured by your token count, commit graph, or unread queue.”",
      "“You don’t have to finish the whole mountain today. Taking off your boots is enough.”",
      "“It is okay to be a masterpiece and a work in progress simultaneously.”",
      "“Give yourself permission to do things slowly, softly, and imperfectly.”"
    ];

    this.init();
  }

  init() {
    this.bindSlipGenerator();
    this.bindShredder();
    this.bindMicroTask();
  }

  // --- Permission Slip Generator ---
  getRandomSlip() {
    return this.slips[Math.floor(Math.random() * this.slips.length)];
  }

  bindSlipGenerator() {
    const btn = document.getElementById('new-slip-btn');
    const container = document.getElementById('permission-slip-card');
    if (!btn || !container) return;

    btn.addEventListener('click', () => {
      const slip = this.getRandomSlip();
      container.classList.add('fade-in');
      container.innerHTML = `
        <div class="slip-header">
          <span class="slip-badge">${slip.stamp}</span>
          <span class="slip-issuer">${slip.issuer}</span>
        </div>
        <h3 class="slip-title">${slip.title}</h3>
        <p class="slip-text">${slip.text}</p>
        <div class="slip-footer">
          <span>Date: ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span class="signature">✨ Authorized by Sanctuary</span>
        </div>
      `;
      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(659.25, 0.25, 2.0);
      }
      setTimeout(() => container.classList.remove('fade-in'), 400);
    });
  }

  // --- Corporate Jargon / Stress Shredder ---
  bindShredder() {
    const shredBtn = document.getElementById('shred-btn');
    const shredInput = document.getElementById('shred-input');
    const shredAnimation = document.getElementById('shred-animation');
    if (!shredBtn || !shredInput) return;

    shredBtn.addEventListener('click', () => {
      const text = shredInput.value.trim();
      if (!text) return;

      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playDissolveEffect();
      }

      if (shredAnimation) {
        shredAnimation.innerHTML = '';
        shredAnimation.style.display = 'block';
        for (let i = 0; i < 28; i++) {
          const confetti = document.createElement('div');
          confetti.className = 'shred-strip';
          confetti.style.left = `${Math.random() * 90}%`;
          confetti.style.animationDelay = `${Math.random() * 0.4}s`;
          confetti.style.backgroundColor = ['#f43f5e', '#38bdf8', '#a855f7', '#fbbf24', '#34d399'][Math.floor(Math.random() * 5)];
          shredAnimation.appendChild(confetti);
        }
      }

      shredInput.value = '';
      setTimeout(() => {
        if (shredAnimation) shredAnimation.style.display = 'none';
        const status = document.getElementById('shred-status');
        if (status) {
          status.textContent = '✨ Stress successfully annihilated into cosmic dust.';
          setTimeout(() => { status.textContent = ''; }, 3500);
        }
      }, 1500);
    });
  }

  // --- Micro Step Unblocker ---
  bindMicroTask() {
    const startBtn = document.getElementById('micro-task-start');
    const input = document.getElementById('micro-task-input');
    const timerDisplay = document.getElementById('micro-task-timer');
    const doneBtn = document.getElementById('micro-task-done');
    let timerInterval = null;
    let secondsLeft = 120; // 2 minutes gentle micro-step

    if (!startBtn || !input) return;

    startBtn.addEventListener('click', () => {
      const task = input.value.trim();
      if (!task) return;

      secondsLeft = 120;
      if (timerDisplay) {
        timerDisplay.style.display = 'block';
        timerDisplay.textContent = '02:00';
      }
      if (doneBtn) doneBtn.style.display = 'inline-block';
      startBtn.style.display = 'none';

      if (window.sanctuaryAudio) {
        window.sanctuaryAudio.playSingingBell(523.25, 0.25, 2.5);
      }

      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        secondsLeft--;
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        if (timerDisplay) {
          timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          if (window.sanctuaryAudio) {
            window.sanctuaryAudio.playSingingBell(880, 0.35, 4.0);
          }
          if (timerDisplay) timerDisplay.textContent = '🎉 Time is up! You did it!';
        }
      }, 1000);
    });

    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        if (timerInterval) clearInterval(timerInterval);
        if (timerDisplay) timerDisplay.textContent = '🌟 Brilliant job! Step complete!';
        if (window.sanctuaryAudio) {
          window.sanctuaryAudio.playSingingBell(784, 0.4, 3.5);
        }
        setTimeout(() => {
          if (timerDisplay) timerDisplay.style.display = 'none';
          if (doneBtn) doneBtn.style.display = 'none';
          startBtn.style.display = 'inline-block';
          input.value = '';
        }, 3000);
      });
    }
  }
}

window.MindTools = MindTools;
