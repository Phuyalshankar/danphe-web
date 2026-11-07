'use strict';

const { REG, KEY_TO_REG_MAP, SisoRegisterMap } = require('./SisoRegisterMap');
const { SisoBinaryProtocol, TITAN_SISO_SIGNATURE, TITAN_SISO_SECURE_SIGNATURE, TITAN_MACRO_SIGNATURE } = require('./SisoBinaryProtocol');
const { SisoGizmoSync } = require('./SisoGizmoSync');
const { SisoStore, createSisoStore } = require('./SisoStore');

/**
 * 🦅 Danphe-2 Universal SISO Module
 * Single-Input Single-Output 24-byte, 7-byte, and 6-byte Architecture.
 * Provides 100% replacement for legacy state stores, unifying Web & Native Android.
 */

/**
 * Inspects multiple legacy store slice objects (e.g. editStore, zoomPanStore, sliderStore)
 * and generates a single unified SisoStore with compatible slice proxies.
 */
function replaceStateFilesWithSiso(slicesMap = {}) {
    const mergedInitial = {};
    const sliceDefinitions = {};

    for (const [sliceName, sliceInstance] of Object.entries(slicesMap)) {
        if (sliceInstance && typeof sliceInstance.get === 'function') {
            const currentData = sliceInstance.get() || {};
            sliceDefinitions[sliceName] = Object.keys(currentData);
            Object.assign(mergedInitial, currentData);
        } else if (sliceInstance && typeof sliceInstance === 'object') {
            sliceDefinitions[sliceName] = Object.keys(sliceInstance);
            Object.assign(mergedInitial, sliceInstance);
        }
    }

    const masterStore = createSisoStore(mergedInitial);
    const resultSlices = { masterStore };

    for (const [sliceName, keyList] of Object.entries(sliceDefinitions)) {
        resultSlices[sliceName] = masterStore.createSlice(keyList);
    }

    return resultSlices;
}

module.exports = {
    // Core Engine & Factory
    createSisoStore,
    SisoStore,
    replaceStateFilesWithSiso,

    // Register Directives & Definitions
    REG,
    KEY_TO_REG_MAP,
    SisoRegisterMap,

    // Binary Highway
    SisoBinaryProtocol,
    TITAN_SISO_SIGNATURE,
    TITAN_SISO_SECURE_SIGNATURE,
    TITAN_MACRO_SIGNATURE,

    // Bi-Directional Canvas Gizmo & Slider Math
    SisoGizmoSync
};
