import { Utils } from "../../utils/Utils";
import { Matrix4 } from "../../math/Matrix4";
import { Vector3 } from "../../math/Vector3";
import { Buffer, BufferType } from "../Buffer";
import { ComputeShaderParams, ShaderParams, ShaderUniform } from "../Shader";
import { ShaderPreprocessor } from "../ShaderUtils";
import { TextureType } from "../Texture";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTextureSampler } from "./WEBGPUTextureSampler";

export const UniformTypeToWGSL = {
    "uniform": "uniform",
    "storage": "read-only-storage",
    "storage-write": "storage"
}

interface WEBGPUShaderUniform extends ShaderUniform {
    buffer?: WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler;
    textureDimension?: number;
    textureMip?: number;
    activeMipCount?: number;
}

interface BindGroup {
    layoutEntries: GPUBindGroupLayoutEntry[];
    entries: GPUBindGroupEntry[];
    buffers: (WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler)[];
}


export class WEBGPUBaseShader {
    public readonly id: string = Utils.UUID();
    public needsUpdate = false;
    
    protected readonly module: GPUShaderModule;
    
    public readonly params: ShaderParams | ComputeShaderParams;
    protected uniformMap: Map<string, WEBGPUShaderUniform> = new Map();

    protected valueArray = new Float32Array(1);
    
    protected _pipeline: GPUComputePipeline | GPURenderPipeline | null = null;
    protected _bindGroups: GPUBindGroup[] = [];
    protected _bindGroupsInfo: BindGroup[] = [];
    public get pipeline() { return this._pipeline };
    public get bindGroups() { return this._bindGroups };
    public get bindGroupsInfo() { return this._bindGroupsInfo };

    constructor(params: ShaderParams | ComputeShaderParams) {
        const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        this.params = params;
        this.module = WEBGPURenderer.device.createShaderModule({code: code});
        if (this.params.uniforms) this.uniformMap = new Map(Object.entries(this.params.uniforms));
    }
    
    protected BuildBindGroupLayouts(): BindGroup[] {
        const bindGroupsInfo: BindGroup[] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            // // This should be here but it clashes with the preprocessor
            // if (!uniform.buffer) console.warn(`Shader has binding (${name}) but no buffer was set`);
            
            if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = {layoutEntries: [], entries: [], buffers: []};

            const group = bindGroupsInfo[uniform.group];
            if (uniform.buffer instanceof WEBGPUBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                group.layoutEntries.push({ binding: uniform.binding, visibility: visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
                group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                group.layoutEntries.push({
                    binding: uniform.binding,
                    visibility: visibility,
                    buffer: {
                        type: UniformTypeToWGSL[uniform.type],
                        hasDynamicOffset: true,
                        minBindingSize: uniform.buffer.minBindingSize
                    }
                })

                group.entries.push({
                    binding: uniform.binding,
                    resource: {
                        buffer: uniform.buffer.GetBuffer(),
                        offset: 0,
                        size: uniform.buffer.minBindingSize
                    }
                });

                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUTexture) {
                // let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                if (uniform.buffer.format === "r32float") sampleType = "unfilterable-float"
                if (uniform.buffer.type === TextureType.RENDER_TARGET_STORAGE) {
                    group.layoutEntries.push({
                        binding: uniform.binding,
                        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                        storageTexture: {
                            format: uniform.buffer.format,
                            viewDimension: uniform.buffer.dimension,
                            access: "read-write",
                        }
                    })
                }
                else {
                    group.layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: {sampleType: sampleType, viewDimension: uniform.buffer.dimension}})
                }

                // TODO: Can this use WEBGPUTexture.GetView()?
                // Remember this is for binding textures not color/depth outputs
                const view: GPUTextureViewDescriptor = {
                    dimension: uniform.buffer.dimension,
                    arrayLayerCount: uniform.buffer.dimension != "3d" ? uniform.buffer.GetBuffer().depthOrArrayLayers : 1,
                    // arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers,
                    baseArrayLayer: 0,
                    baseMipLevel: uniform.textureMip,
                    mipLevelCount: uniform.activeMipCount
                };
                // if (uniform.textureDimension) uniform.buffer.SetActiveLayer(uniform.textureDimension);
                // if (uniform.textureMip) uniform.buffer.SetCurrentMip(uniform.textureMip);
                // group.entries.push({binding: uniform.binding, resource: uniform.buffer.GetView()});
                group.entries.push({binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view)});
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUTextureSampler) {
                // const type: GPUSamplerBindingType = uniform.type === "sampler" ? "filtering" : "comparison";
                let type: GPUSamplerBindingType | undefined = undefined;
                if (uniform.type === "sampler") type = "filtering";
                else if (uniform.type === "sampler-compare") type = "comparison";
                else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
                group.layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: {type: type}})
                group.entries.push({binding: uniform.binding, resource: uniform.buffer.GetBuffer()});
                group.buffers.push(uniform.buffer);
            }
        }

        return bindGroupsInfo;
    }

    private GetValidUniform(name: string): WEBGPUShaderUniform {
        const uniform = this.uniformMap.get(name);
        if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
        return uniform;
    }

    private SetUniformDataFromArray(name: string, data: ArrayBuffer, dataOffset?: number | undefined, bufferOffset: number = 0, size?: number | undefined) {
        const uniform = this.GetValidUniform(name);
        if (!uniform.buffer) {
            let type: BufferType = BufferType.STORAGE;
            if (uniform.type === "uniform") type = BufferType.UNIFORM;
            uniform.buffer = Buffer.Create(data.byteLength, type);
            this.needsUpdate = true;
        }

        WEBGPURenderer.device.queue.writeBuffer(uniform.buffer.GetBuffer() as GPUBuffer, bufferOffset, data, dataOffset, size);
    }
    private SetUniformDataFromBuffer(name: string, data: WEBGPUTexture | WEBGPUTextureSampler | WEBGPUBuffer | WEBGPUDynamicBuffer) {
        if (!data) throw Error(`Invalid buffer ${name}`);

        const binding = this.GetValidUniform(name);
        if (!binding.buffer || binding.buffer.GetBuffer() !== data.GetBuffer()) {
            binding.buffer = data;
            this.needsUpdate = true;
        }
        if (data instanceof WEBGPUTexture) {
            binding.textureDimension = data.GetActiveLayer();
            binding.textureMip = data.GetActiveMip();
            binding.activeMipCount = data.GetActiveMipCount();
        }
    }

    public SetArray(name: string, array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number, size?: number) { this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size) }
    public SetValue(name: string, value: number) {this.valueArray[0] = value; this.SetUniformDataFromArray(name, this.valueArray)}
    public SetMatrix4(name: string, matrix: Matrix4) { this.SetUniformDataFromArray(name, matrix.elements) }
    public SetVector3(name: string, vector: Vector3) { this.SetUniformDataFromArray(name, vector.elements) }
    
    public SetTexture(name: string, texture: WEBGPUTexture) { this.SetUniformDataFromBuffer(name, texture) }
    public SetSampler(name: string, sampler: WEBGPUTextureSampler) { this.SetUniformDataFromBuffer(name, sampler) }
    public SetBuffer(name: string, buffer: WEBGPUBuffer | WEBGPUDynamicBuffer) { this.SetUniformDataFromBuffer(name, buffer) }

    public HasBuffer(name: string): boolean { return this.uniformMap.get(name)?.buffer ? true : false }

    public RebuildDescriptors() {}
    public OnPreRender(): void {
        if (this.needsUpdate || !this.pipeline || !this.bindGroups) {
            this.RebuildDescriptors();
        }
    }
}