'use strict';

const { pipeline } = require('../src/index');

const sharedAppVNode = {
  tag: 'container',
  props: { className: 'p-4 max-w-md mx-auto w-full bg-slate-950' },
  children: [
    {
      tag: 'vstack',
      props: { gap: 4, className: 'bg-slate-900 p-5 rounded-2xl border border-slate-800 w-full' },
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
            svg: `<svg viewBox="0 0 400 140" width="400" height="140" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="400" height="140" rx="16" fill="#0f172a" stroke="#334155" stroke-width="2" /><circle cx="50" cy="70" r="30" fill="#38bdf8" /><text x="95" y="60" fill="#f8fafc" font-size="20">Samsung ThorVG Engine</text><text x="95" y="90" fill="#10b981" font-size="14">Pure C++ Hardware Vector</text></svg>`
          }
        },
        { tag: 'divider' },
        {
          tag: 'vstack',
          props: { gap: 3, className: 'w-full' },
          children: [
            { tag: 'text', props: { className: 'text-base font-medium text-slate-300' }, text: 'Master Speed / Throttle (0-255):' },
            { tag: 'text', props: { rx: 512, className: 'text-4xl font-mono font-bold text-emerald-400 py-1' }, text: '128' },
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

const result = pipeline.toAndroid(sharedAppVNode, 'Home');
console.log('Components Count:', result.componentsCount);
console.log('Bundle Length:', result.bundleBuffer.length);

const buf = result.bundleBuffer;
const cur = 20;
const nameLen = buf[cur];
let offset = cur + 1 + nameLen + 2 + 2;
const dataLen = buf.readUInt32LE(offset); offset += 4;

const dataBytes = buf.slice(offset, offset + dataLen);
const compsBuf = buf.slice(offset + dataLen, offset + dataLen + result.componentsCount * 24);

let dataIdx = 0;
function nextStr() {
  if (dataIdx >= dataBytes.length) return '';
  const start = dataIdx;
  while (dataIdx < dataBytes.length && dataBytes[dataIdx] !== 0) {
    dataIdx++;
  }
  const str = dataBytes.slice(start, dataIdx).toString('utf8');
  if (dataIdx < dataBytes.length) dataIdx++;
  return str;
}

const opcodes = { 0x10: 'Button', 0x12: 'Container', 0x13: 'VStack', 0x14: 'HStack', 0x16: 'Text', 0x19: 'Slider', 0x61: 'ThorVG' };

let cIdx = 0;
function buildComp(depth = 0) {
  if (cIdx >= result.componentsCount) return;
  const currentIdx = cIdx++;
  const bin = compsBuf.slice(currentIdx * 24, (currentIdx + 1) * 24);
  const type = bin[1];
  const typeName = opcodes[type] || ('0x' + type.toString(16));
  const sig = bin[15];

  const sizeStr = nextStr();
  const gradStr = (sig & 0x01) ? nextStr() : '';
  const borderStr = (sig & 0x04) ? nextStr() : '';
  const dynamicStr = (sig & 0x08) ? nextStr() : '';
  const animStr = (sig & 0x10) ? nextStr() : '';

  const indent = '  '.repeat(depth);
  console.log(`${indent}Building ${typeName} (#${currentIdx}) size="${sizeStr}"`);

  if (type === 0x12 || type === 0x13 || type === 0x14 || type === 0x11) {
    const action = nextStr();
    const count = bin[13];
    console.log(`${indent} -> ${typeName} has ${count} children, action="${action}"`);
    for (let c = 0; c < count; c++) {
      buildComp(depth + 1);
    }
  } else if (type === 0x16) {
    const textContent = nextStr();
    console.log(`${indent} -> Text: "${textContent}"`);
  } else if (type === 0x10) {
    const action = nextStr();
    const label = nextStr();
    const icon = nextStr();
    console.log(`${indent} -> Button: action="${action}", label="${label}"`);
  } else if (type === 0x19) {
    const action = nextStr();
    const label = nextStr();
    console.log(`${indent} -> Slider: action="${action}", label="${label}"`);
  } else if (type === 0x61) {
    const action = nextStr();
    const svg = nextStr();
    console.log(`${indent} -> ThorVG C++: action="${action}", svgLen=${svg.length}`);
  }
}

buildComp();
console.log('Read bytes:', dataIdx, 'of', dataLen);
if (dataIdx === dataLen && cIdx === result.componentsCount) {
  console.log('🎯 100% PERFECT TREE & STRING POOL ALIGNMENT INCLUDING THORVG!');
} else {
  console.error('MISALIGNMENT: dataIdx=' + dataIdx + '/' + dataLen + ', cIdx=' + cIdx + '/' + result.componentsCount);
}
