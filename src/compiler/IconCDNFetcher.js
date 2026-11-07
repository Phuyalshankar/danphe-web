'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * IconCDNFetcher
 * Automatically downloads CDN icon CSS and TTF/WOFF fonts,
 * parses class names & unicodes, and stores them in local project assets/icons/
 */
class IconCDNFetcher {
    /**
     * Download text from HTTP/HTTPS URL
     */
    static fetchText(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : new URL(res.headers.location, url).toString();
                    return resolve(this.fetchText(redirectUrl));
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
     * Download binary buffer from HTTP/HTTPS URL
     */
    static fetchBuffer(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client.get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const redirectUrl = res.headers.location.startsWith('http')
                        ? res.headers.location
                        : new URL(res.headers.location, url).toString();
                    return resolve(this.fetchBuffer(redirectUrl));
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
                }
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
        });
    }

    /**
     * Parse CSS for icon class mappings: .fa-house:before { content: "\f015"; }
     * Returns Map<className, hexUnicodeString>
     */
    static parseCssIcons(cssText) {
        const iconMap = {};

        // Match patterns like: .fa-house:before, .fa-home:before { content: "\f015"; }
        // or .bi-alarm::before { content: "\f102"; }
        const ruleRegex = /((?:\.[a-zA-Z0-9_-]+(?:\s*,\s*)?)+)\s*(?::+before)?\s*\{\s*content\s*:\s*["']\\([0-9a-fA-F]+)["']/gi;
        let match;

        while ((match = ruleRegex.exec(cssText)) !== null) {
            const selectors = match[1].split(',');
            const unicodeHex = match[2];

            selectors.forEach(sel => {
                const cleanClass = sel.trim().replace(/^[\.:]+/, '').replace(/:+before$/, '');
                if (cleanClass && cleanClass.length > 1) {
                    iconMap[cleanClass] = unicodeHex;
                }
            });
        }

        return iconMap;
    }

    /**
     * Extract font file URLs from @font-face rules in CSS
     */
    static extractFontUrls(cssText, baseUrl) {
        const urls = [];
        const fontUrlRegex = /url\((?:['"]?)([^'")]+)(?:['"]?)\)/gi;
        let match;

        while ((match = fontUrlRegex.exec(cssText)) !== null) {
            let fontUrl = match[1];
            if (fontUrl.startsWith('data:')) continue; // Skip inline base64

            // Resolve relative URLs relative to CSS baseUrl
            if (!fontUrl.startsWith('http://') && !fontUrl.startsWith('https://')) {
                const baseDir = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
                fontUrl = new URL(fontUrl, baseDir).toString();
            }

            // Prefer TTF or WOFF2 or WOFF
            if (fontUrl.includes('.ttf') || fontUrl.includes('.woff')) {
                if (!urls.includes(fontUrl)) urls.push(fontUrl);
            }
        }

        return urls;
    }

    /**
     * Ensure CDN icons are fetched, parsed, and saved locally in project/assets/icons/
     */
    static async ensureIconsDownloaded(config, projectRoot) {
        const cdnUrl = config.icons || config.iconsCdn;
        if (!cdnUrl || typeof cdnUrl !== 'string' || !cdnUrl.startsWith('http')) {
            return false; // No CDN configured, use default vector canvas
        }

        const assetsDir = path.join(projectRoot, 'assets', 'icons');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }

        const mapFile = path.join(assetsDir, 'icon-map.json');
        const cssFile = path.join(assetsDir, 'icons.css');

        try {
            console.log(`\n  🌐 [Icon CDN Engine] Fetching icon assets from CDN:`);
            console.log(`     🔗 ${cdnUrl}`);

            let cssText = await this.fetchText(cdnUrl);
            
            // Prepend local offline @font-face rules pointing to icon-font.ttf
            const fontFaceHeader = `@font-face {
    font-family: 'Font Awesome 6 Free';
    font-style: normal;
    font-weight: 900;
    font-display: block;
    src: url('./icon-font.ttf') format('truetype');
}
@font-face {
    font-family: 'FontAwesome';
    font-style: normal;
    font-weight: 900;
    font-display: block;
    src: url('./icon-font.ttf') format('truetype');
}
.fas, .fa-solid, .fa {
    font-family: 'Font Awesome 6 Free', 'FontAwesome' !important;
    font-weight: 900 !important;
}
`;
            cssText = fontFaceHeader + cssText;
            fs.writeFileSync(cssFile, cssText, 'utf8');

            const iconMap = this.parseCssIcons(cssText);
            const iconCount = Object.keys(iconMap).length;
            console.log(`     ✅ Parsed ${iconCount} icon class definitions`);

            // Save JSON map
            fs.writeFileSync(mapFile, JSON.stringify(iconMap, null, 2), 'utf8');

            // Download font file (Always get .ttf for Android Native Typeface, prioritize solid/900)
            const rawFontUrls = this.extractFontUrls(cssText, cdnUrl);
            const fontUrls = rawFontUrls.map(u => u.replace(/\.woff2?(\?|\#|$)/i, '.ttf$1'));
            
            // Deduplicate and prioritize 'solid' or '900' fonts
            const uniqueUrls = Array.from(new Set(fontUrls));
            uniqueUrls.sort((a, b) => {
                const aSolid = a.includes('solid') || a.includes('900');
                const bSolid = b.includes('solid') || b.includes('900');
                if (aSolid && !bSolid) return -1;
                if (!aSolid && bSolid) return 1;
                return 0;
            });

            for (const fontUrl of uniqueUrls) {
                const fontDest = path.join(assetsDir, 'icon-font.ttf');
                try {
                    console.log(`     ⬇️ Downloading native TTF font asset: ${path.basename(fontUrl.split('?')[0])}`);
                    const fontBuf = await this.fetchBuffer(fontUrl);
                    fs.writeFileSync(fontDest, fontBuf);
                    console.log(`     ✅ Saved native TTF font asset (${(fontBuf.length / 1024).toFixed(1)} KB) -> assets/icons/icon-font.ttf`);
                    break; // Downloaded primary font
                } catch (fontErr) {
                    console.warn(`     ⚠️ Warning: Could not download TTF font from ${fontUrl}: ${fontErr.message}`);
                }
            }

            console.log(`  ✨ [Icon CDN Engine] Icon CDN assets fully synced & stored locally!\n`);
            return true;
        } catch (err) {
            console.error(`  ❌ [Icon CDN Engine] Failed to fetch icon CDN: ${err.message}`);
            return false;
        }
    }
}

module.exports = IconCDNFetcher;
