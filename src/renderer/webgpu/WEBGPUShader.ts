import { Utils } from "../../Utils";
import { Matrix4 } from "../../math/Matrix4";
import { Shader } from "../Shader";
import { WEBGPUBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTexture } from "./WEBGPUTexture";
import { WEBGPUTextureSampler } from "./WEBGPUTextureSampler";

type ShaderBufferType = "i32" | "u32" | "f32" | "vec2" | "vec3" | "vec4" | "mat3x3" | "mat4x4" | "array" | "texture_2d" | "sampler";

enum WGSLUsageToWEBGPU {
    "storage" = GPUBufferUsage.STORAGE,
    "uniform" = GPUBufferUsage.UNIFORM,
    "read" = GPUBufferUsage.COPY_DST,
    "read_write" = GPUBufferUsage.COPY_DST,
};

interface ShaderBuffer {
    group: number;
    binding: number;
    name: string;
    usage?: GPUBufferUsageFlags;
    types?: ShaderBufferType[];
    buffer?: GPUBuffer | GPUTexture | GPUSampler;
}

export class WEBGPUShader implements Shader {
    public readonly id: string = Utils.UUID();
    public depthTest: boolean = true;
    
    private readonly vertexEntrypoint: string;
    private readonly fragmentEntrypoint: string;
    private readonly module: GPUShaderModule;
    private readonly bindings: Map<string, ShaderBuffer>;

    constructor(code: string) {
        this.module = WEBGPURenderer.device.createShaderModule({code: code});
        const cleanedCode = Utils.StringReplaceAll(Utils.StringReplaceAll(code, "\n", " "), "  ", "");
        const vertexEntrypoint = Utils.StringFindAllBetween(cleanedCode, "@vertex fn ", "(")[0];
        const fragmentEntrypoint = Utils.StringFindAllBetween(cleanedCode, "@fragment fn ", "(")[0];

        if (!vertexEntrypoint) throw Error("Vertex entrypoint not found.");
        if (!fragmentEntrypoint) throw Error("Fragment entrypoint not found.");

        this.vertexEntrypoint = vertexEntrypoint;
        this.fragmentEntrypoint = fragmentEntrypoint;

        this.bindings = WEBGPUShader.ParseShader(code);
    }
    
    private static ParseShader(code: string): Map<string, ShaderBuffer> {
        const bindings = Utils.StringFindAllBetween(Utils.StringReplaceAll(Utils.StringRemoveTextBetween(code, "//", "\n"), " ", ""), "@", ";", false);

        const buffers: Map<string, ShaderBuffer> = new Map();

        for (let uniform of bindings) {
            const group = Utils.StringFindAllBetween(uniform, "group(", ")")[0];
            const binding = Utils.StringFindAllBetween(uniform, "binding(", ")")[0];
            let name = Utils.StringFindAllBetween(uniform, ">", ":")[0];
            if (!name) name = Utils.StringFindAllBetween(uniform, "var", ":")[0]; // Textures/samplers dont have a type
            if (!group || !binding || !name) throw Error(`Could not find group or binding or name ${group} ${binding} ${name}`);
            
            const types = Utils.StringReplaceAll(Utils.StringFindAllBetween(uniform, ":", ";")[0], ">", "").split("<");

            const usageStr = Utils.StringFindAllBetween(uniform, "var<", ">")[0];
            const usage: GPUBufferUsageFlags | undefined = usageStr ? usageStr.split(",").map(v => WGSLUsageToWEBGPU[v]).reduce((a, b) => a | b) : undefined;
    
            buffers.set(name, {
                name: name,
                group: parseInt(group),
                binding: parseInt(binding),
                usage: usage,
                types: types as ShaderBufferType[]
            });
        }

        return buffers;
    }

    public GetBindings(): Map<string, ShaderBuffer> { return this.bindings };
    public GetModule(): GPUShaderModule { return this.module };
    public GetVertexEntrypoint(): string { return this.vertexEntrypoint };
    public GetFragmentEntrypoint(): string { return this.fragmentEntrypoint};

    private GetValidBinding(name: string, type: ShaderBufferType): ShaderBuffer {
        const binding = this.bindings.get(name);
        if (!binding) throw Error(`Shader does not have a parameter named ${name}`);
        if (!binding.types || binding.types.length == 0 || !binding.types.includes(type)) throw Error(`Binding is not of "mat4x4" type, it is ${binding.types}`);
        return binding;
    }

    public SetMatrix4(name: string, matrix: Matrix4): void {
        const binding = this.GetValidBinding(name, "mat4x4");
        if (!binding.usage) throw Error(`Binding has no usage`);
        if (!binding.buffer) binding.buffer = WEBGPURenderer.device.createBuffer({ size: 4 * 16, usage: binding.usage });
        WEBGPURenderer.device.queue.writeBuffer(binding.buffer as GPUBuffer, 0, matrix.elements);
    }

    public SetArray(name: string, array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {
        const binding = this.GetValidBinding(name, "array");
        if (!binding.usage) throw Error(`Binding has no usage`);
        if (!binding.buffer) binding.buffer = WEBGPURenderer.device.createBuffer({ size: array.byteLength, usage: binding.usage });
        WEBGPURenderer.device.queue.writeBuffer(binding.buffer as GPUBuffer, bufferOffset, array, dataOffset, size);
    }

    public SetTexture(name: string, texture: WEBGPUTexture) {
        const binding = this.GetValidBinding(name, "texture_2d");
        binding.buffer = texture.GetBuffer();
    }

    public SetSampler(name: string, sampler: WEBGPUTextureSampler) {
        const binding = this.GetValidBinding(name, "sampler");

        binding.buffer = sampler.GetSampler();
    }

    public SetBuffer(name: string, buffer: WEBGPUBuffer): void {
        const binding = this.bindings.get(name);
        if (!binding) throw Error(`Shader does not have a parameter named ${name}`);
        if (binding.buffer !== buffer.GetBuffer()) {
            binding.buffer = buffer.GetBuffer();
        }
    }

    public HasBuffer(name: string): boolean {
        return this.bindings.get(name)?.buffer ? true : false;
    }
}