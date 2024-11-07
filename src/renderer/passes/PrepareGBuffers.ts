import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, RenderTexture } from "../Texture";
import { PassParams } from "../RenderingPipeline";
import { Renderer } from "../Renderer";
import { RenderTarget, RendererContext } from "../RendererContext";
import { Debugger } from "../../plugins/Debugger";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { Camera } from "../../components/Camera";

export class PrepareGBuffers extends RenderPass {
    public name: string = "PrepareGBuffers";
    
    public gBufferAlbedoRT: RenderTexture;
    public gBufferNormalRT: RenderTexture;
    public gBufferERMORT: RenderTexture;

    public depthTexture: DepthTexture;

    constructor() {
        super({outputs: [
            PassParams.depthTexture,

            PassParams.GBufferAlbedo,
            PassParams.GBufferNormal,
            PassParams.GBufferERMO,
            PassParams.GBufferDepth,
        ]});
    }

    public async init(resources: ResourcePool) {
        this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);

        this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");

        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        const colorTargets: RenderTarget[] = [
            {target: this.gBufferAlbedoRT, clear: true},
            {target: this.gBufferNormalRT, clear: true},
            {target: this.gBufferERMORT, clear: true},
        ];
        RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, {target: this.depthTexture, clear: true}, true);
        RendererContext.EndRenderPass();

        resources.setResource(PassParams.depthTexture, this.depthTexture);
        resources.setResource(PassParams.GBufferDepth, this.depthTexture);
        resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
        resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
        resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);



        const settings = new Float32Array([
            +Debugger.isDebugDepthPassEnabled,
            Debugger.debugDepthMipLevel,
            Debugger.debugDepthExposure,
            +Debugger.isFrustumCullingEnabled,
            +Debugger.isBackFaceCullingEnabled,
            +Debugger.isOcclusionCullingEnabled,
            +Debugger.isSmallFeaturesCullingEnabled,
            Debugger.staticLOD,
            Debugger.dynamicLODErrorThreshold,
            +Debugger.isDynamicLODEnabled,
            Debugger.viewType,
            +Debugger.useHeightMap,
            Debugger.heightScale,
            Meshlet.max_triangles,
            ...Camera.mainCamera.transform.position.elements, 0,
            0, 0
        ]);

        resources.setResource(PassParams.DebugSettings, settings);
    }
}