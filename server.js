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

// ⚡ Pure JavaScript Logic Engine (Zero Circuits, Zero Hardware Bloat)
try {
    let appLogic = {};
    const logicPath = path.join(__dirname, 'app.logic.js');
    if (fs.existsSync(logicPath)) {
        appLogic = require(logicPath);
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

    // Attach Pure JS Action Handler
    devServer.attachApp((action, value, deviceId) => {
        if (!action) return;
        let actionKey = null;
        if (typeof action === 'number') {
            actionKey = action & 0xFFFF;
        } else if (typeof action === 'string') {
            const clean = action.replace(/^bus:/i, '').trim();
            if (clean.startsWith('0x') || clean.startsWith('0X')) {
                actionKey = parseInt(clean, 16) & 0xFFFF;
            } else if (!isNaN(Number(clean))) {
                actionKey = parseInt(clean, 10) & 0xFFFF;
            } else {
                actionKey = clean;
            }
        }

        const handler = appLogic[actionKey] || appLogic[action] || appLogic[String(actionKey)];
        if (typeof handler === 'function') {
            console.log(`⚡ [Pure JS Logic] Executing action: ${actionKey}`);
            handler(value, { rx, tx, store: null });
        }
    });

    console.log('⚡ [Danphe Web] Pure JavaScript Logic Engine Successfully Mounted');
} catch (e) {
    console.warn('⚠️ [Server] Logic mount warning:', e.message);
}

devServer.start().catch((err) => {
    console.error('❌ Failed to start Danphe Dev Server:', err);
    process.exit(1);
});
