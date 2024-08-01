import { Assets } from "../Assets";
import { Utils } from "../utils/Utils";
import { Renderer } from "./Renderer";

import WGSL_Shader_Cull_URL from "./webgpu/shader/wgsl/deferred/Cull.wgsl";
import WGSL_Shader_CullStructs_URL from "./webgpu/shader/wgsl/deferred/CullStructs.wgsl";
import WGSL_Shader_SettingsStructs_URL from "./webgpu/shader/wgsl/deferred/SettingsStructs.wgsl";
import WGSL_Shader_DrawIndirect_URL from "./webgpu/shader/wgsl/deferred/DrawIndirectGBuffer.wgsl";
import WGSL_Shader_Blit_URL from "./webgpu/shader/wgsl/Blit.wgsl";
import WGSL_Shader_BlitDepth_URL from "./webgpu/shader/wgsl/BlitDepth.wgsl";
import WGSL_Shader_DepthDownsample_URL from "./webgpu/shader/wgsl/DepthDownsample.wgsl";
import WGSL_Shader_DeferredLighting_URL from "./webgpu/shader/wgsl/deferred/DeferredLightingPBR.wgsl";

enum Shaders {
    CullStructs = WGSL_Shader_CullStructs_URL,
    SettingsStructs = WGSL_Shader_SettingsStructs_URL,

    Cull = WGSL_Shader_Cull_URL,
    DrawIndirect = WGSL_Shader_DrawIndirect_URL,
    Blit = WGSL_Shader_Blit_URL,
    BlitDepth = WGSL_Shader_BlitDepth_URL,
    DepthDownsample = WGSL_Shader_DepthDownsample_URL,
    DeferredLighting = WGSL_Shader_DeferredLighting_URL
};

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
    private static async Load(shader: Shaders) {
        if (Renderer.type === "webgpu") {
            let shader_url = "";
            // TODO: Figure out way of not repeating this.
            if (shader === Shaders.Cull) shader_url = WGSL_Shader_Cull_URL;
            else if (shader === Shaders.DrawIndirect) shader_url = WGSL_Shader_DrawIndirect_URL;
            else if (shader === Shaders.Blit) shader_url = WGSL_Shader_Blit_URL;
            else if (shader === Shaders.BlitDepth) shader_url = WGSL_Shader_BlitDepth_URL;
            else if (shader === Shaders.DepthDownsample) shader_url = WGSL_Shader_DepthDownsample_URL;
            else if (shader === Shaders.DeferredLighting) shader_url = WGSL_Shader_DeferredLighting_URL;

            else throw Error(`Uknown shader ${shader}`);

            if (shader_url === "") throw Error(`Invalid shader ${shader} ${shader_url}`);

            let code = await Assets.Load(shader_url, "text");
            code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
            return code;
        }
        throw Error("Unknown api");
    }

    public static get Cull(): Promise<string> { return ShaderLoader.Load(Shaders.Cull); }
    public static get DepthDownsample(): Promise<string> { return ShaderLoader.Load(Shaders.DepthDownsample); }
    public static get DrawIndirect(): Promise<string> { return ShaderLoader.Load(Shaders.DrawIndirect); }
    public static get BlitDepth(): Promise<string> { return ShaderLoader.Load(Shaders.BlitDepth); }
    public static get DeferredLighting(): Promise<string> { return ShaderLoader.Load(Shaders.DeferredLighting); }
}