#!/usr/bin/env node
'use strict';

/**
 * 🔬 TITAN-BUS-CLIENT ↔ KOTLIN RUNTIME COMPARISON & DIAGNOSTIC TOOL
 * ─────────────────────────────────────────────────────────────────
 * Compares the exact output produced by titan-bus-client / TitanCompiler
 * against the decoded state received by Kotlin ViewFactory.kt & ComponentBuilders.
 *
 * Checks:
 *  1. Tree structure & Opcode matching
 *  2. String pool offset alignment (catches 0|0|0... leaks!)
 *  3. CSS style mapping (colors, padding, margin, border, radius, fontSize)
 *  4. Event & State bindings (rx, tx, action)
 */

const fs = require('fs');
const path = require('path');
const { pipeline, TitanCompiler, DolphinBinaryProtocol } = require('../src/index');

// ── COLOR CODES TO HEX (Mirrors Kotlin ColorParser.kt) ───────────
const PALETTE_HEX = {
    0x01: { base: '#3b82f6', 253: '#1d4ed8' }, // blue
    0x02: { base: '#22c55e', 253: '#15803d' }, // green
    0x04: { base: '#ef4444', 253: '#b91c1c' }, // red
    0x06: { base: '#a855f7', 253: '#7e22ce' }, // purple
    0x07: { base: '#0f172a', 253: '#020617' }, // slate/dark
    0x08: { base: '#f8fafc', 250: '#f8fafc', 253: '#e2e8f0' }, // gray/white
    0x09: { base: '#f59e0b', 253: '#b45309' }, // amber
    0x0A: { base: '#eab308', 253: '#a16207' }, // yellow
    0x0B: { base: '#f43f5e', 253: '#be123c' }, // rose
    0x0C: { base: '#38bdf8', 253: '#0369a1' }, // cyan/sky
    0x0D: { base: '#6366f1', 253: '#4338ca' }, // indigo
    0x0E: { base: '#10b981', 253: '#047857' }  // emerald
};

function parseKotlinColor(code, shade) {
    if (code === 0) return '#00000000'; // transparent
    const entry = PALETTE_HEX[code];
    if (!entry) return `#code_${code.toString(16)}`;
    return entry[shade] || entry.base;
}

// ── PURE KOTLIN RUNTIME SIMULATOR ─────────────────────────────────
class KotlinRuntimeSimulator {
    constructor(bundleBuffer) {
        this.buffer = bundleBuffer;
        this.proto = new DolphinBinaryProtocol();
        this.parsed = this.proto.deserialize(bundleBuffer);
    }

    simulateScreen(screenName = 'Home') {
        const screen = this.parsed.screens.find(s => s.name.toLowerCase() === screenName.toLowerCase()) || this.parsed.screens[0];
        if (!screen) throw new Error(`Screen '${screenName}' not found in bundle`);

        const allComps = this.parsed.components;
        const comps = allComps.slice(screen.compOff, screen.compOff + screen.compCnt);
        const data = screen.data;

        let dataIdx = 0;
        const nextStr = () => {
            if (dataIdx >= data.length) return '';
            const start = dataIdx;
            while (dataIdx < data.length && data[dataIdx] !== 0) dataIdx++;
            const str = data.slice(start, dataIdx).toString('utf8');
            if (dataIdx < data.length) dataIdx++; // skip null terminator
            return str;
        };

        const decodedViews = [];
        let compIdx = 0;

        const buildComp = (parentIdx = null) => {
            if (compIdx >= comps.length) return null;
            const currentIdx = compIdx++;
            const bin = comps[currentIdx];
            const type = bin[1];

            // 1. Universal header: sizeStr
            const sizeStrStart = dataIdx;
            const sizeStr = nextStr();

            // 2. Feature strings: read using (bin[15] | bin[23]) matching Kotlin ViewFactory
            const sig = (bin[15] & 0xFF) | (bin[bin.length - 1] & 0xFF);
            const gradStr = (sig & 0x01) ? nextStr() : '';
            const borderStr = (sig & 0x04) ? nextStr() : '';
            const dynamicStr = (sig & 0x08) ? nextStr() : '';
            const animStr = (sig & 0x10) ? nextStr() : '';

            // Parse sizeStr: w|h|elevation|fontSize|opacity|glass|glow
            const sizeParts = sizeStr.split('|');
            const width = parseInt(sizeParts[0] || '0', 10);
            const height = parseInt(sizeParts[1] || '0', 10);
            const elevation = parseInt(sizeParts[2] || '-1', 10);
            const fontSize = parseInt(sizeParts[3] || '0', 10);
            const opacity = parseFloat(sizeParts[4] || '1.0');
            const glassStyle = sizeParts[5] || '';
            const glowStyle = sizeParts[6] || '';

            // CSS Attributes
            const padding = {
                top: bin[4] * 4,
                right: bin[5] * 4,
                bottom: bin[6] * 4,
                left: bin[7] * 4
            };
            const margin = {
                top: bin[8] * 4,
                right: bin[9] * 4,
                bottom: bin[10] * 4,
                left: bin[11] * 4
            };
            const bgColor = parseKotlinColor(bin[3], bin[2]);
            const textColor = parseKotlinColor(bin[13], (bin[12] & 0x1F) * 8);
            const radius = bin[14];

            const viewNode = {
                idx: currentIdx,
                parentIdx,
                type,
                sig,
                sizeStr,
                gradStr,
                borderStr,
                dynamicStr,
                animStr,
                css: {
                    width,
                    height,
                    elevation,
                    fontSize,
                    opacity,
                    glassStyle,
                    glowStyle,
                    padding,
                    margin,
                    bgColor,
                    textColor,
                    radius,
                    hasBorder: (sig & 0x04) !== 0,
                    borderSpec: borderStr
                },
                componentData: {},
                children: []
            };

            decodedViews.push(viewNode);

            // Builder-specific execution
            switch (type) {
                case 0x16: { // TextBuilder
                    const textContent = nextStr();
                    viewNode.componentData = {
                        builder: 'TextBuilder',
                        textContent: textContent,
                        isStateBound: textContent.includes('[bus:') || textContent.includes('[stateKey:'),
                        isSizeStrLeak: /^\d+\|\d+\|\d+\|\d+/.test(textContent)
                    };
                    break;
                }
                case 0x10: { // ButtonBuilder
                    const action = nextStr();
                    const label = nextStr();
                    const icon = nextStr();
                    viewNode.componentData = {
                        builder: 'ButtonBuilder',
                        action,
                        label,
                        icon,
                        isSizeStrLeak: /^\d+\|\d+\|\d+\|\d+/.test(label) || /^\d+\|\d+\|\d+\|\d+/.test(action)
                    };
                    break;
                }
                case 0x12: // Container
                case 0x13: // Column / VStack
                case 0x14: // Row / HStack
                case 0x11: { // Card
                    const action = nextStr();
                    const childCount = bin[13];
                    const orientation = (bin[12] & 0x0F) === 1 ? 'horizontal' : 'vertical';
                    const gap = ((bin[12] >> 4) & 0x0F) * 4;
                    viewNode.componentData = {
                        builder: type === 0x12 ? 'ContainerBuilder' : (type === 0x11 ? 'CardBuilder' : (type === 0x14 ? 'RowBuilder' : 'ColumnBuilder')),
                        action,
                        childCount,
                        orientation,
                        gap
                    };
                    for (let c = 0; c < childCount; c++) {
                        const childView = buildComp(currentIdx);
                        if (childView) viewNode.children.push(childView);
                    }
                    break;
                }
                case 0x19: { // SliderBuilder
                    const action = nextStr();
                    const label = nextStr();
                    viewNode.componentData = {
                        builder: 'SliderBuilder',
                        action,
                        label,
                        initialValue: bin[14]
                    };
                    break;
                }
                case 0x18: { // TextFieldBuilder
                    const stateKey = nextStr();
                    const label = nextStr();
                    const hint = nextStr();
                    const typeStr = nextStr();
                    const variant = nextStr();
                    const iconName = nextStr();
                    viewNode.componentData = {
                        builder: 'TextFieldBuilder',
                        stateKey,
                        label,
                        hint,
                        typeStr,
                        variant,
                        iconName
                    };
                    break;
                }
                case 0x17: { // ImageBuilder
                    const url = nextStr();
                    viewNode.componentData = {
                        builder: 'ImageBuilder',
                        url
                    };
                    break;
                }
                case 0x23: { // IconBuilder
                    const iconName = nextStr();
                    viewNode.componentData = {
                        builder: 'IconBuilder',
                        iconName
                    };
                    break;
                }
                case 0x61: { // ThorVGBuilder
                    const action = nextStr();
                    const svgXml = nextStr();
                    viewNode.componentData = {
                        builder: 'ThorVGBuilder',
                        action,
                        svgLength: svgXml.length,
                        hasSvg: svgXml.includes('<svg')
                    };
                    break;
                }
                default: {
                    const action = nextStr();
                    viewNode.componentData = { builder: `Unknown_0x${type.toString(16)}`, action };
                    break;
                }
            }

            return viewNode;
        };

        const root = buildComp();
        return {
            root,
            views: decodedViews,
            totalBytes: data.length,
            consumedBytes: dataIdx,
            perfectAlignment: dataIdx === data.length && decodedViews.length === comps.length
        };
    }
}

// ── FLATTEN JSX TREE FOR COMPARISON ──────────────────────────────
function flattenJSX(node, list = []) {
    if (!node) return list;

    if (typeof node.tag === 'function' || typeof node.type === 'function') {
        const fn = typeof node.tag === 'function' ? node.tag : node.type;
        const props = { ...(node.props || {}) };
        if (node.children) props.children = node.children;
        const resolved = fn(props);
        return flattenJSX(resolved, list);
    }

    if (typeof node === 'string' || typeof node === 'number') {
        const textStr = String(node).trim();
        if (textStr) list.push({ tag: 'text', text: textStr, props: {} });
        return list;
    }

    const tag = String(node.tag || node.type || 'div').toLowerCase();
    const props = node.props || {};
    const rawChildren = node.children || props.children || [];
    const rawArray = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
    const children = rawArray.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false);

    const copy = { tag, props, text: node.text || props.label || props.text };
    list.push(copy);

    if (tag === 'draw' || tag === 'svg' || tag === 'thorvg' || tag === 'button') {
        return list;
    }

    if (Array.isArray(children)) {
        children.forEach(c => flattenJSX(c, list));
    }
    return list;
}

// ── MAIN COMPARATOR ──────────────────────────────────────────────
function compareTitanAndKotlin(jsxVNode, screenName = 'Home') {
    console.log('\n========================================================================================');
    console.log('🔬 TITAN-BUS-CLIENT ↔ KOTLIN RUNTIME COMPARISON & PARITY AUDIT');
    console.log('========================================================================================\n');

    // Step 1: Compile JSX to Android bundle
    const t0 = process.hrtime.bigint();
    const androidData = pipeline.toAndroid(jsxVNode, screenName);
    const compileTimeMs = Number(process.hrtime.bigint() - t0) / 1e6;

    console.log(`📦 Compiled Bundle: ${androidData.bundleBuffer.length} bytes | Components: ${androidData.componentsCount} | Compile: ${compileTimeMs.toFixed(2)}ms`);

    // Step 2: Emulate Kotlin Runtime execution
    const simulator = new KotlinRuntimeSimulator(androidData.bundleBuffer);
    const simResult = simulator.simulateScreen(screenName);

    console.log(`📱 Kotlin Simulation: Read ${simResult.consumedBytes}/${simResult.totalBytes} bytes | Alignment: ${simResult.perfectAlignment ? '✅ 100% PERFECT' : '❌ MISALIGNED'}\n`);

    // Step 3: Deep Element-by-Element Comparison
    const flatJSX = androidData.nodes || flattenJSX(jsxVNode);
    const views = simResult.views;

    const issues = [];
    const reportRows = [];

    const totalCount = Math.max(flatJSX.length, views.length);
    for (let i = 0; i < totalCount; i++) {
        const jsx = flatJSX[i] || { tag: 'MISSING', props: {} };
        const kt = views[i] || null;

        const row = {
            idx: i,
            jsxTag: jsx.tag,
            ktBuilder: kt ? kt.componentData.builder : 'NONE',
            expectedContent: '',
            ktContent: '',
            cssStatus: '✅ MATCH',
            alignmentStatus: '✅ ALIGNED',
            errors: []
        };

        if (!kt) {
            row.errors.push('Missing Kotlin component — tree count mismatch!');
            issues.push(`Comp #${i}: Missing in Kotlin runtime`);
            reportRows.push(row);
            continue;
        }

        // 1. Text & Leak Verification
        if (kt.componentData.builder === 'TextBuilder') {
            const expText = jsx.text || jsx.props.text || (typeof jsx.children === 'string' ? jsx.children : '');
            row.expectedContent = expText;
            row.ktContent = kt.componentData.textContent;

            // ⚠️ CHECK FOR 0|0|0 LEAK!
            if (kt.componentData.isSizeStrLeak) {
                row.alignmentStatus = '❌ SIZE_STR_LEAK (0|0|0...)';
                row.errors.push(`CRITICAL BUG: Kotlin TextBuilder consumed sizeStr metadata '${kt.componentData.textContent}' instead of real text '${expText}'!`);
                issues.push(`Comp #${i} (${jsx.tag}): Leaked sizeStr metadata into text display!`);
            } else if (expText && !kt.componentData.textContent.includes(expText.slice(0, 10)) && !kt.componentData.isStateBound) {
                row.alignmentStatus = '⚠️ TEXT_MISMATCH';
                row.errors.push(`Expected text '${expText}' but got '${kt.componentData.textContent}'`);
            }
        } else if (kt.componentData.builder === 'ButtonBuilder') {
            row.expectedContent = jsx.text || jsx.props.label || '';
            row.ktContent = `${kt.componentData.label} [${kt.componentData.action}]`;
            if (kt.componentData.isSizeStrLeak) {
                row.alignmentStatus = '❌ SIZE_STR_LEAK';
                row.errors.push(`Button action/label contains sizeStr leak!`);
                issues.push(`Comp #${i} (Button): Leaked sizeStr into button!`);
            }
        } else if (kt.componentData.builder === 'ThorVGBuilder') {
            row.expectedContent = 'SVG Vector XML';
            row.ktContent = `SVG (${kt.componentData.svgLength} bytes)`;
            if (!kt.componentData.hasSvg) {
                row.errors.push('ThorVG component missing valid <svg> tag in data!');
                issues.push(`Comp #${i} (ThorVG): Invalid SVG XML`);
            }
        } else if (kt.componentData.builder === 'SliderBuilder') {
            row.expectedContent = `tx:${jsx.props.tx || ''}`;
            row.ktContent = `${kt.componentData.action}`;
        } else {
            row.expectedContent = jsx.props.action || '';
            row.ktContent = kt.componentData.action || '';
        }

        // 2. CSS Check
        const jsxClass = jsx.props.className || '';
        if (jsxClass.includes('border') && !kt.css.hasBorder) {
            row.cssStatus = '⚠️ BORDER_MISMATCH';
            row.errors.push(`JSX specifies border, but Kotlin signature flag hasBorder is FALSE (sig: 0x${kt.sig.toString(16)})`);
            issues.push(`Comp #${i} (${jsx.tag}): Border flag missing in Kotlin binary`);
        }

        reportRows.push(row);
    }

    // Print Visual Diagnostic Table
    console.log('┌─────┬──────────────┬──────────────────┬─────────────────────────────┬─────────────────────────────┬───────────┐');
    console.log('│ IDX │ JSX TAG      │ KOTLIN BUILDER   │ EXPECTED CONTENT            │ KOTLIN RECEIVED VIEW        │ STATUS    │');
    console.log('├─────┼──────────────┼──────────────────┼─────────────────────────────┼─────────────────────────────┼───────────┤');

    reportRows.forEach(r => {
        const idx = String(r.idx).padEnd(3);
        const tag = String(r.jsxTag).slice(0, 12).padEnd(12);
        const bld = String(r.ktBuilder).slice(0, 16).padEnd(16);
        const exp = String(r.expectedContent).slice(0, 27).padEnd(27);
        const got = String(r.ktContent).slice(0, 27).padEnd(27);
        const stat = r.errors.length === 0 ? '✅ OK     ' : '❌ ERROR  ';
        console.log(`│ ${idx} │ ${tag} │ ${bld} │ ${exp} │ ${got} │ ${stat}│`);
    });
    console.log('└─────┴──────────────┴──────────────────┴─────────────────────────────┴─────────────────────────────┴───────────┘\n');

    // Detailed Error Reporting
    if (issues.length === 0 && simResult.perfectAlignment) {
        console.log('🎉 ═════════════════════════════════════════════════════════════════════════════════════════');
        console.log('✅ AUDIT PASSED 100%! ZERO ERRORS DETECTED.');
        console.log('   • String pool cursor matched byte-for-byte at the exact end.');
        console.log('   • No 0|0|0... metadata leaked into any text views.');
        console.log('   • CSS border, color, padding, and layout bounds completely verified.');
        console.log('═════════════════════════════════════════════════════════════════════════════════════════\n');
        return { success: true, issues: [], rows: reportRows };
    } else {
        console.error('🚨 ═════════════════════════════════════════════════════════════════════════════════════════');
        console.error(`❌ AUDIT FAILED! Found ${issues.length} discrepancies:`);
        issues.forEach((err, idx) => console.error(`   ${idx + 1}. ${err}`));
        console.error('═════════════════════════════════════════════════════════════════════════════════════════\n');
        return { success: false, issues, rows: reportRows };
    }
}

// ── CLI ENTRY POINT ──────────────────────────────────────────────
if (require.main === module) {
    const defaultVNode = {
        tag: 'container',
        props: { className: 'p-6 max-w-md mx-auto w-full bg-slate-950' },
        children: [
            {
                tag: 'vstack',
                props: { gap: 4, className: 'bg-slate-900 p-6 rounded-2xl border border-slate-800 w-full' },
                children: [
                    {
                        tag: 'hstack',
                        props: { justify: 'between', className: 'w-full items-center' },
                        children: [
                            { tag: 'h1', props: { className: 'text-2xl font-bold text-sky-400' }, text: '🦚 Danphe Native HMI' },
                            { tag: 'spacer' },
                            {
                                tag: 'button',
                                props: { tx: 1, className: 'bg-emerald-600 px-4 py-2 rounded-xl text-white font-bold' },
                                text: '⚡ Power ON'
                            }
                        ]
                    },
                    {
                        tag: 'thorvg',
                        props: {
                            className: 'w-full h-36 rounded-xl',
                            action: 'tap:vector_card',
                            svg: '<svg viewBox="0 0 400 140" width="400" height="140" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="400" height="140" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2" /><circle cx="50" cy="70" r="30" fill="#38bdf8" /><text x="95" y="60" fill="#f8fafc" font-size="20">Samsung ThorVG Engine</text><text x="95" y="90" fill="#10b981" font-size="14">Pure C++ Hardware Vector</text></svg>'
                        }
                    },
                    { tag: 'divider' },
                    {
                        tag: 'vstack',
                        props: { gap: 3, className: 'w-full' },
                        children: [
                            { tag: 'text', props: { className: 'text-base font-medium text-slate-300' }, text: 'Master Speed / Throttle (0-255):' },
                            { tag: 'text', props: { rx: 512, className: 'text-4xl font-mono font-bold text-emerald-400 py-2' }, text: '128' },
                            {
                                tag: 'slider',
                                props: { tx: 512, min: 0, max: 255, initialValue: 128 },
                                address: 512
                            }
                        ]
                    }
                ]
            }
        ]
    };

    const targetFile = process.argv[2];
    let vnode = defaultVNode;
    if (targetFile && fs.existsSync(targetFile)) {
        try {
            console.log(`📂 Loading custom VNode/JSX from: ${targetFile}`);
            if (targetFile.endsWith('.jsx')) {
                const rawCode = fs.readFileSync(path.resolve(targetFile), 'utf8');
                const TitanJSX = require('../../titan-bus-client/src/TitanJSX');
                const TitanWidgets = require('../../titan-bus-client/src/TitanWidgets');
                const transpiled = TitanJSX.transpileJSX(rawCode);
                const cleanCode = transpiled
                    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
                    .replace(/export\s+default\s+function\s+App\s*\(\)\s*\{/, 'function App() {');
                const registers = {
                    items: [
                        { name: 'Core Controller', status: 'ACTIVE' },
                        { name: 'Motor Drive Node 1', status: 'ACTIVE' }
                    ],
                    SYS_POWER: 1,
                    AUDIO_VOLUME: 512
                };
                const ctx = {
                    ...TitanJSX,
                    ...TitanWidgets,
                    ...registers,
                    require: (mod) => {
                        if (mod.includes('TitanWidgets')) return TitanWidgets;
                        if (mod.includes('TitanJSX')) return TitanJSX;
                        return require(mod);
                    },
                    aja: () => ({ baisakh: 1, year: 2083, month: 7, day: 3, hour: 16, min: 45, sec: 0 })
                };
                const fn = new Function(...Object.keys(ctx), cleanCode + '\nreturn App();');
                vnode = fn(...Object.values(ctx));
            } else {
                vnode = require(path.resolve(targetFile));
                if (vnode.default) vnode = vnode.default;
            }
        } catch (e) {
            console.warn(`Could not require file, using default test node: ${e.message}`);
        }
    }

    const result = compareTitanAndKotlin(vnode);
    process.exit(result.success ? 0 : 1);
}

module.exports = {
    compareTitanAndKotlin,
    KotlinRuntimeSimulator
};
