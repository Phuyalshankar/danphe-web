'use strict';

/**
 * 🛰️ TITAN SOVEREIGN MULTIMEDIA & NATIONWIDE P2P ENGINE (TitanSovereignMedia.js)
 * High-level API for Calling, Live Streaming, Hoster Tunnels, and Titan-Disk.
 * Directly maps to Titan Micro-Registers with zero WebRTC and zero external TURN.
 */

const TitanRegisters = require('../registers/TitanRegisters');

class TitanSovereignMedia {
  constructor(busClient = null) {
    this.bus = busClient;
  }

  setBusClient(client) {
    this.bus = client;
  }

  _writeReg(regKeyOrAddr, val) {
    const addr = TitanRegisters.resolve(regKeyOrAddr);
    if (this.bus && typeof this.bus.write === 'function') {
      this.bus.write(addr, val);
    }
    return addr;
  }

  // ─── 📞 Call API ─────────────────────────────────────────────────────────
  get call() {
    return {
      dial: (peerId, mode = 'p2p_mesh') => {
        // Register 100 (REG_CALL_STATE) = 2 (Calling/Ringing)
        this._writeReg(100, 2);
        if (this.bus && typeof this.bus.emitCommand === 'function') {
          this.bus.emitCommand(0x10, { peerId, mode }); // CMD_INVITE 0x10
        }
        return { peerId, mode, state: 'dialing' };
      },
      accept: () => {
        // Register 100 (REG_CALL_STATE) = 1 (Connected/Live)
        this._writeReg(100, 1);
        if (this.bus && typeof this.bus.emitCommand === 'function') {
          this.bus.emitCommand(0x11, {}); // CMD_RINGING/ACCEPT 0x11
        }
        return { state: 'connected' };
      },
      reject: () => {
        // Register 100 (REG_CALL_STATE) = 0 (Idle)
        this._writeReg(100, 0);
        if (this.bus && typeof this.bus.emitCommand === 'function') {
          this.bus.emitCommand(0x12, {}); // CMD_REJECT 0x12
        }
        return { state: 'idle' };
      },
      hangup: () => {
        // Register 100 (REG_CALL_STATE) = 0 (Idle)
        this._writeReg(100, 0);
        if (this.bus && typeof this.bus.emitCommand === 'function') {
          this.bus.emitCommand(0x13, {}); // CMD_HANGUP 0x13
        }
        return { state: 'idle' };
      }
    };
  }

  // ─── 📺 Stream API ───────────────────────────────────────────────────────
  get stream() {
    return {
      startBroadcast: (target = 'p2p') => {
        // Register 0x3071 (HW_ACT_P2P_LIVE) = 1
        this._writeReg(0x3071, 1);
        return { broadcast: true, target };
      },
      stopBroadcast: () => {
        this._writeReg(0x3071, 0);
        return { broadcast: false };
      },
      setAudioVu: (level) => {
        // Register 0x3034 (TEL_AUDIO_PEAK)
        this._writeReg(0x3034, Math.max(0, Math.min(100, level)));
      }
    };
  }

  // ─── 📡 Hoster API ───────────────────────────────────────────────────────
  get hoster() {
    return {
      openTunnel: (name = 'jhapa-node-1') => {
        // Register 0x3072 (REG_HOSTER_STATUS) = 1
        this._writeReg(0x3072, 1);
        return { hoster: name, tunnel: 'active' };
      },
      closeTunnel: () => {
        this._writeReg(0x3072, 0);
        return { tunnel: 'closed' };
      },
      getShareUrl: (host = '192.168.1.15', port = 9090) => {
        return `http://${host}:${port}/live`;
      }
    };
  }

  // ─── 💾 TitanDisk API ────────────────────────────────────────────────────
  get disk() {
    return {
      saveFile: (uri) => {
        // Register 0x3062 (HW_ACT_MEDIA_RECORD_CAM)
        this._writeReg(0x3062, 1);
        return { saved: true, uri };
      },
      fetchRemoteFile: (peerId, filename) => {
        // Register 0x3063 (HW_ACT_MEDIA_PICK)
        this._writeReg(0x3063, 1);
        return { fetching: true, peerId, filename };
      },
      sync: () => {
        // Register 0x3075 (HW_ACT_P2P_SWARM_SYNC)
        this._writeReg(0x3075, 1);
        return { synced: true };
      }
    };
  }
}

const sovereignMediaInstance = new TitanSovereignMedia();

module.exports = {
  TitanSovereignMedia,
  TitanMedia: sovereignMediaInstance
};
