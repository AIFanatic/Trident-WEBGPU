import { Utils } from "../../utils/Utils";
import { Buffer, BufferType } from "../Buffer";
import { ShaderPreprocessor } from "../ShaderUtils";
import { TextureType } from "../Texture";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTextureSampler } from "./WEBGPUTextureSampler";
import { RendererDebug } from "../RendererDebug";
const BindGroupLayoutCache = new Map();
const BindGroupCache = new Map();
export const UniformTypeToWGSL = {
    "uniform": "uniform",
    "storage": "read-only-storage",
    "storage-write": "storage"
};
export class WEBGPUBaseShader {
    id = Utils.UUID();
    needsUpdate = false;
    module;
    params;
    uniformMap = new Map();
    valueArray = new Float32Array(1);
    _pipeline = null;
    _bindGroups = [];
    _bindGroupsInfo = [];
    get pipeline() { return this._pipeline; }
    ;
    get bindGroups() { return this._bindGroups; }
    ;
    get bindGroupsInfo() { return this._bindGroupsInfo; }
    ;
    bindGroupLayouts = [];
    constructor(params) {
        const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
        this.params = params;
        this.module = WEBGPURenderer.device.createShaderModule({ code: code });
        if (this.params.uniforms) {
            this.uniformMap = new Map(Object.entries(this.params.uniforms));
        }
    }
    // TODO: This needs cleaning
    BuildBindGroupLayouts() {
        const bindGroupsLayoutEntries = [];
        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!bindGroupsLayoutEntries[uniform.group])
                bindGroupsLayoutEntries[uniform.group] = [];
            const layoutEntries = bindGroupsLayoutEntries[uniform.group];
            if (uniform.buffer instanceof WEBGPUBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
                layoutEntries.push({ binding: uniform.binding, visibility: visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
            }
            else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
                const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
                layoutEntries.push({
                    binding: uniform.binding,
                    visibility: visibility,
                    buffer: {
                        type: UniformTypeToWGSL[uniform.type],
                        hasDynamicOffset: true,
                        minBindingSize: uniform.buffer.minBindingSize
                    }
                });
            }
            else if (uniform.buffer instanceof WEBGPUTexture) {
                // let sampleType: GPUTextureSampleType = uniform.type === "depthTexture" ? "depth" : "float";
                let sampleType = uniform.type === "depthTexture" ? "depth" : "float";
                if (uniform.buffer.format.includes("32float"))
                    sampleType = "unfilterable-float";
                else if (uniform.buffer.format.includes("32uint"))
                    sampleType = "uint";
                else if (uniform.buffer.format.includes("32int"))
                    sampleType = "sint";
                if (uniform.buffer.type === TextureType.RENDER_TARGET_STORAGE) {
                    layoutEntries.push({
                        binding: uniform.binding,
                        visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
                        storageTexture: {
                            format: uniform.buffer.format,
                            viewDimension: uniform.buffer.dimension,
                            access: "read-write",
                        }
                    });
                }
                else {
                    layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType: sampleType, viewDimension: uniform.buffer.dimension } });
                }
            }
            else if (uniform.buffer instanceof WEBGPUTextureSampler) {
                // const type: GPUSamplerBindingType = uniform.type === "sampler" ? "filtering" : "comparison";
                let type = undefined;
                if (uniform.type === "sampler")
                    type = "filtering";
                else if (uniform.type === "sampler-compare")
                    type = "comparison";
                else if (uniform.type === "sampler-non-filterable")
                    type = "non-filtering";
                layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: { type: type } });
            }
        }
        let bindGroupLayouts = [];
        for (const bindGroupsLayoutEntry of bindGroupsLayoutEntries) {
            const crc = JSON.stringify(bindGroupsLayoutEntry);
            let bindGroupLayout = BindGroupLayoutCache.get(crc);
            if (bindGroupLayout === undefined) {
                bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({ entries: bindGroupsLayoutEntry });
                BindGroupLayoutCache.set(crc, bindGroupLayout);
                RendererDebug.IncrementBindGroupLayouts(1);
            }
            bindGroupLayout.label = crc;
            bindGroupLayouts.push(bindGroupLayout);
        }
        return bindGroupLayouts;
    }
    BuildBindGroupsCRC() {
        const crcs = [];
        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            if (!crcs[uniform.group])
                crcs[uniform.group] = "";
            if (uniform.buffer) {
                crcs[uniform.group] += `${uniform.buffer.id},`;
            }
        }
        return crcs;
    }
    BuildBindGroups() {
        const bindGroupsInfo = [];
        // Bind group layout
        for (const [name, uniform] of this.uniformMap) {
            // // This should be here but it clashes with the preprocessor
            // if (!uniform.buffer) console.warn(`Shader has binding (${name}) but no buffer was set`);
            if (!bindGroupsInfo[uniform.group])
                bindGroupsInfo[uniform.group] = { entries: [], buffers: [] };
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
                const view = {
                    dimension: uniform.buffer.dimension,
                    arrayLayerCount: uniform.buffer.dimension != "3d" ? uniform.buffer.GetBuffer().depthOrArrayLayers : 1,
                    // arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers,
                    baseArrayLayer: 0,
                    baseMipLevel: uniform.textureMip,
                    mipLevelCount: uniform.activeMipCount
                };
                group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view) });
                group.buffers.push(uniform.buffer);
            }
            else if (uniform.buffer instanceof WEBGPUTextureSampler) {
                group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer() });
                group.buffers.push(uniform.buffer);
            }
        }
        this._bindGroupsInfo = bindGroupsInfo;
        let bindGroupsCRC = this.BuildBindGroupsCRC();
        let bindGroups = [];
        for (let i = 0; i < bindGroupsInfo.length; i++) {
            const crc = bindGroupsCRC[i];
            const bindGroupInfo = bindGroupsInfo[i];
            const bindGroupLayout = this.bindGroupLayouts[i];
            let bindGroup = BindGroupCache.get(crc);
            if (bindGroup === undefined) {
                bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
                RendererDebug.IncrementBindGroups(1);
                BindGroupCache.set(crc, bindGroup);
            }
            bindGroups.push(bindGroup);
        }
        return bindGroups;
    }
    GetValidUniform(name) {
        const uniform = this.uniformMap.get(name);
        if (!uniform)
            throw Error(`Shader does not have a parameter named ${name}`);
        return uniform;
    }
    SetUniformDataFromArray(name, data, dataOffset, bufferOffset = 0, size) {
        const uniform = this.GetValidUniform(name);
        if (!uniform.buffer) {
            let type = BufferType.STORAGE;
            if (uniform.type === "uniform")
                type = BufferType.UNIFORM;
            uniform.buffer = Buffer.Create(data.byteLength, type);
            this.needsUpdate = true;
        }
        WEBGPURenderer.device.queue.writeBuffer(uniform.buffer.GetBuffer(), bufferOffset, data, dataOffset, size);
    }
    SetUniformDataFromBuffer(name, data) {
        if (!data)
            throw Error(`Invalid buffer ${name}`);
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
    SetArray(name, array, bufferOffset = 0, dataOffset, size) { this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size); }
    SetValue(name, value) { this.valueArray[0] = value; this.SetUniformDataFromArray(name, this.valueArray); }
    SetMatrix4(name, matrix) { this.SetUniformDataFromArray(name, matrix.elements); }
    SetVector2(name, vector) { this.SetUniformDataFromArray(name, vector.elements); }
    SetVector3(name, vector) { this.SetUniformDataFromArray(name, vector.elements); }
    SetVector4(name, vector) { this.SetUniformDataFromArray(name, vector.elements); }
    SetTexture(name, texture) { this.SetUniformDataFromBuffer(name, texture); }
    SetSampler(name, sampler) { this.SetUniformDataFromBuffer(name, sampler); }
    SetBuffer(name, buffer) { this.SetUniformDataFromBuffer(name, buffer); }
    HasBuffer(name) { return this.uniformMap.get(name)?.buffer ? true : false; }
    Compile() { }
    OnPreRender() { return true; }
}
