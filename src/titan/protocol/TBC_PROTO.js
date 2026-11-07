'use strict';

/**
 * Titan Binary Core Protocol - 16-byte binary packet structure
 * 
 * Each byte has specific meaning for UI rendering
 * 
 * Byte Layout:
 * [0]    Library ID (MUI, Flutter, iOS, etc.)
 * [1]    Component Type (Button, Card, etc.)
 * [2]    Scale (0-200%)
 * [3]    Zoom (0-200%)
 * [4]    Padding Top
 * [5]    Padding Right
 * [6]    Padding Bottom
 * [7]    Padding Left
 * [8]    Margin Top
 * [9]    Margin Right
 * [10]   Margin Bottom
 * [11]   Margin Left
 * [12]   Animation Type
 * [13]   Animation Value
 * [14]   Opacity (0-255)
 * [15]   Signature/Validation
 */

const TBC_PROTO = {
    // ==================== BYTE OFFSETS ====================
    LIB: 0,         // Library identifier
    COMP: 1,        // Component type
    SCALE: 2,       // Scale percentage (0-200%)
    ZOOM: 3,        // Zoom percentage (0-200%)
    
    // Padding (all directions)
    PAD_T: 4,       // Top padding
    PAD_R: 5,       // Right padding
    PAD_B: 6,       // Bottom padding
    PAD_L: 7,       // Left padding
    
    // Margin (all directions)
    MAR_T: 8,       // Top margin
    MAR_R: 9,       // Right margin
    MAR_B: 10,      // Bottom margin
    MAR_L: 11,      // Left margin
    
    // Animation
    ANIM_TYPE: 12,  // Animation type
    ANIM_VAL: 13,   // Animation value/duration
    
    // Style
    OPACITY: 14,    // Opacity (0-255, where 255 = 100%)
    SIGN: 15,       // Signature byte for validation
    
    // ==================== LIBRARY IDs ====================
    LIB_ID: {
        MUI: 0x01,          // Material-UI
        TAILWIND: 0x02,     // Tailwind CSS
        CHAKRA: 0x03,       // Chakra UI
        IOS: 0x04,          // iOS/UIKit
        ANDROID: 0x05,      // Android/Material Design
        FLUTTER: 0x06,      // Flutter
        REACT_NATIVE: 0x07, // React Native
        VUE: 0x08,          // Vue.js
        SVELTE: 0x09,       // Svelte
        WEB_COMPONENTS: 0x0A, // Web Components
        UNIVERSAL: 0xFF     // Universal/Platform-agnostic
    },
    
    // ==================== COMPONENT IDs ====================
    COMP_ID: {
        // Basic Components
        BUTTON: 0x10,
        CARD: 0x11,
        CONTAINER: 0x12,
        
        // Layout Components
        COLUMN: 0x13,
        ROW: 0x14,
        STACK: 0x15,
        
        // Content Components
        TEXT: 0x16,
        IMAGE: 0x17,
        TEXTFIELD: 0x18,
        SLIDER: 0x19,
        SWITCH: 0x1A,
        CHECKBOX: 0x1B,
        RADIO: 0x1C,
        SELECT: 0x1D,
        
        // Navigation Components
        APPBAR: 0x1E,
        NAVBAR: 0x1F,
        SIDEBAR: 0x20,
        BOTTOM_NAV: 0x21,
        
        // List Components
        LISTVIEW: 0x22,
        GRIDVIEW: 0x23,
        TABLE: 0x24,
        
        // Media Components
        VIDEO: 0x25,
        AUDIO: 0x26,
        CANVAS: 0x27,
        
        // Special Components
        MODAL: 0x28,
        TOOLTIP: 0x29,
        PROGRESS: 0x2A,
        AVATAR: 0x2B,
        BADGE: 0x2C,
        
        // Form Components
        FORM: 0x2D,
        INPUT_GROUP: 0x2E,
        VALIDATION: 0x2F,
        
        // Custom/User-defined
        CUSTOM_1: 0x30,
        CUSTOM_2: 0x31,
        CUSTOM_3: 0x32,
        
        // Reserved for future use
        RESERVED_1: 0xF0,
        RESERVED_2: 0xF1,
        RESERVED_3: 0xF2
    },
    
    // ==================== ANIMATION IDs ====================
    ANIM_ID: {
        NONE: 0x00,         // No animation
        FADE_IN: 0x01,      // Fade in
        FADE_OUT: 0x02,     // Fade out
        SLIDE_UP: 0x03,     // Slide from bottom
        SLIDE_DOWN: 0x04,   // Slide from top
        SLIDE_LEFT: 0x05,   // Slide from right
        SLIDE_RIGHT: 0x06,  // Slide from left
        SCALE_UP: 0x07,     // Scale up
        SCALE_DOWN: 0x08,   // Scale down
        ROTATE: 0x09,       // Rotate
        BOUNCE: 0x0A,       // Bounce
        FLIP: 0x0B,         // 3D flip
        ZOOM_IN: 0x0C,      // Zoom in
        ZOOM_OUT: 0x0D,     // Zoom out
        SHAKE: 0x0E,        // Shake
        PULSE: 0x0F,        // Pulse
        
        // Custom animations
        CUSTOM_1: 0x10,
        CUSTOM_2: 0x11,
        CUSTOM_3: 0x12,
        
        // Reserved
        RESERVED_1: 0xF0,
        RESERVED_2: 0xF1
    },
    
    // ==================== VALIDATION CONSTANTS ====================
    SIGNATURES: {
        VALID: 0x00,        // Signature check disabled to allow UI flags in Byte 15
        INVALID: 0x00,
        TEST: 0x00,
        DEBUG: 0x00
    },
    
    // ==================== VALUE RANGES ====================
    RANGES: {
        SCALE: { min: 0, max: 200, default: 100 },      // 0-200%
        ZOOM: { min: 0, max: 200, default: 100 },       // 0-200%
        OPACITY: { min: 0, max: 255, default: 255 },    // 0-255 (0-100%)
        PADDING: { min: 0, max: 255, default: 0 },      // 0-255px
        MARGIN: { min: 0, max: 255, default: 0 },       // 0-255px
        ANIM_VALUE: { min: 0, max: 255, default: 0 }    // 0-255 (duration/intensity)
    },
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Create a new 16-byte binary buffer with default values
     */
    createBinary(library = 'UNIVERSAL', component = 'CONTAINER') {
        const bin = new Uint8Array(16);
        
        // Set defaults
        bin[this.LIB] = this.LIB_ID[library] || this.LIB_ID.UNIVERSAL;
        bin[this.COMP] = this.COMP_ID[component] || this.COMP_ID.CONTAINER;
        bin[this.SCALE] = this.RANGES.SCALE.default;
        bin[this.ZOOM] = this.RANGES.ZOOM.default;
        bin[this.OPACITY] = this.RANGES.OPACITY.default;
        bin[this.SIGN] = this.SIGNATURES.VALID;
        
        return bin;
    },
    
    /**
     * Validate binary packet
     */
    validate(binary) {
        if (!binary || binary.length !== 16) {
            return { valid: false, error: `Invalid length: ${binary?.length || 0} bytes` };
        }
        
        const errors = [];
        
        // Check signature
        if (!Object.values(this.SIGNATURES).includes(binary[this.SIGN])) {
            errors.push(`Invalid signature: 0x${binary[this.SIGN].toString(16)}`);
        }
        
        // Check library ID
        const libraryId = binary[this.LIB];
        if (!Object.values(this.LIB_ID).includes(libraryId) && libraryId !== 0x00) {
            errors.push(`Unknown library ID: 0x${libraryId.toString(16)}`);
        }
        
        // Check component ID
        const componentId = binary[this.COMP];
        if (!Object.values(this.COMP_ID).includes(componentId) && componentId !== 0x00) {
            errors.push(`Unknown component ID: 0x${componentId.toString(16)}`);
        }
        
        // Check value ranges
        if (binary[this.SCALE] > this.RANGES.SCALE.max) {
            errors.push(`Scale out of range: ${binary[this.SCALE]} (max: ${this.RANGES.SCALE.max})`);
        }
        
        if (binary[this.ZOOM] > this.RANGES.ZOOM.max) {
            errors.push(`Zoom out of range: ${binary[this.ZOOM]} (max: ${this.RANGES.ZOOM.max})`);
        }
        
        if (binary[this.OPACITY] > this.RANGES.OPACITY.max) {
            errors.push(`Opacity out of range: ${binary[this.OPACITY]} (max: ${this.RANGES.OPACITY.max})`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            details: {
                library: this.getLibraryName(binary[this.LIB]),
                component: this.getComponentName(binary[this.COMP]),
                animation: this.getAnimationName(binary[this.ANIM_TYPE]),
                signature: `0x${binary[this.SIGN].toString(16).toUpperCase()}`,
                size: 16
            }
        };
    },
    
    /**
     * Get library name from ID
     */
    getLibraryName(id) {
        const entry = Object.entries(this.LIB_ID).find(([_, value]) => value === id);
        return entry ? entry[0] : `Unknown (0x${id.toString(16)})`;
    },
    
    /**
     * Get component name from ID
     */
    getComponentName(id) {
        const entry = Object.entries(this.COMP_ID).find(([_, value]) => value === id);
        return entry ? entry[0] : `Unknown (0x${id.toString(16)})`;
    },
    
    /**
     * Get animation name from ID
     */
    getAnimationName(id) {
        const entry = Object.entries(this.ANIM_ID).find(([_, value]) => value === id);
        return entry ? entry[0] : `None (0x${id.toString(16)})`;
    },
    
    /**
     * Convert binary to human-readable format
     */
    toHumanReadable(binary) {
        if (!binary || binary.length !== 16) {
            return 'Invalid binary';
        }
        
        return {
            library: this.getLibraryName(binary[this.LIB]),
            component: this.getComponentName(binary[this.COMP]),
            transform: {
                scale: `${binary[this.SCALE]}%`,
                zoom: `${binary[this.ZOOM]}%`
            },
            spacing: {
                padding: {
                    top: `${binary[this.PAD_T]}px`,
                    right: `${binary[this.PAD_R]}px`,
                    bottom: `${binary[this.PAD_B]}px`,
                    left: `${binary[this.PAD_L]}px`
                },
                margin: {
                    top: `${binary[this.MAR_T]}px`,
                    right: `${binary[this.MAR_R]}px`,
                    bottom: `${binary[this.MAR_B]}px`,
                    left: `${binary[this.MAR_L]}px`
                }
            },
            animation: {
                type: this.getAnimationName(binary[this.ANIM_TYPE]),
                value: binary[this.ANIM_VAL]
            },
            style: {
                opacity: `${(binary[this.OPACITY] / 255 * 100).toFixed(1)}%`
            },
            validation: {
                signature: `0x${binary[this.SIGN].toString(16).toUpperCase()}`,
                isValid: binary[this.SIGN] === this.SIGNATURES.VALID
            },
            raw: Array.from(binary).map(b => `0x${b.toString(16).padStart(2, '0')}`)
        };
    },
    
    /**
     * Create binary from UI properties
     */
    fromProperties(props) {
        const bin = this.createBinary(props.library || 'UNIVERSAL', props.type || 'CONTAINER');
        
        // Apply properties
        if (props.scale !== undefined) {
            bin[this.SCALE] = Math.min(this.RANGES.SCALE.max, Math.max(this.RANGES.SCALE.min, props.scale));
        }
        
        if (props.zoom !== undefined) {
            bin[this.ZOOM] = Math.min(this.RANGES.ZOOM.max, Math.max(this.RANGES.ZOOM.min, props.zoom));
        }
        
        if (props.padding) {
            if (typeof props.padding === 'object') {
                bin[this.PAD_T] = props.padding.top || props.padding.t || 0;
                bin[this.PAD_R] = props.padding.right || props.padding.r || 0;
                bin[this.PAD_B] = props.padding.bottom || props.padding.b || 0;
                bin[this.PAD_L] = props.padding.left || props.padding.l || 0;
            } else {
                const val = Math.min(255, Math.max(0, props.padding));
                bin[this.PAD_T] = val;
                bin[this.PAD_R] = val;
                bin[this.PAD_B] = val;
                bin[this.PAD_L] = val;
            }
        }
        
        if (props.margin) {
            if (typeof props.margin === 'object') {
                bin[this.MAR_T] = props.margin.top || props.margin.t || 0;
                bin[this.MAR_R] = props.margin.right || props.margin.r || 0;
                bin[this.MAR_B] = props.margin.bottom || props.margin.b || 0;
                bin[this.MAR_L] = props.margin.left || props.margin.l || 0;
            } else {
                const val = Math.min(255, Math.max(0, props.margin));
                bin[this.MAR_T] = val;
                bin[this.MAR_R] = val;
                bin[this.MAR_B] = val;
                bin[this.MAR_L] = val;
            }
        }
        
        if (props.animation) {
            if (props.animation.type !== undefined) {
                const animId = typeof props.animation.type === 'string' 
                    ? this.ANIM_ID[props.animation.type.toUpperCase()] || 0x00
                    : props.animation.type;
                bin[this.ANIM_TYPE] = animId;
            }
            
            if (props.animation.value !== undefined) {
                bin[this.ANIM_VAL] = Math.min(255, Math.max(0, props.animation.value));
            }
        }
        
        if (props.opacity !== undefined) {
            const opacity = typeof props.opacity === 'number' 
                ? Math.round(props.opacity * 255)
                : props.opacity;
            bin[this.OPACITY] = Math.min(255, Math.max(0, opacity));
        }
        
        return bin;
    }
};

module.exports = TBC_PROTO;