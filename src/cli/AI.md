# 🤖 AI Maintenance Guidelines for CLI Engine (`src/cli`)

## 🔒 CLI Invariants

1. **Max File Length Rule**:
   - Single command files MUST NOT exceed 1200 lines.
2. **Babel JSX Stub**:
   - `DolphinCLI.js` MUST maintain `global.React.createElement` stub so JSX files render without React dependency.
3. **Exit Codes**:
   - Successful command execution MUST exit with code `0`.
   - Command errors MUST log diagnostic output and exit with code `1`.
