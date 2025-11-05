import { UUID } from "../../utils";
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
import { Vector2 } from "../../math/Vector2";
import { Renderer } from "../Renderer";
import { Vector4 } from "../../math/Vector4";
import { Geometry } from "../../Geometry";


const BindGroupLayoutCache: Map<string, GPUBindGroupLayout> = new Map();
const BindGroupCache: Map<string, GPUBindGroup> = new Map();

export const UniformTypeToWGSL: {[key: string]: any} = {
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
    entries: GPUBindGroupEntry[];
    buffers: (WEBGPUBuffer | WEBGPUDynamicBuffer | WEBGPUTexture | WEBGPUTextureSampler)[];
}


export class WEBGPUBaseShader {
    public readonly id: string = UUID();
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


    protected bindGroupLayouts: GPUBindGroupLayout[] = [];

    constructor(params: ShaderParams | ComputeShaderParams) {
        const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        this.params = params;
        this.module = WEBGPURenderer.device.createShaderModule({code: code, label: params.name});
        if (this.params.uniforms) {
            this.uniformMap = new Map(Object.entries(this.params.uniforms));
        }
    }
    
    // TODO: This needs cleaning
    protected BuildBindGroupLayouts(): GPUBindGroupLayout[] {
        const bindGroupsLayoutEntries: GPUBindGroupLayoutEntry[][] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!bindGroupsLayoutEntries[uniform.group]) bindGroupsLayoutEntries[uniform.group] = [];

            const layoutEntries = bindGroupsLayoutEntries[uniform.group];

            if (uniform.buffer instanceof WEBGPUBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                layoutEntries.push({ binding: uniform.binding, visibility: visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
            }
            else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
                layoutEntries.push({
                    binding: uniform.binding,
                    visibility: visibility,
                    buffer: {
                        type: UniformTypeToWGSL[uniform.type],
                        hasDynamicOffset: true,
                        minBindingSize: uniform.buffer.minBindingSize
                    }
                })
            }
            else if (uniform.buffer instanceof WEBGPUTexture) {
                // let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                if (uniform.buffer.format.includes("32float")) sampleType = "unfilterable-float"
                else if (uniform.buffer.format.includes("32uint")) sampleType = "uint"
                else if (uniform.buffer.format.includes("32int")) sampleType = "sint"
                if (uniform.buffer.type === TextureType.RENDER_TARGET_STORAGE) {
                    layoutEntries.push({
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
                    layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: {sampleType: sampleType, viewDimension: uniform.buffer.dimension}})
                }
            }
            else if (uniform.buffer instanceof WEBGPUTextureSampler) {
                // const type: GPUSamplerBindingType = uniform.type === "sampler" ? "filtering" : "comparison";
                let type: GPUSamplerBindingType | undefined = undefined;
                if (uniform.type === "sampler") type = "filtering";
                else if (uniform.type === "sampler-compare") type = "comparison";
                else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
                layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: {type: type}})
            }

        }
        
        let bindGroupLayouts: GPUBindGroupLayout[] = [];
        for (const bindGroupsLayoutEntry of bindGroupsLayoutEntries) {
            const crc = JSON.stringify(bindGroupsLayoutEntry);

            let bindGroupLayout = BindGroupLayoutCache.get(crc);
            if (bindGroupLayout === undefined) {
                bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({entries: bindGroupsLayoutEntry});
                BindGroupLayoutCache.set(crc, bindGroupLayout);
                Renderer.info.bindGroupLayoutsStat += 1;
            }
            bindGroupLayout.label = crc;
            bindGroupLayouts.push(bindGroupLayout);
        }

        return bindGroupLayouts;
    }

    protected BuildBindGroupsCRC(): string[] {
        const crcs: string[] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!crcs[uniform.group]) crcs[uniform.group] = "";

            if (uniform.buffer) {
                crcs[uniform.group] += `${uniform.buffer.id},`;
            }
        }

        return crcs;
    }

    protected BuildBindGroups(): GPUBindGroup[] {
        const bindGroupsInfo: BindGroup[] = [];

        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            // // This should be here but it clashes with the preprocessor
            // if (!uniform.buffer) console.warn(`Shader has binding (${name}) but no buffer was set`);
            
            if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = {entries: [], buffers: []};

            const group = bindGroupsInfo[uniform.group];
            if (uniform.buffer instanceof WEBGPUBuffer) {
                group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
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
                group.entries.push({binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view)});
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUTextureSampler) {
                group.entries.push({binding: uniform.binding, resource: uniform.buffer.GetBuffer()});
                group.buffers.push(uniform.buffer);
            }
        }


        this._bindGroupsInfo = bindGroupsInfo;
        let bindGroupsCRC = this.BuildBindGroupsCRC();
        let bindGroups: GPUBindGroup[] = [];
        for (let i = 0; i < bindGroupsInfo.length; i++) {
            const crc = bindGroupsCRC[i];
            const bindGroupInfo = bindGroupsInfo[i];
            const bindGroupLayout = this.bindGroupLayouts[i];

            let bindGroup = BindGroupCache.get(crc);
            if (bindGroup === undefined) {
                bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
                Renderer.info.bindGroupsStat += 1;
                BindGroupCache.set(crc, bindGroup);
            }
            bindGroups.push(bindGroup);
            
        }

        return bindGroups;
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

    public SetArray(name: string, array: ArrayBufferView, bufferOffset: number = 0, dataOffset?: number, size?: number) { this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size) }
    public SetValue(name: string, value: number) {this.valueArray[0] = value; this.SetUniformDataFromArray(name, this.valueArray)}
    public SetMatrix4(name: string, matrix: Matrix4) { this.SetUniformDataFromArray(name, matrix.elements) }
    public SetVector2(name: string, vector: Vector2) { this.SetUniformDataFromArray(name, vector.elements) }
    public SetVector3(name: string, vector: Vector3) { this.SetUniformDataFromArray(name, vector.elements) }
    public SetVector4(name: string, vector: Vector4) { this.SetUniformDataFromArray(name, vector.elements) }
    
    public SetTexture(name: string, texture: WEBGPUTexture) { this.SetUniformDataFromBuffer(name, texture) }
    public SetSampler(name: string, sampler: WEBGPUTextureSampler) { this.SetUniformDataFromBuffer(name, sampler) }
    public SetBuffer(name: string, buffer: WEBGPUBuffer | WEBGPUDynamicBuffer) { this.SetUniformDataFromBuffer(name, buffer) }

    public HasBuffer(name: string): boolean { return this.uniformMap.get(name)?.buffer ? true : false }

    public Compile() {}
    public OnPreRender(geometry: Geometry): boolean { return true; }

    public Destroy() {
        const crcs = this.BuildBindGroupsCRC();
        for (const crc of crcs) {
            if (BindGroupCache.delete(crc) === true) {
                Renderer.info.bindGroupsStat -= 1;
            }
        }

        // TODO: Efficiency
        for (const bindGroupLayout of this.bindGroupLayouts) {
            for (const [cachedBindGroupLayoutName, cachedBindGroupLayout] of BindGroupLayoutCache) {
                if (bindGroupLayout === cachedBindGroupLayout) {
                    if (BindGroupLayoutCache.delete(cachedBindGroupLayoutName) === true) {
                        Renderer.info.bindGroupLayoutsStat -= 1;
                    }
                }
            }
        }

        Renderer.info.compiledShadersStat -= 1;
    }
}