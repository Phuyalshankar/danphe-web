'use strict';

const path = require('path');
const fs = require('fs');
const { DevServer } = require('./src/runtime/DevServer');

// Distinct Port for Danphe-Web (to prevent collision with Danphe-Native APK ports 9090/9091)
const httpPort = parseInt(process.env.HTTP_PORT || process.argv[2] || '7080', 10);
const tcpPort = parseInt(process.env.TCP_PORT || process.argv[3] || '7081', 10);

const devServer = new DevServer({
    host: '0.0.0.0',
    port: tcpPort,
    httpPort: httpPort,
    watchDir: process.env.WATCH_DIR || __dirname
});

// ⚡ Auto-Wire Logic / Circuit Modules into DevServer for Zero-VDOM Web Reactivity
// Supports both 'app.logic.js' / 'logics/' (Web Developer Model) and 'circuits/' (Hardware/Native Model)
try {
    let appLogic = {};

    const candidates = [
        path.join(__dirname, 'app.logic.js'),
        path.join(__dirname, 'logics', 'main.logic.js'),
        path.join(__dirname, 'circuits', 'main.circuit.js'),
        path.join(__dirname, 'circuits', 'counter.circuit.js')
    ];

    for (const c of candidates) {
        if (fs.existsSync(c)) {
            try {
                const mod = require(c);
                appLogic = Object.assign(appLogic, mod);
            } catch (_) {}
        }
    }

    // Auto-discover all files in logics/ directory if present
    const logicsDir = path.join(__dirname, 'logics');
    if (fs.existsSync(logicsDir)) {
        fs.readdirSync(logicsDir).filter(f => f.endsWith('.js')).forEach(f => {
            try {
                const subMod = require(path.join(logicsDir, f));
                appLogic = Object.assign(appLogic, subMod);
            } catch (_) {}
        });
    }

    const registers = new Map();

    const tx = (addr, val) => {
        const numAddr = Number(addr) & 0xFFFF;
        const numVal = typeof val === 'number' ? val : (parseInt(val, 10) || 0);
        registers.set(numAddr, numVal);
        devServer.broadcastRegister(numAddr, numVal);
    };

    const rx = (addr) => {
        const numAddr = Number(addr) & 0xFFFF;
        return registers.has(numAddr) ? registers.get(numAddr) : 0;
    };

    // Initialize initial logic state values
    for (const [key, node] of Object.entries(appLogic)) {
        if (node && node.address !== undefined && node.initialValue !== undefined) {
            registers.set(node.address & 0xFFFF, node.initialValue);
        }
    }

    devServer.attachApp((action, value, deviceId) => {
        if (!action) return;
        let actionAddr = null;
        if (typeof action === 'number') {
            actionAddr = action & 0xFFFF;
        } else if (typeof action === 'string') {
            const clean = action.replace(/^bus:/i, '').trim();
            if (clean.startsWith('0x') || clean.startsWith('0X')) {
                actionAddr = parseInt(clean, 16) & 0xFFFF;
            } else if (!isNaN(Number(clean))) {
                actionAddr = parseInt(clean, 10) & 0xFFFF;
            }
        }

        if (actionAddr !== null) {
            for (const [key, node] of Object.entries(appLogic)) {
                if (node && (node.address & 0xFFFF) === actionAddr && typeof node.onReceive === 'function') {
                    console.log(`⚡ [Logic Engine] Executing node "${key}" on address 0x${actionAddr.toString(16)} (${actionAddr})`);
                    node.onReceive(value, { tx, rx, store: null });
                    return;
                }
            }
        }
    });

    console.log('⚡ [Danphe Web] Logic & Circuit Modules Successfully Mounted');
} catch (e) {
    console.warn('⚠️ [Server] Logic auto-wire skipped:', e.message);
}

devServer.start().catch((err) => {
    console.error('❌ Failed to start Danphe Dev Server:', err);
    process.exit(1);
});
