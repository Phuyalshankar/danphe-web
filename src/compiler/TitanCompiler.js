'use strict';

const TitanRegisters = require('../registers/TitanRegisters');

/**
 * ⚡ TITAN COMPILER (Direct Single-Pass 2-Stage Pipeline)
 * ─────────────────────────────────────────────────────────────
 * Direct Lexical & Token-to-Bytecode Engine.
 * Converts JSX AST / Element Nodes directly into Titan 24-Byte Layout Binaries.
 * Fully aligned with Kotlin ViewFactory and Component Builders.
 */

class TitanCompiler {
    constructor() {
        this.PALETTE_MAP = {
            blue: 1, sky: 1, cyan: 11, info: 1,
            green: 2, emerald: 20, teal: 8, lime: 15, success: 2,
            indigo: 3, violet: 18, primary: 3,
            red: 4, rose: 16, danger: 4,
            amber: 5, warning: 5,
            orange: 6,
            slate: 7, gray: 7, zinc: 7, neutral: 7, stone: 7,
            black: 9, dark: 9, white: 10,
            pink: 12, fuchsia: 17, purple: 13, yellow: 14,
            transparent: 23,
            canvas: 21, background: 21, bg: 21,
            surface: 22, card: 22,
            border: 23, auto: 24
        };

        this.OPCODE_MAP = {
            button: 0x10, Button: 0x10,
            card: 0x11, Card: 0x11,
            container: 0x12, Container: 0x12, div: 0x12, center: 0x12, wrap: 0x12,
            header: 0x12, aside: 0x12, footer: 0x12, nav: 0x12, section: 0x12, main: 0x12, article: 0x12,
            column: 0x13, Column: 0x13, vstack: 0x13, VStack: 0x13,
            row: 0x14, Row: 0x14, hstack: 0x14, HStack: 0x14,
            stack: 0x15, Stack: 0x15,
            text: 0x16, Text: 0x16, span: 0x16, p: 0x16, label: 0x16,
            h1: 0x16, h2: 0x16, h3: 0x16, h4: 0x16, h5: 0x16, h6: 0x16,
            image: 0x17, Image: 0x17, img: 0x17, timage: 0x17, TImage: 0x17,
            input: 0x18, TextField: 0x18, textarea: 0x18,
            slider: 0x19, Slider: 0x19,
            switch: 0x1A, Switch: 0x1A, Toggle: 0x1A,
            checkbox: 0x1B, Checkbox: 0x1B,
            select: 0x1C, Select: 0x1C, dropdown: 0x1C,
            radio: 0x1F, Radio: 0x1F,
            tabbar: 0x20, TabBar: 0x20,
            grid: 0x22, Grid: 0x22, GridView: 0x22,
            scroll: 0x1E, ScrollView: 0x1E, list: 0x1E, ListView: 0x1E,
            icon: 0x23, Icon: 0x23, i: 0x23,
            flipcard: 0x24, FlipCard: 0x24, 'flip-card': 0x24, 'flip_card': 0x24,
            camera: 0x50, Camera: 0x50, cameraview: 0x50, CameraView: 0x50, tcamera: 0x50, TCamera: 0x50,
            video: 0x52, Video: 0x52, VideoPlayer: 0x52, videoplayer: 0x52, player: 0x52, Player: 0x52, tvideo: 0x52, TVideo: 0x52,
            audio: 0x54, Audio: 0x54, AudioPlayer: 0x54, audioplayer: 0x54, taudio: 0x54, TAudio: 0x54,
            videocall: 0x70, VideoCall: 0x70, call: 0x70, Call: 0x70,
            videostream: 0x71, VideoStream: 0x71, stream: 0x71, Stream: 0x71,
            audiostream: 0x72, AudioStream: 0x72, voice: 0x72, Voice: 0x72,
            titandisk: 0x73, TitanDisk: 0x73, disk: 0x73, Disk: 0x73,
            hoster: 0x74, Hoster: 0x74, livehost: 0x74, LiveHost: 0x74,
            thorvg: 0x61, ThorVG: 0x61, svg: 0x61, draw: 0x61, Draw: 0x61,
            seg7: 0x61, Seg7: 0x61, '7seg': 0x61, 'seven-segment': 0x61, SevenSegment: 0x61,
            state: 0xD0, State: 0xD0,
            spacer: 0x12, Spacer: 0x12,
            divider: 0x12, Divider: 0x12,
            route: 0x30, Route: 0x30, router: 0x30, Router: 0x30
        };
    }

    compile(node) {
        const binaries = [];
        const stringPool = [];
        const nodes = [];
        const routes = [];
        this._compileNode(node, binaries, stringPool, nodes, routes);
        return {
            binaries,
            stringPool,
            nodes,
            routes,
            binaryLength: binaries.length * 24,
            componentsCount: binaries.length
        };
    }

    _compileNode(node, binaries, stringPool, nodes = [], routes = []) {
        if (!node) return;

        if (typeof node.tag === 'function' || typeof node.type === 'function') {
            const fn = typeof node.tag === 'function' ? node.tag : node.type;
            const props = { ...(node.props || {}) };
            if (node.children) props.children = node.children;
            const resolved = fn(props);
            return this._compileNode(resolved, binaries, stringPool, nodes, routes);
        }

        if (typeof node === 'string' || typeof node === 'number') {
            const textStr = String(node).trim();
            if (textStr.length === 0) return;
            const bin = new Uint8Array(24);
            bin[1] = 0x16; // Text opcode
            bin[2] = 0;    // no background shade
            bin[3] = 0;    // NO background (hasBg = false)
            bin[13] = 10;  // text color = 10 (Color.WHITE)
            binaries.push(bin);
            nodes.push({ tag: 'text', text: textStr, props: {} });

            // Universal header string: sizeStr
            stringPool.push('0|0|0|14|1.0||');
            // Component string: text content
            stringPool.push(textStr);
            return;
        }

        if (typeof (node.tag || node.type) === 'function') {
            const compFn = node.tag || node.type;
            const expanded = compFn({ ...(node.props || {}), children: node.children || [] });
            if (Array.isArray(expanded)) {
                for (const child of expanded) this._compileNode(child, binaries, stringPool, nodes, routes);
                return;
            }
            if (expanded) return this._compileNode(expanded, binaries, stringPool, nodes, routes);
            return;
        }

        const tag = String(node.tag || node.type || 'div').toLowerCase();
        let rawProps = node.props || {};
        const props = {};
        for (const [k, v] of Object.entries(rawProps)) {
            if (v && typeof v === 'object' && v.type === 'Literal') props[k] = v.value;
            else if (v && typeof v === 'object' && v.type === 'MemberExpression') {
                const objName = v.object && v.object.name ? v.object.name : '';
                const propName = v.property && v.property.name ? v.property.name : '';
                props[k] = `${objName}::${propName}`;
            } else {
                props[k] = v;
            }
        }

        // 🎯 TARGET DIRECTIVE & PLATFORM FILTER
        const rawTarget = String(props.target || props.platform || '').trim();
        const targetTokens = rawTarget.toLowerCase().split(/[\,\s]+/).filter(Boolean);
        if ((targetTokens.includes('web') || targetTokens.includes('browser') || tag === 'webonly') && !targetTokens.includes('mobile') && !targetTokens.includes('all')) {
            return;
        }

        const rawClassName = String(props.className || props.class || '');
        // 🛡️ PIPE FILTER: Strip out anything inside | ... | so Native never parses Web-only styles!
        const className = rawClassName.replace(/\|[\s\S]*?\|/g, ' ').replace(/\s+/g, ' ').trim();

        // Pre-process special tags
        const isSpacer = tag === 'spacer';
        const isDivider = tag === 'divider';

        const rawChildren = node.children || props.children || [];
        const rawArray = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
        const children = rawArray.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false);

        const bin = new Uint8Array(24);
        let opcode = this.OPCODE_MAP[tag] || 0x12;

        if (tag === 'input' && props.type === 'range') {
            opcode = 0x19;
        }

        const tokens = className.trim().split(/\s+/).filter(Boolean);

        if (tokens.includes('btn') && opcode === 0x12) opcode = 0x10;

        let pt = 0, pr = 0, pb = 0, pl = 0;
        let mt = 0, mr = 0, mb = 0, ml = 0;
        let bgPalette = 0, bgShade = 0;
        let textColorCode = 0, textColorShade = 128;
        let borderWidth = 0, borderColor = '#334155';
        let borderSide = 'all';
        let radius = 0;
        let flexWeight = 0;
        let gravity = (opcode === 0x10) ? 0x02 : 0x01; // Buttons default to center (0x02)
        let sigFlags = 0;
        let stateKey = props.stateKey || props['state-key'] || props.state || '';
        let fromColor = '', toColor = '';
        let animString = props.animation || '';
        if (props.gradient) sigFlags |= 0x01;
        if (props.animation) sigFlags |= 0x10;
        let isRow = (tag === 'row' || tag === 'hstack');
        let isCol = (tag === 'column' || tag === 'vstack');
        let isGrid = false;
        let gapPx = (typeof props.gap === 'number') ? props.gap * 4 : 0;
        let elevation = 0;
        let fontSize = 0;
        // Form controls and buttons default to wrap content (0), containers default to full width (-1)
        let w = (opcode === 0x10 || opcode === 0x1a || opcode === 0x1b || opcode === 0x1c || opcode === 0x16) ? 0 : -1;
        let h = 0;  // Default to wrap content (0)
        let opacity = 1.0;

        if (isSpacer) {
            flexWeight = 1;
            w = 0;
            h = 0;
        }

        if (isDivider) {
            h = 1;
            w = -1;
            bgPalette = 0x07; // Slate
            bgShade = 200;    // 800
        }

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];

            if (t === 'flex-row' || t === 'flex') { isRow = true; isCol = false; }
            else if (t === 'grid-cols-1') { isCol = true; isRow = false; isGrid = true; }
            else if (t.startsWith('grid-cols-') || t === 'grid') { isRow = true; isCol = false; isGrid = true; }
            else if (t === 'flex-col' || t === 'flex-column') { isCol = true; isRow = false; }
            else if (t === 'flex-1') flexWeight = 1;
            else if (t === 'flex-2') flexWeight = 2;
            else if (t === 'flex-3') flexWeight = 3;
            else if (t === 'w-full') w = -1;
            else if (t === 'w-auto' || t === 'w-fit' || t === 'w-max') { w = 0; flexWeight = 0; }
            else if (t === 'shrink-0' || t === 'flex-shrink-0') { flexWeight = 0; }
            else if (t === 'h-full') h = -1;
            else if (t === 'h-auto' || t === 'h-fit') h = 0;
            else if (t.startsWith('h-')) {
                const hVal = this._parseUnits(t.slice(2));
                if (hVal > 0) h = hVal;
            } else if (t.startsWith('w-')) {
                const wVal = this._parseUnits(t.slice(2));
                if (wVal > 0) w = wVal;
            }
            else if (t === 'items-center') gravity = 0x02;
            else if (t === 'items-end') gravity = 0x03;
            else if (t === 'items-start') gravity = 0x01;
            else if (t === 'justify-center') gravity = 0x02;
            else if (t === 'justify-between') sigFlags |= 0x20;

            else if (t.startsWith('animate-')) {
                animString = t.slice(8);
                sigFlags |= 0x10;
            }
            else if (t.startsWith('gap-') || t.startsWith('gap-y-') || t.startsWith('gap-x-') || t.startsWith('space-y-') || t.startsWith('space-x-')) {
                let gVal = 0;
                if (t.startsWith('space-y-')) gVal = parseInt(t.slice(8), 10);
                else if (t.startsWith('space-x-')) gVal = parseInt(t.slice(8), 10);
                else if (t.startsWith('gap-y-')) gVal = parseInt(t.slice(6), 10);
                else if (t.startsWith('gap-x-')) gVal = parseInt(t.slice(6), 10);
                else if (t.startsWith('gap-')) gVal = parseInt(t.slice(4), 10);
                if (!isNaN(gVal) && gVal > 0) gapPx = gVal * 4;
            }

            else if (t.startsWith('p-') && !t.startsWith('px-') && !t.startsWith('py-') && !t.startsWith('pt-') && !t.startsWith('pr-') && !t.startsWith('pb-') && !t.startsWith('pl-')) {
                const val = this._parseUnits(t.slice(2));
                pt = val; pr = val; pb = val; pl = val;
            } else if (t.startsWith('px-')) {
                const val = this._parseUnits(t.slice(3));
                pr = val; pl = val;
            } else if (t.startsWith('py-')) {
                const val = this._parseUnits(t.slice(3));
                pt = val; pb = val;
            } else if (t.startsWith('pt-')) pt = this._parseUnits(t.slice(3));
            else if (t.startsWith('pr-')) pr = this._parseUnits(t.slice(3));
            else if (t.startsWith('pb-')) pb = this._parseUnits(t.slice(3));
            else if (t.startsWith('pl-')) pl = this._parseUnits(t.slice(3));

            else if (t.startsWith('m-') && !t.startsWith('mx-') && !t.startsWith('my-') && !t.startsWith('mt-') && !t.startsWith('mr-') && !t.startsWith('mb-') && !t.startsWith('ml-')) {
                const val = this._parseUnits(t.slice(2));
                mt = val; mr = val; mb = val; ml = val;
            } else if (t.startsWith('mx-')) {
                const val = this._parseUnits(t.slice(3));
                mr = val; ml = val;
            } else if (t.startsWith('my-')) {
                const val = this._parseUnits(t.slice(3));
                mt = val; mb = val;
            } else if (t.startsWith('mt-')) mt = this._parseUnits(t.slice(3));
            else if (t.startsWith('mr-')) mr = this._parseUnits(t.slice(3));
            else if (t.startsWith('mb-')) mb = this._parseUnits(t.slice(3));
            else if (t.startsWith('ml-')) ml = this._parseUnits(t.slice(3));

            // Background & Gradient parsing
            else if (t.startsWith('bg-gradient-')) {
                sigFlags |= 0x01;
            } else if (t.startsWith('from-')) {
                const clean = t.slice(5);
                fromColor = clean;
                const [pal, sh] = this._resolveColorAndShade(clean);
                if (pal !== 0) {
                    bgPalette = pal;
                    bgShade = sh;
                }
            } else if (t.startsWith('to-')) {
                toColor = t.slice(3);
                sigFlags |= 0x01;
                const [pal, sh] = this._resolveColorAndShade(toColor);
                if (bgPalette === 0 && pal !== 0) {
                    bgPalette = pal;
                    bgShade = sh;
                }
            } else if (t.startsWith('bg-')) {
                const clean = t.slice(3);
                const [pal, sh] = this._resolveColorAndShade(clean);
                if (pal !== 0) {
                    bgPalette = pal;
                    bgShade = sh;
                }
            }

            // Text color parsing
            else if (t.startsWith('text-')) {
                const clean = t.slice(5);
                if (clean === 'xs') fontSize = 11;
                else if (clean === 'sm') fontSize = 13;
                else if (clean === 'base') fontSize = 15;
                else if (clean === 'lg') fontSize = 18;
                else if (clean === 'xl') fontSize = 20;
                else if (clean === '2xl') fontSize = 24;
                else if (clean === '3xl') fontSize = 30;
                else if (clean === '4xl') fontSize = 36;
                else {
                    const [pal, sh] = this._resolveColorAndShade(clean);
                    if (pal !== 0) {
                        textColorCode = pal;
                        textColorShade = sh;
                    }
                }
            }

            // Border parsing
            else if (t === 'border') {
                borderWidth = 1;
                borderSide = 'all';
                sigFlags |= 0x04;
            } else if (t === 'border-t') {
                borderWidth = 1;
                borderSide = 'top';
                sigFlags |= 0x04;
            } else if (t === 'border-b') {
                borderWidth = 1;
                borderSide = 'bottom';
                sigFlags |= 0x04;
            } else if (t === 'border-l') {
                borderWidth = 1;
                borderSide = 'left';
                sigFlags |= 0x04;
            } else if (t === 'border-r') {
                borderWidth = 1;
                borderSide = 'right';
                sigFlags |= 0x04;
            } else if (t.startsWith('border-t-')) {
                borderSide = 'top';
                borderWidth = parseInt(t.slice(9), 10) || 1;
                sigFlags |= 0x04;
            } else if (t.startsWith('border-b-')) {
                borderSide = 'bottom';
                borderWidth = parseInt(t.slice(9), 10) || 1;
                sigFlags |= 0x04;
            } else if (t.startsWith('border-l-')) {
                borderSide = 'left';
                borderWidth = parseInt(t.slice(9), 10) || 1;
                sigFlags |= 0x04;
            } else if (t.startsWith('border-r-')) {
                borderSide = 'right';
                borderWidth = parseInt(t.slice(9), 10) || 1;
                sigFlags |= 0x04;
            } else if (t.startsWith('border-')) {
                const sub = t.slice(7);
                const num = parseInt(sub, 10);
                if (!isNaN(num) && !sub.includes('-')) {
                    borderWidth = num;
                    sigFlags |= 0x04;
                } else if (sub === 'none' || sub === '0' || sub === 'transparent') {
                    borderWidth = 0;
                    sigFlags &= ~0x04;
                } else {
                    sigFlags |= 0x04;
                    borderColor = sub;
                }
            }

            // Radius parsing
            else if (t === 'rounded') radius = 4;
            else if (t === 'rounded-full' || t === 'rounded-circle') radius = 255;
            else if (t === 'rounded-sm') radius = 2;
            else if (t === 'rounded-md') radius = 6;
            else if (t === 'rounded-lg') radius = 8;
            else if (t === 'rounded-xl') radius = 12;
            else if (t === 'rounded-2xl') radius = 16;
            else if (t === 'rounded-3xl') radius = 24;
            else if (t.startsWith('rounded-[')) {
                radius = this._parseUnits(t.slice(8, -1));
            }

            // Min-width / Max-width
            else if (t.startsWith('min-w-[')) {
                const mw = this._parseUnits(t.slice(6, -1));
                if (mw > 0 && w < mw) w = mw;
            }

            // Shadow
            else if (t === 'shadow' || t.startsWith('shadow-')) {
                sigFlags |= 0x40;
                elevation = 4;
            }
        }

        if (props.width !== undefined) {
            const pw = parseInt(props.width, 10);
            if (!isNaN(pw) && pw > 0) w = pw;
        }
        if (props.height !== undefined) {
            const ph = parseInt(props.height, 10);
            if (!isNaN(ph) && ph > 0) h = ph;
        }
        if (props.size !== undefined) {
            const psz = parseInt(props.size, 10);
            if (!isNaN(psz) && psz > 0) { w = psz; h = psz; }
        }
        if (props.canvas && typeof props.canvas === 'string' && props.canvas.includes('x')) {
            const [cw, ch] = props.canvas.split('x');
            const pcw = parseInt(cw, 10);
            const pch = parseInt(ch, 10);
            if (!isNaN(pcw) && pcw > 0) w = pcw;
            if (!isNaN(pch) && pch > 0) h = pch;
        }

        let cols = 1;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.startsWith('grid-cols-')) {
                const c = parseInt(t.slice(10), 10);
                if (!isNaN(c) && c > 1) cols = c;
            }
        }
        if (cols === 1 && isGrid) {
            isCol = true;
            isRow = false;
        }

        let compileChildren = children;
        if (cols > 1 && Array.isArray(children) && children.length > cols) {
            const rows = [];
            for (let i = 0; i < children.length; i += cols) {
                const rowChildren = children.slice(i, i + cols).map(c => {
                    if (c && typeof c === 'object' && c.props) {
                        const cCls = String(c.props.className || '');
                        if (!cCls.includes('flex-')) {
                            c.props.className = (cCls + ' flex-1').trim();
                        }
                    }
                    return c;
                });
                rows.push({
                    tag: 'row',
                    props: { className: `w-full flex flex-row gap-${Math.floor(gapPx / 4) || 2}` },
                    children: rowChildren
                });
            }
            compileChildren = rows;
            isCol = true;
            isRow = false;
        }

        const isPageContainer = (props['data-page'] !== undefined || props['page'] !== undefined);
        if (!isPageContainer && (tokens.includes('overflow-x-auto') || tokens.includes('scroll-x') || tokens.includes('overflow-x-scroll') || tag === 'hscroll' || tag === 'HorizontalScrollView')) {
            opcode = 0x20; // createHorizontalListView (HorizontalScrollView)
        } else if (!isPageContainer && (tokens.includes('overflow-y-auto') || tokens.includes('scroll-y') || tokens.includes('overflow-scroll') || tag === 'scroll' || tag === 'ScrollView' || tag === 'ListView' || tag === 'list')) {
            opcode = 0x1E; // createListView (DolphinScrollView with weight=1f)
        } else if (tag === 'container' || tag === 'div' || tag === 'main' || tag === 'section' || tag === 'column') {
            if (isRow && !isPageContainer) opcode = 0x14;
            else opcode = 0x13;
        }

        if (tag === 'draw' || tag === 'svg' || tag === 'thorvg') {
            opcode = 0x61; // ThorVG
            const pw = parseInt(props.width, 10);
            const ph = parseInt(props.height, 10);
            if (!isNaN(pw) && pw > 0) w = pw;
            if (!isNaN(ph) && ph > 0) h = ph;
            if (!props.svg && Array.isArray(children) && children.length > 0) {
                const viewBox = props.viewBox || (props.canvas ? `0 0 ${props.canvas.replace('x', ' ')}` : (w > 0 && h > 0 ? `0 0 ${w} ${h}` : '0 0 340 50'));
                let inner = '';
                for (const c of children) {
                    inner += this._serializeVNodeToSvg(c);
                }
                props.svg = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg"${w > 0 ? ` width="${w}"` : ''}${h > 0 ? ` height="${h}"` : ''}>${inner}</svg>`;
            }
        } else if (tag === 'seg7' || tag === '7seg' || tag === 'sevensegment') {
            opcode = 0x61; // ThorVG 7-Segment CAD LED Display
            const rxVal = props.rx !== undefined ? props.rx : (props.address !== undefined ? props.address : '');
            const themeVal = props.theme || 'red';
            const digitsVal = props.digits || 4;
            const pw = parseInt(props.width, 10);
            const ph = parseInt(props.height, 10);
            w = (!isNaN(pw) && pw > 0) ? pw : 240;
            h = (!isNaN(ph) && ph > 0) ? ph : 48;
            props.svg = `<svg data-rx="${rxVal}" rx="${rxVal}" theme="${themeVal}" digits="${digitsVal}" class="seg7" width="${w}" height="${h}"></svg>`;
        }

        // Text & Leaf sizing defaults
        if (opcode === 0x16) {
            if (!tokens.includes('w-full')) { w = 0; }
            h = 0;
            if (textColorCode === 0) {
                textColorCode = 10; // default white text on dark background
                textColorShade = 250;
            }
        }

        // Check for 1px divider views (e.g. h-px, h-[1px], or height: 1)
        if (isDivider || h === 1 || (className && (className.includes('h-px') || className.includes('h-[1px]')))) {
            // Dividers are solid colored lines; prevent 4-sided outline box
            sigFlags &= ~0x04;
        }

        // Count direct children for layout containers
        const isContainer = (opcode === 0x12 || opcode === 0x13 || opcode === 0x14 || opcode === 0x11 || opcode === 0x1E || opcode === 0x20 || opcode === 0x24 || opcode === 0x30);
        let childCount = 0;
        if (isContainer) {
            childCount = compileChildren.length;
        }

        // Byte 0: Flex | Gravity
        bin[0] = ((flexWeight & 0x0F) << 4) | (gravity & 0x0F);

        // Byte 1: Opcode
        bin[1] = opcode;

        // Byte 2: Background Shade
        bin[2] = bgShade & 0xFF;

        // Byte 3: Background Palette Color
        bin[3] = bgPalette & 0xFF;

        // Bytes 4-7: Padding
        bin[4] = Math.min(pt, 255);
        bin[5] = Math.min(pr, 255);
        bin[6] = Math.min(pb, 255);
        bin[7] = Math.min(pl, 255);

        // Bytes 8-11: Margin
        bin[8] = (256 + mt) & 0xFF;
        bin[9] = (256 + mr) & 0xFF;
        bin[10] = (256 + mb) & 0xFF;
        bin[11] = (256 + ml) & 0xFF;

        // Byte 12: Contextual (Orientation + Gap for Containers, Speed + Shade for Text)
        if (isContainer) {
            const orientationBit = (opcode === 0x14 || (isRow && !isPageContainer)) ? 1 : 0;
            const gapUnit = Math.min(Math.floor(gapPx / 4), 15);
            bin[12] = (orientationBit & 0x0F) | ((gapUnit & 0x0F) << 4);
            // Byte 13: CRITICAL child count for Kotlin ColumnBuilder / RowBuilder / CardBuilder
            bin[13] = childCount & 0xFF;
        } else if (opcode === 0x16 || opcode === 0x10) {
            const shadeSentinel = Math.floor(textColorShade / 8) & 0x1F;
            bin[12] = (shadeSentinel & 0x1F) | (4 << 5);
            bin[13] = textColorCode & 0xFF;
        } else {
            bin[12] = 0;
            bin[13] = 0;
        }

        // Byte 14: Radius
        if (opcode === 0x19) {
            bin[14] = (props.initialValue || props.value || 0) & 0xFF;
        } else {
            bin[14] = Math.min(radius, 255);
        }

        // Byte 15: Signature Flags (legacy 16-byte offset)
        bin[15] = sigFlags & 0xFF;

        // ── ⚡ 16-Bit Hardware Bus Wiring (Bytes 16..19) ───────────────────
        // Resolve tx register address and optional implicit slot
        const reqTx = props.tx !== undefined ? props.tx : ((opcode === 0x30 || tag === 'route') ? 10 : undefined);
        const txResolution = TitanRegisters.resolveRegisterAndSlot ? TitanRegisters.resolveRegisterAndSlot(reqTx) : { reg: TitanRegisters.resolve(reqTx), slot: 0 };
        let txNum = txResolution.reg;
        let impliedTxSlot = txResolution.slot;

        if (!txNum && typeof props.action === 'string' && props.action.startsWith('bus:')) {
            const raw = props.action.replace('bus:', '');
            if (raw.startsWith('write:')) {
                const parts = raw.split(':');
                txNum = TitanRegisters.resolve(parts[1] || '0');
            } else {
                txNum = TitanRegisters.resolve(raw);
            }
        }
        if (!txNum && typeof props.action === 'string') {
            txNum = TitanRegisters.resolve(props.action);
        }
        if (!txNum) {
            if (targetTokens.includes('flip')) txNum = 0x00E1; // Fixed TARGET_REG_FLIP
            else if (targetTokens.includes('save')) txNum = 0x00E2; // Fixed TARGET_REG_SAVE
            else if (targetTokens.includes('delete')) txNum = 0x00E3; // Fixed TARGET_REG_DELETE
        }
        bin[16] = (txNum >> 8) & 0xFF;
        bin[17] = txNum & 0xFF;

        // Byte 18..19: rx register address and optional implicit slot
        const reqRx = props.rx !== undefined ? props.rx : ((opcode === 0x30 || tag === 'route') ? 10 : undefined);
        const rxResolution = TitanRegisters.resolveRegisterAndSlot ? TitanRegisters.resolveRegisterAndSlot(reqRx) : { reg: TitanRegisters.resolve(reqRx), slot: 0 };
        let rxNum = rxResolution.reg;
        let impliedRxSlot = rxResolution.slot;

        if (!rxNum) {
            if (targetTokens.includes('mirror')) rxNum = 0x00E4; // Fixed TARGET_REG_MIRROR
            else if (targetTokens.includes('editable')) rxNum = 0x00E5; // Fixed TARGET_REG_EDITABLE
        }

        // ── ⚡ CSS & ID CARRIER MODULATION SECTION (Bytes 16..22) ───────────────────
        const carrierProp = props.carrier !== undefined ? props.carrier : (props.carrierId !== undefined ? props.carrierId : null);
        if (carrierProp !== null && !isNaN(Number(carrierProp))) {
            const cNum = Number(carrierProp) & 0xFFFF;
            if (!rxNum) rxNum = cNum;
            if (!txNum && opcode === 0x10) txNum = cNum;
        }

        let slotNum = 0;
        // Prioritize explicit slot prop, fallback to implied slot from form::field namespace
        if (impliedTxSlot) slotNum = impliedTxSlot;
        else if (impliedRxSlot) slotNum = impliedRxSlot;

        const slotProp = props.slot !== undefined ? props.slot : (props['data-slot'] !== undefined ? props['data-slot'] : null);
        if (slotProp !== null) {
            if (typeof slotProp === 'object' && slotProp !== null && slotProp.slot !== undefined) {
                slotNum = Number(slotProp.slot) & 0xFF;
            } else {
                const parsed = parseInt(slotProp, 10);
                if (!isNaN(parsed)) {
                    slotNum = parsed & 0xFF;
                } else if (typeof slotProp === 'string') {
                    const resolvedSlot = TitanRegisters.resolveSlot ? TitanRegisters.resolveSlot(slotProp) : 0;
                    if (resolvedSlot) {
                        slotNum = resolvedSlot & 0xFF;
                    } else {
                        // Dynamic slot identifier or variable name
                        slotNum = 1;
                    }
                }
            }
        }

        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.startsWith('c-rx-') || t.startsWith('carrier-rx-')) {
                const sub = t.replace(/^c-rx-|^carrier-rx-/, '');
                rxNum = (sub.startsWith('0x') || sub.startsWith('0X') ? parseInt(sub, 16) : parseInt(sub, 10)) & 0xFFFF;
            } else if (t.startsWith('c-tx-') || t.startsWith('carrier-tx-')) {
                const sub = t.replace(/^c-tx-|^carrier-tx-/, '');
                txNum = (sub.startsWith('0x') || sub.startsWith('0X') ? parseInt(sub, 16) : parseInt(sub, 10)) & 0xFFFF;
            } else if (t.startsWith('c-slot-') || t.startsWith('carrier-slot-') || t.startsWith('slot-')) {
                const sub = t.replace(/^c-slot-|^carrier-slot-|^slot-/, '');
                slotNum = parseInt(sub, 10) || 0;
            }
        }

        let txVal = 0;
        if (props.txValue !== undefined && props.txValue !== null) {
            txVal = Number(props.txValue) & 0xFFFF;
        }

        bin[16] = (txNum >> 8) & 0xFF;
        bin[17] = txNum & 0xFF;
        bin[18] = (rxNum >> 8) & 0xFF;
        bin[19] = rxNum & 0xFF;
        bin[20] = slotNum & 0xFF;
        bin[21] = (txVal >> 8) & 0xFF;
        bin[22] = txVal & 0xFF;

        // Byte 23: Signature Flags (24-byte protocol footer)
        bin[23] = sigFlags & 0xFF;

        binaries.push(bin);
        nodes.push({ tag, opcode, text: node.text || props.label || props.text || '', props, children });

        // ── STRING POOL ALIGNMENT (Strict contract with ViewFactory.kt) ──
        // 1. Universal Header: sizeStr = "w|h|elevation|fontSize|opacity|glass|glow"
        const sizeStr = `${w}|${h}|${elevation}|${fontSize}|${opacity}||`;
        stringPool.push(sizeStr);

        // 2. Feature strings
        if (sigFlags & 0x01) {
            let gStr = props.gradient;
            if (!gStr && fromColor && toColor) {
                const c1 = fromColor.split('-')[0];
                const c2 = toColor.split('-')[0];
                gStr = `gradient-horiz-${c1}-128-${c2}-128`;
            }
            stringPool.push(gStr || 'gradient-horiz-blue-128-cyan-128');
        }
        if (sigFlags & 0x04) {
            const hex = this._resolveBorderColorHex(borderColor);
            stringPool.push(`${borderWidth || 1}px|solid|${hex}|${borderSide}`);
        }
        if (sigFlags & 0x08) {
            stringPool.push(stateKey ? `text:${stateKey}` : '');
        }
        if (sigFlags & 0x10) {
            stringPool.push(animString || props.animation || 'fade');
        }

        // 3. Component-Specific Strings
        switch (opcode) {
            case 0x16: { // Text
                let textContent = '';
                if (node.text !== undefined && node.text !== null) {
                    textContent = String(node.text);
                } else if (props.text !== undefined && props.text !== null) {
                    textContent = String(props.text);
                } else if (props.label !== undefined && props.label !== null) {
                    textContent = String(props.label);
                } else if (Array.isArray(children) && children.length > 0) {
                    textContent = children.map(c => {
                        if (c === null || c === undefined) return '';
                        if (typeof c === 'string' || typeof c === 'number') return String(c);
                        if (typeof c === 'object' && (c.text !== undefined || c.children !== undefined)) {
                            return c.text !== undefined ? String(c.text) : (Array.isArray(c.children) ? c.children.join('') : String(c.children));
                        }
                        return '';
                    }).join('');
                } else if (children !== null && children !== undefined) {
                    textContent = String(children);
                }
                if (stateKey) {
                    stringPool.push(`stateKey:${stateKey}|${textContent}`);
                } else {
                    stringPool.push(textContent || '');
                }
                break;
            }
            case 0x10: { // Button
                let btnLabel = node.text || props.label || props.title || props.text || '';
                let btnIcon = props.icon || '';
                if (Array.isArray(children)) {
                    const texts = [];
                    for (const c of children) {
                        if (typeof c === 'string' || typeof c === 'number') texts.push(String(c));
                        else if (c && (typeof c.text === 'string' || typeof c.text === 'number')) texts.push(String(c.text));
                        else if (c && Array.isArray(c.children)) {
                            for (const gc of c.children) {
                                if (typeof gc === 'string' || typeof gc === 'number') texts.push(String(gc));
                                else if (gc && (typeof gc.text === 'string' || typeof gc.text === 'number')) texts.push(String(gc.text));
                            }
                        }
                        if (c && (c.tag === 'icon' || c.type === 'icon')) {
                            if (!btnIcon && c.props && (c.props.name || c.props.icon)) {
                                btnIcon = c.props.name || c.props.icon;
                            }
                        }
                    }
                    if (!btnLabel) btnLabel = texts.join(' ').trim();
                } else if (!btnLabel && typeof children === 'string') {
                    btnLabel = children.trim();
                }
                let btnAction = props.action || '';
                if (!btnAction) {
                    if (targetTokens.includes('flip')) btnAction = 'target:flip';
                    else if (targetTokens.includes('save')) btnAction = 'target:save';
                    else if (targetTokens.includes('delete')) btnAction = 'target:delete';
                    else if (targetTokens.includes('theme') || targetTokens.includes('toggle')) btnAction = 'toggle_theme';
                    else if (txNum > 0) {
                        btnAction = `bus:0x${txNum.toString(16)}`;
                    } else if (props.tx !== undefined && props.tx !== null) {
                        const res = TitanRegisters.resolve(props.tx);
                        btnAction = res > 0 ? `bus:0x${res.toString(16)}` : `bus:${props.tx}`;
                    }
                }
                stringPool.push(btnAction);
                // 🛡️ ACCESSIBILITY & ICON FIX: Pure icon buttons must have empty string label so they render as clean centered ImageView
                stringPool.push(btnLabel || '');
                stringPool.push(btnIcon);
                break;
            }
            case 0x12: // Container
            case 0x13: // Column / VStack
            case 0x14: // Row / HStack
            case 0x11: // Card
            case 0x24: // FlipCard
            case 0x1E: // ListView / ScrollView
            case 0x20: // HorizontalListView / Scroll-X
            case 0x22: { // Grid / GridView
                let act = props.collection ? `collection:${props.collection}` : (props.action || '');
                if (!act && props.rx !== undefined) {
                    const res = TitanRegisters.resolve(props.rx); act = res > 0 ? `rx:0x${res.toString(16)}` : `rx:${props.rx}`;
                }
                if (!act && props['data-page'] !== undefined) {
                    act = `page:${props['data-page']}`;
                }
                if (rawTarget) {
                    act = act ? `${act};target:${rawTarget}` : `target:${rawTarget}`;
                }
                stringPool.push(act);
                break;
            }
            case 0x50: { // CameraView Native Live TextureView
                stringPool.push(props.cameraId || props.facing || 'back');
                stringPool.push(props.action || '');
                break;
            }
            case 0x52: { // Video / VideoPlayer / TitanDisk Stream
                const ctrlFlag = props.controls ? 'controls:true' : '';
                const loopFlag = props.loop ? 'loop:true' : '';
                const autoFlag = (props.autoPlay || props.autoplay) ? 'autoplay:true' : '';
                const actionParts = [props.action || '', ctrlFlag, loopFlag, autoFlag].filter(Boolean).join(';');
                stringPool.push(actionParts);
                stringPool.push(props.src || props.url || 'disk://assets/videos/sample.mp4');
                break;
            }
            case 0x54: { // Audio / AudioPlayer
                const ctrlFlag = props.controls ? 'controls:true' : '';
                const actionParts = [props.action || '', ctrlFlag].filter(Boolean).join(';');
                stringPool.push(actionParts);
                stringPool.push(props.src || props.url || '');
                break;
            }
            case 0x70: { // videocall: peerId, mode, action
                stringPool.push(props.peerId || props.target || props.to || '');
                stringPool.push(props.mode || 'p2p_mesh');
                stringPool.push(props.action || '');
                break;
            }
            case 0x71: { // videostream: src, codec, latency
                stringPool.push(props.src || props.url || '');
                stringPool.push(props.codec || 'h264');
                stringPool.push(props.latency || 'low');
                break;
            }
            case 0x72: { // audiostream: peerId/channel, vuMeter
                stringPool.push(props.peerId || props.channel || '');
                stringPool.push(props.vuMeter ? 'vumeter:true' : 'vumeter:false');
                break;
            }
            case 0x73: { // titandisk: mode, peerId, token
                stringPool.push(props.mode || 'stream');
                stringPool.push(props.peerId || '');
                stringPool.push(props.token || '');
                break;
            }
            case 0x74: { // hoster: name, broadcast, tunnel
                stringPool.push(props.name || 'live_hoster');
                stringPool.push(props.broadcast || 'camera');
                stringPool.push(props.tunnel || 'auto');
                break;
            }
            case 0x17: { // Image
                stringPool.push(props.src || props.url || '');
                break;
            }
            case 0x19: { // Slider
                const sliderAction = props.tx !== undefined ? `bus:${props.tx}` : (props.action || stateKey || '');
                stringPool.push(sliderAction);
                stringPool.push(props.label || '');
                break;
            }
            case 0x18: { // TextField / Input
                stringPool.push(stateKey || props.name || (props.rx !== undefined ? `0x${Number(props.rx).toString(16)}` : '') || '');
                stringPool.push(props.label || '');
                stringPool.push(props.placeholder || props.hint || '');
                stringPool.push(props.type || 'text');
                const vTarget = rawTarget ? `${props.variant || 'plain'};target:${rawTarget}` : (props.variant || 'plain');
                stringPool.push(vTarget);
                stringPool.push(props.icon || '');
                break;
            }
            case 0x1A: { // Switch / Toggle
                const switchAction = props.tx !== undefined ? `bus:${props.tx}` : (props.rx !== undefined ? `bus:${props.rx}` : (props.action || stateKey || props.name || ''));
                stringPool.push(switchAction);
                stringPool.push(props.label || props.title || '');
                stringPool.push(props.size || 'md');
                stringPool.push(props.trackColor || '');
                break;
            }
            case 0x1B: { // Checkbox
                const checkAction = props.tx !== undefined ? `bus:${props.tx}` : (props.rx !== undefined ? `bus:${props.rx}` : (props.action || stateKey || props.name || ''));
                stringPool.push(checkAction);
                stringPool.push(props.label || props.title || (typeof props.children === 'string' ? props.children : ''));
                break;
            }
            case 0x1C: { // Select / Dropdown
                const selectAction = props.tx !== undefined ? `bus:${props.tx}` : (props.rx !== undefined ? `bus:${props.rx}` : (props.action || stateKey || props.name || ''));
                stringPool.push(selectAction);
                stringPool.push(props.label || props.title || '');
                const opts = Array.isArray(props.options) ? props.options.join(',') : (props.options || '');
                stringPool.push(opts);
                stringPool.push(props.value || props.initial || props.defaultValue || '');
                break;
            }
            case 0x1F: { // Radio
                const radioAction = props.tx !== undefined ? `bus:${props.tx}` : (props.rx !== undefined ? `bus:${props.rx}` : (props.action || stateKey || props.name || ''));
                const rVal = props.value !== undefined ? String(props.value) : '';
                const rLbl = props.label || props.title || (typeof props.children === 'string' ? props.children : '') || rVal;
                const combined = rVal ? `${rVal}|${rLbl}` : rLbl;
                stringPool.push(radioAction);
                stringPool.push(combined);
                break;
            }
            case 0x23: { // Icon
                stringPool.push(props.name || props.icon || '');
                break;
            }
            case 0x61: { // ThorVG
                const action = props.action || (props.rx !== undefined ? `bus:${props.rx}` : (props.tx !== undefined ? `bus:${props.tx}` : (props.address !== undefined ? `bus:${props.address}` : '')));
                stringPool.push(action);
                stringPool.push(props.svg || props.src || '');
                break;
            }
            case 0x30: { // Route Commutator
                const routeUrl = String(props.url || props.path || '');
                const routeMethod = String(props.method || 'GET').toUpperCase();
                const routeInterval = props.interval ? String(props.interval) : '0';
                stringPool.push(`${routeUrl}|${routeMethod}|${routeInterval}`);
                break;
            }
            default:
                break;
        }

        if (opcode === 0x30 || tag === 'route') {
            const routeUrl = String(props.url || props.path || '');
            routes.push({
                url: routeUrl,
                rx: rxNum,
                rxSlot: impliedRxSlot,
                tx: txNum,
                txSlot: impliedTxSlot,
                method: String(props.method || 'GET').toUpperCase(),
                interval: Number(props.interval || 0)
            });
        }

        // 4. Recursively compile children
        if (isContainer && Array.isArray(compileChildren)) {
            for (let c = 0; c < compileChildren.length; c++) {
                const child = compileChildren[c];
                if (isGrid && cols <= 1 && child && typeof child === 'object' && child.props) {
                    const cCls = String(child.props.className || '');
                    if (!cCls.includes('flex-')) {
                        child.props.className = (cCls + ' flex-1').trim();
                    }
                }
                this._compileNode(child, binaries, stringPool, nodes, routes);
            }
        }
    }

    _parseUnits(str) {
        if (!str) return 0;
        if (str.startsWith('[') && str.endsWith('px]')) {
            return parseFloat(str.slice(1, -3)) || 0;
        }
        const val = parseFloat(str);
        if (isNaN(val)) return 0;
        return Math.round(val * 4);
    }

    _resolveColorAndShade(colorStr) {
        if (!colorStr) return [0, 0];
        let clean = colorStr;
        let opacity = 100;

        if (clean.includes('/')) {
            const parts = clean.split('/');
            clean = parts[0];
            opacity = parseInt(parts[1], 10) || 100;
        }

        // Support custom hex format: [#070c18] or [#0f172a]
        if (clean.startsWith('[#') && clean.endsWith(']')) {
            const hex = clean.slice(2, -1).toLowerCase();
            // Map dark backgrounds to slate-950/dark (0x07, 250)
            if (hex === '070c18' || hex === '0f172a' || hex === '020617') {
                return [0x07, 250]; // Slate-950
            }
            if (hex === '10b981') return [0x0E, 128]; // Emerald-500
            if (hex === '38bdf8') return [0x0C, 100]; // Sky-400
            if (hex === 'ef4444') return [0x04, 128]; // Red-500
            if (hex === '3b82f6') return [0x01, 128]; // Blue-500
            return [0x07, 128]; // Default fallback
        }

        const segments = clean.split('-');
        const colorName = segments[0];
        const shadeNum = segments[1] ? parseInt(segments[1], 10) : 500;

        const paletteId = this.PALETTE_MAP[colorName] || 0;
        let shadeByte = Math.min(Math.round(shadeNum / 4), 250);

        if (opacity === 90) shadeByte = 254;
        else if (opacity === 80) shadeByte = 253;
        else if (opacity === 40) shadeByte = 252;
        else if (opacity === 60) shadeByte = 251;

        return [paletteId, shadeByte];
    }

    _resolveBorderColorHex(colorStr) {
        if (!colorStr) return '#334155';
        if (colorStr.startsWith('#')) return colorStr;
        if (colorStr.startsWith('[#') && colorStr.endsWith(']')) return '#' + colorStr.slice(2, -1);

        let clean = colorStr;
        let opacity = 1.0;
        if (clean.includes('/')) {
            const [c, op] = clean.split('/');
            clean = c;
            opacity = (parseInt(op, 10) || 100) / 100.0;
        }

        const TAILWIND_500 = {
            slate: [100, 116, 139],
            gray: [107, 114, 128],
            zinc: [113, 113, 122],
            red: [239, 68, 68],
            orange: [249, 115, 22],
            amber: [245, 158, 11],
            yellow: [234, 179, 8],
            lime: [132, 204, 22],
            green: [34, 197, 94],
            emerald: [16, 185, 129],
            teal: [20, 184, 166],
            cyan: [6, 182, 212],
            sky: [14, 165, 233],
            blue: [59, 130, 246],
            indigo: [99, 102, 241],
            violet: [139, 92, 246],
            purple: [168, 85, 247],
            fuchsia: [217, 70, 239],
            pink: [236, 72, 153],
            rose: [244, 63, 94]
        };

        const parts = clean.split('-');
        const name = parts[0];
        const shade = parts[1] ? parseInt(parts[1], 10) : 500;

        let rgb = TAILWIND_500[name];
        if (!rgb) {
            if (name === 'white') rgb = [255, 255, 255];
            else if (name === 'black') rgb = [0, 0, 0];
            else rgb = [51, 65, 85]; // slate-700
        }

        let [r, g, b] = rgb;
        if (shade >= 800) {
            r = Math.round(r * 0.4);
            g = Math.round(g * 0.4);
            b = Math.round(b * 0.4);
        } else if (shade >= 700) {
            r = Math.round(r * 0.6);
            g = Math.round(g * 0.6);
            b = Math.round(b * 0.6);
        } else if (shade <= 200) {
            r = Math.min(255, Math.round(r + (255 - r) * 0.7));
            g = Math.min(255, Math.round(g + (255 - g) * 0.7));
            b = Math.min(255, Math.round(b + (255 - b) * 0.7));
        }

        if (opacity < 1.0) {
            const a = Math.round(opacity * 255);
            return `#${a.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    _serializeVNodeToSvg(node) {
        if (!node) return '';
        if (typeof node === 'string') return node;
        const tag = node.tag || 'g';
        const props = node.props || {};
        const attrs = Object.entries(props)
            .filter(([k]) => k !== 'children' && k !== 'className' && k !== 'class')
            .map(([k, v]) => `${k}="${v}"`)
            .join(' ');

        let childrenStr = '';
        const children = node.children || props.children || [];
        const arr = Array.isArray(children) ? children : [children];
        for (const child of arr) {
            if (typeof child === 'string') childrenStr += child;
            else if (child && typeof child === 'object') {
                childrenStr += this._serializeVNodeToSvg(child);
            }
        }
        return `<${tag}${attrs ? ' ' + attrs : ''}>${childrenStr}</${tag}>`;
    }
}

module.exports = TitanCompiler;
