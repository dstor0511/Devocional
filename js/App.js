/**
 * App
 * Central controller. Wires all modules together and
 * exposes the global `app` instance for inline HTML handlers.
 */
class App {
  currentPin = null;
  entries    = [];

  constructor() {
    this.crypto = new CryptoManager();
    this.store  = new DataStore(this.crypto);
    this.ui     = new UIManager(this);
    this.pin    = new PinManager(this);
    this.export = new ExportManager(this);
  }

  /* ── BOOT ── */

  async boot() {
    if (!this.store.isPinSet()) {
      this.pin.initSetup();
    } else {
      this.pin.initLock();
    }
    this.#registerServiceWorker();
    this.#registerPrintCleanup();
  }

  /* ── CALLED AFTER SUCCESSFUL UNLOCK OR SETUP ── */

  async onUnlocked() {
    if (!this.entries.length) {
      this.entries = await this.store.loadEntries(this.currentPin);
    }
    this.ui.resetForm();
    this.ui.showScreen('screen-app');
    this.ui.render(this.entries);
  }

  /* ── DATA ── */

  async loadEntries() {
    this.entries = await this.store.loadEntries(this.currentPin);
  }

  async saveEntries() {
    await this.store.saveEntries(this.entries, this.currentPin);
  }

  /* ── ENTRY ACTIONS ── */

  async addEntry() {
    const date = document.getElementById('f-date').value;
    if (!date) { this.ui.showToast('Selecciona una fecha'); return; }

    const prayer   = parseInt(document.getElementById('f-prayer').value) || 0;
    const read     = document.getElementById('f-read').checked;
    const readings = read ? this.ui.getReadings() : [];
    const note     = document.getElementById('f-note').value.trim();

    // replace existing entry for same date
    this.entries = this.entries.filter(e => e.date !== date);
    this.entries.push({ date, prayer, read, readings, note });
    this.entries.sort((a, b) => b.date.localeCompare(a.date));

    await this.saveEntries();
    this.ui.resetForm();
    this.ui.render(this.entries);
    this.ui.showToast('✓ Registro guardado');
  }

  async deleteEntry(date) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.entries = this.entries.filter(e => e.date !== date);
    await this.saveEntries();
    this.ui.render(this.entries);
  }

  async saveNote(date, newNote) {
    const entry = this.entries.find(e => e.date === date);
    if (!entry) return;
    entry.note = newNote;
    await this.saveEntries();
    this.ui.showToast('✓ Nota guardada');
    // re-render just this entry's toggle button
    const btn = document.querySelector(`#entry-${date} .btn-note-toggle`);
    if (btn) {
      const hasNote = !!newNote.trim();
      btn.className = `btn-note-toggle${hasNote ? ' has-note' : ''}`;
      btn.textContent = hasNote ? '📝 nota' : '📝';
    }
  }

  lockApp() {
    this.currentPin = null;
    this.entries    = [];
    this.pin.initLock();
  }

  /* ── PRIVATE HELPERS ── */

  #registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () =>
        navigator.serviceWorker.register('sw.js').catch(() => {})
      );
    }
  }

  #registerPrintCleanup() {
    window.addEventListener('afterprint', () => {
      document.getElementById('print-view').innerHTML = '';
    });
  }
}

/* ── GLOBAL INSTANCE ── */
const app = new App();

/* ── GLOBAL SHIMS (for inline HTML onclick handlers) ── */
window.addEventListener('DOMContentLoaded', () => app.boot());
