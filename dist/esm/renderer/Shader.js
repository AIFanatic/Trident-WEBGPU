import { Renderer } from "./Renderer";
import { ShaderPreprocessor } from "./ShaderUtils";
import { WEBGPUComputeShader } from "./webgpu/WEBGPUComputeShader";
import { WEBGPUShader } from "./webgpu/WEBGPUShader";
;
;
;
export var Topology;
(function (Topology) {
    Topology["Triangles"] = "triangle-list";
    Topology["Points"] = "point-list";
    Topology["Lines"] = "line-list";
})(Topology || (Topology = {}));
;
;
export class BaseShader {
    id;
    params;
    constructor() { }
    ;
    SetValue(name, value) { }
    SetMatrix4(name, matrix) { }
    SetVector2(name, vector) { }
    SetVector3(name, vector) { }
    SetVector4(name, vector) { }
    SetArray(name, array, bufferOffset, dataOffset, size) { }
    SetTexture(name, texture) { }
    SetSampler(name, texture) { }
    SetBuffer(name, buffer) { }
    HasBuffer(name) { return false; }
    OnPreRender(geometry) { return true; }
    ;
}
export class Shader extends BaseShader {
    static async Create(params) {
        params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
        if (Renderer.type === "webgpu")
            return new WEBGPUShader(params);
        throw Error("Unknown api");
    }
}
export class Compute extends BaseShader {
    static async Create(params) {
        params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
        if (Renderer.type === "webgpu")
            return new WEBGPUComputeShader(params);
        throw Error("Unknown api");
    }
}
//# sourceMappingURL=Shader.js.map