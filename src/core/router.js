'use strict';

/**
 * 🐬 DANPHE-WEB ROUTER (v1.0.0)
 * Ultra-Lean, Zero-Reload Universal Client Routing Engine (< 2 KB)
 * 
 * • Hash & HTML5 History API modes
 * • Dynamic route parameters (/product/:id)
 * • Reactive Route switching without full-page reloads
 * • Seamless JSX <Route> integration
 */

const { h } = require('./jsx-runtime');

class DanpheRouter {
  constructor(options = {}) {
    this.mode = options.mode || 'hash'; // 'hash' or 'history'
    this.routes = new Map();            // pathPattern -> Component / Handler
    this.currentPath = this._getInitialPath();
    this.params = {};
    this.listeners = new Set();

    this._bindEvents();
  }

  _getInitialPath() {
    if (typeof window === 'undefined') return '/';
    if (this.mode === 'hash') {
      const hash = window.location.hash.slice(1);
      return hash.startsWith('/') ? hash : '/' + hash;
    }
    return window.location.pathname || '/';
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    if (this.mode === 'hash') {
      window.addEventListener('hashchange', () => {
        this.navigate(this._getInitialPath(), false);
      });
    } else {
      window.addEventListener('popstate', () => {
        this.navigate(window.location.pathname, false);
      });
    }
  }

  /**
   * Register a route pattern and component
   */
  add(path, component) {
    this.routes.set(path, component);
    return this;
  }

  /**
   * Navigate to a new path
   */
  navigate(toPath, updateHistory = true) {
    if (!toPath.startsWith('/')) toPath = '/' + toPath;
    if (this.currentPath === toPath) return;

    this.currentPath = toPath;

    if (typeof window !== 'undefined' && updateHistory) {
      if (this.mode === 'hash') {
        window.location.hash = toPath;
      } else {
        window.history.pushState({}, '', toPath);
      }
    }

    // Match route and extract params
    this._matchCurrentRoute();

    // Notify all router listeners
    this.listeners.forEach(fn => {
      try { fn(this.currentPath, this.params); } catch(e) { console.error(e); }
    });
  }

  _matchCurrentRoute() {
    this.params = {};
    for (const [pattern] of this.routes.entries()) {
      const match = this._matchPattern(pattern, this.currentPath);
      if (match) {
        this.params = match;
        return pattern;
      }
    }
    return null;
  }

  _matchPattern(pattern, path) {
    if (pattern === path) return {};

    const pParts = pattern.split('/').filter(Boolean);
    const uParts = path.split('/').filter(Boolean);

    if (pParts.length !== uParts.length) return null;

    const params = {};
    for (let i = 0; i < pParts.length; i++) {
      if (pParts[i].startsWith(':')) {
        params[pParts[i].slice(1)] = decodeURIComponent(uParts[i]);
      } else if (pParts[i] !== uParts[i]) {
        return null;
      }
    }
    return params;
  }

  /**
   * Subscribe to route changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Returns current active component
   */
  getActiveComponent() {
    for (const [pattern, component] of this.routes.entries()) {
      const match = this._matchPattern(pattern, this.currentPath);
      if (match) {
        return typeof component === 'function' ? component({ params: match, path: this.currentPath }) : component;
      }
    }
    // 404 fallback if registered
    const fallback = this.routes.get('*') || this.routes.get('404');
    return fallback ? (typeof fallback === 'function' ? fallback({ path: this.currentPath }) : fallback) : null;
  }
}

const defaultRouter = new DanpheRouter();

/**
 * Declarative Router Outlet Component
 */
function RouterView() {
  return defaultRouter.getActiveComponent() || h('div', { class: 'danphe-route-empty' }, '404 - Page Not Found');
}

module.exports = {
  DanpheRouter,
  defaultRouter,
  RouterView
};
