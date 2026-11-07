'use strict';

/**
 * 🏔️ TITAN BUS CLIENT (v2.2.0)
 * Universal Hookless Circuit & Memory-Register Client
 * Browser ✅ | Node.js ✅ | React/Vite ✅ | Zero-Build Native JSX ✅ | Pure C++ ✅
 * Zero runtime dependencies.
 */

const TitanCircuitEngine  = require('./TitanCircuitEngine');
const TitanClockPulse     = require('./TitanClockPulse');
const TitanDataStore      = require('./TitanDataStore');
const TitanBuf            = require('./TitanBuf');
const { TitanBusBridge, createDualBusSystem } = require('./TitanDualBus');
const { defineAddresses, AddressAllocator }   = require('./TitanAddressGuardian');
const TitanRemoteBridge   = require('./TitanRemoteBridge');
const TitanNativeBridge   = require('./TitanNativeBridge');
const TitanApi            = require('./TitanApi');
const TitanTimelineEngine = require('./TitanTimelineEngine');
const TitanJSX            = require('./TitanJSX');
const TitanDiode          = require('./TitanDiode');
const TitanCSS            = require('./TitanCSS');
const { 
  TitanMicroBus, 
  TitanMicroBusEngine, 
  TitanDeclarative, 
  EverestBus, 
  EverestDeclarative, 
  CMD, 
  TITAN_SIGNATURE, 
  TITAN_SISO_SIGNATURE, 
  TITAN_SISO_SECURE_SIGNATURE, 
  TITAN_VERSION, 
  TITAN_HEADER_SIZE, 
  TITAN_SISO_PACKET_LEN, 
  TITAN_SISO_SECURE_PACKET_LEN, 
  TITAN_DEFAULT_SECRET_SEED, 
  TITAN_FLAG, 
  TITAN_SEVERITY, 
  TITAN_ERROR_CODE, 
  ERROR_REG,
  TITAN_TYPE,
  TitanTypeSystem,
  TitanCodec,
  TitanVideoReassembler
} = require('./TitanMicroBus');
let TitanUniversalEngine = null;
try { TitanUniversalEngine = require('./TitanUniversalEngine'); } catch(e) {}
// TitanRelay uses Node.js built-in 'net' and 'http' — only load in Node environment
let TitanRelay = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  try { TitanRelay = require('./TitanRelay'); } catch(e) {}
}

let ReactExports = {};
try { ReactExports = require('./react.jsx'); } catch (e) { /* React optional */ }

module.exports = {
  VERSION: '2.2.0',
  defineAddresses,
  AddressAllocator,
  TitanRegisterEngine: TitanCircuitEngine,
  createRegister: (registers, opts) => new TitanCircuitEngine(registers, opts),
  createCircuit:  (circuit, opts)   => new TitanCircuitEngine(circuit, opts),
  createTimeline: (options)         => new TitanTimelineEngine(options),
  TitanCircuitEngine,
  TitanTimelineEngine,
  TitanClockPulse,
  TitanDataStore,
  TitanDB: require('./TitanDB'),
  TitanBusBridge,
  TitanRemoteBridge,
  TitanNativeBridge,
  TitanDiode,
  TitanRelay,
  TitanBuf,
  TitanApi,
  TitanSovereignMedia: require('./TitanSovereignMedia').TitanSovereignMedia,
  TitanMedia: require('./TitanSovereignMedia').TitanMedia,
  createDualBusSystem,

  // 🏛️ Dynamic Registers & Namespace Structs (reg form:: name, email, password)
  TitanRegisters: require('../registers/TitanRegisters'),
  defineRegisters: require('../registers/TitanRegisters').defineRegisters,
  reg: require('../registers/TitanRegisters').reg,
  resolveRegisterAndSlot: require('../registers/TitanRegisters').resolveRegisterAndSlot,
  FormRegister: require('../registers/TitanRegisters').FormRegister,
  
  // ⚡ Titan Native Zero-Build JSX Engine
  TitanJSX,
  h: TitanJSX.h,
  html: TitanJSX.html,
  render: TitanJSX.render,
  mount: TitanJSX.mount,
  TitanRegister: TitanJSX.TitanRegister,
  TitanButton: TitanJSX.TitanButton,
  TitanSlider: TitanJSX.TitanSlider,
  TitanCard: TitanJSX.TitanCard,

  // 🐬 Dolphin Universal Binary CSS Engine (v1.0.1)
  TitanCSS,
  DolphinUB: TitanCSS.DolphinUB,
  TitanUniversalEngine,

  // 🏔️ Everest & Titan Micro-Bus 1-to-1 Parity Core
  TitanMicroBus,
  TitanMicroBusEngine,
  TitanBus: TitanMicroBus,
  TitanDeclarative,
  EverestBus,
  EverestDeclarative,
  CMD,
  TITAN_SIGNATURE,
  TITAN_SISO_SIGNATURE,
  TITAN_SISO_SECURE_SIGNATURE,
  TITAN_VERSION,
  TITAN_HEADER_SIZE,
  TITAN_SISO_PACKET_LEN,
  TITAN_SISO_SECURE_PACKET_LEN,
  TITAN_DEFAULT_SECRET_SEED,
  TITAN_FLAG,
  TITAN_SEVERITY,
  TITAN_ERROR_CODE,
  ERROR_REG,
  TITAN_TYPE,
  TitanTypeSystem,
  TitanCodec,
  TitanVideoReassembler,

  ...ReactExports
};
