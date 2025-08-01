import { Assets } from "../Assets";
import { Utils } from "../utils/Utils";
import { Renderer } from "./Renderer";

// import WGSL_Shader_Cull_URL from "../resources/webgpu/shaders/deferred/Cull.wgsl";
// import WGSL_Shader_CullStructs_URL from "../resources/webgpu/shaders/deferred/CullStructs.wgsl";
// import WGSL_Shader_SettingsStructs_URL from "../resources/webgpu/shaders/deferred/SettingsStructs.wgsl";
// import WGSL_Shader_DrawIndirect_URL from "../resources/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl";
import WGSL_Shader_Draw_URL from "../resources/webgpu/shaders/deferred/DrawGBuffer.wgsl";
import WGSL_Shader_Blit_URL from "../resources/webgpu/shaders/Blit.wgsl";
import WGSL_Shader_BlitDepth_URL from "../resources/webgpu/shaders/BlitDepth.wgsl";
// import WGSL_Shader_DepthDownsample_URL from "../resources/webgpu/shaders/DepthDownsample.wgsl";
import WGSL_Shader_DeferredLighting_URL from "../resources/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

// const WGSL_Shader_Cull_URL = "./resources/webgpu/shaders/deferred/Cull.wgsl";
// const WGSL_Shader_CullStructs_URL = "./resources/webgpu/shaders/deferred/CullStructs.wgsl";
// const WGSL_Shader_SettingsStructs_URL = "./resources/webgpu/shaders/deferred/SettingsStructs.wgsl";
// const WGSL_Shader_DrawIndirect_URL = "./resources/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl";
// const WGSL_Shader_Draw_URL = "./resources/webgpu/shaders/deferred/DrawGBuffer.wgsl";
// const WGSL_Shader_Blit_URL = "./resources/webgpu/shaders/Blit.wgsl";
// const WGSL_Shader_BlitDepth_URL = "./resources/webgpu/shaders/BlitDepth.wgsl";
// const WGSL_Shader_DepthDownsample_URL = "./resources/webgpu/shaders/DepthDownsample.wgsl";
// const WGSL_Shader_DeferredLighting_URL = "./resources/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

export class ShaderPreprocessor {
    public static ProcessDefines(code: string, defines: {[key: string]: boolean}): string {
        const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    
        for (const condition of coditions) {
            const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
            const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
    
            if (defines[variable] === true) code = code.replaceAll(condition, value);
            else code = code.replaceAll(condition, "");
        }
        return code;
    }

    public static async ProcessIncludes(code: string, url: string = "./"): Promise<string> {
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
            const includedCode = await this.ProcessIncludes(newCode, new_path);
            code = code.replace(includeStr, includedCode + "\n");
        }
        return code;
    }
}

export class ShaderLoader {
    public static async Load(shader_url: string) {
        if (Renderer.type === "webgpu") {
            if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);

            let code = await Assets.Load(shader_url, "text");
            code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
            return code;
        }
        throw Error("Unknown api");
    }

    public static async LoadURL(shader_url: URL) {
        if (Renderer.type === "webgpu") {
            let code = await Assets.LoadURL(shader_url, "text");
            code = await ShaderPreprocessor.ProcessIncludes(code, shader_url.href);
            return code;
        }
        throw Error("Unknown api");
    }

    // public static get Cull(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_Cull_URL, import.meta.url)); }
    // public static get CullStructs(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_CullStructs_URL, import.meta.url)); }
    // public static get SettingsStructs(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_SettingsStructs_URL, import.meta.url)); }
    // public static get DepthDownsample(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_DepthDownsample_URL, import.meta.url)); }
    // public static get DrawIndirect(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_DrawIndirect_URL, import.meta.url)); }
    
    // public static get Draw(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_Draw_URL, import.meta.url)); }
    // public static get Blit(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_Blit_URL, import.meta.url)); }
    // public static get BlitDepth(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_BlitDepth_URL, import.meta.url)); }
    // public static get DeferredLighting(): Promise<string> { return ShaderLoader.LoadURL(new URL(WGSL_Shader_DeferredLighting_URL, import.meta.url)); }

    public static get Draw(): string { return WGSL_Shader_Draw_URL; }
    public static get Blit(): string { return WGSL_Shader_Blit_URL; }
    public static get BlitDepth(): string { return WGSL_Shader_BlitDepth_URL; }
    public static get DeferredLighting(): string { return WGSL_Shader_DeferredLighting_URL; }
}