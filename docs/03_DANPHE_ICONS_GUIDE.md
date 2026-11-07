# 🎨 DANPHE ICONS CATALOG & INTEGRATION GUIDE
═══════════════════════════════════════════════════════════════════════════════════════
**Specification:** Inbuilt 557 Vector Icon Engine for Danphe Native  
**Architecture:** 0ms GPU Canvas & Android PathParser Direct Vector Graphics  
**Asset Source:** `assets/danphe_icons.json` (557 Mathematical SVG Paths)

---

## 📑 TABLE OF CONTENTS
1. [Core Principles of the Vector Icon Engine](#1-core-principles-of-the-vector-icon-engine)
2. [Component Usage Contract (`<icon />` & Buttons)](#2-component-usage-contract-icon--buttons)
3. [Styling: Sizing, Colors & Tailwind Tokens](#3-styling-sizing-colors--tailwind-tokens)
4. [Master Categorized Icon Directory (Popular Glyphs)](#4-master-categorized-icon-directory-popular-glyphs)
5. [Compound Drawables in Native Buttons & Tabs](#5-compound-drawables-in-native-buttons--tabs)
6. [Troubleshooting & Verification](#6-troubleshooting--verification)

---

## 1. CORE PRINCIPLES OF THE VECTOR ICON ENGINE

Danphe Native embeds **557 mathematical SVG vector icons** directly into the binary runtime.
- **Zero Font Overhead:** Does not depend on large external icon font TTFs or web font downloads.
- **Zero PNG/Bitmap Assets:** All glyphs are stored as vector paths in `danphe_icons.json` (~180 KB total for all 557 icons).
- **GPU Accelerated:** Scaled and rasterized in-memory directly to Android `Canvas` via `PathParser.createPathFromPathData`.
- **Sub-Microsecond LRU Cache:** Once rendered at a given size and tint color, the resulting `BitmapDrawable` is cached in a high-speed memory cache (`LruCache<String, Drawable>`).

---

## 2. COMPONENT USAGE CONTRACT (`<icon />` & BUTTONS)

### 2.1 Standalone Icon Tag
To place an icon anywhere in a layout:
```jsx
<icon name="home_dashboard" className="w-5 h-5 text-cyan-300" />
```

### 2.2 Inside Interactive Buttons
When placed inside a `<button>`, `TitanCompiler` extracts the icon name and binds it to the button's native compound drawable:
```jsx
<button tx={SYS_ROUTE} txValue={0} className="px-3 py-1.5 rounded-xl ...">
  <icon name="bell" className="w-4 h-4 text-cyan-300" />
  <span>Reception</span>
</button>
```

Alternatively, you can provide the icon name directly as a property:
```jsx
<button icon="bell" tx={SYS_ROUTE} txValue={0} className="...">
  <span>Reception</span>
</button>
```

### 2.3 Inside Navigation Drawer Menu Items
For rich navigation menu rows, use a clickable `div` with an icon badge:
```jsx
<div action="nav:AdminDashboard" className="w-full p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-row items-center justify-between cursor-pointer">
  <div className="flex flex-row items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
      <icon name="home_dashboard" className="w-4 h-4 text-cyan-300" />
    </div>
    <div className="flex flex-col">
      <span className="text-xs font-black text-white">Dashboard</span>
      <span className="text-[10px] text-slate-400">Live Telemetry</span>
    </div>
  </div>
  <icon name="arrow_right" className="w-3.5 h-3.5 text-slate-500" />
</div>
```

---

## 3. STYLING: SIZING, COLORS & TAILWIND TOKENS

### 3.1 Dimensions
Standard Tailwind sizing classes map directly to device-independent pixels (dp):
- `w-3 h-3`: 12dp (Sub-caption indicators)
- `w-3.5 h-3.5`: 14dp (Compact badges)
- `w-4 h-4`: 16dp (Standard button & tab icons)
- `w-5 h-5`: 20dp (Primary navigation headers)
- `w-6 h-6`: 24dp (Large feature cards)
- `w-8 h-8`: 32dp (Hero status icons)

### 3.2 Colors
Colors map to hex values and dark/light theme tokens:
- `text-white`: `#FFFFFF`
- `text-cyan-300` / `text-cyan-400`: `#22D3EE` / `#67E8F9` (Titan cyan)
- `text-emerald-300` / `text-emerald-400`: `#10B981` / `#34D399` (Online / Success / Occupied)
- `text-amber-300` / `text-amber-400`: `#F59E0B` / `#FBBF24` (Dining / Warning / Pending)
- `text-rose-300` / `text-rose-400`: `#F43F5E` / `#FB7185` (Alerts / Danger / Emergency)
- `text-indigo-300` / `text-indigo-400`: `#6366F1` / `#818CF8` (Admin / Module)
- `text-purple-300` / `text-purple-400`: `#A855F7` / `#C084FC` (QR / Camera)
- `text-slate-400` / `text-slate-500`: `#94A3B8` / `#64748B` (Standby / Neutral)

---

## 4. MASTER CATEGORIZED ICON DIRECTORY (POPULAR GLYPHS)

### Navigation, System & Controls
- `home_dashboard`: Master overview dashboard house & telemetry
- `menu_hamburger`: Navigation drawer hamburger menu toggle
- `arrow_left` / `arrow_right`: Back and forward navigation chevrons
- `close`: Dismiss and modal close "X"
- `plus`: Add new entity (e.g. Add Room, Add Dish)
- `settings_gear`: Hardware and system settings gear
- `padlock_unlocked`: Unlocked door and security perimeter
- `shield_check`: Super Admin status and verified security perimeter
- `shield_alert`: Security breach alert shield

### Hotel, Hospitality & Dining
- `bell` / `intercom_bell`: Reception front desk bell
- `key`: Hotel room door electronic key card
- `coffee_cup_hot`: Digital dining menu, restaurant & coffee
- `glass_water_cup`: Bar & beverage service
- `printer`: Thermal receipt printer & QR badge generator
- `credit_card`: Front desk billing, POS & revenue tracking

### Telecom, Audio & Intercom Dispatch
- `idle_phone`: Standby room intercom terminal
- `active_call`: Active 2-way audio call stream
- `hangup_call`: Call disconnect / line hangup
- `phone_ring`: Incoming ringing audio line
- `megaphone_bullhorn`: PTT all-call broadcast operator
- `microphone_audio`: Hardware audio microphone capture
- `microphone_mute_slash`: Hardware microphone muted
- `speakerphone`: Intercom hands-free speaker output
- `volume_high_3_wave` / `volume_mute_x`: Master audio gain levels

### Media, Camera & CCTV Feeds
- `video_camera_hd`: High definition security CCTV camera
- `video_camera_live`: Live camera photo capture
- `image_media` / `image`: Gallery picture / photo picker
- `video`: Video playback recorder
- `camera_flip`: Switch front/back camera sensor
- `qr_code`: QR code matrix scanner & check-in badge

### Connectivity & Sensors
- `wifi_full` / `wifi`: Full signal wireless connectivity
- `wifi_off`: Disconnected offline status
- `smartphone`: Mobile device sensor
- `radio_portable`: Industrial wireless audio transceiver

---

## 5. COMPOUND DRAWABLES IN NATIVE BUTTONS & TABS

In `ButtonBuilder.kt`, compound drawables are managed as follows:

1. **Tab Buttons:**  
   Identified by action containing `10:`, `SYS_ROUTE`, or `bus:write:10:`.
   - The icon is set on **top** of the text:  
     `setCompoundDrawablesWithIntrinsicBounds(null, drawable, null, null)`
   - Padding between icon and text is set to `2dp`.
2. **Standard Buttons:**  
   - The icon is set on the **left/start** of the text:  
     `setCompoundDrawablesWithIntrinsicBounds(drawable, null, null, null)`
   - Padding between icon and text is set to `6dp`.
3. **Icon-Only Buttons (e.g. Back & Close):**  
   - The text is empty; the icon is set directly via:  
     `setCompoundDrawablesWithIntrinsicBounds(drawable, null, null, null)`

---

## 6. TROUBLESHOOTING & VERIFICATION

- **Icon Not Rendering:**  
  1. Check icon name against `DanpheIcons.getIcon(name)`. Both underscore and hyphen formats are supported (e.g., `home_dashboard` or `home-dashboard`).
  2. Ensure the parent container is not applying `w-0` or `h-0` layout parameters.
- **Icon Sizing Too Large:**  
  Verify that `IconBuilder.kt` does not have a hardcoded `minimumWidth = 32dp`. Sizing should adhere strictly to the CSS `w-X h-X` classes.
