'use strict';

/**
 * WebStateEngine - Decoupled Web AST Template Helper for DolphinWebEngine
 */
const WebStateEngine = {
    getDefaultState() {
        return {};
    },
    parseStateKeyString(str, stateMap, escapeFn) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/\{([^}]+)\}/g, (match, key) => {
            const val = stateMap[key.trim()];
            if (val !== undefined && val !== null) {
                return escapeFn ? escapeFn(String(val)) : String(val);
            }
            return match;
        });
    }
};

module.exports = WebStateEngine;
