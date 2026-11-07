'use strict';

const path = require('path');
const { spawn } = require('child_process');

/**
 * ⚙️ GradleRunner — Manages execution of gradlew.bat / gradlew assemble tasks with real-time logs & error capture.
 */
class GradleRunner {
    static runGradleTask(projectDir, task = 'assembleDebug', options = {}) {
        return new Promise((resolve, reject) => {
            const isWin = process.platform === 'win32';
            const gradlew = path.join(projectDir, isWin ? 'gradlew.bat' : 'gradlew');
            const args = ['generateDebugBuildConfig', task];

            const proc = spawn(gradlew, args, {
                cwd: projectDir,
                env: { ...process.env },
                shell: isWin
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', d => {
                const str = d.toString();
                stdout += str;
                if (options.onLog) options.onLog(str);
            });

            proc.stderr.on('data', d => {
                const str = d.toString();
                stderr += str;
                if (options.onLog) options.onLog(str);
            });

            proc.on('close', code => {
                if (code === 0) {
                    resolve({ code, stdout, stderr });
                } else {
                    reject(new Error(`Gradle exited with code ${code}\n${stderr || stdout}`));
                }
            });
        });
    }
}

module.exports = GradleRunner;
