import { Assets } from '../Assets.js';
import { StringFindAllBetween } from '../utils/StringUtils.js';
import { Renderer } from './Renderer.js';
import WGSL_Shader_Draw_URL from '../resources/webgpu/shaders/deferred/DrawGBuffer.wgsl.js';
import WGSL_Shader_DeferredLighting_URL from '../resources/webgpu/shaders/deferred/DeferredLightingPBR.wgsl.js';
import WGSL_Shader_Deferred_SurfaceStruct from '../resources/webgpu/shaders/deferred/SurfaceStruct.wgsl.js';
import WGSL_Shader_Deferred_LightStruct from '../resources/webgpu/shaders/deferred/LightStruct.wgsl.js';
import WGSL_Shader_Deferred_ShadowMap from '../resources/webgpu/shaders/deferred/ShadowMap.wgsl.js';
import WGSL_Shader_Deferred_ShadowMapCSM from '../resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl.js';
import WGSL_Shader_Deferred_ShadowUtils from '../resources/webgpu/shaders/deferred/ShadowUtils.wgsl.js';

class ShaderPreprocessor {
  static ProcessDefines(code, defines) {
    const nl = code.indexOf("\r\n") >= 0 ? "\r\n" : "\n";
    const out = [];
    const stack = [];
    const evalCond = (s) => {
      s = s.trim();
      let neg = false;
      while (s.startsWith("!")) {
        neg = !neg;
        s = s.slice(1).trim();
      }
      const val = !!defines[s];
      return neg ? !val : val;
    };
    for (const raw of code.split(nl)) {
      const t = raw.trim();
      if (t.startsWith("#if ")) {
        stack.push(evalCond(t.slice(4)));
        continue;
      }
      if (t.startsWith("#else")) {
        if (stack.length) stack[stack.length - 1] = !stack[stack.length - 1];
        continue;
      }
      if (t.startsWith("#endif")) {
        if (stack.length) stack.pop();
        continue;
      }
      if (stack.every(Boolean)) out.push(raw);
    }
    return out.join(nl);
  }
  static async ProcessIncludes(code, url = "./") {
    const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
    const includes = StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = StringFindAllBetween(includeStr, '"', '"', true);
      if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
      const includeFullPath = filenameArray[0];
      const includePath = includeFullPath.substring(includeFullPath.lastIndexOf("/"), -1) + "/";
      const includeFilename = includeFullPath.substring(includeFullPath.lastIndexOf("/")).slice(1);
      const new_path = basepath + includePath + includeFilename;
      const newCode = await Assets.Load(new_path, "text");
      const includedCode = await this.ProcessIncludes(newCode, new_path);
      code = code.replace(includeStr, includedCode + "\n");
    }
    return code;
  }
  static async ProcessIncludesV2(code, url = "./", seen = /* @__PURE__ */ new Set()) {
    const includes = StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = StringFindAllBetween(includeStr, '"', '"', true).concat(StringFindAllBetween(includeStr, "'", "'", true));
      if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
      const includeFullPath = filenameArray[0];
      if (seen.has(includeFullPath)) {
        code = code.replace(includeStr, "");
        continue;
      }
      seen.add(includeFullPath);
      const newCode = await Assets.Load(includeFullPath, "text");
      const includedCode = await this.ProcessIncludesV2(newCode, includeFullPath, seen);
      code = code.replace(includeStr, includedCode + "\n");
    }
    return code;
  }
}
class ShaderLoader {
  static async Load(shader_url) {
    if (Renderer.type === "webgpu") {
      if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);
      let code = await Assets.Load(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
      return code;
    }
    throw Error("Unknown api");
  }
  static async LoadURL(shader_url) {
    if (Renderer.type === "webgpu") {
      let code = await Assets.LoadURL(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludes(code, shader_url.href);
      return code;
    }
    throw Error("Unknown api");
  }
  static get Draw() {
    return WGSL_Shader_Draw_URL;
  }
  static get DeferredLighting() {
    return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_DeferredLighting_URL);
  }
}
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl", WGSL_Shader_Deferred_SurfaceStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl", WGSL_Shader_Deferred_LightStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMap.wgsl", WGSL_Shader_Deferred_ShadowMap);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl", WGSL_Shader_Deferred_ShadowMapCSM);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl", WGSL_Shader_Deferred_ShadowUtils);

export { ShaderLoader, ShaderPreprocessor };
