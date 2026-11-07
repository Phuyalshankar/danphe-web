'use strict';

/**
 * 🎨 WebCSS v1.0 — High-Visibility 60 FPS CSS Motion Engine
 * Dramatic, High-Contrast Keyframe Animations & Micro-Interactions
 */
class WebCSS {
    static getBaseStyles() {
        return `
        :root {
            --color-primary: oklch(0.5 0.14 220);
            --color-secondary: oklch(0.58 0.1 180);
            --color-success: oklch(0.67 0.22 145);
            --color-danger: oklch(0.62 0.28 25);
            --color-warning: oklch(0.84 0.18 80);
            --color-surface: rgba(15, 23, 42, 0.75);
            --color-text: #f8fafc;
            --theme-primary: oklch(0.5 0.14 220);
            --radius-xl: 12px;
            --radius-2xl: 20px;
        }

        /* 🐬 DolphinCSS 2.0 Core Universal Tokens Engine */
        html, body {
            min-height: 100vh;
            color: #f8fafc !important;
            background: linear-gradient(rgba(8, 14, 28, 0.40), rgba(8, 14, 28, 0.50)), url('/assets/sagarmatha.jpg') no-repeat center center fixed !important;
            background-size: cover !important;
            background-attachment: fixed !important;
        }

        /* 🏔️ Majestic Mount Everest (Sagarmatha) Real High-Res Photography Wallpaper */
        body.bg-everest, .bg-everest, body.bg-sagarmatha-photo, .bg-sagarmatha-photo {
            background: linear-gradient(rgba(8, 14, 28, 0.40), rgba(8, 14, 28, 0.50)), url('/assets/sagarmatha.jpg') no-repeat center center fixed !important;
            background-size: cover !important;
            background-attachment: fixed !important;
            color: #ffffff !important;
        }

        /* 🇳🇵 Authentic Nepali Himalayan Heritage Gradients */
        body.bg-danphe, .bg-danphe {
            background: linear-gradient(45deg, #10b981 0%, #3b82f6 25%, #8b5cf6 50%, #f97316 75%, #ef4444 100%) fixed !important;
            color: #ffffff !important;
        }
        body.bg-laligurans, .bg-laligurans {
            background: linear-gradient(135deg, #be123c 0%, #e11d48 50%, #fbcfe8 100%) !important;
            color: #ffffff !important;
        }
        body.bg-sagarmatha, .bg-sagarmatha {
            background: linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #38bdf8 100%) !important;
            color: #ffffff !important;
        }
        body.bg-tilicho, .bg-tilicho {
            background: linear-gradient(135deg, #042f2e 0%, #0d9488 50%, #5eead4 100%) !important;
            color: #ffffff !important;
        }
        body.bg-munal, .bg-munal {
            background: linear-gradient(135deg, #2e1065 0%, #6b21a8 50%, #f59e0b 100%) !important;
            color: #ffffff !important;
        }
        body.bg-mustang, .bg-mustang {
            background: linear-gradient(135deg, #451a03 0%, #9a3412 50%, #fbbf24 100%) !important;
            color: #ffffff !important;
        }

        /* 🏔️ Majestic Mount Everest (Sagarmatha) Real High-Res Photography Wallpaper */
        body.bg-sagarmatha-photo, .bg-sagarmatha-photo, body.bg-everest, .bg-everest {
            background: linear-gradient(rgba(8, 14, 28, 0.40), rgba(8, 14, 28, 0.50)), url('/assets/sagarmatha.jpg') no-repeat center center fixed !important;
            background-size: cover !important;
            color: #ffffff !important;
        }

        /* ☀️ Authentic Himalayan Morning Light Mode (Ice-White Glassmorphism) */
        body.bg-light, .bg-light, .theme-light, [data-theme-mode="light"] {
            background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 40%, #f1f5f9 100%) fixed !important;
            color: #0f172a !important;
        }

        .theme-light .card.glass, body.bg-light .card.glass, [data-theme-mode="light"] .card.glass {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.72) 100%) !important;
            backdrop-filter: blur(28px) !important;
            -webkit-backdrop-filter: blur(28px) !important;
            border: 1px solid rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.10), inset 0 1px 2px 0 #ffffff, 0 0 25px rgba(56, 189, 248, 0.20) !important;
        }

        .theme-light .card.outlined, body.bg-light .card.outlined, [data-theme-mode="light"] .card.outlined {
            background: rgba(255, 255, 255, 0.82) !important;
            border: 1px solid rgba(203, 213, 225, 0.8) !important;
            color: #0f172a !important;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05) !important;
        }

        .theme-light .text-white, body.bg-light .text-white, [data-theme-mode="light"] .text-white {
            color: #0f172a !important;
        }
        .theme-light .text-slate-300, body.bg-light .text-slate-300, [data-theme-mode="light"] .text-slate-300 {
            color: #334155 !important;
        }
        .theme-light .text-slate-400, body.bg-light .text-slate-400, [data-theme-mode="light"] .text-slate-400 {
            color: #475569 !important;
        }
        .theme-light .text-slate-500, body.bg-light .text-slate-500, [data-theme-mode="light"] .text-slate-500 {
            color: #64748b !important;
        }

        .theme-light input, body.bg-light input, [data-theme-mode="light"] input {
            color: #0f172a !important;
            background: rgba(255, 255, 255, 0.95) !important;
            border: 1px solid #cbd5e1 !important;
        }
        .theme-light input::placeholder, body.bg-light input::placeholder {
            color: #94a3b8 !important;
        }

        .theme-light .filled.fx-crystal, body.bg-light .filled.fx-crystal {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(241, 245, 249, 0.85) 100%) !important;
            color: #0f172a !important;
            border: 1px solid rgba(203, 213, 225, 0.9) !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
        }
        .theme-light .filled.fx-neon, body.bg-light .filled.fx-neon {
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
            color: #ffffff !important;
            border: 1px solid #38bdf8 !important;
            box-shadow: 0 6px 18px rgba(2, 132, 199, 0.35) !important;
        }
        .theme-light .filled.fx-aurora, body.bg-light .filled.fx-aurora {
            background: linear-gradient(135deg, #059669 0%, #2563eb 50%, #7c3aed 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35) !important;
        }
        .theme-light .filled.fx-flare, body.bg-light .filled.fx-flare {
            background: linear-gradient(135deg, #e11d48 0%, #ea580c 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(225, 29, 72, 0.35) !important;
        }
        .theme-light .filled.fx-aqua, body.bg-light .filled.fx-aqua {
            background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(8, 145, 178, 0.35) !important;
        }
        .theme-light .filled.fx-cyber, body.bg-light .filled.fx-cyber {
            background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(124, 58, 237, 0.35) !important;
        }
        .theme-light .filled.fx-holo, body.bg-light .filled.fx-holo {
            background: linear-gradient(135deg, #db2777 0%, #7c3aed 100%) !important;
            color: #ffffff !important;
            box-shadow: 0 6px 18px rgba(219, 39, 119, 0.35) !important;
        }
        .theme-light .filled.fx-metal, body.bg-light .filled.fx-metal {
            background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
            color: #ffffff !important;
        }

        .card {
            border-radius: 20px !important;
            transition: all 0.3s ease !important;
        }

        /* 🧊 DolphinCSS Authentic Translucent Glass Engine with Rich Darker Opacity */
        .glass, .card.glass {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(10, 16, 32, 0.82) !important;
            backdrop-filter: blur(28px) !important;
            -webkit-backdrop-filter: blur(28px) !important;
            border: 1px solid rgba(255, 255, 255, 0.18) !important;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3) !important;
        }

        .glass.glow, .card.glass.glow {
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.35), 0 0 25px 2px rgba(56, 189, 248, 0.25) !important;
        }

        /* 🔮 ---- DOLPHINCSS 2.0 SPECIAL VARIANT FX ENGINE ---- */
        .fx-crystal, .crystal-glass {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%), rgba(255, 255, 255, 0.08) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border: 1px solid rgba(255, 255, 255, 0.45) !important;
            box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6) !important;
            color: #ffffff !important;
        }
        .fx-crystal:hover, .crystal-glass:hover {
            border-color: rgba(255, 255, 255, 0.75) !important;
            box-shadow: 0 12px 36px 0 rgba(255, 255, 255, 0.3), inset 0 1px 3px rgba(255, 255, 255, 0.8) !important;
        }

        .fx-neon, .neon-flow {
            background: rgba(10, 16, 30, 0.85) !important;
            border: 1px solid #38bdf8 !important;
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(56, 189, 248, 0.25) !important;
            color: #ffffff !important;
            text-shadow: 0 0 8px rgba(56, 189, 248, 0.8) !important;
        }
        .fx-neon:hover, .neon-flow:hover {
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.9), inset 0 0 15px rgba(56, 189, 248, 0.4) !important;
        }

        .fx-aurora, .frosted-aurora {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(59, 130, 246, 0.4) 50%, rgba(147, 51, 234, 0.4) 100%), rgba(10, 16, 32, 0.8) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(52, 211, 153, 0.5) !important;
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
        }
        .fx-aurora:hover, .frosted-aurora:hover {
            box-shadow: 0 12px 35px rgba(59, 130, 246, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.5) !important;
        }

        .fx-cyber, .cyber-neon {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.35) 0%, rgba(168, 85, 247, 0.35) 100%), rgba(15, 23, 42, 0.88) !important;
            border: 1px solid rgba(56, 189, 248, 0.7) !important;
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.45), inset 0 0 12px rgba(56, 189, 248, 0.25) !important;
            color: #ffffff !important;
        }
        .fx-cyber:hover, .cyber-neon:hover {
            box-shadow: 0 0 30px rgba(168, 85, 247, 0.7), inset 0 0 16px rgba(56, 189, 248, 0.4) !important;
        }

        .fx-holo, .holo-matrix {
            background: radial-gradient(circle at 10% 20%, rgba(56, 189, 248, 0.45) 0%, transparent 50%), radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.45) 0%, transparent 50%), rgba(15, 23, 42, 0.85) !important;
            border: 1px solid rgba(236, 72, 153, 0.5) !important;
            box-shadow: 0 0 20px rgba(236, 72, 153, 0.35), 0 0 10px rgba(56, 189, 248, 0.3) !important;
            color: #ffffff !important;
        }
        .fx-holo:hover, .holo-matrix:hover {
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.6), 0 0 15px rgba(56, 189, 248, 0.5) !important;
        }

        .fx-flare, .solar-flare {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.4) 0%, rgba(245, 158, 11, 0.4) 100%), rgba(15, 23, 42, 0.88) !important;
            border: 1px solid rgba(245, 158, 11, 0.6) !important;
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.45), inset 0 0 10px rgba(239, 68, 68, 0.25) !important;
            color: #ffffff !important;
        }
        .fx-flare:hover, .solar-flare:hover {
            box-shadow: 0 0 30px rgba(245, 158, 11, 0.7), inset 0 0 15px rgba(239, 68, 68, 0.4) !important;
        }

        .fx-aqua, .aqua-depth {
            background: linear-gradient(160deg, rgba(6, 182, 212, 0.4) 0%, rgba(14, 116, 144, 0.45) 100%), rgba(4, 20, 35, 0.88) !important;
            border: 1px solid rgba(6, 182, 212, 0.6) !important;
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25) !important;
            color: #ffffff !important;
        }
        .fx-aqua:hover, .aqua-depth:hover {
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.7) !important;
        }

        .fx-nebula, .galactic-nebula {
            background: radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.5) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(244, 63, 94, 0.5) 0%, transparent 60%), rgba(10, 8, 28, 0.88) !important;
            border: 1px solid rgba(139, 92, 246, 0.6) !important;
            box-shadow: 0 0 25px rgba(139, 92, 246, 0.45) !important;
            color: #ffffff !important;
        }
        .fx-nebula:hover, .galactic-nebula:hover {
            box-shadow: 0 0 35px rgba(139, 92, 246, 0.75) !important;
        }

        .fx-metal, .liquid-mercury {
            background: linear-gradient(135deg, rgba(148, 163, 184, 0.45) 0%, rgba(71, 85, 105, 0.45) 50%, rgba(203, 213, 225, 0.4) 100%), rgba(15, 23, 42, 0.88) !important;
            border: 1px solid rgba(203, 213, 225, 0.6) !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.6) !important;
            color: #ffffff !important;
        }
        .fx-metal:hover, .liquid-mercury:hover {
            border-color: rgba(255, 255, 255, 0.8) !important;
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.6), inset 0 1px 3px rgba(255, 255, 255, 0.8) !important;
        }

        .fx-rainbow, .psychedelic-dream {
            background: linear-gradient(45deg, rgba(239, 68, 68, 0.35) 0%, rgba(245, 158, 11, 0.35) 25%, rgba(16, 185, 129, 0.35) 50%, rgba(59, 130, 246, 0.35) 75%, rgba(168, 85, 247, 0.35) 100%), rgba(10, 16, 32, 0.88) !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
        }
        .fx-rainbow:hover, .psychedelic-dream:hover {
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.5) !important;
        }

        .fx-glass, .glass-wave {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(10, 16, 32, 0.82) !important;
            backdrop-filter: blur(28px) !important;
            -webkit-backdrop-filter: blur(28px) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.3) !important;
            color: #ffffff !important;
        }

        .fx-float, .quantum-float {
            box-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.25) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease !important;
        }
        .fx-float:hover, .quantum-float:hover {
            transform: translateY(-4px) !important;
            box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.45) !important;
        }

        .card.outlined {
            border: 1px solid rgba(255, 255, 255, 0.14) !important;
            background: rgba(5, 10, 22, 0.78) !important;
            backdrop-filter: blur(18px) !important;
            -webkit-backdrop-filter: blur(18px) !important;
        }

        .filled {
            border-radius: 12px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: 700 !important;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            cursor: pointer !important;
            border: 1px solid transparent !important;
            text-decoration: none !important;
            user-select: none !important;
        }
        .filled:active {
            transform: scale(0.96) !important;
        }

        .filled.primary {
            background: oklch(0.5 0.14 220) !important;
            color: #ffffff !important;
        }
        .filled.primary:hover {
            background: oklch(0.55 0.15 220) !important;
        }

        .filled.secondary {
            background: rgba(51, 65, 85, 0.9) !important;
            color: #f8fafc !important;
            border-color: rgba(71, 85, 105, 0.6) !important;
        }
        .filled.secondary:hover {
            background: rgba(71, 85, 105, 0.9) !important;
        }

        .filled.success {
            background: oklch(0.67 0.22 145) !important;
            color: #022c22 !important;
        }
        .filled.success:hover {
            background: oklch(0.72 0.22 145) !important;
        }

        .filled.danger {
            background: oklch(0.62 0.28 25) !important;
            color: #ffffff !important;
        }
        .filled.danger:hover {
            background: oklch(0.68 0.28 25) !important;
        }

        .filled.warning {
            background: oklch(0.84 0.18 80) !important;
            color: #1c1917 !important;
        }

        .outlined {
            background: transparent !important;
            border-radius: 12px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
            user-select: none !important;
        }
        .outlined.primary {
            border: 2px solid oklch(0.5 0.14 220) !important;
            color: #38bdf8 !important;
        }
        .outlined.primary:hover {
            background: rgba(56, 189, 248, 0.15) !important;
            color: #ffffff !important;
        }
        .outlined.success {
            border: 2px solid oklch(0.67 0.22 145) !important;
            color: #34d399 !important;
        }

        .sm, .btn-sm { padding: 6px 14px !important; font-size: 12px !important; }
        .md, .btn-md { padding: 10px 18px !important; font-size: 14px !important; }
        .lg, .btn-lg { padding: 14px 24px !important; font-size: 15px !important; }

        .glow {
            box-shadow: 0 0 15px 3px rgba(56, 189, 248, 0.35) !important;
            transition: all 0.3s ease !important;
        }
        .glow:hover {
            box-shadow: 0 0 25px 6px rgba(56, 189, 248, 0.6) !important;
            transform: translateY(-2px) !important;
        }

        .filled.danger.glow {
            box-shadow: 0 0 15px 3px rgba(244, 63, 94, 0.35) !important;
        }
        .filled.danger.glow:hover {
            box-shadow: 0 0 25px 6px rgba(244, 63, 94, 0.6) !important;
        }

        .filled.success.glow {
            box-shadow: 0 0 15px 3px rgba(16, 185, 129, 0.35) !important;
        }
        .filled.success.glow:hover {
            box-shadow: 0 0 25px 6px rgba(16, 185, 129, 0.6) !important;
        }

        .badge-pill, .badge {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 4px 10px !important;
            border-radius: 9999px !important;
            letter-spacing: 0.5px !important;
        }
        .badge.primary { background: rgba(56, 189, 248, 0.2) !important; color: #38bdf8 !important; border: 1px solid rgba(56, 189, 248, 0.4) !important; }
        .badge.success { background: rgba(16, 185, 129, 0.2) !important; color: #34d399 !important; border: 1px solid rgba(16, 185, 129, 0.4) !important; }
        .badge.danger { background: rgba(244, 63, 94, 0.2) !important; color: #fb7185 !important; border: 1px solid rgba(244, 63, 94, 0.4) !important; }
        .badge.warning { background: rgba(245, 158, 11, 0.2) !important; color: #fbbf24 !important; border: 1px solid rgba(245, 158, 11, 0.4) !important; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
            width: 100%; height: 100%; min-height: 100vh;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #f8fafc;
            -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
        }

        /* Sleek Cyberpunk Scrollbar */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #090d16; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 9999px; border: 2px solid #090d16; }
        ::-webkit-scrollbar-thumb:hover { background: #3b82f6; }

        /* Explicit Rounded Border Radii */
        .rounded, .rounded-md { border-radius: 0.375rem !important; }
        .rounded-6, .rounded-8 { border-radius: 8px !important; }
        .rounded-lg, .rounded-10 { border-radius: 0.5rem !important; }
        .rounded-xl, .rounded-12 { border-radius: 0.75rem !important; }
        .rounded-14, .rounded-16, .rounded-2xl { border-radius: 1rem !important; }
        .rounded-20, .rounded-24, .rounded-3xl { border-radius: 1.5rem !important; }
        .rounded-32 { border-radius: 2rem !important; }
        .rounded-full { border-radius: 9999px !important; }

        /* Crisp Panel Border Rules */
        .border { border: 1px solid #1e293b !important; }
        .border-t { border-top: 1px solid #1e293b !important; }
        .border-b { border-bottom: 1px solid #1e293b !important; }
        .border-l { border-left: 1px solid #1e293b !important; }
        .border-r { border-right: 1px solid #1e293b !important; }
        .border-2 { border-width: 2px !important; }
        .border-0 { border: none !important; }

        .border-slate-700 { border-color: #334155 !important; }
        .border-slate-800 { border-color: #1e293b !important; }
        .border-slate-900 { border-color: #0f172a !important; }
        .border-sky-500 { border-color: #0ea5e9 !important; }
        .border-amber-500 { border-color: #f59e0b !important; }
        .border-purple-500 { border-color: #a855f7 !important; }
        .border-emerald-500 { border-color: #10b981 !important; }
        .border-rose-500 { border-color: #f43f5e !important; }

        /* Web Slide-Over Drawer Rules */
        #dolphin-web-drawer { transform: translateX(-100%) !important; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; }
        #dolphin-web-drawer.drawer-open { transform: translateX(0) !important; }
        #dolphin-web-drawer-backdrop { opacity: 0 !important; pointer-events: none !important; transition: opacity 0.3s ease !important; }
        #dolphin-web-drawer-backdrop.drawer-open { opacity: 1 !important; pointer-events: auto !important; }

        /* Glassmorphism Cards & Containers */
        .bg-slate-900 {
            background-color: rgba(15, 23, 42, 0.92) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border: 1px solid rgba(51, 65, 85, 0.6) !important;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;
        }

        /* Responsive Images & Video Sizing */
        img, video { max-width: 100% !important; height: auto; object-fit: cover; border-radius: 0.75rem; }
        .max-w-xs { max-width: 20rem !important; }
        .max-w-sm { max-width: 24rem !important; }
        .max-w-md { max-width: 28rem !important; }
        .max-w-lg { max-width: 32rem !important; }
        .max-w-xl { max-width: 36rem !important; }
        .max-w-2xl { max-width: 42rem !important; }
        .max-w-3xl { max-width: 48rem !important; }
        .max-w-4xl { max-width: 56rem !important; }
        .max-w-5xl { max-width: 64rem !important; }
        .max-w-6xl { max-width: 72rem !important; }
        .max-w-7xl { max-width: 80rem !important; }
        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        .w-48 { width: 12rem !important; }
        .w-64 { width: 16rem !important; }
        .w-80 { width: 20rem !important; }
        .w-96 { width: 24rem !important; }
        .h-48 { height: 12rem !important; }
        .h-64 { height: 16rem !important; }
        .h-80 { height: 20rem !important; }
        .h-96 { height: 24rem !important; }
        
        /* Floating Label & Form Styles */
        .floatinglabel-input, .form-floating .form-control, .floatinglabel input {
            width: 100% !important; min-height: 3.5rem !important; padding: 1.25rem 1rem 0.35rem 1rem !important; font-size: 1rem !important; border-radius: 0.75rem !important; box-sizing: border-box !important;
        }
        .floatinglabel-input.lg { min-height: 4rem !important; padding-top: 1.5rem !important; }
        .floatinglabel-label, .form-floating label {
            position: absolute !important; left: 0.85rem !important; top: 50% !important; transform: translateY(-50%) !important; pointer-events: none !important; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; transform-origin: 0 0 !important; margin: 0 !important; padding: 0 4px !important; border-radius: 4px !important; line-height: 1 !important;
        }

        /* Layout Helpers */
        .flex { display: flex; }
        .flex-row { display: flex !important; flex-direction: row !important; }
        .flex-col, .flex-column { display: flex !important; flex-direction: column !important; }
        .flex-col-center { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; }
        .flex-row-center { display: flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; }
        .items-center { align-items: center !important; }
        .justify-center { justify-content: center !important; }
        .justify-between { justify-content: space-between !important; }
        .flex-1 { flex: 1 1 0% !important; align-self: stretch !important; }
        .w-full { width: 100% !important; align-self: stretch !important; }
        .scrollable { overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; }

        /* Grid & Spacing */
        .grid { display: grid !important; }
        .grid-cols-1 { display: grid !important; grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
        .grid-cols-2 { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .grid-cols-3 { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        .grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        .grid-cols-5 { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
        .grid-cols-6 { display: grid !important; grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
        .grid-cols-12 { display: grid !important; grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
        .col-span-1 { grid-column: span 1 / span 1 !important; }
        .col-span-2 { grid-column: span 2 / span 2 !important; }
        .col-span-3 { grid-column: span 3 / span 3 !important; }
        .col-span-4 { grid-column: span 4 / span 4 !important; }
        .col-span-5 { grid-column: span 5 / span 5 !important; }
        .col-span-6 { grid-column: span 6 / span 6 !important; }
        .col-span-7 { grid-column: span 7 / span 7 !important; }
        .col-span-8 { grid-column: span 8 / span 8 !important; }
        .col-span-9 { grid-column: span 9 / span 9 !important; }
        .col-span-10 { grid-column: span 10 / span 10 !important; }
        .col-span-11 { grid-column: span 11 / span 11 !important; }
        .col-span-12 { grid-column: span 12 / span 12 !important; }
        .aspect-video { aspect-ratio: 16 / 9 !important; }
        .aspect-square { aspect-ratio: 1 / 1 !important; }
        .select-none { user-select: none !important; -webkit-user-select: none !important; }
        .gap-1 { gap: 4px !important; }
        .gap-1\.5 { gap: 6px !important; }
        .gap-2 { gap: 8px !important; }
        .gap-2\.5 { gap: 10px !important; }
        .gap-3 { gap: 12px !important; }
        .gap-4 { gap: 16px !important; }
        .gap-6 { gap: 24px !important; }
        .gap-8 { gap: 32px !important; }

        /* 🎬 ---- HIGH-VISIBILITY 60 FPS KEYFRAME ANIMATIONS ---- */
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping { 75%, 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.03); } }
        @keyframes heartbeat { 0%, 100% { transform: scale(1); } 20% { transform: scale(1.08); } 40% { transform: scale(0.96); } 60% { transform: scale(1.06); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        @keyframes tada { 0% { transform: scale(1) rotate(0deg); } 10%, 20% { transform: scale(0.9) rotate(-4deg); } 30%, 50%, 70%, 90% { transform: scale(1.12) rotate(4deg); } 40%, 60%, 80% { transform: scale(1.12) rotate(-4deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes headshake { 0% { transform: translateX(0); } 13% { transform: translateX(-10px) rotate(-3deg); } 37% { transform: translateX(8px) rotate(3deg); } 63% { transform: translateX(-5px) rotate(-2deg); } 87% { transform: translateX(3px) rotate(1deg); } 100% { transform: translateX(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideLeft { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes rotateIn { from { opacity: 0; transform: rotate(-180deg) scale(0.5); } to { opacity: 1; transform: rotate(0) scale(1); } }
        @keyframes flip { 0% { transform: perspective(600px) rotateY(0deg); } 50% { transform: perspective(600px) rotateY(180deg); } 100% { transform: perspective(600px) rotateY(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(217, 70, 239, 0.3); } 50% { transform: scale(1.02); box-shadow: 0 0 30px rgba(217, 70, 239, 0.9); } }

        /* Animation Utility Class Rules */
        .animate-spin { animation: spin 1s linear infinite !important; will-change: transform; }
        .animate-ping { animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite !important; will-change: transform; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important; will-change: transform, opacity; }
        .animate-heartbeat { animation: heartbeat 1.4s ease-in-out infinite !important; will-change: transform; }
        .animate-bounce { animation: bounce 1.2s ease-in-out infinite !important; will-change: transform; }
        .animate-tada { animation: tada 1.5s ease-in-out infinite !important; will-change: transform; }
        .animate-headshake { animation: headshake 1.8s ease-in-out infinite !important; will-change: transform; }
        .animate-slide-up, .slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; will-change: transform, opacity; }
        .animate-slide-down, .slide-down { animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; will-change: transform, opacity; }
        .animate-slide-left, .slide-left { animation: slideLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; will-change: transform, opacity; }
        .animate-slide-right, .slide-right { animation: slideRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards !important; will-change: transform, opacity; }
        .animate-zoom-in, .zoom-in { animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important; will-change: transform, opacity; }
        .animate-rotate-in { animation: rotateIn 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards !important; will-change: transform, opacity; }
        .animate-flip { animation: flip 3s linear infinite !important; will-change: transform; }
        .animate-shimmer { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: shimmer 2s infinite !important; }
        .animate-float { animation: float 3s ease-in-out infinite !important; will-change: transform; }
        .animate-breathe { animation: breathe 3s ease-in-out infinite !important; will-change: transform, box-shadow; }
        .framer-spring { animation: zoomIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards !important; will-change: transform, opacity; }
        .framer-bounce { animation: bounce 1.2s ease-in-out infinite !important; will-change: transform; }

        /* Micro-Interactions & Hover Lift */
        .transition, .transition-all { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .duration-200 { transition-duration: 200ms !important; }
        .duration-300 { transition-duration: 300ms !important; }
        .duration-500 { transition-duration: 500ms !important; }
        button, a, [data-action] { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; cursor: pointer; }
        button:hover, a:hover, [data-action]:hover {
            transform: translateY(-2px) scale(1.01) !important;
            filter: brightness(1.15) !important;
            box-shadow: 0 12px 24px -6px rgba(59, 130, 246, 0.35) !important;
        }
        button:active, a:active, [data-action]:active { transform: translateY(0) scale(0.97) !important; }

        /* 📐 ---- AUTO-LAYOUT ENGINE & FLEX / GRID PRIMITIVES ---- */
        .vstack, vstack { display: flex !important; flex-direction: column !important; width: 100%; box-sizing: border-box; }
        .hstack, hstack { display: flex !important; flex-direction: row !important; align-items: center; width: 100%; box-sizing: border-box; }
        .spacer, spacer { flex: 1 1 0% !important; align-self: stretch !important; min-width: 0; min-height: 0; }
        .divider, divider { display: block !important; width: 100% !important; height: 1px !important; background: rgba(51, 65, 85, 0.6) !important; margin: 0.5rem 0 !important; border: none !important; }
        .divider-v { display: inline-block !important; width: 1px !important; height: 100% !important; min-height: 1.5rem !important; background: rgba(51, 65, 85, 0.6) !important; margin: 0 0.5rem !important; border: none !important; }
        .container, container, .container-center { width: 100% !important; max-width: 1280px !important; margin-left: auto !important; margin-right: auto !important; padding-left: 1rem !important; padding-right: 1rem !important; box-sizing: border-box; }
        .auto-grid { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important; gap: 1rem !important; }
        .auto-grid-sm { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)) !important; gap: 0.75rem !important; }
        .auto-grid-lg { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important; gap: 1.5rem !important; }

        /* Alignment Utilities */
        .items-start { align-items: flex-start !important; }
        .items-end { align-items: flex-end !important; }
        .items-center { align-items: center !important; }
        .items-baseline { align-items: baseline !important; }
        .items-stretch { align-items: stretch !important; }

        .justify-start { justify-content: flex-start !important; }
        .justify-end { justify-content: flex-end !important; }
        .justify-center { justify-content: center !important; }
        .justify-between { justify-content: space-between !important; }
        .justify-around { justify-content: space-around !important; }
        .justify-evenly { justify-content: space-evenly !important; }

        .flex-wrap { flex-wrap: wrap !important; }
        .flex-nowrap { flex-wrap: nowrap !important; }
        .flex-grow { flex-grow: 1 !important; }
        .flex-shrink-0 { flex-shrink: 0 !important; }

        /* Sticky Navbars, Headers, and Fixed Bars */
        .sticky-top, .sticky-header {
            position: sticky !important; top: 0 !important; z-index: 50 !important;
            backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important;
            background: rgba(2, 6, 23, 0.85) !important; border-bottom: 1px solid #1e293b !important;
        }
        .sticky-bottom {
            position: sticky !important; bottom: 0 !important; z-index: 50 !important;
            backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important;
            background: rgba(2, 6, 23, 0.85) !important; border-top: 1px solid #1e293b !important;
        }
        .sticky-sidebar {
            position: sticky !important; top: 1rem !important; height: calc(100vh - 2rem) !important;
            overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
        }

        /* 📱 ---- RESPONSIVE AUTO-LAYOUT BREAKPOINTS ---- */
        /* Small devices (phones, 640px and up) */
        @media (min-width: 640px) {
            .sm\:flex-row { display: flex !important; flex-direction: row !important; }
            .sm\:flex-col { display: flex !important; flex-direction: column !important; }
            .sm\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .sm\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .sm\:hidden { display: none !important; }
            .sm\:block { display: block !important; }
            .sm\:inline-block { display: inline-block !important; }
        }

        /* Medium devices (tablets, 768px and up) */
        @media (min-width: 768px) {
            .md\:flex-row { display: flex !important; flex-direction: row !important; }
            .md\:flex-col { display: flex !important; flex-direction: column !important; }
            .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .md\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            .md\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
            .md\:p-8 { padding: 32px !important; }
            .md\:text-5xl { font-size: 48px !important; line-height: 1 !important; }
            .md\:hidden { display: none !important; }
            .md\:block { display: block !important; }
            .md\:inline-flex { display: inline-flex !important; }
        }

        /* Large devices (desktops, 1024px and up) */
        @media (min-width: 1024px) {
            .lg\:flex-row { display: flex !important; flex-direction: row !important; }
            .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            .lg\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
            .lg\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
            .lg\:block { display: block !important; }
            .lg\:hidden { display: none !important; }
        }

        /* Extra large devices (large desktops, 1280px and up) */
        @media (min-width: 1280px) {
            .xl\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            .xl\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
        }
        `;
    }
}

module.exports = WebCSS;
