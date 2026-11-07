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
    watchDir: process.env.WATCH_DIR || process.cwd()
});

devServer.start().catch((err) => {
    console.error('❌ Failed to start Danphe Dev Server:', err);
    process.exit(1);
});
