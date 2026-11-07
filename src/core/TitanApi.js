'use strict';

/**
 * ⚡ TITAN API TRANSFORMER ENGINE (v2.1.0)
 * Linear Power Supply / Transformer Architecture for REST & Memory Registers
 * 
 * • Transformer: Step-down remote HTTP/REST to safe in-memory registers
 * • Diode: One-way exception barrier (zero try/catch, pipes all errors to Register 90/99)
 * • Capacitor: Debounced reactive search/filter pipeline (smooths jittery inputs)
 * • Dual-Lock Auth: Auto-injects Bearer Token (Reg 3) & 2FA Rolling Heartbeat (Reg 2)
 * • Auto 401 Interceptor: Session expiry -> Reg 4=2, clears Reg 3, routes Reg 10='login'
 * • Client-Side Filter & Sort: Pure local array transforms with 0ms latency
 */

class TitanApi {
  /**
   * @param {import('./TitanCircuitEngine')} engine 
   * @param {string} [baseUrl=''] 
   * @param {object} [options={}]
   */
  constructor(engine, baseUrl = '', options = {}) {
    this.engine = engine;
    this.baseUrl = (baseUrl || '').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 15000;
    this.defaultHeaders = options.headers || {};
  }

  // ─── Transformer Core (Internal HTTP Fetcher) ──────────────────────────

  async _request(targetAddress, endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;

    // 1. Dual-Lock Security: Bearer Token (Reg 3) + Heartbeat 2FA (Reg 2)
    const token = this.engine.state.get('3') || this.engine.state.get(3);
    const heartbeat = this.engine.state.get('2') || this.engine.state.get(2);

    const headers = {
      'Accept': 'application/json',
      ...this.defaultHeaders,
      ...options.headers
    };

    if (!(options.body instanceof (typeof FormData !== 'undefined' ? FormData : Object))) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
      headers['Authorization'] = String(token).startsWith('Bearer ') ? String(token) : `Bearer ${token}`;
    }
    if (heartbeat !== undefined && heartbeat !== null) {
      headers['X-Titan-Heartbeat'] = String(heartbeat);
    }

    // 2. AbortController Timeout Protection
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), options.timeoutMs || this.timeoutMs) : null;

    try {
      const fetchOpts = {
        method,
        headers,
        signal: controller ? controller.signal : undefined
      };

      if (options.body !== undefined) {
        fetchOpts.body = typeof options.body === 'string' || (typeof FormData !== 'undefined' && options.body instanceof FormData)
          ? options.body
          : JSON.stringify(options.body);
      }

      const res = await fetch(url, fetchOpts);
      if (timeoutId) clearTimeout(timeoutId);

      // Auto 401 Session Interceptor
      if (res.status === 401) {
        this.engine.tx(4, 2, 'TITAN_API_AUTH_EXPIRED'); // Reg 4 = Expired / Locked
        this.engine.tx(3, null, 'TITAN_API_AUTH_CLEARED'); // Reg 3 = Clear Token
        this.engine.tx(10, 'login', 'TITAN_API_NAVIGATE'); // Reg 10 = Route to Login
        const err = new Error(`HTTP 401 Unauthorized: Session Expired`);
        err.status = 401;
        this.engine.handleError(err, String(targetAddress));
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let parsedErr;
        try { parsedErr = JSON.parse(errorText); } catch (_) { parsedErr = null; }
        const err = new Error(`HTTP ${res.status} ${res.statusText}${parsedErr ? ': ' + JSON.stringify(parsedErr) : ''}`);
        err.status = res.status;
        err.data = parsedErr || errorText;
        this.engine.handleError(err, String(targetAddress));
        return null;
      }

      // Handle 204 No Content
      if (res.status === 204) {
        this.engine.tx(targetAddress, null, 'TITAN_API');
        return null;
      }

      const data = await res.json().catch(() => null);

      // Commit response directly into Titan Bus Register!
      if (targetAddress !== undefined && targetAddress !== null) {
        this.engine.tx(targetAddress, data, 'TITAN_API');
      }
      return data;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      // Diode Action: Absorb exception, redirect strictly to Register 90/99
      const isTimeout = err.name === 'AbortError';
      const cleanErr = isTimeout ? new Error(`Request Timeout after ${this.timeoutMs}ms`) : err;
      cleanErr.endpoint = endpoint;
      cleanErr.targetAddress = targetAddress;
      this.engine.handleError(cleanErr, String(targetAddress));
      return null;
    }
  }

  // ─── High-Level Public REST Methods ────────────────────────────────────

  /** GET Request -> Commits payload to targetAddress */
  rx(targetAddress, endpoint, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'GET' });
  }

  /** POST Request -> Sends payload, commits server response to targetAddress */
  tx(targetAddress, endpoint, payload, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'POST', body: payload });
  }

  /** PUT Request */
  put(targetAddress, endpoint, payload, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'PUT', body: payload });
  }

  /** PATCH Request */
  patch(targetAddress, endpoint, payload, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'PATCH', body: payload });
  }

  /** DELETE Request -> Resets targetAddress to null or returns response */
  delete(targetAddress, endpoint, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'DELETE' });
  }

  /** Multipart File/Form Upload */
  upload(targetAddress, endpoint, formData, options = {}) {
    return this._request(targetAddress, endpoint, { ...options, method: 'POST', body: formData });
  }

  // ─── Reactive Search, Filter & Sort Pipelines ──────────────────────────

  /**
   * ⚡ Server-Side API Wire (Capacitor/Debounce Filter)
   * Listens to triggerAddress (e.g. search input), debounces, fetches endpoint, and commits to targetAddress.
   */
  wire(triggerAddress, endpointBuilder, targetAddress, options = {}) {
    const debounceMs = options.debounce ?? 250;
    let timer = null;

    return this.engine.rx(triggerAddress, (queryVal) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const ep = typeof endpointBuilder === 'function' ? endpointBuilder(queryVal) : `${endpointBuilder}?q=${encodeURIComponent(queryVal)}`;
        if (ep) {
          this.rx(targetAddress, ep, options);
        }
      }, debounceMs);
    });
  }

  /**
   * 🔍 Client-Side Filter Pipeline (0ms Latency Memory Filter)
   * Filters local array at sourceAddress using triggerAddress query, outputs to targetAddress.
   */
  filter(config = {}) {
    const { source, trigger, target, fn, debounce = 50 } = config;
    let timer = null;

    return this.engine.rx(trigger, (queryVal) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const raw = this.engine.state.get(String(source)) ?? this.engine.state.get(Number(source));
        if (!Array.isArray(raw)) {
          this.engine.tx(target, [], 'CLIENT_FILTER');
          return;
        }

        const q = String(queryVal || '').trim().toLowerCase();
        if (!q) {
          // If query is empty, pass through all items
          this.engine.tx(target, raw, 'CLIENT_FILTER');
          return;
        }

        const filtered = raw.filter((item) => {
          if (typeof fn === 'function') return fn(item, queryVal);
          // Default heuristic: search across all string values in item
          if (typeof item === 'object' && item !== null) {
            return Object.values(item).some(v => String(v).toLowerCase().includes(q));
          }
          return String(item).toLowerCase().includes(q);
        });

        this.engine.tx(target, filtered, 'CLIENT_FILTER');
      }, debounce);
    });
  }

  /**
   * 📊 Client-Side Sort Pipeline (0ms Latency Memory Sort)
   * Sorts local array at sourceAddress when triggerAddress fires, outputs to targetAddress.
   */
  sort(config = {}) {
    const { source, trigger, target, fn } = config;

    return this.engine.rx(trigger, (sortVal) => {
      const raw = this.engine.state.get(String(source)) ?? this.engine.state.get(Number(source));
      if (!Array.isArray(raw)) return;

      const cloned = [...raw];
      if (typeof fn === 'function') {
        cloned.sort((a, b) => fn(a, b, sortVal));
      } else {
        // Default comparator: string/numeric asc/desc based on sortVal
        cloned.sort((a, b) => {
          if (sortVal === 'desc' || sortVal === -1) return b > a ? 1 : -1;
          return a > b ? 1 : -1;
        });
      }

      this.engine.tx(target, cloned, 'CLIENT_SORT');
    });
  }
}

module.exports = TitanApi;
