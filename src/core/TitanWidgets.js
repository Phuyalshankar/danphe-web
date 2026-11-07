'use strict';

/**
 * 🎛️ Titan CAD & Hardware Components
 * Pure Vector CAD Instruments for DanpheOS & Titan Bus
 */

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

// ── Industrial Panel Pilot Light (ON / OFF / BLINK) ──────────────────────────
function TitanIndicator(props = {}, engine) {
  const { color = 'green', label = 'RUN', size = 64, rx, tx, blink = false, className = '' } = props;
  const rxAddr = rx !== undefined ? Number(rx) : null;
  const initialOn = props.on !== undefined ? Boolean(props.on) : (rxAddr !== null ? Boolean(_getEngineValue(engine, rxAddr, false)) : false);

  if (typeof document === 'undefined') {
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        width: size,
        height: size,
        action: tx !== undefined ? `bus:${tx}` : (rxAddr !== null ? `bus:${rxAddr}` : ''),
        rx: rxAddr,
        className,
        svg: `<svg data-rx="${rxAddr !== null ? rxAddr : ''}" width="${size}" height="${size}" viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="38" fill="#090d16" stroke="#1e293b" stroke-width="2"/><circle cx="40" cy="36" r="26" fill="#334155" stroke="#64748b" stroke-width="2"/><circle cx="40" cy="36" r="18" fill="${initialOn ? '#10b981' : '#064e3b'}"/><text x="40" y="70" font-family="monospace" font-size="8" fill="#34d399" text-anchor="middle">${label}</text></svg>`
      }
    };
  }

  const container = document.createElement('div');
  container.className = `titan-indicator inline-flex flex-col items-center justify-center cursor-pointer select-none ${className}`.trim();
  if (rxAddr !== null) container.setAttribute('data-rx', String(rxAddr));

  const renderSvg = (isOn) => {
    let hexCol = '#10b981', darkCol = '#064e3b', glowCol = '#34d399';
    if (color === 'red') { hexCol = '#ef4444'; darkCol = '#450a0a'; glowCol = '#f87171'; }
    else if (color === 'amber' || color === 'yellow') { hexCol = '#f59e0b'; darkCol = '#451a03'; glowCol = '#fbbf24'; }
    else if (color === 'blue') { hexCol = '#3b82f6'; darkCol = '#1e3a8a'; glowCol = '#60a5fa'; }
    else if (color === 'cyan') { hexCol = '#00f2fe'; darkCol = '#083344'; glowCol = '#38bdf8'; }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="none" class="ub-panel-indicator">
        <circle cx="40" cy="40" r="38" fill="#090d16" stroke="#1e293b" stroke-width="2"/>
        <circle cx="40" cy="36" r="26" fill="#334155" stroke="#64748b" stroke-width="2"/>
        <circle cx="40" cy="36" r="22" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
        ${isOn ? `
          <circle cx="40" cy="36" r="18" fill="${hexCol}" style="filter: drop-shadow(0 0 12px ${glowCol});">
            ${blink ? '<animate attributeName="opacity" values="1;0.15;1" dur="0.6s" repeatCount="indefinite"/>' : ''}
          </circle>
          <circle cx="40" cy="36" r="12" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/>
          <circle cx="40" cy="36" r="6" stroke="rgba(255,255,255,0.7)" stroke-width="1" fill="none"/>
          <ellipse cx="35" cy="30" rx="5" ry="2.5" fill="rgba(255,255,255,0.65)"/>
          <rect x="16" y="60" width="48" height="14" rx="2" fill="#000" stroke="#334155" stroke-width="1"/>
          <text x="40" y="70" font-family="monospace" font-size="6.5" font-weight="900" fill="${glowCol}" text-anchor="middle">${label} [ON]</text>
        ` : `
          <circle cx="40" cy="36" r="18" fill="${darkCol}" stroke="#0f172a" stroke-width="1"/>
          <circle cx="40" cy="36" r="12" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none"/>
          <ellipse cx="35" cy="30" rx="4" ry="2" fill="rgba(255,255,255,0.15)"/>
          <rect x="16" y="60" width="48" height="14" rx="2" fill="#000" stroke="#1e293b" stroke-width="1"/>
          <text x="40" y="70" font-family="monospace" font-size="6.5" font-weight="bold" fill="#64748b" text-anchor="middle">${label} [OFF]</text>
        `}
      </svg>
    `;
  };

  container.innerHTML = renderSvg(initialOn);
  let currentVal = initialOn;
  if (rxAddr !== null && engine) {
    engine.on(rxAddr, (val) => {
      currentVal = Boolean(val);
      container.innerHTML = renderSvg(currentVal);
    });
  }

  const txAddr = tx !== undefined ? Number(tx) : rxAddr;
  if (txAddr !== null && engine) {
    container.addEventListener('click', () => {
      currentVal = !currentVal;
      engine.tx(txAddr, currentVal ? 1 : 0);
    });
  }

  return container;
}

// ── 3-Tier Industrial Andon Stack Tower Light ─────────────────────────────────
function TitanAndon(props = {}, engine) {
  const { width = 44, rx, className = '' } = props;
  const rxAddr = rx !== undefined ? Number(rx) : null;

  const renderSvg = (stateVal) => {
    let redOn = props.red || false, amberOn = props.amber || false, greenOn = props.green || false;
    if (typeof stateVal === 'number') {
      greenOn = stateVal === 1;
      amberOn = stateVal === 2;
      redOn = stateVal >= 3;
    } else if (typeof stateVal === 'object' && stateVal !== null) {
      redOn = Boolean(stateVal.red);
      amberOn = Boolean(stateVal.amber);
      greenOn = Boolean(stateVal.green);
    }
    const height = Math.round(width * 1.6);
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 60 100" fill="none" class="ub-andon-tower">
        <rect x="26" y="75" width="8" height="20" fill="#64748b"/>
        <rect x="16" y="92" width="28" height="6" rx="2" fill="#334155" stroke="#475569" stroke-width="1.5"/>
        <rect x="20" y="70" width="20" height="8" rx="2" fill="#1e293b" stroke="#475569" stroke-width="1"/>
        <rect x="20" y="10" width="20" height="18" rx="2" fill="${redOn ? '#ef4444' : '#450a0a'}" stroke="#7f1d1d" stroke-width="1.5"/>
        <rect x="20" y="30" width="20" height="18" rx="2" fill="${amberOn ? '#f59e0b' : '#451a03'}" stroke="#78350f" stroke-width="1.5"/>
        <rect x="20" y="50" width="20" height="18" rx="2" fill="${greenOn ? '#10b981' : '#064e3b'}" stroke="#065f46" stroke-width="1.5"/>
        <path d="M22 10 Q30 4 38 10 Z" fill="#334155" stroke="#475569" stroke-width="1"/>
      </svg>
    `;
  };

  if (typeof document === 'undefined') {
    const height = Math.round(width * 1.6);
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        width,
        height,
        rx: rxAddr,
        action: rxAddr !== null ? `bus:${rxAddr}` : '',
        className,
        svg: `<svg data-rx="${rxAddr !== null ? rxAddr : ''}">` + renderSvg(props.state || 1) + `</svg>`
      }
    };
  }

  const container = document.createElement('div');
  container.className = `titan-andon inline-flex items-center justify-center ${className}`.trim();
  if (rxAddr !== null) container.setAttribute('data-rx', String(rxAddr));

  const initialVal = rxAddr !== null ? _getEngineValue(engine, rxAddr, props.state || 1) : (props.state || 1);
  container.innerHTML = renderSvg(initialVal);

  if (rxAddr !== null && engine) {
    engine.on(rxAddr, (val) => { container.innerHTML = renderSvg(val); });
  }

  return container;
}

// ── 120 FPS Instrument Dial Needle Gauge ──────────────────────────────────────
function TitanGauge(props = {}, engine) {
  const { min = 0, max = 100, label = '', size = 110, rx, className = '' } = props;
  const rxAddr = rx !== undefined ? Number(rx) : null;
  const initialVal = rxAddr !== null ? Number(_getEngineValue(engine, rxAddr, props.value || min)) : Number(props.value || min);
  const initialClamped = Math.max(min, Math.min(max, initialVal));
  const initialDeg = ((initialClamped - min) / (max - min || 1)) * 180 - 90;
  const arcLength = 132;
  const initialOffset = arcLength - (arcLength * (initialClamped - min) / (max - min || 1));
  const height = Math.round(size * 0.72);
  const rad = (initialDeg * Math.PI) / 180;
  const nx = (60 + 38 * Math.sin(rad)).toFixed(1);
  const ny = (62 - 38 * Math.cos(rad)).toFixed(1);

  if (typeof document === 'undefined') {
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        width: size,
        height,
        rx: rxAddr,
        action: rxAddr !== null ? `bus:${rxAddr}` : '',
        className,
        svg: `
    <svg width="${size}" height="${height}" viewBox="0 0 120 84" fill="none" data-rx="${rxAddr !== null ? rxAddr : ''}" data-min="${min}" data-max="${max}" data-label="${label}">
      <path d="M 18 62 A 42 42 0 0 1 102 62" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
      <path d="M 22 62 A 38 38 0 0 1 98 62" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>
      <line x1="60" y1="62" x2="${nx}" y2="${ny}" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
      <circle cx="60" cy="62" r="5" fill="#f59e0b" stroke="#1e293b" stroke-width="1.5"/>
      <circle cx="60" cy="62" r="2" fill="#ef4444"/>
      ${label ? `<text x="60" y="50" font-family="monospace" font-size="7" font-weight="900" fill="#64748b" text-anchor="middle">${label}</text>` : ''}
      <text x="14" y="73" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle">${min}</text>
      <text x="106" y="73" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle">${max}</text>
      <text x="60" y="78" font-family="monospace" font-size="10.5" font-weight="900" fill="#f59e0b" text-anchor="middle">${initialClamped}</text>
    </svg>`
      }
    };
  }

  const container = document.createElement('div');
  container.className = `titan-gauge inline-flex flex-col items-center justify-center select-none ${className}`.trim();
  if (rxAddr !== null) container.setAttribute('data-rx', String(rxAddr));

  container.innerHTML = `
    <svg width="${size}" height="${height}" viewBox="0 0 120 84" fill="none" class="ub-dial-gauge">
      <defs>
        <linearGradient id="titanGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6"/>
          <stop offset="65%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#ef4444"/>
        </linearGradient>
        <radialGradient id="titanPivotGrad" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#cbd5e1"/>
          <stop offset="60%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
      </defs>
      <path d="M 18 62 A 42 42 0 0 1 102 62" fill="none" stroke="#1e293b" stroke-width="6" stroke-linecap="round"/>
      <path class="gauge-arc" d="M 18 62 A 42 42 0 0 1 102 62" fill="none" stroke="url(#titanGaugeGrad)" stroke-width="6" stroke-linecap="round" stroke-dasharray="132" stroke-dashoffset="${initialOffset}"/>
      <line x1="60" y1="20" x2="60" y2="25" stroke="#475569" stroke-width="1.5" transform="rotate(-90 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="24" stroke="#334155" stroke-width="1" transform="rotate(-60 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="24" stroke="#334155" stroke-width="1" transform="rotate(-30 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="26" stroke="#94a3b8" stroke-width="1.5" transform="rotate(0 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="24" stroke="#334155" stroke-width="1" transform="rotate(30 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="24" stroke="#334155" stroke-width="1" transform="rotate(60 60 62)"/>
      <line x1="60" y1="20" x2="60" y2="25" stroke="#ef4444" stroke-width="1.5" transform="rotate(90 60 62)"/>
      ${label ? `<text x="60" y="52" font-family="monospace" font-size="6.5" font-weight="900" fill="#64748b" text-anchor="middle" letter-spacing="1">${label}</text>` : ''}
      <text x="14" y="73" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle">${min}</text>
      <text x="106" y="73" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle">${max}</text>
      <g transform="translate(60, 62)">
        <g class="ub-gauge-needle" transform="rotate(${initialDeg})">
          <polygon points="-1.5,0 1.5,0 0.8,-40 -0.8,-40" fill="#ef4444" style="filter: drop-shadow(0 0 3px #ef4444);"/>
          <circle cx="0" cy="0" r="5.5" fill="url(#titanPivotGrad)" stroke="#1e293b" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="2" fill="#f59e0b"/>
        </g>
      </g>
      <text x="60" y="78" font-family="monospace" font-size="10.5" font-weight="900" fill="#f59e0b" text-anchor="middle" class="gauge-val">${initialClamped}</text>
    </svg>
  `;

  if (rxAddr !== null && engine) {
    const needleEl = container.querySelector('.ub-gauge-needle');
    const arcEl = container.querySelector('.gauge-arc');
    const valEl = container.querySelector('.gauge-val');
    engine.on(rxAddr, (newVal) => {
      const num = Number(newVal);
      const clamped = Math.max(min, Math.min(max, num));
      const deg = ((clamped - min) / (max - min || 1)) * 180 - 90;
      const offset = arcLength - (arcLength * (clamped - min) / (max - min || 1));
      if (needleEl) needleEl.setAttribute('transform', `rotate(${deg})`);
      if (arcEl) arcEl.setAttribute('stroke-dashoffset', String(offset));
      if (valEl) valEl.textContent = String(clamped);
    });
  }

  return container;
}

// ── 3D Knurled Aluminum Rotary Potentiometer Knob (Pure SVG CAD) ──────────────
function TitanKnob(props = {}, engine) {
  const { min = 0, max = 100, label = 'Gain', unit = '%', theme = 'cyan', size = 56, rx, tx, className = '' } = props;
  const rxAddr = rx !== undefined ? Number(rx) : null;
  const txAddr = tx !== undefined ? Number(tx) : rxAddr;

  const themeColors = {
    cyan: { led: '#22d3ee', glow: '#38bdf8', border: '#0284c7' },
    emerald: { led: '#10b981', glow: '#34d399', border: '#047857' },
    amber: { led: '#f59e0b', glow: '#fbbf24', border: '#b45309' },
    purple: { led: '#c084fc', glow: '#d8b4fe', border: '#7e22ce' }
  };
  const t = themeColors[theme] || themeColors.cyan;
  const knobId = 'knob_' + Math.random().toString(36).slice(2, 7);
  let currentVal = rxAddr !== null ? Number(_getEngineValue(engine, rxAddr, props.value || min)) : Number(props.value || min);

  const renderKnob = (val) => {
    const clamped = Math.max(min, Math.min(max, val));
    const percent = (clamped - min) / (max - min || 1);
    const angle = -135 + (percent * 270);
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 60 60" class="knob-wheel" style="overflow:visible;">
        <defs>
          <radialGradient id="${knobId}_body" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#475569"/>
            <stop offset="60%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#020617"/>
          </radialGradient>
          <linearGradient id="${knobId}_cap" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155"/>
            <stop offset="50%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0b1120"/>
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r="28" fill="url(#${knobId}_body)" stroke="${t.border}" stroke-width="2"/>
        <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" stroke-dasharray="2.5,3.5"/>
        <circle cx="30" cy="30" r="20" fill="url(#${knobId}_cap)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
        <g class="knob-cap" transform="rotate(${angle} 30 30)" style="transition: transform 0.1s ease-out;">
          <rect x="28.5" y="12" width="3" height="8" rx="1.5" fill="${t.led}" style="filter: drop-shadow(0 0 4px ${t.glow});"/>
        </g>
      </svg>
      <span class="knob-val" style="font-family: monospace; font-size: 10px; font-weight: bold; color: ${t.led}; text-shadow: 0 0 6px ${t.glow}; margin-top: 3px;">
        ${clamped > 0 && unit === 'dB' ? '+' : ''}${clamped} ${unit}
      </span>
      <span style="font-family: monospace; font-size: 8.5px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
    `;
  };

  if (typeof document === 'undefined') {
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        width: size,
        height: size,
        rx: rxAddr,
        tx: txAddr,
        action: txAddr !== null ? `bus:${txAddr}` : (rxAddr !== null ? `bus:${rxAddr}` : ''),
        className,
        svg: `<svg data-rx="${rxAddr !== null ? rxAddr : ''}" data-tx="${txAddr !== null ? txAddr : ''}" width="${size}" height="${size}" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#1e293b" stroke="${t.border}" stroke-width="2"/><circle cx="30" cy="30" r="20" fill="#0f172a"/><g transform="rotate(-45 30 30)"><rect x="28.5" y="12" width="3" height="8" rx="1.5" fill="${t.led}"/></g></svg>`
      }
    };
  }

  const container = document.createElement('div');
  container.className = `titan-3d-knob-root inline-flex flex-col items-center select-none font-mono ${className}`.trim();
  container.style.cssText = 'display:inline-flex; flex-direction:column; align-items:center; cursor:grab; user-select:none;';
  if (rxAddr !== null) container.setAttribute('data-rx', String(rxAddr));
  if (txAddr !== null) container.setAttribute('data-tx', String(txAddr));

  container.innerHTML = renderKnob(currentVal);

  let isDragging = false;
  let startY = 0;
  let startVal = currentVal;

  const onPointerDown = (e) => {
    isDragging = true;
    startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    startVal = currentVal;
    container.style.cursor = 'grabbing';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    const deltaY = startY - clientY;
    const rangeSpan = max - min || 1;
    const step = rangeSpan / 100;
    let nextVal = Math.round(startVal + (deltaY * step));
    nextVal = Math.max(min, Math.min(max, nextVal));
    if (nextVal !== currentVal) {
      currentVal = nextVal;
      const percent = (currentVal - min) / rangeSpan;
      const angle = -135 + (percent * 270);
      const capEl = container.querySelector('.knob-cap');
      const valEl = container.querySelector('.knob-val');
      if (capEl) capEl.setAttribute('transform', `rotate(${angle} 30 30)`);
      if (valEl) valEl.textContent = `${currentVal > 0 && unit === 'dB' ? '+' : ''}${currentVal} ${unit}`;
      if (txAddr !== null && engine) engine.tx(txAddr, currentVal);
    }
  };

  const onPointerUp = () => {
    isDragging = false;
    container.style.cursor = 'grab';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };

  container.addEventListener('pointerdown', onPointerDown);

  if (rxAddr !== null && engine) {
    engine.on(rxAddr, (newVal) => {
      if (isDragging) return;
      currentVal = Number(newVal);
      const clamped = Math.max(min, Math.min(max, currentVal));
      const percent = (clamped - min) / (max - min || 1);
      const angle = -135 + (percent * 270);
      const capEl = container.querySelector('.knob-cap');
      const valEl = container.querySelector('.knob-val');
      if (capEl) capEl.setAttribute('transform', `rotate(${angle} 30 30)`);
      if (valEl) valEl.textContent = `${clamped > 0 && unit === 'dB' ? '+' : ''}${clamped} ${unit}`;
    });
  }

  return container;
}

// ── 7-Segment CAD LED Numeric Instrument Display (Pure SVG CAD) ───────────────
function Titan7Seg(props = {}, engine) {
  const { digits = 3, value = 0, theme = 'red', rx, className = '' } = props;
  const rxAddr = rx !== undefined ? Number(rx) : null;

  const themes = {
    red: { on: '#ef4444', off: '#260a0a', glow: '#f87171', border: '#7f1d1d' },
    green: { on: '#10b981', off: '#042217', glow: '#34d399', border: '#065f46' },
    amber: { on: '#f59e0b', off: '#2d1804', glow: '#fbbf24', border: '#78350f' },
    blue: { on: '#38bdf8', off: '#08253a', glow: '#7dd3fc', border: '#075985' }
  };
  const th = themes[theme] || themes.red;

  // ⚡ Procedural Seven-Segment Vector Engine (Matches C++ Titan::Vector::generateSevenSegment)
  const generateProcedural7SegSvg = (char, width = 24, height = 42) => {
    const c = String(char).toUpperCase();
    const maskMap = {
      '0': 0b00111111, '1': 0b00000110, '2': 0b01011011, '3': 0b01001111,
      '4': 0b01100110, '5': 0b01101101, '6': 0b01111101, '7': 0b00000111,
      '8': 0b01111111, '9': 0b01101111, '-': 0b01000000, ' ': 0b00000000
    };
    const mask = maskMap[c] !== undefined ? maskMap[c] : 0;
    const thk = width * 0.16;
    const gap = thk * 0.12;
    const midY = height * 0.5;

    const seg = (on, pts) => {
      const col = on ? th.on : th.off;
      const glow = on ? ` style="filter: drop-shadow(0 0 3px ${th.glow});"` : '';
      return `<polygon points="${pts}" fill="${col}"${glow}/>`;
    };

    const a = seg(mask & 0x01, `${gap},0 ${width-gap},0 ${width-gap-thk},${thk} ${gap+thk},${thk}`);
    const b = seg(mask & 0x02, `${width},${gap} ${width},${midY-gap*0.5} ${width-thk},${midY-gap*0.5-thk*0.5} ${width-thk},${gap+thk}`);
    const cSeg = seg(mask & 0x04, `${width},${midY+gap*0.5} ${width},${height-gap} ${width-thk},${height-gap-thk} ${width-thk},${midY+gap*0.5+thk*0.5}`);
    const d = seg(mask & 0x08, `${gap+thk},${height-thk} ${width-gap-thk},${height-thk} ${width-gap},${height} ${gap},${height}`);
    const e = seg(mask & 0x10, `0,${midY+gap*0.5} ${thk},${midY+gap*0.5+thk*0.5} ${thk},${height-gap-thk} 0,${height-gap}`);
    const f = seg(mask & 0x20, `0,${gap} ${thk},${gap+thk} ${thk},${midY-gap*0.5-thk*0.5} 0,${midY-gap*0.5}`);
    const g = seg(mask & 0x40, `${gap},${midY} ${gap+thk*0.5},${midY-thk*0.5} ${width-gap-thk*0.5},${midY-thk*0.5} ${width-gap},${midY} ${width-gap-thk*0.5},${midY+thk*0.5} ${gap+thk*0.5},${midY+thk*0.5}`);

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="margin: 0 2px;">${a}${b}${cSeg}${d}${e}${f}${g}</svg>`;
  };

  if (typeof document === 'undefined') {
    const strVal = String(props.value !== undefined ? props.value : '000').padStart(digits, ' ').slice(-digits);
    const combinedSvg = `<svg class="titan-seg7" data-rx="${rxAddr !== null ? rxAddr : ''}" width="${digits * 28}" height="46" viewBox="0 0 ${digits * 28} 46" fill="#020617"><g transform="translate(4,2)">`
      + strVal.split('').map((ch, idx) => `<g transform="translate(${idx * 26}, 0)">` + generateProcedural7SegSvg(ch, 22, 40) + `</g>`).join('')
      + `</g></svg>`;
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        rx: rxAddr,
        action: rxAddr !== null ? `bus:${rxAddr}` : '',
        className,
        svg: combinedSvg
      }
    };
  }

  const container = document.createElement('div');
  container.className = `titan-7seg inline-flex flex-col items-center select-none font-mono ${className}`.trim();
  container.style.cssText = 'display:inline-flex; flex-direction:column; align-items:center; user-select:none;';
  if (rxAddr !== null) container.setAttribute('data-rx', String(rxAddr));

  const renderSingleDigit = (char) => generateProcedural7SegSvg(char, 24, 42);

  const renderPanel = (val) => {
    const strVal = String(val).padStart(digits, ' ').slice(-digits);
    const digitHtml = strVal.split('').map(renderSingleDigit).join('');
    return `
      <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:4px; font-size:8px; font-weight:900; letter-spacing:1px; color:#64748b;">
        <span style="color:${th.glow};">● 7-SEG CAD</span>
        <span style="background:rgba(255,255,255,0.05); padding:1px 4px; border-radius:2px; border:1px solid #1e293b;">120 FPS</span>
      </div>
      <div class="seg7-display" style="display:flex; align-items:center; justify-content:center; background:#020617; padding:4px 8px; border-radius:6px; border:1px solid #0f172a; box-shadow: inset 0 2px 6px #000;">
        ${digitHtml}
      </div>
    `;
  };

  const initialVal = rxAddr !== null ? _getEngineValue(engine, rxAddr, value) : value;
  container.innerHTML = renderPanel(initialVal);

  if (rxAddr !== null && engine) {
    engine.on(rxAddr, (newVal) => {
      const displayEl = container.querySelector('.seg7-display');
      if (displayEl) {
        const strVal = String(newVal).padStart(digits, ' ').slice(-digits);
        displayEl.innerHTML = strVal.split('').map(renderSingleDigit).join('');
      }
    });
  }

  return container;
}

// ── Constitutional Nepal Flag with 120 FPS Flutter ───────────────────────────
function TitanNepalFlag(props = {}) {
  const { width = 48, height = 58, animated = true, className = '' } = props;
  const animClass = animated ? 'nepal-flag-wave' : '';
  const moonAnimClass = animated ? 'nepal-moon-glow' : '';
  const sunAnimClass = animated ? 'nepal-sun-spin' : '';
  if (typeof document === 'undefined') {
    return {
      __isTitanVNode: true,
      tag: 'thorvg',
      props: {
        width,
        height,
        className,
        svg: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 85" width="${width}" height="${height}">
      <polygon points="0,0 60,38 24,38 68,85 0,85" fill="#003893" stroke="#003893" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <polygon points="4,5 51,35 20,35 58,79 4,79" fill="#C8102E"/>
      <g>
        <path d="M 16 28 C 16 35, 36 35, 36 28 C 33 32, 19 32, 16 28 Z" fill="#FFFFFF"/>
        <circle cx="26" cy="25" r="4.2" fill="#FFFFFF"/>
        <polygon points="26,18 27.5,22 31,20 29.5,23.5 33,25 29.5,26.5 31,30 27.5,28 26,32 24.5,28 21,30 22.5,26.5 19,25 22.5,23.5 21,20 24.5,22" fill="#FFFFFF"/>
      </g>
      <g>
        <circle cx="26" cy="63" r="5.5" fill="#FFFFFF"/>
        <polygon points="26,50 28,56 34,52 32,58 39,57 35,62 40,65 34,67 36,73 31,71 30,77 26,73 22,77 21,71 16,73 18,67 12,65 17,62 13,57 20,58 18,52 24,56" fill="#FFFFFF"/>
      </g>
    </svg>`
      }
    };
  }

  const el = document.createElement('div');
  el.className = `nepal-flag-container inline-flex items-center justify-center ${className}`.trim();
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 85" width="${width}" height="${height}" class="${animClass}">
      <polygon points="0,0 60,38 24,38 68,85 0,85" fill="#003893" stroke="#003893" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      <polygon points="4,5 51,35 20,35 58,79 4,79" fill="#C8102E"/>
      <g class="${moonAnimClass}">
        <path d="M 16 28 C 16 35, 36 35, 36 28 C 33 32, 19 32, 16 28 Z" fill="#FFFFFF"/>
        <circle cx="26" cy="25" r="4.2" fill="#FFFFFF"/>
        <polygon points="26,18 27.5,22 31,20 29.5,23.5 33,25 29.5,26.5 31,30 27.5,28 26,32 24.5,28 21,30 22.5,26.5 19,25 22.5,23.5 21,20 24.5,22" fill="#FFFFFF"/>
      </g>
      <g class="${sunAnimClass}">
        <circle cx="26" cy="63" r="5.5" fill="#FFFFFF"/>
        <polygon points="26,50 28,56 34,52 32,58 39,57 35,62 40,65 34,67 36,73 31,71 30,77 26,73 22,77 21,71 16,73 18,67 12,65 17,62 13,57 20,58 18,52 24,56" fill="#FFFFFF"/>
      </g>
    </svg>
  `;
  return el;
}

// ── Native Vector Icons (< 1.5 KB) ───────────────────────────────────────────
const NATIVE_ICONS = {
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  battery: '<rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="11" x2="23" y2="13"/><line x1="5" y1="12" x2="13" y2="12"/>',
  server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>',
  gauge: '<path d="M12 15l3.5-3.5"/><path d="M20.3 18a9 9 0 1 0-16.6 0"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  pulse: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
};

function parseTurtlePath(classStr) {
  if (!classStr) return '';
  const tokens = classStr.split(/\s+/);
  let d = '';
  for (const t of tokens) {
    let m;
    if ((m = t.match(/^(?:start|m)-(\d+)-(\d+)$/i))) d += `M ${m[1]} ${m[2]} `;
    else if ((m = t.match(/^(?:to|l)-(\d+)-(\d+)$/i))) d += `L ${m[1]} ${m[2]} `;
    else if ((m = t.match(/^(?:right|r)-(\d+)$/i))) d += `h ${m[1]} `;
    else if ((m = t.match(/^(?:left|lef|l)-(\d+)$/i))) d += `h -${m[1]} `;
    else if ((m = t.match(/^(?:down|d)-(\d+)$/i))) d += `v ${m[1]} `;
    else if ((m = t.match(/^(?:up|u)-(\d+)$/i))) d += `v -${m[1]} `;
    else if (t.toLowerCase() === 'close' || t.toLowerCase() === 'z') d += 'Z ';
  }
  return d.trim();
}

function TitanIcon({ name = 'cpu', className = '', size = 20, ...props }) {
  if (typeof document === 'undefined') {
    return {
      __isTitanVNode: true,
      tag: 'icon',
      props: {
        name,
        size,
        className,
        ...props
      },
      children: []
    };
  }

  const iconPath = NATIVE_ICONS[name] || NATIVE_ICONS.cpu;
  return {
    __isTitanVNode: true,
    tag: 'svg',
    props: {
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: `titan-icon inline-block shrink-0 ${className}`.trim(),
      dangerouslySetInnerHTML: { __html: iconPath },
      ...props
    },
    children: []
  };
}

function TitanDraw({ canvas = '255x255', children, className = '', ...props }) {
  const [w, hDim] = canvas.includes('x') ? canvas.split('x') : [canvas, canvas];
  return {
    __isTitanVNode: true,
    tag: 'svg',
    props: {
      viewBox: `0 0 ${w} ${hDim}`,
      className: `ub-draw inline-block ${className}`.trim(),
      ...props
    },
    children: Array.isArray(children) ? children : [children]
  };
}

function TitanPath({ turtle = '', d = '', ...props }) {
  return {
    __isTitanVNode: true,
    tag: 'path',
    props: { d: turtle ? parseTurtlePath(turtle) : d, ...props },
    children: []
  };
}

function TitanRegister({ address, as = 'span', fallback = '0', className = '' }) {
  const addr = Number(address);
  return {
    __isTitanVNode: true,
    tag: as,
    props: {
      rx: addr,
      className: `titan-register-val font-mono ${className}`.trim()
    },
    children: [String(fallback)]
  };
}

function TitanButton({ tx, txValue = 1, children, className = '', ...props }) {
  const addr = Number(tx);
  return {
    __isTitanVNode: true,
    tag: 'button',
    props: {
      tx: addr,
      txValue,
      className: `titan-btn px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium transition cursor-pointer select-none ${className}`.trim(),
      ...props
    },
    children: Array.isArray(children) ? children : [children]
  };
}

function TitanSlider({ address, min = 0, max = 100, step = 1, label = '', className = '' }) {
  const addr = Number(address);
  return {
    __isTitanVNode: true,
    tag: 'div',
    props: { className: `titan-slider-group flex flex-col gap-1.5 ${className}`.trim() },
    children: [
      label ? {
        __isTitanVNode: true,
        tag: 'div',
        props: { className: 'flex justify-between text-xs font-mono opacity-80' },
        children: [
          { __isTitanVNode: true, tag: 'span', props: {}, children: [label] },
          { __isTitanVNode: true, tag: 'span', props: { rx: addr }, children: ['0'] }
        ]
      } : null,
      {
        __isTitanVNode: true,
        tag: 'input',
        props: {
          type: 'range',
          min,
          max,
          step,
          rx: addr,
          tx: addr,
          className: 'w-full accent-amber-500 cursor-pointer'
        },
        children: []
      }
    ].filter(Boolean)
  };
}

function TitanCard({ title = '', children, className = '' }) {
  return {
    __isTitanVNode: true,
    tag: 'div',
    props: { className: `titan-card p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 ${className}`.trim() },
    children: [
      title ? {
        __isTitanVNode: true,
        tag: 'h3',
        props: { className: 'text-sm font-bold tracking-wider uppercase text-amber-400 mb-3' },
        children: [title]
      } : null,
      ...(Array.isArray(children) ? children : [children])
    ].filter(Boolean)
  };
}

const UB = {
  stat({ label = '', value = '', icon = '', color = 'cyan', className = '' }) {
    const colorStyles = {
      blue: 'text-sky-400 border-sky-900/60 bg-sky-950/40',
      green: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/40',
      purple: 'text-purple-400 border-purple-900/60 bg-purple-950/40',
      red: 'text-rose-400 border-rose-900/60 bg-rose-950/40',
      amber: 'text-amber-400 border-amber-900/60 bg-amber-950/40',
      cyan: 'text-cyan-400 border-cyan-900/60 bg-cyan-950/40'
    };
    const cCls = colorStyles[color] || colorStyles.cyan;
    return {
      __isTitanVNode: true,
      tag: 'div',
      props: { className: `p-3 rounded-xl border flex items-center justify-between font-mono ${cCls} ${className}`.trim() },
      children: [
        {
          __isTitanVNode: true,
          tag: 'div',
          props: { className: 'flex flex-col' },
          children: [
            { __isTitanVNode: true, tag: 'span', props: { className: 'text-[10px] text-slate-400 uppercase font-bold tracking-wider' }, children: [label] },
            { __isTitanVNode: true, tag: 'span', props: { className: 'text-base font-black mt-0.5' }, children: [value] }
          ]
        },
        icon ? (NATIVE_ICONS[icon] ? TitanIcon({ name: icon, size: 22 }) : { __isTitanVNode: true, tag: 'span', props: { className: 'text-2xl' }, children: [icon] }) : null
      ].filter(Boolean)
    };
  }
};

function WebOnly({ children, ...props }) {
  return {
    __isTitanVNode: true,
    tag: 'div',
    props: { target: 'web', ...props },
    children: Array.isArray(children) ? children : (children !== undefined && children !== null ? [children] : [])
  };
}

function MobileOnly({ children, ...props }) {
  return {
    __isTitanVNode: true,
    tag: 'div',
    props: { target: 'mobile', ...props },
    children: Array.isArray(children) ? children : (children !== undefined && children !== null ? [children] : [])
  };
}

function CameraView(props = {}) {
  return { tag: 'CameraView', props: props || {}, children: [] };
}

const TitanWidgets = {
  CameraView,
  WebOnly,
  MobileOnly,
  TitanIndicator,
  TitanAndon,
  TitanGauge,
  TitanKnob,
  Titan7Seg,
  TitanNepalFlag,
  TitanIcon,
  TitanDraw,
  TitanPath,
  TitanRegister,
  TitanButton,
  TitanSlider,
  TitanCard,
  UB,
  NATIVE_ICONS,
  parseTurtlePath,
  _getEngineValue
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanWidgets;
}
if (typeof globalThis !== 'undefined') {
  globalThis.TitanWidgets = TitanWidgets;
  Object.assign(globalThis, TitanWidgets);
}
if (typeof window !== 'undefined') {
  window.TitanWidgets = TitanWidgets;
  Object.assign(window, TitanWidgets);
}
