'use strict';

const assert = require('assert');
const AndroidPrereqChecker = require('../AndroidPrereqChecker');
const AdbDeployer = require('../AdbDeployer');

/**
 * 🧪 Unit Tests for DolphinJS Android Build Engine (`src/android`)
 */
function runAndroidBuilderTests() {
    console.log('🧪 Running Dolphin Android Build Engine Unit Tests...');

    // Test 1: Check Java Environment
    const javaCheck = AndroidPrereqChecker.checkJava();
    assert.strictEqual(typeof javaCheck, 'boolean');
    console.log('   ✅ Java Prerequisite Check Test Passed');

    // Test 2: ADB Executable Path
    const adbPath = AdbDeployer.getAdbExecutable();
    assert.ok(adbPath.length > 0);
    console.log('   ✅ ADB Executable Resolution Test Passed');

    console.log('🎉 All Android Build Engine Unit Tests Passed Successfully!\n');
}

if (require.main === module) {
    runAndroidBuilderTests();
}

module.exports = { runAndroidBuilderTests };
