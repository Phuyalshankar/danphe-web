'use strict';

/**
 * TitanDataStore v2.0.0 — Universal Binary NoSQL (Browser + Node.js)
 * • No Buffer / No process.env — works in browser Uint8Array natively
 * • Full schema restoration from dump (fixes persistence reload bug)
 * • O(1) duplicate prevention, tombstone soft-delete, CRC8 integrity
 */

const TB = require('./TitanBuf');

const MAGIC_TD        = 0x5444;
const CURRENT_VERSION = 0x01;
const FLAG_DELETED    = 0x01;
const TYPE_NULL         = 0x00;
const TYPE_BOOL_FALSE   = 0x01;
const TYPE_BOOL_TRUE    = 0x02;
const TYPE_INT8         = 0x03;
const TYPE_INT16        = 0x04;
const TYPE_INT32        = 0x05;
const TYPE_FLOAT32      = 0x06;
const TYPE_STRING       = 0x07;
const TYPE_TIMESTAMP_S  = 0x08;
const TYPE_TIMESTAMP_MS = 0x09;
const TYPE_BYTES        = 0x0A;
const TYPE_JSON         = 0x0B;
const TYPE_FLOAT64      = 0x0C;

class TitanDataStore {
  constructor(options = {}) {
    this.bus         = options.bus     || null;
    this.schemas     = new Map();
    this.records     = new Map();
    this.indexes     = new Map();
    this.nextAddress = options.baseAddress || 2001;
    this.storageKey  = options.storageKey  || 'TITAN_DATA_STORE';
    this.storage     = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.persist     = Boolean(options.persist);
    if (this.persist && this.storage) this.loadFromStorage();
  }

  registerSchema(schema) {
    if (!schema.name) throw new Error('Schema must have a name');
    const tagToKey = new Map(), keyToTag = new Map(), fieldTypes = new Map();
    if (schema.fields) {
      for (const [tagStr, fieldDef] of Object.entries(schema.fields)) {
        const tag  = Number(tagStr);
        const key  = typeof fieldDef === 'string' ? fieldDef : (fieldDef.key || fieldDef.name);
        const type = typeof fieldDef === 'object'  ? (fieldDef.type || 'string') : 'string';
        tagToKey.set(tag, key); keyToTag.set(key, tag); fieldTypes.set(key, type);
      }
    }
    const compiled = { ...schema, tagToKey, keyToTag, fieldTypes, indexes: schema.indexes || {} };
    this.schemas.set(schema.name, compiled);
    if (schema.address) this.schemas.set(String(schema.address), compiled);
    return compiled;
  }

  pack(schemaOrName, data, flags = 0) {
    const schema = this._resolveSchema(schemaOrName);
    if (!schema) throw new Error(`Schema not found: ${schemaOrName}`);
    const chunks = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) continue;
      const tag = schema.keyToTag.get(key);
      if (tag === undefined) continue;
      chunks.push(this._encodeField(tag, value, schema.fieldTypes.get(key)));
    }
    const payload = TB.concat(chunks);
    const header  = TB.alloc(7);
    TB.writeUInt16BE(header, MAGIC_TD, 0);
    TB.writeUInt8(header, CURRENT_VERSION, 2);
    TB.writeUInt8(header, flags, 3);
    TB.writeUInt16BE(header, payload.length, 4);
    const withoutCrc = TB.concat([TB.subarray(header, 0, 6), payload]);
    TB.writeUInt8(header, TitanDataStore.crc8(withoutCrc), 6);
    return TB.concat([header, payload]);
  }

  unpack(schemaOrName, buf) {
    if (!buf || buf.length < 7) throw new Error('Buffer too small');
    const magic = TB.readUInt16BE(buf, 0);
    if (magic !== MAGIC_TD) throw new Error(`Invalid Magic: 0x${magic.toString(16)}`);
    const version = TB.readUInt8(buf, 2);
    const flags   = TB.readUInt8(buf, 3);
    const pLen    = TB.readUInt16BE(buf, 4);
    const csum    = TB.readUInt8(buf, 6);
    const checkBuf = TB.concat([TB.subarray(buf, 0, 6), TB.subarray(buf, 7, 7 + pLen)]);
    const calc     = TitanDataStore.crc8(checkBuf);
    if (csum !== calc) throw new Error(`CRC8 Mismatch: 0x${calc.toString(16)} vs 0x${csum.toString(16)}`);
    if (flags & FLAG_DELETED) return { _deleted: true, _flags: flags };
    const schema = this._resolveSchema(schemaOrName);
    if (!schema) throw new Error(`Schema not found: ${schemaOrName}`);
    const result = { _flags: flags, _version: version };
    let offset = 7; const end = 7 + pLen;
    while (offset < end) {
      const tag = TB.readUInt8(buf, offset++); const type = TB.readUInt8(buf, offset++);
      const dec = this._decodeField(buf, offset, type); offset = dec.nextOffset;
      result[schema.tagToKey.get(tag) || `field_${tag}`] = dec.value;
    }
    return result;
  }

  insert(schemaOrName, data, customAddress = null) {
    let schema = this._resolveSchema(schemaOrName);
    if (!schema && typeof schemaOrName === 'object' && schemaOrName.name)
      schema = this.registerSchema(schemaOrName);
    if (!schema) throw new Error(`Schema not found: ${schemaOrName}`);
    if (schema.indexes) {
      for (const [field, rule] of Object.entries(schema.indexes)) {
        if (rule.unique && data[field] !== undefined) {
          const ik = `${schema.name}:${field}:${String(data[field]).trim().toLowerCase()}`;
          if (this.indexes.has(ik)) return { success:false, error:'DUPLICATE_KEY', field, value:data[field], existingDocument:this.indexes.get(ik) };
        }
      }
    }
    const address = customAddress !== null ? customAddress : this.nextAddress++;
    const buf = this.pack(schema, data);
    this.records.set(address, { address, schema: schema.name, buffer: buf, data: { ...data } });
    if (schema.indexes) {
      for (const [field, rule] of Object.entries(schema.indexes)) {
        if (rule.unique && data[field] !== undefined)
          this.indexes.set(`${schema.name}:${field}:${String(data[field]).trim().toLowerCase()}`, address);
      }
    }
    if (this.bus) this.bus.emit(address, buf, 'TITAN_DATA_STORE_WRITE');
    if (this.persist && this.storage) this.saveToStorage();
    return { success: true, address, sizeBytes: buf.length };
  }

  get(addressOrSubKey, subField = null) {
    let address = addressOrSubKey, field = subField;
    if (typeof addressOrSubKey === 'string' && addressOrSubKey.includes(':')) {
      const parts = addressOrSubKey.split(':'); address = Number(parts[0]); field = parts[1];
    }
    const rec = this.records.get(Number(address)); if (!rec) return null;
    const schema  = this.schemas.get(rec.schema);
    const decoded = schema ? this.unpack(schema, rec.buffer) : rec.data;
    if (decoded._deleted) return null;
    if (field) return decoded[field] !== undefined ? decoded[field] : null;
    return decoded;
  }

  getAll(schemaName) {
    const results = [];
    for (const [addr, rec] of this.records.entries()) {
      if (rec.schema !== schemaName) continue;
      const schema  = this.schemas.get(rec.schema);
      const decoded = schema ? this.unpack(schema, rec.buffer) : rec.data;
      if (!decoded._deleted) results.push({ address: addr, ...decoded });
    }
    return results;
  }

  update(address, partialData) {
    const rec = this.records.get(Number(address));
    if (!rec) return { success:false, error:'DOCUMENT_NOT_FOUND', address };
    const schema     = this.schemas.get(rec.schema);
    const oldDecoded = this.unpack(schema, rec.buffer);
    if (oldDecoded._deleted) return { success:false, error:'DOCUMENT_DELETED', address };
    if (schema.indexes) {
      for (const [field, rule] of Object.entries(schema.indexes)) {
        if (rule.unique && partialData[field] !== undefined) {
          const nv = String(partialData[field]).trim().toLowerCase();
          const ov = String(oldDecoded[field]||'').trim().toLowerCase();
          if (nv !== ov) {
            const ik = `${schema.name}:${field}:${nv}`;
            if (this.indexes.has(ik) && this.indexes.get(ik) !== address)
              return { success:false, error:'DUPLICATE_KEY', field, value:partialData[field], existingDocument:this.indexes.get(ik) };
          }
        }
      }
    }
    if (schema.indexes) {
      for (const [field, rule] of Object.entries(schema.indexes)) {
        if (rule.unique && partialData[field] !== undefined) {
          const ov = String(oldDecoded[field]||'').trim().toLowerCase();
          const nv = String(partialData[field]).trim().toLowerCase();
          if (ov) this.indexes.delete(`${schema.name}:${field}:${ov}`);
          this.indexes.set(`${schema.name}:${field}:${nv}`, address);
        }
      }
    }
    const updatedData = { ...oldDecoded, ...partialData };
    delete updatedData._flags; delete updatedData._version;
    const newBuf = this.pack(schema, updatedData);
    rec.buffer = newBuf; rec.data = updatedData;
    if (this.bus) this.bus.emit(address, newBuf, 'TITAN_DATA_STORE_UPDATE');
    if (this.persist && this.storage) this.saveToStorage();
    return { success:true, address, sizeBytes: newBuf.length };
  }

  delete(address) {
    const rec = this.records.get(Number(address)); if (!rec) return false;
    const schema     = this.schemas.get(rec.schema);
    const oldDecoded = this.unpack(schema, rec.buffer);
    if (schema && schema.indexes) {
      for (const [field, rule] of Object.entries(schema.indexes)) {
        if (rule.unique && oldDecoded[field] !== undefined)
          this.indexes.delete(`${schema.name}:${field}:${String(oldDecoded[field]).trim().toLowerCase()}`);
      }
    }
    rec.buffer[3] |= FLAG_DELETED;
    const pLen = TB.readUInt16BE(rec.buffer, 4);
    const cb   = TB.concat([TB.subarray(rec.buffer,0,6), TB.subarray(rec.buffer,7,7+pLen)]);
    TB.writeUInt8(rec.buffer, TitanDataStore.crc8(cb), 6);
    if (this.bus) this.bus.emit(address, rec.buffer, 'TITAN_DATA_STORE_DELETE');
    if (this.persist && this.storage) this.saveToStorage();
    return true;
  }

  calculateSpaceSavings(schemaOrName, data) {
    const packed   = this.pack(schemaOrName, data);
    const jsonStr  = JSON.stringify(data);
    const jsonBytes = typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(jsonStr).length
      : Buffer.byteLength(jsonStr, 'utf8');
    const binBytes = packed.length;
    const saved = jsonBytes - binBytes;
    return { jsonBytes, binaryBytes: binBytes, savedBytes: saved, percentSaved: `${((saved/jsonBytes)*100).toFixed(1)}%` };
  }

  // ── Storage Persistence ──────────────────────────────────────────────────

  saveToStorage() {
    if (!this.storage) return false;
    try { this.storage.setItem(this.storageKey, JSON.stringify(this.exportDump())); return true; }
    catch (err) { console.warn('[TitanDataStore] persist failed:', err); return false; }
  }
  loadFromStorage() {
    if (!this.storage) return false;
    try { const raw = this.storage.getItem(this.storageKey); if (!raw) return false; return this.importDump(JSON.parse(raw)); }
    catch (err) { console.warn('[TitanDataStore] load failed:', err); return false; }
  }
  clearStorage() {
    if (this.storage) { try { this.storage.removeItem(this.storageKey); } catch(e){} }
    this.records.clear(); this.indexes.clear(); return true;
  }

  exportDump() {
    const schemas = [];
    const seen = new Set();
    for (const [, s] of this.schemas.entries()) {
      if (!seen.has(s.name)) {
        seen.add(s.name);
        const fields = {};
        if (s.tagToKey) {
          for (const [tag, key] of s.tagToKey.entries()) {
            fields[tag] = { key, type: (s.fieldTypes ? s.fieldTypes.get(key) : null) || 'string' };
          }
        }
        schemas.push({ name: s.name, fields, indexes: s.indexes || {} });
      }
    }
    const records = [];
    for (const [address, rec] of this.records.entries())
      records.push({ address, schema: rec.schema, hex: TB.toHex(rec.buffer) });
    return { version: CURRENT_VERSION, nextAddress: this.nextAddress, schemas, records, timestamp: Date.now() };
  }

  importDump(dump) {
    if (!dump || !Array.isArray(dump.records)) return 0;
    if (Array.isArray(dump.schemas)) {
      for (const s of dump.schemas) { if (!this.schemas.has(s.name)) this.registerSchema(s); }
    }
    if (dump.nextAddress) this.nextAddress = Math.max(this.nextAddress, dump.nextAddress);
    let count = 0;
    for (const rec of dump.records) {
      if (!rec || !rec.hex) continue;
      const buf    = TB.from(rec.hex, 'hex');
      const schema = this.schemas.get(rec.schema);
      let decoded  = {};
      if (schema) { try { decoded = this.unpack(schema, buf); } catch(e) { decoded = { _corrupted: true }; } }
      this.records.set(rec.address, { address: rec.address, schema: rec.schema, buffer: buf, data: decoded });
      if (schema && schema.indexes && !decoded._deleted) {
        for (const [field, rule] of Object.entries(schema.indexes)) {
          if (rule.unique && decoded[field] !== undefined)
            this.indexes.set(`${schema.name}:${field}:${String(decoded[field]).trim().toLowerCase()}`, rec.address);
        }
      }
      count++;
    }
    return count;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _resolveSchema(s) {
    if (!s) return null;
    if (typeof s === 'string') return this.schemas.get(s) || null;
    if (s.tagToKey) return s;
    if (s.name && this.schemas.has(s.name)) return this.schemas.get(s.name);
    if (typeof s === 'object' && s.name && s.fields) return this.registerSchema(s);
    if (s.name) return this.schemas.get(s.name) || null;
    return null;
  }

  _encodeField(tag, value, explicitType) {
    const tagBuf = TB.from([tag]);
    if (value === null || value === undefined) return TB.concat([tagBuf, TB.from([TYPE_NULL])]);
    if (typeof value === 'boolean') return TB.concat([tagBuf, TB.from([value ? TYPE_BOOL_TRUE : TYPE_BOOL_FALSE])]);
    if (value instanceof Date || explicitType === 'timestamp' || explicitType === 'datetime' || explicitType === 'timestamp_ms') {
      const ms = value instanceof Date ? value.getTime() : Number(value);
      if (explicitType === 'timestamp_ms') {
        const b = TB.alloc(6); TB.writeMsTimestamp(b, ms, 0);
        return TB.concat([tagBuf, TB.from([TYPE_TIMESTAMP_MS]), b]);
      } else {
        const sec = Math.floor(ms / 1000); const b = TB.alloc(4); TB.writeUInt32BE(b, sec, 0);
        return TB.concat([tagBuf, TB.from([TYPE_TIMESTAMP_S]), b]);
      }
    }
    if (typeof value === 'number') {
      if (explicitType === 'float64' || explicitType === 'double') {
        const b = TB.alloc(8); TB.writeFloat64BE(b, value, 0); return TB.concat([tagBuf, TB.from([TYPE_FLOAT64]), b]);
      } else if (explicitType === 'float32' || (!Number.isInteger(value) && explicitType !== 'int32')) {
        const b = TB.alloc(4); TB.writeFloatBE(b, value, 0); return TB.concat([tagBuf, TB.from([TYPE_FLOAT32]), b]);
      } else if (value >= -128 && value <= 127 && explicitType === 'int8') {
        const b = TB.alloc(1); TB.writeInt8(b, value, 0); return TB.concat([tagBuf, TB.from([TYPE_INT8]), b]);
      } else if (value >= -32768 && value <= 32767 && (explicitType === 'int16' || !explicitType)) {
        const b = TB.alloc(2); TB.writeInt16BE(b, value, 0); return TB.concat([tagBuf, TB.from([TYPE_INT16]), b]);
      } else {
        const b = TB.alloc(4); TB.writeInt32BE(b, value, 0); return TB.concat([tagBuf, TB.from([TYPE_INT32]), b]);
      }
    }
    if (typeof value === 'string') {
      const sb = TB.from(value, 'utf8');
      // Limit to 255 UTF-8 bytes (clamp at byte boundary, not char boundary)
      const len = Math.min(sb.length, 255);
      return TB.concat([tagBuf, TB.from([TYPE_STRING]), TB.from([len]), TB.subarray(sb, 0, len)]);
    }
    if (TB.isBuffer(value)) {
      const lb = TB.alloc(2); TB.writeUInt16BE(lb, value.length, 0);
      return TB.concat([tagBuf, TB.from([TYPE_BYTES]), lb, value]);
    }
    const jb = TB.from(JSON.stringify(value), 'utf8'); const lb2 = TB.alloc(2); TB.writeUInt16BE(lb2, jb.length, 0);
    return TB.concat([tagBuf, TB.from([TYPE_JSON]), lb2, jb]);
  }

  _decodeField(buf, offset, type) {
    switch (type) {
      case TYPE_NULL:       return { value: null,  nextOffset: offset };
      case TYPE_BOOL_FALSE: return { value: false, nextOffset: offset };
      case TYPE_BOOL_TRUE:  return { value: true,  nextOffset: offset };
      case TYPE_INT8:    return { value: TB.readInt8(buf,offset),    nextOffset: offset+1 };
      case TYPE_INT16:   return { value: TB.readInt16BE(buf,offset), nextOffset: offset+2 };
      case TYPE_INT32:   return { value: TB.readInt32BE(buf,offset), nextOffset: offset+4 };
      case TYPE_FLOAT32: return { value: TB.readFloatBE(buf,offset), nextOffset: offset+4 };
      case TYPE_FLOAT64: return { value: TB.readFloat64BE(buf,offset), nextOffset: offset+8 };
      case TYPE_STRING: { const len=TB.readUInt8(buf,offset); return { value:TB.toString(buf,'utf8',offset+1,offset+1+len), nextOffset:offset+1+len }; }
      case TYPE_TIMESTAMP_S: { const sec=TB.readUInt32BE(buf,offset); return { value:new Date(sec*1000), nextOffset:offset+4 }; }
      case TYPE_TIMESTAMP_MS: { const ms=TB.readMsTimestamp(buf,offset); return { value:new Date(ms), nextOffset:offset+6 }; }
      case TYPE_BYTES: { const len=TB.readUInt16BE(buf,offset); return { value:TB.subarray(buf,offset+2,offset+2+len), nextOffset:offset+2+len }; }
      case TYPE_JSON: { const len=TB.readUInt16BE(buf,offset); return { value:JSON.parse(TB.toString(buf,'utf8',offset+2,offset+2+len)), nextOffset:offset+2+len }; }
      default: return { value:null, nextOffset:offset };
    }
  }

  static crc8(buf) {
    let crc = 0;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) : (crc << 1);
      crc &= 0xFF;
    }
    return crc;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = TitanDataStore;
if (typeof window !== 'undefined') window.TitanDataStore = TitanDataStore;
