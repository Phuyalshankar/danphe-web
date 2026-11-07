'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');

/**
 * CdnAssetFetcher
 * ────────────────────────────────────────────────────────────────────
 * Downloads CSS/JS CDN dependencies to local `assets/cdn/` at build time.
 * Web HTML references ./assets/cdn/<file> instead of hitting the CDN
 * on every load.  Mobile can bundle the same folder for 100% offline use.
 *
 * CDN assets cached:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │  assets/cdn/dolphin-css.css   ← dolphincss styles               │
 *   │  assets/cdn/ub-vanilla.js     ← Universal Bridge JS engine       │
 *   │  assets/cdn/fa-all.min.css    ← Font Awesome icon glyphs         │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * The HTML <head> block references these local files with a CDN fallback
 * comment retained so developers know the origin.
 */
class CdnAssetFetcher {

    // ── CDN sources ──────────────────────────────────────────────────
    static get ASSETS() {
        return [
            {
                name: 'dolphin-css.css',
                url: 'https://cdn.jsdelivr.net/npm/dolphincss@latest/dolphin-css.css',
                type: 'text',
            },
            {
                name: 'ub-vanilla.js',
                url: 'https://cdn.jsdelivr.net/npm/dolphincss@latest/src/ub-vanilla.js',
                type: 'text',
            },
            {
                name: 'fa-all.min.css',
                url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
                type: 'text',
            },
        ];
    }

    // ── HTTP(S) text fetch with redirect support ─────────────────────
    static fetchText(url, _depth = 0) {
        if (_depth > 5) return Promise.reject(new Error('Too many redirects'));
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const next = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : new URL(res.headers.location, url).toString();
                    return resolve(CdnAssetFetcher.fetchText(next, _depth + 1));
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                }
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data));
            }).on('error', reject);
        });
    }

    /**
     * Synchronously check which CDN assets are already cached locally.
     * Returns local file paths for cached files, CDN URL fallback for missing ones.
     * NO network calls — safe to use in synchronous request handlers.
     *
     * @param {string} projectRoot
     * @returns {Object} localPaths - Map of asset name → path/URL
     */
    static resolveLocalPaths(projectRoot) {
        const cdnDir = path.join(projectRoot, 'assets', 'cdn');
        const localPaths = {};
        for (const asset of CdnAssetFetcher.ASSETS) {
            const dest = path.join(cdnDir, asset.name);
            localPaths[asset.name] = (fs.existsSync(dest) && fs.statSync(dest).size > 100)
                ? `./assets/cdn/${asset.name}`
                : asset.url; // CDN fallback
        }
        return localPaths;
    }

    /**
     * Ensure all CDN assets are present in `projectRoot/assets/cdn/`.
     * Skips download if file already exists (cache-hit).
     * Pass `force = true` to always re-download (useful for updates).
     *
     * @param {string} projectRoot  - Absolute path to project root
     * @param {boolean} force       - Force re-download even if cached
     * @returns {Object} localPaths - Map of asset name → local relative path
     */
    static async ensureDownloaded(projectRoot, force = false) {
        const cdnDir = path.join(projectRoot, 'assets', 'cdn');
        fs.mkdirSync(cdnDir, { recursive: true });

        const localPaths = {};
        let anyDownloaded = false;

        for (const asset of CdnAssetFetcher.ASSETS) {
            const dest = path.join(cdnDir, asset.name);
            localPaths[asset.name] = `./assets/cdn/${asset.name}`;

            if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 100) {
                // Cache hit — skip download
                continue;
            }

            try {
                if (!anyDownloaded) {
                    console.log('\n  📦 [CDN Asset Cache] Downloading CDN assets to assets/cdn/ …');
                    anyDownloaded = true;
                }
                process.stdout.write(`     ⬇️  ${asset.name} … `);
                const text = await CdnAssetFetcher.fetchText(asset.url);
                fs.writeFileSync(dest, text, 'utf8');
                console.log(`✅  (${(text.length / 1024).toFixed(1)} KB)`);
            } catch (err) {
                console.warn(`\n     ⚠️  Could not download ${asset.name}: ${err.message}`);
                // Leave localPaths pointing to CDN URL as fallback
                localPaths[asset.name] = asset.url;
            }
        }

        if (anyDownloaded) {
            console.log('  ✨ [CDN Asset Cache] All assets cached locally!\n');
        }

        // ── Download Kotlin (.kt) Plugins defined in dolphin.config.js ──
        await CdnAssetFetcher.ensureKtPluginsDownloaded(projectRoot, force);

        return localPaths;
    }

    /**
     * Download Kotlin (.kt) Plugins specified in dolphin.config.js to assets/plugins/
     * @param {string} projectRoot 
     * @param {boolean} force 
     */
    static async ensureKtPluginsDownloaded(projectRoot, force = false) {
        const pluginsDir = path.join(projectRoot, 'assets', 'plugins');
        fs.mkdirSync(pluginsDir, { recursive: true });

        const configPath = path.join(projectRoot, 'dolphin.config.js');
        if (!fs.existsSync(configPath)) return;

        try {
            delete require.cache[require.resolve(configPath)];
            const config = require(configPath);
            const pluginUrls = config.ktPlugins || config.plugins || [];

            for (const url of pluginUrls) {
                if (typeof url === 'string' && (url.endsWith('.kt') || url.includes('.kt?'))) {
                    const fileName = path.basename(url.split('?')[0]);
                    const dest = path.join(pluginsDir, fileName);

                    if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 50) {
                        continue; // Cache hit
                    }

                    try {
                        console.log(`  🔌 [KtPlugin CDN] Downloading Kotlin plugin: ${fileName} …`);
                        const ktText = await CdnAssetFetcher.fetchText(url);
                        fs.writeFileSync(dest, ktText, 'utf8');
                        console.log(`     ✅ Saved to assets/plugins/${fileName} (${(ktText.length / 1024).toFixed(1)} KB)`);
                    } catch (err) {
                        console.warn(`     ⚠️ Failed to download Kt plugin ${url}: ${err.message}`);
                    }
                }
            }
        } catch (e) {
            console.warn(`⚠️ Error processing Kt plugins from dolphin.config.js: ${e.message}`);
        }
    }

    /**
     * Returns the local <head> HTML block for CSS/JS assets.
     * Uses local paths when available, CDN as fallback.
     *
     * @param {Object} localPaths  - Map from ensureDownloaded()
     * @returns {string} HTML string
     */
    static buildHeadLinks(localPaths = {}) {
        const dolphinCss = localPaths['dolphin-css.css'] || 'https://cdn.jsdelivr.net/npm/dolphincss@latest/dolphin-css.css';
        const ubJs       = localPaths['ub-vanilla.js']   || 'https://cdn.jsdelivr.net/npm/dolphincss@latest/src/ub-vanilla.js';
        const faIconCss  = localPaths['fa-all.min.css']  || 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';

        return `
    <!-- 🐬 Offline CDN Assets (downloaded to assets/cdn/ at build time) -->
    <link rel="stylesheet" href="${faIconCss}" />
    <link rel="stylesheet" href="${dolphinCss}" />
    <script src="${ubJs}"></script>`;
    }
}

module.exports = CdnAssetFetcher;
