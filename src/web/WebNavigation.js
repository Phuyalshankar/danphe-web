'use strict';

/**
 * 🌐 WebNavigation v1.0 — Universal Web Routing & Drawer Overlay Engine
 */
class WebNavigation {
    static getDrawerHTML() {
        return `
    <!-- 🌐 Web Slide-Over Navigation Drawer Overlay & Backdrop -->
    <div id="dolphin-web-drawer-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); opacity: 0; pointer-events: none; transition: opacity 0.3s ease; z-index: 99998;" onclick="window.closeWebDrawer && window.closeWebDrawer()"></div>
    <div id="dolphin-web-drawer" style="display:none;">
        
        <!-- Drawer Header -->
        <div style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #1e293b; flex-shrink: 0;">
            <div style="display: flex; flex-direction: row; align-items: center; gap: 8px;">
                <span style="font-size: 24px;">🐬</span>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 16px; font-weight: 800; color: #fff;">Dolphin Navigation</span>
                    <span style="font-size: 10px; font-weight: 700; color: #38bdf8; font-family: monospace;">UNIVERSAL SUITE</span>
                </div>
            </div>
            <button onclick="window.closeWebDrawer && window.closeWebDrawer()" style="background: #1e293b; border: 1px solid #334155; color: #94a3b8; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>

        <!-- Scrollable Navigation Items Container -->
        <div style="display: flex; flex-direction: column; gap: 10px; overflow-y: auto; flex: 1; padding-right: 4px; padding-bottom: 30px; -webkit-overflow-scrolling: touch;">
            <button onclick="window.DolphinWebNavigate('Home')" data-action="nav:Home" style="text-align: left; background: #1e293b; color: #fff; border: 1px solid #334155; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🏠 1. Dashboard Overview</button>
            <button onclick="window.DolphinWebNavigate('CameraTest')" data-action="nav:CameraTest" style="text-align: left; background: #881337; color: #fff; border: 1px solid #f43f5e; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">📷 2. Camera & Media Hardware</button>
            <button onclick="window.DolphinWebNavigate('AudioTest')" data-action="nav:AudioTest" style="text-align: left; background: #7c2d12; color: #fff; border: 1px solid #fb923c; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🎙️ 3. Audio & Mic Recorder</button>
            <button onclick="window.DolphinWebNavigate('StoreTest')" data-action="nav:StoreTest" style="text-align: left; background: #78350f; color: #fff; border: 1px solid #f59e0b; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">⚡ 4. NanoStore State Suite</button>
            <button onclick="window.DolphinWebNavigate('HardwareTest')" data-action="nav:HardwareTest" style="text-align: left; background: #1e1b4b; color: #fff; border: 1px solid #6366f1; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🔌 5. Hardware API Suite</button>
            <button onclick="window.DolphinWebNavigate('CssTest')" data-action="nav:CssTest" style="text-align: left; background: #14532d; color: #fff; border: 1px solid #22c55e; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🎨 6. Comprehensive CSS Showcase</button>
            <button onclick="window.DolphinWebNavigate('GradientTest')" data-action="nav:GradientTest" style="text-align: left; background: #064e3b; color: #fff; border: 1px solid #10b981; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🌈 7. Native Gradients & Banners</button>
            <button onclick="window.DolphinWebNavigate('AnimationTest')" data-action="nav:AnimationTest" style="text-align: left; background: #701a75; color: #fff; border: 1px solid #d946ef; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🎬 8. CSS Animations Showcase</button>
            <button onclick="window.DolphinWebNavigate('GlassGlow')" data-action="nav:GlassGlow" style="text-align: left; background: #581c87; color: #fff; border: 1px solid #a855f7; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🔮 9. Glass & Glow Showcase</button>
            <button onclick="window.DolphinWebNavigate('PluginTest')" data-action="nav:PluginTest" style="text-align: left; background: #312e81; color: #fff; border: 1px solid #818cf8; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🔌 10. Kt Plugin Suite</button>
            <button onclick="window.DolphinWebNavigate('MusicPlayer')" data-action="nav:MusicPlayer" style="text-align: left; background: #1e3a8a; color: #fff; border: 1px solid #3b82f6; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">🎵 11. Music Player Suite</button>
            <button onclick="window.DolphinWebNavigate('FormTest')" data-action="nav:FormTest" style="text-align: left; background: #065f46; color: #fff; border: 1px solid #10b981; padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;">📝 12. Form & Input Suite</button>
        </div>
    </div>
        `;
    }

    static getBottomDrawerHTML() {
        return `
    <!-- 🌐 Web Slide-Up Bottom Drawer / Bottom Sheet Overlay -->
    <div id="dolphin-web-bottom-drawer-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity 0.3s ease; z-index: 99998;" onclick="window.closeBottomDrawer && window.closeBottomDrawer()"></div>
    <div id="dolphin-web-bottom-drawer" style="position: fixed; bottom: 0; left: 50%; transform: translate(-50%, 100%); width: 100%; max-width: 480px; max-height: 60vh; overflow-y: auto; background: #0b0f19; border: 1px solid #1e293b; border-bottom: none; border-radius: 24px 24px 0 0; transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); z-index: 99999; display: flex; flex-direction: column; padding: 20px 16px 28px 16px; box-shadow: 0 -20px 50px rgba(0,0,0,0.7);">
        <!-- Drag Handle Indicator -->
        <div style="width: 48px; height: 5px; background: #334155; border-radius: 999px; margin: 0 auto 16px auto; cursor: pointer;" onclick="window.closeBottomDrawer && window.closeBottomDrawer()"></div>
        <div id="dolphin-web-bottom-drawer-content" style="width: 100%;"></div>
    </div>
        `;
    }

    static getClientScript() {
        return `
        window.openWebDrawer = function() {
          var d = document.querySelector('[data-screen="MainDrawer"], [data-screen*="Drawer"], #dolphin-web-drawer');
          var b = document.getElementById('dolphin-web-drawer-backdrop');
          if (d) {
            d.style.setProperty('display', 'flex', 'important');
            d.style.setProperty('transform', 'translateX(0)', 'important');
            d.classList.add('drawer-open');
          }
          if (b) {
            b.style.setProperty('opacity', '1', 'important');
            b.style.setProperty('pointer-events', 'auto', 'important');
            b.classList.add('drawer-open');
          }
        };
        window.closeWebDrawer = function() {
          var d = document.querySelector('[data-screen="MainDrawer"], [data-screen*="Drawer"], #dolphin-web-drawer');
          var b = document.getElementById('dolphin-web-drawer-backdrop');
          if (d) {
            d.style.setProperty('transform', 'translateX(-100%)', 'important');
            d.classList.remove('drawer-open');
          }
          if (b) {
            b.style.setProperty('opacity', '0', 'important');
            b.style.setProperty('pointer-events', 'none', 'important');
            b.classList.remove('drawer-open');
          }
        };
        window.openBottomDrawer = function(screenName) {
          var d = document.getElementById('dolphin-web-bottom-drawer');
          var b = document.getElementById('dolphin-web-bottom-drawer-backdrop');
          var c = document.getElementById('dolphin-web-bottom-drawer-content');
          if (screenName && window.DolphinRenderScreenContent && c) {
            window.DolphinRenderScreenContent(screenName, c);
          }
          if (d) {
            d.style.setProperty('transform', 'translate(-50%, 0)', 'important');
            d.classList.add('drawer-open');
          }
          if (b) {
            b.style.setProperty('opacity', '1', 'important');
            b.style.setProperty('pointer-events', 'auto', 'important');
            b.classList.add('drawer-open');
          }
        };
        window.closeBottomDrawer = function() {
          var d = document.getElementById('dolphin-web-bottom-drawer');
          var b = document.getElementById('dolphin-web-drawer-backdrop');
          if (d) {
            d.style.setProperty('transform', 'translate(-50%, 100%)', 'important');
            d.classList.remove('drawer-open');
          }
          if (b) {
            b.style.setProperty('opacity', '0', 'important');
            b.style.setProperty('pointer-events', 'none', 'important');
            b.classList.remove('drawer-open');
          }
        };
        window.DolphinWebNavigate = function(screenTarget) {
          if (!screenTarget) return;
          if (window.closeWebDrawer) window.closeWebDrawer();
          if (window.closeBottomDrawer) window.closeBottomDrawer();
          var lowerTarget = String(screenTarget).toLowerCase().trim();
          var targetFile = lowerTarget;
          if (lowerTarget === 'home' || lowerTarget === 'homescreen') {
            targetFile = 'index.html';
          } else if (!lowerTarget.endsWith('screen') && lowerTarget !== 'index.html') {
            targetFile = lowerTarget + 'screen.html';
          } else if (!lowerTarget.endsWith('.html')) {
            targetFile = lowerTarget + '.html';
          }

          if (window.location.protocol === 'file:' || window.location.pathname.endsWith('.html')) {
            window.location.href = './' + targetFile;
          } else {
            var targetRoute = lowerTarget === 'home' ? '/' : '/' + lowerTarget;
            window.location.href = targetRoute;
          }
        };
        `;
    }
}

module.exports = WebNavigation;
