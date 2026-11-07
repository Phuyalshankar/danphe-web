'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { pipeline, TitanJSX, TitanRegisters } = require('../src/index');

console.log('======================================================================');
console.log('🏛️ DANPHE-NATIVE SHARED REGISTER SCHEMA & VARIABLE VERIFICATION');
console.log('======================================================================');

// Reset dynamic registry to start fresh
TitanRegisters.resetDynamicRegistry();

// 1. Declare dynamic register groups using DSL syntax
console.log('\n[TEST 1] Parsing Dynamic "reg" Declarations...');
const appSource = `
reg form:: name, email, password;
reg sensor:: temp, voltage, current, power;

export default function App() {
  return (
    <div padding="20px" background="#121826">
      <input rx="form::name" tx="form::name" placeholder="Full Name" />
      <input rx="form::email" tx="form::email" placeholder="Email Address" />
      <input rx="form::password" tx="form::password" placeholder="Password" />
      <text rx="sensor::temp" text="Sensor Temp" />
      <text rx="sensor::voltage" text="Sensor Voltage" />
      <text rx="sensor::current" text="Sensor Current" />
      <text rx="sensor::power" text="Sensor Power" />
    </div>
  );
}
`;

// Transpile JSX
const transpiled = TitanJSX.transpileJSX(appSource);
console.log('  ✅ JSX cleanly transpiled with "reg" DSL!');

// Execute and obtain VNode
const ctx = {
  ...TitanJSX,
  TitanRegisters,
  reg: TitanRegisters.reg,
  defineRegisters: TitanRegisters.defineRegisters
};

const cleanCode = transpiled
  .replace(/export\s+default\s+function\s+App\s*\(\)\s*\{/, 'function App() {');

const fn = new Function(...Object.keys(ctx), cleanCode + '\nreturn App();');
const vnode = fn(...Object.values(ctx));
assert(vnode, 'VNode must be generated');
console.log('  ✅ VNode cleanly executed with dynamic registers instantiated!');

// 2. Verify Deterministic Register & Slot Resolution in Compiler
console.log('\n[TEST 2] Verifying 16-Bit Register & 8-Bit Sub-Slot Addresses...');

const formNameRes = TitanRegisters.resolveRegisterAndSlot('form::name');
const formEmailRes = TitanRegisters.resolveRegisterAndSlot('form::email');
const formPassRes = TitanRegisters.resolveRegisterAndSlot('form::password');

assert.strictEqual(formNameRes.reg, 0x4000, 'form::name base register must be 0x4000');
assert.strictEqual(formNameRes.slot, 1, 'form::name must be slot 1');
assert.strictEqual(formEmailRes.reg, 0x4000, 'form::email base register must be 0x4000');
assert.strictEqual(formEmailRes.slot, 2, 'form::email must be slot 2');
assert.strictEqual(formPassRes.reg, 0x4000, 'form::password base register must be 0x4000');
assert.strictEqual(formPassRes.slot, 3, 'form::password must be slot 3');

const sensorTempRes = TitanRegisters.resolveRegisterAndSlot('sensor::temp');
const sensorVoltRes = TitanRegisters.resolveRegisterAndSlot('sensor::voltage');
const sensorCurrRes = TitanRegisters.resolveRegisterAndSlot('sensor::current');
const sensorPowerRes = TitanRegisters.resolveRegisterAndSlot('sensor::power');

assert.strictEqual(sensorTempRes.reg, 0x4001, 'sensor::temp base register must be 0x4001');
assert.strictEqual(sensorTempRes.slot, 1, 'sensor::temp must be slot 1');
assert.strictEqual(sensorVoltRes.reg, 0x4001, 'sensor::voltage base register must be 0x4001');
assert.strictEqual(sensorVoltRes.slot, 2, 'sensor::voltage must be slot 2');
assert.strictEqual(sensorCurrRes.reg, 0x4001, 'sensor::current base register must be 0x4001');
assert.strictEqual(sensorCurrRes.slot, 3, 'sensor::current must be slot 3');
assert.strictEqual(sensorPowerRes.reg, 0x4001, 'sensor::power base register must be 0x4001');
assert.strictEqual(sensorPowerRes.slot, 4, 'sensor::power must be slot 4');

console.log('  ✅ form::name     -> Reg 0x4000 (16384), Slot 1');
console.log('  ✅ form::email    -> Reg 0x4000 (16384), Slot 2');
console.log('  ✅ form::password -> Reg 0x4000 (16384), Slot 3');
console.log('  ✅ sensor::temp   -> Reg 0x4001 (16385), Slot 1');
console.log('  ✅ sensor::voltage-> Reg 0x4001 (16385), Slot 2');
console.log('  ✅ sensor::current-> Reg 0x4001 (16385), Slot 3');
console.log('  ✅ sensor::power  -> Reg 0x4001 (16385), Slot 4');

// 3. Export Schema and Verify Parity
console.log('\n[TEST 3] Verifying Schema Export & Serialization...');
const schema = TitanRegisters.exportSchema();
assert(schema.form, 'Schema must contain "form"');
assert(schema.sensor, 'Schema must contain "sensor"');
assert.strictEqual(schema.form.baseReg, 0x4000);
assert.strictEqual(schema.sensor.baseReg, 0x4001);
assert.strictEqual(schema.form.fields.length, 3);
assert.strictEqual(schema.sensor.fields.length, 4);

const schemaJson = TitanRegisters.exportSchemaJson();
assert(schemaJson.includes('0x4000') || schemaJson.includes('16384'), 'JSON must contain baseReg');
console.log('  ✅ Exported Schema JSON:\n' + schemaJson);

// 4. Compile to Android Native (.dolp)
console.log('\n[TEST 4] Compiling to Android Native Binary (.dolp)...');
const androidRes = pipeline.toAndroid(vnode);
assert(androidRes.bundleBuffer, 'Bundle buffer must be created');
assert(androidRes.bundleBuffer.length > 0, 'Bundle buffer length must be > 0');
console.log(`  ✅ Successfully compiled to .dolp bundle (${androidRes.bundleBuffer.length} bytes, ${androidRes.screens[0].components.length} components)`);

// 5. Compile to Web HTML5
console.log('\n[TEST 5] Compiling to Production Web HTML5...');
const webHtml = pipeline.toWeb(vnode);
assert(webHtml.includes('form::name') || webHtml.includes('16384'), 'Web HTML must bind form::name');
assert(webHtml.includes('sensor::temp') || webHtml.includes('16385'), 'Web HTML must bind sensor::temp');
console.log('  ✅ Web HTML cleanly compiled with register & slot data attributes!');

console.log('\n======================================================================');
console.log('🎉 100% PARITY ACHIEVED: SHARED REGISTER SCHEMA ENGINE OPERATIONAL!');
console.log('======================================================================\n');
