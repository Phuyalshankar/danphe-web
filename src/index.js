'use strict';

/**
 * 🐬 DANPHE-WEB (v1.0.0)
 * Post-Virtual-DOM Reactive Web Framework with Built-in Polymorphic Design Tokens
 * 
 * Clean, Decoupled Architecture:
 * 1. jsx-runtime: Ultra-lean direct DOM parser & renderer (Zero-VDOM)
 * 2. store: Deterministic Carrier Slots & zero-boilerplate state (Zero-Hooks)
 * 3. router: Instant client routing with hash & history modes
 * 4. dolphincss: Polymorphic universal design tokens (filled primary md glow motion)
 * 5. transport: Titan-Bus / SISO 6-byte stream connector
 */

const { h, html, createElement, render, unmount } = require('./core/jsx-runtime');
const { DanpheStore, defaultStore, reg, createStore } = require('./core/store');
const { DanpheRouter, defaultRouter, RouterView } = require('./core/router');
const { generateCoreCSS, injectDolphinCSS, PALETTE, SCALES } = require('./core/dolphincss');
const { DanpheTransport } = require('./core/transport');

const DanpheWeb = {
  // JSX
  h,
  html,
  render,
  unmount,
  createElement,

  // State & Slots
  store: defaultStore,
  reg,
  createStore,
  DanpheStore,

  // Routing
  router: defaultRouter,
  RouterView,
  navigate: (to) => defaultRouter.navigate(to),

  // Styling
  injectDolphinCSS,
  generateCoreCSS,
  palette: PALETTE,
  scales: SCALES,

  // Transport
  Transport: DanpheTransport
};

// Auto-mount global in browser
if (typeof window !== 'undefined') {
  window.DanpheWeb = DanpheWeb;
  window.h = h;
  window.html = html;
  window.reg = reg;
}

module.exports = DanpheWeb;
