'use strict';

/**
 * 🦚 DANPHE-NATIVE CORE ENTRY POINT
 * ─────────────────────────────────────────────────────────────
 * Direct Native Multi-Platform Framework.
 * Single Shared JSX ➔ Web + Android + LVGL (Linked with Titan-Bus)
 */

const DanpheNativePipeline = require('./DanpheNativePipeline');
const DolphinWebEngine = require('./web/DolphinWebEngine');
const TitanCompiler = require('./compiler/TitanCompiler');
const TitanLvglCompiler = require('./compiler/TitanLvglCompiler');
const { DolphinBinaryProtocol } = require('./protocol/DolphinBinaryProtocol');

// Standalone Core & Register Sheets
const fs = require('fs');
const path = require('path');
if (require.extensions && !require.extensions['.dolphin']) {
  require.extensions['.dolphin'] = function(module, filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const registers = {};
    const regex = /register\s+([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|\d+);/g;
    let m;
    while ((m = regex.exec(content)) !== null) {
      const val = m[2].startsWith('0x') || m[2].startsWith('0X') ? parseInt(m[2], 16) : parseInt(m[2], 10);
      registers[m[1]] = val;
    }
    let code = '';
    for (const [k, v] of Object.entries(registers)) {
      code += `exports.${k} = ${v};\n`;
    }

    // Dynamic Namespace Form Registers: reg form:: name, email, password;
    const formRegex = /reg\s+([A-Za-z0-9_]+)::\s*([A-Za-z0-9_,\s]+);?/g;
    let fm;
    while ((fm = formRegex.exec(content)) !== null) {
      const formDecl = fm[0].replace(/'/g, "\\'");
      code += `const _f_${fm[1]} = require('${path.resolve(__dirname, 'registers/TitanRegisters').replace(/\\/g, '/')}').reg('${formDecl}');\nexports.${fm[1]} = _f_${fm[1]};\n`;
    }

    module._compile(code, filename);
  };
}

if (require.extensions && !require.extensions['.jsx']) {
  require.extensions['.jsx'] = function(module, filename) {
    const content = fs.readFileSync(filename, 'utf8');
    let cjsCode = '';

    try {
      const { DanpheParser, DanpheCodeGenerator } = require('./parser');
      const ast = DanpheParser.parse(content);
      cjsCode = DanpheCodeGenerator.toWebJS(ast);
    } catch (_) {
      // Graceful fallback to TitanJSX for legacy constructs
      const { TitanJSX } = require('./core');
      cjsCode = TitanJSX.transpileJSX(content);
    }

    cjsCode = cjsCode
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
      .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'module.exports = $1;')
      .replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];?/g, (m, name, p) => {
        let reqPath = p;
        if (!p.endsWith('.js') && !p.endsWith('.jsx') && !p.endsWith('.dolphin')) {
          const baseDir = path.dirname(filename);
          if (fs.existsSync(path.resolve(baseDir, p + '.dolphin'))) reqPath = p + '.dolphin';
          else if (fs.existsSync(path.resolve(baseDir, p + '.jsx'))) reqPath = p + '.jsx';
        }
        return `const ${name} = require('${reqPath.replace(/\\/g, '/')}');`;
      })
      .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g, (m, names, p) => {
        let reqPath = p;
        if (!p.endsWith('.js') && !p.endsWith('.jsx') && !p.endsWith('.dolphin')) {
          const baseDir = path.dirname(filename);
          if (fs.existsSync(path.resolve(baseDir, p + '.dolphin'))) reqPath = p + '.dolphin';
          else if (fs.existsSync(path.resolve(baseDir, p + '.jsx'))) reqPath = p + '.jsx';
        }
        return `const { ${names} } = require('${reqPath.replace(/\\/g, '/')}');`;
      });
    
    const fnMatch = content.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/) || content.match(/function\s+([A-Za-z0-9_]+)/);
    if (fnMatch && fnMatch[1]) {
      cjsCode += `\nif (!module.exports || typeof module.exports !== "function") module.exports = ${fnMatch[1]};`;
    }
    module._compile(cjsCode, filename);
  };
}

const core = require('./core');
const parser = require('./parser');
const { REGISTERS, REG_NAMES, parseDolphinRegisters, resolveRegister } = require('./registers/TitanRegisterSheet');

module.exports = {
  DanpheNativePipeline,
  DolphinWebEngine,
  TitanCompiler,
  TitanLvglCompiler,
  DolphinBinaryProtocol,
  pipeline: new DanpheNativePipeline(),

  // 🌟 Dedicated Lexer, Parser & Tokenizer Subsystem
  parser,
  DanpheParser: parser.DanpheParser,
  DanpheLexer: parser.DanpheLexer,
  DanpheCodeGenerator: parser.DanpheCodeGenerator,
  StyleTokenizer: parser.StyleTokenizer,

  // Built-in Titan Core (100% Standalone)
  h: core.h || core.TitanJSX.h,
  html: core.html || core.TitanJSX.html,
  TitanJSX: core.TitanJSX,
  TitanCSS: core.TitanCSS,
  TitanWidgets: require('./core/TitanWidgets'),
  TitanCircuitEngine: core.TitanCircuitEngine,
  TitanDiode: core.TitanDiode,
  TitanDataStore: core.TitanDataStore,
  TitanDB: require('./database/TitanDB'),
  TitanMicroBus: core.TitanMicroBus,
  TitanSovereignMedia: core.TitanSovereignMedia,
  TitanMedia: core.TitanMedia,
  TITAN_TYPE: core.TITAN_TYPE,
  TitanTypeSystem: core.TitanTypeSystem,
  TitanCodec: core.TitanCodec,
  TitanVideoReassembler: core.TitanVideoReassembler,
  TitanCommunicatorServer: require('./runtime/TitanCommunicatorServer').TitanCommunicatorServer,

  // 🏛️ Dynamic Registers & Namespace Structs
  store: require('./core/store').defaultStore,
  DanpheStore: require('./core/store').DanpheStore,
  router: require('./core/router').defaultRouter,
  DanpheRouter: require('./core/router').DanpheRouter,
  generateCoreCSS: require('./core/dolphincss').generateCoreCSS,
  TitanRegisters: core.TitanRegisters,
  defineRegisters: core.defineRegisters,
  reg: require('./core/store').reg,
  resolveRegisterAndSlot: core.resolveRegisterAndSlot,
  FormRegister: core.FormRegister,

  // Built-in Master Register Sheet
  REGISTERS,
  REG_NAMES,
  parseDolphinRegisters,
  resolveRegister
};
