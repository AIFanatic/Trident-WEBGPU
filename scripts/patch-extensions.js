#!/usr/bin/env node
// scripts/patch-extensions.js

import fs from 'fs';
import path from 'path';

async function walk(dir) {
    for (const dirent of await fs.promises.readdir(dir, { withFileTypes: true })) {
        const full = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            await walk(full);
        } else if (dirent.isFile() && full.endsWith('.js')) {
            await patchImports(full);
        }
    }
}

async function patchImports(file) {
    let content = await fs.promises.readFile(file, 'utf8');

    function replacer(_, p1, p2, p3) {
        const target = path.resolve(path.dirname(file), p2);
        let isDirectory = fs.existsSync(target) && fs.lstatSync(target).isDirectory();


        if (p2.endsWith('.js')) return _;
        if (isDirectory) return `${p1}${p2}/index.js${p3}`;

        return `${p1}${p2}.js${p3}`
    }

    let updated = content
        .replace(
            /from\s+['"](@trident\/[^'"]+)['"]/g,
        (_, path) => {
            return path == "@trident/core" || path == "@trident/plugins" || path.endsWith("js") ? _ : `from '${path}.js'`;
        })
        // static imports
        .replace(/(import\s+[^'"]+\s+from\s+['"])(\.[.\/][^'"]+?)(['"])/g, replacer)
        // static exports
        .replace(/(export\s+[^'"]+\s+from\s+['"])(\.[.\/][^'"]+?)(['"])/g, replacer)
        // dynamic imports
        .replace(/(import\(\s*['"])(\.[.\/][^'"]+?)(['"]\s*\))/g, replacer);

    if (updated !== content) {
        await fs.promises.writeFile(file, updated, 'utf8');
        console.log(`Patched imports in ${file}`);
    }
}

(async () => {
    const target = process.argv[2] || 'dist';
    try {
        await walk(target);
        console.log('✅ Done patching extensions.');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();