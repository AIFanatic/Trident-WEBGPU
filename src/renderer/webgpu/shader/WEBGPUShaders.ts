import DeferredMeshShader from "./wgsl/DeferredMeshShader.wgsl";
import WireframeShaderWGSL from "./wgsl/WireframeShader.wgsl";
import DeferredLightingPBRShader from "./wgsl/DeferredLightingPBRShader.wgsl";
import QuadShader from "./wgsl/QuadShader.wgsl";
import ShadowPass from "./wgsl/ShadowPass.wgsl";
import SSGI from "./wgsl/SSGI.wgsl";
import DownSample from "./wgsl/DownSample.wgsl";
import UpSample from "./wgsl/UpSample.wgsl";
import Blur from "./wgsl/Blur.wgsl";
import Blit from "./wgsl/Blit.wgsl";

export class WEBGPUShaders {
    public static DeferredMeshShaderCode = DeferredMeshShader;
    public static DeferredLightingPBRShaderCode = DeferredLightingPBRShader;
    public static ShadowShaderCode = ShadowPass;
    public static WireframeShaderCode = WireframeShaderWGSL;
    public static QuadShaderCode = QuadShader;
    public static SSGICode = SSGI;
    public static DownSampleCode = DownSample;
    public static UpSampleCode = UpSample;
    public static BlurCode = Blur;
    public static BlitCode = Blit;
}