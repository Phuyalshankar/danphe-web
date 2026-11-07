'use strict';

const path = require('path');
const { DevServer } = require('./src/runtime/DevServer');

const httpPort = parseInt(process.env.HTTP_PORT || process.argv[2] || '9090', 10);
const tcpPort = parseInt(process.env.TCP_PORT || process.argv[3] || '9091', 10);

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
