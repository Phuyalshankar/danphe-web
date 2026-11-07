(function(global) {
  'use strict';

  // 1. DolphinCSS Core
  const PALETTE = {
    primary:   { bg: '#2563eb', hover: '#1d4ed8', border: '#3b82f6', text: '#ffffff', glow: 'rgba(37, 99, 235, 0.45)' },
    secondary: { bg: '#475569', hover: '#334155', border: '#64748b', text: '#ffffff', glow: 'rgba(71, 85, 105, 0.45)' },
    danger:    { bg: '#dc2626', hover: '#b91c1c', border: '#ef4444', text: '#ffffff', glow: 'rgba(220, 38, 38, 0.55)' },
    success:   { bg: '#16a34a', hover: '#15803d', border: '#22c55e', text: '#ffffff', glow: 'rgba(22, 163, 74, 0.45)' },
    warning:   { bg: '#d97706', hover: '#b45309', border: '#f59e0b', text: '#ffffff', glow: 'rgba(217, 119, 6, 0.50)' },
    neutral:   { bg: '#1e293b', hover: '#0f172a', border: '#334155', text: '#f8fafc', glow: 'rgba(30, 41, 59, 0.40)' }
  };

  const SCALES = {
    sm: { padBtn: '6px 12px', padCard: '14px', font: '13px', rad: '8px' },
    md: { padBtn: '10px 18px', padCard: '20px', font: '15px', rad: '12px' },
    lg: { padBtn: '14px 24px', padCard: '28px', font: '18px', rad: '16px' }
  };

  function generateCoreCSS() {
    return `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
.sm { font-size: ${SCALES.sm.font}; border-radius: ${SCALES.sm.rad}; }
.md { font-size: ${SCALES.md.font}; border-radius: ${SCALES.md.rad}; }
.lg { font-size: ${SCALES.lg.font}; border-radius: ${SCALES.lg.rad}; }
.motion { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
button.motion:active, [role="button"].motion:active { transform: scale(0.96); }
.glow { box-shadow: 0 0 16px var(--dolphin-glow); }
.glow.motion:hover { box-shadow: 0 0 24px var(--dolphin-glow); }
.glass { background: rgba(15, 23, 42, 0.75) !important; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.12) !important; }
.nested { margin-left: 12px; border-left: 2px solid rgba(255, 255, 255, 0.15); padding-left: 14px; }
${Object.entries(PALETTE).map(([name, col]) => `
:root { --dolphin-${name}: ${col.bg}; --dolphin-${name}-glow: ${col.glow}; }
.${name} { --dolphin-bg: ${col.bg}; --dolphin-hover: ${col.hover}; --dolphin-border: ${col.border}; --dolphin-text: ${col.text}; --dolphin-glow: ${col.glow}; }
button.filled.${name}, [role="button"].filled.${name} { background: ${col.bg}; color: ${col.text}; border: 1px solid ${col.border}; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
button.filled.${name}:hover, [role="button"].filled.${name}:hover { background: ${col.hover}; }
card.filled.${name}, div.card.filled.${name} { background: #0f172a; border: 1px solid ${col.border}; color: #f8fafc; display: block; }
input.filled.${name} { background: #1e293b; border: 1px solid #334155; color: #fff; outline: none; }
input.filled.${name}:focus { border-color: ${col.border}; box-shadow: 0 0 0 3px ${col.glow}; }
button.outline.${name} { background: transparent; color: ${col.border}; border: 1.5px solid ${col.border}; cursor: pointer; }
button.outline.${name}:hover { background: ${col.glow}; }
card.outline.${name}, div.card.outline.${name} { background: transparent; border: 1.5px solid ${col.border}; color: #f8fafc; }
.gradient.${name} { background: linear-gradient(135deg, ${col.bg}, ${col.hover}) !important; }
`).join('\n')}
button.sm, input.sm { padding: ${SCALES.sm.padBtn}; }
button.md, input.md { padding: ${SCALES.md.padBtn}; }
button.lg, input.lg { padding: ${SCALES.lg.padBtn}; }
card.sm, div.card.sm { padding: ${SCALES.sm.padCard}; }
card.md, div.card.md { padding: ${SCALES.md.padCard}; }
card.lg, div.card.lg { padding: ${SCALES.lg.padCard}; }
`;
  }

  function injectDolphinCSS() {
    if (typeof document === 'undefined' || document.getElementById('dolphincss-core')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'dolphincss-core';
    styleEl.textContent = generateCoreCSS();
    document.head.appendChild(styleEl);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectDolphinCSS);
    else injectDolphinCSS();
  }

  // 2. DanpheStore
  class DanpheStore {
    constructor(initialData = {}) {
      this._data = new Map();
      this._subscribers = new Map();
      this._slotSchema = new Map();
      this._slotReverseMap = new Map();
      if (initialData && typeof initialData === 'object') {
        for (const [k, v] of Object.entries(initialData)) this.set(k, v);
      }
    }
    reg(namespace, fields = []) {
      if (typeof namespace === 'string' && namespace.includes('::') && fields.length === 0) {
        const parts = namespace.split('::');
        namespace = parts[0].trim();
        fields = parts[1].split(',').map(s => s.trim()).filter(Boolean);
      }
      this._slotSchema.set(namespace, fields);
      fields.forEach((field, idx) => {
        const slotIndex = idx + 1;
        const key = `${namespace}::${field}`;
        this._slotReverseMap.set(`${namespace}:${slotIndex}`, key);
        if (!this._data.has(key)) this._data.set(key, '');
      });
      return this.createNamespaceProxy(namespace);
    }
    createNamespaceProxy(namespace) {
      const store = this;
      return new Proxy({}, {
        get(target, prop) {
          if (prop === '__isDanpheProxy') return true;
          if (prop === '$raw') return store.getNamespaceData(namespace);
          return store.get(`${namespace}::${String(prop)}`);
        },
        set(target, prop, value) {
          store.set(`${namespace}::${String(prop)}`, value);
          return true;
        }
      });
    }
    get(key, defaultValue = '') {
      return this._data.has(key) ? this._data.get(key) : defaultValue;
    }
    set(key, value) {
      const oldValue = this._data.get(key);
      if (oldValue === value) return;
      this._data.set(key, value);
      const subs = this._subscribers.get(key);
      if (subs) subs.forEach(fn => { try { fn(value, oldValue, key); } catch(e) {} });
      const wildcards = this._subscribers.get('*');
      if (wildcards) wildcards.forEach(fn => { try { fn(key, value, oldValue); } catch(e) {} });
    }
    getNamespaceData(namespace) {
      const prefix = `${namespace}::`;
      const result = {};
      for (const [k, v] of this._data.entries()) {
        if (k.startsWith(prefix)) result[k.slice(prefix.length)] = v;
      }
      return result;
    }
    subscribe(key, callback) {
      if (!this._subscribers.has(key)) this._subscribers.set(key, new Set());
      this._subscribers.get(key).add(callback);
      return () => { const s = this._subscribers.get(key); if (s) s.delete(callback); };
    }
    bindInput(element, key) {
      if (!element) return null;
      const currentVal = this.get(key, '');
      if (element.type === 'checkbox') element.checked = Boolean(currentVal);
      else element.value = currentVal;
      const onInput = () => {
        const val = element.type === 'checkbox' ? element.checked : element.value;
        this.set(key, val);
      };
      element.addEventListener('input', onInput);
      element.addEventListener('change', onInput);
      const unsub = this.subscribe(key, (newVal) => {
        if (element.type === 'checkbox') {
          if (element.checked !== Boolean(newVal)) element.checked = Boolean(newVal);
        } else {
          if (element.value !== String(newVal ?? '')) element.value = String(newVal ?? '');
        }
      });
      return () => {
        element.removeEventListener('input', onInput);
        element.removeEventListener('change', onInput);
        unsub();
      };
    }
    bindSlotElement(element, slotIndex, namespace = 'main') {
      const slotKey = `${namespace}:${slotIndex}`;
      const mappedKey = this._slotReverseMap.get(slotKey) || `${namespace}::slot_${slotIndex}`;
      const initVal = this.get(mappedKey, '');
      if (initVal !== '') element.textContent = String(initVal);
      return this.subscribe(mappedKey, (newVal) => {
        element.textContent = String(newVal ?? '');
      });
    }
  }

  const defaultStore = new DanpheStore();
  function reg(namespace, fields = []) { return defaultStore.reg(namespace, fields); }

  // 3. JSX Runtime
  function h(tag, props, ...children) {
    props = props || {};
    const flatChildren = [];
    for (const child of children) {
      if (Array.isArray(child)) flatChildren.push(...child.flat(Infinity));
      else if (child !== null && child !== undefined && child !== false) flatChildren.push(child);
    }
    if (typeof tag === 'function') return tag({ ...props, children: flatChildren });
    return { __isDanpheVNode: true, tag: typeof tag === 'string' ? tag.toLowerCase() : tag, props, children: flatChildren };
  }

  function createElement(vnode, store = defaultStore) {
    if (vnode === null || vnode === undefined || vnode === false) return document.createTextNode('');
    if (typeof vnode === 'string' || typeof vnode === 'number') return document.createTextNode(String(vnode));
    if (typeof vnode === 'function') {
      const textNode = document.createTextNode('');
      const update = () => { textNode.textContent = String(vnode() ?? ''); };
      update();
      store.subscribe('*', update);
      return textNode;
    }
    if (typeof vnode.tag === 'function') return createElement(vnode.tag({ ...vnode.props, children: vnode.children }), store);

    const el = document.createElement(vnode.tag || 'div');
    if (vnode.props) {
      for (const [key, val] of Object.entries(vnode.props)) {
        if (key === 'children') continue;
        if (key.startsWith('on') && typeof val === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), val);
          continue;
        }
        if (key === 'bind' || key === 'rx') {
          store.bindInput(el, val);
          continue;
        }
        if (key === 'slot') {
          el.setAttribute('data-danphe-slot', String(val));
          store.bindSlotElement(el, val, vnode.props.namespace);
        }
        if (key === 'class' || key === 'className') {
          el.className = typeof val === 'function' ? val() : String(val);
          continue;
        }
        if (key === 'style') {
          if (typeof val === 'object' && val !== null) Object.assign(el.style, val);
          else el.setAttribute('style', String(val));
          continue;
        }
        if (typeof val === 'boolean') {
          if (val) el.setAttribute(key, '');
          else el.removeAttribute(key);
        } else if (val !== null && val !== undefined) {
          el.setAttribute(key, String(val));
        }
      }
    }
    if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) el.appendChild(createElement(child, store));
    }
    return el;
  }

  function render(vnode, container, store = defaultStore) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container) return null;
    container.innerHTML = '';
    const dom = createElement(vnode, store);
    container.appendChild(dom);
    return dom;
  }

  // 4. Client Router
  class DanpheRouter {
    constructor() {
      this.routes = new Map();
      this.currentPath = this._getPath();
      this.params = {};
      this.listeners = new Set();
      if (typeof window !== 'undefined') {
        window.addEventListener('hashchange', () => this.navigate(this._getPath(), false));
      }
    }
    _getPath() {
      if (typeof window === 'undefined') return '/';
      const hash = window.location.hash.slice(1);
      return hash.startsWith('/') ? hash : '/' + hash;
    }
    add(path, comp) { this.routes.set(path, comp); return this; }
    navigate(toPath, updateHash = true) {
      if (!toPath.startsWith('/')) toPath = '/' + toPath;
      if (this.currentPath === toPath) return;
      this.currentPath = toPath;
      if (typeof window !== 'undefined' && updateHash) window.location.hash = toPath;
      this.listeners.forEach(fn => fn(this.currentPath));
    }
    subscribe(cb) { this.listeners.add(cb); return () => this.listeners.delete(cb); }
    getActiveComponent() {
      return this.routes.get(this.currentPath) || this.routes.get('*') || (() => h('div', { class: 'filled danger md' }, '404 - Not Found'));
    }
  }

  const defaultRouter = new DanpheRouter();

  const DanpheWeb = {
    h,
    render,
    createElement,
    reg,
    store: defaultStore,
    router: defaultRouter,
    navigate: (p) => defaultRouter.navigate(p),
    injectDolphinCSS
  };

  global.DanpheWeb = DanpheWeb;
  global.h = h;
  global.reg = reg;

})(typeof window !== 'undefined' ? window : globalThis);
