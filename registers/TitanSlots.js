'use strict';

/**
 * 🏛️ TITAN UNIVERSAL CARRIER SLOTS REGISTRY (registers/TitanSlots.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 8-Bit Carrier Slot Schema for Deterministic UI Data Binding (Slots 1 to 8).
 * Bridges semantic Database models with 24-byte hardware binary stream opcodes.
 *
 * Latency: < 1 µs per slot hydration on Android Main Looper / Dolphin Web.
 * Zero Virtual DOM Diffing • Zero State Boilerplate • 100% Offline-First.
 */

// ── 0. Starter Counter & Input Carrier Slots (Collection: 'counter_log') ─────
export const COUNTER_SLOTS = Object.freeze({
  id: 1,        // Slot 1: Primary ID / Log Entry Number
  label: 2,     // Slot 2: Input Field / Note Text
  value: 3,     // Slot 3: Counter Value Display
  status: 4,    // Slot 4: Status Badge (e.g. "SAVED")
  timestamp: 5  // Slot 5: Timestamp string
});

// ── 1. Hotel Rooms Carrier Slots (Collection: 'rooms') ────────────────────────
export const ROOM_SLOTS = Object.freeze({
  roomNumber: 1,      // Primary Key / Room ID (e.g. 101, 102, 304)
  guestName: 2,       // In-House Guest Name (e.g. "Roshan Sharma")
  roomType: 3,        // Room Type & Meta (e.g. "Deluxe Suite • +977 98...")
  status: 4,          // Availability Status Badge (VACANT, OCCUPIED, IN-CALL)
  price: 5,           // Display Price / Night (e.g. "Rs. 3500" or "$120")
  editPrice: 6,       // Back-face Editable Price Input (Float / Money)
  editType: 7,        // Back-face Editable Room Type Input (String)
  editPhone: 8        // Back-face Editable Mobile Phone Input (String)
});

// ── 2. Dining Menu Carrier Slots (Collection: 'menu') ─────────────────────────
export const MENU_SLOTS = Object.freeze({
  dishName: 1,        // Dish Title (e.g. "Everest Chicken Momo")
  category: 2,        // Menu Category / Subtitle (e.g. "Chef Special • Non-Veg")
  status: 4,          // Availability Badge (AVAILABLE, SOLD_OUT)
  image: 5,           // Dish Photograph / URL / Local Asset Path
  editPrice: 6        // Back-face Editable Price Input
});

// ── 3. Orders Carrier Slots (Collection: 'orders') ────────────────────────────
export const ORDER_SLOTS = Object.freeze({
  orderId: 1,         // Order ID / Tracking Number (e.g. "ORD-1082")
  guestName: 2,       // Guest Name & Room (e.g. "Roshan (Room 102)")
  itemsSummary: 3,    // Items Summary (e.g. "2x Coffee, 1x Sandwich")
  status: 4,          // Order Status Badge (PENDING, COOKING, DELIVERED)
  totalAmount: 5      // Total Bill Amount (e.g. "Rs. 810")
});

// ── 4. Staff & Guest Profile Slots (Collection: 'users') ──────────────────────
export const USER_SLOTS = Object.freeze({
  fullName: 1,        // User Name (e.g. "Roshan Sharma")
  roleTitle: 2,       // Job Title / Role (e.g. "General Manager", "Guest")
  status: 4,          // Online / Offline Badge
  avatar: 5           // Profile Photo / QR Token
});

// Master Map of all collection slot schemas
export const SLOT_SCHEMAS = Object.freeze({
  counter_log: COUNTER_SLOTS,
  counter: COUNTER_SLOTS,
  rooms: ROOM_SLOTS,
  // generic collections
  menu: MENU_SLOTS,
  hotel_menu: MENU_SLOTS,
  orders: ORDER_SLOTS,
  users: USER_SLOTS
});

/**
 * 🔄 Universal Projector: Maps any DB entity into an 8-Slot Carrier Record
 */
export function projectToSlots(collectionName, entity) {
  if (!entity || typeof entity !== 'object') return {};
  const col = String(collectionName || 'rooms').toLowerCase();

  if (col === 'rooms') {
    const rNo = entity.roomNumber || entity.number || entity.id || '';
    const priceVal = entity.price || 0;
    const pStr = typeof priceVal === 'number' ? `Rs. ${priceVal}` : String(priceVal);
    const typeStr = entity.type || entity.roomType || 'Standard';
    const phoneStr = entity.phone || entity.mobile || '';
    const metaStr = phoneStr ? `${typeStr} • ${phoneStr}` : typeStr;

    return {
      slot_1: rNo ? (String(rNo).startsWith('Room') ? rNo : `Room ${rNo}`) : '',
      slot_2: entity.guest || entity.guestName || 'Vacant',
      slot_3: metaStr,
      slot_4: entity.status || 'VACANT',
      slot_5: pStr,
      slot_6: priceVal,
      slot_7: typeStr,
      slot_8: phoneStr,
      raw: entity
    };
  }

  if (col === 'menu' || col === 'hotel_menu') {
    return {
      slot_1: entity.name || entity.dishName || entity.title || '',
      slot_2: entity.category || entity.subtitle || '',
      slot_4: entity.status || entity.availability || 'AVAILABLE',
      slot_5: entity.image || entity.photo || entity.icon || '',
      slot_6: entity.price || 0,
      raw: entity
    };
  }

  return entity;
}

/**
 * 📥 Universal Extractor: Extracts clean DB patch from edited slot inputs (Slots 6, 7, 8)
 */
export function extractFromSlots(collectionName, slotInputs) {
  if (!slotInputs || typeof slotInputs !== 'object') return {};
  const col = String(collectionName || 'rooms').toLowerCase();

  if (col === 'rooms') {
    return {
      price: slotInputs[6] !== undefined ? parseFloat(slotInputs[6]) : undefined,
      type: slotInputs[7] !== undefined ? String(slotInputs[7]).trim() : undefined,
      phone: slotInputs[8] !== undefined ? String(slotInputs[8]).trim() : undefined
    };
  }

  return slotInputs;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ROOM_SLOTS,
    MENU_SLOTS,
    ORDER_SLOTS,
    USER_SLOTS,
    SLOT_SCHEMAS,
    projectToSlots,
    extractFromSlots
  };
}
