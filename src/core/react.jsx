'use strict';

/**
 * TitanReact v2.0.0 — Hookless-first React bindings for Titan Bus Client
 * Works with Vite, Next.js, Create React App, and plain React.
 *
 * <TitanCircuit circuit={circuit}> — Root provider + DOM directive scanner
 * <TitanRegister address={100}>{(val, ctx) => ...}</TitanRegister>
 * <TitanToaster address={90} position="top-right" />
 *
 * DOM Directives (no JSX props needed):
 *   data-tx="801"   → wire element to transmit to register 801 on its natural event
 *   data-rx="1001"  → wire element to receive and display register 1001
 */

const React = require('react');
const TitanCircuitEngine = require('./TitanCircuitEngine');
const { useRef, useEffect, useState, createContext, useContext, useCallback } = React;

const TitanContext = createContext(null);

function TitanCircuit({ circuit = {}, options = {}, children, className = '', style }) {
  const containerRef = useRef(null);
  const engineRef    = useRef(null);
  if (!engineRef.current) engineRef.current = new TitanCircuitEngine(circuit, options);

  useEffect(() => {
    const engine = engineRef.current;
    const container = containerRef.current;
    if (!engine || !container) return;
    engine.attachToDOM(container);
    _wireDOMDirectives(engine, container);
  }, []);

  return React.createElement(
    TitanContext.Provider,
    { value: engineRef.current },
    React.createElement('div', { ref: containerRef, className: `titan-circuit ${className}`.trim(), style }, children)
  );
}

function _wireDOMDirectives(engine, container) {
  container.querySelectorAll('[data-tx]').forEach(el => {
    const raw = el.dataset.tx;
    let targets;
    try { targets = JSON.parse(raw); } catch(e) { targets = Number(raw); }

    if (el.tagName === 'FORM') {
      el.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(el));
        el.querySelectorAll('input[type=checkbox]').forEach(cb => { data[cb.name] = cb.checked; });
        engine.tx(typeof targets === 'number' ? targets : targets, data, 'DOM_FORM');
      });
    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const ev = el.type === 'checkbox' ? 'change' : 'input';
      el.addEventListener(ev, () => engine.tx(targets, el.type === 'checkbox' ? el.checked : el.value, 'DOM_INPUT'));
    } else if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => engine.tx(targets, el.value, 'DOM_SELECT'));
    } else {
      el.addEventListener('click', () => engine.tx(targets, el.dataset.txValue !== undefined ? el.dataset.txValue : true, 'DOM_CLICK'));
    }
  });

  container.querySelectorAll('[data-rx]').forEach(el => {
    const addr = Number(el.dataset.rx);
    if (isNaN(addr)) return;
    engine.rx(addr, (val) => {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = val !== null && val !== undefined ? String(val) : '';
      } else {
        el.textContent = typeof val === 'object' ? JSON.stringify(val) : (val !== null && val !== undefined ? String(val) : '');
      }
    });
  });
}

function TitanRegister({ address, id, as = 'div', children, className = '', style, ...rest }) {
  const engine    = useContext(TitanContext);
  const targetKey = String(address !== undefined ? address : (id || ''));
  const [data, setData] = useState(() => (engine ? engine.state.get(targetKey) ?? null : null));

  useEffect(() => {
    if (!engine || !targetKey) return;
    const unsub = engine.rx(targetKey, (val) => setData(val));
    const initial = engine.state.get(targetKey);
    if (initial !== undefined && initial !== null) setData(initial);
    return unsub;
  }, [engine, targetKey]);

  const ctx = {
    value: data,
    tx: useCallback((t, p) => engine && engine.tx(t !== undefined ? t : targetKey, p, targetKey), [engine, targetKey]),
    rx: useCallback((t, cb) => engine && engine.rx(t, cb), [engine]),
    serialWrite: useCallback((a, p) => engine && engine.serialWrite(a, p), [engine]),
    serialRead: useCallback((a, d) => engine && engine.serialRead(a, d), [engine]),
    emit: useCallback((t, p) => engine && engine.tx(t !== undefined ? t : targetKey, p, targetKey), [engine, targetKey]),
  };

  const props = {
    id: id || (address !== undefined ? String(address) : undefined),
    className: className || undefined, style: style || undefined, ...rest
  };

  return React.createElement(as, props, typeof children === 'function' ? children(data, ctx) : children);
}

function TitanToaster({ position = 'top-right', address = 90, duration = 4000 }) {
  const engine = useContext(TitanContext);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const add = (payload) => {
      const id = `${Date.now()}-${Math.random()}`;
      const t  = typeof payload === 'string' ? { id, body: payload, type: 'info' }
                                              : { id, type: 'info', ...payload };
      setToasts(prev => [...prev.slice(-4), t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), duration);
    };
    if (engine) return engine.rx(String(address), add);
    if (typeof window !== 'undefined') {
      const h = (e) => add(e.detail);
      window.addEventListener('titan-toast', h);
      return () => window.removeEventListener('titan-toast', h);
    }
  }, [engine, address, duration]);

  const pos = {
    'top-right':'top-4 right-4','top-left':'top-4 left-4',
    'bottom-right':'bottom-4 right-4','bottom-left':'bottom-4 left-4'
  }[position] || 'top-4 right-4';

  const typeStyle = { info:'#0ea5e9', success:'#10b981', error:'#ef4444', warn:'#f59e0b' };

  if (!toasts.length) return null;
  return React.createElement('div', {
    style: { position:'fixed', [position.includes('top')?'top':'bottom']:'1rem',
             [position.includes('right')?'right':'left']:'1rem',
             zIndex:9999, display:'flex', flexDirection:'column', gap:'0.5rem', pointerEvents:'none' }
  }, toasts.map(t => React.createElement('div', {
    key: t.id,
    style: { background:'#0f172a', border:`1px solid ${typeStyle[t.type]||typeStyle.info}`,
             color:'#e2e8f0', padding:'0.75rem 1.25rem', borderRadius:'0.75rem',
             boxShadow:'0 25px 50px rgba(0,0,0,0.5)', pointerEvents:'auto', minWidth:'200px' }
  }, [
    t.title && React.createElement('div', { key:'title', style:{fontWeight:'bold',color:typeStyle[t.type],fontSize:'0.875rem',marginBottom:'0.25rem'} }, t.title),
    React.createElement('div', { key:'body', style:{fontSize:'0.8rem'} }, t.body || String(t))
  ])));
}

function useTitan() {
  const engine = useContext(TitanContext);
  if (!engine) console.warn('[useTitan] Must be inside <TitanCircuit>');
  return engine;
}

const TitanNode = TitanRegister;
module.exports = { TitanCircuit, TitanRegister, TitanNode, TitanToaster, useTitan, useTitanContext: useTitan };
