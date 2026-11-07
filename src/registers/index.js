'use strict';

/**
 * ⚡ TITAN REGISTERS & SLOTS ENTRY POINT
 * Provides clean named semantic constants & unified schema for developers.
 * No hex values (0xhhhh) needed!
 * 
 * Usage:
 *   import { SCHEMA, SYS, TELEMETRY, ROOMS, MENU } from './registers';
 *   import { ROOM_SLOTS, projectToSlots } from './registers';
 */

const { REGISTERS, REG_NAMES, resolveRegister, parseDolphinRegisters } = require('./TitanRegisterSheet');
const { ROOM_SLOTS, MENU_SLOTS, ORDER_SLOTS, USER_SLOTS, SLOT_SCHEMAS, projectToSlots, extractFromSlots } = require('./TitanSlots');
const SCHEMA = require('./schema');

module.exports = {
  ...REGISTERS,
  REGISTERS,
  REG_NAMES,
  resolveRegister,
  parseDolphinRegisters,

  // 🏛️ Master Unified Schema (Parent Registers + Child Slots)
  SCHEMA,
  SYS: SCHEMA.SYS,
  TELEMETRY: SCHEMA.TELEMETRY,
  ROOMS: SCHEMA.ROOMS,
  MENU: SCHEMA.MENU,
  ORDERS: SCHEMA.ORDERS,

  // 🎟️ Hardware Slots
  ROOM_SLOTS,
  MENU_SLOTS,
  ORDER_SLOTS,
  USER_SLOTS,
  SLOT_SCHEMAS,
  projectToSlots,
  extractFromSlots
};
