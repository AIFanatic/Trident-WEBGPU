import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { Shader, ShaderParams } from "../Shader";
export declare const pipelineLayoutCache: Map<string, GPUPipelineLayout>;
export declare class WEBGPUShader extends WEBGPUBaseShader implements Shader {
    private readonly vertexEntrypoint;
    private readonly fragmentEntrypoint;
    readonly params: ShaderParams;
    private attributeMap;
    protected _pipeline: GPURenderPipeline | null;
    get pipeline(): GPURenderPipeline | null;
    constructor(params: ShaderParams);
    Compile(): void;
    GetAttributeSlot(name: string): number | undefined;
}
//# sourceMappingURL=WEBGPUShader.d.ts.map