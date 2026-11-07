'use strict';

/**
 * 🐬 DANPHE-WEB MASTER TEST SUITE
 * Verifying all 5 micro-modules in Node.js
 */

const assert = require('assert');
const DanpheWeb = require('../src/index');

console.log('\n========================================================');
console.log('🇳🇵 DANPHE-WEB CORE FRAMEWORK VERIFICATION TESTS');
console.log('========================================================\n');

// TEST 1: JSX Runtime Factory
console.log('🧪 [TEST 1] Testing JSX Runtime h() factory...');
const vnode = DanpheWeb.h('button', { class: 'filled primary md motion glow', id: 'btn-1' }, 'Click Me');
assert.strictEqual(vnode.tag, 'button');
assert.strictEqual(vnode.props.class, 'filled primary md motion glow');
assert.strictEqual(vnode.children[0], 'Click Me');
console.log('   ✅ h() factory created pristine VNode successfully.');

// TEST 2: Zero-Boilerplate State & Carrier Slots
console.log('\n🧪 [TEST 2] Testing Deterministic Store & reg() Proxy...');
const form = DanpheWeb.reg('user:: name, email, role');
form.name = 'Shankar Phuyal';
form.email = 'shankar@danphe.org';
form.role = 'Architect';

assert.strictEqual(form.name, 'Shankar Phuyal');
assert.strictEqual(form.email, 'shankar@danphe.org');
assert.strictEqual(form.role, 'Architect');

const raw = form.$raw;
assert.deepStrictEqual(raw, {
  name: 'Shankar Phuyal',
  email: 'shankar@danphe.org',
  role: 'Architect'
});
console.log('   ✅ reg("user:: name, email, role") reactive proxy works perfectly.');

// TEST 3: Slot-level Subscriptions
console.log('\n🧪 [TEST 3] Testing Direct Pointer Subscriptions...');
let receivedVal = '';
DanpheWeb.store.subscribe('user::name', (newVal) => {
  receivedVal = newVal;
});
form.name = 'Updated Name';
assert.strictEqual(receivedVal, 'Updated Name');
console.log('   ✅ Microsecond exact-key subscriber notified instantly.');

// TEST 4: Client Router
console.log('\n🧪 [TEST 4] Testing DanpheRouter pattern matching...');
const router = new DanpheWeb.router.constructor({ mode: 'hash' });
router.add('/home', () => 'HomeComponent');
router.add('/product/:id', ({ params }) => `Product:${params.id}`);

router.navigate('/home');
assert.strictEqual(router.currentPath, '/home');

router.navigate('/product/42');
assert.strictEqual(router.currentPath, '/product/42');
assert.strictEqual(router.params.id, '42');
console.log('   ✅ Client router & parameter matching verified.');

// TEST 5: DolphinCSS Engine
console.log('\n🧪 [TEST 5] Testing DolphinCSS Engine...');
const css = DanpheWeb.generateCoreCSS();
assert(css.includes('.filled.primary'));
assert(css.includes('.motion'));
assert(css.includes('.glow'));
assert(css.includes('.glass'));
console.log(`   ✅ DolphinCSS generated ${css.length} bytes of pure polymorphic styles.`);

console.log('\n========================================================');
console.log('🎉 ALL 5 DANPHE-WEB MODULES PASSED 100% SUCCESSFULLY!');
console.log('========================================================\n');
