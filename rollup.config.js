import { string } from "rollup-plugin-string";
import esbuild from 'rollup-plugin-esbuild'

import fs from 'fs';
import path from 'path';

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
            target: "es2022"
        }),
        string({
            include: "**/*.wgsl",
        })
    ]
}

function copyResources() {
    return {
        name: 'copy-resources',
        buildEnd() {
            const base = 'packages/plugins';
            const dest = 'dist/plugins';

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
            target: "es2022"
        }),
        string({
            include: ["**/*.css", "**/*.wgsl"],
        }),
        addJsExtensionToImports(),
        copyResources()
    ]
}


function wrapJsInHtml() {
    const HTML_TEMPLATE =
    `<html>
        <head>
            <style>
                html, body {
                    margin: 0;
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
                %example_code%
            </script>
        </body>
    </html>`;

    const parseCode = (template, code) => {
        const formattedCode = 
            code.replace(/\n/g, "\n            ") // Add indentation to code
            .replace("", "            ") // Add indentation to first line
        
        return template .replace("%example_code%", formattedCode);
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
            target: "es2022"
        }),
        string({
            include: ["**/*.css", "**/*.wgsl"],
        }),
        addJsExtensionToImports(),
        wrapJsInHtml()
    ]
}

export default [core, plugins, examples];