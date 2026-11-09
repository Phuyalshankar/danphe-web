'use strict';

/**
 * 🎨 DANPHE STYLE TOKENIZER (StyleTokenizer.js)
 * High-speed atomic CSS / Tailwind class tokenizer.
 * Replaces hundreds of string-prefix checks with an O(1) dictionary and tokenizer.
 */

const PALETTE_MAP = {
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

const FONT_SIZE_MAP = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48
};

const RADIUS_MAP = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999
};

function parseUnits(val) {
  if (!val) return 0;
  if (val.endsWith('px')) return parseInt(val, 10) || 0;
  const num = parseFloat(val);
  if (isNaN(num)) return 0;
  // Standard Tailwind 4px unit multiplier
  return Math.round(num * 4);
}

function resolveColorAndShade(colorStr) {
  if (!colorStr) return [0, 0];
  const parts = colorStr.split('-');
  const name = parts[0];
  const shadeNum = parts[1] ? parseInt(parts[1], 10) : 500;
  const pal = PALETTE_MAP[name] || 0;
  const shadeByte = Math.min(Math.round(shadeNum / 100), 9);
  return [pal, shadeByte];
}

class StyleTokenizer {
  static tokenizeClasses(classNameStr) {
    const style = {
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      bg: { palette: 0, shade: 0, gradient: false },
      text: { palette: 0, shade: 0, size: 14, weight: 400, align: 0 },
      border: { radius: 0, width: 0, color: '' },
      layout: { flex: false, direction: 0, justify: 0, align: 0, gap: 0 },
      carrier: { rx: 0, tx: 0, slot: 0 }
    };

    if (!classNameStr || typeof classNameStr !== 'string') return style;

    const tokens = classNameStr.trim().split(/\s+/);

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      // 1. Padding
      if (t.startsWith('p-')) {
        const u = parseUnits(t.slice(2));
        style.padding.top = style.padding.right = style.padding.bottom = style.padding.left = u;
      } else if (t.startsWith('px-')) {
        const u = parseUnits(t.slice(3));
        style.padding.left = style.padding.right = u;
      } else if (t.startsWith('py-')) {
        const u = parseUnits(t.slice(3));
        style.padding.top = style.padding.bottom = u;
      } else if (t.startsWith('pt-')) style.padding.top = parseUnits(t.slice(3));
      else if (t.startsWith('pr-')) style.padding.right = parseUnits(t.slice(3));
      else if (t.startsWith('pb-')) style.padding.bottom = parseUnits(t.slice(3));
      else if (t.startsWith('pl-')) style.padding.left = parseUnits(t.slice(3));

      // 2. Margin
      else if (t.startsWith('m-')) {
        const u = parseUnits(t.slice(2));
        style.margin.top = style.margin.right = style.margin.bottom = style.margin.left = u;
      } else if (t.startsWith('mx-')) {
        const u = parseUnits(t.slice(3));
        style.margin.left = style.margin.right = u;
      } else if (t.startsWith('my-')) {
        const u = parseUnits(t.slice(3));
        style.margin.top = style.margin.bottom = u;
      } else if (t.startsWith('mt-')) style.margin.top = parseUnits(t.slice(3));
      else if (t.startsWith('mr-')) style.margin.right = parseUnits(t.slice(3));
      else if (t.startsWith('mb-')) style.margin.bottom = parseUnits(t.slice(3));
      else if (t.startsWith('ml-')) style.margin.left = parseUnits(t.slice(3));

      // 3. Background
      else if (t === 'bg-everest' || t.startsWith('fx-')) {
        if (!style.fx) style.fx = [];
        style.fx.push(t);
        if (t === 'bg-everest') style.bg.everest = true;
      } else if (t.startsWith('bg-gradient-')) {
        style.bg.gradient = true;
      } else if (t.startsWith('bg-')) {
        const [pal, sh] = resolveColorAndShade(t.slice(3));
        if (pal !== 0) {
          style.bg.palette = pal;
          style.bg.shade = sh;
        }
      }

      // 4. Text
      else if (t.startsWith('text-')) {
        const sub = t.slice(5);
        if (FONT_SIZE_MAP[sub]) {
          style.text.size = FONT_SIZE_MAP[sub];
        } else if (sub === 'center') {
          style.text.align = 1;
        } else if (sub === 'right') {
          style.text.align = 2;
        } else {
          const [pal, sh] = resolveColorAndShade(sub);
          if (pal !== 0) {
            style.text.palette = pal;
            style.text.shade = sh;
          }
        }
      } else if (t === 'font-bold') {
        style.text.weight = 700;
      } else if (t === 'font-semibold') {
        style.text.weight = 600;
      }

      // 5. Border Radius
      else if (t.startsWith('rounded')) {
        if (t === 'rounded') style.border.radius = RADIUS_MAP.DEFAULT;
        else if (t.startsWith('rounded-')) {
          const r = t.slice(8);
          style.border.radius = RADIUS_MAP[r] !== undefined ? RADIUS_MAP[r] : parseUnits(r);
        }
      }

      // 6. Layout & Flex
      else if (t === 'flex') style.layout.flex = true;
      else if (t === 'flex-col') style.layout.direction = 1;
      else if (t === 'flex-row') style.layout.direction = 0;
      else if (t.startsWith('gap-')) style.layout.gap = parseUnits(t.slice(4));

      // 7. Special FX Variants & Mount Everest Presets
      else if (t.startsWith('fx-') || t === 'bg-everest') {
        if (!style.fx) style.fx = [];
        style.fx.push(t);
      }

      // 8. Carriers & Slots
      else if (t.startsWith('carrier-slot-') || t.startsWith('c-slot-') || t.startsWith('slot-')) {
        const sub = t.replace(/^carrier-slot-|^c-slot-|^slot-/, '');
        style.carrier.slot = parseInt(sub, 10) || 0;
      } else if (t.startsWith('carrier-rx-') || t.startsWith('c-rx-')) {
        const sub = t.replace(/^carrier-rx-|^c-rx-/, '');
        style.carrier.rx = (sub.startsWith('0x') ? parseInt(sub, 16) : parseInt(sub, 10)) & 0xFFFF;
      } else if (t.startsWith('carrier-tx-') || t.startsWith('c-tx-')) {
        const sub = t.replace(/^carrier-tx-|^c-tx-/, '');
        style.carrier.tx = (sub.startsWith('0x') ? parseInt(sub, 16) : parseInt(sub, 10)) & 0xFFFF;
      }
    }

    return style;
  }
}

module.exports = {
  PALETTE_MAP,
  FONT_SIZE_MAP,
  RADIUS_MAP,
  parseUnits,
  resolveColorAndShade,
  StyleTokenizer
};
