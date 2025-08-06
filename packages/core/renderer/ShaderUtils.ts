import { Assets } from "../Assets";
import { StringFindAllBetween } from "../utils";
import { Renderer } from "./Renderer";

import WGSL_Shader_Draw_URL from "../resources/webgpu/shaders/deferred/DrawGBuffer.wgsl";
import WGSL_Shader_DeferredLighting_URL from "../resources/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

export class ShaderPreprocessor {
    public static ProcessDefines(code: string, defines: {[key: string]: boolean}): string {
        const coditions = StringFindAllBetween(code, "#if", "#endif", false);
    
        for (const condition of coditions) {
            const variable = StringFindAllBetween(condition, "#if ", "\n")[0];
            const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
    
            if (defines[variable] === true) code = code.replaceAll(condition, value);
            else code = code.replaceAll(condition, "");
        }
        return code;
    }

    public static async ProcessIncludes(code: string, url: string = "./"): Promise<string> {
        const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
        const includes = StringFindAllBetween(code, "#include", "\n", false);
        for (const includeStr of includes) {
            const filenameArray = StringFindAllBetween(includeStr, '"', '"', true);
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

    public static get Draw(): string { return WGSL_Shader_Draw_URL; }
    public static get DeferredLighting(): string { return WGSL_Shader_DeferredLighting_URL; }
}