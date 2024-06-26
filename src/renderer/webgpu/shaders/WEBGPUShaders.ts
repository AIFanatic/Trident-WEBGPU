import DeferredMeshShader from "./DeferredMeshShader.wgsl";
import WireframeShaderWGSL from "./WireframeShader.wgsl";
import DeferredLightingPBRShader from "./DeferredLightingPBRShader.wgsl";
import QuadShader from "./QuadShader.wgsl";
import ShadowPass from "./ShadowPass.wgsl";
import SSGI from "./SSGI.wgsl";
import DownSample from "./DownSample.wgsl";
import UpSample from "./UpSample.wgsl";
import Blur from "./Blur.wgsl";
import Blit from "./Blit.wgsl";

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