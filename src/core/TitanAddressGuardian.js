'use strict';

/**
 * 🏔️ TITAN ADDRESS GUARDIAN (v1.0.0)
 * Pre-Flight Address Collision Detector & Range Allocator
 * 
 * Prevents:
 * • Human developer copy-paste duplicate register collisions
 * • User overwrite of protected system registers (0 - 99)
 * • Dynamic document address collisions at scale
 */

const PROTECTED_SYSTEM_RANGE = { start: 0, end: 99 };

/**
 * Validates and locks a map of addresses, catching collisions at startup.
 */
function defineAddresses(addressMap, options = {}) {
  const allowSystem = options.allowSystem || false;
  const throwOnCollision = options.strict !== false; // Default: true

  const claimedAddresses = new Map(); // address (number) -> key name
  const validated = {};

  for (const [key, rawAddr] of Object.entries(addressMap)) {
    const addr = Number(rawAddr);

    if (isNaN(addr) || addr < 0 || addr > 65535) {
      throw new Error(`[TitanGuardian] Invalid 16-bit register address for '${key}': ${rawAddr} (Must be 0 - 65,535)`);
    }

    // 1. Check Protected System Range (0 - 99)
    if (!allowSystem && addr >= PROTECTED_SYSTEM_RANGE.start && addr <= PROTECTED_SYSTEM_RANGE.end) {
      // Allow standard system names if they match standard conventions
      const isKnownSystemKey = ['ONLINE', 'HEARTBEAT', 'TOKEN', 'ROUTE', 'ERROR', 'NOTIFY', 'MASTER'].some(k => key.includes(k));
      if (!isKnownSystemKey) {
        const msg = `[TitanGuardian Warning] '${key}' is claiming protected system address ${addr} (0 - 99 is reserved for Titan Core/Routing/Alerts)`;
        if (options.strictSystem) {
          throw new Error(msg);
        } else {
          console.warn(msg);
        }
      }
    }

    // 2. Check for Duplicate Address Collision!
    if (claimedAddresses.has(addr)) {
      const existingKey = claimedAddresses.get(addr);
      const msg = `🚨 [TitanGuardian] ADDRESS COLLISION DETECTED! Register ${addr} is claimed by '${existingKey}' and cannot be reassigned to '${key}'!`;
      if (throwOnCollision) {
        throw new Error(msg);
      } else {
        console.error(msg);
      }
    }

    claimedAddresses.set(addr, key);
    validated[key] = addr;
  }

  // Freeze object to prevent runtime mutations
  return Object.freeze(validated);
}

/**
 * Dynamic Memory-Mapped Address Allocator for User Documents & Dynamic Nodes
 */
class AddressAllocator {
  constructor(options = {}) {
    this.startRange = options.startRange || 2001;
    this.endRange = options.endRange || 65535;
    this.allocated = new Map(); // address -> name/id
    this.nextAddress = this.startRange;
  }

  /**
   * Allocate next available collision-free register
   */
  allocate(name = 'anonymous') {
    while (this.allocated.has(this.nextAddress)) {
      this.nextAddress++;
      if (this.nextAddress > this.endRange) {
        this.nextAddress = this.startRange; // wrap around
      }
    }

    const addr = this.nextAddress++;
    this.allocated.set(addr, name);
    return addr;
  }

  /**
   * Claim a specific register address
   */
  claim(address, name = 'custom') {
    const addr = Number(address);
    if (this.allocated.has(addr)) {
      const existing = this.allocated.get(addr);
      throw new Error(`[TitanGuardian] Register ${addr} already claimed by '${existing}', cannot claim for '${name}'!`);
    }
    this.allocated.set(addr, name);
    return addr;
  }

  /**
   * Free an address for reuse
   */
  release(address) {
    return this.allocated.delete(Number(address));
  }

  /**
   * Check if an address is claimed
   */
  isClaimed(address) {
    return this.allocated.has(Number(address));
  }
}

module.exports = {
  defineAddresses,
  AddressAllocator,
  PROTECTED_SYSTEM_RANGE
};
