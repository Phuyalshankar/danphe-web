'use strict';

const path = require('path');
const fs = require('fs');

const WebCSS = require('./WebCSS');
const WebStateEngine = require('./WebStateEngine');
const WebMultimedia = require('./WebMultimedia');
const WebNavigation = require('./WebNavigation');

let titanDomBundle = '';
try {
    titanDomBundle = fs.readFileSync(path.join(__dirname, 'titan-dom.browser.js'), 'utf8');
} catch (e) {
    titanDomBundle = '';
}

/**
 * DolphinWebEngine — Smart Universal Dual-Target Web & SEO Engine
 * Renders Dolphin Native JSX pages into Semantic HTML5 with 100% Google SEO indexing
 * without touching or polluting the mobile Titan C++/Kotlin binary engine.
 * Decoupled into WebCSS, WebStateEngine, WebMultimedia, and WebNavigation modules.
 */
class DolphinWebEngine {
    constructor() {
        this.ub = null;
        try {
            this.ub = require('../framework/ub');
        } catch (e) {
            this.ub = null;
        }
        this._ensureGlobalHooks();
    }

    _ensureGlobalHooks() {
        if (typeof global.useState === 'undefined') {
            global.useState = function(initial) {
                var val = typeof initial === 'function' ? initial() : initial;
                return [val, function() {}];
            };
        }
        if (typeof global.useEffect === 'undefined') {
            global.useEffect = function(fn) {};
        }
        if (typeof global.useRef === 'undefined') {
            global.useRef = function(initial) { return { current: initial }; };
        }
        if (typeof global.useMemo === 'undefined') {
            global.useMemo = function(fn) { return typeof fn === 'function' ? fn() : fn; };
        }
        if (typeof global.useCallback === 'undefined') {
            global.useCallback = function(fn) { return fn; };
        }
        if (typeof process !== 'undefined' && process.env) {
            process.env.IS_WEB_ENGINE = 'true';
        }
        if (typeof global.useNanoState === 'undefined') {
            global.useNanoState = function(key, initial) {
                return [initial, function() {}];
            };
        }
    }

    _parseStateKeyString(str, stateMap = {}) {
        return WebStateEngine.parseStateKeyString(str, stateMap, this._escapeHTML.bind(this));
    }

    /**
     * Converts a Dolphin Native Component VNode into Semantic HTML5 with NanoStore State Resolution
     */
    vnodeToHTML(vnode, stateMap = {}) {
        // Target filtering for Web Engine: skip mobile-only elements
        const rawTarget = vnode ? (vnode.target || (vnode.props && vnode.props.target) || (vnode.attributes && vnode.attributes.target)) : '';
        const vnodeTarget = String(rawTarget || '').toLowerCase();
        if (vnodeTarget === 'mobile' || vnodeTarget === 'android' || vnodeTarget === 'ios' || vnodeTarget === 'phone') {
            return '';
        }

        if (typeof vnode === 'function') {
            try {
                return this.vnodeToHTML(vnode(), stateMap);
            } catch (e) {
                return '';
            }
        }
        if (vnode && typeof vnode.type === 'function') {
            try {
                return this.vnodeToHTML(vnode.type(vnode.props || {}), stateMap);
            } catch (e) {
                return '';
            }
        }
        if (vnode && typeof vnode.tag === 'function') {
            try {
                return this.vnodeToHTML(vnode.tag(vnode.props || {}), stateMap);
            } catch (e) {
                return '';
            }
        }
        if (typeof vnode === 'string' || typeof vnode === 'number') {
            return this._parseStateKeyString(String(vnode), stateMap);
        }
        if (Array.isArray(vnode)) {
            return vnode.map(child => this.vnodeToHTML(child, stateMap)).join('');
        }
        // Handle Fragment nodes
        if (vnode.type === 'fragment') {
            return (vnode.children || []).map(c => this.vnodeToHTML(c, stateMap)).join('');
        }

        // Handle HTML AST text node ({ type: 'text', value: '...' })
        if (vnode.type === 'text' || (vnode.value !== undefined && !vnode.tag && !vnode.children)) {
            const val = String(vnode.value || '').trim();
            if (!val || val.startsWith('{/*') || val.startsWith('//')) return '';
            return this._parseStateKeyString(val, stateMap);
        }

        // Normalize attributes: merge vnode.props and case-insensitive vnode.attributes
        const rawAttrs = vnode.attributes || {};
        const normAttrs = {};
        Object.keys(rawAttrs).forEach(k => {
            normAttrs[k.toLowerCase()] = rawAttrs[k];
        });

        const props = {
            ...normAttrs,
            ...(vnode.stateKey ? { stateKey: vnode.stateKey } : {}),
            ...(vnode.statekey ? { statekey: vnode.statekey } : {}),
            ...(vnode.action ? { action: vnode.action } : {}),
            ...(vnode.bus ? { bus: vnode.bus } : {}),
            ...(vnode.props || {})
        };
        if (!props.className && (props.class || normAttrs.class)) {
            props.className = props.class || normAttrs.class;
        }

        // PLATFORM FILTERING: If tag is marked for mobile/native, skip for Web HTML!
        const attrTarget = String(props.target || props.platform || '').toLowerCase().trim();
        if (attrTarget === 'mobile' || attrTarget === 'android' || attrTarget === 'native' || attrTarget === 'lvgl' || attrTarget === 'mcu') {
            return '';
        }

        // 🛡️ PIPE UNWRAP: Unwrap | ... | for Web so web-only classes are fully active!
        if (props.className && typeof props.className === 'string') {
            props.className = props.className.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
        }

        const children = props.children || vnode.children || vnode.text || [];

        // Determine HTML tag
        const compTypeProp = String(props.type || '').toLowerCase();
        let rawTag = (compTypeProp === '0x60' || compTypeProp === 'webview')
            ? 'iframe'
            : ((vnode.type && vnode.type !== 'element' && vnode.type !== 'fragment')
                ? vnode.type
                : (vnode.tag || props.tag || 'div'));
        if (typeof rawTag !== 'string') rawTag = 'div';
        rawTag = rawTag.toLowerCase();

        if (rawTag === 'mobileonly' || rawTag === 'nativeonly') return '';
        if (rawTag === 'webonly') rawTag = 'div';

        const tagMap = {
            'screen': 'main',
            'screencontainer': 'main',
            'text': 'p',
            'heading': 'h1',
            'title': 'h2',
            'subtitle': 'h3',
            'button': 'button',
            'image': 'img',
            'input': 'input',
            'row': 'div',
            'column': 'div',
            'stack': 'div',
            'vstack': 'div',
            'hstack': 'div',
            'spacer': 'div',
            'divider': 'hr',
            'container': 'div',
            'wrap': 'div',
            'center': 'div',
            'card': 'article',
            'flip-card': 'div',
            'flipcard': 'div',
            'list': 'div',
            'header': 'header',
            'footer': 'footer',
            'sidebar': 'aside',
            'nav': 'nav',
            'webview': 'iframe',
            '0x60': 'iframe',
            'nativecanvas': 'canvas',
            '0x61': 'canvas'
        };

        // 📐 Auto Layout Class & Style Initialization
        let inlineStyle = '';
        const autoLayoutClasses = [];
        if (rawTag === 'vstack') autoLayoutClasses.push('vstack');
        else if (rawTag === 'hstack') autoLayoutClasses.push('hstack');
        else if (rawTag === 'spacer') autoLayoutClasses.push('spacer');
        else if (rawTag === 'divider') autoLayoutClasses.push('divider');
        else if (rawTag === 'container') autoLayoutClasses.push('container-center');
        else if (rawTag === 'wrap') autoLayoutClasses.push('flex flex-wrap');
        else if (rawTag === 'center') autoLayoutClasses.push('flex items-center justify-center');

        // Layout props: gap, align, justify
        if (props.gap !== undefined) {
            const g = props.gap;
            const gapVal = typeof g === 'number' ? (g <= 12 ? `${g * 4}px` : `${g}px`) : String(g);
            inlineStyle = inlineStyle ? `gap:${gapVal} !important;${inlineStyle}` : `gap:${gapVal} !important`;
        }
        if (props.align) {
            const aMap = { 'center': 'items-center', 'start': 'items-start', 'end': 'items-end', 'stretch': 'items-stretch', 'baseline': 'items-baseline' };
            if (aMap[props.align]) autoLayoutClasses.push(aMap[props.align]);
        }
        if (props.justify) {
            const jMap = { 'center': 'justify-center', 'start': 'justify-start', 'end': 'justify-end', 'between': 'justify-between', 'around': 'justify-around', 'evenly': 'justify-evenly' };
            if (jMap[props.justify]) autoLayoutClasses.push(jMap[props.justify]);
        }

        if (autoLayoutClasses.length > 0) {
            props.className = props.className ? `${autoLayoutClasses.join(' ')} ${props.className}` : autoLayoutClasses.join(' ');
        }
        if (rawTag === 'flip-card' || rawTag === 'flipcard') {
            props.className = props.className ? `titan-flipcard ${props.className}` : 'titan-flipcard';
        }

        let htmlTag = tagMap[rawTag] || rawTag || 'div';
        if (compTypeProp === '0x60' || compTypeProp === 'webview') {
            htmlTag = 'iframe';
        } else if (compTypeProp === '0x61' || compTypeProp === 'nativecanvas') {
            htmlTag = 'canvas';
        }

        // Inline Utility Style Generator
        inlineStyle = inlineStyle ? `${inlineStyle};${this._classNameToStyle(props.className)}` : this._classNameToStyle(props.className);

        // Resolve custom gradient="danphe" / gradient="gradient-horiz-..." attributes
        const gradAttr = props.gradient || (props.attributes && props.attributes.gradient) || null;
        if (gradAttr) {
            const gradCss = this._resolveGradientString(gradAttr);
            if (gradCss) {
                inlineStyle = inlineStyle ? `background-image:${gradCss} !important;${inlineStyle}` : `background-image:${gradCss} !important`;
            }
        }

        const svgTags = ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'clippath', 'use'];
        if (svgTags.includes(rawTag)) {
            htmlTag = rawTag;
        }

        if (rawTag === 'icon') {
            const iconName = props.name || props.icon || props.className || '';
            const webClasses = String(props.className || '').replace(/\s+/g, ' ').trim();
            // Check 557 Inbuilt Mathematical SVG Vectors first (100% Offline)
            if (!this._inbuiltIconsMap) {
                try {
                    const iconPath = path.resolve(__dirname, '../../runtime/android/danphe_icons.json');
                    this._inbuiltIconsMap = fs.existsSync(iconPath) ? JSON.parse(fs.readFileSync(iconPath, 'utf8')) : {};
                } catch (_) {
                    this._inbuiltIconsMap = {};
                }
            }
            const cleanToken = iconName.replace(/^(fa-(solid|regular|brands)-?|fa-|icon-)/, '').trim().toLowerCase();
            const iconDef = this._inbuiltIconsMap[cleanToken] 
                || this._inbuiltIconsMap[cleanToken.replace(/-/g, '_')] 
                || Object.values(this._inbuiltIconsMap).find(v => v.name === cleanToken || v.name === cleanToken.replace(/-/g, '_'));

            if (iconDef && iconDef.path) {
                const sz = props.size ? `${props.size}px` : '28px';
                return `<span class="inline-flex items-center justify-center shrink-0 ${this._escapeHTML(webClasses)}" style="width:${sz};height:${sz};display:inline-flex;align-items:center;justify-content:center;${this._escapeHTML(inlineStyle)}"><svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconDef.path}</svg></span>`;
            }

            const faClass = iconName.startsWith('fa-') || iconName.includes('fa-') ? iconName : `fa-solid fa-${iconName}`;
            return `<i class="${faClass} ${this._escapeHTML(webClasses)}" style="${this._escapeHTML(inlineStyle)}"></i>`;
        }

        if (rawTag === 'slider' || rawTag === 'range' || compTypeProp === '0x19' || compTypeProp === 'slider') {
            const min = props.min !== undefined ? props.min : 0;
            const max = props.max !== undefined ? props.max : 255;
            const step = props.step !== undefined ? props.step : 1;
            const action = props.action || '';
            const sKey = props.stateKey || props.statekey || '';
            const curVal = (sKey && stateMap && stateMap[sKey] !== undefined)
                ? stateMap[sKey]
                : (props.value !== undefined ? props.value : (props.defaultValue !== undefined ? props.defaultValue : min));
            const webClasses = String(props.className || '').replace(/\s+/g, ' ').trim();
            const sliderStyle = `pointer-events:auto;cursor:pointer;accent-color:#38bdf8;width:100%;height:6px;background:#334155;border-radius:9999px;outline:none;${inlineStyle}`;
            const sKeyAttr = sKey ? `data-state-key="${this._escapeHTML(sKey)}" name="${this._escapeHTML(sKey)}" tb-bind="${this._escapeHTML(sKey)}"` : '';
            const actionAttr = action ? `data-action="${this._escapeHTML(action)}" tb-on:input="action:${this._escapeHTML(action)}"` : '';
            return `<input type="range" class="${this._escapeHTML(webClasses)}" min="${min}" max="${max}" step="${step}" value="${this._escapeHTML(String(curVal))}" ${actionAttr} ${sKeyAttr} style="${this._escapeHTML(sliderStyle)}" />`;
        }

        if (rawTag === 'thorvg' || rawTag === 'nativecanvas' || compTypeProp === '0x61' || compTypeProp === 'thorvg') {
            const svgContent = props.svg || props.src || props.d || '';
            if (svgContent && typeof svgContent === 'string' && svgContent.trim().startsWith('<svg')) {
                let cleanSvg = svgContent.trim();
                if (props.className && String(props.className).includes('w-full')) {
                    cleanSvg = cleanSvg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"');
                } else if (!cleanSvg.includes('width=') && !cleanSvg.includes('width:')) {
                    cleanSvg = cleanSvg.replace('<svg ', '<svg width="100%" height="100%" ');
                }
                const webClasses = String(props.className || '').replace(/\s+/g, ' ').trim();
                const actionAttr = props.action ? `data-action="${this._escapeHTML(props.action)}" tb-on:click="action:${this._escapeHTML(props.action)}"` : '';
                return `<div class="${this._escapeHTML(webClasses)}" ${actionAttr} style="display:inline-flex;align-items:center;justify-content:center;${this._escapeHTML(inlineStyle)}">${cleanSvg}</div>`;
            } else if (props.d || (svgContent && typeof svgContent === 'string' && !svgContent.startsWith('<svg') && svgContent.length > 5)) {
                const pathD = props.d || svgContent;
                const w = props.width || 24;
                const h = props.height || 24;
                const stroke = props.stroke || 'currentColor';
                const fill = props.fill || 'none';
                const cleanSvg = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
                const webClasses = String(props.className || '').replace(/\s+/g, ' ').trim();
                const actionAttr = props.action ? `data-action="${this._escapeHTML(props.action)}" tb-on:click="action:${this._escapeHTML(props.action)}"` : '';
                return `<div class="${this._escapeHTML(webClasses)}" ${actionAttr} style="display:inline-flex;align-items:center;justify-content:center;${this._escapeHTML(inlineStyle)}">${cleanSvg}</div>`;
            }
        }

        // Build HTML attributes
        const attrs = [];
        if (props.id) attrs.push(`id="${this._escapeHTML(props.id)}"`);
        if (props.className) {
            const webClasses = String(props.className).replace(/\s+/g, ' ').trim();
            attrs.push(`class="${this._escapeHTML(webClasses)}"`);
        }

        if (props.style) {
            if (typeof props.style === 'string') {
                inlineStyle = inlineStyle ? `${inlineStyle};${props.style}` : props.style;
            } else if (typeof props.style === 'object') {
                const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'aspectRatio', 'lineHeight']);
                const objStyle = Object.keys(props.style).map(k => {
                    let val = props.style[k];
                    if (typeof val === 'number' && !UNITLESS.has(k)) {
                        val = val + 'px';
                    }
                    return `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${val}`;
                }).join(';');
                inlineStyle = inlineStyle ? `${inlineStyle};${objStyle}` : objStyle;
            }
        }

        const rawTx = props.tx !== undefined ? props.tx : (props.action || props['data-tx']);
        const txVal = (rawTx && typeof rawTx === 'object' && rawTx.fullName) ? rawTx.fullName : (rawTx && typeof rawTx === 'object' && rawTx.name ? `${rawTx.parent || 'nav'}::${rawTx.name}` : rawTx);
        const txValue = props.txValue !== undefined ? props.txValue : (props['tx-value'] !== undefined ? props['tx-value'] : (props.value !== undefined ? props.value : null));
        if (txVal !== undefined) {
            let busAction;
            if ((!isNaN(Number(txVal)) || (typeof txVal === 'string' && (txVal.startsWith('0x') || txVal.startsWith('0X')))) && !String(txVal).includes(':')) {
                busAction = (txValue !== null && txValue !== undefined) ? `bus:write:${txVal}:${txValue}` : `bus:${txVal}`;
            } else {
                busAction = String(txVal);
            }

            let finalAction = busAction;
            if (props.action && String(props.action) !== String(txVal) && String(props.action) !== busAction) {
                finalAction = `${busAction};${props.action}`;
            }

            attrs.push(`tx="${this._escapeHTML(txVal)}"`);
            attrs.push(`data-tx="${this._escapeHTML(txVal)}"`);
            if (txValue !== null && txValue !== undefined) {
                attrs.push(`data-tx-val="${this._escapeHTML(txValue)}"`);
            }
            attrs.push(`data-action="${this._escapeHTML(finalAction)}"`);
            attrs.push(`tb-on:click="action:${this._escapeHTML(finalAction)}"`);
        }

        const rawRx = props.rx !== undefined ? props.rx : (props.bus !== undefined ? props.bus : (props['data-rx'] || props['data-bus']));
        const rxVal = (rawRx && typeof rawRx === 'object' && rawRx.fullName) ? rawRx.fullName : rawRx;
        if (rawRx && typeof rawRx === 'object' && rawRx.slot && props.slot === undefined) {
            attrs.push(`slot="${rawRx.slot}"`);
            attrs.push(`data-slot="${rawRx.slot}"`);
        }
        if (rxVal !== undefined) {
            attrs.push(`rx="${this._escapeHTML(rxVal)}"`);
            attrs.push(`data-rx="${this._escapeHTML(rxVal)}"`);
            // Only add data-bus & tb-text if NOT a collection repeater list container!
            if (!props.collection && !props['data-collection'] && !props.repeat && !props['data-repeat']) {
                attrs.push(`data-bus="${this._escapeHTML(rxVal)}"`);
                attrs.push(`tb-text="${this._escapeHTML(rxVal)}"`);
            }
        }

        // 🧭 Universal Route Viewports (including nav.home, nav.settings)
        if (props.page !== undefined || props['data-page'] !== undefined) {
            const rawPage = props.page !== undefined ? props.page : props['data-page'];
            const pageStr = (rawPage && typeof rawPage === 'object' && rawPage.fullName) ? rawPage.fullName : String(rawPage);
            attrs.push(`page="${this._escapeHTML(pageStr)}"`);
            attrs.push(`data-page="${this._escapeHTML(pageStr)}"`);
        }

        // 🧭 Nested Subpage Viewports (including settings.profile, settings.security)
        if (props.subpage !== undefined || props['data-subpage'] !== undefined) {
            const rawSub = props.subpage !== undefined ? props.subpage : props['data-subpage'];
            const subStr = (rawSub && typeof rawSub === 'object' && rawSub.fullName) ? rawSub.fullName : String(rawSub);
            attrs.push(`subpage="${this._escapeHTML(subStr)}"`);
            attrs.push(`data-subpage="${this._escapeHTML(subStr)}"`);
        }
        
        let extractedStateKey = props.statekey || props.stateKey || null;
        if (!extractedStateKey) {
            const _childStr = typeof children === 'string' ? children
                : (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string') ? children[0]
                : (Array.isArray(children) && children.length === 1 && children[0] && children[0].value) ? children[0].value
                : null;
            if (_childStr && typeof _childStr === 'string' && _childStr.trim().startsWith('[stateKey:') && _childStr.trim().endsWith(']')) {
                const trimmed = _childStr.trim();
                extractedStateKey = trimmed.substring(10, trimmed.length - 1);
            }
        }
        if (extractedStateKey) {
            attrs.push(`data-state-key="${this._escapeHTML(extractedStateKey)}"`);
            attrs.push(`tb-text="${this._escapeHTML(extractedStateKey)}"`);
        }
        if (props.src) {
            let cleanSrc = String(props.src);
            if (cleanSrc.startsWith('[stateKey:') && cleanSrc.endsWith(']')) {
                const key = cleanSrc.substring(10, cleanSrc.length - 1);
                cleanSrc = (stateMap && stateMap[key] !== undefined && stateMap[key]) ? stateMap[key] : (htmlTag === 'video' ? '/assets/videos/12205.mp4' : '');
                attrs.push(`data-state-img="${this._escapeHTML(key)}"`);
            } else if (cleanSrc === 'sys_picked_video_url' || (stateMap && stateMap[cleanSrc] !== undefined)) {
                if (stateMap && stateMap[cleanSrc] !== undefined) {
                    cleanSrc = stateMap[cleanSrc];
                }
            }
            if (cleanSrc.startsWith('disk://assets/')) cleanSrc = '/assets/' + cleanSrc.substring(14);
            else if (cleanSrc.startsWith('disk://')) cleanSrc = '/' + cleanSrc.substring(7);
            else if (cleanSrc.startsWith('../assets/')) cleanSrc = '/assets/' + cleanSrc.substring(10);
            else if (cleanSrc.startsWith('./assets/')) cleanSrc = '/assets/' + cleanSrc.substring(9);
            else if (cleanSrc.startsWith('assets/')) cleanSrc = '/assets/' + cleanSrc.substring(7);
            attrs.push(`src="${this._escapeHTML(cleanSrc)}"`);
        }
        if (htmlTag === 'video') {
            attrs.push('autoplay');
            attrs.push('muted');
            attrs.push('loop');
            attrs.push('playsinline');
            attrs.push('webkit-playsinline');
            attrs.push('controls');
        } else if (htmlTag === 'iframe') {
            attrs.push('allow="autoplay; fullscreen"');
            attrs.push('frameborder="0"');
        }
        if (props.alt) attrs.push(`alt="${this._escapeHTML(props.alt)}"`);
        if (props.placeholder) attrs.push(`placeholder="${this._escapeHTML(props.placeholder)}"`);
        if (props.href) attrs.push(`href="${this._escapeHTML(props.href)}"`);
        if (rawTarget) {
            attrs.push(`data-target="${this._escapeHTML(rawTarget)}"`);
            attrs.push(`target="${this._escapeHTML(rawTarget)}"`);
        }
        if (props.slot !== undefined) {
            attrs.push(`slot="${this._escapeHTML(props.slot)}"`);
            attrs.push(`data-slot="${this._escapeHTML(props.slot)}"`);
        }
        if (props.collection !== undefined) {
            attrs.push(`collection="${this._escapeHTML(props.collection)}"`);
            attrs.push(`data-collection="${this._escapeHTML(props.collection)}"`);
        }

        // Pass-through SVG & Custom HTML attributes
        const reservedProps = ['id', 'className', 'class', 'action', 'stateKey', 'statekey', 'src', 'alt', 'placeholder', 'href', 'style', 'children', 'target', 'platform', 'type', 'value', 'inputType', 'autoPlay', 'autoplay', 'loop', 'muted', 'playsInline', 'playsinline', 'webkit-playsinline', 'controls'];
        Object.keys(props).forEach(key => {
            if (!reservedProps.includes(key) && typeof props[key] !== 'object' && typeof props[key] !== 'function') {
                const attrName = key === 'viewBox' ? 'viewBox' : (key.toLowerCase().startsWith('on') ? key.toLowerCase() : key.replace(/([A-Z])/g, '-$1').toLowerCase());
                attrs.push(`${attrName}="${this._escapeHTML(String(props[key]))}"`);
            }
        });

        if (htmlTag === 'input') {
            const inputType = props.type || 'text';
            attrs.push(`type="${this._escapeHTML(inputType)}"`);
            if (extractedStateKey) {
                attrs.push(`name="${this._escapeHTML(extractedStateKey)}"`);
                attrs.push(`tb-bind="${this._escapeHTML(extractedStateKey)}"`);
            }
            const initVal = extractedStateKey && stateMap[extractedStateKey] !== undefined
                ? stateMap[extractedStateKey] : (props.value || props.defaultValue || '');
            if (initVal) attrs.push(`value="${this._escapeHTML(String(initVal))}"`);
            const inputStyle = `pointer-events:auto;cursor:text;${inlineStyle}`;
            attrs.push(`style="${this._escapeHTML(inputStyle)}"`);
        } else if (inlineStyle) {
            attrs.push(`style="${this._escapeHTML(inlineStyle)}"`);
        }

        const attrString = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

        if (['img', 'input', 'br', 'hr', 'meta', 'link'].includes(htmlTag)) {
            return `<${htmlTag}${attrString} />`;
        }

        let innerHTML = '';
        if (props.dangerouslySetInnerHTML && typeof props.dangerouslySetInnerHTML.__html === 'string') {
            innerHTML = props.dangerouslySetInnerHTML.__html;
        } else if (typeof children === 'string' || typeof children === 'number') {
            innerHTML = this._parseStateKeyString(String(children), stateMap);
        } else if (Array.isArray(children)) {
            innerHTML = children.map(c => this.vnodeToHTML(c, stateMap)).join('');
        } else if (children) {
            innerHTML = this.vnodeToHTML(children, stateMap);
        }

        if (props.icon) {
            const iconName = String(props.icon);
            if (iconName) {
                const normalized = iconName.replace(/^fa-/, '').toLowerCase().trim();
                const iconAliasMap = {
                    'check': 'check', 'rotate': 'rotate-right', 'refresh': 'rotate-right',
                    'reset': 'rotate-left', 'send': 'paper-plane', 'search': 'magnifying-glass',
                    'home': 'house', 'settings': 'gear', 'close': 'xmark', 'cancel': 'xmark',
                    'delete': 'trash', 'edit': 'pen', 'add': 'plus', 'plus': 'plus',
                    'minus': 'minus', 'info': 'circle-info', 'warning': 'triangle-exclamation',
                    'error': 'circle-xmark', 'success': 'circle-check', 'user': 'user',
                    'login': 'right-to-bracket', 'logout': 'right-from-bracket',
                    'arrow-right': 'arrow-right', 'arrow-left': 'arrow-left',
                    'arrow-up': 'arrow-up', 'arrow-down': 'arrow-down',
                    'menu': 'bars', 'list': 'list', 'filter': 'filter',
                    'star': 'star', 'heart': 'heart', 'bell': 'bell',
                    'lock': 'lock', 'unlock': 'lock-open', 'eye': 'eye', 'eye-off': 'eye-slash',
                    'download': 'download', 'upload': 'upload', 'link': 'link',
                    'copy': 'copy', 'save': 'floppy-disk', 'print': 'print',
                    'share': 'share-nodes', 'mail': 'envelope', 'phone': 'phone',
                    'location': 'location-dot', 'map': 'map', 'calendar': 'calendar',
                    'clock': 'clock', 'camera': 'camera', 'image': 'image',
                };
                const faName = iconAliasMap[normalized] || normalized;
                const iconGap = innerHTML ? ' ' : '';
                innerHTML = `<i class="fa-solid fa-${faName}" style="margin-right:${innerHTML ? '6px' : '0'};"></i>${iconGap}${innerHTML}`;
            }
        }

        return `<${htmlTag}${attrString}>${innerHTML}</${htmlTag}>`;
    }

    static renderToWebHTML(pageVNode, seoConfig = {}, initialState = {}, localCdnPaths = {}) {
        const engine = new DolphinWebEngine();
        return engine.renderToWebHTML(pageVNode, seoConfig, initialState, localCdnPaths);
    }

    /**
     * Generates a complete SEO-Ready HTML5 Document with Head Meta Tags & Interactive NanoStore Scripts
     */
    renderToWebHTML(pageVNode, seoConfig = {}, initialState = {}, localCdnPaths = {}) {
        const title = seoConfig.title || 'Dolphin Native Web Application';
        const description = seoConfig.description || 'Built with Dolphin Native Universal Architecture';
        const keywords = seoConfig.keywords || 'dolphin-native, web, mobile, seo, nanostore';
        const author = seoConfig.author || 'Dolphin Native Team';
        const ogImage = seoConfig.ogImage || '';
        const canonicalUrl = seoConfig.canonicalUrl || '';

        // 🐬 DYNAMICALLY LOAD DANPHE-UI 256 FONTS & 256 GPU ANIMATIONS
        let danpheFontLinks = '';
        let danpheAnimCss = '';
        let danpheFontCss = '';
        try {
            let danpheUI = null;
            try {
                danpheUI = require('danphe-ui');
            } catch (e) {
                try {
                    danpheUI = require(path.join(process.cwd(), 'node_modules', 'danphe-ui'));
                } catch (e2) {
                    danpheUI = null;
                }
            }
            if (danpheUI) {
                if (typeof danpheUI.getGoogleFontsLinkTags === 'function') {
                    danpheFontLinks = danpheUI.getGoogleFontsLinkTags();
                }
                if (typeof danpheUI.generateAnimationCSS === 'function') {
                    danpheAnimCss = danpheUI.generateAnimationCSS();
                }
                if (typeof danpheUI.generateFontCSS === 'function') {
                    danpheFontCss = danpheUI.generateFontCSS();
                }
            }
        } catch (e) {
            // ignore
        }

        const mergedInitialState = { ...WebStateEngine.getDefaultState(), ...initialState };
        const bodyHTML = this.vnodeToHTML(pageVNode, mergedInitialState);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this._escapeHTML(title)}</title>
    <meta name="description" content="${this._escapeHTML(description)}">
    <meta name="keywords" content="${this._escapeHTML(keywords)}">
    <meta name="author" content="${this._escapeHTML(author)}">
    
    <!-- OpenGraph SEO Tags -->
    <meta property="og:title" content="${this._escapeHTML(title)}">
    <meta property="og:description" content="${this._escapeHTML(description)}">
    <meta property="og:type" content="website">
    ${ogImage ? `<meta property="og:image" content="${this._escapeHTML(ogImage)}">` : ''}
    ${canonicalUrl ? `<link rel="canonical" href="${this._escapeHTML(canonicalUrl)}">` : ''}

    <!-- 🇳🇵 Danphe UI Native Typography & Web Engine (100% Offline-First) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
    
    <!-- 100% Offline Local Assets & Icons Support -->
    <link rel="stylesheet" href="/assets/icons/icons.css" />
    <link rel="stylesheet" href="/assets/cdn/fa-all.min.css" />
    <link rel="stylesheet" href="/assets/cdn/dolphin-css.css" />
    <style>
        ${WebCSS.getBaseStyles()}
        .titan-flipcard, flip-card { display: block; width: 100%; position: relative; }
        .titan-flipcard > [data-target*="mirror"], .titan-flipcard > [data-target*="editable"],
        .titan-flipcard > [target*="mirror"], .titan-flipcard > [target*="editable"],
        flip-card > [data-target*="mirror"], flip-card > [data-target*="editable"],
        flip-card > [target*="mirror"], flip-card > [target*="editable"] { display: none !important; }
        .titan-flipcard.flipped > :first-child, flip-card.flipped > :first-child { display: none !important; }
        .titan-flipcard.flipped > [data-target*="mirror"], .titan-flipcard.flipped > [data-target*="editable"],
        .titan-flipcard.flipped > [target*="mirror"], .titan-flipcard.flipped > [target*="editable"],
        flip-card.flipped > [data-target*="mirror"], flip-card.flipped > [data-target*="editable"],
        flip-card.flipped > [target*="mirror"], flip-card.flipped > [target*="editable"] { display: flex !important; }
    </style>

    <!-- 🐬 DANPHE-UI 256 FONTS SUITE & 256 120FPS GPU ANIMATIONS -->
    ${danpheFontLinks}
    <style id="danphe-ui-animations">
        ${danpheAnimCss}
    </style>
    <style id="danphe-ui-fonts">
        ${danpheFontCss}
    </style>

    <!-- 🐬 TITAN-DOM High-Performance Zero-VDOM Engine -->
    <script>
    ${titanDomBundle}
    </script>
</head>
<body>
    <div id="root">${bodyHTML}</div>

    ${WebNavigation.getDrawerHTML()}
    ${WebNavigation.getBottomDrawerHTML()}

    <!-- Pure Web-Native In-Browser State Engine & Action Router -->
    <script>
      (function() {
        var state = ${JSON.stringify(mergedInitialState)};
        var initialState = JSON.parse(JSON.stringify(state));
        var tempTimers = {};
        var stateListeners = [];

        // 🧭 Universal HTML5 History & URL Path Synchronizer (Generic for any URL)
        if (typeof window !== 'undefined' && window.location) {
          var syncFromUrl = function() {
            var path = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
            if (path) {
              var segments = path.split('/');
              if (segments[0]) {
                state['nav'] = segments[0];
                state['nav::current'] = segments[0];
              }
              if (segments[1]) {
                state[segments[0]] = segments[1];
                state[segments[0] + '::current'] = segments[1];
              }
            } else {
              state['nav'] = 'home';
              state['nav::current'] = 'home';
            }
            updateDOM();
          };
          syncFromUrl();
          window.addEventListener('popstate', syncFromUrl);
        }

        // 🌟 Seed Titan Register Store with Initial State
        if (window.Titan && window.Titan.store) {
          for (var k in state) {
            window.Titan.write(k, state[k]);
          }
          window.Titan.store.on(-1, function(val, reg) {
            state[reg] = val;
          });
        }

        ${WebNavigation.getClientScript()}
        ${WebMultimedia.getClientScript()}

                // ⚡ TITAN-BUS MICRO ENGINE CLIENT (window.TitanBus & window.TitanBusClient)
        // Provides 0ms in-memory reactivity and immediate 6-byte SISO packet bridge to DevServer
        window.TitanBus = {
          registers: new Int16Array(65536),
          write: function(reg, val) {
            var r = Number(reg) & 0xFFFF;
            var v = Number(val);
            if (isNaN(r) || isNaN(v)) return;
            this.registers[r] = v;
            state[r] = v;
            state['bus:' + r] = v;
            state['0x' + r.toString(16).toLowerCase()] = v;
            state['bus:0x' + r.toString(16).toLowerCase()] = v;
            updateDOM();
            try {
              fetch('/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'bus:write:' + r + ':' + v, value: v })
              }).catch(function() {});
            } catch (e) {}
          },
          read: function(reg) {
            var r = Number(reg) & 0xFFFF;
            return this.registers[r];
          }
        };
        window.TitanBusClient = window.TitanBus;

        if (!window.Titan) {
          window.Titan = {
            read: function(reg, def) {
              var val = window.TitanBus.read(reg);
              return val !== undefined && val !== 0 ? val : (def !== undefined ? def : state[reg]);
            },
            write: function(reg, val) {
              window.TitanBus.write(reg, val);
            },
            call: {
              dial: function(peerId, mode) {
                window.TitanBus.write(100, 2);
                try {
                  fetch('/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'calldial', peerId: peerId, mode: mode || 'p2p_mesh' })
                  }).catch(function() {});
                } catch(e) {}
              },
              accept: function() {
                window.TitanBus.write(100, 1);
                try {
                  fetch('/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'callanswer' })
                  }).catch(function() {});
                } catch(e) {}
              },
              hangup: function() {
                window.TitanBus.write(100, 0);
                try {
                  fetch('/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'callhangup' })
                  }).catch(function() {});
                } catch(e) {}
              }
            },
            stream: {
              startBroadcast: function() { window.TitanBus.write(0x3071, 1); },
              stopBroadcast: function() { window.TitanBus.write(0x3071, 0); },
              setAudioVu: function(lvl) { window.TitanBus.write(0x3034, lvl); }
            },
            hoster: {
              openTunnel: function() { window.TitanBus.write(0x3072, 1); },
              closeTunnel: function() { window.TitanBus.write(0x3072, 0); },
              getShareUrl: function() { return window.location.protocol + '//' + window.location.hostname + ':9090/live'; }
            },
            disk: {
              saveFile: function() { window.TitanBus.write(0x3062, 1); },
              fetchRemoteFile: function() { window.TitanBus.write(0x3063, 1); },
              sync: function() { window.TitanBus.write(0x3075, 1); }
            }
          };
        }

        // 🌟 Expose Universal Reactive Hooks & NanoStore to Browser Window
        window.DolphinWebStore = {
          state: state,
          get: function(key) {
            if (window.Titan && window.Titan.store) {
              return window.Titan.read(key, state[key]);
            }
            return state[key];
          },
          set: function(key, val) {
            state[key] = val;
            if (window.Titan && window.Titan.store) {
              window.Titan.write(key, val);
            }
            updateDOM();
            stateListeners.forEach(function(l) { try { l(key, val); } catch (e) {} });
          },
          updateState: function(key, val) { this.set(key, val); },
          subscribe: function(fn) {
            stateListeners.push(fn);
            return function() {
              var idx = stateListeners.indexOf(fn);
              if (idx >= 0) stateListeners.splice(idx, 1);
            };
          }
        };

        // 🌟 Universal useTitan Hook (Works identically on Web, Android, and LVGL!)
        window.useTitan = function(keyOrReg, initial) {
          var reg = !isNaN(Number(keyOrReg)) ? Number(keyOrReg) : String(keyOrReg);
          if (initial !== undefined && window.Titan && window.Titan.read(reg, null) === null) {
            window.Titan.write(reg, initial);
          }
          var val = window.Titan ? window.Titan.read(reg, initial !== undefined ? initial : 0) : state[reg];
          var setVal = function(newVal) {
            var current = window.Titan ? window.Titan.read(reg) : state[reg];
            var next = typeof newVal === 'function' ? newVal(current) : newVal;
            if (window.Titan) window.Titan.write(reg, next);
            else window.DolphinWebStore.set(reg, next);
          };
          return [val, setVal];
        };

        window.useState = function(initial) {
          var hookKey = '_hook_' + Math.random().toString(36).substring(2, 9);
          if (state[hookKey] === undefined) {
            state[hookKey] = typeof initial === 'function' ? initial() : initial;
          }
          var setState = function(newVal) {
            state[hookKey] = typeof newVal === 'function' ? newVal(state[hookKey]) : newVal;
            updateDOM();
          };
          return [state[hookKey], setState];
        };

        window.useEffect = function(callback, deps) {
          setTimeout(function() {
            try { callback(); } catch (e) {}
          }, 0);
        };

        window.useRef = function(initial) {
          return { current: initial };
        };

        window.useNanoState = function(key, initial) {
          if (state[key] === undefined && initial !== undefined) {
            state[key] = initial;
          }
          var setNanoState = function(newVal) {
            state[key] = typeof newVal === 'function' ? newVal(state[key]) : newVal;
            updateDOM();
            stateListeners.forEach(function(l) { try { l(key, state[key]); } catch (e) {} });
          };
          return [state[key] !== undefined ? state[key] : initial, setNanoState];
        };

        function updateDOM() {
          // 1. Primitive State Elements (Guarded against Objects & Collections)
          var stateElements = document.querySelectorAll('[data-state-key]');
          stateElements.forEach(function(el) {
            if (el.hasAttribute('collection') || el.hasAttribute('data-collection')) return;
            var key = el.getAttribute('data-state-key');
            if (key && state[key] !== undefined) {
              var sVal = state[key];
              if (typeof sVal === 'object') return; // 🛡️ GUARD: NEVER dump Object to textContent!
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                if (document.activeElement !== el) el.value = String(sVal);
              } else {
                el.textContent = String(sVal);
              }
            }
          });

          // 2. Direct Register Bus Elements (Guarded against Objects & Collections)
          var busElements = document.querySelectorAll('[data-bus]');
          busElements.forEach(function(el) {
            if (el.hasAttribute('collection') || el.hasAttribute('data-collection')) return;
            var busKey = el.getAttribute('data-bus');
            if (busKey) {
              var isNested = busKey.indexOf('.') >= 0;
              var regId = isNested ? busKey.split('.')[0] : busKey;
              var propPath = isNested ? busKey.split('.').slice(1) : [];

              var val = state['bus:' + regId] !== undefined ? state['bus:' + regId] : (state[regId] !== undefined ? state[regId] : (state['bus:' + busKey] !== undefined ? state['bus:' + busKey] : state[busKey]));
              if (isNested && val && typeof val === 'object') {
                var cur = val;
                for (var p = 0; p < propPath.length; p++) {
                  if (cur && cur[propPath[p]] !== undefined) cur = cur[propPath[p]];
                  else { cur = ''; break; }
                }
                val = cur;
              }
              if (val !== undefined && val !== null) {
                if (typeof val === 'object') return; // 🛡️ GUARD: NEVER dump Object to textContent!
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                  if (document.activeElement !== el) el.value = String(val);
                } else {
                  el.textContent = String(val);
                }
              }
            }
          });

          // 3. 📡 Titan Carrier & Direct Hardware Register Binding (Guarded against Objects & Collections)
          var rxElements = document.querySelectorAll('[data-rx]');
          rxElements.forEach(function(el) {
            if (el.hasAttribute('collection') || el.hasAttribute('data-collection')) return;
            var rxVal = el.getAttribute('data-rx');
            if (rxVal) {
              var hexKey = (rxVal.startsWith('0x') || rxVal.startsWith('0X')) ? rxVal.toLowerCase() : '0x' + parseInt(rxVal, 10).toString(16);
              var decKey = (rxVal.startsWith('0x') || rxVal.startsWith('0X')) ? String(parseInt(rxVal, 16)) : rxVal;
              var val = state[hexKey] !== undefined ? state[hexKey] : (state[decKey] !== undefined ? state[decKey] : (state['bus:' + hexKey] !== undefined ? state['bus:' + hexKey] : state['bus:' + decKey]));
              
              if (val !== undefined && val !== null) {
                if (typeof val === 'object') return; // 🛡️ GUARD: NEVER dump Object to textContent!
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  if (document.activeElement !== el) el.value = String(val);
                } else {
                  el.textContent = String(val);
                }
              }
            }
          });

          // 📋 Dynamic Slot List & Collection Hydration (menu, rooms, orders)
          var listContainers = document.querySelectorAll('[collection], [data-collection]');
          listContainers.forEach(function(listEl) {
            var colName = listEl.getAttribute('collection') || listEl.getAttribute('data-collection');
            if (!colName) return;
            var rxVal = listEl.getAttribute('data-rx') || '';
            var rawData = state[colName] || state['hotel_' + colName] || (rxVal && state[rxVal]) || (rxVal && state['bus:' + rxVal]);
            if (!rawData) return;
            var items = null;
            if (typeof rawData === 'string') {
              try { items = JSON.parse(rawData); } catch(e) {}
            } else if (Array.isArray(rawData)) {
              items = rawData;
            }
            if (!items || !Array.isArray(items) || items.length === 0) return;

            if (!listEl._titanTemplate) {
              var firstChild = listEl.firstElementChild;
              if (firstChild) {
                listEl._titanTemplate = firstChild.cloneNode(true);
              }
            }
            if (!listEl._titanTemplate) return;

            var newIds = items.map(function(it) { return it._id || it.code || it.id || ''; }).join(',');
            var currentRenderedIds = listEl.getAttribute('data-rendered-ids');
            if (currentRenderedIds === newIds && listEl.children.length === items.length) {
              return;
            }

            listEl.innerHTML = '';
            listEl.setAttribute('data-rendered-ids', newIds);
            var isRooms = false;
            
            items.forEach(function(item) {
              var clone = listEl._titanTemplate.cloneNode(true);
              var docId = String(item._id || item.code || item.id || '');
              clone.setAttribute('data-id', docId);
              clone.setAttribute('data-col', colName);

              var slot1 = item.slot_1 || (isRooms ? ('Room ' + item.roomNumber) : item.name) || item.title || '';
              var slot2 = item.slot_2 || (isRooms ? (item.guest || item.guestName || '— Vacant —') : item.category) || '';
              var slot3 = item.slot_3 || (isRooms ? (item.type || item.roomType || 'Standard') : item.category) || '';
              var slot4 = item.slot_4 || (isRooms ? (item.status || 'VACANT') : (item.price !== undefined ? ('Rs. ' + item.price) : ''));
              var slot5 = item.slot_5 || (isRooms ? ('Rs. ' + item.price) : (item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'));
              var slot6 = item.slot_6 !== undefined ? item.slot_6 : (item.price !== undefined ? item.price : '');
              var slot7 = item.slot_7 || (isRooms ? (item.type || item.roomType || '') : (item.category || ''));
              var slot8 = item.slot_8 || item.phone || item.mobile || '';

              var slotElements = clone.querySelectorAll('[slot], [data-slot]');
              slotElements.forEach(function(sEl) {
                var sId = parseInt(sEl.getAttribute('slot') || sEl.getAttribute('data-slot'), 10);
                var val = sId === 1 ? slot1 : (sId === 2 ? slot2 : (sId === 3 ? slot3 : (sId === 4 ? slot4 : (sId === 5 ? slot5 : (sId === 6 ? slot6 : (sId === 7 ? slot7 : (sId === 8 ? slot8 : '')))))));
                if (val !== undefined && val !== null) {
                  if (sEl.tagName === 'INPUT' || sEl.tagName === 'TEXTAREA') {
                    sEl.value = String(val);
                  } else if (sEl.tagName === 'IMG') {
                    var sVal = String(val);
                    if (sVal.startsWith('http') || sVal.startsWith('/') || sVal.startsWith('./') || sVal.startsWith('assets/')) {
                      sEl.src = sVal;
                    } else {
                      sEl.src = isRooms ? 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=200' : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
                    }
                  } else {
                    sEl.textContent = String(val);
                    // 🌟 High-Contrast Dynamic Badge Color Modulation
                    if (isRooms && sId === 4) {
                      var st = String(val).toUpperCase();
                      if (st.includes('OCCUPIED') || st.includes('CALL') || st.includes('RING')) {
                        sEl.style.backgroundColor = '#4c0519';
                        sEl.style.color = '#fda4af';
                        sEl.style.border = '1px solid rgba(244, 63, 94, 0.6)';
                      } else {
                        sEl.style.backgroundColor = '#064e3b';
                        sEl.style.color = '#6ee7b7';
                        sEl.style.border = '1px solid rgba(16, 185, 129, 0.6)';
                      }
                    }
                  }
                }
              });
              listEl.appendChild(clone);
            });
            listEl.setAttribute('data-rendered-ids', newIds);
          });

          // 📑 Page Router & Role Viewport & Drawer
          var curRoute = String(state['nav::current'] !== undefined ? state['nav::current'] : (state['bus:10'] !== undefined ? state['bus:10'] : (state['10'] !== undefined ? state['10'] : '0'))).toLowerCase().replace(/^nav::/, '');
          var pageMap = { 'home': '0', 'telemetry': '1', 'controls': '2', 'settings': '3', 'icons': '4', 'about': '5', 'contact': '6' };
          var curIndex = pageMap[curRoute] !== undefined ? pageMap[curRoute] : curRoute;

          document.querySelectorAll('[data-page], [data-screen], [data-route-url], route, [page]').forEach(function(p) {
            var pRoute = p.getAttribute('data-route-url') || p.getAttribute('url');
            var pScreen = p.getAttribute('data-screen');
            var pPage = (p.getAttribute('data-page') || p.getAttribute('page') || '').toLowerCase().replace(/^nav::/, '');

            // 1. Drawer Screen Handler (e.g. data-screen="MainDrawer")
            if (pScreen && pScreen.toLowerCase().includes('drawer')) {
              var isDrawerOpen = state.drawerOpen === true || state['drawer'] === 'open' || state['drawer:open'] === true;
              p.style.display = isDrawerOpen ? 'block' : 'none';
              if (isDrawerOpen) {
                p.style.position = 'fixed';
                p.style.top = '0';
                p.style.left = '0';
                p.style.bottom = '0';
                p.style.width = '340px';
                p.style.maxWidth = '85vw';
                p.style.height = '100vh';
                p.style.zIndex = '99999';
                p.style.boxShadow = '20px 0 50px rgba(0,0,0,0.8)';
                p.style.overflowY = 'auto';
              }
              return;
            }

            // 2. Hardware Register Mapped Viewports (e.g. data-page="5:0", data-page="5:1")
            if (pPage && pPage.indexOf(':') > 0) {
              var parts = pPage.split(':');
              var reg = parts[0];
              var expectedVal = parts[1];
              var actualVal = String(state[reg] !== undefined ? state[reg] : (state['bus:' + reg] !== undefined ? state['bus:' + reg] : '0'));
              p.style.display = (actualVal === expectedVal) ? 'block' : 'none';
              return;
            }

            // 3. Universal Namespace-Slot Viewport Matching (page="namespace::slot")
            if (pPage && pPage.indexOf('::') !== -1) {
              var nParts = pPage.split('::');
              var ns = nParts[0].trim().toLowerCase();
              var slot = nParts[1].trim().toLowerCase();
              var activeSlot = String(state[ns] !== undefined ? state[ns] : (state['nav'] || 'home')).toLowerCase();
              p.style.display = (activeSlot === slot) ? 'block' : 'none';
              return;
            }

            // Simple route match
            var isMatch = (pPage === curRoute || 
                           pPage === curIndex || 
                           (pageMap[pPage] !== undefined && pageMap[pPage] === curIndex) ||
                           (pScreen && pScreen.toLowerCase() === curRoute) || 
                           (pRoute && (pRoute === curRoute || pRoute.toLowerCase() === curRoute || pageMap[pRoute.toLowerCase()] === curIndex)));
            p.style.display = isMatch ? 'block' : 'none';
          });

          // 🔘 Universal Button Active State Highlighting (Generic for any tx="namespace::slot")
          document.querySelectorAll('[data-tab], [tx*="::"], [action*="::"]').forEach(function(btn) {
            var rawAct = (btn.getAttribute('tx') || btn.getAttribute('data-tab') || btn.getAttribute('action') || '').trim();
            if (rawAct.indexOf('::') !== -1) {
              var bParts = rawAct.split('::');
              var bNs = bParts[0].trim().toLowerCase();
              var bSlot = bParts[1].trim().toLowerCase();
              var curActive = String(state[bNs] !== undefined ? state[bNs] : (state['nav'] || '')).toLowerCase();
              var isBtnActive = (bSlot === curActive);
              btn.classList.toggle('active', isBtnActive);
              if (isBtnActive) {
                btn.classList.add('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-300');
                btn.classList.remove('text-slate-400', 'border-transparent');
              } else if (curActive) {
                btn.classList.remove('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-300');
                btn.classList.add('text-slate-400', 'border-transparent');
              }
            }
          });

          // ⚡ Dynamic Sub-Tab Active Highlight for Register 11 (ADMIN_SUB_TAB)
          var curSubTab = String(state['11'] !== undefined ? state['11'] : (state['bus:11'] !== undefined ? state['bus:11'] : '0'));
          document.querySelectorAll('[data-tx="11"]').forEach(function(btn) {
            var btnVal = btn.getAttribute('data-tx-val') || btn.getAttribute('tx-value');
            if (btnVal !== null && String(btnVal) === curSubTab) {
              btn.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
              btn.classList.remove('bg-slate-900', 'text-slate-300');
            } else if (btnVal !== null) {
              btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
              btn.classList.add('bg-slate-900');
            }
          });

          var imgElements = document.querySelectorAll('[data-state-img]');
          imgElements.forEach(function(img) {
            var imgKey = img.getAttribute('data-state-img');
            if (imgKey && state[imgKey] !== undefined) {
              var newSrc = String(state[imgKey]);
              if (img.getAttribute('src') !== newSrc) {
                img.setAttribute('src', newSrc);
                if (img.tagName === 'VIDEO') { try { img.load(); img.play().catch(function() {}); } catch (_) {} }
              }
            }
          });
        }

        // Live input binding for forms, carrier slots, and registers
        document.addEventListener('input', function(e) {
          var el = e.target;
          if (!el) return;
          var key = el.getAttribute('data-state-key') || el.getAttribute('name');
          var rxAttr = el.getAttribute('data-rx') || el.getAttribute('rx');
          var slotAttr = el.getAttribute('slot') || el.getAttribute('data-slot');
          var val = el.value;

          if (key) {
            state[key] = val;
            document.querySelectorAll('[data-state-key="' + key + '"], [name="' + key + '"]').forEach(function(t) {
              if (t !== el && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') t.textContent = val;
            });
          }

          if (rxAttr) {
            state[rxAttr] = val;
            state['bus:' + rxAttr] = val;
            document.querySelectorAll('[data-rx="' + rxAttr + '"], [rx="' + rxAttr + '"], [tb-text="' + rxAttr + '"]').forEach(function(t) {
              if (t !== el && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') t.textContent = val;
            });
          }

          if (slotAttr) {
            state['slot_' + slotAttr] = val;
            document.querySelectorAll('[slot="' + slotAttr + '"], [data-slot="' + slotAttr + '"]').forEach(function(t) {
              if (t !== el && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') t.textContent = val;
            });
          }
        });

        if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
        window.scrollTo(0, 0);
        updateDOM();

        // ⚡ Sovereign External Route Commutator Auto-Runner
        document.querySelectorAll('route[url], [data-external-route]').forEach(function(r) {
          var url = r.getAttribute('url') || r.getAttribute('data-external-route');
          if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/api/'))) return;
          var interval = parseInt(r.getAttribute('interval') || '0', 10);

          function runRouteFetch() {
            fetch(url)
              .then(function(res) { return res.text(); })
              .then(function(data) {
                var parsed = null;
                try { parsed = JSON.parse(data); } catch(_) {}
                if (parsed && typeof parsed === 'object') {
                  Object.keys(parsed).forEach(function(key) {
                    var val = typeof parsed[key] === 'object' ? JSON.stringify(parsed[key]) : String(parsed[key]);
                    var targets = document.querySelectorAll('[data-rx], [rx], [data-bus], [tb-text]');
                    targets.forEach(function(el) {
                      var rxAttr = el.getAttribute('data-rx') || el.getAttribute('rx') || el.getAttribute('data-bus') || el.getAttribute('tb-text') || '';
                      if (rxAttr === key || rxAttr.endsWith('::' + key) || rxAttr.endsWith('.' + key)) {
                        if (el.tagName === 'IMG') {
                          el.setAttribute('src', val);
                          el.src = val;
                        } else {
                          el.textContent = val;
                        }
                      }
                    });
                  });
                }
              })
              .catch(function(err) {
                console.warn('[TitanRoute Web] Fetch error:', err);
              });
          }

          runRouteFetch();
          if (interval > 0) setInterval(runRouteFetch, interval);
        });

        // Handle Web Actions locally (0ms UI latency)
        document.addEventListener('click', function(e) {
          // Universal Target Actions (target="flip", target="save", target="delete")
          var clickedCard = e.target.closest('.titan-flipcard, flip-card, [class*="flipcard"]');
          if (clickedCard && !e.target.closest('button, input, textarea, a, select')) {
            clickedCard.classList.toggle('flipped');
          }
          var targetTrigger = e.target.closest('[data-target], [target]');
          if (targetTrigger) {
            var tVal = (targetTrigger.getAttribute('data-target') || targetTrigger.getAttribute('target') || '').toLowerCase().trim();
            if (tVal === 'flip' || tVal === 'save' || tVal === 'delete') {
              var card = targetTrigger.closest('.titan-flipcard, flip-card, [class*="flip-card"]');
              if (card) {
                var col = card.getAttribute('data-col') || (card.parentElement && (card.parentElement.getAttribute('collection') || card.parentElement.getAttribute('data-collection'))) || 'menu';
                var docId = card.getAttribute('data-id') || '';

                if (tVal === 'flip') {
                  e.preventDefault();
                  e.stopPropagation();
                  card.classList.toggle('flipped');
                  return;
                }

                if (tVal === 'save') {
                  e.preventDefault();
                  e.stopPropagation();
                  var inputs = card.querySelectorAll('[data-target*="mirror"] input, [data-target*="editable"] input, [target*="mirror"] input, [target*="editable"] input');
                  var formValues = {};
                  inputs.forEach(function(inp) {
                    var sId = inp.getAttribute('slot') || inp.getAttribute('data-slot') || inp.getAttribute('name');
                    if (sId) formValues['slot_' + sId] = inp.value;
                  });
                  card.classList.remove('flipped');
                  try {
                    fetch('/action', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'target:save:' + col + ':' + docId, value: docId, values: formValues })
                    }).catch(function() {});
                  } catch(e) {}
                  return;
                }

                if (tVal === 'delete') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm('Delete this item?')) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    setTimeout(function() { card.remove(); }, 300);
                    try {
                      fetch('/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'target:delete:' + col + ':' + docId, value: docId })
                      }).catch(function() {});
                    } catch(e) {}
                  }
                  return;
                }
              }
            }
          }

          var btn = e.target.closest('[data-action], [action]');
          if (!btn) return;
          var fullAction = btn.getAttribute('data-action') || btn.getAttribute('action');
          if (!fullAction) return;
          e.preventDefault();

          function executeSingleAction(action) {
            if (!action) return;
            var actionStr = String(action).trim();
            var lowerAct = actionStr.toLowerCase();

            // Semicolon separated composite actions
            if (actionStr.includes(';')) {
              var subs = actionStr.split(';').map(function(s) { return s.trim(); }).filter(Boolean);
              subs.forEach(function(sub) { executeSingleAction(sub); });
              return;
            }

            // 1. Counter Actions (Pure JS Web Logic)
            if (lowerAct === 'counter::inc' || lowerAct === 'counter:increment' || lowerAct === 'counter.increment' || lowerAct === 'app.increment') {
              var cur = parseInt(state['counter::value'] !== undefined ? state['counter::value'] : (state['512'] !== undefined ? state['512'] : (state.counter || 0)), 10);
              var next = (isNaN(cur) ? 0 : cur) + 1;
              state['counter::value'] = next;
              state['512'] = next;
              state['0x200'] = next;
              state.counter = next;
              updateDOM();
            } else if (lowerAct === 'counter::dec' || lowerAct === 'counter:decrement' || lowerAct === 'counter.decrement' || lowerAct === 'app.decrement') {
              var cur = parseInt(state['counter::value'] !== undefined ? state['counter::value'] : (state['512'] !== undefined ? state['512'] : (state.counter || 0)), 10);
              var next = (isNaN(cur) || cur <= 0) ? 0 : cur - 1;
              state['counter::value'] = next;
              state['512'] = next;
              state['0x200'] = next;
              state.counter = next;
              updateDOM();
            } else if (lowerAct === 'counter::reset' || lowerAct === 'counter:reset' || lowerAct === 'app.resetall' || lowerAct === 'store.reset' || lowerAct === 'app.reset') {
              state['counter::value'] = 0;
              state['512'] = 0;
              state['0x200'] = 0;
              state.counter = 0;
              updateDOM();
            }

            // 2. Universal Navigation and Slot Action Handler
            if (lowerAct.startsWith('nav::') || lowerAct.startsWith('nav:') || lowerAct.startsWith('tab:') || lowerAct.startsWith('nav.to:') || lowerAct.startsWith('app:nav:')) {
              var screenName = actionStr.indexOf('::') !== -1
                ? actionStr.split('::').slice(1).join('::').trim()
                : actionStr.split(':').slice(1).join(':').trim();
              if (screenName) {
                var screenMap = { 'home': '0', 'telemetry': '1', 'controls': '2', 'settings': '3', 'icons': '4', 'about': '5', 'contact': '6' };
                var routeVal = screenMap[screenName.toLowerCase()] !== undefined ? screenMap[screenName.toLowerCase()] : screenName;
                state['10'] = routeVal;
                state['bus:10'] = routeVal;
                state['nav'] = screenName.toLowerCase();
                state['nav::current'] = screenName.toLowerCase();
                state['currentScreen'] = screenName;
                state.activeNav = screenName;
                state.activeTab = screenName;

                // 🌐 Two-Way HTML5 History URL Path Sync (/settings, /about, /home)
                if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                  var targetUrl = screenName.toLowerCase() === 'home' ? '/' : '/' + screenName.toLowerCase();
                  if (window.location.pathname !== targetUrl) {
                    window.history.pushState(null, '', targetUrl);
                  }
                }

                updateDOM();
                try {
                  fetch('/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: actionStr, value: '' })
                  }).catch(function() {});
                } catch(e) {}
                return;
              }
            }

            // 2b. Universal Nested Namespace Slot Selector (Generic for ANY namespace::slot)
            if (actionStr.indexOf('::') !== -1 && !actionStr.includes('inc') && !actionStr.includes('dec') && !actionStr.includes('reset') && !actionStr.includes('save') && !actionStr.includes('toggle')) {
              var nParts = actionStr.split('::');
              var pName = nParts[0].trim().toLowerCase();
              var subName = nParts[1].trim().toLowerCase();
              if (pName && subName) {
                state[pName] = subName;
                state[pName + '::current'] = subName;

                // Push Generic Nested Browser URL (/parent/sub)
                if (typeof window !== 'undefined' && window.history && window.history.pushState) {
                  var nestedUrl = '/' + pName + '/' + subName;
                  if (window.location.pathname !== nestedUrl) {
                    window.history.pushState(null, '', nestedUrl);
                  }
                }

                updateDOM();
                try {
                  fetch('/action', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: actionStr, value: '' })
                  }).catch(function() {});
                } catch(e) {}
                return;
              }
            }

            // 3. Settings Actions
            if (lowerAct === 'power:toggle' || lowerAct === 'power') {
              var cur = state.power !== undefined ? state.power : 1;
              var next = cur ? 0 : 1;
              state.power = next;
              state.power_status = next ? 'चालू (ON) ⚡' : 'बन्द (OFF) 🔴';
              state.alert_msg = next ? '⚡ मास्टर पावर चालू गरियो।' : '🔴 मास्टर पावर बन्द गरियो।';
              updateDOM();
            } else if (lowerAct === 'theme:toggle' || lowerAct === 'theme') {
              var cur = state.theme === 'light' ? 'light' : 'dark';
              var next = cur === 'dark' ? 'light' : 'dark';
              state.theme = next;
              state.theme_label = next === 'light' ? 'उज्यालो (Light) ☀️' : 'गाढा (Dark) 🌙';
              state.alert_msg = next === 'light' ? '☀️ उज्यालो थिम सक्रिय भयो।' : '🌙 गाढा थिम सक्रिय भयो।';
              document.documentElement.classList.toggle('dark', next === 'dark');
              document.body.classList.toggle('dark', next === 'dark');
              updateDOM();
            } else if (lowerAct === 'alert:test' || lowerAct === 'app.showtoast') {
              state.alert_msg = '🔔 नयाँ सूचना: सेटिङ सफलतापूर्वक परीक्षण गरियो (' + new Date().toLocaleTimeString() + ')';
              updateDOM();
            } else if (lowerAct === 'data:reset') {
              state['counter::value'] = 0;
              state['form::note'] = '';
              state.alert_msg = '🔄 सम्पूर्ण काउन्टर र नोट डाटा शून्यमा रिसेट गरियो!';
              updateDOM();
            }

            // 4. Form Actions
            if (lowerAct === 'form::save' || lowerAct === 'form:submit') {
              state.db_status = '✅ सुरक्षित भयो (' + new Date().toLocaleTimeString() + ')';
              state.alert_msg = '💾 नोट सफलतापूर्वक सेभ गरियो!';
              updateDOM();
            }

            // 6. Direct Hardware Bus Actions (legacy support)
            if (lowerAct.startsWith('bus:') || !isNaN(Number(actionStr))) {
              var parts = lowerAct.startsWith('bus:') ? actionStr.split(':') : ['bus', actionStr];
              var regStr = parts[1] || '';
              var reg = (regStr.startsWith('0x') || regStr.startsWith('0X')) ? parseInt(regStr, 16) : parseInt(regStr, 10);
              if (!isNaN(reg)) {
                if (reg === 513 || reg === 0x0201) {
                  var cur = parseInt(state['counter::value'] || state['512'] || 0, 10);
                  var next = cur + 1;
                  state['counter::value'] = next;
                  state['512'] = next;
                } else if (reg === 514 || reg === 0x0202) {
                  var cur = parseInt(state['counter::value'] || state['512'] || 0, 10);
                  var next = Math.max(0, cur - 1);
                  state['counter::value'] = next;
                  state['512'] = next;
                } else if (reg === 515 || reg === 0x0203) {
                  state['counter::value'] = 0;
                  state['512'] = 0;
                } else {
                  var cur = state[reg] !== undefined ? state[reg] : 0;
                  state[reg] = cur == 0 ? 1 : 0;
                }
                updateDOM();
              }
            }

            // Universal Action Forwarder to Backend Server (app.logic.js)
            try {
              fetch('/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionStr, value: '' })
              }).catch(function() {});
            } catch (e) {}
          }

          executeSingleAction(fullAction);
        });

        // Forward live search/text input events with action
        document.addEventListener('input', function(e) {
          var el = e.target;
          if (!el) return;
          var act = el.getAttribute('data-action') || el.getAttribute('action');
          if (act) {
            try {
              fetch('/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: act, value: el.value })
              }).catch(function() {});
            } catch(e) {}
          }
        });

        // ⚡ Live SSE Reactive Subscriber (Real-Time Zero-Reload Register & State Updates)
        if (typeof EventSource !== 'undefined') {
          try {
            var sse = new EventSource('/sse');
            sse.onmessage = function(ev) {
              try {
                var msg = JSON.parse(ev.data);
                if (msg.type === 'reload') {
                  window.location.reload();
                } else if (msg.type === 'register_update' || msg.type === 'register') {
                  var reg = msg.reg !== undefined ? msg.reg : msg.register;
                  var val = msg.value !== undefined ? msg.value : msg.val;
                  state[reg] = val;
                  state['bus:' + reg] = val;
                  if (window.TitanBus && !isNaN(Number(reg))) {
                    window.TitanBus.registers[Number(reg) & 0xFFFF] = Number(val);
                  }
                  if (typeof reg === 'number') {
                    state['0x' + reg.toString(16).toLowerCase()] = val;
                    state['bus:0x' + reg.toString(16).toLowerCase()] = val;
                  }
                  updateDOM();
                } else if (msg.type === 'patch') {
                  var key = msg.key;
                  var val = msg.value;
                  state[key] = val;
                  state['bus:' + key] = val;
                  updateDOM();
                } else if (msg.type === 'slot_stream') {
                  var reg = msg.reg;
                  var items = msg.items || msg.value;
                  state[reg] = items;
                  state['bus:' + reg] = items;
                  updateDOM();
                }
              } catch(e) {}
            };
          } catch(e) {}
        }
      })();
    </script>
</body>
</html>`;
    }

    _resolveGradientString(gradStr) {
        if (!gradStr) return '';
        if (gradStr.includes('danphe')) {
            return 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 33%, #047857 66%, #f59e0b 100%)';
        }
        if (gradStr.includes('aurora')) {
            return 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 33%, #065f46 66%, #10b981 100%)';
        }
        const parts = String(gradStr).split('-');
        let dir = '135deg';
        let c1Name = 'blue-600', c2Name = 'cyan-400';
        if (parts.length >= 6 && parts[1] === 'vert') {
            dir = 'to bottom'; c1Name = parts[2] + '-' + parts[3]; c2Name = parts[4] + '-' + parts[5];
        } else if (parts.length >= 6 && parts[1] === 'horiz') {
            dir = 'to right'; c1Name = parts[2] + '-' + parts[3]; c2Name = parts[4] + '-' + parts[5];
        } else if (parts.length >= 6 && parts[1].endsWith('deg')) {
            dir = parts[1]; c1Name = parts[2] + '-' + parts[3]; c2Name = parts[4] + '-' + parts[5];
        } else if (parts.length >= 5) {
            c1Name = parts[1] + '-' + parts[2]; c2Name = parts[3] + '-' + parts[4];
        } else if (parts.length >= 3) {
            c1Name = parts[1]; c2Name = parts[2];
        }

        const colorMap = {
            'blue-600': '#2563eb', 'cyan-400': '#22d3ee', 'purple-600': '#9333ea', 'pink-500': '#ec4899',
            'slate-800': '#1e293b', 'slate-950': '#020617', 'indigo-600': '#4f46e5', 'rose-500': '#f43f5e',
            'amber-500': '#f59e0b', 'emerald-500': '#10b981', 'teal-500': '#14b8a6', 'sky-400': '#38bdf8'
        };

        const hex1 = colorMap[c1Name] || '#2563eb';
        const hex2 = colorMap[c2Name] || '#ec4899';
        return `linear-gradient(${dir}, ${hex1}, ${hex2})`;
    }

    _classNameToStyle(className) {
        if (!className) return '';
        const TW_COLOR_MAP = {
            'orange-50': '#fff7ed', 'orange-100': '#ffedd5', 'orange-200': '#fed7aa', 'orange-300': '#fdba74', 'orange-400': '#fb923c', 'orange-500': '#f97316', 'orange-600': '#ea580c', 'orange-700': '#c2410c', 'orange-800': '#9a3412', 'orange-900': '#7c2d12',
            'red-50': '#fef2f2', 'red-100': '#fee2e2', 'red-200': '#fecaca', 'red-300': '#fca5a5', 'red-400': '#f87171', 'red-500': '#ef4444', 'red-600': '#dc2626', 'red-700': '#b91c1c', 'red-800': '#991b1b', 'red-900': '#7f1d1d',
            'rose-400': '#fb7185', 'rose-500': '#f43f5e', 'rose-600': '#e11d48', 'rose-700': '#be123c',
            'blue-50': '#eff6ff', 'blue-100': '#dbeafe', 'blue-200': '#bfdbfe', 'blue-300': '#93c5fd', 'blue-400': '#60a5fa', 'blue-500': '#3b82f6', 'blue-600': '#2563eb', 'blue-700': '#1d4ed8', 'blue-800': '#1e40af', 'blue-900': '#1e3a8a',
            'indigo-50': '#eef2ff', 'indigo-100': '#e0e7ff', 'indigo-200': '#c7d2fe', 'indigo-300': '#a5b4fc', 'indigo-400': '#818cf8', 'indigo-500': '#6366f1', 'indigo-600': '#4f46e5', 'indigo-700': '#4338ca', 'indigo-800': '#3730a3', 'indigo-900': '#312e81',
            'cyan-400': '#22d3ee', 'cyan-500': '#06b6d4', 'cyan-600': '#0891b2',
            'sky-400': '#38bdf8', 'sky-500': '#0ea5e9', 'sky-600': '#0284c7',
            'teal-400': '#2dd4bf', 'teal-500': '#14b8a6', 'teal-600': '#0d9488',
            'green-50': '#f0fdf4', 'green-100': '#dcfce7', 'green-200': '#bbf7d0', 'green-300': '#86efac', 'green-400': '#4ade80', 'green-500': '#22c55e', 'green-600': '#16a34a', 'green-700': '#15803d', 'green-800': '#166534', 'green-900': '#14532d',
            'emerald-50': '#ecfdf5', 'emerald-100': '#d1fae5', 'emerald-200': '#a7f3d0', 'emerald-300': '#6ee7b7', 'emerald-400': '#34d399', 'emerald-500': '#10b981', 'emerald-600': '#059669', 'emerald-700': '#047857', 'emerald-800': '#065f46', 'emerald-900': '#064e3b',
            'fuchsia-400': '#e879f9', 'fuchsia-500': '#d946ef', 'fuchsia-600': '#c026d3',
            'violet-400': '#a78bfa', 'violet-500': '#8b5cf6', 'violet-600': '#7c3aed',
            'pink-400': '#f472b6', 'pink-500': '#ec4899', 'pink-600': '#db2777',
            'slate-50': '#f8fafc', 'slate-100': '#f1f5f9', 'slate-200': '#e2e8f0', 'slate-300': '#cbd5e1', 'slate-400': '#94a3b8', 'slate-500': '#64748b', 'slate-600': '#475569', 'slate-700': '#334155', 'slate-800': '#1e293b', 'slate-900': '#0f172a',
            'gray-50': '#f9fafb', 'gray-100': '#f3f4f6', 'gray-200': '#e5e7eb', 'gray-300': '#d1d5db', 'gray-400': '#9ca3af', 'gray-500': '#6b7280', 'gray-600': '#4b5563', 'gray-700': '#374151', 'gray-800': '#1f2937', 'gray-900': '#111827',
            'amber-50': '#fffbeb', 'amber-100': '#fef3c7', 'amber-200': '#fde68a', 'amber-300': '#fcd34d', 'amber-400': '#fbbf24', 'amber-500': '#f59e0b', 'amber-600': '#d97706', 'amber-700': '#b45309', 'amber-800': '#92400e', 'amber-900': '#78350f',
            'purple-50': '#faf5ff', 'purple-100': '#f3e8ff', 'purple-200': '#e9d5ff', 'purple-300': '#d8b4fe', 'purple-400': '#c084fc', 'purple-500': '#a855f7', 'purple-600': '#9333ea', 'purple-700': '#7e22ce', 'purple-800': '#6b21a8', 'purple-900': '#581c87',
        };

        const normalizedClass = String(className)
            .replace(/\[([^\]]+)\]/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        const classes = normalizedClass.split(/\s+/);
        const styles = [];

        // Parse Gradient Backgrounds (bg-gradient-to-*, from-*, via-*, to-*)
        const hasGradient = classes.some(c => c.startsWith('bg-gradient-to-'));
        if (hasGradient) {
            const dirClass = classes.find(c => c.startsWith('bg-gradient-to-')) || 'bg-gradient-to-r';
            let dir = 'to right';
            if (dirClass.includes('-r')) dir = 'to right';
            else if (dirClass.includes('-l')) dir = 'to left';
            else if (dirClass.includes('-t')) dir = 'to top';
            else if (dirClass.includes('-b')) dir = 'to bottom';
            else if (dirClass.includes('-tr')) dir = 'to top right';
            else if (dirClass.includes('-br')) dir = 'to bottom right';

            const fromClass = classes.find(c => c.startsWith('from-'));
            const viaClass = classes.find(c => c.startsWith('via-'));
            const toClass = classes.find(c => c.startsWith('to-'));

            const resolveColor = (cls) => {
                if (!cls) return null;
                const name = cls.replace(/^(from|via|to)-/, '');
                if (TW_COLOR_MAP[name]) return TW_COLOR_MAP[name];
                if (name === 'white') return '#ffffff';
                if (name === 'black') return '#000000';
                if (name.startsWith('#')) return name;
                return null;
            };

            const fromColor = resolveColor(fromClass) || '#3b82f6';
            const viaColor = resolveColor(viaClass);
            const toColor = resolveColor(toClass) || '#ec4899';

            let gradCss = `linear-gradient(${dir}, ${fromColor}`;
            if (viaColor) gradCss += `, ${viaColor}`;
            gradCss += `, ${toColor})`;

            styles.push(`background-image:${gradCss} !important`);
        }

        const resolveColorWithOpacity = (raw) => {
            if (!raw) return null;
            let base = raw;
            let alpha = 1;
            if (raw.includes('/')) {
                const parts = raw.split('/');
                base = parts[0];
                const num = parseFloat(parts[1]);
                if (!isNaN(num)) alpha = num > 1 ? num / 100 : num;
            }
            let hex = TW_COLOR_MAP[base] || (base === 'white' ? '#ffffff' : (base === 'black' ? '#000000' : (base.startsWith('#') ? base : null)));
            if (!hex) return null;
            if (alpha < 1 && hex.startsWith('#') && hex.length === 7) {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return hex;
        };

        classes.forEach(c => {
            if (!c) return;
            if (c.startsWith('web:')) c = c.slice(4);
            if (c.startsWith('px-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-left:${parseFloat(val) * 4}px;padding-right:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-left:${val};padding-right:${val}`);
            } else if (c.startsWith('py-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-top:${parseFloat(val) * 4}px;padding-bottom:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-top:${val};padding-bottom:${val}`);
            } else if (c.startsWith('pt-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-top:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-top:${val}`);
            } else if (c.startsWith('pb-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-bottom:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-bottom:${val}`);
            } else if (c.startsWith('pl-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-left:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-left:${val}`);
            } else if (c.startsWith('pr-')) {
                const val = c.slice(3);
                if (!isNaN(parseFloat(val))) styles.push(`padding-right:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding-right:${val}`);
            } else if (c.startsWith('p-')) {
                const val = c.slice(2);
                if (!isNaN(parseFloat(val))) styles.push(`padding:${parseFloat(val) * 4}px`);
                else if (val.endsWith('px') || val.endsWith('rem')) styles.push(`padding:${val}`);
            }

            else if (c === 'relative') styles.push('position:relative');
            else if (c === 'absolute') styles.push('position:absolute');
            else if (c === 'fixed') styles.push('position:fixed');
            else if (c === 'sticky') styles.push('position:sticky');
            else if (c === 'top-0') styles.push('top:0');
            else if (c === 'bottom-0') styles.push('bottom:0');
            else if (c === 'left-0') styles.push('left:0');
            else if (c === 'right-0') styles.push('right:0');
            else if (c === 'z-50') styles.push('z-index:50');
            else if (c === 'z-40') styles.push('z-index:40');
            else if (c === 'z-30') styles.push('z-index:30');
            else if (c === 'z-20') styles.push('z-index:20');
            else if (c === 'z-10') styles.push('z-index:10');
            else if (c === 'overflow-y-auto') styles.push('overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch');
            else if (c === 'overflow-x-auto') styles.push('overflow-x:auto;overflow-y:hidden');
            else if (c === 'overflow-auto') styles.push('overflow:auto');
            else if (c === 'overflow-hidden') styles.push('overflow:hidden');
            else if (c === '-top-3') styles.push('top:-10px');
            else if (c === 'left-3') styles.push('left:12px');
            else if (c === 'm-4') styles.push('margin:16px');
            else if (c === 'mt-1') styles.push('margin-top:4px');
            else if (c === 'mt-2') styles.push('margin-top:8px');
            else if (c === 'mb-2') styles.push('margin-bottom:8px');

            else if (c === 'gap-1') styles.push('gap:4px');
            else if (c === 'gap-2') styles.push('gap:8px');
            else if (c === 'gap-3') styles.push('gap:12px');
            else if (c === 'gap-4') styles.push('gap:16px');
            else if (c === 'gap-6') styles.push('gap:24px');
            else if (c === 'gap-8') styles.push('gap:32px');

            else if (c === 'flex') styles.push('display:flex');
            else if (c === 'grid') styles.push('display:grid');
            else if (c === 'flex-row') styles.push('flex-direction:row');
            else if (c === 'flex-column' || c === 'flex-col') styles.push('flex-direction:column');
            else if (c === 'items-center') styles.push('align-items:center');
            else if (c === 'justify-center') styles.push('justify-content:center');
            else if (c === 'justify-between') styles.push('justify-content:space-between');
            else if (c === 'flex-1') styles.push('flex:1;min-height:0;min-width:0');
            else if (c === 'w-full') styles.push('width:100%');
            else if (c === 'h-full') styles.push('height:100%');
            else if (c === 'h-auto') styles.push('height:auto !important');
            else if (c === 'min-h-screen') styles.push('min-height:100vh');
            else if (c === 'h-screen') styles.push('height:100vh');
            else if (c === 'max-h-screen') styles.push('max-height:100vh');
            else if (c === 'max-h-none') styles.push('max-height:none !important');
            else if (c === 'overflow-visible') styles.push('overflow:visible !important');
            else if (c === 'aspect-video') styles.push('aspect-ratio:16/9');
            else if (c === 'aspect-square') styles.push('aspect-ratio:1/1');
            else if (c === 'select-none') styles.push('user-select:none');

            else if (c.startsWith('w-') && c !== 'w-full') {
                const val = c.slice(2);
                if (!isNaN(parseFloat(val)) && !val.includes('px') && !val.includes('%')) {
                    styles.push(`width:${parseFloat(val) * 4}px`);
                } else if (val.endsWith('px') || val.endsWith('rem') || val.endsWith('%') || val.endsWith('vw')) {
                    styles.push(`width:${val}`);
                }
            } else if (c.startsWith('h-') && c !== 'h-full') {
                const val = c.slice(2);
                if (!isNaN(parseFloat(val)) && !val.includes('px') && !val.includes('%')) {
                    styles.push(`height:${parseFloat(val) * 4}px`);
                } else if (val.endsWith('px') || val.endsWith('rem') || val.endsWith('%') || val.endsWith('vh')) {
                    styles.push(`height:${val}`);
                }
            }

            else if (c.startsWith('grid-cols-')) {
                const n = c.replace('grid-cols-', '');
                styles.push(`grid-template-columns:repeat(${n}, minmax(0, 1fr))`);
            } else if (c.startsWith('col-span-')) {
                const n = c.replace('col-span-', '');
                styles.push(`grid-column:span ${n} / span ${n}`);
            } else if (c.startsWith('min-h-')) {
                const h = c.replace('min-h-', '');
                if (h.endsWith('px') || h.endsWith('rem') || h.endsWith('vh') || h.endsWith('%')) styles.push(`min-height:${h}`);
            } else if (c.startsWith('max-h-')) {
                const h = c.replace('max-h-', '');
                if (h.endsWith('px') || h.endsWith('rem') || h.endsWith('vh') || h.endsWith('%')) styles.push(`max-height:${h}`);
            } else if (c.startsWith('max-w-')) {
                const w = c.replace('max-w-', '');
                if (w.endsWith('px') || w.endsWith('rem') || w.endsWith('vw') || w.endsWith('%')) styles.push(`max-width:${w}`);
            }

            else if (c.startsWith('rounded-')) {
                const rVal = c.replace('rounded-', '');
                if (rVal === 'sm') styles.push('border-radius:2px');
                else if (rVal === 'md') styles.push('border-radius:6px');
                else if (rVal === 'lg') styles.push('border-radius:8px');
                else if (rVal === 'xl') styles.push('border-radius:12px');
                else if (rVal === '2xl') styles.push('border-radius:16px');
                else if (rVal === '3xl') styles.push('border-radius:24px');
                else if (rVal === 'full') styles.push('border-radius:9999px');
                else {
                    const num = parseInt(rVal, 10);
                    if (!isNaN(num)) styles.push(`border-radius:${num}px`);
                }
            } else if (c === 'rounded') {
                styles.push('border-radius:4px');
            } else if (c === 'border') {
                styles.push('border:1px solid #1e293b');
            } else if (c === 'border-t') {
                styles.push('border-top:1px solid #1e293b');
            } else if (c === 'border-b') {
                styles.push('border-bottom:1px solid #1e293b');
            } else if (c === 'border-l') {
                styles.push('border-left:1px solid #1e293b');
            } else if (c === 'border-r') {
                styles.push('border-right:1px solid #1e293b');
            } else if (c === 'border-2') {
                styles.push('border-width:2px');
            } else if (c === 'border-0') {
                styles.push('border:none');
            } else if (c.startsWith('border-') && !c.startsWith('border-radius')) {
                const colorKey = c.replace('border-', '');
                const resolved = resolveColorWithOpacity(colorKey);
                if (resolved) styles.push(`border-color:${resolved}`);
            } else if (c.startsWith('bg-') && !c.startsWith('bg-gradient-to-')) {
                const colorKey = c.replace('bg-', '');
                const resolved = resolveColorWithOpacity(colorKey);
                if (resolved) styles.push(`background-color:${resolved}`);
            } else if (c.startsWith('text-')) {
                const colorKey = c.replace('text-', '');
                const resolved = resolveColorWithOpacity(colorKey);
                if (resolved) styles.push(`color:${resolved}`);
            }
        });

        return styles.join(';');
    }

    _escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

module.exports = DolphinWebEngine;
