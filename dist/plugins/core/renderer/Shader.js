import { Renderer } from './Renderer.js';
import { ShaderPreprocessor } from './ShaderUtils.js';
import './webgpu/WEBGPURenderer.js';
import '../math/Matrix4.js';
import { WEBGPUShader } from './webgpu/WEBGPUShader.js';

var Topology = /* @__PURE__ */ ((Topology2) => {
  Topology2["Triangles"] = "triangle-list";
  Topology2["Points"] = "point-list";
  Topology2["Lines"] = "line-list";
  return Topology2;
})(Topology || {});
class BaseShader {
  id;
  params;
  constructor() {
  }
  SetValue(name, value) {
  }
  SetMatrix4(name, matrix) {
  }
  SetVector2(name, vector) {
  }
  SetVector3(name, vector) {
  }
  SetVector4(name, vector) {
  }
  SetArray(name, array, bufferOffset, dataOffset, size) {
  }
  SetTexture(name, texture) {
  }
  SetSampler(name, texture) {
  }
  SetBuffer(name, buffer) {
  }
  HasBuffer(name) {
    return false;
  }
  OnPreRender(geometry) {
    return true;
  }
  Destroy() {
  }
}
class Shader extends BaseShader {
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
}

export { BaseShader, Shader, Topology };
