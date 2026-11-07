'use strict';

/**
 * 🌊 Dolphin CLI — Commands barrel
 * Single import point for all CLI commands.
 *
 * Usage:
 *   const { cmdInit, cmdDev, cmdBuild, cmdInspect, cmdAndroid, showHelp } = require('./commands');
 */

const { cmdInit }    = require('./init');
const { cmdDev }     = require('./dev');
const { cmdBuild }   = require('./build');
const { cmdInspect } = require('./inspect');
const { cmdAndroid } = require('./android');
const { cmdDoctor }  = require('./doctor');
const { cmdGenerate } = require('./generate');
const { cmdThorVG }   = require('./thorvg');
const { showHelp }   = require('./help');

module.exports = {
    cmdInit,
    cmdDev,
    cmdBuild,
    cmdInspect,
    cmdAndroid,
    cmdDoctor,
    cmdGenerate,
    cmdThorVG,
    showHelp,
};
