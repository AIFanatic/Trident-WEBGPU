import { Matrix4 } from "../../math/Matrix4";
import { Vector3 } from "../../math/Vector3";
import { ComputeShaderParams, ShaderParams, ShaderUniform } from "../Shader";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTextureSampler } from "./WEBGPUTextureSampler";
import { Vector2 } from "../../math/Vector2";
import { Vector4 } from "../../math/Vector4";
export declare const UniformTypeToWGSL: {
    [key: string]: any;
};
interface WEBGPUShaderUniform extends ShaderUniform {
    buffer?: WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler;
    textureDimension?: number;
    textureMip?: number;
    activeMipCount?: number;
}
interface BindGroup {
    entries: GPUBindGroupEntry[];
    buffers: (WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler)[];
}
export declare class WEBGPUBaseShader {
    readonly id: string;
    needsUpdate: boolean;
    protected readonly module: GPUShaderModule;
    readonly params: ShaderParams | ComputeShaderParams;
    protected uniformMap: Map<string, WEBGPUShaderUniform>;
    protected valueArray: Float32Array<ArrayBuffer>;
    protected _pipeline: GPUComputePipeline | GPURenderPipeline | null;
    protected _bindGroups: GPUBindGroup[];
    protected _bindGroupsInfo: BindGroup[];
    get pipeline(): GPURenderPipeline | GPUComputePipeline | null;
    get bindGroups(): GPUBindGroup[];
    get bindGroupsInfo(): BindGroup[];
    protected bindGroupLayouts: GPUBindGroupLayout[];
    constructor(params: ShaderParams | ComputeShaderParams);
    protected BuildBindGroupLayouts(): GPUBindGroupLayout[];
    protected BuildBindGroupsCRC(): string[];
    protected BuildBindGroups(): GPUBindGroup[];
    private GetValidUniform;
    private SetUniformDataFromArray;
    private SetUniformDataFromBuffer;
    SetArray(name: string, array: ArrayBuffer, bufferOffset?: number, dataOffset?: number, size?: number): void;
    SetValue(name: string, value: number): void;
    SetMatrix4(name: string, matrix: Matrix4): void;
    SetVector2(name: string, vector: Vector2): void;
    SetVector3(name: string, vector: Vector3): void;
    SetVector4(name: string, vector: Vector4): void;
    SetTexture(name: string, texture: WEBGPUTexture): void;
    SetSampler(name: string, sampler: WEBGPUTextureSampler): void;
    SetBuffer(name: string, buffer: WEBGPUBuffer | WEBGPUDynamicBuffer): void;
    HasBuffer(name: string): boolean;
    Compile(): void;
    OnPreRender(): boolean;
}
export {};
//# sourceMappingURL=WEBGPUBaseShader.d.ts.map