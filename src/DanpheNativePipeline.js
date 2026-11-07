'use strict';

/**
 * 🦚 DANPHE NATIVE PIPELINE (DanpheNativePipeline.js)
 * ─────────────────────────────────────────────────────────────
 * The Pure Multi-Platform Compiler & Nervous Backbone.
 * Takes a Single Shared JSX View and compiles directly into:
 *   1. Web (HTML5 / Auto-Layout / SEO / TitanJSX)
 *   2. Android (24-byte Binary .dolp / Kotlin Native)
 *   3. Embedded (LVGL 9 / Samsung ThorVG / Pure C++)
 * All linked together via Titan-Bus 16-Bit Register Serial Highway!
 */

const DolphinWebEngine = require('./web/DolphinWebEngine');
const TitanCompiler = require('./compiler/TitanCompiler');
const TitanLvglCompiler = require('./compiler/TitanLvglCompiler');
const { DolphinBinaryProtocol } = require('./protocol/DolphinBinaryProtocol');

// Load Titan-Bus-Client Core (Standalone Internal first, Fallback to external)
let titanBusClient = null;
try {
  titanBusClient = require('./core');
} catch (e) {
  try {
    titanBusClient = require('../../titan-bus-client');
  } catch (e2) {}
}

class DanpheNativePipeline {
  constructor() {
    this.webEngine = new DolphinWebEngine();
    this.titanCompiler = new TitanCompiler();
    this.lvglCompiler = new TitanLvglCompiler();
    this.binaryProtocol = new DolphinBinaryProtocol();
  }

  /**
   * 🌐 1. Compile Shared JSX to Production Web HTML5
   */
  toWeb(vnode, seoOptions = {}, initialState = {}) {
    return this.webEngine.renderToWebHTML(vnode, seoOptions, initialState);
  }

  /**
   * 📱 2. Compile Shared JSX to Android Native Binary (.dolp)
   */
  toAndroid(vnode, screenName = 'App') {
    function expandVNode(node) {
      if (!node) return node;
      if (node.props) {
        const target = String(node.props.target || node.props.platform || '').toLowerCase().trim();
        if (target === 'web' || target === 'browser' || node.tag === 'webonly') return null;
      }
      if (typeof node.tag === 'function') {
        return expandVNode(node.tag({ ...(node.props || {}), children: node.children || [] }));
      }
      if (node.children && Array.isArray(node.children)) {
        return {
          ...node,
          children: node.children.map(expandVNode).filter(Boolean)
        };
      }
      return node;
    }

    vnode = expandVNode(vnode);

    // Separate Drawer from Master App View
    let drawerNode = null;
    let mainAppNode = vnode;

    if (vnode && vnode.children && Array.isArray(vnode.children)) {
      const drawerIdx = vnode.children.findIndex(c => c && (
        c.tag === 'drawer' || c.tag === 'MainDrawer' ||
        (c.props && (c.props['data-screen'] === 'MainDrawer' || c.props.screen === 'MainDrawer' || c.props.isDrawer))
      ));
      if (drawerIdx !== -1) {
        drawerNode = vnode.children[drawerIdx];
        const newChildren = [...vnode.children];
        newChildren.splice(drawerIdx, 1);
        mainAppNode = { ...vnode, children: newChildren };
      }
    }

    const allComponents = [];
    const screens = [];

    // 1. Compile Master Unified App Screen
    const appCompiled = this.titanCompiler.compile(mainAppNode);
    const appStringPoolBuffers = appCompiled.stringPool.map(str =>
      Buffer.concat([Buffer.from(String(str || ''), 'utf8'), Buffer.from([0])])
    );
    const appDataBuffer = Buffer.concat(appStringPoolBuffers);
    allComponents.push(...appCompiled.binaries);

    screens.push({
      name: 'App',
      componentOffset: 0,
      components: appCompiled.binaries,
      data: appDataBuffer
    });

    // 2. Compile MainDrawer Screen if present
    if (drawerNode) {
      const drawerCompiled = this.titanCompiler.compile(drawerNode);
      const drawerStringPoolBuffers = drawerCompiled.stringPool.map(str =>
        Buffer.concat([Buffer.from(String(str || ''), 'utf8'), Buffer.from([0])])
      );
      const drawerDataBuffer = Buffer.concat(drawerStringPoolBuffers);
      const drawerCompOff = allComponents.length;
      allComponents.push(...drawerCompiled.binaries);

      screens.push({
        name: 'MainDrawer',
        componentOffset: drawerCompOff,
        components: drawerCompiled.binaries,
        data: drawerDataBuffer
      });
    }

    const bundleBuffer = this.binaryProtocol.serialize({
      screens,
      components: allComponents,
      entry: 'App'
    });

    return {
      bundleBuffer,
      screens,
      componentsCount: allComponents.length,
      binaryLength: allComponents.length * 24,
      stringPool: appCompiled.stringPool,
      nodes: appCompiled.nodes
    };
  }

  /**
   * 📟 3. Compile Shared JSX to Embedded LVGL C++ Screen
   */
  toLvgl(vnode, screenName = 'MainScreen') {
    return this.lvglCompiler.compileToCpp(vnode, screenName);
  }

  /**
   * ⚡ 4. Create Titan-Bus Relay / Diode Transceiver
   */
  createRelay(options = {}) {
    return new titanBusClient.TitanRelay(options);
  }

  createDiode(engine, options = {}) {
    return new titanBusClient.TitanDiode(engine, options);
  }
}

module.exports = DanpheNativePipeline;
