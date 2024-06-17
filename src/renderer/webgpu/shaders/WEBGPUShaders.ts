// @ts-ignore
import DeferredMeshShader from "./DeferredMeshShader.wgsl";
// @ts-ignore
import WireframeShaderWGSL from "./WireframeShader.wgsl";
// @ts-ignore
import DeferredLightingPBRShader from "./DeferredLightingPBRShader.wgsl";
// @ts-ignore
import QuadShader from "./QuadShader.wgsl";
// @ts-ignore
import ShadowPass from "./ShadowPass.wgsl";

export class WEBGPUShaders {
    public static DeferredMeshShaderCode = DeferredMeshShader;
    public static DeferredLightingPBRShaderCode = DeferredLightingPBRShader;
    public static ShadowShaderCode = ShadowPass;
    public static WireframeShaderCode = WireframeShaderWGSL;
    public static QuadShaderCode = QuadShader;
}