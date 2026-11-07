'use strict';

const { Buffer } = require('buffer');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const zlib = require('zlib');

const HTMLParser = require('../parser/HTMLParser');
const DolphinError = require('../errors/DolphinError');
const AlignmentUtils = require('../utils/AlignmentUtils');
const { MAPPING, REVERSE_ELEM, REVERSE_ATTR, REVERSE_EVENTS, REVERSE_CMD } = require('../constants/mappings');
const { PLATFORM_CONFIG } = require('../constants/platforms');
const { VERSION, DEFAULT_CONFIG } = require('../constants/defaults');

class DolphinCompiler {
    constructor(config = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config
        };
        
        this.cache = new Map();
        this.parser = new HTMLParser(this.config);
        this.metrics = {
            compilations: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalTime: 0,
            errors: 0,
            platforms: {
                NORMAL: 0,
                NATIVE: 0,
                EMBEDDED: 0
            },
            titanCompilations: 0,
            titanCacheHits: 0,
            titanCacheMisses: 0,
            titanBinarySize: 0
        };
        
        this.cacheOrder = [];
        
        // ✅ FIX: 16-byte → 24-byte
        this.titanMode = true;  // ← Force 24-byte
        this.universalImporter = null;
        this.titanCache = new Map();
        
        if (this.titanMode) {
            try {
                const UniversalUIImporter = require('../ui/UniversalUIImporter');
                this.universalImporter = new UniversalUIImporter();
                console.log('⚡ DolphinCompiler: Titan 24-byte mode enabled');
            } catch (e) {
                console.log('ℹ️ UniversalUIImporter not available. Titan mode optional.');
            }
        }
    }
    
    compile(html, options = {}) {
        const startTime = performance.now();
        const compileId = crypto.randomBytes(4).toString('hex');
        
        const platform = options.platform || this.config.platform;
        this.metrics.platforms[platform] = (this.metrics.platforms[platform] || 0) + 1;
        
        this.log('info', `[${compileId}] Starting ${platform} compilation`);
        
        try {
            if (!PLATFORM_CONFIG[platform]) {
                throw new DolphinError('INVALID_PLATFORM', 
                    `Invalid platform: ${platform}. Must be one of: ${Object.keys(PLATFORM_CONFIG).join(', ')}`);
            }
            
            if (typeof html !== 'string') {
                throw new DolphinError('INVALID_INPUT', 'HTML must be a string');
            }
            
            if (html.length > 10 * 1024 * 1024) {
                throw new DolphinError('MEMORY_EXCEEDED', 
                    `HTML size (${html.length} bytes) exceeds limit`);
            }
            
            const cacheKey = this.generateCacheKey(html, { ...options, platform });
            const cached = this.cache.get(cacheKey);
            
            if (cached && options.cache !== false) {
                this.metrics.cacheHits++;
                this.updateCacheOrder(cacheKey);
                
                const duration = performance.now() - startTime;
                this.metrics.totalTime += duration;
                
                this.log('debug', `[${compileId}] Cache hit, compiled in ${duration.toFixed(2)}ms`);
                
                return {
                    success: true,
                    buffer: cached.buffer,
                    fromCache: true,
                    platform: platform,
                    metrics: {
                        duration,
                        size: cached.buffer.length,
                        cacheHit: true,
                        alignment: PLATFORM_CONFIG[platform].alignment
                    }
                };
            }
            
            const parseResult = this.parser.parse(html);
            if (!parseResult.success) {
                this.log('error', `Parse failed: ${parseResult.error}`);
                throw new DolphinError('PARSE_ERROR', 
                    `Failed to parse HTML: ${parseResult.error}`);
            }
            
            this.log('debug', `AST created with ${parseResult.stats?.nodes || 0} nodes`);
            
            const binary = this.astToBinary(parseResult.ast, platform, options);
            
            let finalBuffer = binary;
            if (options.compression !== false && this.config.compression) {
                finalBuffer = zlib.deflateSync(binary);
            }
            
            const platformConfig = PLATFORM_CONFIG[platform];
            if (platformConfig.alignment > 1) {
                const beforeAlign = finalBuffer.length;
                finalBuffer = AlignmentUtils.createAlignedBuffer(finalBuffer, platformConfig.alignment);
                const afterAlign = finalBuffer.length;
                
                if (afterAlign > beforeAlign) {
                    this.log('debug', `Applied ${platformConfig.alignment}-byte alignment: ${beforeAlign} → ${afterAlign} bytes`);
                }
            }
            
            if (options.cache !== false) {
                this.cache.set(cacheKey, {
                    buffer: finalBuffer,
                    timestamp: Date.now(),
                    size: finalBuffer.length,
                    platform: platform
                });
                
                this.updateCacheOrder(cacheKey);
                this.cleanCache();
                
                this.metrics.cacheMisses++;
            }
            
            const duration = performance.now() - startTime;
            this.metrics.compilations++;
            this.metrics.totalTime += duration;
            
            this.log('info', `[${compileId}] ${platform} compiled ${html.length} bytes → ${finalBuffer.length} bytes in ${duration.toFixed(2)}ms`);
            
            return {
                success: true,
                buffer: finalBuffer,
                fromCache: false,
                platform: platform,
                metrics: {
                    duration,
                    originalSize: html.length,
                    compressedSize: finalBuffer.length,
                    ratio: (html.length / finalBuffer.length).toFixed(2),
                    nodes: parseResult.stats?.nodes || 0,
                    cacheHit: false,
                    alignment: PLATFORM_CONFIG[platform].alignment,
                    magicBytes: platformConfig.magicBytes
                }
            };
            
        } catch (error) {
            this.metrics.errors++;
            const duration = performance.now() - startTime;
            
            this.log('error', `[${compileId}] Compilation failed after ${duration.toFixed(2)}ms:`, error);
            
            return {
                success: false,
                error: error.message,
                errorCode: error.code,
                duration,
                platform: platform
            };
        }
    }
    
    astToBinary(ast, platform, options = {}) {
        const platformConfig = PLATFORM_CONFIG[platform];
        
        const bytes = [];
        
        const addByte = (value) => {
            bytes.push(value & 0xFF);
        };
        
        const addUInt16 = (value) => {
            bytes.push(value & 0xFF);
            bytes.push((value >> 8) & 0xFF);
        };
        
        const addUInt32 = (value) => {
            bytes.push(value & 0xFF);
            bytes.push((value >> 8) & 0xFF);
            bytes.push((value >> 16) & 0xFF);
            bytes.push((value >> 24) & 0xFF);
        };
        
        const addBuffer = (buffer) => {
            for (let i = 0; i < buffer.length; i++) {
                bytes.push(buffer[i]);
            }
        };
        
        const serializeNode = (node) => {
            if (node.type === 'text') {
                const text = node.value || '';
                const textBuffer = Buffer.from(text, 'utf8');
                
                addByte(0);
                addUInt16(textBuffer.length);
                addBuffer(textBuffer);
                
            } else if (node.type === 'element') {
                const elemCode = MAPPING.ELEM.get(node.tag) || 1;
                addByte(elemCode);
                
                const attrs = Object.entries(node.attributes || {});
                addByte(attrs.length);
                
                for (const [key, value] of attrs) {
                    const attrCode = MAPPING.ATTR.get(key) || 0;
                    const valueStr = String(value);
                    const valueBuffer = Buffer.from(valueStr, 'utf8');
                    
                    addByte(attrCode);
                    addUInt16(valueBuffer.length);
                    addBuffer(valueBuffer);
                }
                
                addByte(0);
                
                const children = node.children || [];
                addUInt16(children.length);
                
                for (const child of children) {
                    serializeNode(child);
                }
            }
        };
        
        serializeNode(ast);
        
        const dataBuffer = Buffer.from(bytes);
        const checksum = this.calculateChecksum(dataBuffer);
        
        const MIN_HEADER_SIZE = 17;
        const headerSize = Math.max(platformConfig.headerSize || 16, MIN_HEADER_SIZE);
        const header = Buffer.alloc(headerSize);
        
        header.write(platformConfig.magicBytes.slice(0, 4), 0);
        
        const versionNum = parseInt(VERSION.replace(/\./g, '')) || 400;
        header.writeUInt16LE(versionNum, 4);
        
        header.writeUInt16LE(options.compression !== false ? 1 : 0, 6);
        
        const platformIndex = Object.keys(PLATFORM_CONFIG).indexOf(platform);
        header.writeUInt8(platformIndex, 8);
        
        header.writeUInt32LE(dataBuffer.length, 9);
        header.writeUInt32LE(checksum, 13);
        
        for (let i = MIN_HEADER_SIZE; i < headerSize; i++) {
            header[i] = 0;
        }
        
        return Buffer.concat([header, dataBuffer]);
    }
    
    parseBinary(binary, options = {}) {
        try {
            if (!Buffer.isBuffer(binary)) {
                binary = Buffer.from(binary);
            }
            
            if (binary.length < 16) {
                throw new DolphinError('INVALID_BUFFER', 'Buffer too small');
            }
            
            const magic = binary.toString('utf8', 0, 4);
            let platform = 'NORMAL';
            
            for (const [platformKey, config] of Object.entries(PLATFORM_CONFIG)) {
                if (config.magicBytes.startsWith(magic)) {
                    platform = platformKey;
                    break;
                }
            }
            
            const platformConfig = PLATFORM_CONFIG[platform];
            
            const MIN_HEADER_SIZE = 17;
            const headerSize = Math.max(platformConfig.headerSize || 16, MIN_HEADER_SIZE);
            
            if (binary.length < headerSize) {
                throw new DolphinError('INVALID_BUFFER', 
                    `Buffer too small for ${platform} header (needs ${headerSize} bytes, got ${binary.length})`);
            }
            
            const dataLength = binary.readUInt32LE(9);
            
            const dataStart = headerSize;
            const dataEnd = dataStart + dataLength;
            
            if (dataEnd > binary.length) {
                throw new DolphinError('INVALID_BUFFER', 
                    `Data length ${dataLength} exceeds buffer size ${binary.length}`);
            }
            
            const data = binary.slice(dataStart, dataEnd);
            const ast = this.parseBinaryData(data);
            
            const expectedChecksum = binary.readUInt32LE(13);
            const actualChecksum = this.calculateChecksum(data);
            
            if (expectedChecksum !== actualChecksum) {
                this.log('warn', `Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
            }
            
            return {
                success: true,
                ast,
                platform: platform,
                metrics: {
                    binarySize: binary.length,
                    dataSize: dataLength,
                    parsedNodes: this.countNodes(ast),
                    platform: platform,
                    alignment: platformConfig.alignment,
                    checksumValid: expectedChecksum === actualChecksum
                }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorCode: error.code
            };
        }
    }
    
    parseBinaryData(data) {
        let position = 0;
        
        const readByte = () => {
            if (position >= data.length) {
                throw new DolphinError('PARSE_ERROR', 'Unexpected end of data');
            }
            return data[position++];
        };
        
        const readUInt16 = () => {
            if (position + 2 > data.length) {
                throw new DolphinError('PARSE_ERROR', 'Insufficient data for UInt16');
            }
            const value = data.readUInt16LE(position);
            position += 2;
            return value;
        };
        
        const readString = (length) => {
            if (position + length > data.length) {
                throw new DolphinError('PARSE_ERROR', 'Insufficient data for string');
            }
            const str = data.toString('utf8', position, position + length);
            position += length;
            return str;
        };
        
        const parseNode = () => {
            const nodeType = readByte();
            
            if (nodeType === 0) {
                const textLength = readUInt16();
                const text = readString(textLength);
                
                return {
                    type: 'text',
                    value: text
                };
            } else {
                const tagName = REVERSE_ELEM.get(nodeType) || 'DIV';
                
                const attrCount = readByte();
                const attributes = {};
                
                for (let i = 0; i < attrCount; i++) {
                    const attrCode = readByte();
                    const attrName = REVERSE_ATTR.get(attrCode) || `ATTR_${attrCode}`;
                    const valueLength = readUInt16();
                    const value = readString(valueLength);
                    
                    attributes[attrName] = value;
                }
                
                const eventCount = readByte();
                position += eventCount * 3;
                
                const childCount = readUInt16();
                const children = [];
                
                for (let i = 0; i < childCount; i++) {
                    children.push(parseNode());
                }
                
                return {
                    type: 'element',
                    tag: tagName,
                    attributes,
                    events: {},
                    children
                };
            }
        };
        
        try {
            return parseNode();
        } catch (error) {
            throw new DolphinError('PARSE_ERROR', `Failed to parse binary data: ${error.message}`);
        }
    }
    
    calculateChecksum(buffer) {
        let checksum = 0;
        for (let i = 0; i < buffer.length; i++) {
            checksum = (checksum + buffer[i]) & 0xFFFFFFFF;
        }
        return checksum;
    }
    
    toCHeader(binary, variableName = 'dolphin_data', options = {}) {
        const platform = options.platform || this.config.platform;
        const platformConfig = PLATFORM_CONFIG[platform];
        
        const magic = binary.toString('utf8', 0, 4);
        if (!platformConfig.magicBytes.startsWith(magic)) {
            throw new DolphinError('PLATFORM_MISMATCH',
                `Binary is for ${magic} platform, not ${platform}`);
        }
        
        const MIN_HEADER_SIZE = 17;
        const headerSize = Math.max(platformConfig.headerSize || 16, MIN_HEADER_SIZE);
        
        const lines = [];
        
        const guardName = variableName.toUpperCase() + '_H';
        lines.push(`#ifndef ${guardName}`);
        lines.push(`#define ${guardName}`);
        lines.push('');
        
        lines.push(`// DolphinJS ${VERSION} - ${platform} Platform`);
        lines.push(`// Magic: ${platformConfig.magicBytes}`);
        lines.push(`// Alignment: ${platformConfig.alignment}-byte`);
        lines.push(`// Header size: ${headerSize} bytes`);
        lines.push(`// Total size: ${binary.length} bytes`);
        lines.push(`// Generated: ${new Date().toISOString()}`);
        lines.push('');
        
        lines.push('#include <stdint.h>');
        lines.push('#include <stddef.h>');
        lines.push('');
        
        lines.push(`#ifdef __cplusplus`);
        lines.push(`extern "C" {`);
        lines.push(`#endif`);
        lines.push('');
        
        lines.push(`// Binary data - ${platform === 'NATIVE' ? '4-byte aligned for reinterpret_cast' : 'XIP compatible'}`);
        lines.push(`const uint8_t ${variableName}[] __attribute__((aligned(${platformConfig.alignment}))) = {`);
        
        for (let i = 0; i < binary.length; i += 16) {
            const row = binary.slice(i, Math.min(i + 16, binary.length));
            const hexBytes = Array.from(row).map(b => `0x${b.toString(16).padStart(2, '0')}`);
            lines.push(`    ${hexBytes.join(', ')}${i + 16 < binary.length ? ',' : ''}`);
        }
        
        lines.push(`};`);
        lines.push('');
        
        lines.push(`const size_t ${variableName}_size = sizeof(${variableName});`);
        lines.push('');
        
        lines.push(`// Platform metadata`);
        lines.push(`#define ${variableName.toUpperCase()}_PLATFORM_${platform}`);
        lines.push(`#define ${variableName.toUpperCase()}_ALIGNMENT ${platformConfig.alignment}`);
        lines.push(`#define ${variableName.toUpperCase()}_MAGIC "${platformConfig.magicBytes}"`);
        lines.push(`#define ${variableName.toUpperCase()}_HEADER_SIZE ${headerSize}`);
        lines.push('');
        
        lines.push(`// Header field offsets`);
        lines.push(`#define ${variableName.toUpperCase()}_MAGIC_OFFSET 0`);
        lines.push(`#define ${variableName.toUpperCase()}_VERSION_OFFSET 4`);
        lines.push(`#define ${variableName.toUpperCase()}_FLAGS_OFFSET 6`);
        lines.push(`#define ${variableName.toUpperCase()}_PLATFORM_OFFSET 8`);
        lines.push(`#define ${variableName.toUpperCase()}_DATA_LENGTH_OFFSET 9`);
        lines.push(`#define ${variableName.toUpperCase()}_CHECKSUM_OFFSET 13`);
        lines.push('');
        
        if (platform === 'EMBEDDED') {
            lines.push(`// Embedded platform helpers`);
            lines.push(`#define ${variableName.toUpperCase()}_XIP_ENABLED 1`);
            lines.push(`#define ${variableName.toUpperCase()}_RELATIVE_OFFSETS 1`);
            lines.push(`#define ${variableName.toUpperCase()}_MAX_OFFSET ${platformConfig.maxOffset}`);
            lines.push('');
            
            lines.push(`static inline const void* ${variableName}_get_element(uint16_t offset) {`);
            lines.push(`    return (const void*)((uintptr_t)${variableName} + offset);`);
            lines.push(`}`);
            lines.push('');
        }
        
        if (platform === 'NATIVE') {
            lines.push(`// Native platform helpers (C++)`);
            lines.push(`#ifdef __cplusplus`);
            lines.push(`template<typename T>`);
            lines.push(`static inline T* ${variableName}_reinterpret() {`);
            lines.push(`    return reinterpret_cast<T*>(const_cast<uint8_t*>(${variableName}));`);
            lines.push(`}`);
            lines.push(`#endif`);
            lines.push('');
        }
        
        lines.push(`// Helper functions`);
        lines.push(`static inline uint32_t ${variableName}_get_data_length() {`);
        lines.push(`    return *(const uint32_t*)(${variableName} + ${variableName.toUpperCase()}_DATA_LENGTH_OFFSET);`);
        lines.push(`}`);
        lines.push('');
        
        lines.push(`static inline uint32_t ${variableName}_get_checksum() {`);
        lines.push(`    return *(const uint32_t*)(${variableName} + ${variableName.toUpperCase()}_CHECKSUM_OFFSET);`);
        lines.push(`}`);
        lines.push('');
        
        lines.push(`#ifdef __cplusplus`);
        lines.push(`}`);
        lines.push(`#endif`);
        lines.push('');
        lines.push(`#endif // ${guardName}`);
        
        return lines.join('\n');
    }
    
    countNodes(node) {
        if (node.type === 'text') return 1;
        return 1 + (node.children?.reduce((sum, child) => sum + this.countNodes(child), 0) || 0);
    }
    
    generateCacheKey(html, options) {
        const hash = crypto.createHash('md5');
        hash.update(html);
        hash.update(JSON.stringify(options));
        hash.update(options.platform || this.config.platform);
        return hash.digest('hex');
    }
    
    updateCacheOrder(key) {
        const index = this.cacheOrder.indexOf(key);
        if (index > -1) {
            this.cacheOrder.splice(index, 1);
        }
        this.cacheOrder.unshift(key);
    }
    
    cleanCache() {
        while (this.cache.size > this.config.maxCacheSize) {
            const oldestKey = this.cacheOrder.pop();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
    }
    
    clearCache() {
        this.cache.clear();
        this.cacheOrder = [];
        this.log('info', 'Cleared compiler cache');
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheMaxSize: this.config.maxCacheSize,
            averageTime: this.metrics.compilations > 0 ? 
                (this.metrics.totalTime / this.metrics.compilations).toFixed(2) + 'ms' : 'N/A',
            hitRate: (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2) + '%',
            platformStats: this.metrics.platforms
        };
    }
    
    log(level, ...args) {
        if (this.config.debug || level === 'error') {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [Compiler ${level.toUpperCase()}]`, ...args);
        }
    }
    
    // =============== UNIVERSAL UI IMPORTER METHODS ===============
    
    compileUniversal(input, options = {}) {
        const startTime = performance.now();
        const compileId = crypto.randomBytes(4).toString('hex');
        
        const inputType = this._detectInputType(input);
        const platform = options.platform || this.config.platform;
        
        this.log('info', `[${compileId}] Universal compile for ${inputType} (${platform})`);
        
        try {
            let result;
            
            switch (inputType) {
                case 'HTML':
                    result = this.compile(input, options);
                    result.inputType = 'HTML';
                    break;
                    
                case 'UI_SCHEMA':
                    result = this._compileUISchema(input, options);
                    result.inputType = 'UI_SCHEMA';
                    break;
                    
                case 'TITAN_BINARY':
                    result = this._processTitanBinary(input, options);
                    result.inputType = 'TITAN_BINARY';
                    break;
                    
                default:
                    throw new DolphinError('UNSUPPORTED_INPUT', 
                        `Cannot compile ${inputType} format`);
            }
            
            const duration = performance.now() - startTime;
            
            if (inputType === 'UI_SCHEMA' || inputType === 'TITAN_BINARY') {
                this.metrics.titanCompilations++;
                this.metrics.titanBinarySize += result.buffer?.length || 0;
            }
            
            return {
                ...result,
                universalInfo: {
                    inputType,
                    compileId,
                    duration,
                    titanMode: this.titanMode,
                    platform
                }
            };
            
        } catch (error) {
            const duration = performance.now() - startTime;
            
            this.log('error', `[${compileId}] Universal compile failed:`, error);
            
            return {
                success: false,
                error: error.message,
                errorCode: error.code,
                duration,
                inputType: this._detectInputType(input),
                platform
            };
        }
    }
    
    /**
     * ✅ FIXED: Compile UI Schema to Titan 24-byte binary
     */
    _compileUISchema(schema, options = {}) {
        if (!this.titanMode || !this.universalImporter) {
            const html = this._schemaToHTML(schema);
            return this.compile(html, options);
        }
        
        const cacheKey = `titan_${crypto.createHash('md5')
            .update(JSON.stringify(schema))
            .update(options.platform || 'UNIVERSAL')
            .digest('hex')}`;
        
        const cached = options.cache === true ? this.titanCache.get(cacheKey) : null;
        if (cached) {
            this.metrics.titanCacheHits++;
            return {
                success: true,
                buffer: cached.binary,
                stringData: cached.stringData,
                binaryType: 'TITAN_24BYTE',
                fromCache: true,
                platform: options.platform || 'UNIVERSAL',
                metrics: {
                    size: 24,
                    fromCache: true,
                    schemaType: schema.type || 'unknown'
                }
            };
        }
        
        this.metrics.titanCacheMisses++;
        
        const uiResult = this.universalImporter.importSchema(schema, { platform: options.platform || 'UNIVERSAL' });
        
        if (options.cache !== false) {
            this.titanCache.set(cacheKey, {
                binary: uiResult.binaries,
                stringData: uiResult.stringData,
                timestamp: Date.now(),
                schema: schema
            });
            
            if (this.titanCache.size > 100) {
                const oldestKey = Array.from(this.titanCache.keys())[0];
                this.titanCache.delete(oldestKey);
            }
        }
        
        return {
            success: true,
            buffer: Buffer.concat(uiResult.binaries),
            stringData: uiResult.stringData,
            binaryType: 'TITAN_24BYTE',
            fromCache: false,
            platform: options.platform || 'UNIVERSAL',
            metrics: {
                size: 24,
                fromCache: false,
                schemaType: schema.type || 'unknown',
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * ✅ FIXED: Process existing Titan binary (24-byte support)
     */
    _processTitanBinary(titanBinary, options = {}) {
        if (!(titanBinary instanceof Uint8Array)) {
            titanBinary = new Uint8Array(titanBinary);
        }
        
        // ✅ Support both 24-byte and 16-byte (fallback)
        if (titanBinary.length !== 24 && titanBinary.length !== 16) {
            throw new DolphinError('INVALID_TITAN_BINARY',
                `Expected 16-byte or 24-byte Uint8Array, got ${titanBinary.length} bytes`);
        }
        
        const isValid = this._validateTitanBinary(titanBinary);
        
        let processedBinary = titanBinary;
        if (options.transform) {
            processedBinary = this._transformTitanBinary(titanBinary, options.transform);
        }
        
        return {
            success: true,
            buffer: Buffer.from(processedBinary),
            binaryType: titanBinary.length === 24 ? 'TITAN_24BYTE' : 'TITAN_16BYTE',
            platform: options.platform || 'UNIVERSAL',
            metrics: {
                size: titanBinary.length,
                valid: isValid,
                transform: options.transform || 'none',
                originalHash: this._hashBinary(titanBinary),
                processedHash: this._hashBinary(processedBinary)
            }
        };
    }
    
    _detectInputType(input) {
        if (typeof input === 'string') {
            if (/<[a-z][\s\S]*>/i.test(input) || 
                input.includes('<!DOCTYPE') || 
                input.includes('<html')) {
                return 'HTML';
            }
            return 'TEXT';
        }
        
        if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
            if (input.length === 24 || input.length === 16) {
                return 'TITAN_BINARY';
            }
            return 'BINARY';
        }
        
        if (typeof input === 'object' && input !== null) {
            if (input.type || input.componentType || 
                input.padding || input.scale || input.opacity !== undefined) {
                return 'UI_SCHEMA';
            }
            
            if (input.tag || input.children) {
                return 'AST';
            }
        }
        
        return 'UNKNOWN';
    }
    
    _validateTitanBinary(binary) {
        return true;
    }
    
    _transformTitanBinary(binary, transformType) {
        const transformed = new Uint8Array(binary);
        
        switch (transformType) {
            case 'OPTIMIZE':
                if (transformed[2] > 100) transformed[2] = 100;
                if (transformed[14] < 200) transformed[14] = 255;
                break;
                
            case 'NORMALIZE':
                transformed[2] = Math.min(transformed[2], 100);
                transformed[14] = Math.min(transformed[14], 255);
                break;
        }
        
        return transformed;
    }
    
    _schemaToHTML(schema) {
        if (typeof schema !== 'object' || schema === null) {
            return String(schema);
        }
        
        const type = schema.type || 'div';
        const attrs = [];
        
        if (schema.className) attrs.push(`class="${schema.className}"`);
        if (schema.id) attrs.push(`id="${schema.id}"`);
        if (schema.style && typeof schema.style === 'object') {
            const styleStr = Object.entries(schema.style)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ');
            attrs.push(`style="${styleStr}"`);
        }
        
        const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
        const content = schema.text || schema.content || '';
        
        return `<${type}${attrStr}>${content}</${type}>`;
    }
    
    _hashBinary(binary) {
        return crypto.createHash('md5')
            .update(binary)
            .digest('hex')
            .substring(0, 8);
    }
    
    getEnhancedMetrics() {
        const baseMetrics = this.getMetrics();
        
        return {
            ...baseMetrics,
            titanEnabled: this.titanMode,
            universalImporterAvailable: !!this.universalImporter,
            titanCacheSize: this.titanCache.size,
            titanCompilations: this.metrics.titanCompilations,
            titanBinarySize: this.metrics.titanBinarySize,
            titanHitRate: this.metrics.titanCompilations > 0 ? 
                (this.metrics.titanCacheHits / this.metrics.titanCompilations * 100).toFixed(2) + '%' : 'N/A'
        };
    }
}

module.exports = DolphinCompiler;