# ⚡ Dolphin Native CLI Engine (`src/cli`)

The **Dolphin CLI Engine** processes command-line arguments, manages dev-server hotpatch bridges, triggers native Android builds, generates components, and performs system diagnostics (`dolphin doctor`).

---

## 📂 Command Architecture

| File | Command | Description |
|---|---|---|
| `DolphinCLI.js` | Main Entry | Dispatches command flags and initializes Babel JSX runtime stub. |
| `commands/init.js` | `dolphin init` | Scaffolds new Dolphin Native projects from templates. |
| `commands/dev.js` | `dolphin dev` | Launches real-time dev server, file watcher, and TCP hotpatch bridge. |
| `commands/build.js` | `dolphin build` | Compiles JSX schemas into `.dolp` binary bundle output. |
| `commands/android.js` | `dolphin android` | Invokes `AndroidBuilder.js` to compile & assemble APKs. |
| `commands/doctor.js` | `dolphin doctor` | Validates Android SDK, JDK 17, ADB, and environment prerequisites. |
| `commands/generate.js` | `dolphin g` | Component and screen code generator. |
| `commands/inspect.js` | `dolphin inspect` | Inspects pre-compiled `.dolp` binary bundle structures. |
| `commands/help.js` | `dolphin --help` | Displays CLI help menus and version information. |

---

## 💻 Usage Example

```bash
dolphin init my-app        # Scaffold new project
dolphin dev                # Start hotpatch dev server
dolphin build --android   # Build debug APK
dolphin doctor             # Check SDK/JDK setup
```
