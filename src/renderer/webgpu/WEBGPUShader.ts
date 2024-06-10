import { Geometry } from "../../Geometry";
import { Utils } from "../../Utils";
import { Matrix4 } from "../../math/Matrix4";
import { Vector3 } from "../../math/Vector3";
import { Shader, ShaderAttribute, ShaderParams, ShaderUniform } from "../Shader";
import { WEBGPUBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTextureSampler } from "./WEBGPUTextureSampler";

// TODO: Make this error!!
const WGSLShaderAttributeFormat = {
    vec2: "float32x2",
    vec3: "float32x3",
    vec4: "float32x4",
};

interface WEBGPUShaderUniform extends ShaderUniform {
    buffer?: GPUBuffer | GPUTexture | GPUSampler;
}

export class WEBGPUShader implements Shader {
    public readonly id: string = Utils.UUID();
    public autoInstancing: boolean = false;
    public needsUpdate = false;
    
    private readonly vertexEntrypoint: string | undefined;
    private readonly fragmentEntrypoint: string | undefined;
    private readonly module: GPUShaderModule;
    
    public readonly params: ShaderParams;
    private attributeMap: Map<string, ShaderAttribute> = new Map();
    private uniformMap: Map<string, WEBGPUShaderUniform> = new Map();

    private valueArray = new Float32Array(1);
    
    private _pipeline: GPURenderPipeline | null = null;
    private _bindGroup: GPUBindGroup | null = null;
    public get pipeline() { return this._pipeline };
    public get bindGroup() { return this._bindGroup };

    constructor(params: ShaderParams) {
        this.params = params;
        this.module = WEBGPURenderer.device.createShaderModule({code: this.params.code});
        this.vertexEntrypoint = this.params.vertexEntrypoint;
        this.fragmentEntrypoint = this.params.fragmentEntrypoint;

        if (this.params.attributes) this.attributeMap = new Map(Object.entries(this.params.attributes));
        if (this.params.uniforms) this.uniformMap = new Map(Object.entries(this.params.uniforms));
    }
    
    public RebuildDescriptors() {
        // let uniformsSet = 0;
        // for (const [_, uniform] of this.uniformMap) {if (uniform.buffer) uniformsSet++;};

        // if (uniformsSet > 0 && (this.params.uniforms && Object.keys(this.params.uniforms).length !== uniformsSet)) return;

        // if (!this.needsUpdate && this.pipeline && this.bindGroup) return;

        console.warn("building")

        let targets: GPUColorTargetState[] = [];
        for (const output of this.params.colorOutputs) targets.push({format: output.format});
        const pipelineDescriptor: GPURenderPipelineDescriptor = {
            layout: "auto",
            vertex: { module: this.module, entryPoint: this.vertexEntrypoint },
            fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets: targets },
            primitive: {
                topology: this.params.topology ? this.params.topology : "triangle-list",
                frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
                cullMode: this.params.cullMode ? this.params.cullMode : "back"
            }
        }

        if (this.params.depthOutput) pipelineDescriptor.depthStencil = { depthWriteEnabled: true, depthCompare: 'less', format: this.params.depthOutput };
    
        const buffers: GPUVertexBufferLayout[] = [];
        for (const [_, attribute] of this.attributeMap) {
            buffers.push({arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] })
        }
        pipelineDescriptor.vertex.buffers = buffers;

        this._pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);

        const bindGroupEntries: GPUBindGroupEntry[] = [];
        for (const [name, uniform] of this.uniformMap) {
            if (!uniform.buffer) continue;
            // if (!uniform.buffer) throw Error(`Shader has binding (${name}) but no buffer was set`);
            if (uniform.buffer instanceof GPUBuffer) bindGroupEntries.push({binding: uniform.location, resource: {buffer: uniform.buffer}});
            else if (uniform.buffer instanceof GPUTexture) bindGroupEntries.push({binding: uniform.location, resource: uniform.buffer.createView()});
            else if (uniform.buffer instanceof GPUSampler) bindGroupEntries.push({binding: uniform.location, resource: uniform.buffer});
        }
        
        this._bindGroup = WEBGPURenderer.device.createBindGroup({
            layout: this._pipeline.getBindGroupLayout(0),
            entries: bindGroupEntries
        });

        this.needsUpdate = false;
    }

    public GetAttributeSlot(name: string): number | undefined {
        return this.attributeMap.get(name)?.location;
    }

    private GetValidUniform(name: string): WEBGPUShaderUniform {
        const uniform = this.uniformMap.get(name);
        if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
        return uniform;
    }

    private SetUniformDataFromArray(name: string, data: ArrayBuffer, dataOffset?: number | undefined, bufferOffset: number = 0, size?: number | undefined) {
        const uniform = this.GetValidUniform(name);
        if (!uniform.buffer) {
            let usage = GPUBufferUsage.COPY_DST;
            if (uniform.type === "uniform") usage |= GPUBufferUsage.UNIFORM;
            else if (uniform.type === "storage") usage |= GPUBufferUsage.STORAGE;
            uniform.buffer = WEBGPURenderer.device.createBuffer({ size: data.byteLength, usage: usage });
            // this.RebuildDescriptors();
            this.needsUpdate = true;
        }

        WEBGPURenderer.device.queue.writeBuffer(uniform.buffer as GPUBuffer, bufferOffset, data, dataOffset, size);
    }
    private SetUniformDataFromBuffer(name: string, data: WEBGPUTexture | WEBGPUTextureSampler | WEBGPUBuffer) {
        const binding = this.GetValidUniform(name);
        if (!binding.buffer || binding.buffer !== data.GetBuffer()) {
            binding.buffer = data.GetBuffer();
            // this.RebuildDescriptors();
            this.needsUpdate = true;
        }
    }

    public SetArray(name: string, array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number, size?: number) { this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size) }
    public SetValue(name: string, value: number) {this.valueArray[0] = value; this.SetUniformDataFromArray(name, this.valueArray)}
    public SetMatrix4(name: string, matrix: Matrix4): void { this.SetUniformDataFromArray(name, matrix.elements) }
    public SetVector3(name: string, vector: Vector3) { this.SetUniformDataFromArray(name, vector.elements) }
    
    public SetTexture(name: string, texture: WEBGPUTexture) { this.SetUniformDataFromBuffer(name, texture) }
    public SetSampler(name: string, sampler: WEBGPUTextureSampler) { this.SetUniformDataFromBuffer(name, sampler) }
    public SetBuffer(name: string, buffer: WEBGPUBuffer): void { this.SetUniformDataFromBuffer(name, buffer) }

    public HasBuffer(name: string): boolean { return this.uniformMap.get(name)?.buffer ? true : false }

    public OnPreRender(geometry: Geometry): void {
        if (this.needsUpdate || !this.pipeline || !this.bindGroup) this.RebuildDescriptors();
    }
}