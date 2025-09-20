import { Geometry } from "../Geometry";
import { Matrix4 } from "../math/Matrix4";
import { Vector2 } from "../math/Vector2";
import { Vector3 } from "../math/Vector3";
import { Vector4 } from "../math/Vector4";
import { Buffer, DynamicBuffer } from "./Buffer";
import { Renderer } from "./Renderer";
import { ShaderPreprocessor } from "./ShaderUtils";
import { DepthTexture, RenderTexture, Texture, TextureFormat } from "./Texture";
import { TextureSampler } from "./TextureSampler";
import { WEBGPUComputeShader } from "./webgpu/WEBGPUComputeShader";
import { WEBGPUShader } from "./webgpu/WEBGPUShader";

export interface ShaderColorOutput {
    format: TextureFormat;
};

export interface ShaderAttribute {
    location: number;
    size: number;
    type: "vec2" | "vec3" | "vec4" | "mat4" | "vec2u" | "vec3u" | "vec4u"
};

export interface ShaderUniform {
    group: number;
    binding: number;
    type: "uniform" | "storage" | "storage-write" | "texture" | "sampler" | "sampler-compare" | "sampler-non-filterable" | "depthTexture";
};

export enum Topology {
    Triangles = "triangle-list",
    Points = "point-list",
    Lines = "line-list"
}

export type DepthCompareFunctions =

| "never"
| "less"
| "equal"
| "less-equal"
| "greater"
| "not-equal"
| "greater-equal"
| "always";

export interface ShaderParams {
    code: string;
    defines?: {[key: string]: boolean};
    attributes?: {[key: string]: ShaderAttribute};
    uniforms?: {[key: string]: ShaderUniform};
    vertexEntrypoint?: string;
    fragmentEntrypoint?: string;
    colorOutputs: ShaderColorOutput[];
    depthOutput?: TextureFormat;
    depthCompare?: DepthCompareFunctions;
    depthBias?: number;
    depthBiasSlopeScale?: number;
    depthBiasClamp?: number;
    depthWriteEnabled?: boolean;
    topology?: Topology;
    frontFace?: "ccw" | "cw",
    cullMode?: "back" | "front" | "none"
};

export interface ComputeShaderParams {
    code: string;
    defines?: {[key: string]: boolean};
    uniforms?: {[key: string]: ShaderUniform};
    computeEntrypoint?: string;
};

export class BaseShader {
    public readonly id: string;
    public readonly params: ShaderParams | ComputeShaderParams;

    protected constructor() {};

    public SetValue(name: string, value: number) {}
    public SetMatrix4(name: string, matrix: Matrix4) {}
    public SetVector2(name: string, vector: Vector2) {}
    public SetVector3(name: string, vector: Vector3) {}
    public SetVector4(name: string, vector: Vector4) {}
    public SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined) {}
    public SetTexture(name: string, texture: Texture | DepthTexture | RenderTexture) {}
    public SetSampler(name: string, texture: TextureSampler) {}
    public SetBuffer(name: string, buffer: Buffer | DynamicBuffer) {}
    public HasBuffer(name: string): boolean { return false }

    public OnPreRender(geometry: Geometry): boolean { return true; };
    public Destroy() {};
}

export class Shader extends BaseShader {
    declare public readonly id: string;
    declare public readonly params: ShaderParams;

    public static async Create(params: ShaderParams): Promise<Shader> {
        params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
        if (Renderer.type === "webgpu") return new WEBGPUShader(params);
        throw Error("Unknown api");
    }
}

export class Compute extends BaseShader {
    declare public readonly params: ComputeShaderParams;

    public static async Create(params: ComputeShaderParams): Promise<Compute> {
        params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
        if (Renderer.type === "webgpu") return new WEBGPUComputeShader(params);
        throw Error("Unknown api");
    }
}