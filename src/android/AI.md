# 🤖 AI Maintenance Guidelines for Android Builder (`src/android`)

## 🔒 Runtime Copying & Gradle Invariants

1. **Recursive Runtime Copying**:
   - `_copyRuntimeFiles()` MUST recursively traverse all Kotlin subdirectories (`core`, `components`, `css`, `layout`, `state`, `form`, `animation`, `hardware`, `plugin`, `utils`).
   - Test directories (`tests/`) MUST be excluded from `src/main/java` compilation to prevent JUnit missing dependency build errors.

2. **Gradle JDK 17 Requirement**:
   - Java version MUST be JDK 17 or higher for Gradle 8.x compatibility.
