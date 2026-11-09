'use strict';

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const net   = require('net');
const dgram = require('dgram');
const { EventEmitter } = require('events');

let titanBusClient = null;
try {
    titanBusClient = require('../core');
} catch (e) {
    try {
        titanBusClient = require('titan-bus-client');
    } catch (e1) {
        try {
            titanBusClient = require(path.resolve(__dirname, '../../../titan-bus-client'));
        } catch (_) {}
    }
}

let TitanBus = null;
let TitanMicroBusEngine = null;
let TitanDeclarative = null;
let EverestBus = null;
let REG = {};

try {
    const tb = require('D:/titan-bus');
    TitanBus = tb.TitanBus;
    TitanMicroBusEngine = tb.TitanMicroBusEngine;
    TitanDeclarative = tb.TitanDeclarative;
    EverestBus = tb.EverestBus || tb.TitanBus;
} catch (e) {
    try {
        const tb = require('titan-bus');
        TitanBus = tb.TitanBus;
        TitanMicroBusEngine = tb.TitanMicroBusEngine;
        TitanDeclarative = tb.TitanDeclarative;
        EverestBus = tb.EverestBus || tb.TitanBus;
    } catch (_) {
        try {
            const busMod = require('../bus');
            EverestBus = busMod.EverestBus;
            TitanBus = busMod.EverestBus;
            REG = busMod.REG || {};
        } catch (_) {}
    }
}

class DolphinServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.host = options.host || '0.0.0.0';
        this.port = options.port || 9091;
        this.devices = new Map();
        this.extensionMap = new Map();

        const handleConnection = (socket) => {
            const id = Math.random().toString(36).substring(7);
            const addr = socket.remoteAddress;
            const device = { id, addr, status: 'CONNECTED', socket, connectedAt: Date.now() };
            this.devices.set(id, device);

            this.emit('deviceConnected', { id, addr });

            let accumulated = Buffer.alloc(0);

            socket.on('data', (data) => {
                accumulated = Buffer.concat([accumulated, data]);

                while (accumulated.length >= 2) {
                    // 1. ⚡ Micro SISO 6-byte Stream: 'SI' (0x5349)
                    if (accumulated[0] === 0x53 && accumulated[1] === 0x49) {
                        if (accumulated.length < 6) break;
                        const reg = accumulated.readUInt16BE(2);
                        const val = accumulated.readInt16BE(4);
                        const sisoPacket = accumulated.slice(0, 6);
                        accumulated = accumulated.slice(6);

                        this.emit('sisoPacket', { id, reg, val, raw: sisoPacket });
                        continue;
                    }

                    // 2. ⚡ Secure SISO 7-byte Stream: 'SS' (0x5353)
                    if (accumulated[0] === 0x53 && accumulated[1] === 0x53) {
                        if (accumulated.length < 7) break;
                        const sisoPacket = accumulated.slice(0, 7);
                        accumulated = accumulated.slice(7);

                        this.emit('sisoSecurePacket', { id, raw: sisoPacket });
                        continue;
                    }

                    // 3. ⚡ Titan-Bus Stream: 'TB' (0x5442) - Supports both 6-byte register frames & 24-byte macro packets
                    if (accumulated[0] === 0x54 && accumulated[1] === 0x42) {
                        // Check if 6-byte register packet (common in titan-bus & diodes)
                        if (accumulated.length >= 6 && accumulated[2] !== 0x00 && accumulated[3] !== 0x02) {
                            const reg = accumulated.readUInt16BE(2);
                            const val = accumulated.readInt16BE(4);
                            const sisoPacket = accumulated.slice(0, 6);
                            accumulated = accumulated.slice(6);

                            this.emit('sisoPacket', { id, reg, val, raw: sisoPacket });
                            continue;
                        }

                        // Otherwise 24-byte macro packet
                        if (accumulated.length < 24) break;
                        const payLen = accumulated.readUInt32BE(12);
                        if (accumulated.length < 24 + payLen) break;
                        const macroPacket = accumulated.slice(0, 24 + payLen);
                        accumulated = accumulated.slice(24 + payLen);

                        this.emit('titanMacroPacket', { id, raw: macroPacket });
                        continue;
                    }

                    // 4. HotPatch 5-byte protocol header
                    if (accumulated.length < 5) break;
                    const cmd = accumulated[0];
                    const payLen = accumulated.readUInt32LE(1);

                    if (accumulated.length >= 5 + payLen) {
                        const payload = accumulated.slice(5, 5 + payLen);

                        if (cmd === 0x06 /* ACK */) {
                            this.emit('ack', id, payload.toString());
                        } else if (cmd === 0x07 /* ACTION */) {
                            const actionLen = payload[0];
                            const action = payload.slice(1, 1 + actionLen).toString();
                            const value = payload.slice(1 + actionLen).toString();
                            this.emit('deviceAction', { id, action, value });
                        } else if (cmd === 0x08 /* PATCH_STATE */) {
                            const keyLen = payload[0];
                            const key = payload.slice(1, 1 + keyLen).toString();
                            const value = payload.slice(1 + keyLen).toString();
                            this.emit('devicePatchState', { id, key, value });
                        } else if (cmd === 0x05 /* PONG */) {
                            // heartbeat response
                        }

                        accumulated = accumulated.slice(5 + payLen);
                    } else {
                        break;
                    }
                }
            });

            socket.on('error', () => {});
            socket.on('close', () => {
                if (device.extension) {
                    this.extensionMap.delete(device.extension);
                    console.log(`🔌 [DevServer] Node Extension #${device.extension} disconnected`);
                }
                this.devices.delete(id);
                this.emit('deviceDisconnected', id);
            });
        };

        this.server = net.createServer(handleConnection);
        this.compatServer = net.createServer(handleConnection);

        // Ping heartbeat every 8 seconds
        setInterval(() => {
            const pingMsg = Buffer.from([0x04, 0, 0, 0, 0]);
            for (const dev of this.devices.values()) {
                try { dev.socket.write(pingMsg); } catch(e) {}
            }
        }, 8000);
    }

    start() {
        this.server.listen(this.port, this.host, () => {
            console.log(`✅ Danphe TCP Server listening on ${this.host}:${this.port}`);
        });
        if (this.port !== 7788) {
            try {
                this.compatServer.listen(7788, this.host, () => {
                    console.log(`✅ Danphe TCP Server also listening on ${this.host}:7788 (HotPatch Compatibility)`);
                });
                this.compatServer.on('error', () => {});
            } catch (_) {}
        }
    }

    sendToDevice(id, data, opcode) {
        const header = Buffer.alloc(5);
        header.writeUInt8(opcode, 0);
        header.writeUInt32LE(data ? data.length : 0, 1);
        const payload = data ? Buffer.concat([header, data]) : header;

        if (id) {
            const device = this.devices.get(id);
            if (device) {
                try { device.socket.write(payload); } catch(e) {}
            }
        } else {
            for (const device of this.devices.values()) {
                try { device.socket.write(payload); } catch(e) {}
            }
        }
    }

    patchState(deviceId, key, value) {
        if (!key || key === 'undefined' || key === 'null' || key === 'value') return;
        const keyBuf = Buffer.from(String(key), 'utf8');
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const valBuf = Buffer.from(valStr, 'utf8');
        const payload = Buffer.alloc(1 + keyBuf.length + valBuf.length);

        payload[0] = keyBuf.length;
        keyBuf.copy(payload, 1);
        valBuf.copy(payload, 1 + keyBuf.length);

        this.sendToDevice(deviceId, payload, 0x08 /* PATCH_STATE */);
    }

    patchScreen(deviceId, name, screen) {
        const nameBuf = Buffer.from(name, 'utf8');
        const binary = screen.binary || Buffer.alloc(0);
        const rawData = screen.rawData || Buffer.alloc(0);

        const compCount = (binary.length / 24) | 0;
        const payload = Buffer.alloc(1 + nameBuf.length + 4 + 4 + binary.length + rawData.length);

        payload[0] = nameBuf.length;
        nameBuf.copy(payload, 1);
        payload.writeUInt32LE(compCount, 1 + nameBuf.length);
        payload.writeUInt32LE(rawData.length, 1 + nameBuf.length + 4);
        binary.copy(payload, 1 + nameBuf.length + 8);
        rawData.copy(payload, 1 + nameBuf.length + 8 + binary.length);

        if (deviceId) {
            this.sendToDevice(deviceId, payload, 0x02 /* PATCH_SCREEN */);
        } else {
            this.broadcast(payload, 0x02 /* PATCH_SCREEN */);
        }
    }

    broadcast(data, opcode, excludeId = null) {
        let sent = 0;
        const header = Buffer.alloc(5);
        header.writeUInt8(opcode, 0);
        header.writeUInt32LE(data ? data.length : 0, 1);
        const payload = data ? Buffer.concat([header, data]) : header;

        for (const [id, dev] of this.devices.entries()) {
            if (excludeId && id === excludeId) continue;
            try {
                dev.socket.write(payload);
                sent++;
            } catch(e) {}
        }
        return sent;
    }

    broadcastRegister(reg, val) {
        const targetReg = Number(reg) & 0xFFFF;
        const targetVal = Number(val);
        if (isNaN(targetReg) || isNaN(targetVal)) return 0;
        const pkt = Buffer.alloc(6);
        pkt[0] = 0x53; pkt[1] = 0x49; // 'SI' (Micro SISO)
        pkt.writeUInt16BE(targetReg, 2);
        pkt.writeUInt16BE(targetVal & 0xFFFF, 4);
        let sent = 0;
        for (const [id, dev] of this.devices.entries()) {
            try {
                dev.socket.write(pkt);
                sent++;
            } catch(e) {}
        }
        return sent;
    }

    getConnectedDevices() {
        return Array.from(this.devices.values()).map(d => ({
            id: d.id,
            addr: d.addr,
            status: d.status,
            connectedAt: d.connectedAt || Date.now()
        }));
    }
}

class DevServer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.host = options.host || '0.0.0.0';
        this.port = options.port || 9091; // TCP
        this.httpPort = options.httpPort || 9090; // HTTP Dashboard (9090)
        this.watchDir = options.watchDir || path.resolve(__dirname, '../..');

        this.server = new DolphinServer({ host: this.host, port: this.port });
        this.httpServer = null;

        this._bundle = null;
        this._loadExistingBundle();

        this._patchCount = 0;
        this._ackCount = 0;
        this._startTime = Date.now();
        this._appActionHandler = null;

        this._sseClients = new Set();
        this.sseClients = [];
        this.deviceScreens = {};

        global.danpheDevServer = this;
    }

    _loadExistingBundle() {
        try {
            const distDir = path.join(this.watchDir, 'dist');
            if (fs.existsSync(distDir)) {
                const dolpFiles = fs.readdirSync(distDir)
                    .filter(f => f.endsWith('.dolp'))
                    .map(f => ({ name: f, path: path.join(distDir, f), mtime: fs.statSync(path.join(distDir, f)).mtimeMs }))
                    .sort((a, b) => b.mtime - a.mtime);
                if (dolpFiles.length > 0) {
                    this._bundle = fs.readFileSync(dolpFiles[0].path);
                    return;
                }
            }
        } catch (_) {}
    }

    attachApp(handler) {
        this._appActionHandler = handler;
        console.log('🔗 [Danphe DevServer] App action handler attached');
    }

    patchState(deviceId, key, value, excludeId = null) {
        if (!key || key === 'undefined' || key === 'null' || key === 'value') return;
        const keyBuf = Buffer.from(String(key), 'utf8');
        const valBuf = Buffer.from(String(value !== undefined && value !== null ? value : ''), 'utf8');
        const payload = Buffer.alloc(1 + keyBuf.length + valBuf.length);
        payload.writeUInt8(keyBuf.length, 0);
        keyBuf.copy(payload, 1);
        valBuf.copy(payload, 1 + keyBuf.length);

        if (deviceId) {
            this.server.sendToDevice(deviceId, payload, 0x08 /* PATCH_STATE */);
        } else {
            this.server.broadcast(payload, 0x08 /* PATCH_STATE */, excludeId);
        }

        // Live SSE push to connected web clients
        if (this.sseClients && this.sseClients.length > 0) {
            const sseData = JSON.stringify({ type: 'patch', key, value });
            this.sseClients.forEach(client => {
                try { client.write(`data: ${sseData}\n\n`); } catch(e) {}
            });
        }
    }

    broadcastRegister(reg, val) {
        const targetReg = Number(reg) & 0xFFFF;
        const targetVal = Number(val);
        if (isNaN(targetReg) || isNaN(targetVal)) return;

        if (EverestBus) {
            try { EverestBus.write(targetReg, targetVal); } catch(_) {}
        }

        if (typeof this.server.broadcastRegister === 'function') {
            this.server.broadcastRegister(targetReg, targetVal);
        }

        if (this.sseClients && this.sseClients.length > 0) {
            const sseData = JSON.stringify({ type: 'register', reg: targetReg, val: targetVal });
            this.sseClients.forEach(client => {
                try { client.write(`data: ${sseData}\n\n`); } catch(e) {}
            });
        }
    }

    async start() {
        this.server.start();
        this._startUDPDiscovery();

        this.server.on('deviceConnected', (device) => {
            console.log(`✅ Device ${device.id} connected (${device.addr})`);
            if (this._bundle) {
                this.server.sendToDevice(device.id, this._bundle, 0x01); // FULL_RELOAD
            }

            // ⚡ TITAN-BUS MASTER AUTHORITATIVE REGISTER SYNC
            // Titan-Bus is the single source of truth and shares current register states to all connected devices
            // Titan Bus transparent sync (only sync live EverestBus registers if any exist)
            if (EverestBus && typeof EverestBus.getAllRegisters === 'function') {
                try {
                    const activeRegs = EverestBus.getAllRegisters();
                    for (const [r, v] of Object.entries(activeRegs)) {
                        const pkt = Buffer.alloc(6);
                        pkt[0] = 0x53; pkt[1] = 0x49;
                        pkt.writeUInt16BE(Number(r) & 0xFFFF, 2);
                        pkt.writeInt16BE(Number(v), 4);
                        try { device.socket.write(pkt); } catch(_) {}
                    }
                } catch(_) {}
            }

            this._notify();
        });

        this.server.on('deviceDisconnected', (id) => {
            console.log(`Log: Device ${id} disconnected`);
            delete this.deviceScreens[id];
            this._notify();
        });

        this.server.on('devicePatchState', ({ id, key, value }) => {
            this.patchState(null, key, value, id);
        });

        this.server.on('sisoPacket', ({ id, reg, val, raw }) => {
            console.log(`⚡ [Titan SISO] 6B Packet [${id}]: Reg 0x${reg.toString(16).toUpperCase()} (${reg}) = ${val}`);
            
            if (EverestBus) {
                try { EverestBus.write(reg, val); } catch(_) {}
            }

            // Broadcast raw 6-byte SISO frame to all other connected devices (LVGL simulator, Android, etc.)
            for (const [devId, dev] of this.server.devices.entries()) {
                if (devId !== id) {
                    try { dev.socket.write(raw); } catch(_) {}
                }
            }

            // Push register update to web SSE clients
            if (this.sseClients && this.sseClients.length > 0) {
                const sseData = JSON.stringify({ type: 'register', reg, val });
                this.sseClients.forEach(client => {
                    try { client.write(`data: ${sseData}\n\n`); } catch(e) {}
                });
            }
        });

        this.server.on('titanMacroPacket', ({ id, raw }) => {
            const cmd = raw.length > 3 ? raw.readUInt8(3) : 0;
            const sender = raw.length >= 8 ? raw.readInt32BE(4) : 0;
            const target = raw.length >= 12 ? raw.readInt32BE(8) : 0;
            const payLen = raw.length >= 16 ? raw.readUInt32BE(12) : 0;

            const dev = this.server.devices.get(id);

            // 1. Handle Registration: CMD_REGISTER (0x00)
            if (cmd === 0x00) {
                if (sender > 0 && dev) {
                    dev.extension = sender;
                    this.server.extensionMap.set(sender, dev);
                    console.log(`✅ [DevServer] Node Registered: #${sender} (${dev.addr}) [Total Nodes: ${this.server.extensionMap.size}]`);
                    const ack = Buffer.from("REGISTERED");
                    const ackPacket = Buffer.alloc(24 + ack.length);
                    ackPacket.writeUInt16BE(0x5442, 0); // 'TB'
                    ackPacket.writeUInt8(0x02, 2);      // Version
                    ackPacket.writeUInt8(0x05, 3);      // CMD_REGISTER_ACK
                    ackPacket.writeInt32BE(0, 4);       // Sender: Server
                    ackPacket.writeInt32BE(sender, 8);  // Target: Node
                    ackPacket.writeUInt32BE(ack.length, 12);
                    ackPacket.writeUInt32BE(1, 16);     // Seq
                    ackPacket.writeUInt16BE(0, 20);     // Session
                    ackPacket.writeUInt8(0, 22);        // Flags
                    ackPacket.writeUInt8(0xAA, 23);     // Checksum
                    ack.copy(ackPacket, 24);
                    try { dev.socket.write(ackPacket); } catch(_) {}
                }
                return;
            }

            // 2. Direct P2P Routing by Target Extension
            if (target > 0) {
                if (target === sender && sender > 0) {
                    console.log(`⚠️ [DevServer] Dropped self-loopback: Node #${sender} tried calling itself`);
                    return;
                }

                const targetDev = this.server.extensionMap.get(target);
                if (targetDev && targetDev.socket && !targetDev.socket.destroyed) {
                    console.log(`⚡ [P2P Route] #${sender} ──► #${target} (CMD 0x${cmd.toString(16).toUpperCase()} ${payLen}B)`);
                    try { targetDev.socket.write(raw); } catch (_) {}
                } else {
                    console.log(`⚠️ [DevServer] Target node #${target} is not online! (Sender: #${sender})`);
                }
                return;
            }

            // 3. Fallback broadcast for non-targeted packets (target == 0)
            for (const [devId, otherDev] of this.server.devices.entries()) {
                if (devId !== id) {
                    try { otherDev.socket.write(raw); } catch(_) {}
                }
            }
        });

        this.server.on('deviceAction', ({ id, action, value }) => {
            if (action && action.startsWith('nav:')) {
                this.deviceScreens[id] = action.substring(4);
            }

            let targetReg = null;
            let targetVal = 0;

            if (action && action.startsWith('bus:')) {
                const parts = action.split(':');
                if (parts[1] === 'write') {
                    targetReg = parts[2].startsWith('0x') ? parseInt(parts[2], 16) : parseInt(parts[2], 10);
                    targetVal = parts[3] !== undefined ? parseInt(parts[3], 10) : (parseInt(value, 10) || 0);
                } else {
                    targetReg = parts[1].startsWith('0x') ? parseInt(parts[1], 16) : parseInt(parts[1], 10);
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed)) {
                        targetVal = parsed;
                    } else {
                        // Discrete 1-Bit Toggle Rule when button tapped without explicit value
                        let curVal = 0;
                        if (EverestBus) {
                            try { curVal = EverestBus.read(targetReg) || 0; } catch(_) {}
                        }
                        targetVal = curVal === 1 ? 0 : 1;
                    }
                }
            }

            if (targetReg !== null && !isNaN(targetReg) && !isNaN(targetVal)) {
                this.broadcastRegister(targetReg, targetVal);
                console.log(`📡 [Titan SISO Bus] Action "${action}" → Reg 0x${(targetReg & 0xFFFF).toString(16).toUpperCase()} (${targetReg}) = ${targetVal} dispatched to ${this.server.devices.size} device(s)`);
            }

            console.log(`⚡ Device Tap Action [${id}]: ${action} = ${value}`);
            if (this._appActionHandler) {
                try { this._appActionHandler(action, value, id); } catch(e) {}
            }
        });

        this.server.on('ack', (id, msg) => {
            this._ackCount++;
            console.log(`⚡ ACK from ${id}: ${msg}`);
            this._notify();
        });

        this._startHTTP();
        this._startWatcher();

        const localIP = this._getLocalIP();
        console.log('\n🇳🇵 🐬 DANPHE-WEB REACTIVE DEV SERVER');
        console.log('─────────────────────────────────────────────────────────────────');
        console.log(`🌐 Live Web App:      http://localhost:${this.httpPort}/`);
        console.log(`📱 Network Access:    http://${localIP}:${this.httpPort}/`);
        console.log(`🔌 TCP Binary Engine: ${localIP}:${this.port}`);
        console.log('─────────────────────────────────────────────────────────────────\n');

        this.emit('ready');
    }

    pushReload(bundle) {
        if (bundle && bundle.length > 0) {
            this._bundle = bundle;
            return this.server.broadcast(bundle, 0x01 /* FULL_RELOAD */);
        }
        return 0;
    }

    _startWatcher() {
        const candidateAppPaths = [
            path.resolve(this.watchDir, 'app.jsx'),
            path.resolve(this.watchDir, 'app.js'),
            path.resolve(process.cwd(), 'app.jsx'),
            path.resolve(process.cwd(), 'app.js')
        ];
        const appPath = candidateAppPaths.find(p => fs.existsSync(p));
        if (!appPath) return;

        console.log(`👁️ [HotPatch Watcher] Watching for changes in: ${appPath}`);
        let debounceTimer = null;

        const recompileAndPush = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                console.log(`\n⚡ [HotPatch Watcher] Change detected, compiling new bundle...`);
                try {
                    // Bust require cache for all project files so updated pages/components are freshly evaluated
                    Object.keys(require.cache).forEach(k => {
                        if (k.startsWith(this.watchDir) || k.includes('components') || k.includes('pages') || k.includes('registers')) {
                            delete require.cache[k];
                        }
                    });

                    const { buildBundle } = require('../cli/helpers/buildBundle');
                    const bundleRes = buildBundle(appPath, {});
                    this._bundle = bundleRes.buffer;

                    // Automatically persist to dist/app.dolp and assets/app.dolp so server restarts never load stale bundles!
                    try {
                        const distBundlePath = path.join(this.watchDir, 'dist', 'app.dolp');
                        fs.mkdirSync(path.dirname(distBundlePath), { recursive: true });
                        fs.writeFileSync(distBundlePath, this._bundle);
                        const assetsBundlePath = path.join(this.watchDir, '.danphe-android', 'app', 'src', 'main', 'assets', 'app.dolp');
                        if (fs.existsSync(path.dirname(assetsBundlePath))) {
                            fs.writeFileSync(assetsBundlePath, this._bundle);
                        }
                    } catch (persistErr) {
                        console.warn(`⚠️ Failed to persist bundle: ${persistErr.message}`);
                    }

                    const sent = this.server.broadcast(this._bundle, 0x01 /* FULL_RELOAD */);
                    const screenNames = bundleRes.screens ? bundleRes.screens.map(s => s.name).join(', ') : 'Home';
                    console.log(`🚀 [HotPatch Watcher] Pushed new bundle (${this._bundle.length} bytes, screens: [${screenNames}]) to ${sent} connected device(s)!`);

                    // Live SSE push to connected web browsers
                    if (this.sseClients && this.sseClients.length > 0) {
                        this.sseClients.forEach(c => {
                            try { c.write(`data: ${JSON.stringify({ type: 'reload' })}\n\n`); } catch(_) {}
                        });
                    }
                } catch (err) {
                    console.error(`❌ [HotPatch Watcher] Compilation error: ${err.message}`);
                }
            }, 150);
        };
        this.recompileAndPush = recompileAndPush;

        try {
            fs.watch(path.dirname(appPath), { recursive: true }, (eventType, filename) => {
                if (!filename) return;
                const fn = filename.replace(/\\/g, '/');
                if (fn.includes('node_modules') || fn.includes('.dolphin-android') || fn.includes('.danphe-android') || fn.includes('dist/') || fn.includes('data/') || fn.includes('build/') || fn.includes('.git')) return;
                if (fn.endsWith('.jsx') || fn.endsWith('.dolphin') || fn === 'app.js' || fn.startsWith('components/') || fn.startsWith('pages/') || fn.startsWith('registers/')) {
                    recompileAndPush();
                }
            });
        } catch (e) {
            try {
                fs.watch(appPath, () => recompileAndPush());
            } catch (err2) {
                console.warn(`⚠️ Could not attach fs.watch: ${err2.message}`);
            }
        }

        // ⚡ Immediate initial compilation on DevServer boot so memory and dist/app.dolp are never stale!
        recompileAndPush();
    }

    _startUDPDiscovery() {
        const DISCOVERY_PORT = 9092;
        const udpServer = dgram.createSocket('udp4');

        udpServer.on('error', (err) => {
            console.error(`⚠️ UDP Discovery error: ${err.message}`);
            udpServer.close();
        });

        udpServer.on('message', (msg, rinfo) => {
            const text = msg.toString().trim();
            if (text.includes('DISCOVER') || text.includes('DOLPHIN') || text.includes('DANPHE')) {
                const localIP = this._getLocalIP();
                const reply = Buffer.from(text.includes('REQUEST') 
                    ? `DOLPHIN_SERVER_HERE:${localIP}` 
                    : `DOLPHIN_OFFER:ip=${localIP};tcpPort=${this.port};httpPort=${this.httpPort}`);
                udpServer.send(reply, rinfo.port, rinfo.address, (err) => {
                    if (!err) {
                        console.log(`📡 UDP Discovery: Sent Offer to ${rinfo.address} (${text}) → ${localIP}`);
                    }
                });
            }
        });

        udpServer.bind(DISCOVERY_PORT, '0.0.0.0', () => {
            try { udpServer.setBroadcast(true); } catch (_) {}
            console.log(`✅ UDP Auto-Discovery listening on port ${DISCOVERY_PORT}`);
        });

        this._udpServer = udpServer;
    }

    _startHTTP() {
        const cors = (res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id');
        };

        this.httpServer = http.createServer((req, res) => {
            if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

            let url = req.url.split('?')[0];
            if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);

            const cleanUrl = decodeURIComponent(url);

            // 🐬 0. Direct DolphinCSS Desktop Live Development Highway (Priority: Desktop > Local > NPM)
            if (cleanUrl === '/dolphincss.css' || cleanUrl === '/dolphin-css.css' || cleanUrl === '/assets/cdn/dolphin-css.css' || cleanUrl.startsWith('/node_modules/dolphincss/')) {
                let dolphinCssPath = null;
                // १. पहिलो प्राथमिकता: सिधै डेस्कटप स्रोतबाट प्रत्यक्ष लोड (Live Desktop Source)
                const desktopPath = 'C:\\Users\\USER\\Desktop\\dolphincss\\dolphincss\\dolphin-css.css';
                if (fs.existsSync(desktopPath)) {
                    dolphinCssPath = desktopPath;
                }
                // २. दोस्रो प्राथमिकता: स्थानीय node_modules
                if (!dolphinCssPath || !fs.existsSync(dolphinCssPath)) {
                    const localPath = path.join(this.watchDir, 'node_modules', 'dolphincss', 'dolphin-css.css');
                    if (fs.existsSync(localPath)) dolphinCssPath = localPath;
                }
                // ३. तेस्रो प्राथमिकता: npm require.resolve
                if (!dolphinCssPath || !fs.existsSync(dolphinCssPath)) {
                    try { dolphinCssPath = require.resolve('dolphincss'); } catch (e) {}
                }
                if (dolphinCssPath && fs.existsSync(dolphinCssPath)) {
                    cors(res);
                    const cssBuf = fs.readFileSync(dolphinCssPath);
                    res.writeHead(200, {
                        'Content-Type': 'text/css; charset=utf-8',
                        'Content-Length': cssBuf.length,
                        'Cache-Control': 'public, max-age=86400'
                    });
                    res.end(cssBuf);
                    return;
                }
            }

            // 1. Direct Live Web App (Root: http://localhost:7080/)
            if (url === '' || url === '/' || url === '/web' || url === '/app') {
                const html = this._renderWebApp();
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Length': Buffer.byteLength(html)
                });
                res.end(html);
                return;
            }

            // Optional Dashboard
            if (url === '/dashboard' || url === '/admin') {
                const html = this._renderDashboard();
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Length': Buffer.byteLength(html),
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(html);
                return;
            }

            // 2. Direct Live Web App (http://localhost:9090/)
            if (url === '/' || url === '/web' || url === '/app') {
                const html = this._renderWebApp();
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Length': Buffer.byteLength(html)
                });
                res.end(html);
                return;
            }

            // 2. APK Download Endpoint (WiFi OTA)
            if (url === '/download-apk' || url.endsWith('.apk')) {
                const apkInfo = this._findLatestApk();
                if (apkInfo && fs.existsSync(apkInfo.path)) {
                    res.writeHead(200, {
                        'Content-Type': 'application/vnd.android.package-archive',
                        'Content-Length': apkInfo.stat.size,
                        'Content-Disposition': `attachment; filename="${apkInfo.file}"`,
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0',
                        'Access-Control-Allow-Origin': '*',
                        'Connection': 'keep-alive',
                    });
                    fs.createReadStream(apkInfo.path, { highWaterMark: 4 * 1024 * 1024 }).pipe(res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('APK not found! Run "node build_apk.js" first.');
                }
                return;
            }

            // 3. LVGL & Samsung ThorVG C++ Screen Code Download
            if (url === '/download-cpp' || url === '/download-thorvg') {
                const candidateCppPaths = [
                    path.join(this.watchDir, 'src', 'embedded', 'danphe_thorvg_screen.cpp'),
                    path.join(this.watchDir, 'native', 'danphe_thorvg_screen.cpp'),
                    path.join(this.watchDir, 'dist', 'danphe_thorvg_screen.cpp')
                ];
                const cppFile = candidateCppPaths.find(p => fs.existsSync(p));
                if (cppFile) {
                    const stat = fs.statSync(cppFile);
                    res.writeHead(200, {
                        'Content-Type': 'text/x-c++src; charset=utf-8',
                        'Content-Length': stat.size,
                        'Content-Disposition': 'attachment; filename="danphe_thorvg_screen.cpp"',
                        'Cache-Control': 'no-cache',
                        'Access-Control-Allow-Origin': '*'
                    });
                    fs.createReadStream(cppFile).pipe(res);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('ThorVG / LVGL C++ code not found in src/embedded/danphe_thorvg_screen.cpp');
                }
                return;
            }

            // 4. Server API JSON for Status & Connected Devices
            if (url === '/dolphin/server' || url === '/api/status') {
                cors(res);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                const localIP = this._getLocalIP();
                const apkInfo = this._findLatestApk();
                const deviceArray = this.server.getConnectedDevices().map(d => ({
                    id: d.id,
                    addr: d.addr,
                    screen: this.deviceScreens[d.id] || 'Home',
                    connectedAt: d.connectedAt || Date.now()
                }));
                res.end(JSON.stringify({
                    ips: [localIP],
                    tcpPort: this.port,
                    relayPort: 9092,
                    httpPort: this.httpPort,
                    bundleSize: this._bundle ? this._bundle.length : 0,
                    apkName: apkInfo ? apkInfo.file : null,
                    apkSize: apkInfo ? apkInfo.stat.size : 0,
                    apkMtime: apkInfo ? new Date(apkInfo.stat.mtime).toISOString() : null,
                    devices: deviceArray
                }));
                return;
            }

            // 5. Binary Bundle Download
            if (url === '/bundle' || url === '/app.dolp') {
                if (this._bundle) {
                    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
                    res.end(this._bundle);
                } else {
                    res.writeHead(404);
                    res.end('No bundle loaded yet');
                }
                return;
            }

            // 6. SSE for Live Reloading & State Sync
            if (url === '/sse' || (url === '/events' && req.headers.accept && req.headers.accept.includes('text/event-stream'))) {
                cors(res);
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Connection': 'keep-alive'
                });
                res.write('data: {"type":"connected"}\n\n');
                if (!this.sseClients) this.sseClients = [];
                this.sseClients.push(res);
                // 📡 Immediate Sync of Current Collections & Registers to Web Browser!
                try {
                    const docStorePath = path.join(this.watchDir, 'titan_hotel_docstore.json');
                    if (fs.existsSync(docStorePath)) {
                        const rawDocs = JSON.parse(fs.readFileSync(docStorePath, 'utf8'));
                        // generic collections synced via db:sync
                        res.write(`data: ${JSON.stringify({ type: 'patch', key: 'menu', value: formattedMenu })}\n\n`);
                        res.write(`data: ${JSON.stringify({ type: 'patch', key: 'hotel_menu', value: formattedMenu })}\n\n`);
                        res.write(`data: ${JSON.stringify({ type: 'slot_stream', reg: 0x062a, items: formattedRooms })}\n\n`);
                        res.write(`data: ${JSON.stringify({ type: 'slot_stream', reg: 0x062b, items: formattedMenu })}\n\n`);
                    }
                } catch (e) {}
                req.on('close', () => {
                    const idx = this.sseClients.indexOf(res);
                    if (idx >= 0) this.sseClients.splice(idx, 1);
                });
                return;
            }

            // 7. Interactive Action Endpoint (POST)
            if (url === '/action' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const payload = JSON.parse(body);
                        const { action, value } = payload;
                        if (action) {
                            console.log(`🌐 [Web Action] ${action} (value: ${value})`);
                            this.server.emit('deviceAction', { id: 'web-browser', action, value });
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                        res.end(JSON.stringify({ success: true, action }));
                    } catch(err) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: err.message }));
                    }
                });
                return;
            }

            // 7B. 💽 TitanDisk Direct File Upload & Write to Disk Engine (POST /upload)
            if ((url === '/upload' || url === '/api/upload') && req.method === 'POST') {
                const chunks = [];
                req.on('data', chunk => chunks.push(chunk));
                req.on('end', () => {
                    try {
                        const fileBuffer = Buffer.concat(chunks);
                        const queryParam = req.url.includes('?') ? new URLSearchParams(req.url.split('?')[1]) : null;
                        const reqName = (queryParam && queryParam.get('name')) || `disk_upload_${Date.now()}.jpg`;
                        const safeName = path.basename(reqName).replace(/[^a-zA-Z0-9._-]/g, '_');
                        
                        const fileExt = path.extname(safeName).toLowerCase();
                        const isVideo = ['.mp4', '.mkv', '.webm', '.avi', '.3gp', '.mov'].includes(fileExt);
                        const isAudio = ['.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg'].includes(fileExt);
                        const subFolder = isVideo ? 'videos' : (isAudio ? 'audio' : 'images');
                        
                        const uploadDir = path.join(this.watchDir, 'assets', subFolder);
                        fs.mkdirSync(uploadDir, { recursive: true });
                        const diskFilePath = path.join(uploadDir, safeName);
                        fs.writeFileSync(diskFilePath, fileBuffer);

                        const publicUrl = `/assets/${subFolder}/${safeName}`;
                        console.log(`💽 [TitanDisk Engine] Physical file written to disk: ${diskFilePath} (${fileBuffer.length} bytes)`);

                        const targetKey = (queryParam && (queryParam.get('field') || queryParam.get('key'))) || (isVideo ? 'sys_picked_video_url' : 'sys_picked_image_url');
                        this.emit('deviceAction', { id: 'uploader', action: `input:${targetKey}`, value: publicUrl });
                        this.server.emit('deviceAction', { id: 'uploader', action: `input:${targetKey}`, value: publicUrl });
                        // Also bind directly to gallery_media_url so media players re-render immediately
                        this.emit('deviceAction', { id: 'uploader', action: `input:gallery_media_url`, value: publicUrl });
                        this.server.emit('deviceAction', { id: 'uploader', action: `input:gallery_media_url`, value: publicUrl });
                        this.emit('deviceAction', { id: 'uploader', action: `input:gallery_media_type`, value: isVideo ? 'video' : 'image' });
                        this.server.emit('deviceAction', { id: 'uploader', action: `input:gallery_media_type`, value: isVideo ? 'video' : 'image' });

                        cors(res);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, url: publicUrl, name: safeName, bytes: fileBuffer.length }));
                    } catch (uploadErr) {
                        console.error(`❌ [TitanDisk Engine] Upload error: ${uploadErr.message}`);
                        cors(res);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: uploadErr.message }));
                    }
                });
                return;
            }

            // 8. 💽 TitanDisk Static Stream & RFC 7233 Byte-Range Server Engine
            // cleanUrl reused
            const candidatePaths = [
                path.join(this.watchDir, cleanUrl),
                path.join(this.watchDir, 'assets', cleanUrl.replace(/^\/(assets|disk)\//, '')),
                path.join(this.watchDir, 'public', cleanUrl.replace(/^\/(assets|disk|public)\//, '')),
                path.join(__dirname, '../../..', cleanUrl),
                path.join(__dirname, '../../../assets', cleanUrl.replace(/^\/(assets|disk)\//, ''))
            ];

            const matchedFile = candidatePaths.find(cp => fs.existsSync(cp) && fs.statSync(cp).isFile());
            if (matchedFile) {
                const stat = fs.statSync(matchedFile);
                const fileSize = stat.size;
                const ext = path.extname(matchedFile).toLowerCase();

                const mimeTypes = {
                    '.html': 'text/html; charset=utf-8',
                    '.htm': 'text/html; charset=utf-8',
                    '.css': 'text/css; charset=utf-8',
                    '.js': 'application/javascript; charset=utf-8',
                    '.mjs': 'application/javascript; charset=utf-8',
                    '.ico': 'image/x-icon',
                    '.webp': 'image/webp',
                    '.gif': 'image/gif',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.svg': 'image/svg+xml',
                    '.json': 'application/json; charset=utf-8',
                    '.woff': 'font/woff',
                    '.woff2': 'font/woff2',
                    '.ttf': 'font/ttf',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mkv': 'video/x-matroska',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.dolp': 'application/octet-stream'
                };
                const contentType = mimeTypes[ext] || (ext === '.dolp' || ext === '.bin' || ext === '.apk' ? 'application/octet-stream' : 'text/plain; charset=utf-8');

                const range = req.headers.range;
                if (range) {
                    // RFC 7233 Byte Range Streaming (Supports prefix, suffix, and bounded ranges)
                    let start = 0;
                    let end = fileSize - 1;
                    const matches = range.match(/bytes=(\d*)-(\d*)/);
                    if (matches) {
                        if (!matches[1] && matches[2]) {
                            // Suffix range: bytes=-500 -> last 500 bytes (crucial for MP4 moov atom at end of file)
                            start = Math.max(0, fileSize - parseInt(matches[2], 10));
                            end = fileSize - 1;
                        } else {
                            start = matches[1] ? parseInt(matches[1], 10) : 0;
                            end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;
                        }
                    }

                    if (start >= fileSize || end >= fileSize || start > end) {
                        res.writeHead(416, {
                            'Content-Range': `bytes */${fileSize}`,
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end();
                        return;
                    }

                    const chunksize = (end - start) + 1;
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
                        'Cache-Control': 'no-cache'
                    });

                    if (req.method === 'HEAD') {
                        res.end();
                        return;
                    }

                    fs.createReadStream(matchedFile, { start, end, highWaterMark: 256 * 1024 }).pipe(res);
                } else {
                    res.writeHead(200, {
                        'Content-Length': fileSize,
                        'Accept-Ranges': 'bytes',
                        'Content-Type': contentType,
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                        'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
                        'Cache-Control': 'no-cache'
                    });

                    if (req.method === 'HEAD') {
                        res.end();
                        return;
                    }

                    fs.createReadStream(matchedFile, { highWaterMark: 256 * 1024 }).pipe(res);
                }
                return;
            }

                        // 🌐 Fallback: In SPA Mode, serve web application for HTML routes
            const acceptHeader = req.headers['accept'] || '';
            const isFileReq = path.extname(cleanUrl) !== '' && !cleanUrl.endsWith('.html');
            if (!isFileReq && (acceptHeader.includes('text/html') || cleanUrl.startsWith('/admin') || cleanUrl.startsWith('/room') || cleanUrl.startsWith('/menu') || cleanUrl.startsWith('/guest') || !cleanUrl.includes('.'))) {
                const html = this._renderWebApp();
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Length': Buffer.byteLength(html)
                });
                res.end(html);
                return;
            }

            // Fallback 404
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Danphe Native: 404 Not Found');
        });

        this.httpServer.on('error', err => {
            console.error(`❌ HTTP Server Error: ${err.message}`);
        });

        this.httpServer.listen(this.httpPort, this.host, () => {
            const displayHost = (this.host === '0.0.0.0' || this.host === '::') ? 'localhost' : this.host;
            console.log(`✅ HTTP Dashboard listening on http://${displayHost}:${this.httpPort}`);
        });
    }

    _findLatestApk() {
        const candidateDirs = [
            this.watchDir,
            path.join(this.watchDir, 'dist'),
            path.join(this.watchDir, '.dolphin-android', 'dist'),
            path.join(this.watchDir, '.dolphin-android', 'app', 'build', 'outputs', 'apk', 'release'),
            path.join(this.watchDir, '.dolphin-android', 'app', 'build', 'outputs', 'apk', 'debug'),
            path.join(this.watchDir, 'app', 'dist'),
            path.join(this.watchDir, '.danphe-android', 'dist'),
            path.join(this.watchDir, '.danphe-android', 'app', 'build', 'outputs', 'apk', 'release'),
            path.join(this.watchDir, '.danphe-android', 'app', 'build', 'outputs', 'apk', 'debug'),
            path.join(process.cwd(), 'dist')
        ];

        const allApks = [];
        for (const dir of candidateDirs) {
            if (dir && fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir).filter(f => f.endsWith('.apk'));
                    files.forEach(file => {
                        const fullPath = path.join(dir, file);
                        if (fs.existsSync(fullPath)) {
                            const stat = fs.statSync(fullPath);
                            allApks.push({ file, path: fullPath, stat });
                        }
                    });
                } catch(e) {}
            }
        }

        if (allApks.length === 0) return null;
        allApks.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
        return allApks[0];
    }

    _getLocalIP() {
        const nets = os.networkInterfaces();
        let preferred = null;
        for (const name of Object.keys(nets)) {
            for (const n of nets[name]) {
                const family = typeof n.family === 'string' ? n.family : `IPv${n.family}`;
                if (family === 'IPv4' && !n.internal) {
                    if (n.address.startsWith('192.168.')) return n.address;
                    preferred = n.address;
                }
            }
        }
        return preferred || '127.0.0.1';
    }

    _getStatus() {
        const devices = this.server.getConnectedDevices();
        return {
            running: true,
            uptime: Math.floor((Date.now() - this._startTime) / 1000),
            tcp: devices.length,
            patch: this._patchCount,
            ack: this._ackCount,
            connections: devices
        };
    }

    _notify() {
        const data = JSON.stringify(this._getStatus());
        this._sseClients.forEach(c => {
            try { c.write(`data: ${data}\n\n`); } catch(e) { this._sseClients.delete(c); }
        });
    }

    _renderDashboard() {
        const localIP = this._getLocalIP();
        const apkInfo = this._findLatestApk();

        const apk = apkInfo ? apkInfo.file : null;
        const apkSize = apkInfo ? (apkInfo.stat.size / (1024 * 1024)).toFixed(2) : '0.00';
        const apkMtime = apkInfo ? new Date(apkInfo.stat.mtime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' }) : 'No APK Built Yet';
        const apkTimestamp = apkInfo ? Math.floor(apkInfo.stat.mtimeMs) : Date.now();
        const wifiDownloadUrl = `http://${localIP}:${this.httpPort}/download-apk?t=${apkTimestamp}`;
        const cppDownloadUrl = `http://${localIP}:${this.httpPort}/download-cpp`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Danphe Native | Live WiFi Dashboard & OTA Hub</title>
  <style>
    :root {
      --bg-color: #0b1120;
      --card-bg: rgba(30, 41, 59, 0.7);
      --card-border: rgba(255, 255, 255, 0.1);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --accent-hover: #0284c7;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 'Inter', sans-serif;
    }

    body {
      background: var(--bg-color);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.15), transparent 30%),
        radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.15), transparent 30%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      padding: 2rem 2.5rem;
      text-align: center;
      border-bottom: 1px solid var(--card-border);
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    header h1 {
      font-weight: 800;
      font-size: 2.3rem;
      background: linear-gradient(135deg, #38bdf8, #818cf8, #c084fc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
      letter-spacing: -0.5px;
    }

    header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .nav-pills {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    main {
      flex: 1;
      max-width: 1350px;
      margin: 0 auto;
      padding: 2.5rem;
      width: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 2rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 2rem;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .card:hover {
      transform: translateY(-3px);
      border-color: rgba(56, 189, 248, 0.35);
    }

    .card h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #ffffff;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-online { background-color: var(--success); box-shadow: 0 0 12px var(--success); }
    .status-offline { background-color: var(--danger); box-shadow: 0 0 12px var(--danger); }

    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 0;
      border-bottom: 1px solid var(--card-border);
    }
    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 1.02rem;
    }

    .stat-value {
      font-weight: 600;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 1.1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.65rem;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 1rem 1.6rem;
      border-radius: 12px;
      font-size: 1.15rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.2s ease, transform 0.1s ease;
      width: 100%;
      margin-top: 1.25rem;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    .btn:hover { opacity: 0.93; }
    .btn:active { transform: scale(0.98); }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      box-shadow: none;
    }
    .btn-secondary:hover { background: rgba(255, 255, 255, 0.16); }

    .btn-blue {
      background: linear-gradient(135deg, #0284c7, #38bdf8);
      box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);
    }

    /* QR Code Container */
    .qr-box {
      margin-top: 1.25rem;
      padding: 1rem;
      background: #ffffff;
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qr-caption {
      margin-top: 8px;
      color: #1e293b;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: center;
    }

    /* Device List */
    .device-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .device-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.1rem 1.35rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .device-info h4 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .device-info p {
      color: var(--text-muted);
      font-size: 0.95rem;
      margin-top: 0.25rem;
    }

    .badge {
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.88rem;
      font-weight: 700;
      background: rgba(16, 185, 129, 0.2);
      color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    .empty-state {
      text-align: center;
      color: var(--text-muted);
      padding: 2.5rem 0;
      font-size: 1.1rem;
      font-style: italic;
    }

    @media (max-width: 768px) {
      header { padding: 1.25rem !important; }
      header h1 { font-size: 1.8rem !important; }
      main { padding: 1.25rem !important; gap: 1.25rem !important; }
      .card { grid-column: span 1 !important; padding: 1.35rem !important; }
      .device-item { flex-direction: column; align-items: flex-start; gap: 8px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>🦚 Danphe Native Dashboard</h1>
    <p>Direct JSX Pipeline ➔ Kotlin Android, Samsung ThorVG/LVGL C++ & Web over Titan Bus</p>
    <div class="nav-pills">
      <a href="/dashboard" class="btn btn-blue" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">🦚 Live Server & Device Monitor</a>
      <a href="/download-apk?t=${apkTimestamp}" class="btn" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">📱 Download Android APK</a>
      <a href="/download-cpp" class="btn btn-secondary" style="padding: 10px 22px; font-size: 1rem; width: auto; margin:0;">⚡ Download LVGL C++</a>
    </div>
  </header>

  <main>
    <!-- 1. Server Network Monitor Card -->
    <div class="card">
      <h2>
        <span id="server-indicator" class="status-indicator status-online"></span>
        Server & Network Monitor
      </h2>
      <div class="stat-row">
        <span class="stat-label">WiFi Server IP</span>
        <span class="stat-value" id="stat-ip" style="color: var(--accent);">${localIP}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">TCP Port (Android App)</span>
        <span class="stat-value" id="stat-tcp" style="color: var(--success);">${this.port}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">HTTP Dashboard Port</span>
        <span class="stat-value" id="stat-http">${this.httpPort}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">UDP Auto-Discovery</span>
        <span class="stat-value" style="color: var(--warning);">Port 9092</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">UI Binary Bundle</span>
        <span class="stat-value" id="stat-bundle">${this._bundle ? this._bundle.length.toLocaleString() : '313'} bytes</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Heartbeat Ping</span>
        <span class="stat-value" style="color: var(--success);">8.0s Active</span>
      </div>
    </div>

    <!-- 2. Client APK WiFi Download Card with QR Code -->
    <div class="card">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#10b981" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Android Client APK (WiFi OTA)
      </h2>
      <div class="stat-row">
        <span class="stat-label">Package Name</span>
        <span class="stat-value" id="stat-apk-package">${apk || 'DanpheNative-1.0.0.apk'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">APK Size</span>
        <span class="stat-value" id="stat-apk-size" style="color: var(--success);">${apkSize} MB</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Build Timestamp</span>
        <span class="stat-value" id="stat-apk-time" style="color: var(--warning);">${apkMtime}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">WiFi Target URL</span>
        <span class="stat-value" style="color: var(--accent); font-size: 0.95rem;">${wifiDownloadUrl}</span>
      </div>

      <a id="apk-download-btn" href="/download-apk?t=${apkTimestamp}" download class="btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>
        Download ${apk || 'APK'} (${apkSize} MB)
      </a>

      <!-- Instant Phone Scan QR Code -->
      <div class="qr-box">
        <canvas id="qr-canvas" width="160" height="160"></canvas>
        <span class="qr-caption">📷 Scan with phone camera to download APK via WiFi</span>
      </div>
    </div>

    <!-- 3. Samsung ThorVG & LVGL 9 C++ Screen Pack -->
    <div class="card">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#38bdf8" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/></svg>
        Samsung ThorVG / LVGL 9 Screen
      </h2>
      <div class="stat-row">
        <span class="stat-label">C++ Target</span>
        <span class="stat-value" style="color: var(--accent);">ThorVG 0.12 + LVGL 9</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Source File</span>
        <span class="stat-value" style="color: var(--success);">danphe_thorvg_screen.cpp</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Target Hardware</span>
        <span class="stat-value" style="color: var(--warning);">ESP32-S3 / STM32 / Watch</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Titan Bus Wire</span>
        <span class="stat-value" style="color: var(--accent);">16-bit Hardware Registers</span>
      </div>

      <a id="cpp-download-btn" href="/download-cpp" download class="btn btn-blue">
        ⚡ Download danphe_thorvg_screen.cpp
      </a>
    </div>

    <!-- 4. Connected Devices Live Monitor -->
    <div class="card" style="grid-column: 1 / -1;">
      <h2>
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#38bdf8" viewBox="0 0 16 16"><path d="M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm4-2.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zM9 8a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4A.5.5 0 0 1 9 8zm1 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5z"/><path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2zM1 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8.96c.026-.163.04-.33.04-.5C9 10.567 7.21 9 5 9c-2.086 0-3.8 1.398-3.984 3.181A1.006 1.006 0 0 1 1 12V4z"/></svg>
        Live Connected Devices (TCP Socket & OTA Flow)
      </h2>
      <div id="device-list" class="device-list">
        <div class="empty-state">No devices currently connected. Open Danphe Native App on Android to connect automatically.</div>
      </div>
    </div>
  </main>

  <!-- Lightweight Standalone QR Code Generator Script -->
  <script src="https://cdn.jsdelivr.net/npm/qrious@4.0.2/dist/qrious.min.js"></script>
  <script>
    // Fallback QR code generator if CDN is unavailable offline
    function renderQRCode(text) {
      if (typeof QRious !== 'undefined') {
        new QRious({
          element: document.getElementById('qr-canvas'),
          value: text,
          size: 160,
          background: '#ffffff',
          foreground: '#0b1120'
        });
      } else {
        // Draw graceful fallback on canvas
        const canvas = document.getElementById('qr-canvas');
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 160, 160);
          ctx.fillStyle = '#0f172a';
          ctx.font = '11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('WiFi URL:', 80, 70);
          ctx.font = 'bold 11px monospace';
          ctx.fillStyle = '#0284c7';
          ctx.fillText(location.hostname + ':${this.httpPort}', 80, 95);
        }
      }
    }

    renderQRCode('${wifiDownloadUrl}');

    async function fetchServerStatus() {
      try {
        const res = await fetch('/dolphin/server');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('server-indicator').className = 'status-indicator status-online';

          const ipList = data.ips && data.ips.length > 0 ? data.ips.join(', ') : '${localIP}';
          document.getElementById('stat-ip').innerText = ipList;
          document.getElementById('stat-tcp').innerText = data.tcpPort || '${this.port}';

          if (data.apkName) {
            document.getElementById('stat-apk-package').innerText = data.apkName;
            const sizeMb = (data.apkSize / (1024 * 1024)).toFixed(2);
            document.getElementById('stat-apk-size').innerText = sizeMb + ' MB';
            if (data.apkMtime) {
              const dt = new Date(data.apkMtime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' });
              const elTime = document.getElementById('stat-apk-time');
              if (elTime) elTime.innerText = dt;
            }
            const btn = document.getElementById('apk-download-btn');
            if (btn) {
              btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg> Download ' + data.apkName + ' (' + sizeMb + ' MB)';
              btn.href = '/download-apk?t=' + (data.apkMtime ? new Date(data.apkMtime).getTime() : Date.now());
            }
          }

          const deviceContainer = document.getElementById('device-list');
          if (!data.devices || data.devices.length === 0) {
            deviceContainer.innerHTML = '<div class="empty-state">No devices currently connected over TCP ${this.port}. Open Danphe Native app on phone to connect.</div>';
          } else {
            deviceContainer.innerHTML = data.devices.map(function(dev) {
              const connectedTime = new Date(dev.connectedAt).toLocaleTimeString();
              return '<div class="device-item">' +
                '<div class="device-info">' +
                  '<h4>📱 Android Device Socket: ' + dev.id + '</h4>' +
                  '<p>IP Address: <strong>' + dev.addr + '</strong> · Active Screen: <strong>' + dev.screen + '</strong> · Connected: ' + connectedTime + '</p>' +
                '</div>' +
                '<span class="badge">🟢 CONNECTED</span>' +
              '</div>';
            }).join('');
          }
        }
      } catch (err) {
        document.getElementById('server-indicator').className = 'status-indicator status-offline';
      }
    }

    fetchServerStatus();
    setInterval(fetchServerStatus, 5000);
  </script>
</body>
</html>`;
    }

    _renderWebApp() {
        const DolphinWebEngine = require('../web/DolphinWebEngine');
        const candidateAppPaths = [
            path.resolve(this.watchDir, 'app.jsx'),
            path.resolve(this.watchDir, 'app.js'),
            path.resolve(this.watchDir, 'pages', 'Home.jsx'),
            path.resolve(this.watchDir, 'pages', 'home.jsx'),
            path.resolve(process.cwd(), 'app.jsx'),
            path.resolve(process.cwd(), 'app.js')
        ];
        const appPath = candidateAppPaths.find(p => fs.existsSync(p));
        if (appPath) {
            try {
                const rawCode = fs.readFileSync(appPath, 'utf8');
                let TitanJSX = null;
                let TitanWidgets = null;
                try {
                    TitanJSX = require('../core/TitanJSX');
                    TitanWidgets = require('../core/TitanWidgets');
                } catch (e) {
                    try {
                        TitanJSX = require('titan-bus-client/src/TitanJSX');
                        TitanWidgets = require('titan-bus-client/src/TitanWidgets');
                    } catch (e1) {
                        try {
                            TitanJSX = require('../../../titan-bus-client/src/TitanJSX');
                            TitanWidgets = require('../../../titan-bus-client/src/TitanWidgets');
                        } catch (_) {}
                    }
                }
                if (TitanJSX && rawCode.includes('<')) {
                    const transpiled = TitanJSX.transpileJSX(rawCode);
                    const cleanCode = transpiled
                        .replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];?/g, (m, name, p) => {
                            if (p.endsWith('.dolphin') || p.includes('registers')) return '';
                            return `const ${name} = require('${p}');`;
                        })
                        .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g, (m, names, p) => {
                            if (p.endsWith('.dolphin') || p.includes('registers')) return '';
                            return `const { ${names} } = require('${p}');`;
                        })
                        .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
                        .replace(/export\s+const\s+/g, 'const ')
                        .replace(/export\s+let\s+/g, 'let ')
                        .replace(/export\s+var\s+/g, 'var ')
                        .replace(/export\s+default\s+function\s+App\s*\(\)\s*\{/, 'function App() {');
                    const registers = {
                        items: [
                            { id: 1, name: "Motor Controller" },
                            { id: 2, name: "Telemetry Sensor" },
                            { id: 3, name: "AI Vision Pipeline" }
                        ],
                        SYS_POWER: 1,
                        AUDIO_VOLUME: 512,
                        AUDIO_PAN: 16389,
                        VIDEO_ZOOM: 16641,
                        VIDEO_TILT: 16644,
                        DISP_BRIGHTNESS: 256,
                        ACT_HAPTIC: 12288,
                        ACT_TORCH: 12304,
                        ACT_BRIGHTNESS: 12320,
                        ACT_WAKELOCK: 12321,
                        ACT_MEDIA_VOL: 12336,
                        ACT_CLIPBOARD: 12352,
                        ACT_PLAY: 16385,
                        ACT_REW: 16386,
                        ACT_FWD: 16387,
                        TEL_BATTERY: 4096,
                        TEL_CHARGING: 4097,
                        TEL_ONLINE: 4112,
                        TEL_ACCEL_X: 4224,
                        TEL_ACCEL_Y: 4225,
                        TEL_LIGHT: 4272,
                        ERROR_MASTER: 90,
                        ERROR_JSON: 99,
                        TELEMETRY: 2001
                    };
                    const ctx = {
                        ...(TitanJSX || {}),
                        ...(TitanWidgets || {}),
                        ...registers,
                        reg: require('../registers/TitanRegisters').reg,
                        defineRegisters: require('../registers/TitanRegisters').defineRegisters,
                        TitanRegisters: require('../registers/TitanRegisters'),
                        require: (mod) => {
                            if (mod.includes('TitanWidgets')) return TitanWidgets;
                            if (mod.includes('TitanJSX')) return TitanJSX;
                            if (mod.startsWith('./') || mod.startsWith('../')) {
                                const full = path.resolve(this.watchDir, mod);
                                if (fs.existsSync(full + '.jsx')) return require(full + '.jsx');
                                if (fs.existsSync(full + '.js')) return require(full + '.js');
                                if (fs.existsSync(full)) return require(full);
                            }
                            return require(mod);
                        },
                        aja: () => ({ baisakh: 1, year: 2083, month: 7, day: 3, hour: 16, min: 45, sec: 0 })
                    };
                    const fn = new Function(...Object.keys(ctx), cleanCode + '\nreturn App();');
                    const vnode = fn(...Object.values(ctx));
                    
                    // 🏛️ Seed Live Project Collections (rooms, menu) into Web Initial State
                    const webInitialState = Object.assign({
                        gallery_media_url: '/assets/videos/12205.mp4',
                        sys_picked_video_url: '/assets/videos/12205.mp4',
                        gallery_media_type: 'video'
                    }, this.state || {});
                    try {
                        const docStorePath = path.join(this.watchDir, 'titan_hotel_docstore.json');
                        if (fs.existsSync(docStorePath)) {
                            const rawDocs = JSON.parse(fs.readFileSync(docStorePath, 'utf8'));
                            // generic state
                            webInitialState['menu'] = formattedMenu;
                            webInitialState['hotel_menu'] = formattedMenu;
                            webInitialState['0x062a'] = formattedRooms;
                            webInitialState['0x062b'] = formattedMenu;
                            webInitialState['1578'] = formattedRooms;
                            webInitialState['1579'] = formattedMenu;
                        }
                    } catch (e) {}

                    return DolphinWebEngine.renderToWebHTML(vnode, {
                        title: 'Danphe Native Live Web',
                        description: 'Real-time Web App rendered by Danphe Native'
                    }, webInitialState);
                }
            } catch (err) {
                console.warn('⚠️ Could not render live app.jsx to web:', err.message);
            }
        }

        const fallbackVNode = {
            tag: 'div',
            props: { className: 'min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans' },
            children: [
                { tag: 'h1', props: { className: 'text-4xl font-black text-sky-400 mb-2' }, children: ['🦚 Danphe Native Web'] },
                { tag: 'p', props: { className: 'text-slate-400 mb-6' }, children: ['Live Universal Web App Engine running at 120 FPS'] },
                { tag: 'a', props: { href: '/dashboard', className: 'px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg transition' }, children: ['Go to Developer Dashboard & APK Download →'] }
            ]
        };
        return DolphinWebEngine.renderToWebHTML(fallbackVNode, { title: 'Danphe Native' });
    }
}

module.exports = { DevServer, DolphinServer };
