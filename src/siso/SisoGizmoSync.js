'use strict';

const { REG } = require('./SisoRegisterMap');

/**
 * 📐 SisoGizmoSync — Bi-Directional Canvas Gizmo & Hardware Slider Sync Engine
 * Real-time 60-120 FPS bi-directional mathematical synchronization:
 *   [Screen Touch / Pinch / Gizmo] ⟷ [SISO 16-Bit Registers] ⟷ [Hardware Slider]
 */
class SisoGizmoSync {
    /**
     * Map a raw 0 - 255 Hardware Slider position to the active parameter's domain.
     */
    static sliderToParameter(paramType, sliderRawVal) {
        const val = Math.max(0, Math.min(255, Number(sliderRawVal) || 0));

        switch (String(paramType).toLowerCase()) {
            case 'speed': {
                // Range: 0.25x (25) to 4.0x (400)
                const mapped = Math.round(25 + (val / 255) * 375);
                const display = (mapped / 100).toFixed(2) + 'x';
                return { reg: REG.VIDEO_SPEED, value: mapped, display, unit: 'x' };
            }
            case 'zoom':
            case 'scale': {
                // Range: 20% to 400%
                const mapped = Math.round(20 + (val / 255) * 380);
                const display = mapped + '%';
                return { reg: REG.VIDEO_SCALE, value: mapped, display, unit: '%' };
            }
            case 'rotate':
            case 'rotation': {
                // Range: 0° to 360°
                const mapped = Math.round((val / 255) * 360);
                const display = mapped + '°';
                return { reg: REG.VIDEO_ROTATION, value: mapped, display, unit: '°' };
            }
            case 'volume':
            case 'gain': {
                // Range: 0% to 200%
                const mapped = Math.round((val / 255) * 200);
                const display = mapped === 0 ? 'Mute' : mapped + '%';
                return { reg: REG.MASTER_VOLUME, value: mapped, display, unit: '%' };
            }
            case 'opacity': {
                // Range: 0% to 100%
                const mapped = Math.round((val / 255) * 100);
                const display = mapped + '%';
                return { reg: REG.VIDEO_OPACITY, value: mapped, display, unit: '%' };
            }
            case 'crop': {
                // Range: 0% to 100%
                const mapped = Math.round((val / 255) * 100);
                const display = mapped + '%';
                return { reg: REG.CROP_LEFT, value: mapped, display, unit: '%' };
            }
            default: {
                return { reg: REG.SLIDER_RAW_VAL, value: val, display: val + '%', unit: '%' };
            }
        }
    }

    /**
     * Map a parameter value back to the 0 - 255 Hardware Slider position.
     */
    static parameterToSlider(paramType, paramVal) {
        const val = Number(paramVal) || 0;

        switch (String(paramType).toLowerCase()) {
            case 'speed': {
                // 25..400 -> 0..255
                const clamped = Math.max(25, Math.min(400, val));
                return Math.round(((clamped - 25) / 375) * 255);
            }
            case 'zoom':
            case 'scale': {
                // 20..400 -> 0..255
                const clamped = Math.max(20, Math.min(400, val));
                return Math.round(((clamped - 20) / 380) * 255);
            }
            case 'rotate':
            case 'rotation': {
                // 0..360 -> 0..255
                const normalized = ((val % 360) + 360) % 360;
                return Math.round((normalized / 360) * 255);
            }
            case 'volume':
            case 'gain': {
                // 0..200 -> 0..255
                const clamped = Math.max(0, Math.min(200, val));
                return Math.round((clamped / 200) * 255);
            }
            case 'opacity': {
                const clamped = Math.max(0, Math.min(100, val));
                return Math.round((clamped / 100) * 255);
            }
            default:
                return Math.max(0, Math.min(255, Math.round(val)));
        }
    }

    /**
     * Computes CSS Transform and Native Matrix parameters from current SISO registers.
     */
    static computeTransformMatrix(zoom = 100, rotation = 0, panX = 0, panY = 0) {
        const scaleFactor = Math.max(0.1, Number(zoom) / 100 || 1.0);
        const rotDeg = Number(rotation) || 0;
        const px = Number(panX) || 0;
        const py = Number(panY) || 0;

        const cssTransform = `translate3d(${px}px, ${py}px, 0px) scale(${scaleFactor.toFixed(3)}) rotate(${rotDeg.toFixed(1)}deg)`;

        // 2D Affine Transformation Matrix
        const rad = (rotDeg * Math.PI) / 180;
        const cos = Math.cos(rad) * scaleFactor;
        const sin = Math.sin(rad) * scaleFactor;
        const a = cos.toFixed(4);
        const b = sin.toFixed(4);
        const c = (-sin).toFixed(4);
        const d = cos.toFixed(4);

        const matrixCss = `matrix(${a}, ${b}, ${c}, ${d}, ${px}, ${py})`;

        return {
            scale: scaleFactor,
            rotation: rotDeg,
            panX: px,
            panY: py,
            cssTransform,
            matrixCss
        };
    }

    /**
     * Computes the 4 corners and rotation knob position of the Gizmo bounding box.
     */
    static computeGizmoBounds(boxWidth, boxHeight, zoom = 100, rotation = 0, panX = 0, panY = 0) {
        const { scale, rotation: rotDeg, panX: px, panY: py } = this.computeTransformMatrix(zoom, rotation, panX, panY);

        const w = (boxWidth || 200) * scale;
        const h = (boxHeight || 300) * scale;

        return {
            width: Math.round(w),
            height: Math.round(h),
            centerX: px,
            centerY: py,
            rotation: rotDeg,
            // Handles offsets relative to center
            handles: {
                topLeft:     { x: -w / 2, y: -h / 2 },
                topRight:    { x:  w / 2, y: -h / 2 },
                bottomLeft:  { x: -w / 2, y:  h / 2 },
                bottomRight: { x:  w / 2, y:  h / 2 },
                rotateKnob:  { x:  0,     y: -h / 2 - 28 }, // 28px stem above top
                deleteBtn:   { x:  w / 2, y: -h / 2 - 20 }
            }
        };
    }
}

module.exports = { SisoGizmoSync };
