import { Assets } from "../Assets";
import { Utils } from "../Utils";
import { Renderer } from "./Renderer";
import { WEBGPUShaders } from "./webgpu/shader/WEBGPUShaders";

import WGSL_Shader_Cull_URL from "./webgpu/shader/wgsl/Cull.wgsl";
import WGSL_Shader_CullStructs_URL from "./webgpu/shader/wgsl/CullStructs.wgsl";
import WGSL_Shader_SettingsStructs_URL from "./webgpu/shader/wgsl/SettingsStructs.wgsl";
import WGSL_Shader_DrawIndirect_URL from "./webgpu/shader/wgsl/DrawIndirect.wgsl";

export enum Shaders {
    CullStructs,
    SettingsStructs,

    Cull,
    DrawIndirect
};

export class ShaderCode {
    public static get DeferredMeshShader(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.DeferredMeshShaderCode;
        throw Error("Unknown api");
    }

    public static get DeferredLightingPBRShader(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.DeferredLightingPBRShaderCode;
        throw Error("Unknown api");
    }

    public static get ShadowShader(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.ShadowShaderCode;
        throw Error("Unknown api");
    }

    public static get QuadShader(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.QuadShaderCode;
        throw Error("Unknown api");
    }

    public static get SSGI(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.SSGICode;
        throw Error("Unknown api");
    }

    public static get DownSample(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.DownSampleCode;
        throw Error("Unknown api");
    }

    public static get UpSample(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.UpSampleCode;
        throw Error("Unknown api");
    }

    public static get Blur(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.BlurCode;
        throw Error("Unknown api");
    }

    public static get Blit(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.BlitCode;
        throw Error("Unknown api");
    }

    public static get Cull(): string {
        if (Renderer.type === "webgpu") return WEBGPUShaders.CullCode;
        throw Error("Unknown api");
    }

    public static Preprocess(code: string, defines: {[key: string]: boolean}): string {
        const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    
        for (const condition of coditions) {
            const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
            const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
    
            if (defines[variable] === true) code = code.replaceAll(condition, value);
            else code = code.replaceAll(condition, "");
        }
        return code;
    }

    public static async IncludeHandler(code: string, url: string = "./"): Promise<string> {
        const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
        const includes = Utils.StringFindAllBetween(code, "#include", "\n", false);
        for (const includeStr of includes) {
            const filenameArray = Utils.StringFindAllBetween(includeStr, '"', '"', true);
            if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
            const includeFullPath = filenameArray[0];
            const includePath = includeFullPath.substring(includeFullPath.lastIndexOf("/"), -1) + "/";
            const includeFilename = includeFullPath.substring(includeFullPath.lastIndexOf("/")).slice(1);
            const new_path = basepath + includePath + includeFilename;
            const newCode = await Assets.Load(new_path, "text");
            const includedCode = await this.IncludeHandler(newCode, new_path);
            code = code.replace(includeStr, includedCode + "\n");
        }
        return code;
    }

    public static async Load(shader: Shaders) {
        if (Renderer.type === "webgpu") {
            let shader_url = "";
            if (shader === Shaders.CullStructs) shader_url = WGSL_Shader_CullStructs_URL; // Mostly here so that esbuild bundles
            else if (shader === Shaders.SettingsStructs) shader_url = WGSL_Shader_SettingsStructs_URL // Mostly here so that esbuild bundles
            else if (shader === Shaders.Cull) shader_url = WGSL_Shader_Cull_URL;
            else if (shader === Shaders.DrawIndirect) shader_url = WGSL_Shader_DrawIndirect_URL;
            else throw Error(`Uknown shader ${shader}`);

            if (shader_url === "") throw Error(`Invalid shader ${shader} ${shader_url}`);

            let code = await Assets.Load(shader_url, "text");
            code = await this.IncludeHandler(code, shader_url);
            return code;
        }
        throw Error("Unknown api");
    }
}