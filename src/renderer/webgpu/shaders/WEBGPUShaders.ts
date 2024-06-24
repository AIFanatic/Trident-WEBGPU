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
// @ts-ignore
import SSGI from "./SSGI.wgsl";
// @ts-ignore
import DownSample from "./DownSample.wgsl";
// @ts-ignore
import UpSample from "./UpSample.wgsl";
// @ts-ignore
import Blur from "./Blur.wgsl";
// @ts-ignore
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