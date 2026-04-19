/* ═══════════════════════════════════════════════
   SMART BANDAGE AI — AUTH SYSTEM (auth.js)
   localStorage-based welcome → login / register flow
   ═══════════════════════════════════════════════ */

const Auth = (() => {
  const STORAGE_KEY    = 'sb_user';
  const SESSION_KEY    = 'sb_session_active'; // lives in sessionStorage — clears when browser closes
  let _currentStep = 1;
  let _regData = {};

  /* ── Helpers ──────────────────────────────── */
  const $ = id => document.getElementById(id);
  const show = id => { const el = $(id); if (el) el.classList.remove('hidden'); };
  const hide = id => { const el = $(id); if (el) el.classList.add('hidden'); };

  async function hashPin(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + '_sb_salt_2026');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch { return null; }
  }
  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  /* ── Screen management ───────────────────── */
  function hideAllScreens() {
    ['welcome-screen','login-screen','register-screen','app-shell'].forEach(id => hide(id));
  }

  function showWelcome() {
    hideAllScreens();
    show('welcome-screen');
  }

  function showLogin() {
    hideAllScreens();
    show('login-screen');
    // Clear PIN
    document.querySelectorAll('.pin-digit').forEach(d => d.value = '');
    const first = $('pin-1');
    if (first) setTimeout(() => first.focus(), 100);
    // Show user name
    const user = getUser();
    if (user) {
      $('login-greeting').textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
      $('login-avatar-text').textContent = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }
  }

  function showRegister() {
    hideAllScreens();
    show('register-screen');
    _currentStep = 1;
    _regData = {};
    updateRegStep(1);
  }

  function showApp() {
    hideAllScreens();
    show('app-shell');
    // Populate state from stored user
    const user = getUser();
    if (user) {
      if (typeof state !== 'undefined') {
        state.patient.name   = user.patient?.name || 'Patient';
        state.patient.id     = user.patient?.id || 'PT-001';
        state.patient.weight = user.patient?.weight || 70;
        state.woundType      = user.woundType || 'unknown';
        // Always read API key from its dedicated localStorage slot — never from user object
        // This ensures the key persists across re-registrations and profile updates
        state.apiKey = localStorage.getItem('sb_api_key') || user.apiKey || '';
        if (state.apiKey) localStorage.setItem('sb_api_key', state.apiKey); // ensure it's saved
        if (typeof engine !== 'undefined') engine.setApiKey(state.apiKey);
      }
      // Update desktop header
      const nameDisp = $('patient-name-disp');
      if (nameDisp) nameDisp.textContent = user.patient?.name || 'Patient';
      const idDisp = $('patient-id-disp');
      if (idDisp) idDisp.textContent = (user.patient?.id || 'PT-001') + ' · ' + (user.patient?.weight || 70) + ' kg';
      const avatarEl = $('patient-avatar');
      if (avatarEl) avatarEl.textContent = (user.patient?.name || 'P').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

      // Update mobile header (new finance-app style)
      const mobAvatar = $('mob-avatar');
      if (mobAvatar) mobAvatar.textContent = (user.name || user.patient?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const mobName = $('mob-name');
      if (mobName) mobName.textContent = user.patient?.name || user.name?.split(' ')[0] || 'Patient';
      const mobWeightEl = $('mob-spo2-quick');
      // weight display handled by vitals update
    }
    // Init dashboard
    if (typeof initDashboard === 'function') initDashboard();
  }

  /* ── Register Steps ──────────────────────── */
  function updateRegStep(step) {
    _currentStep = step;
    // Update step dots
    document.querySelectorAll('#register-screen .step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i + 1 === step) dot.classList.add('active');
      else if (i + 1 < step) dot.classList.add('completed');
    });
    document.querySelectorAll('#register-screen .step-line').forEach((line, i) => {
      line.classList.toggle('completed', i + 1 < step);
    });
    // Show/hide step bodies
    document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
    const target = $('reg-step-' + step);
    if (target) target.classList.add('active');
    // Update button labels
    const nextBtn = $('reg-next-btn');
    if (nextBtn) {
      if (step === 3) {
        nextBtn.innerHTML = '✓ Complete Setup';
      } else {
        nextBtn.innerHTML = 'Continue →';
      }
    }
    // Back button
    const backBtn = $('reg-back-btn');
    if (backBtn) backBtn.style.display = step === 1 ? 'none' : '';

    // Build review on step 3
    if (step === 3) buildReview();
  }

  function validateStep(step) {
    let valid = true;
    if (step === 1) {
      const name = $('reg-name').value.trim();
      const email = $('reg-email').value.trim();
      const role = document.querySelector('.role-option.selected')?.dataset.role;
      const pin = $('reg-pin').value.trim();

      if (!name) { $('reg-name').parentElement.classList.add('error'); valid = false; }
      else $('reg-name').parentElement.classList.remove('error');

      if (!email || !email.includes('@')) { $('reg-email').parentElement.classList.add('error'); valid = false; }
      else $('reg-email').parentElement.classList.remove('error');

      if (!role) { valid = false; /* visual hint */ }

      if (!pin || pin.length < 4) { $('reg-pin').parentElement.classList.add('error'); valid = false; }
      else $('reg-pin').parentElement.classList.remove('error');

      if (valid) {
        _regData.name = name;
        _regData.email = email;
        _regData.role = role;
        _regData.pin = pin;
      }
    } else if (step === 2) {
      const pName = $('reg-patient-name').value.trim();
      const pId = $('reg-patient-id').value.trim();
      const pWeight = parseInt($('reg-patient-weight').value) || 0;

      if (!pName) { $('reg-patient-name').parentElement.classList.add('error'); valid = false; }
      else $('reg-patient-name').parentElement.classList.remove('error');

      if (!pId) { $('reg-patient-id').parentElement.classList.add('error'); valid = false; }
      else $('reg-patient-id').parentElement.classList.remove('error');

      if (pWeight < 1) { $('reg-patient-weight').parentElement.classList.add('error'); valid = false; }
      else $('reg-patient-weight').parentElement.classList.remove('error');

      if (valid) {
        _regData.patient = {
          name: pName,
          id: pId,
          weight: pWeight,
        };
        _regData.woundType = $('reg-wound-type').value;
        _regData.allergies = $('reg-allergies').value.trim();
      }
    }
    return valid;
  }

  function buildReview() {
    const container = $('reg-review');
    if (!container) return;
    const connPref = document.querySelector('.conn-option.selected')?.dataset.conn || 'simulation';
    _regData.connectionPref = connPref;
    _regData.apiKey = $('reg-api-key')?.value.trim() || '';

    container.innerHTML = `
      <div class="review-row"><span class="review-label">Name</span><span class="review-value">${_regData.name}</span></div>
      <div class="review-row"><span class="review-label">Email</span><span class="review-value">${_regData.email}</span></div>
      <div class="review-row"><span class="review-label">Role</span><span class="review-value">${_regData.role}</span></div>
      <div class="review-row"><span class="review-label">Patient</span><span class="review-value">${_regData.patient?.name} (${_regData.patient?.id})</span></div>
      <div class="review-row"><span class="review-label">Weight</span><span class="review-value">${_regData.patient?.weight} kg</span></div>
      <div class="review-row"><span class="review-label">Wound Type</span><span class="review-value">${_regData.woundType || 'Unknown'}</span></div>
      <div class="review-row"><span class="review-label">Connection</span><span class="review-value">${connPref}</span></div>
    `;
  }

  async function completeRegistration() {
    const connPref = document.querySelector('#reg-step-3 .conn-option.selected')?.dataset.conn || 'simulation';
    _regData.connectionPref = connPref;
    _regData.apiKey = $('reg-api-key')?.value.trim() || '';
    _regData.pinHash = await hashPin(_regData.pin);
    delete _regData.pin; // Don't store raw PIN

    const user = {
      ..._regData,
      avatar: _regData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      createdAt: new Date().toISOString(),
    };
    saveUser(user);

    // Save API key: if user entered one use it, otherwise KEEP the existing saved key
    const existingKey = localStorage.getItem('sb_api_key') || '';
    const finalKey = user.apiKey || existingKey;
    if (finalKey) localStorage.setItem('sb_api_key', finalKey);
    user.apiKey = finalKey; // keep it in sync on the user object too

    sessionStorage.setItem(SESSION_KEY, '1'); // remember this session
    showApp();
  }

  /* ── Login ───────────────────────────────── */
  async function attemptLogin() {
    const digits = Array.from(document.querySelectorAll('#login-screen .pin-digit')).map(d => d.value);
    const pin = digits.join('');
    if (pin.length < 4) return;

    const user = getUser();
    if (!user) { showWelcome(); return; }

    const pinHash = await hashPin(pin);
    if (pinHash === user.pinHash) {
      sessionStorage.setItem(SESSION_KEY, '1'); // remember this session
      showApp();
    } else {
      // Wrong PIN — shake animation
      const group = document.querySelector('.pin-input-group');
      group.style.animation = 'none';
      group.offsetHeight; // reflow
      group.style.animation = 'shake .4s ease';
      const errEl = $('login-error');
      if (errEl) { errEl.textContent = 'Incorrect PIN. Try again.'; errEl.style.display = 'block'; }
      document.querySelectorAll('.pin-digit').forEach(d => { d.value = ''; d.style.borderColor = 'var(--danger)'; });
      setTimeout(() => {
        document.querySelectorAll('.pin-digit').forEach(d => d.style.borderColor = '');
        $('pin-1')?.focus();
      }, 600);
    }
  }

  /* ── Event Binding ───────────────────────── */
  function init() {
    // Welcome buttons
    $('btn-get-started')?.addEventListener('click', showRegister);
    $('btn-have-account')?.addEventListener('click', () => {
      const user = getUser();
      if (user) showLogin();
      else showRegister(); // No account yet
    });

    // Login
    $('btn-login-submit')?.addEventListener('click', attemptLogin);
    $('btn-login-back')?.addEventListener('click', showWelcome);
    $('btn-login-forgot')?.addEventListener('click', () => {
      if (confirm('This will reset your account. You\'ll need to register again. Continue?')) {
        localStorage.removeItem(STORAGE_KEY);
        showWelcome();
      }
    });

    // PIN auto-focus
    document.querySelectorAll('.pin-digit').forEach((digit, i, all) => {
      digit.addEventListener('input', () => {
        if (digit.value.length === 1 && i < all.length - 1) all[i + 1].focus();
        if (digit.value.length === 1 && i === all.length - 1) attemptLogin();
      });
      digit.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !digit.value && i > 0) all[i - 1].focus();
      });
    });

    // Register nav
    $('reg-next-btn')?.addEventListener('click', async () => {
      if (_currentStep < 3) {
        if (validateStep(_currentStep)) updateRegStep(_currentStep + 1);
      } else {
        await completeRegistration();
      }
    });
    $('reg-back-btn')?.addEventListener('click', () => {
      if (_currentStep > 1) updateRegStep(_currentStep - 1);
      else showWelcome();
    });
    $('reg-back-welcome')?.addEventListener('click', showWelcome);

    // Role selector
    document.querySelectorAll('.role-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.role-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // Connection selector
    document.querySelectorAll('#reg-step-3 .conn-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('#reg-step-3 .conn-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // Logout (from settings or elsewhere)
    $('btn-logout')?.addEventListener('click', () => {
      if (confirm('Log out? Your data will be kept for next login.')) {
        sessionStorage.removeItem(SESSION_KEY); // clear session
        hideAllScreens();
        const user = getUser();
        if (user) showLogin();
        else showWelcome();
      }
    });

    // Start — auto-login if session is still active (same browser session)
    const user = getUser();
    if (user && sessionStorage.getItem(SESSION_KEY)) {
      showApp(); // same session → skip PIN
    } else if (user) {
      showLogin(); // returning user, new session → ask PIN
    } else {
      showWelcome(); // no account yet
    }
  }

  // Public API
  return { init, getUser, showApp, showWelcome, showLogin };
})();

// Init auth on DOM ready
document.addEventListener('DOMContentLoaded', () => Auth.init());
