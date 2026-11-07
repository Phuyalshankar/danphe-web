'use strict';

const TBC_PROTO = require('../protocol/TBC_PROTO');

class TitanMainEngine {
    constructor(config = {}) {
        // Optimized config with defaults
        this.config = Object.assign({
            renderMode: 'BINARY_STREAM',
            maxFPS: 60,
            enableCache: true,
            batchSize: 100,
            memoryLimit: 100 * 1024 * 1024, // 100MB
            throttleRender: true,
            debug: false
        }, config);
        
        // Optimized data structures
        this.binaryCache = new Map();
        this.renderCallbacks = new Map();
        this.frameQueue = [];
        this.stats = this._initStats();
        
        // Performance tracking
        this.performance = {
            framesRendered: 0,
            lastRenderTime: 0,
            renderTimes: new Float32Array(1000), // Fixed size array
            timeIndex: 0
        };
        
        // Memory management
        this.memory = {
            totalUsed: 0,
            lastCleanup: Date.now(),
            cleanupInterval: 30000 // 30 seconds
        };
        
        if (this.config.debug) {
            console.log("🚀 Titan Render Engine Core (Optimized)...");
            console.log(`🎯 Mode: ${this.config.renderMode}, FPS: ${this.config.maxFPS}`);
        }
    }
    
    /**
     * OPTIMIZED: Direct render 16-byte binary packet
     */
    directRender(bin, asset = null, text = null) {
        // Fast validation
        if (!bin || bin.length !== 16) {
            return { 
                success: false, 
                error: `Invalid binary: expected 16 bytes, got ${bin?.length || 0}` 
            };
        }
        
        const startTime = performance.now();
        
        // Fast frame data extraction
        const frameData = this._extractFrameDataFast(bin, asset, text);
        const frameId = this._generateFrameId();
        
        // Cache management
        if (this.config.enableCache) {
            this._cacheFrame(frameId, bin, frameData);
        }
        
        // Execute rendering
        const renderResult = this._executeRenderFast(frameData);
        
        // Update performance metrics (fast)
        const renderTime = performance.now() - startTime;
        this._updatePerformanceFast(renderTime);
        
        // Callbacks (async, non-blocking)
        if (this.renderCallbacks.has('frameRendered')) {
            setImmediate(() => {
                this._notifyRenderCallbacks('frameRendered', {
                    frameId,
                    renderTime,
                    frameData: this._compressFrameData(frameData)
                });
            });
        }
        
        if (this.config.debug && this.performance.framesRendered % 100 === 0) {
            console.log(`🚀 RENDERED ${this.performance.framesRendered}: ${renderTime.toFixed(1)}ms`);
        }
        
        return {
            success: true,
            frameId,
            renderTime,
            frameData: renderResult
        };
    }
    
    /**
     * OPTIMIZED: Batch render with better memory management
     */
    batchRender(binaries, options = {}) {
        const startTime = performance.now();
        const batchId = `batch_${Date.now()}`;
        const batchSize = options.batchSize || this.config.batchSize;
        const results = new Array(binaries.length);
        let completed = 0;
        
        if (this.config.debug) {
            console.log(`📦 Batch render: ${binaries.length} frames`);
        }
        
        // Process in batches to avoid memory spikes
        const processBatch = async (startIdx) => {
            const endIdx = Math.min(startIdx + batchSize, binaries.length);
            
            for (let i = startIdx; i < endIdx; i++) {
                try {
                    const result = this.directRender(
                        binaries[i].bin || binaries[i],
                        binaries[i].asset,
                        binaries[i].text
                    );
                    
                    results[i] = {
                        index: i,
                        success: true,
                        frameId: result.frameId,
                        renderTime: result.renderTime
                    };
                } catch (error) {
                    results[i] = {
                        index: i,
                        success: false,
                        error: error.message
                    };
                }
                completed++;
            }
        };
        
        // Execute batches
        const batchPromises = [];
        for (let i = 0; i < binaries.length; i += batchSize) {
            batchPromises.push(processBatch(i));
        }
        
        return Promise.all(batchPromises).then(() => {
            const totalTime = performance.now() - startTime;
            const successful = results.filter(r => r && r.success).length;
            
            return {
                batchId,
                totalTime,
                results,
                stats: {
                    total: binaries.length,
                    success: successful,
                    failed: binaries.length - successful,
                    averageTime: totalTime / binaries.length
                }
            };
        });
    }
    
    /**
     * OPTIMIZED: Stream rendering with backpressure
     */
    async streamRender(binaryStream, options = {}) {
        if (this.isRendering) {
            if (this.frameQueue.length < 1000) { // Queue limit
                this.frameQueue.push({ binaryStream, options });
                return { streaming: false, queued: true, queueSize: this.frameQueue.length };
            }
            return { streaming: false, error: 'Queue full' };
        }
        
        this.isRendering = true;
        const streamId = `stream_${Date.now()}`;
        let frameCount = 0;
        const maxFPS = options.throttleFPS || this.config.maxFPS;
        const frameInterval = 1000 / maxFPS;
        
        if (this.config.debug) {
            console.log(`📡 Stream ${streamId} started (${maxFPS} FPS)`);
        }
        
        try {
            for await (const binary of binaryStream) {
                if (!this.isRendering) break;
                
                const frameStart = performance.now();
                
                try {
                    this.directRender(binary);
                    frameCount++;
                } catch (error) {
                    // Silent error in stream
                }
                
                // Throttle to target FPS
                const frameTime = performance.now() - frameStart;
                const sleepTime = Math.max(0, frameInterval - frameTime);
                
                if (sleepTime > 0 && this.config.throttleRender) {
                    await new Promise(resolve => setTimeout(resolve, sleepTime));
                }
                
                // Memory cleanup check
                if (frameCount % 100 === 0) {
                    this._checkMemory();
                }
            }
        } catch (error) {
            console.error(`Stream ${streamId} error:`, error);
        } finally {
            this.isRendering = false;
            
            if (this.config.debug) {
                console.log(`📡 Stream ${streamId} completed: ${frameCount} frames`);
            }
            
            // Process next in queue
            if (this.frameQueue.length > 0) {
                const next = this.frameQueue.shift();
                this.streamRender(next.binaryStream, next.options);
            }
        }
        
        return { streaming: true, frames: frameCount, streamId };
    }
    
    /**
     * OPTIMIZED: Get engine statistics
     */
    getStats() {
        const now = Date.now();
        const cacheEntries = this.binaryCache.size;
        
        // Calculate average render time from circular buffer
        let totalTime = 0;
        let count = 0;
        for (let i = 0; i < this.performance.renderTimes.length; i++) {
            if (this.performance.renderTimes[i] > 0) {
                totalTime += this.performance.renderTimes[i];
                count++;
            }
        }
        const avgRenderTime = count > 0 ? totalTime / count : 0;
        
        // Calculate FPS from last second
        const lastSecond = now - 1000;
        let framesLastSecond = 0;
        this.binaryCache.forEach(frame => {
            if (frame.timestamp > lastSecond) framesLastSecond++;
        });
        
        return {
            // Performance
            performance: {
                framesRendered: this.performance.framesRendered,
                framesPerSecond: framesLastSecond,
                averageRenderTime: avgRenderTime.toFixed(2) + 'ms',
                lastRenderTime: this.performance.lastRenderTime
            },
            
            // Memory
            memory: {
                cacheSize: cacheEntries,
                totalUsed: `${(this.memory.totalUsed / 1024 / 1024).toFixed(2)} MB`,
                limit: `${(this.config.memoryLimit / 1024 / 1024).toFixed(0)} MB`,
                usagePercent: ((this.memory.totalUsed / this.config.memoryLimit) * 100).toFixed(1) + '%'
            },
            
            // Queue
            queue: {
                isRendering: this.isRendering,
                pendingFrames: this.frameQueue.length,
                callbacks: this.renderCallbacks.size
            },
            
            // Config
            config: {
                mode: this.config.renderMode,
                maxFPS: this.config.maxFPS,
                cacheEnabled: this.config.enableCache
            }
        };
    }
    
    /**
     * OPTIMIZED: Clear cache with memory tracking
     */
    clearCache() {
        const cacheSize = this.binaryCache.size;
        const memoryFreed = this.memory.totalUsed;
        
        this.binaryCache.clear();
        this.memory.totalUsed = 0;
        
        // Reset performance array
        this.performance.renderTimes = new Float32Array(1000);
        this.performance.timeIndex = 0;
        
        if (this.config.debug) {
            console.log(`🧹 Cleared ${cacheSize} frames, freed ${(memoryFreed / 1024 / 1024).toFixed(2)} MB`);
        }
        
        return { 
            clearedFrames: cacheSize, 
            memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)} MB` 
        };
    }
    
    /**
     * PRIVATE: Fast frame data extraction
     */
    _extractFrameDataFast(bin, asset, text) {
        // Fast object creation with pre-allocated structure
        return {
            // Essential data only
            id: bin[TBC_PROTO.LIB],
            comp: bin[TBC_PROTO.COMP],
            scale: bin[TBC_PROTO.SCALE] / 100,
            opacity: bin[TBC_PROTO.OPACITY] / 255,
            
            // Only include if provided
            ...(asset && { asset }),
            ...(text && { text }),
            
            // Minimal metadata
            ts: Date.now(),
            sig: bin[TBC_PROTO.SIGN] === TBC_PROTO.SIGNATURES.VALID
        };
    }
    
    /**
     * PRIVATE: Fast render execution
     */
    _executeRenderFast(frameData) {
        this.performance.framesRendered++;
        this.performance.lastRenderTime = Date.now();
        
        // Fast path based on render mode
        switch (this.config.renderMode) {
            case 'CANVAS_2D':
                return this._renderCanvasFast(frameData);
            case 'SIMULATION':
                return this._renderSimulationFast(frameData);
            default:
                return { rendered: true, mode: this.config.renderMode };
        }
    }
    
    /**
     * PRIVATE: Optimized Canvas 2D rendering simulation
     */
    _renderCanvasFast(frameData) {
        // Minimal simulation
        return {
            rendered: true,
            method: 'Canvas2D',
            component: `Comp_${frameData.comp}`,
            scale: frameData.scale
        };
    }
    
    /**
     * PRIVATE: Optimized simulation rendering
     */
    _renderSimulationFast(frameData) {
        return {
            rendered: true,
            method: 'Simulation',
            id: frameData.id,
            timestamp: frameData.ts
        };
    }
    
    /**
     * PRIVATE: Fast frame ID generation
     */
    _generateFrameId() {
        return `${Date.now()}_${this.performance.framesRendered}`;
    }
    
    /**
     * PRIVATE: Cache frame with memory tracking
     */
    _cacheFrame(id, binary, data) {
        const frameSize = binary.length + JSON.stringify(data).length;
        
        // Check memory limit
        if (this.memory.totalUsed + frameSize > this.config.memoryLimit) {
            this._cleanupOldFrames();
        }
        
        this.binaryCache.set(id, {
            binary: Buffer.from(binary),
            data: data,
            timestamp: Date.now(),
            size: frameSize
        });
        
        this.memory.totalUsed += frameSize;
    }
    
    /**
     * PRIVATE: Cleanup old frames from cache
     */
    _cleanupOldFrames() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        let cleaned = 0;
        let memoryFreed = 0;
        
        for (const [id, frame] of this.binaryCache.entries()) {
            if (now - frame.timestamp > maxAge) {
                memoryFreed += frame.size;
                this.binaryCache.delete(id);
                cleaned++;
                
                if (this.memory.totalUsed - memoryFreed < this.config.memoryLimit * 0.7) {
                    break; // Freed enough memory
                }
            }
        }
        
        this.memory.totalUsed -= memoryFreed;
        
        if (this.config.debug && cleaned > 0) {
            console.log(`🧼 Cleaned ${cleaned} old frames, freed ${(memoryFreed / 1024).toFixed(1)} KB`);
        }
    }
    
    /**
     * PRIVATE: Check memory and cleanup if needed
     */
    _checkMemory() {
        const now = Date.now();
        
        if (now - this.memory.lastCleanup > this.memory.cleanupInterval) {
            this._cleanupOldFrames();
            this.memory.lastCleanup = now;
        }
        
        if (this.memory.totalUsed > this.config.memoryLimit * 0.9) {
            this._cleanupOldFrames();
        }
    }
    
    /**
     * PRIVATE: Fast performance update
     */
    _updatePerformanceFast(renderTime) {
        // Circular buffer for render times
        this.performance.renderTimes[this.performance.timeIndex] = renderTime;
        this.performance.timeIndex = (this.performance.timeIndex + 1) % this.performance.renderTimes.length;
    }
    
    /**
     * PRIVATE: Initialize statistics
     */
    _initStats() {
        return {
            startTime: Date.now(),
            framesRendered: 0,
            memoryUsed: 0,
            errors: 0
        };
    }
    
    /**
     * PRIVATE: Compress frame data for callbacks
     */
    _compressFrameData(frameData) {
        // Return only essential data for callbacks
        return {
            id: frameData.id,
            comp: frameData.comp,
            scale: frameData.scale,
            opacity: frameData.opacity
        };
    }
    
    /**
     * PRIVATE: Notify callbacks (async)
     */
    _notifyRenderCallbacks(event, data) {
        const callbacks = this.renderCallbacks.get(event);
        if (!callbacks) return;
        
        // Execute callbacks asynchronously
        for (const callback of callbacks) {
            setImmediate(() => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Callback error:`, error);
                }
            });
        }
    }
    
    /**
     * Register callback (unchanged but documented)
     */
    on(event, callback) {
        if (!this.renderCallbacks.has(event)) {
            this.renderCallbacks.set(event, []);
        }
        this.renderCallbacks.get(event).push(callback);
        return this;
    }
    
    /**
     * Off: Remove callback
     */
    off(event, callback) {
        const callbacks = this.renderCallbacks.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
        return this;
    }
    
    /**
     * Get cache entry
     */
    getCachedFrame(frameId) {
        return this.binaryCache.get(frameId);
    }
    
    /**
     * Get all cached frames (for debugging)
     */
    getAllCachedFrames() {
        return Array.from(this.binaryCache.entries());
    }
    
    /**
     * Reset engine state
     */
    reset() {
        this.clearCache();
        this.renderCallbacks.clear();
        this.frameQueue = [];
        this.isRendering = false;
        this.performance.framesRendered = 0;
        this.performance.renderTimes = new Float32Array(1000);
        this.performance.timeIndex = 0;
        
        if (this.config.debug) {
            console.log('🔄 Engine reset');
        }
    }
}

module.exports = TitanMainEngine;