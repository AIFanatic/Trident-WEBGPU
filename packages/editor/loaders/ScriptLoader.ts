import { Assets, Component } from "@trident/core";
import * as esbuild from "esbuild-wasm";

let esbuildReady = false;

const scriptUrlCache = new Map<string, Promise<string>>();

function normalizeProjectPath(path: string): string {
    return path.startsWith("/") ? path : `/${path}`;
}

function resolveProjectImport(importer: string, specifier: string): string {
    const base = importer.substring(0, importer.lastIndexOf("/") + 1);
    const resolved = new URL(specifier, `file://${base}`).pathname;
    return resolved.endsWith(".ts") ? resolved : `${resolved}.ts`;
}

async function getScriptBlobUrl(assetPath: string): Promise<string> {
    assetPath = normalizeProjectPath(assetPath);

    const cached = scriptUrlCache.get(assetPath);
    if (cached) return cached;

    const pending = (async () => {
        const response = await Assets.ResourceFetchFn(assetPath);
        const text = await response.text();

        const transpiled = await esbuild.transform(text, {
            loader: "ts",
            format: "esm",
            target: "es2022",
            tsconfigRaw: { compilerOptions: { useDefineForClassFields: true } },
        });

        let code = transpiled.code.replace(
            /from\s+['"](@trident\/[^'"]+)['"]/g,
            (match, path) => {
                if (
                    path === "@trident/core" ||
                    path === "@trident/plugins" ||
                    path === "@trident/editor" ||
                    path.endsWith(".js")
                ) {
                    return match;
                }

                return `from '${path}.js'`;
            }
        );

        const relativeImportRegex = /from\s+['"](\.\.?\/[^'"]+)['"]/g;
        const relativeImports = [...code.matchAll(relativeImportRegex)];

        for (const match of relativeImports) {
            const specifier = match[1];
            const dependencyPath = resolveProjectImport(assetPath, specifier);
            const dependencyUrl = await getScriptBlobUrl(dependencyPath);
            code = code.replace(match[0], `from '${dependencyUrl}'`);
        }

        const blob = new Blob([code], { type: "text/javascript" });
        return URL.createObjectURL(blob);
    })();

    scriptUrlCache.set(assetPath, pending);
    return pending;
}

export async function LoadScript(assetPath: string): Promise<any> {
    assetPath = normalizeProjectPath(assetPath);

    if (!esbuildReady) {
        await esbuild.initialize({ worker: true, wasmURL: "./resources/esbuild.wasm" });
        esbuildReady = true;
    }

    const blobUrl = await getScriptBlobUrl(assetPath);
    const module = await import(blobUrl);

    for (const key of Object.keys(module)) {
        const exp = module[key];
        if (typeof exp === "function") {
            exp.assetPath = assetPath;
            Component.Registry.set(exp.type ?? exp.name, exp);
        }
    }

    return module;
}