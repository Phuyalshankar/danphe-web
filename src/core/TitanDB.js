'use strict';

/**
 * ⚡ TITAN DATABASE — SINGLE SOURCE OF TRUTH RE-EXPORT
 * Architectural Compliance:
 * Titan-Bus is a communication protocol, NOT a database!
 * The master database engine is maintained in src/database/TitanDB.js.
 * This file preserves backward compatibility for legacy core imports.
 */

module.exports = require('../database/TitanDB');
