import { Matrix4 } from "../math/Matrix4";
import { Buffer } from "./Buffer";
import { Renderer } from "./Renderer";
import { DepthTexture, RenderTexture, Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { WEBGPUShader } from "./webgpu/WEBGPUShader";
import { WEBGPUDefaultShaders } from "./webgpu/shaders/WEBGPUDefaultShaders";

export class Shader {
    public readonly id: string;

    public depthTest: boolean;

    public static Create(code: string): Shader {
        if (Renderer.type === "webgpu") return new WEBGPUShader(code);
        throw Error("Unknown api");
    }

    public static get Standard(): Shader {
        if (Renderer.type === "webgpu") return new WEBGPUShader(WEBGPUDefaultShaders.Standard);
        throw Error("Unknown api");
    }

    public SetMatrix4(name: string, matrix: Matrix4) {}
    public SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined) {}
    public SetTexture(name: string, texture: Texture | DepthTexture | RenderTexture) {}
    public SetSampler(name: string, texture: TextureSampler) {}
    public SetBuffer(name: string, buffer: Buffer) {}
    public HasBuffer(name: string): boolean { return false }
}