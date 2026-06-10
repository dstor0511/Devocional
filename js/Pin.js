/**
 * PinManager
 * Controls setup, lock, unlock and PIN change flows.
 */
class PinManager {
  static MAX_ATTEMPTS = 5;
  static LOCKOUT_MS   = 30_000;

  #app;
  #failedAttempts = 0;
  #lockoutUntil   = 0;

  // setup state
  #setupStep  = 'create';
  #setupFirst = '';
  #setupInput = '';

  // lock state
  #lockInput = '';

  constructor(app) {
    this.#app = app;
  }

  /* ── SETUP ── */

  initSetup() {
    this.#setupStep  = 'create';
    this.#setupFirst = '';
    this.#setupInput = '';
    this.#buildNumpad('setup-pad',
      d => this.#setupDigit(d),
      () => this.#setupDel()
    );
    this.#updateSetupUI();
    this.#app.ui.showScreen('screen-setup');
  }

  #updateSetupUI() {
    document.getElementById('setup-title').textContent =
      this.#setupStep === 'create' ? 'Crea tu PIN' : 'Confirma tu PIN';
    document.getElementById('setup-subtitle').textContent =
      this.#setupStep === 'create' ? 'Elige un PIN de 4 dígitos' : 'Ingresa el PIN nuevamente';
    this.#app.ui.updateDots('setup-dots', this.#setupInput, '');
    document.getElementById('setup-error').textContent = '';
  }

  #setupDigit(d) {
    if (this.#setupInput.length >= 4) return;
    this.#setupInput += d;
    this.#app.ui.updateDots('setup-dots', this.#setupInput, '');
    if (this.#setupInput.length === 4) {
      setTimeout(() => this.#processSetup(), 120);
    }
  }

  #setupDel() {
    if (this.#setupInput.length > 0) {
      this.#setupInput = this.#setupInput.slice(0, -1);
      this.#app.ui.updateDots('setup-dots', this.#setupInput, '');
    }
  }

  async #processSetup() {
    if (this.#setupStep === 'create') {
      this.#setupFirst = this.#setupInput;
      this.#setupInput = '';
      this.#setupStep  = 'confirm';
      this.#updateSetupUI();
    } else if (this.#setupInput === this.#setupFirst) {
      await this.#confirmSetup(this.#setupInput);
    } else {
      this.#app.ui.shakeDots('setup-dots', 'error');
      document.getElementById('setup-error').textContent = 'Los PINs no coinciden. Intenta de nuevo.';
      setTimeout(() => {
        this.#setupStep  = 'create';
        this.#setupFirst = '';
        this.#setupInput = '';
        this.#updateSetupUI();
      }, 1200);
    }
  }

  async #confirmSetup(pin) {
    await this.#app.store.savePin(pin);
    this.#app.currentPin = pin;
    this.#app.ui.shakeDots('setup-dots', 'success');
    setTimeout(() => this.#app.onUnlocked(), 500);
  }

  /* ── LOCK ── */

  initLock() {
    this.#lockInput = '';
    this.#app.ui.updateDots('lock-dots', '', '');
    document.getElementById('lock-error').textContent   = '';
    document.getElementById('lockout-msg').textContent  = '';
    this.#buildNumpad('lock-pad',
      d => this.#lockDigit(d),
      () => this.#lockDel()
    );
    this.#checkLockout();
    this.#app.ui.showScreen('screen-lock');
  }

  #lockDigit(d) {
    if (this.#isLockedOut()) return;
    if (this.#lockInput.length >= 4) return;
    this.#lockInput += d;
    this.#app.ui.updateDots('lock-dots', this.#lockInput, '');
    if (this.#lockInput.length === 4) {
      setTimeout(() => this.#verifyPin(this.#lockInput), 120);
    }
  }

  #lockDel() {
    if (this.#lockInput.length > 0) {
      this.#lockInput = this.#lockInput.slice(0, -1);
      this.#app.ui.updateDots('lock-dots', this.#lockInput, '');
    }
  }

  async #verifyPin(pin) {
    const ok = await this.#app.store.verifyPin(pin);
    if (ok) {
      this.#app.currentPin    = pin;
      this.#failedAttempts = 0;
      this.#app.ui.shakeDots('lock-dots', 'success');
      await this.#app.loadEntries();
      setTimeout(() => this.#app.onUnlocked(), 400);
    } else {
      this.#failedAttempts++;
      this.#app.ui.shakeDots('lock-dots', 'error');
      this.#lockInput = '';
      if (this.#failedAttempts >= PinManager.MAX_ATTEMPTS) {
        this.#lockoutUntil = Date.now() + PinManager.LOCKOUT_MS;
        this.#startLockoutTimer();
      } else {
        const left = PinManager.MAX_ATTEMPTS - this.#failedAttempts;
        document.getElementById('lock-error').textContent =
          `PIN incorrecto. ${left} intento${left !== 1 ? 's' : ''} restante${left !== 1 ? 's' : ''}.`;
      }
      setTimeout(() => this.#app.ui.updateDots('lock-dots', '', ''), 600);
    }
  }

  #isLockedOut()   { return Date.now() < this.#lockoutUntil; }
  #checkLockout()  { if (this.#isLockedOut()) this.#startLockoutTimer(); }

  #startLockoutTimer() {
    const el  = document.getElementById('lockout-msg');
    const err = document.getElementById('lock-error');
    err.textContent = '';
    const tick = () => {
      const rem = Math.ceil((this.#lockoutUntil - Date.now()) / 1000);
      if (rem <= 0) {
        el.textContent = '';
        this.#lockInput = '';
        this.#app.ui.updateDots('lock-dots', '', '');
        return;
      }
      el.textContent = `Demasiados intentos. Espera ${rem}s`;
      setTimeout(tick, 1000);
    };
    tick();
  }

  showForgotInfo() {
    alert('Si olvidaste tu PIN, borra los datos de la app en Ajustes de iOS → Safari → Datos de sitios web.');
  }

  /* ── CHANGE PIN ── */

  openChangeModal() {
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value     = '';
    document.getElementById('cp-confirm').value = '';
    document.getElementById('cp-error').textContent = '';
    document.getElementById('change-pin-modal').classList.add('open');
  }

  closeChangeModal() {
    document.getElementById('change-pin-modal').classList.remove('open');
  }

  async changePin() {
    const curr = document.getElementById('cp-current').value;
    const nw   = document.getElementById('cp-new').value;
    const conf = document.getElementById('cp-confirm').value;
    const err  = document.getElementById('cp-error');

    if (curr !== this.#app.currentPin) { err.textContent = 'PIN actual incorrecto.';           return; }
    if (!/^\d{4}$/.test(nw))           { err.textContent = 'El PIN debe ser de 4 dígitos.';    return; }
    if (nw !== conf)                    { err.textContent = 'Los PINs nuevos no coinciden.';    return; }

    await this.#app.store.savePin(nw);
    this.#app.currentPin = nw;
    await this.#app.saveEntries();
    this.closeChangeModal();
    this.#app.ui.showToast('✓ PIN cambiado');
  }

  /* ── NUMPAD BUILDER ── */

  #buildNumpad(padId, onDigit, onDel) {
    const pad = document.getElementById(padId);
    pad.innerHTML = '';
    [1, 2, 3, 4, 5, 6, 7, 8, 9, '', '0', '⌫'].forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'num-btn' + (v === '' ? ' empty' : v === '⌫' ? ' del' : '');
      btn.textContent = v;
      if (v !== '') btn.onclick = () => v === '⌫' ? onDel() : onDigit(String(v));
      pad.appendChild(btn);
    });
  }
}
