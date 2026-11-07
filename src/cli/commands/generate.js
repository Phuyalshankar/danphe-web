'use strict';

const path = require('path');
const fs = require('fs');

function cmdGenerate(type, name) {
    if (!type || !name) {
        console.error('❌  Usage: dolphin generate <type> <Name>');
        console.error('    E.g.: dolphin generate page Profile');
        process.exit(1);
    }

    if (type.toLowerCase() === 'page') {
        generatePage(name);
    } else {
        console.error(`❌  Unsupported generate type: "${type}". Currently supported: page`);
        process.exit(1);
    }
}

function generatePage(pageName) {
    const name = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    // Check if dolphin project
    const configPath = path.resolve(process.cwd(), 'dolphin.config.js');
    if (!fs.existsSync(configPath)) {
        console.error('❌  Dolphin project configuration not found. Please run this command from the root of a Dolphin project.');
        process.exit(1);
    }

    const pagesDir = path.resolve(process.cwd(), 'pages');
    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
    }

    const targetDir = path.join(pagesDir, name);
    if (fs.existsSync(targetDir)) {
        console.error(`❌  Page folder "${name}" already exists at pages/${name}`);
        process.exit(1);
    }

    fs.mkdirSync(targetDir, { recursive: true });

    // 1. Write UI file
    fs.writeFileSync(path.join(targetDir, `${name}UI.jsx`),
`'use strict';

const ${name}UI = (props) => {
    return (
        <div className="flex-column h-full bg-slate-100 items-center justify-center p-4">
            <div type="AppBar" title="${name} Screen" className="bg-primary text-white p-4 shadow w-full" />
            <div className="flex-1 flex-column items-center justify-center gap-4">
                <span className="text-xl font-bold text-slate-800">${name} Page UI</span>
                <span className="text-muted">Edit pages/${name}/${name}UI.jsx to change layout.</span>
            </div>
        </div>
    );
};

module.exports = ${name}UI;
`);

    // 2. Write Controller file
    fs.writeFileSync(path.join(targetDir, `${name}Controller.js`),
`'use strict';

const ${name}Controller = {
    // ── Local Initial State ──
    state: {
        // key: value
    },

    // ── Local Actions ──
    actions: {
        // actionName(set, get, patch, value, deviceId) {
        //     set('key', value);
        //     patch();
        // }
    }
};

module.exports = ${name}Controller;
`);

    // 3. Write index file
    fs.writeFileSync(path.join(targetDir, 'index.js'),
`'use strict';

const { defineControllerPage } = require('dolphin-native');
const ${name}Controller = require('./${name}Controller');
const ${name}UI = require('./${name}UI');

module.exports = defineControllerPage('${name}', ${name}Controller, ${name}UI);
`);

    // 4. Update pages barrel file (pages/index.js) if it exists
    const barrelPath = path.join(pagesDir, 'index.js');
    if (fs.existsSync(barrelPath)) {
        let content = fs.readFileSync(barrelPath, 'utf8');
        const exportRegex = /module\.exports\s*=\s*\{([^}]+)\}/;
        const match = content.match(exportRegex);
        
        if (match) {
            const currentExports = match[1].trim();
            const newExports = currentExports ? `${currentExports}, ${name}` : name;
            content = `const ${name} = require('./${name}');\n` + content.replace(exportRegex, `module.exports = { ${newExports} }`);
            fs.writeFileSync(barrelPath, content);
        }
    }

    console.log(`\n  🌊 \x1b[1m\x1b[36mPage generated successfully:\x1b[0m pages/${name}/`);
    console.log('  Files created:');
    console.log(`    - pages/${name}/${name}UI.jsx       (Layout)`);
    console.log(`    - pages/${name}/${name}Controller.js (Logic/State)`);
    console.log(`    - pages/${name}/index.js            (Glue)`);
    console.log('');
}

module.exports = { cmdGenerate };
