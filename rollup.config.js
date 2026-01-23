import { string } from "rollup-plugin-string";
import esbuild from 'rollup-plugin-esbuild'

import fs from 'fs';
import path from 'path';

const target = "es2022";

function addJsExtensionToImports() {
    return {
        name: 'add-js-extension-to-imports',
        renderChunk(code, chunk) {
            const file = chunk.fileName;
            function replacer(_, p1, p2, p3) {
                const target = path.resolve(path.dirname(file), p2);
                let isDirectory = fs.existsSync(target) && fs.lstatSync(target).isDirectory();


                if (p2.endsWith('.js')) return _;
                if (isDirectory) return `${p1}${p2}/index.js${p3}`;

                return `${p1}${p2}.js${p3}`
            }

            let updated = code
                .replace(/from\s+['"](@trident\/[^'"]+)['"]/g, (_, path) => {
                    return path == "@trident/core" || path == "@trident/plugins" || path.endsWith("js") ? _ : `from '${path}.js'`;
                })
                // static imports
                .replace(/(import\s+[^'"]+\s+from\s+['"])(\.[.\/][^'"]+?)(['"])/g, replacer)
                // static exports
                .replace(/(export\s+[^'"]+\s+from\s+['"])(\.[.\/][^'"]+?)(['"])/g, replacer)
                // dynamic imports
                .replace(/(import\(\s*['"])(\.[.\/][^'"]+?)(['"]\s*\))/g, replacer);

            if (updated !== code) {
                console.log(`Patched imports in ${file}`);
            }

            return updated;
        }
    };
}

const core = {
    input: 'packages/core/index.ts',
    output: {
        file: './dist/trident-core.js',
        format: "esm"
    },
    plugins: [
        // typescript(),
        esbuild({
            target: target
        }),
        string({
            include: "**/*.wgsl",
        })
    ]
}

function copyResources(from, to) {
    function listFilesRecursive(dir) {
        const out = [];
        if (!fs.existsSync(dir)) return out;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) out.push(...listFilesRecursive(full));
            else if (entry.isFile()) out.push(full);
        }
        return out;
    }

    return {
        name: 'copy-resources',
        buildStart() {
            const base = from;
            for (const entry of fs.readdirSync(base)) {
                const srcDir = path.join(base, entry, 'resources');
                if (!fs.existsSync(srcDir)) continue;
                for (const file of listFilesRecursive(srcDir)) {
                    this.addWatchFile(file);
                }
            }
        },
        buildEnd() {
            const base = from;
            const dest = to;

            for (const entry of fs.readdirSync(base)) {
                const srcDir = path.join(base, entry, 'resources');
                const destDir = path.join(dest, entry, 'resources');

                if (fs.existsSync(srcDir)) {
                    fs.cpSync(srcDir, destDir, { recursive: true });
                    console.log(`Copied: ${srcDir} -> ${destDir}`);
                }
            }
        }
    };
}

const plugins = {
    input: 'packages/plugins/index.ts',
    output: {
        dir: 'dist/plugins/',
        format: "esm",
        preserveModules: true,
    },
    external: ["@trident/core", /^@trident\/plugins(\/.*)?$/],
    plugins: [
        // typescript({
        //     outDir: "dist/plugins"
        // }),
        esbuild({
            target: target
        }),
        string({
            include: ["**/*.css", "**/*.wgsl"],
        }),
        addJsExtensionToImports(),
        copyResources('packages/plugins', 'dist/plugins')
    ]
}


function wrapJsInHtml() {
    const HTML_TEMPLATE =
        `
    <!DOCTYPE html>
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            
            <style>
                html, body {
                    margin: 0;
                    overflow: hidden;
                    width: 100%;
                    height: 100%;
                }
            </style>
        </head>
        <body>
            <script type="importmap">
                {
                    "imports": {
                        "@trident/core": "../trident-core.js",
                        "@trident/plugins/": "../plugins/"
                    }
                }
            </script>
            <script type="module">
                const canvas = document.createElement("canvas");
                document.body.appendChild(canvas);
                %example_code%
            </script>
        </body>
    </html>`;

    const parseCode = (template, code) => {
        const formattedCode =
            code.replace(/\n/g, "\n            ") // Add indentation to code
                .replace("", "            ") // Add indentation to first line

        return template.replace("%example_code%", formattedCode);
    }

    return {
        name: 'wrap-js-in-html',
        generateBundle(options, bundle) {
            for (const [fileName, chunkOrAsset] of Object.entries(bundle)) {
                if (fileName === "index.js") {
                    delete bundle[fileName];
                }
                else if (fileName.endsWith('.js') && chunkOrAsset.type === 'chunk') {
                    const htmlFileName = fileName.replace(/\.js$/, '.html');
                    const html = parseCode(HTML_TEMPLATE, chunkOrAsset.code);

                    // Replace the JS file with an HTML file
                    delete bundle[fileName];
                    this.emitFile({
                        type: 'asset',
                        fileName: htmlFileName,
                        source: html
                    });
                }
            }
        }
    };
}

function copyAssets(from, to) {
    return {
        name: 'copy-assets',
        writeBundle(options, bundle) {
            const srcDir = from; // "packages/examples/assets";
            const destDir = to; // "dist/examples/assets";
            if (fs.existsSync(srcDir)) {
                fs.cpSync(srcDir, destDir, { recursive: true });
                console.log(`Copied: ${srcDir} -> ${destDir}`);
            }
        }
    }
}


const examples = {
    input: 'packages/examples/index.ts',
    output: {
        dir: 'dist/examples/',
        format: "esm",
        preserveModules: true,
    },
    external: ["@trident/core", /^@trident\/plugins(\/.*)?$/],
    plugins: [
        // typescript({
        //     outDir: "dist/examples"
        // }),
        esbuild({
            target: target
        }),
        string({
            include: ["**/*.wgsl"],
        }),
        addJsExtensionToImports(),
        wrapJsInHtml(),
        copyAssets("packages/examples/assets", "dist/examples/assets")
    ]
}



function editorHtml() {
    const HTML_TEMPLATE =
        `
    <!DOCTYPE html>
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            
            <link rel="stylesheet" href="trident-editor.css">
        </head>
        <body>
            <script type="importmap">
                {
                    "imports": {
                        "@trident/core": "../trident-core.js",
                        "@trident/plugins/": "../plugins/"
                    }
                }
            </script>
            <script type="module" src="./trident-editor.js"></script>
        </body>
    </html>`;

    return {
        name: 'wrap-js-in-html',
        generateBundle(options, bundle) {
            this.emitFile({
                type: 'asset',
                fileName: "index.html",
                source: HTML_TEMPLATE
            });
        }
    };
}

function cssBundle({ output = 'trident-editor.css' } = {}) {
    const styles = new Map(); // id -> css

    return {
        name: 'css-bundle',

        transform(code, id) {
            if (!id.endsWith('.css')) return null;
            styles.set(id, code); // cache latest version for this file
            return { code: 'export default ""', map: { mappings: '' } };
        },

        // remove from cache if a CSS file is deleted
        watchChange(id, change) {
            if (id.endsWith('.css') && change.event === 'delete') {
                styles.delete(id);
            }
        },

        generateBundle() {
            const css = Array.from(styles.values()).join('\n');
            this.emitFile({ type: 'asset', fileName: output, source: css });
        }
    };
}

const editor = {
    input: 'packages/editor/index.tsx',
    output: {
        file: './dist/editor/trident-editor.js',
        format: "esm"
    },
    plugins: [
        // typescript(),
        esbuild({
            target: target,
            jsxFactory: 'createElement',
            jsxFragment: 'Fragment',
        }),
        addJsExtensionToImports(),
        editorHtml(),
        cssBundle(),
        copyAssets('packages/editor/resources', 'dist/editor/resources')
    ]
}

// const editor = {
//     input: 'packages/editor-test/index.ts',
//     output: {
//         file: './dist/editor/trident-editor.js',
//         format: "esm"
//     },
//     plugins: [
//         // typescript(),
//         esbuild({
//             target: "es2022",
//             jsxFactory: 'createElement',
//             jsxFragment: 'Fragment',
//         }),
//         addJsExtensionToImports(),
//         wrapJsInHtml(),
//         copyAssets()
//     ]
// }

export default [core, plugins, examples, editor];