#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function printUsage() {
    console.error('Usage: node copy.js <srcPath> <dstPath> <extension> <recursive>');
    console.error('  <srcPath>   Source directory path');
    console.error('  <dstPath>   Destination directory path');
    console.error('  <extension> File extension to copy (e.g. js or .js)');
    console.error('  <recursive> true|false or 1|0 for recursive copying');
    process.exit(1);
}

const args = process.argv.slice(2);
if (args.length !== 4) {
    console.error('Error: Invalid number of arguments.');
    printUsage();
}

let [srcPath, dstPath, ext, recFlag] = args;

// Normalize extension to start with a dot
if (!ext.startsWith('.')) {
    ext = '.' + ext;
}

// Parse recursive flag
recFlag = recFlag.toLowerCase();
let isRecursive;
if (recFlag === 'true' || recFlag === '1') {
    isRecursive = true;
} else if (recFlag === 'false' || recFlag === '0') {
    isRecursive = false;
} else {
    console.error('Error: <recursive> must be true|false or 1|0.');
    printUsage();
}

// Resolve and validate source directory
const source = path.resolve(srcPath);
if (!fs.existsSync(source)) {
    console.error(`Error: Source path does not exist: ${source}`);
    process.exit(1);
}
if (!fs.statSync(source).isDirectory()) {
    console.error(`Error: Source path is not a directory: ${source}`);
    process.exit(1);
}

// Ensure destination directory exists
const dest = path.resolve(dstPath);
try {
    fs.mkdirSync(dest, { recursive: true });
} catch (err) {
    console.error(`Error creating destination directory: ${err.message}`);
    process.exit(1);
}

function walkAndCopy(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (isRecursive) {
                walkAndCopy(fullPath);
            }
        } else if (entry.isFile() && path.extname(entry.name) === ext) {
            const relPath = path.relative(source, fullPath);
            const target = path.join(dest, relPath);

            fs.mkdirSync(path.dirname(target), { recursive: true });
            try {
                fs.copyFileSync(fullPath, target);
                console.log(`Copied: ${relPath}`);
            } catch (err) {
                console.error(`Error copying ${relPath}: ${err.message}`);
            }
        }
    }
}

walkAndCopy(source);