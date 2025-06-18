import { Assets } from "../Assets";
import { Utils } from "../utils/Utils";
import { Renderer } from "./Renderer";
import WGSL_Shader_Cull_URL from "./webgpu/shaders/deferred/Cull.wgsl";
import WGSL_Shader_CullStructs_URL from "./webgpu/shaders/deferred/CullStructs.wgsl";
import WGSL_Shader_SettingsStructs_URL from "./webgpu/shaders/deferred/SettingsStructs.wgsl";
import WGSL_Shader_DrawIndirect_URL from "./webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl";
import WGSL_Shader_Draw_URL from "./webgpu/shaders/deferred/DrawGBuffer.wgsl";
import WGSL_Shader_Blit_URL from "./webgpu/shaders/Blit.wgsl";
import WGSL_Shader_BlitDepth_URL from "./webgpu/shaders/BlitDepth.wgsl";
import WGSL_Shader_DepthDownsample_URL from "./webgpu/shaders/DepthDownsample.wgsl";
import WGSL_Shader_DeferredLighting_URL from "./webgpu/shaders/deferred/DeferredLightingPBR.wgsl";
export class ShaderPreprocessor {
    static ProcessDefines(code, defines) {
        const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
        for (const condition of coditions) {
            const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
            const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
            if (defines[variable] === true)
                code = code.replaceAll(condition, value);
            else
                code = code.replaceAll(condition, "");
        }
        return code;
    }
    static async ProcessIncludes(code, url = "./") {
        const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
        const includes = Utils.StringFindAllBetween(code, "#include", "\n", false);
        for (const includeStr of includes) {
            const filenameArray = Utils.StringFindAllBetween(includeStr, '"', '"', true);
            if (filenameArray.length !== 1)
                throw Error(`Invalid include ${filenameArray}`);
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
    static async Load(shader_url) {
        if (Renderer.type === "webgpu") {
            if (shader_url === "")
                throw Error(`Invalid shader ${shader_url}`);
            let code = await Assets.Load(shader_url, "text");
            code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
            return code;
        }
        throw Error("Unknown api");
    }
    static get Cull() { return ShaderLoader.Load(WGSL_Shader_Cull_URL); }
    static get CullStructs() { return ShaderLoader.Load(WGSL_Shader_CullStructs_URL); }
    static get SettingsStructs() { return ShaderLoader.Load(WGSL_Shader_SettingsStructs_URL); }
    static get DepthDownsample() { return ShaderLoader.Load(WGSL_Shader_DepthDownsample_URL); }
    static get DrawIndirect() { return ShaderLoader.Load(WGSL_Shader_DrawIndirect_URL); }
    static get Draw() { return ShaderLoader.Load(WGSL_Shader_Draw_URL); }
    static get Blit() { return ShaderLoader.Load(WGSL_Shader_Blit_URL); }
    static get BlitDepth() { return ShaderLoader.Load(WGSL_Shader_BlitDepth_URL); }
    static get DeferredLighting() { return ShaderLoader.Load(WGSL_Shader_DeferredLighting_URL); }
}
//# sourceMappingURL=ShaderUtils.js.map