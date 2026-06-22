import { Assets, Component } from "@trident/core";
import * as esbuild from "esbuild-wasm";
import { FileBrowser } from "../helpers/FileBrowser";

let esbuildReady = false;
let currentBundleUrl: string | null = null;
let currentModule: Record<string, any> | null = null;
const fileToExports = new Map<string, Record<string, any>>();

export function GetFileExports(path: string): Record<string, any> | undefined {
    return fileToExports.get(path);
}

async function ensureEsbuild() {
    if (esbuildReady) return;
    await esbuild.initialize({ worker: true, wasmURL: "./resources/esbuild.wasm" });
    esbuildReady = true;
}

async function walkProject(): Promise<string[]> {
    const out: string[] = [];
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
        for await (const [name, handle] of (dir as any).entries()) {
            if (name.startsWith(".")) continue;
            const childPath = `${prefix}/${name}`;
            if (handle.kind === "directory") {
                await walk(handle, childPath);
            } else if (handle.kind === "file" && name.endsWith(".ts")) {
                out.push(childPath);
            }
        }
    };
    const root = await FileBrowser.opendir("");
    await walk(root, "");
    return out;
}

const fileBrowserPlugin: esbuild.Plugin = {
    name: "file-browser",
    setup(build) {
        // Absolute project paths
        build.onResolve({ filter: /^\// }, args => {
            let p = args.path;
            if (!/\.[a-zA-Z0-9]+$/.test(p)) p = `${p}.ts`;
            return { path: p, namespace: "project" };
        });

        // Relative imports
        build.onResolve({ filter: /^\.\.?\// }, args => {
            const base = args.importer.substring(0, args.importer.lastIndexOf("/") + 1);
            let resolved = new URL(args.path, `file://${base}`).pathname;
            if (!/\.[a-zA-Z0-9]+$/.test(resolved)) resolved = `${resolved}.ts`;
            return { path: resolved, namespace: "project" };
        });

        // Engine packages stay external — the bundle imports them at runtime
        build.onResolve({ filter: /^@trident\// }, args => {
            // Append .js if not already there and not a known plugin sub-path
            const isBareModule = args.path === "@trident/core" || args.path === "@trident/plugins" || args.path === "@trident/editor";
            const path = (isBareModule || args.path.endsWith(".js")) ? args.path : `${args.path}.js`;
            return { path, external: true };
        });

        build.onLoad({ filter: /.*/, namespace: "project" }, async args => {
            let path = args.path;
            if (!/\.[a-zA-Z0-9]+$/.test(path)) path = `${path}.ts`;
            const response = await Assets.ResourceFetchFn(path);
            const text = await response.text();
            const loader: esbuild.Loader = path.endsWith(".ts") ? "ts" : "text";
            return { contents: text, loader };
        });
    },
};

export async function BuildBundle(): Promise<Record<string, any>> {
    await ensureEsbuild();

    const tsFiles = await walkProject();
    if (tsFiles.length === 0) {
        console.warn("[BuildBundle] No .ts files found in project");
        currentModule = {};
        return currentModule;
    }

    const virtualEntry = tsFiles.map((p, i) => `export * as M${i} from "${p}";`).join("\n");

    const result = await esbuild.build({
        stdin: { contents: virtualEntry, loader: "ts", resolveDir: "/" },
        bundle: true,
        format: "esm",
        target: "es2022",
        plugins: [fileBrowserPlugin],
        tsconfigRaw: { compilerOptions: { useDefineForClassFields: true } },
        write: false,
        sourcemap: "inline",
    });

    if (result.errors.length > 0) {
        console.error("[BuildBundle] esbuild errors:", result.errors);
        throw new Error("Bundle build failed");
    }

    const code = result.outputFiles![0].text;

    if (currentBundleUrl) URL.revokeObjectURL(currentBundleUrl);
    const blob = new Blob([code], { type: "text/javascript" });
    currentBundleUrl = URL.createObjectURL(blob);

    const module = await import(currentBundleUrl);

    // Flatten the M0/M1/... namespaces and register classes
    const flattened: Record<string, any> = {};
    fileToExports.clear();

    for (let i = 0; i < tsFiles.length; i++) {
        const ns = (module as any)[`M${i}`] as Record<string, any> | undefined;
        if (!ns) continue;

        const perFile: Record<string, any> = {};
        for (const exportName of Object.keys(ns)) {
            const exp = ns[exportName];
            flattened[exportName] = exp;
            perFile[exportName] = exp;
            if (typeof exp === "function") {
                // TODO: This needs to be way better, we dont want to set type stuff all over, figure out an automated way.
                if (!exp.type) console.warn(`${exp.name} has no type field`)
                Component.Registry.set(exp.type ?? exp.name, exp);
            }
        }
        fileToExports.set(tsFiles[i], perFile);
    }

    console.log(`[BuildBundle] Built bundle with ${tsFiles.length} files, ${Object.keys(flattened).length} exports`);
    currentModule = flattened;

    return flattened;
}

export async function LoadScript(_assetPath: string): Promise<any> {
    if (!currentModule) await BuildBundle();
    return currentModule;
}