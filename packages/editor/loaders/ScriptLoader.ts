import { Assets, Component } from "@trident/core";
import * as esbuild from "esbuild-wasm";

let esbuildReady = false;

const addJsExtensionPlugin: esbuild.Plugin = {
    name: "add-js-extension",
    setup(build) {
        build.onResolve({ filter: /^\..*[^\/]$/ }, (args) => {
            // Skip if already has an extension
            if (/\.\w+$/.test(args.path)) return null;
            return { path: args.path + ".js", external: true };
        });
    },
};

export async function LoadScript(assetPath: string): Promise<any> {
    const response = await Assets.ResourceFetchFn(assetPath);
    const text = await response.text();

    if (!esbuildReady) {
        await esbuild.initialize({ worker: true, wasmURL: "./resources/esbuild.wasm" });
        esbuildReady = true;
    }

    const transpiled = await esbuild.transform(text, {
        loader: "ts",
        format: "esm",
        target: "es2022",
        tsconfigRaw: { compilerOptions: { useDefineForClassFields: true } },
    });

    // Add .js to extensionless relative imports
    const code = transpiled.code.replace(
        /from\s+['"](@trident\/[^'"]+)['"]/g,
        (match, path) => {
            if (path === "@trident/core" || path === "@trident/plugins" || path === "@trident/editor" || path.endsWith(".js")) return match;
            return `from '${path}.js'`;
        }
    ).replace(
        /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
        (match, from, path, quote) => {
            if (path.endsWith(".js")) return match;
            return `${from}${path}.js${quote}`;
        }
    );

    const blob = new Blob([code], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const module = await import(blobUrl);
    for (const key of Object.keys(module)) {
        if (typeof module[key] === "function") {
            module[key].assetPath = assetPath;
            Component.Registry.set(module[key].name, module[key]);
        }
    }
    return module;
}
