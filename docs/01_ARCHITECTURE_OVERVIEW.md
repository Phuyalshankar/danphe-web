# 🏛️ DANPHE NATIVE & TITAN ARCHITECTURE BLUEPRINT
═══════════════════════════════════════════════════════════════════════════════════════
**Version:** 3.0.0 (Production Architecture & Hardware Blueprint Reference)
**Dynamic DSL:** `reg <scope>:: <var1>, <var2>;` Support
**Address Space:** 65,536 Registers × 256 Carrier Slots = 16.7M Universal Slots
**Ingress Firewall:** Zone 0-3 System HAL Protected from Wi-Fi Inbound Writes  
**Target Environments:** Android Native (Kotlin), Samsung ThorVG (C++), Web (ES6)  
**Protocol Specification:** Titan Universal Hardware Bus (SISO 16-Bit Memory-Mapped)

---



---

## 📐 MASTER A4 ARCHITECTURAL BLUEPRINT
The master architectural blueprint diagrams the entire end-to-end data flow, UI flow, and register flow:
- **Vector Blueprint (SVG):** [DANPHE_NATIVE_A4_ARCHITECTURE_BLUEPRINT.svg](./DANPHE_NATIVE_A4_ARCHITECTURE_BLUEPRINT.svg)
- **High-Resolution Poster (JPG):** [danphe_titan_master_blueprint_a4.jpg](./danphe_titan_master_blueprint_a4.jpg)

## 📑 TABLE OF CONTENTS
1. [Core Architectural Philosophy](#1-core-architectural-philosophy)
2. [Hierarchical Folder ID & Page ID Routing System](#2-hierarchical-folder-id--page-id-routing-system)
3. [Titan RegisterBank Directory & Memory Map](#3-titan-registerbank-directory--memory-map)
4. [Titan Universal Hardware Bus & SISO Role](#4-titan-universal-hardware-bus--siso-role)
5. [Titan Circuit Decoder & Reactive Carrier Modulation](#5-titan-circuit-decoder--reactive-carrier-modulation)
6. [Compilation Pipeline & Binary Protocol (.dolp)](#6-compilation-pipeline--binary-protocol-dolp)
7. [Android Native Runtime & Navigation Lifecycle](#7-android-native-runtime--navigation-lifecycle)
8. [Debugging, Diagnostics & Troubleshooting Playbook](#8-debugging-diagnostics--troubleshooting-playbook)

---

## 1. CORE ARCHITECTURAL PHILOSOPHY

Danphe Native is designed around three fundamental engineering principles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        JSX DECLARATIVE UI                              │
│              (Single source of truth in standard JSX)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Single-Pass Compilation
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  TITAN 24-BYTE BINARY PROTOCOL (.dolp)                 │
│         (Microsecond binary layout, zero JSON overhead at runtime)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Direct Bytecode Deserialization
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   TITAN UNIVERSAL HARDWARE SISO BUS                    │
│      (16-Bit Register Memory Bank • 0ms Latency • Reactive Pub/Sub)    │
└──────────────┬────────────────────┼────────────────────┬───────────────┘
               ▼                    ▼                    ▼
     Android Native (Kotlin)   Samsung ThorVG (C++)   Web Engine (HTML5)
```

1. **Zero Runtime Reflection & Zero WebView:**  
   The application UI is compiled directly into fixed 24-byte layout binary structs (`.dolp` bytecode). Android renders pure native views (`LinearLayout`, `TextView`, `ImageView`, `HorizontalScrollView`) without running a JavaScript VM or heavy browser engine on mobile.
2. **SISO (Single-Input Single-Output) Memory Model:**  
   UI elements do not manage complex local state machines. Instead, views are hardwired to **16-bit register addresses** (`0x0000` to `0xFFFF`). Reading from a register drives the view; interacting with the view writes directly into the register.
3. **Hardware-First Modulation:**  
   Data repeaters (such as hotel rooms or restaurant menus) use **Carrier Slots** rather than virtual DOM diffing. A pre-compiled JSX template slot receives live SQLite byte streams without UI re-renders.

---

## 2. HIERARCHICAL FOLDER ID & PAGE ID ROUTING SYSTEM

To support large modular enterprise applications (such as Hotel Management, Hospital Dispatch, or Industrial Automation), Danphe Native implements a 16-bit composite routing structure:

$$\text{Composite Route Code} = (\text{Folder ID} \ll 8) \mid \text{Page ID}$$

### 2.1 Route Allocation Table

| Folder Name | Folder ID | Page Name | Page ID | 16-Bit Route (Hex) | Decimal Value | Primary Responsibility |
|:---|:---:|:---|:---:|:---:|:---:|:---|
| **Root (Front)** | `0x00` | Reception | `0x00` | `0x0000` | 0 | Guest check-in desk & master operator |
| **Root (Front)** | `0x00` | GuestIntercom | `0x01` | `0x0001` | 1 | Room-to-reception audio terminal |
| **Root (Front)** | `0x00` | QrCheckin | `0x02` | `0x0002` | 2 | Hardware QR scanner & badge printing |
| **Root (Front)** | `0x00` | SecurityNvr | `0x04` | `0x0004` | 4 | 4-Channel live CCTV security feeds |
| **Admin** | `0x03` | AdminDashboard | `0x00` | `0x0300` | 768 | Executive metrics, telemetry & revenue |
| **Admin** | `0x03` | AdminRooms | `0x01` | `0x0301` | 769 | Room inventory & SQLite persistence CRUD |
| **Admin** | `0x03` | AdminMenu | `0x02` | `0x0302` | 770 | Digital dining menu, photo & camera engine |
| **Admin** | `0x03` | AdminIntercom | `0x03` | `0x0303` | 771 | Master room audio relay & PTT all-call |

### 2.2 JSX Tagging Contract
Folders, screens, and sub-pages declare their coordinates using deterministic data attributes:
- `data-folder="admin"`: Declares folder membership.
- `data-folder-id="3"`: Assigns high-byte coordinate (`0x03`).
- `data-screen="AdminDashboard"`: Declares the human-readable full screen symbol for hot-patching and route navigation.
- `data-page="0"`: Assigns low-byte coordinate (`0x00`) under multi-page screens.
- `data-page="REG:VAL"`: Reactive hardware subpage binding (e.g. `data-page="11:0"`, `data-page="11:1"`). Binds container visibility directly to SISO register via `TitanCircuitDecoder.bindSubPageContainer(view, reg, targetVal)`.
  > [!IMPORTANT]
  > Subpage containers must always use `<column data-page="REG:VAL">` (Opcode `0x13`). Never place `overflow-y-auto` or `<scroll>` directly on the subpage container itself; place `<scroll>` inside.

### 2.3 Runtime Resolution Flow
When navigation is triggered (via Register `10` or string action `nav:`):
1. **Hierarchical Path Resolution:** `admin/rooms` resolves to `AdminRooms`.
2. **Register Route Resolution:** Route `769` (`0x0301`) maps directly to `Folder 3, Page 1` (`AdminRooms`).
3. **Screen Transition:** The old view is transitioned out and the new view is inflated via `runtime.buildScreen(targetScreen)`.

---

## 3. TITAN REGISTERBANK DIRECTORY & MEMORY MAP

All reactive states, sensors, audio switches, and navigation events live in a shared 16-bit address space:

```
0x0000 ┌────────────────────────────────────────────────────────┐
       │ ZONE 0: System Core, State, Heartbeat & Navigation      │
0x0100 ├────────────────────────────────────────────────────────┤
       │ ZONE 1: Native Hardware Sensors, Battery & Network     │
0x0200 ├────────────────────────────────────────────────────────┤
       │ ZONE 2: UI Viewport, Scroll Offsets & Modulators        │
0x0300 ├────────────────────────────────────────────────────────┤
       │ ZONE 3: Hardware Actuators, Flashlight, Camera & Audio │
0x0600 ├────────────────────────────────────────────────────────┤
       │ ZONE 4: Carrier Slot Modulation & Repeater Templates   │
0x0700 ├────────────────────────────────────────────────────────┤
       │ ZONE 5: Domain Hotel Operations & Financial Registers   │
0x0800 ├────────────────────────────────────────────────────────┤
       │ ZONE 6: Room Intercom Audio Stream Matrix (101 - 305)   │
0xFFFF └────────────────────────────────────────────────────────┘
```

### 3.1 Primary Register Table

| Register Symbol | Hex Address | Decimal | R/W | Description / Bitfield Specification |
|:---|:---:|:---:|:---:|:---|
| `SYS_POWER` | `0x0001` | 1 | R/W | System master power state (`0` = Off, `1` = Active, `2` = Standby) |
| `SYS_HEARTBEAT` | `0x0002` | 2 | R/W | Incremental watchdog counter updated every 1000ms |
| `SYS_E_STOP` | `0x0009` | 9 | R/W | Emergency stop / system lockdown (`1` = Active Emergency) |
| `SYS_ROUTE` | `0x000A` | 10 | R/W | Master 16-bit navigation route selector |
| `SYS_THEME_MODE` | `0x000C` | 12 | R/W | UI Theme mode (`0` = System Default, `1` = Dark, `2` = Light) |
| `UI_SCROLL_X` | `0x0014` | 20 | R/W | Horizontal scroll coordinate offset for active viewport |
| `UI_SCROLL_Y` | `0x0015` | 21 | R/W | Vertical scroll coordinate offset for active viewport |
| `TEL_BATTERY` | `0x1000` | 4096 | R | Battery percentage (`0` - `100`) |
| `TEL_CHARGING` | `0x1001` | 4097 | R | Power source state (`0` = Discharging, `1` = AC, `2` = USB, `3` = Wireless) |
| `TEL_ONLINE` | `0x1010` | 4112 | R | Network status (`0` = Offline, `1` = WiFi Online, `2` = Cellular Online) |
| `AUDIO_VOLUME` | `0x3030` | 12336 | R/W | Master audio playback gain (`0` - `100`) |
| `AUDIO_MIC_MUTE` | `0x3031` | 12337 | R/W | Hardware microphone state (`0` = Active/Listening, `1` = Hardware Muted) |
| `HOTEL_TOTAL_ROOMS` | `0x0700` | 1792 | R/W | Total room capacity count |
| `HOTEL_OCCUPIED_ROOMS` | `0x0701` | 1793 | R/W | Currently occupied rooms count |
| `HOTEL_VACANT_ROOMS` | `0x0702` | 1794 | R/W | Available room inventory |
| `HOTEL_MENU_ITEMS_COUNT`| `0x0704` | 1796 | R/W | Total active dishes in SQLite digital dining table |
| `HOTEL_DAILY_REVENUE` | `0x0710` | 1808 | R/W | Accumulated today's gross revenue |
| `HOTEL_ACTION_CALL_ROOM`| `0x0720` | 1824 | W | Room call actuator (`RoomNo` = Call single room, `999` = All-Call PTT) |
| `ROOM_101_STATUS` | `0x0731` | 1841 | R/W | Room 101 Terminal State (`0` = Standby, `1` = Ringing, `2` = In-Call) |
| `ROOM_102_STATUS` | `0x0732` | 1842 | R/W | Room 102 Terminal State (`0` = Standby, `1` = Ringing, `2` = In-Call) |
| `ROOM_201_STATUS` | `0x0733` | 1843 | R/W | Room 201 Terminal State (`0` = Standby, `1` = Ringing, `2` = In-Call) |
| `ROOM_304_STATUS` | `0x0734` | 1844 | R/W | Room 304 Terminal State (`0` = Standby, `1` = Ringing, `2` = In-Call) |
| `ROOM_305_STATUS` | `0x0735` | 1845 | R/W | Room 305 Terminal State (`0` = Vacant, `1` = Standby, `2` = In-Call) |

---


---

## 4. UNIVERSAL DYNAMIC REGISTER VARIABLES & 16.7M SLOTS

### 4.1 Modern `reg` DSL Syntax
Rather than maintaining static dictionary files, modern Danphe components declare registers directly via dynamic DSL:
```danphe
reg auth:: token, status, role;
reg form:: name, email, phone, address;
```
DanpheLexer & DanpheParser dynamically assign User Space registers (`0x4000+`) and map variables to 256 sub-slots (`0x00` to `0xFF`).

### 4.2 Wi-Fi Ingress Firewall Policy
To prevent remote network tampering of physical actuators:
- **Zone 0-3 (0x0000 - 0x3FFF):** System HAL (Camera, Mic, Solenoids, E-Stop) blocks incoming Wi-Fi / network writes with `403 Forbidden` unless overridden locally by `SYS_REMOTE_HARDWARE_PERMIT` (`0x3090`).
- **Zone 4 (0x4000 - 0x7FFF):** User Space is open for app-to-app data exchange, forms, and telemetry.

## 5. TITAN UNIVERSAL HARDWARE BUS & SISO ROLE

### 4.1 What is SISO?
**SISO (Single Input, Single Output)** replaces the multi-layered state management overhead of traditional mobile apps (Redux, MobX, Context) with a **direct hardware register pipe**.

```
[Hardware / Network / Sensor] ──write(addr, val)──► [Titan RegisterBank] ──notify()──► [Native View]
[User Touch / Input Event]   ──dispatch(addr, val)─► [Titan RegisterBank] ──notify()──► [Hardware Actuator]
```

- **Single Input:** Any hardware trigger, network packet, or user touch writes a single 16-bit integer into a specified register address.
- **Single Output:** The register notifies all registered listeners in sub-microsecond time. Views update in-place without triggering layout tree invalidation.

### 4.2 Concurrency & Thread-Safety Contract
1. **Thread Independence:** `TitanSisoEngine` handles writes from background daemon threads, TCP audio sockets, or hardware camera interrupts safely.
2. **Main Thread Dispatch:** UI view listeners are automatically marshaled to the Android Main Looper (`runOnUiThread`) to prevent Android `CalledFromWrongThreadException`.
3. **Circular Write Suppression:** Writing the identical value already present in a register will not re-broadcast notifications unless the `force = true` flag is explicitly provided.

---

## 5. TITAN CIRCUIT DECODER & REACTIVE CARRIER MODULATION

### 5.1 Reactive Receiver (`rx`) Binding
When a JSX element specifies `rx={REGISTER_ADDRESS}`, `TitanCompiler` burns the 16-bit address into bytes `18..19` of the component's 24-byte binary opcode.

- **At Runtime:** `TitanCircuitDecoder.bindRx(view, registerAddress)` attaches a listener to the SISO engine.
- **Visual Update:**
  - For `TextView`: The text automatically updates to reflect the register's integer or mapped string state.
  - For status indicators: Color shades and animated pulses trigger based on threshold rules.

### 5.2 Reactive Transmitter (`tx`) Binding
When a button or clickable element specifies `tx={REGISTER_ADDRESS} txValue={VALUE}`:
- Bytes `16..17` store the target register address.
- When clicked, `TitanCircuitDecoder.dispatchTx(...)` executes:
  1. Writes `VALUE` directly to the SISO bus register.
  2. Dispatches haptic feedback if enabled.
  3. Emits hardware event across the Titan TCP serial bus (`port 9091`).

### 5.3 Carrier Slot Repeater Modulation
In lists and directories (e.g. Hotel Menu Dishes, Room Cards):
```jsx
<list action="list:hotel_rooms">
  <div>
    <span slot={1} /> {/* Slot 1: Room Number */}
    <span slot={2} /> {/* Slot 2: Room Category */}
    <span slot={3} /> {/* Slot 3: Price */}
    <span slot={4} /> {/* Slot 4: Status Indicator */}
  </div>
</list>
```
1. The JSX template compiles once into a lightweight slot layout.
2. Native SQLite (`TitanSqliteDocStore.kt`) iterates over the database rows.
3. Values are directly written into slot indices `0..7` without creating new view hierarchies or running JavaScript diff algorithms.

---

## 6. COMPILATION PIPELINE & BINARY PROTOCOL (.dolp)

### 6.1 The 24-Byte Titan Binary Struct
Every UI component is encoded in a fixed-length 24-byte slice:

```
Byte Offset:
00: [Flex Weight (4 bits) | Gravity Code (4 bits)]
01: [Component Opcode (e.g. 0x10=Button, 0x14=Row, 0x16=Text, 0x20=ScrollX, 0x23=Icon)]
02: [Background Shade (0 - 255)]
03: [Background Palette Color Index (1=Blue, 2=Green, 3=Indigo, 7=Slate, 9=Black, 10=White)]
04: [Padding Top (0 - 255)]
05: [Padding Right (0 - 255)]
06: [Padding Bottom (0 - 255)]
07: [Padding Left (0 - 255)]
08: [Margin Top (Encoded offset)]
09: [Margin Right (Encoded offset)]
10: [Margin Bottom (Encoded offset)]
11: [Margin Left (Encoded offset)]
12: [Contextual: Layout Orientation & Gap (4 bits) | Text Speed / Sentinel]
13: [Child View Count (for containers) | Text Color Code]
14: [Corner Radius (0=Square, 12=Rounded-XL, 255=Circle)]
15: [Signature Flags (Bit 0=Gradient, Bit 2=Border, Bit 3=Dynamic State, Bit 4=Animation)]
16..17: [Carrier TX Target Register Address (uint16 BE)]
18..19: [Carrier RX Listener Register Address (uint16 BE)]
20: [Carrier Slot Index (0 - 255)]
21..22: [Reserved / Hardware Extended Opcode]
23: [Footer Protocol Flags & Checksum Sentinel]
```

### 6.2 String Pool Alignment
Following the 24-byte component array, the binary bundle embeds a null-delimited UTF-8 string pool.  
Each component consumes a strictly ordered set of strings:
1. `sizeStr`: Universal dimension specification (`w|h|elevation|fontSize|opacity||`).
2. Optional feature strings (Gradient, Border, Dynamic binding, Animation).
3. Component-specific strings (e.g., Button action/title/icon, Image URL, Icon name).

---

## 7. ANDROID NATIVE RUNTIME & NAVIGATION LIFECYCLE

### 7.1 Architecture of Navigation Drawer
- **Root Layout:** `androidx.drawerlayout.widget.DrawerLayout`.
- **Content Container:** `FrameLayout` occupying full screen width and height.
- **Drawer Container:** 300dp wide `FrameLayout` locked to `Gravity.START`.
- **Inflation:** `MainDrawer` is built dynamically from bytecode via `runtime.buildScreen("MainDrawer")`.

### 7.2 Safe Backstack Lifecycle (`app:back`)
When `app:back` is dispatched:
1. If the Drawer is currently open (`drawerLayout.isDrawerOpen(Gravity.START)`):  
   -> Closes the drawer immediately without navigating.
2. If the user has navigated across screens (`screenHistory.isNotEmpty()`):  
   -> Pops the previous screen, inflates it, and executes a smooth slide animation.
3. If the user is on the root screen (`Reception`) and history is empty:  
   -> **Suppresses action safely** to prevent crashes or loading non-existent fallback screens.

---

## 8. DEBUGGING, DIAGNOSTICS & TROUBLESHOOTING PLAYBOOK

### 8.1 "Failed to render screen: ScreenName"
- **Cause:** Occurs when an action attempts to navigate to a screen name that is not present in the bundle's screen directory.
- **Fix:** Check `runtime.getScreenNames()`. Ensure the target screen exists in JSX and that the fallback navigation defaults to the first screen (`Reception`) rather than an arbitrary `"Home"` string.

### 8.2 Inverted App Layout (AppBar at bottom, TabBar at top)
- **Cause:** Over-eager heuristics in the multi-page compiler matching navigation buttons (`nav:`) inside the header and misidentifying it as the footer TabBar.
- **Fix:** The compiler must only classify an element as `TabBar` if it contains explicit `data-tab` properties or is located after `pageContainer` in JSX order.

### 8.3 Invisible Icons inside Buttons
- **Cause:** `ButtonBuilder` failing to attach compound drawables for extracted `iconStr`.
- **Fix:** Ensure `ButtonBuilder.kt` calls `setCompoundDrawablesWithIntrinsicBounds` using `DanpheIcons.getDrawable(...)`.

### 8.4 Horizontal Scroll Clipping in Tabs
- **Cause:** TabBar container missing `scroll-x` / `overflow-x-auto` opcode mapping.
- **Fix:** Verify `TitanCompiler.js` maps `tokens.includes('overflow-x-auto')` to opcode `0x20` (`createHorizontalListView`). Set minimum item width (`min-w-[68px]`).
