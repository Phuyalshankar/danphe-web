'use strict';

const TBC_PROTO = require('../protocol/TBC_PROTO');

class TitanOrchestrator {
    constructor(engine) {
        if (!engine) {
            throw new Error('TitanMainEngine instance required');
        }
        
        this.engine = engine;
        this.componentRegistry = new Map();
        this.layerManager = new Map();
        this.animationQueue = [];
        
        console.log("🎭 Titan Orchestrator Initialized");
    }
    
    /**
     * Process UI from CDN/AI and convert to binary
     */
    processUI(lib, type, props) {
        const bin = new Uint8Array(16);
        
        // Set library ID
        bin[TBC_PROTO.LIB] = TBC_PROTO.LIB_ID[lib] || 0x00;
        
        // Set component type
        bin[TBC_PROTO.COMP] = this._mapComponent(type);
        
        // Map dynamic props to binary
        if (props.scale !== undefined) {
            bin[TBC_PROTO.SCALE] = this._clamp(props.scale, 0, 200);
        } else {
            bin[TBC_PROTO.SCALE] = 100;
        }
        
        if (props.zoom !== undefined) {
            bin[TBC_PROTO.ZOOM] = this._clamp(props.zoom, 0, 200);
        } else {
            bin[TBC_PROTO.ZOOM] = 100;
        }
        
        // Padding
        if (props.padding) {
            bin[TBC_PROTO.PAD_T] = props.padding.top || props.pT || props.padding?.t || 0;
            bin[TBC_PROTO.PAD_R] = props.padding.right || props.pR || props.padding?.r || 0;
            bin[TBC_PROTO.PAD_B] = props.padding.bottom || props.pB || props.padding?.b || 0;
            bin[TBC_PROTO.PAD_L] = props.padding.left || props.pL || props.padding?.l || 0;
        } else {
            bin[TBC_PROTO.PAD_T] = props.pT || 0;
            bin[TBC_PROTO.PAD_R] = props.pR || 0;
            bin[TBC_PROTO.PAD_B] = props.pB || 0;
            bin[TBC_PROTO.PAD_L] = props.pL || 0;
        }
        
        // Margin
        if (props.margin) {
            bin[TBC_PROTO.MAR_T] = props.margin.top || props.mT || props.margin?.t || 0;
            bin[TBC_PROTO.MAR_R] = props.margin.right || props.mR || props.margin?.r || 0;
            bin[TBC_PROTO.MAR_B] = props.margin.bottom || props.mB || props.margin?.b || 0;
            bin[TBC_PROTO.MAR_L] = props.margin.left || props.mL || props.margin?.l || 0;
        } else {
            bin[TBC_PROTO.MAR_T] = props.mT || 0;
            bin[TBC_PROTO.MAR_R] = props.mR || 0;
            bin[TBC_PROTO.MAR_B] = props.mB || 0;
            bin[TBC_PROTO.MAR_L] = props.mL || 0;
        }
        
        // Animation
        bin[TBC_PROTO.ANIM_TYPE] = props.animType || props.animation?.type || 0;
        bin[TBC_PROTO.ANIM_VAL] = props.animValue || props.animation?.value || 0;
        
        // Opacity
        if (props.opacity !== undefined) {
            bin[TBC_PROTO.OPACITY] = this._clamp(Math.round(props.opacity * 255), 0, 255);
        } else {
            bin[TBC_PROTO.OPACITY] = 255;
        }
        
        // Signature
        bin[TBC_PROTO.SIGN] = TBC_PROTO.SIGNATURES.VALID;
        
        // Validate and render
        const validatedBin = this._validateBinary(bin);
        
        // Add to component registry
        const componentId = `comp_${lib}_${type}_${Date.now()}`;
        this.componentRegistry.set(componentId, {
            binary: validatedBin,
            props: props,
            timestamp: Date.now()
        });
        
        // Render through engine
        const renderResult = this.engine.directRender(
            validatedBin, 
            props.src || props.asset || props.url,
            props.content || props.text || props.label
        );
        
        return {
            success: true,
            componentId,
            renderResult,
            binary: validatedBin
        };
    }
    
    /**
     * Create UI layout with multiple components
     */
    createLayout(layoutConfig) {
        const layoutId = `layout_${Date.now()}`;
        const components = [];
        const binaries = [];
        
        console.log(`🏗️ Creating layout: ${layoutId} with ${layoutConfig.components?.length || 0} components`);
        
        // Process each component in layout
        layoutConfig.components?.forEach((component, index) => {
            try {
                const result = this.processUI(
                    component.lib || layoutConfig.lib || 'UNIVERSAL',
                    component.type,
                    {
                        ...component.props,
                        layer: index,
                        layoutId: layoutId
                    }
                );
                
                components.push({
                    index,
                    componentId: result.componentId,
                    type: component.type,
                    layer: index,
                    success: true
                });
                
                binaries.push({
                    bin: result.binary,
                    layer: index,
                    componentId: result.componentId
                });
                
            } catch (error) {
                components.push({
                    index,
                    error: error.message,
                    success: false
                });
                
                console.error(`❌ Component ${index} failed:`, error.message);
            }
        });
        
        // Store layout
        this.layerManager.set(layoutId, {
            components,
            binaries,
            timestamp: Date.now(),
            config: layoutConfig
        });
        
        // Batch render all components
        if (binaries.length > 0) {
            const batchResult = this.engine.batchRender(
                binaries.map(b => ({ bin: b.bin, layer: b.layer })),
                { layoutId }
            );
            
            return {
                layoutId,
                success: true,
                components,
                batchResult,
                totalComponents: components.length,
                successfulComponents: components.filter(c => c.success).length
            };
        }
        
        return {
            layoutId,
            success: false,
            components,
            error: 'No valid components to render'
        };
    }
    
    /**
     * Update existing component
     */
    updateComponent(componentId, updatedProps) {
        if (!this.componentRegistry.has(componentId)) {
            throw new Error(`Component ${componentId} not found`);
        }
        
        const existing = this.componentRegistry.get(componentId);
        const newBinary = new Uint8Array(existing.binary);
        
        // Update only provided properties
        if (updatedProps.scale !== undefined) {
            newBinary[TBC_PROTO.SCALE] = this._clamp(updatedProps.scale, 0, 200);
        }
        
        if (updatedProps.opacity !== undefined) {
            newBinary[TBC_PROTO.OPACITY] = this._clamp(
                Math.round(updatedProps.opacity * 255), 
                0, 
                255
            );
        }
        
        if (updatedProps.animType !== undefined) {
            newBinary[TBC_PROTO.ANIM_TYPE] = updatedProps.animType;
        }
        
        if (updatedProps.animValue !== undefined) {
            newBinary[TBC_PROTO.ANIM_VAL] = updatedProps.animValue;
        }
        
        // Validate and update
        const validatedBin = this._validateBinary(newBinary);
        
        this.componentRegistry.set(componentId, {
            ...existing,
            binary: validatedBin,
            props: { ...existing.props, ...updatedProps },
            updatedAt: Date.now()
        });
        
        // Re-render
        const renderResult = this.engine.directRender(
            validatedBin,
            updatedProps.src || existing.props.src,
            updatedProps.content || existing.props.content
        );
        
        return {
            success: true,
            componentId,
            updated: Object.keys(updatedProps),
            renderResult
        };
    }
    
    /**
     * Animate component
     */
    animateComponent(componentId, animationConfig) {
        if (!this.componentRegistry.has(componentId)) {
            throw new Error(`Component ${componentId} not found`);
        }
        
        const animationId = `anim_${Date.now()}`;
        const existing = this.componentRegistry.get(componentId);
        
        // Add to animation queue
        this.animationQueue.push({
            animationId,
            componentId,
            config: animationConfig,
            startTime: Date.now(),
            status: 'pending'
        });
        
        // Update component with animation
        const updateResult = this.updateComponent(componentId, {
            animType: animationConfig.type,
            animValue: animationConfig.value || 100
        });
        
        // Schedule animation completion
        if (animationConfig.duration) {
            setTimeout(() => {
                this._completeAnimation(animationId, componentId);
            }, animationConfig.duration);
        }
        
        return {
            success: true,
            animationId,
            componentId,
            updateResult,
            queuePosition: this.animationQueue.length
        };
    }
    
    /**
     * Get orchestrator stats
     */
    getStats() {
        return {
            components: {
                total: this.componentRegistry.size,
                byType: this._countComponentsByType(),
                recent: this._getRecentComponents(10)
            },
            layouts: {
                total: this.layerManager.size,
                active: Array.from(this.layerManager.values())
                    .filter(l => Date.now() - l.timestamp < 300000).length // Last 5 minutes
            },
            animations: {
                queueSize: this.animationQueue.length,
                active: this.animationQueue.filter(a => a.status === 'active').length,
                completed: this.animationQueue.filter(a => a.status === 'completed').length
            },
            performance: {
                averageProcessingTime: this._calculateAverageProcessingTime(),
                cacheHitRate: this._calculateRegistryHitRate()
            }
        };
    }
    
    /**
     * Clear orchestrator data
     */
    clear() {
        const componentCount = this.componentRegistry.size;
        const layoutCount = this.layerManager.size;
        const animationCount = this.animationQueue.length;
        
        this.componentRegistry.clear();
        this.layerManager.clear();
        this.animationQueue = [];
        
        console.log(`🧹 Cleared ${componentCount} components, ${layoutCount} layouts, ${animationCount} animations`);
        
        return {
            clearedComponents: componentCount,
            clearedLayouts: layoutCount,
            clearedAnimations: animationCount
        };
    }
    
    /**
     * Map component type to binary code
     * @private
     */
    _mapComponent(type) {
        const map = {
            // Basic
            'button': TBC_PROTO.COMP_ID.BUTTON,
            'card': TBC_PROTO.COMP_ID.CARD,
            'container': TBC_PROTO.COMP_ID.CONTAINER,
            'stack': TBC_PROTO.COMP_ID.STACK,
            
            // Layout
            'column': TBC_PROTO.COMP_ID.COLUMN,
            'row': TBC_PROTO.COMP_ID.ROW,
            
            // Content
            'text': TBC_PROTO.COMP_ID.TEXT,
            'image': TBC_PROTO.COMP_ID.IMAGE,
            'textfield': TBC_PROTO.COMP_ID.TEXTFIELD,
            'slider': TBC_PROTO.COMP_ID.SLIDER,
            
            // Special
            'appbar': TBC_PROTO.COMP_ID.APPBAR,
            'listview': TBC_PROTO.COMP_ID.LISTVIEW,
            'gridview': TBC_PROTO.COMP_ID.GRIDVIEW
        };
        
        return map[type.toLowerCase()] || TBC_PROTO.COMP_ID.CONTAINER;
    }
    
    /**
     * Validate binary before rendering
     * @private
     */
    _validateBinary(bin) {
        // Ensure values are within valid ranges
        bin[TBC_PROTO.SCALE] = this._clamp(bin[TBC_PROTO.SCALE], 0, 200);
        bin[TBC_PROTO.ZOOM] = this._clamp(bin[TBC_PROTO.ZOOM], 0, 200);
        bin[TBC_PROTO.OPACITY] = this._clamp(bin[TBC_PROTO.OPACITY], 0, 255);
        
        // Ensure signature is valid
        if (bin[TBC_PROTO.SIGN] !== TBC_PROTO.SIGNATURES.VALID && bin[TBC_PROTO.SIGN] !== 0x00) {
            bin[TBC_PROTO.SIGN] = TBC_PROTO.SIGNATURES.VALID;
        }
        
        return bin;
    }
    
    /**
     * Clamp value between min and max
     * @private
     */
    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Complete animation
     * @private
     */
    _completeAnimation(animationId, componentId) {
        const animationIndex = this.animationQueue.findIndex(a => a.animationId === animationId);
        
        if (animationIndex !== -1) {
            this.animationQueue[animationIndex].status = 'completed';
            this.animationQueue[animationIndex].endTime = Date.now();
            
            // Reset component animation
            if (this.componentRegistry.has(componentId)) {
                const component = this.componentRegistry.get(componentId);
                const newBinary = new Uint8Array(component.binary);
                newBinary[TBC_PROTO.ANIM_TYPE] = 0x00; // No animation
                newBinary[TBC_PROTO.ANIM_VAL] = 0;
                
                this.componentRegistry.set(componentId, {
                    ...component,
                    binary: newBinary
                });
                
                console.log(`✅ Animation ${animationId} completed for ${componentId}`);
            }
        }
    }
    
    /**
     * Count components by type
     * @private
     */
    _countComponentsByType() {
        const counts = {};
        
        this.componentRegistry.forEach(component => {
            const type = this._getComponentTypeFromBinary(component.binary);
            counts[type] = (counts[type] || 0) + 1;
        });
        
        return counts;
    }
    
    /**
     * Get component type from binary
     * @private
     */
    _getComponentTypeFromBinary(binary) {
        const componentId = binary[TBC_PROTO.COMP];
        const reverseMap = Object.entries(TBC_PROTO.COMP_ID)
            .find(([_, value]) => value === componentId);
        
        return reverseMap ? reverseMap[0] : 'UNKNOWN';
    }
    
    /**
     * Get recent components
     * @private
     */
    _getRecentComponents(count) {
        const entries = Array.from(this.componentRegistry.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, count);
        
        return entries.map(([id, data]) => ({
            id,
            type: this._getComponentTypeFromBinary(data.binary),
            timestamp: new Date(data.timestamp).toISOString()
        }));
    }
    
    /**
     * Calculate average processing time
     * @private
     */
    _calculateAverageProcessingTime() {
        // This would track actual processing times in production
        return '5-10ms'; // Simulated
    }
    
    /**
     * Calculate registry hit rate
     * @private
     */
    _calculateRegistryHitRate() {
        // Simulated hit rate
        return '98%';
    }
}

module.exports = TitanOrchestrator;