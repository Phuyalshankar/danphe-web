'use strict';

/**
 * 🏛️ TITAN-DB INSTANCE (database/index.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure Zero-SQL Binary WAL Relational Database Engine for Danphe-Native.
 *
 * • Zero SQL queries
 * • Zero SQL drivers
 * • Direct document put/get/delete and 16-bit register carrier streams
 */

const TitanDB = require('../src/database/TitanDB');
const path = require('path');

const dbPath = path.join(process.cwd(), 'titan_data.wal');
const db = new TitanDB({ filePath: dbPath });

module.exports = db;
