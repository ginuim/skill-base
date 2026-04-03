class LruCache {
  constructor({ maxBytes = 50 * 1024 * 1024, defaultTtlMs = 0 } = {}) {
    this.maxBytes = Number.isFinite(maxBytes) ? Math.max(0, Math.floor(maxBytes)) : 0;
    this.defaultTtlMs = Number.isFinite(defaultTtlMs) ? Math.max(0, defaultTtlMs) : 0;
    this.map = new Map();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  static estimateSize(value) {
    try {
      const serialized = JSON.stringify(value);
      return Buffer.byteLength(serialized === undefined ? 'null' : serialized, 'utf8');
    } catch (error) {
      return 0;
    }
  }

  has(key) {
    const entry = this.map.get(key);
    if (!entry) {
      return false;
    }

    if (this.#isExpired(entry)) {
      this.#deleteEntry(key, entry);
      return false;
    }

    return true;
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) {
      this.misses += 1;
      return undefined;
    }

    if (this.#isExpired(entry)) {
      this.#deleteEntry(key, entry);
      this.misses += 1;
      return undefined;
    }

    this.map.delete(key);
    this.map.set(key, entry);
    this.hits += 1;
    return entry.value;
  }

  set(key, value, options = {}) {
    if (this.maxBytes <= 0) {
      return false;
    }

    const size = Number.isFinite(options.size) ? Math.max(0, Math.floor(options.size)) : LruCache.estimateSize(value);
    if (size > this.maxBytes) {
      this.delete(key);
      return false;
    }

    const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(0, options.ttlMs) : this.defaultTtlMs;
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    const entry = {
      value,
      size,
      refs: new Set(options.refs || []),
      expiresAt
    };

    const existing = this.map.get(key);
    if (existing) {
      this.#deleteEntry(key, existing);
    }

    this.map.set(key, entry);
    this.totalBytes += size;
    this.#evictIfNeeded();
    return true;
  }

  delete(key) {
    const entry = this.map.get(key);
    if (!entry) {
      return false;
    }

    this.#deleteEntry(key, entry);
    return true;
  }

  clear() {
    this.map.clear();
    this.totalBytes = 0;
  }

  clearByPrefix(prefix) {
    const keys = [];
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      this.delete(key);
    }

    return keys.length;
  }

  clearByRef(ref) {
    const keys = [];
    for (const [key, entry] of this.map.entries()) {
      if (entry.refs.has(ref)) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      this.delete(key);
    }

    return keys.length;
  }

  stats() {
    return {
      entries: this.map.size,
      totalBytes: this.totalBytes,
      maxBytes: this.maxBytes,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions
    };
  }

  #isExpired(entry) {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  #deleteEntry(key, entry) {
    this.map.delete(key);
    this.totalBytes = Math.max(0, this.totalBytes - entry.size);
  }

  #evictIfNeeded() {
    while (this.totalBytes > this.maxBytes && this.map.size > 0) {
      const oldestKey = this.map.keys().next().value;
      const oldestEntry = this.map.get(oldestKey);
      this.#deleteEntry(oldestKey, oldestEntry);
      this.evictions += 1;
    }
  }
}

module.exports = LruCache;
