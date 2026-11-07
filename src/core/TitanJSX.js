'use strict';

/**
 * 🏔️ TITAN JSX (v2.0.0-micro) — Zero-React, Hardware-Grade Serial Reactive Micro-Kernel
 * Part of titan-bus-client
 * 
 * • 0% React / 0% Virtual-DOM overhead / 0% Bloat
 * • 100% 16-Bit Register Driven (0x0000 - 0xFFFF)
 * • Direct Pointer DOM Updates (O(1) updates when registers change)
 * • Serially fed by Dolphin-CPP over Titan Bus (0x5442 / 0x5349)
 */

// ── Modular Companions (CAD Instruments, Patro, UB CSS) ──────────────────────
var _localWidgets = (typeof globalThis !== 'undefined' && globalThis.TitanWidgets) || (typeof window !== 'undefined' && window.TitanWidgets) || {};
var _localPatro = (typeof globalThis !== 'undefined' && globalThis.TitanPatro) || (typeof window !== 'undefined' && window.TitanPatro) || {};
var _localCSS = (typeof globalThis !== 'undefined' && globalThis.TitanCSS) || (typeof window !== 'undefined' && window.TitanCSS) || {};

if (typeof require !== 'undefined') {
  try { _localWidgets = require('./TitanWidgets'); } catch(e) {}
  try { _localPatro = require('./TitanPatro'); } catch(e) {}
  try { _localCSS = require('./TitanCSS'); } catch(e) {}
}

// ── Hyperscript Factory (h) ──────────────────────────────────────────────────
function h(tag, props, ...children) {
  props = props || {};
  const flatChildren = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      flatChildren.push(...child.flat(Infinity));
    } else if (child !== null && child !== undefined && child !== false) {
      flatChildren.push(child);
    }
  }
  if (typeof tag === 'function') {
    return tag({ ...props, children: flatChildren });
  }
  return {
    __isTitanVNode: true,
    tag,
    props,
    children: flatChildren
  };
}

// ── Tagged Template Compiler (html`<div>...</div>`) ──────────────────────────
function html(strings, ...values) {
  let raw = '';
  const valMap = new Map();
  strings.forEach((str, i) => {
    raw += str;
    if (i < values.length) {
      const token = `__TITAN_VAL_${i}__`;
      valMap.set(token, values[i]);
      raw += token;
    }
  });

  const template = document.createElement('template');
  template.innerHTML = raw.trim();
  return _domToVNode(template.content.firstChild, valMap);
}

function _domToVNode(node, valMap) {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    let text = node.textContent;
    for (const [token, val] of valMap.entries()) {
      if (text.includes(token)) return val;
    }
    return text;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toLowerCase();
  const props = {};
  for (const attr of Array.from(node.attributes)) {
    let val = attr.value;
    for (const [token, actualVal] of valMap.entries()) {
      if (val === token) { val = actualVal; break; }
    }
    props[attr.name] = val;
  }

  const children = [];
  for (const child of Array.from(node.childNodes)) {
    const vchild = _domToVNode(child, valMap);
    if (vchild !== null && vchild !== undefined) children.push(vchild);
  }

  return h(tag, props, ...children);
}

function _getEngineValue(engine, addr, defaultVal = 0) {
  if (!engine) return defaultVal;
  const key = String(addr);
  if (engine.state && typeof engine.state.get === 'function') {
    const v = engine.state.get(key);
    if (v !== undefined && v !== null) return v;
  }
  if (typeof engine.serialRead === 'function') {
    const v = engine.serialRead(addr, defaultVal);
    if (v !== undefined && v !== null) return v;
  }
  if (engine.bus && typeof engine.bus.read === 'function') {
    const v = engine.bus.read(addr, defaultVal);
    if (v !== undefined && v !== null) return v;
  }
  return defaultVal;
}

// ── Real DOM Renderer & Direct Register Wirer ────────────────────────────────
function cleanupNode(node) {
  if (!node) return;
  if (Array.isArray(node.__titan_cleanups)) {
    for (const fn of node.__titan_cleanups) {
      try { fn(); } catch(e) {}
    }
    node.__titan_cleanups = null;
  }
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      cleanupNode(node.childNodes[i]);
    }
  }
}

function unmount(container) {
  if (typeof container === 'string') {
    container = (typeof document !== 'undefined') ? document.querySelector(container) : null;
  }
  if (!container) return;
  cleanupNode(container);
  container.innerHTML = '';
}

function render(vnode, container, engine) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) throw new Error('TitanJSX: Target container not found');

  unmount(container);
  const dom = mount(vnode, engine);
  if (dom) container.appendChild(dom);
  return dom;
}

function mount(vnode, engine) {
  if (engine && typeof engine.read !== 'function') {
    engine.read = (addr) => _getEngineValue(engine, addr);
  }
  if (vnode === null || vnode === undefined || vnode === false) return null;

  // Text or primitive node
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    return document.createTextNode(String(vnode));
  }

  // Functional Component
  if (typeof vnode.tag === 'function') {
    const rendered = vnode.tag({ ...vnode.props, children: vnode.children }, engine);
    if (rendered instanceof Node) return rendered;
    return mount(rendered, engine);
  }

  // Raw DOM Element
  if (vnode instanceof Node) return vnode;

  const SVG_TAGS = new Set([
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'g', 'text', 'tspan', 'mask', 'defs', 'clippath', 'lineargradient',
    'radialgradient', 'stop', 'image', 'use', 'pattern'
  ]);

  const { tag, props, children } = vnode;

  // Built-in Native Tag Sugars (Delegated to TitanWidgets if available)
  const tw = (typeof window !== 'undefined' && window.TitanWidgets) || (typeof globalThis !== 'undefined' && globalThis.TitanWidgets) || _localWidgets || {};
  if (tag === 'icon' && tw.TitanIcon) return mount(tw.TitanIcon(props), engine);
  if (tag === 'draw' && tw.TitanDraw) return mount(tw.TitanDraw({ ...props, children }), engine);
  if (tag === 'layer') return mount(h('g', { className: `ub-layer ${props.className || props.class || ''}`.trim(), ...props }, children), engine);
  if (tag === 'indicator' && tw.TitanIndicator) return tw.TitanIndicator(props, engine);
  if (tag === 'andon' && tw.TitanAndon) return tw.TitanAndon(props, engine);
  if (tag === 'gauge' && tw.TitanGauge) return tw.TitanGauge(props, engine);
  if (tag === 'knob' && tw.TitanKnob) return tw.TitanKnob(props, engine);
  if (tag === 'seg7' && tw.Titan7Seg) return tw.Titan7Seg(props, engine);
  if (tag === 'nepalflag' && tw.TitanNepalFlag) return tw.TitanNepalFlag(props);
  if (tag === 'stat' && tw.UB && tw.UB.stat) return mount(tw.UB.stat(props), engine);
  if (tag === 'card' && tw.TitanCard) return mount(tw.TitanCard({ ...props, children }), engine);

  // 🧭 Titan Sovereign Route Commutator (<route url="..." rx={...} tx={...}>)
  if (tag === 'route' || tag === 'Route') {
    let _TitanRegs = (typeof globalThis !== 'undefined' && globalThis.TitanRegisters) || (typeof window !== 'undefined' && window.TitanRegisters) || null;
    if (!_TitanRegs && typeof require !== 'undefined') {
      try { _TitanRegs = require('../registers/TitanRegisters'); } catch(e) {
        try { _TitanRegs = require('titan-bus-client').TitanRegisters; } catch(e2) {}
      }
    }

    const routeUrl = String(props.url || props.path || '').trim();
    const isExternal = routeUrl.startsWith('http://') || routeUrl.startsWith('https://') || routeUrl.startsWith('/api/');

    const rxRes = _TitanRegs && _TitanRegs.resolveRegisterAndSlot ? _TitanRegs.resolveRegisterAndSlot(props.rx) : null;
    const targetRx = rxRes && rxRes.reg !== undefined ? rxRes.reg : (props.rx !== undefined ? Number(props.rx) : 10);
    const targetSlot = rxRes ? rxRes.slot : (props.slot ? Number(props.slot) : 0);

    const txRes = _TitanRegs && _TitanRegs.resolveRegisterAndSlot ? _TitanRegs.resolveRegisterAndSlot(props.tx) : null;
    const targetTx = txRes && txRes.reg !== undefined ? txRes.reg : (props.tx !== undefined ? Number(props.tx) : 10);

    if (isExternal) {
      // ⚡ Commutator Outbound HTTP Route
      const executeFetch = () => {
        if (typeof window !== 'undefined' && window.TitanCommutator && typeof window.TitanCommutator.fetchNative === 'function') {
          window.TitanCommutator.fetchNative(routeUrl, targetRx, targetSlot);
        } else if (typeof fetch === 'function') {
          const fetchMethod = (props.method || 'GET').toUpperCase();
          const fetchOptions = { method: fetchMethod, headers: {} };
          if (props.headers && typeof props.headers === 'object') Object.assign(fetchOptions.headers, props.headers);
          if (props.body && fetchMethod !== 'GET') {
            fetchOptions.body = typeof props.body === 'object' ? JSON.stringify(props.body) : String(props.body);
          }
          fetch(routeUrl, fetchOptions)
            .then(res => res.text())
            .then(data => {
              if (engine) {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch(e) {}
                if (parsed && typeof parsed === 'object') {
                  if (typeof engine.writeText === 'function') engine.writeText(targetRx, data, targetSlot);
                  else if (typeof engine.write === 'function') engine.write(targetRx, data, targetSlot);

                  for (const [k, v] of Object.entries(parsed)) {
                    let fieldSlot = 0;
                    if (_TitanRegs && _TitanRegs.resolveSlot) {
                      fieldSlot = _TitanRegs.resolveSlot(k);
                    }
                    if (!fieldSlot && _TitanRegs && _TitanRegs.resolveRegisterAndSlot) {
                      const res = _TitanRegs.resolveRegisterAndSlot(k);
                      if (res && res.slot) fieldSlot = res.slot;
                    }
                    if (fieldSlot > 0) {
                      const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                      if (typeof engine.writeText === 'function') engine.writeText(targetRx, valStr, fieldSlot);
                      else if (typeof engine.write === 'function') engine.write(targetRx, valStr, fieldSlot);
                    }
                  }
                  return;
                }

                if (typeof engine.writeText === 'function') engine.writeText(targetRx, data, targetSlot);
                else if (typeof engine.write === 'function') engine.write(targetRx, data, targetSlot);
                else if (typeof engine.tx === 'function') engine.tx(targetRx, data, targetSlot);
              }
            })
            .catch(err => {
              console.warn('[TitanRoute] Fetch error:', err && err.message ? err.message : err);
            });
        }
      };

      if (props.immediate !== false && props.lazy !== true) {
        setTimeout(executeFetch, 10);
      }

      let pollTimer = null;
      if (props.interval && Number(props.interval) > 0) {
        pollTimer = setInterval(executeFetch, Number(props.interval));
      }

      if (engine && typeof engine.on === 'function' && props.tx !== undefined) {
        engine.on(targetTx, () => executeFetch());
      }

      if (children && children.length > 0) {
        const wrap = document.createElement('div');
        wrap.setAttribute('data-external-route', routeUrl);
        wrap.setAttribute('data-rx', String(targetRx));
        if (targetSlot) wrap.setAttribute('data-slot', String(targetSlot));
        for (const c of children) {
          const d = mount(c, engine);
          if (d) wrap.appendChild(d);
        }
        if (pollTimer) {
          wrap.__titan_cleanups = wrap.__titan_cleanups || [];
          wrap.__titan_cleanups.push(() => clearInterval(pollTimer));
        }
        return wrap;
      }

      const commentNode = document.createComment(`[TitanRoute: ${routeUrl} -> rx:${targetRx}]`);
      if (pollTimer) {
        commentNode.__titan_cleanups = [() => clearInterval(pollTimer)];
      }
      return commentNode;
    }

    // 📱 Local Viewport Route (Screen Switcher)
    const routeDiv = document.createElement('div');
    routeDiv.setAttribute('data-route-url', routeUrl);
    routeDiv.setAttribute('data-rx', String(targetRx));
    routeDiv.setAttribute('data-tx', String(targetTx));
    if (targetSlot) routeDiv.setAttribute('data-slot', String(targetSlot));
    if (props.className || props.class) routeDiv.className = props.className || props.class;

    const initialRouteVal = _getEngineValue(engine, targetRx, '0');
    const isMatch = (String(initialRouteVal) === routeUrl) || 
                    (String(initialRouteVal).toLowerCase() === routeUrl.toLowerCase());
    routeDiv.style.display = isMatch ? 'block' : 'none';

    if (children && children.length > 0) {
      for (const c of children) {
        const d = mount(c, engine);
        if (d) routeDiv.appendChild(d);
      }
    }

    if (engine && typeof engine.on === 'function') {
      const unsub = engine.on(targetRx, (newRouteVal) => {
        const match = (String(newRouteVal) === routeUrl) || 
                      (String(newRouteVal).toLowerCase() === routeUrl.toLowerCase());
        routeDiv.style.display = match ? 'block' : 'none';
        if (match && typeof window !== 'undefined' && window.history && window.location) {
          const cleanUrl = '/' + routeUrl.replace(/^\/+/, '');
          if (window.location.pathname !== cleanUrl) {
            try { window.history.pushState(null, '', cleanUrl); } catch(e) {}
          }
        }
      });
      routeDiv.__titan_cleanups = routeDiv.__titan_cleanups || [];
      routeDiv.__titan_cleanups.push(unsub);
    }

    return routeDiv;
  }

  const isSvg = typeof tag === 'string' && SVG_TAGS.has(tag.toLowerCase());
  const el = isSvg 
    ? document.createElementNS('http://www.w3.org/2000/svg', tag) 
    : document.createElement(tag);

  // Apply Props & Event Handlers
  for (const [key, val] of Object.entries(props)) {
    if (key === 'className' || key === 'class') {
      if (isSvg) el.setAttribute('class', val);
      else el.className = val;
      if (typeof window !== 'undefined' && window.DolphinUB && window.DolphinUB.scan) {
        window.DolphinUB.scan(val);
      }
    } else if (key === 'dangerouslySetInnerHTML' && val && val.__html) {
      el.innerHTML = val.__html;
    } else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val);
    } else if (key === 'ref' && typeof val === 'function') {
      val(el);
    } else if (key === 'ref' && typeof val === 'object' && val !== null) {
      val.current = el;
    } else if (!['rx', 'tx', 'txValue', 'at', 'size', 'rounded', 'from', 'to', 'turtle', 'children', 'canvas'].includes(key)) {
      let attr = key;
      if (key === 'strokeWidth') attr = 'stroke-width';
      else if (key === 'strokeLinecap') attr = 'stroke-linecap';
      else if (key === 'strokeLinejoin') attr = 'stroke-linejoin';
      else if (key === 'fillRule') attr = 'fill-rule';
      else if (key === 'clipRule') attr = 'clip-rule';
      el.setAttribute(attr, String(val));
    }
  }

  // ── ⚡ 16-Bit Register Direct Pointer Wiring (rx / tx) ─────────────────────
  let _TitanRegs = (typeof globalThis !== 'undefined' && globalThis.TitanRegisters) || (typeof window !== 'undefined' && window.TitanRegisters) || null;
  if (!_TitanRegs && typeof require !== 'undefined') {
    try { _TitanRegs = require('../registers/TitanRegisters'); } catch(e) {
      try { _TitanRegs = require('titan-bus-client').TitanRegisters; } catch(e2) {}
    }
  }

  const rxRes = _TitanRegs && _TitanRegs.resolveRegisterAndSlot ? _TitanRegs.resolveRegisterAndSlot(props.rx || props['data-rx']) : null;
  let rxAddr = rxRes && rxRes.reg ? rxRes.reg : (props.rx !== undefined ? Number(props.rx) : (props['data-rx'] !== undefined ? Number(props['data-rx']) : null));
  let rxSlot = rxRes ? rxRes.slot : (props.slot !== undefined ? Number(props.slot) : (props['data-slot'] !== undefined ? Number(props['data-slot']) : 0));

  const txRes = _TitanRegs && _TitanRegs.resolveRegisterAndSlot ? _TitanRegs.resolveRegisterAndSlot(props.tx || props['data-tx']) : null;
  let txAddr = txRes && txRes.reg ? txRes.reg : (props.tx !== undefined ? props.tx : (props['data-tx'] !== undefined ? props['data-tx'] : null));
  let txSlot = txRes ? txRes.slot : (props.slot !== undefined ? Number(props.slot) : (props['data-slot'] !== undefined ? Number(props['data-slot']) : 0));

  const actionProp = props.action || props['data-action'];

  // Auto-normalize legacy action="bus:0x3010" or "bus:512" directly into 16-bit register tx!
  if ((txAddr === null || txAddr === undefined) && typeof actionProp === 'string' && actionProp.startsWith('bus:')) {
    const raw = actionProp.replace('bus:', '');
    if (/^(0x[0-9a-fA-F]+|\d+)$/.test(raw)) {
      txAddr = raw.startsWith('0x') || raw.startsWith('0X') ? parseInt(raw, 16) : parseInt(raw, 10);
    }
  }

  const finalSlot = txSlot || rxSlot;
  if (finalSlot) {
    el.setAttribute('data-slot', String(finalSlot));
  }

  if (engine) {
    if (rxAddr !== null && !isNaN(rxAddr)) {
      el.setAttribute('data-rx', String(rxAddr));
      const initVal = _getEngineValue(engine, rxAddr);

      if (el.tagName === 'INPUT' && (el.type === 'range' || el.type === 'number')) {
        el.value = initVal;
      } else if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'password' || !el.type)) {
        el.value = initVal !== undefined && initVal !== null && initVal !== 0 ? String(initVal) : '';
      } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        el.checked = Boolean(initVal);
      } else if (el.tagName === 'BUTTON') {
        const isActive = Boolean(initVal && initVal !== '0' && initVal !== 0);
        el.setAttribute('data-active', isActive ? 'true' : 'false');
        el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (el.getAttribute('data-active-text') && el.getAttribute('data-inactive-text')) {
          el.textContent = isActive ? el.getAttribute('data-active-text') : el.getAttribute('data-inactive-text');
        }
      } else if (el.tagName === 'IMG') {
        if (initVal) el.src = String(initVal);
      } else {
        el.textContent = String(initVal);
      }

      if (typeof engine.on === 'function') {
        const unsub = engine.on(rxAddr, (newVal, slot) => {
          if (rxSlot && slot && slot !== rxSlot) return; // Isolated reactive slot filter
          if (el.tagName === 'INPUT' && (el.type === 'range' || el.type === 'number')) {
            if (el.value !== String(newVal)) el.value = newVal;
          } else if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'password' || !el.type)) {
            if (el.value !== String(newVal)) el.value = newVal;
          } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
            el.checked = Boolean(newVal);
          } else if (el.tagName === 'BUTTON') {
            const isActive = Boolean(newVal && newVal !== '0' && newVal !== 0);
            el.setAttribute('data-active', isActive ? 'true' : 'false');
            el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            if (el.getAttribute('data-active-text') && el.getAttribute('data-inactive-text')) {
              el.textContent = isActive ? el.getAttribute('data-active-text') : el.getAttribute('data-inactive-text');
            }
          } else if (el.tagName === 'IMG') {
            el.src = String(newVal);
          } else {
            el.textContent = String(newVal);
          }
        });
        if (typeof unsub === 'function') {
          el.__titan_cleanups = el.__titan_cleanups || [];
          el.__titan_cleanups.push(unsub);
        }
      }
    }

    // Declarative action click handler for buttons (e.g. action="bus:relay:1:on" or data-action="bus:write:4000:-5")
    if (actionProp && (txAddr === null || txAddr === undefined)) {
      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        el.addEventListener('click', () => {
          if (typeof engine.executeAction === 'function') {
            engine.executeAction(actionProp);
          }
        });
      }
    }

    if (txAddr !== null && txAddr !== undefined && !isNaN(Number(txAddr))) {
      const txNum = Number(txAddr);
      el.setAttribute('data-tx', String(txNum));

      if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
        el.addEventListener('click', () => {
          // If declarative action is provided, execute it first
          if (actionProp && typeof engine.executeAction === 'function' && typeof actionProp === 'string' && !/^(bus:)?(0x[0-9a-fA-F]+|\d+)$/.test(actionProp)) {
            const handled = engine.executeAction(actionProp);
            if (handled) return;
          }
          if (props.txValue !== undefined) {
            const txVal = props.txValue;
            if (typeof engine.tx === 'function') engine.tx(txNum, txVal);
            else if (typeof engine.write === 'function') engine.write(txNum, txVal);
          } else {
            // ⚡ PURE TITAN-BUS RULE: writeBit() 2-way hardware toggle (0 <-> 1)
            if (typeof engine.writeBit === 'function') {
              const curBit = typeof engine.readBit === 'function' ? engine.readBit(txNum) : (_getEngineValue(engine, txNum) ? 1 : 0);
              const nextBit = curBit === 0 ? 1 : 0;
              engine.writeBit(txNum, nextBit);
            } else {
              const curVal = _getEngineValue(engine, txNum);
              const txVal = (curVal === 0 || !curVal) ? 1 : 0;
              if (typeof engine.tx === 'function') engine.tx(txNum, txVal);
              else if (typeof engine.write === 'function') engine.write(txNum, txVal);
            }
          }
        });
      } else if (el.tagName === 'INPUT' && (el.type === 'range' || el.type === 'number')) {
        el.addEventListener('input', (e) => {
          const val = Number(e.target.value);
          // ⚡ PURE TITAN-BUS RULE: writeAnalog() auto-clamped (0 - 255)
          if (typeof engine.writeAnalog === 'function') {
            engine.writeAnalog(txNum, val, finalSlot);
          } else if (typeof engine.tx === 'function') {
            engine.tx(txNum, val, finalSlot);
          } else if (typeof engine.write === 'function') {
            engine.write(txNum, val, finalSlot);
          }
        });
      } else if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'email' || el.type === 'password' || !el.type)) {
        el.addEventListener('input', (e) => {
          const val = e.target.value;
          if (typeof engine.tx === 'function') {
            engine.tx(txNum, val, finalSlot);
          } else if (typeof engine.write === 'function') {
            engine.write(txNum, val, finalSlot);
          }
        });
      } else if (el.tagName === 'INPUT' && el.type === 'checkbox') {
        el.addEventListener('change', (e) => {
          const val = e.target.checked ? 1 : 0;
          if (typeof engine.tx === 'function') engine.tx(txNum, val, finalSlot);
          else if (typeof engine.write === 'function') engine.write(txNum, val, finalSlot);
        });
      }
    }
  }

  // Mount Children
  if (Array.isArray(children)) {
    for (const child of children) {
      const childDom = mount(child, engine);
      if (childDom) el.appendChild(childDom);
    }
  }

  return el;
}

// ── Deterministic Recursive-Descent Lexer & Parser for Dolphin JSX ──────────
const HARDWARE_TAGS = {
  'icon': 'TitanIcon',
  'draw': 'TitanDraw',
  'layer': '"g"',
  'turtle': 'TitanPath',
  'indicator': 'TitanIndicator',
  'andon': 'TitanAndon',
  'gauge': 'TitanGauge',
  'knob': 'TitanKnob',
  'seg7': 'Titan7Seg',
  'nepalflag': 'TitanNepalFlag',
  'webonly': 'WebOnly',
  'mobileonly': 'MobileOnly',
  'stat': 'UB.stat'
};

function transpileJSX(code, isTopLevel = true) {
  code = code.replace(/\bcomponent\s+([A-Za-z0-9_$]+)/g, 'function $1');

  // 🏛️ Dynamic Register DSL: reg form:: name, email, password;
  code = code.replace(/(?:^|\n)\s*(?:reg|register)\s+([A-Za-z0-9_$]+)::\s*([^;\n]+);?/g, (m, group, fields) => {
    return `\nconst ${group} = (typeof TitanRegisters !== 'undefined' ? TitanRegisters : (typeof reg !== 'undefined' ? { reg } : require('../registers/TitanRegisters'))).reg('${group}:: ${fields.trim()}');\n`;
  });
  let pos = 0;
  const len = code.length;

  function peek(offset = 0) {
    return pos + offset < len ? code[pos + offset] : '';
  }

  function parseAttributes() {
    let propsObj = [];
    while (pos < len) {
      skipWhitespaceAndComments();
      if (peek() === '>' || (peek() === '/' && peek(1) === '>')) break;

      if (peek() === '{' && peek(1) === '.' && peek(2) === '.' && peek(3) === '.') {
        pos += 4;
        let spreadExpr = '';
        let depth = 1;
        while (pos < len && depth > 0) {
          if (peek() === '{') depth++;
          else if (peek() === '}') depth--;
          if (depth > 0) spreadExpr += peek();
          pos++;
        }
        propsObj.push(`...(${spreadExpr.trim()})`);
        continue;
      }

      let attrName = '';
      while (pos < len && /[a-zA-Z0-9_\-:@.]/.test(peek())) {
        attrName += peek();
        pos++;
      }
      if (!attrName) break;

      skipWhitespaceAndComments();
      if (peek() === '=') {
        pos++;
        skipWhitespaceAndComments();
        if (peek() === '{') {
          pos++;
          let expr = '';
          let depth = 1;
          while (pos < len && depth > 0) {
            if (peek() === '{') depth++;
            else if (peek() === '}') depth--;
            if (depth > 0) expr += peek();
            pos++;
          }
          propsObj.push(`"${attrName}": ${expr.trim()}`);
        } else if (peek() === '"' || peek() === "'") {
          const quote = peek();
          pos++;
          let val = '';
          while (pos < len && peek() !== quote) {
            if (peek() === '\\') { val += peek(); pos++; }
            val += peek();
            pos++;
          }
          pos++;
          propsObj.push(`"${attrName}": ${JSON.stringify(val)}`);
        } else {
          let val = '';
          while (pos < len && !/[\s/>]/.test(peek())) {
            val += peek();
            pos++;
          }
          propsObj.push(`"${attrName}": ${JSON.stringify(val)}`);
        }
      } else {
        propsObj.push(`"${attrName}": true`);
      }
    }
    return propsObj.length > 0 ? `{ ${propsObj.join(', ')} }` : 'null';
  }

  function parseTag() {
    pos++; // skip '<'
    skipWhitespaceAndComments();

    if (peek() === '>') {
      pos++;
      const children = parseChildren('');
      return `h(React.Fragment, null, ${children.join(', ')})`;
    }

    let tagName = '';
    while (pos < len && /[a-zA-Z0-9_.\-]/.test(peek())) {
      tagName += peek();
      pos++;
    }

    const propsStr = parseAttributes();
    skipWhitespaceAndComments();

    if (peek() === '/' && peek(1) === '>') {
      pos += 2;
      const tagIdentifier = HARDWARE_TAGS[tagName.toLowerCase()] || (/^[a-z]/.test(tagName) ? `"${tagName}"` : tagName);
      return `h(${tagIdentifier}, ${propsStr})`;
    }

    if (peek() === '>') pos++;

    const children = parseChildren(tagName);
    const tagIdentifier = HARDWARE_TAGS[tagName.toLowerCase()] || (/^[a-z]/.test(tagName) ? `"${tagName}"` : tagName);
    const childrenStr = children.length > 0 ? `, ${children.join(', ')}` : '';
    return `h(${tagIdentifier}, ${propsStr}${childrenStr})`;
  }

  function parseChildren(parentTag) {
    const children = [];
    while (pos < len) {
      if (parentTag === 'loop' && peek() === '}') {
        pos++;
        break;
      }
      if (peek() === '<') {
        if (peek(1) === '/') {
          pos += 2;
          let closeTag = '';
          while (pos < len && /[a-zA-Z0-9_.\-]/.test(peek())) {
            closeTag += peek();
            pos++;
          }
          skipWhitespaceAndComments();
          if (peek() === '>') pos++;
          break;
        }
        children.push(parseTag());
      } else if (peek() === '{') {
        pos++;
        let expr = '';
        let depth = 1;
        while (pos < len && depth > 0) {
          if (peek() === '{') depth++;
          else if (peek() === '}') depth--;
          if (depth > 0) expr += peek();
          pos++;
        }
        const trimmed = expr.trim();
        if (/^\/\*[\s\S]*\*\/$/.test(trimmed)) {
          continue;
        }
        if (trimmed) children.push(`(${trimmed})`);
      } else if (code.slice(pos).startsWith('loop (')) {
        pos += 6;
        let loopHeader = '';
        while (pos < len && peek() !== ')') {
          loopHeader += peek();
          pos++;
        }
        if (peek() === ')') pos++;
        skipWhitespaceAndComments();
        if (peek() === '{') pos++;
        const loopChildren = parseChildren('loop');
        const match = loopHeader.match(/^\s*([A-Za-z0-9_$]+)\s+in\s+(.+)$/);
        if (match) {
          const itemVar = match[1];
          const listExpr = match[2];
          children.push(`...(${listExpr}).map((${itemVar}) => (${loopChildren.join(', ')}))`);
        }
      } else {
        let text = '';
        while (pos < len && peek() !== '<' && peek() !== '{' && !code.slice(pos).startsWith('loop (')) {
          if (parentTag === 'loop' && peek() === '}') break;
          text += peek();
          pos++;
        }
        const cleaned = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ');
        if (cleaned.trim()) {
          children.push(JSON.stringify(cleaned));
        }
      }
    }
    return children;
  }

  function skipWhitespaceAndComments() {
    while (pos < len) {
      if (/\s/.test(peek())) {
        pos++;
      } else if (peek() === '/' && peek(1) === '/') {
        while (pos < len && peek() !== '\n') pos++;
      } else if (peek() === '/' && peek(1) === '*') {
        pos += 2;
        while (pos < len && !(peek() === '*' && peek(1) === '/')) pos++;
        pos += 2;
      } else {
        break;
      }
    }
  }

  let out = '';
  while (pos < len) {
    if (peek() === '<' && /[a-zA-Z0-9_>]/i.test(peek(1)) && peek(1) !== '=') {
      const prevNonWhitespace = out.trim().slice(-1);
      const isStartOfJsx = !prevNonWhitespace || /[=({[;,:]/.test(prevNonWhitespace) || out.trim().endsWith('return');
      if (isStartOfJsx) {
        out += parseTag();
        continue;
      }
    }
    out += peek();
    pos++;
  }

  if (!isTopLevel) return out;

  // Dolphin-CPP Preamble
  const preamble = `
var _g = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : global);
var h = _g.h || (typeof TitanJSX !== 'undefined' && TitanJSX.h ? TitanJSX.h : (typeof require !== 'undefined' ? require('./TitanJSX').h : null));
var React = { createElement: h, Fragment: ({ children }) => children };
var _tw = _g.TitanWidgets || (typeof require !== 'undefined' ? (require('./TitanWidgets') || {}) : {});
var _tp = _g.TitanPatro || _g.Patro || (typeof require !== 'undefined' ? (require('./TitanPatro') || {}) : {});

var TitanCard = _tw.TitanCard || _g.TitanCard;
var TitanSlider = _tw.TitanSlider || _g.TitanSlider;
var TitanButton = _tw.TitanButton || _g.TitanButton;
var TitanRegister = _tw.TitanRegister || _g.TitanRegister;
var TitanIndicator = _tw.TitanIndicator || _g.TitanIndicator;
var TitanAndon = _tw.TitanAndon || _g.TitanAndon;
var TitanGauge = _tw.TitanGauge || _g.TitanGauge;
var TitanKnob = _tw.TitanKnob || _g.TitanKnob;
var Titan7Seg = _tw.Titan7Seg || _g.Titan7Seg;
var TitanNepalFlag = _tw.TitanNepalFlag || _g.TitanNepalFlag;
var TitanIcon = _tw.TitanIcon || _g.TitanIcon;
var TitanDraw = _tw.TitanDraw || _g.TitanDraw;
var TitanPath = _tw.TitanPath || _g.TitanPath;
var UB = _tw.UB || _g.UB;
var NATIVE_ICONS = _tw.NATIVE_ICONS || _g.NATIVE_ICONS;
var parseTurtlePath = _tw.parseTurtlePath || _g.parseTurtlePath;

var Patro = _tp.Patro || _tp || _g.Patro;
var aja = _tp.aja || _g.aja;
var aaja = _tp.aaja || _g.aaja;
var miti = _tp.miti || _g.miti;
var gate = _tp.gate || _g.gate;
var bar = _tp.bar || _g.bar;
var samaya = _tp.samaya || _g.samaya;
var mahina = _tp.mahina || _g.mahina;
var barsa = _tp.barsa || _g.barsa;
var nepali = _tp.nepali || _g.nepali;

var print = (...args) => console.log(...args);
var len = (v) => (v ? (v.length !== undefined ? v.length : Object.keys(v).length) : 0);
var type = (v) => (Array.isArray(v) ? 'array' : typeof v);
`;

  let lastImportIdx = -1;
  const importRegex = /(?:^|\n)\s*import\s+[^;]+;\s*(?=\n|$)/g;
  let match;
  while ((match = importRegex.exec(out)) !== null) {
    lastImportIdx = match.index + match[0].length;
  }

  if (lastImportIdx !== -1) {
    out = out.slice(0, lastImportIdx) + preamble + out.slice(lastImportIdx);
  } else {
    out = preamble + out;
  }

  return out;
}

// ── Load Modular Companions ──────────────────────────────────────────────────
var _localWidgets = (typeof globalThis !== 'undefined' && globalThis.TitanWidgets) || (typeof window !== 'undefined' && window.TitanWidgets) || {};
var _localPatro = (typeof globalThis !== 'undefined' && globalThis.TitanPatro) || (typeof window !== 'undefined' && window.TitanPatro) || {};
var _localCSS = (typeof globalThis !== 'undefined' && globalThis.TitanCSS) || (typeof window !== 'undefined' && window.TitanCSS) || {};

if (typeof require !== 'undefined') {
  try { _localWidgets = require('./TitanWidgets'); } catch(e) {}
  try { _localPatro = require('./TitanPatro'); } catch(e) {}
  try { _localCSS = require('./TitanCSS'); } catch(e) {}
}

const TitanJSX = {
  h,
  html,
  render,
  unmount,
  cleanupNode,
  mount,
  transpileJSX,
  _getEngineValue,
  TitanWidgets: _localWidgets,
  TitanPatro: _localPatro,
  TitanCSS: _localCSS,
  ..._localWidgets,
  ..._localPatro,
  ..._localCSS
};

// Expose on global window and globalThis if in browser
if (typeof globalThis !== 'undefined') {
  globalThis.TitanJSX = TitanJSX;
  globalThis.h = h;
  globalThis.html = html;
  globalThis.render = render;
  globalThis.unmount = unmount;
  globalThis.cleanupNode = cleanupNode;
  globalThis.mount = mount;
  globalThis.React = globalThis.React || { createElement: h, Fragment: ({ children }) => children };
  Object.assign(globalThis, _localWidgets, _localPatro, _localCSS);
}
if (typeof window !== 'undefined') {
  window.TitanJSX = TitanJSX;
  window.h = h;
  window.html = html;
  window.render = render;
  window.unmount = unmount;
  window.cleanupNode = cleanupNode;
  window.mount = mount;
  window.React = window.React || { createElement: h, Fragment: ({ children }) => children };
  Object.assign(window, _localWidgets, _localPatro, _localCSS);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanJSX;
}
