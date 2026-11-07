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

    const stateMap = new Map();

    const tx = (addr, val) => {
        const key = String(addr);
        stateMap.set(key, val);
        console.log(`📡 [State TX] ${key} = ${val}`);
        if (typeof addr === 'number' || (!isNaN(Number(addr)) && !String(addr).includes(':'))) {
            const numAddr = Number(addr) & 0xFFFF;
            const numVal = typeof val === 'number' ? val : (parseInt(val, 10) || 0);
            devServer.broadcastRegister(numAddr, numVal);
        }
        // Broadcast SSE patch to all browser clients
        if (devServer.sseClients && devServer.sseClients.length > 0) {
            const sseData = JSON.stringify({ type: 'patch', key: key, value: val });
            devServer.sseClients.forEach(client => {
                try { client.write(`data: ${sseData}\n\n`); } catch(e) {}
            });
        }
    };

    const rx = (addr) => {
        const key = String(addr);
        return stateMap.has(key) ? stateMap.get(key) : 0;
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
            } else if (!isNaN(Number(clean)) && !clean.includes(':')) {
                actionKey = parseInt(clean, 10) & 0xFFFF;
            } else {
                actionKey = clean;
            }
        }

        const handler = appLogic[actionKey] || appLogic[action] || appLogic[String(actionKey)];
        if (typeof handler === 'function') {
            console.log(`⚡ [Pure JS Logic] Executing action: ${actionKey}`);
            try {
                const ctx = { rx, tx, store: null, value, data: value };
                handler(ctx, ctx);
            } catch (err) {
                console.error(`❌ [Logic Error] ${actionKey}:`, err.message);
            }
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
