import { Renderer } from "./Renderer";
import { WEBGPUShaders } from "./webgpu/shader/WEBGPUShaders";

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
}