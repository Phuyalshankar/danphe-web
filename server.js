'use strict';

const path = require('path');
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

// ⚡ Auto-Wire Hardware Circuits into DevServer for Zero-VDOM Web Reactivity
try {
    const mainCircuit = require('./circuits/main.circuit');
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

    // Initialize initial circuit state values
    for (const [key, node] of Object.entries(mainCircuit)) {
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
            for (const [key, node] of Object.entries(mainCircuit)) {
                if (node && (node.address & 0xFFFF) === actionAddr && typeof node.onReceive === 'function') {
                    console.log(`⚡ [Circuit Engine] Executing node "${key}" on address 0x${actionAddr.toString(16)} (${actionAddr})`);
                    node.onReceive(value, { tx, rx, store: null });
                    return;
                }
            }
        }
    });

    console.log('⚡ [Danphe Web] Hardware Motherboard Circuits Successfully Mounted');
} catch (e) {
    console.warn('⚠️ [Server] Circuit auto-wire skipped:', e.message);
}

devServer.start().catch((err) => {
    console.error('❌ Failed to start Danphe Dev Server:', err);
    process.exit(1);
});
