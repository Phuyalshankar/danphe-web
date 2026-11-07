'use strict';

const assert = require('assert');
const commands = require('../commands');

/**
 * 🧪 Unit Tests for DolphinJS CLI Module (`src/cli`)
 */
function runCLITests() {
    console.log('🧪 Running Dolphin CLI Engine Unit Tests...');

    // Test 1: Command Exports Check
    assert.strictEqual(typeof commands.cmdInit, 'function');
    assert.strictEqual(typeof commands.cmdDev, 'function');
    assert.strictEqual(typeof commands.cmdBuild, 'function');
    assert.strictEqual(typeof commands.cmdAndroid, 'function');
    assert.strictEqual(typeof commands.cmdDoctor, 'function');
    console.log('   ✅ CLI Command Exports Test Passed');

    console.log('🎉 All CLI Engine Unit Tests Passed Successfully!\n');
}

if (require.main === module) {
    runCLITests();
}

module.exports = { runCLITests };
