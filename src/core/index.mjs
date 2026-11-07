/**
 * 🏔️ TITAN BUS CLIENT — ES MODULE (index.mjs)
 * Zero-Build, Pure ES Module Import
 * 
 * Usage:
 * import { mount, createCircuit, TitanCard, TitanSlider, TitanButton } from 'titan-bus-client';
 */

import TitanCircuitEngine from './TitanCircuitEngine.js';
import TitanClockPulse from './TitanClockPulse.js';
import TitanDataStore from './TitanDataStore.js';
import TitanBuf from './TitanBuf.js';
import TitanNativeBridge from './TitanNativeBridge.js';
import TitanJSX from './TitanJSX.js';
import TitanDiode from './TitanDiode.js';
import TitanRelay from './TitanRelay.js';

export const VERSION = '2.2.0';
export {
  TitanCircuitEngine,
  TitanClockPulse,
  TitanDataStore,
  TitanBuf,
  TitanNativeBridge,
  TitanDiode,
  TitanRelay,
  TitanJSX
};

export const createCircuit = (circuit, opts) => new TitanCircuitEngine(circuit, opts);
export const createRegister = (circuit, opts) => new TitanCircuitEngine(circuit, opts);

// ⚡ Titan Native JSX & Internal Mount Exports
export const h = TitanJSX.h;
export const html = TitanJSX.html;
export const render = TitanJSX.render;
export const mount = (vnode, container = '#root', engine = null) => {
  return engine ? engine.mount(vnode, container) : TitanJSX.mount(vnode, container);
};
export const TitanCard = TitanJSX.TitanCard;
export const TitanSlider = TitanJSX.TitanSlider;
export const TitanButton = TitanJSX.TitanButton;
export const TitanRegister = TitanJSX.TitanRegister;

export default {
  VERSION,
  TitanCircuitEngine,
  createCircuit,
  createRegister,
  mount,
  h,
  html,
  render,
  TitanCard,
  TitanSlider,
  TitanButton,
  TitanRegister
};
