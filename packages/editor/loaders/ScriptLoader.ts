import { Assets, Component } from "@trident/core";
import * as esbuild from "esbuild-wasm";

let esbuildReady = false;

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
        sourcemap: "inline",
        tsconfigRaw: { compilerOptions: { useDefineForClassFields: true } },
    });

    const blob = new Blob([transpiled.code], { type: 'text/javascript' });
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
