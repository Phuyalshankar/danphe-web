#!/usr/bin/env node
'use strict';

/**
 * 🌊 Dolphin Mobile CLI — Entry Point
 *
 * This is the binary entry point registered in package.json → "bin".
 * All logic lives in src/cli/DolphinCLI.js — this file just bootstraps it.
 *
 * Usage:
 *   dolphin init <AppName>
 *   dolphin dev
 *   dolphin build
 *   dolphin build --android --release
 *   dolphin android setup
 *   dolphin android build
 *   dolphin inspect <file.dolp>
 */

require('../src/cli/DolphinCLI');