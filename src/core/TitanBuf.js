'use strict';

/**
 * TitanBuf — Universal Binary Buffer (Browser Uint8Array + Node.js Buffer)
 * Drop-in replacement for all Buffer calls. Zero external dependencies.
 */

const _isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

const TitanBuf = {
  alloc(size, fill = 0) {
    if (_isNode) return Buffer.alloc(size, fill);
    const a = new Uint8Array(size);
    if (fill !== 0) a.fill(fill);
    return a;
  },
  from(data, encoding) {
    if (_isNode) return Buffer.from(data, encoding);
    if (typeof data === 'string') {
      if (encoding === 'hex') {
        const a = new Uint8Array(data.length / 2);
        for (let i = 0; i < data.length; i += 2) a[i/2] = parseInt(data.slice(i, i+2), 16);
        return a;
      }
      return new TextEncoder().encode(data);
    }
    if (Array.isArray(data)) return new Uint8Array(data);
    if (data instanceof Uint8Array) return new Uint8Array(data);
    return new Uint8Array(data);
  },
  concat(buffers) {
    if (_isNode) return Buffer.concat(buffers);
    let total = 0; for (const b of buffers) total += b.length;
    const out = new Uint8Array(total); let offset = 0;
    for (const b of buffers) { out.set(b, offset); offset += b.length; }
    return out;
  },
  isBuffer(b) {
    if (_isNode && Buffer.isBuffer(b)) return true;
    return b instanceof Uint8Array;
  },
  toHex(buf) {
    if (_isNode && Buffer.isBuffer(buf)) return buf.toString('hex');
    return Array.from(buf).map(b => b.toString(16).padStart(2,'0')).join('');
  },
  toString(buf, encoding, start, end) {
    const sl = (start !== undefined || end !== undefined) ? buf.slice(start, end) : buf;
    if (_isNode && Buffer.isBuffer(sl)) return sl.toString(encoding || 'utf8');
    if (encoding === 'hex') return TitanBuf.toHex(sl);
    return new TextDecoder(encoding || 'utf-8').decode(sl);
  },
  readUInt8(buf, offset)  { return buf[offset]; },
  writeUInt8(buf, val, offset) { buf[offset] = val & 0xFF; },
  readUInt16BE(buf, offset)  { return (buf[offset] << 8) | buf[offset+1]; },
  writeUInt16BE(buf, val, offset) { buf[offset]=(val>>>8)&0xFF; buf[offset+1]=val&0xFF; },
  readUInt32BE(buf, offset)  {
    return ((buf[offset]*0x1000000) + ((buf[offset+1]<<16)|(buf[offset+2]<<8)|buf[offset+3])) >>> 0;
  },
  writeUInt32BE(buf, val, offset) {
    buf[offset]=(val>>>24)&0xFF; buf[offset+1]=(val>>>16)&0xFF;
    buf[offset+2]=(val>>>8)&0xFF; buf[offset+3]=val&0xFF;
  },
  readInt8(buf, offset) { const v=buf[offset]; return v>=128?v-256:v; },
  writeInt8(buf, val, offset) { buf[offset]=val&0xFF; },
  readInt16BE(buf, offset) { const v=TitanBuf.readUInt16BE(buf,offset); return v>=32768?v-65536:v; },
  writeInt16BE(buf, val, offset) { TitanBuf.writeUInt16BE(buf, val&0xFFFF, offset); },
  readInt32BE(buf, offset) {
    return (buf[offset]<<24)|(buf[offset+1]<<16)|(buf[offset+2]<<8)|buf[offset+3];
  },
  writeInt32BE(buf, val, offset) {
    buf[offset]=(val>>>24)&0xFF; buf[offset+1]=(val>>>16)&0xFF;
    buf[offset+2]=(val>>>8)&0xFF; buf[offset+3]=val&0xFF;
  },
  readFloatBE(buf, offset) {
    const ab = new ArrayBuffer(4);
    const v  = new DataView(ab);
    v.setUint8(0,buf[offset]); v.setUint8(1,buf[offset+1]);
    v.setUint8(2,buf[offset+2]); v.setUint8(3,buf[offset+3]);
    return v.getFloat32(0, false);
  },
  writeFloatBE(buf, val, offset) {
    const ab=new ArrayBuffer(4); const v=new DataView(ab);
    v.setFloat32(0,val,false);
    buf[offset]=v.getUint8(0); buf[offset+1]=v.getUint8(1);
    buf[offset+2]=v.getUint8(2); buf[offset+3]=v.getUint8(3);
  },
  readFloat64BE(buf, offset) {
    const ab = new ArrayBuffer(8);
    const v  = new DataView(ab);
    for (let i = 0; i < 8; i++) v.setUint8(i, buf[offset + i]);
    return v.getFloat64(0, false);
  },
  writeFloat64BE(buf, val, offset) {
    const ab = new ArrayBuffer(8);
    const v  = new DataView(ab);
    v.setFloat64(0, val, false);
    for (let i = 0; i < 8; i++) buf[offset + i] = v.getUint8(i);
  },
  writeMsTimestamp(buf, ms, offset) {
    const hi=Math.floor(ms/0x100000000); const lo=ms>>>0;
    TitanBuf.writeUInt16BE(buf, hi&0xFFFF, offset);
    TitanBuf.writeUInt32BE(buf, lo, offset+2);
  },
  readMsTimestamp(buf, offset) {
    const hi=TitanBuf.readUInt16BE(buf,offset);
    const lo=TitanBuf.readUInt32BE(buf,offset+2);
    return hi*0x100000000+lo;
  },
  subarray(buf, start, end) {
    if (_isNode && Buffer.isBuffer(buf)) return buf.subarray(start,end);
    return buf.slice(start,end);
  },
  copy(src, dst, dstStart, srcStart, srcEnd) {
    if (_isNode && Buffer.isBuffer(src)) { src.copy(dst,dstStart,srcStart,srcEnd); return; }
    dst.set(src.slice(srcStart,srcEnd), dstStart);
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = TitanBuf;
if (typeof window !== 'undefined') window.TitanBuf = TitanBuf;
