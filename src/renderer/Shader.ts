import { Geometry } from "../Geometry";
import { Matrix4 } from "../math/Matrix4";
import { Vector3 } from "../math/Vector3";
import { Buffer } from "./Buffer";
import { Renderer } from "./Renderer";
import { DepthTexture, RenderTexture, Texture, TextureFormat } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { WEBGPUShader } from "./webgpu/WEBGPUShader";
import { WEBGPUShaders } from "./webgpu/shaders/WEBGPUShaders";

export interface ShaderColorOutput {
    format: TextureFormat;
};

export interface ShaderAttribute {
    location: number;
    size: number;
    type: "vec2" | "vec3" | "vec4" | "mat4"
};

export interface ShaderUniform {
    location: number;
    type: "uniform" | "storage" | "texture" | "sampler" | "sampler-compare" | "depthTexture";
};

export enum Topology {
    Triangles = "triangle-list",
    Points = "point-list",
    Lines = "line-list"
}

export interface ShaderParams {
    code: string;
    defines?: {[key: string]: boolean};
    attributes?: {[key: string]: ShaderAttribute};
    uniforms?: {[key: string]: ShaderUniform};
    vertexEntrypoint?: string;
    fragmentEntrypoint?: string;
    colorOutputs: ShaderColorOutput[];
    depthOutput?: TextureFormat;
    topology?: Topology;
    frontFace?: "ccw" | "cw",
    cullMode?: "back" | "front" | "none"
};

export class Shader {
    public readonly id: string;
    public readonly params: ShaderParams;

    public static Create(params: ShaderParams): Shader {
        if (Renderer.type === "webgpu") return new WEBGPUShader(params);
        throw Error("Unknown api");
    }

    public SetValue(name: string, value: number) {}
    public SetMatrix4(name: string, matrix: Matrix4) {}
    public SetVector3(name: string, vector: Vector3) {}
    public SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined) {}
    public SetTexture(name: string, texture: Texture | DepthTexture | RenderTexture) {}
    public SetSampler(name: string, texture: TextureSampler) {}
    public SetBuffer(name: string, buffer: Buffer) {}
    public HasBuffer(name: string): boolean { return false }

    public OnPreRender(geometry: Geometry) {};
}

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
}