import { Assets } from "../Assets";
import { StringFindAllBetween } from "../utils";
import { Renderer } from "./Renderer";

import WGSL_Shader_Draw_URL from "../resources/webgpu/shaders/deferred/DrawGBuffer.wgsl";
import WGSL_Shader_DrawVertexPulling_URL from "../resources/webgpu/shaders/deferred/DrawGBufferVertexPulling.wgsl";
import WGSL_Shader_DeferredLighting_URL from "../resources/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

// TODO: This is messy
export class ShaderPreprocessor {
    public static ProcessDefines(code: string, defines: { [key: string]: boolean }): string {
        const nl = code.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
        const out: string[] = [];
        const stack: boolean[] = [];
        const evalCond = (s: string) => {
            s = s.trim();
            let neg = false;
            while (s.startsWith('!')) { neg = !neg; s = s.slice(1).trim(); }
            const val = !!defines[s];
            return neg ? !val : val;
        };
    
        for (const raw of code.split(nl)) {
            const t = raw.trim();
            if (t.startsWith('#if ')) { stack.push(evalCond(t.slice(4))); continue; }
            if (t.startsWith('#else')) { if (stack.length) stack[stack.length - 1] = !stack[stack.length - 1]; continue; }
            if (t.startsWith('#endif')) { if (stack.length) stack.pop(); continue; }
            if (stack.every(Boolean)) out.push(raw);
        }
        return out.join(nl);
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

    public static async ProcessIncludesV2(code: string, url: string = "./", seen = new Set<string>()): Promise<string> {
        const includes = StringFindAllBetween(code, "#include", "\n", false);
        for (const includeStr of includes) {
            const filenameArray = StringFindAllBetween(includeStr, '"', '"', true).concat(StringFindAllBetween(includeStr, "'", "'", true));
            if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
            const includeFullPath = filenameArray[0];

            if (seen.has(includeFullPath)) {
                code = code.replace(includeStr, ""); // skip duplicate
                continue;
            }
            seen.add(includeFullPath);

            const newCode = await Assets.Load(includeFullPath, "text");
            const includedCode = await this.ProcessIncludesV2(newCode, includeFullPath, seen);
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

    public static async LoadV2(shader_url: string) {
        if (Renderer.type === "webgpu") {
            if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);

            let code = await Assets.Load(shader_url, "text");
            code = await ShaderPreprocessor.ProcessIncludesV2(code, shader_url);
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

    public static get Draw(): Promise<string> { return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_Draw_URL); }
    public static get DrawVertexPulling(): Promise<string> { return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_DrawVertexPulling_URL); }
    public static get DeferredLighting(): Promise<string> { return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_DeferredLighting_URL); }
}

import WGSL_Shader_Deferred_SurfaceStruct from "../resources/webgpu/shaders/deferred/SurfaceStruct.wgsl";
import WGSL_Shader_Deferred_LightStruct from "../resources/webgpu/shaders/deferred/LightStruct.wgsl";
import WGSL_Shader_Deferred_ShadowMap from "../resources/webgpu/shaders/deferred/ShadowMap.wgsl";
import WGSL_Shader_Deferred_ShadowMapCSM from "../resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl";
import WGSL_Shader_Deferred_ShadowUtils from "../resources/webgpu/shaders/deferred/ShadowUtils.wgsl";
import WGSL_Shader_Deferred_OctahedralEncoding from "../resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl";

Assets.Register("@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl", WGSL_Shader_Deferred_SurfaceStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl", WGSL_Shader_Deferred_LightStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMap.wgsl", WGSL_Shader_Deferred_ShadowMap);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl", WGSL_Shader_Deferred_ShadowMapCSM);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl", WGSL_Shader_Deferred_ShadowUtils);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl", WGSL_Shader_Deferred_OctahedralEncoding);
