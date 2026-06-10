/**
 * DataStore
 * Manages encrypted persistence and statistics calculations.
 */
class DataStore {
  static #KEY_PIN_HASH = 'dev_pin_hash';
  static #KEY_PIN_SALT = 'dev_pin_salt';
  static #KEY_PIN_SET  = 'dev_pin_set';
  static #KEY_DATA     = 'dev_data_enc';

  static NOTE_TEMPLATE =
    '## 🙏 ¿Qué aprendí sobre Dios?\n\n' +
    '## 👤 ¿Qué aprendí sobre mí?\n\n'    +
    '## ✅ ¿Qué debo hacer?\n\n'           +
    '## 🔄 ¿Qué debo cambiar?';

  #crypto;

  constructor(crypto) {
    this.#crypto = crypto;
  }

  /* ── PIN ── */

  isPinSet() {
    return !!localStorage.getItem(DataStore.#KEY_PIN_SET);
  }

  async savePin(pin) {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await this.#crypto.hashPin(pin, salt);
    localStorage.setItem(DataStore.#KEY_PIN_SALT, JSON.stringify(salt));
    localStorage.setItem(DataStore.#KEY_PIN_HASH, JSON.stringify(hash));
    localStorage.setItem(DataStore.#KEY_PIN_SET,  '1');
  }

  async verifyPin(pin) {
    const salt    = JSON.parse(localStorage.getItem(DataStore.#KEY_PIN_SALT));
    const stored  = JSON.parse(localStorage.getItem(DataStore.#KEY_PIN_HASH));
    const attempt = await this.#crypto.hashPin(pin, salt);
    return CryptoManager.hashesMatch(attempt, stored);
  }

  /* ── ENTRIES ── */

  async saveEntries(entries, pin) {
    const encrypted = await this.#crypto.encrypt(entries, pin);
    localStorage.setItem(DataStore.#KEY_DATA, JSON.stringify(encrypted));
  }

  async loadEntries(pin) {
    const raw = localStorage.getItem(DataStore.#KEY_DATA);
    if (!raw) return [];
    try {
      const entries = await this.#crypto.decrypt(JSON.parse(raw), pin);
      return this.#migrate(entries);
    } catch {
      return [];
    }
  }

  /** Migrate old format (single book/passage) to readings array */
  #migrate(entries) {
    return entries.map(e => {
      if (!e.readings) {
        e.readings = e.book ? [{ book: e.book, passage: e.passage || '' }] : [];
        delete e.book;
        delete e.passage;
      }
      if (e.note === undefined) e.note = '';
      return e;
    });
  }

  /* ── STATISTICS ── */

  calcStreak(entries) {
    const dates = entries
      .filter(e => e.read)
      .map(e => e.date)
      .sort((a, b) => b.localeCompare(a));
    if (!dates.length) return 0;

    let streak = 0;
    const ref  = new Date(); ref.setHours(0, 0, 0, 0);
    for (const d of dates) {
      const diff = Math.round((ref - new Date(d + 'T00:00:00')) / 86400000);
      if (diff === streak) streak++; else break;
    }
    return streak;
  }

  calcLongestStreak(entries) {
    const dates = entries
      .filter(e => e.read)
      .map(e => e.date)
      .sort();
    if (!dates.length) return 0;

    let max = 1, cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.round(
        (new Date(dates[i] + 'T00:00:00') - new Date(dates[i - 1] + 'T00:00:00')) / 86400000
      );
      if (diff === 1) { cur++; max = Math.max(max, cur); } else cur = 1;
    }
    return max;
  }

  bookFrequency(entries) {
    const freq = {};
    entries.forEach(e =>
      (e.readings || []).forEach(r => {
        if (r.book) freq[r.book] = (freq[r.book] || 0) + 1;
      })
    );
    return freq;
  }

  topBooks(entries, n = 9) {
    return Object.entries(this.bookFrequency(entries))
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  testamentSplit(entries) {
    let ot = 0, nt = 0;
    entries.forEach(e =>
      (e.readings || []).forEach(r => {
        if (r.book) BibleData.isOT(r.book) ? ot++ : nt++;
      })
    );
    return { ot, nt };
  }

  /* ── DATES ── */

  static formatDate(s) {
    return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short'
    });
  }

  static formatDateLong(s) {
    return new Date(s + 'T00:00:00').toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  static todayString() {
    return new Date().toISOString().split('T')[0];
  }
}
