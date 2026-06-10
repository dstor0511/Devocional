/**
 * CryptoManager
 * Handles PIN hashing (PBKDF2 / SHA-256) and
 * data encryption / decryption (AES-256-GCM).
 */
class CryptoManager {
  static ITERATIONS = 150_000;
  static HASH       = 'SHA-256';

  #enc = new TextEncoder();
  #dec = new TextDecoder();

  /** Derive a raw bit-array from pin + salt (for PIN verification storage) */
  async hashPin(pin, salt) {
    const km   = await crypto.subtle.importKey('raw', this.#enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: CryptoManager.ITERATIONS, hash: CryptoManager.HASH },
      km, 256
    );
    return Array.from(new Uint8Array(bits));
  }

  /** Derive an AES-GCM CryptoKey from pin + salt */
  async #deriveKey(pin, salt) {
    const km = await crypto.subtle.importKey('raw', this.#enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: CryptoManager.ITERATIONS, hash: CryptoManager.HASH },
      km,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /** Encrypt a JS value (JSON-serialized) with pin. Returns { salt, iv, ct } arrays. */
  async encrypt(data, pin) {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    const iv   = Array.from(crypto.getRandomValues(new Uint8Array(12)));
    const key  = await this.#deriveKey(pin, salt);
    const ct   = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      this.#enc.encode(JSON.stringify(data))
    );
    return { salt, iv, ct: Array.from(new Uint8Array(ct)) };
  }

  /** Decrypt a stored { salt, iv, ct } object with pin. Returns original JS value. */
  async decrypt(stored, pin) {
    const key = await this.#deriveKey(pin, stored.salt);
    const pt  = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(stored.iv) },
      key,
      new Uint8Array(stored.ct)
    );
    return JSON.parse(this.#dec.decode(pt));
  }

  /** Compare two hash arrays in constant time */
  static hashesMatch(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
}
