import { RenderPass, ResourcePool } from "../RenderGraph";
import { CubeTexture, DepthTexture, RenderTexture } from "../Texture";
import { PassParams } from "../RenderingPipeline";
import { Renderer } from "../Renderer";
import { RenderTarget, RendererContext } from "../RendererContext";
import { Camera } from "../../components/Camera";
import { DeferredShadowMapPassDebug } from "./DeferredShadowMapPass";

export class PrepareGBuffers extends RenderPass {
    public name: string = "PrepareGBuffers";
    
    public gBufferAlbedoRT: RenderTexture;
    public gBufferNormalRT: RenderTexture;
    public gBufferERMORT: RenderTexture;

    public depthTexture: DepthTexture;
    public depthTextureClone: DepthTexture; // So it can be used on the same pass

    public gBufferAlbedoRTClone: RenderTexture;

    public skybox: CubeTexture;

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
        this.depthTextureClone = DepthTexture.Create(Renderer.width, Renderer.height);

        this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferAlbedoRTClone = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.skybox = CubeTexture.Create(1, 1, 6);
        
        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;
        // if (!Camera.mainCamera) return;

        const colorTargets: RenderTarget[] = [
            {target: this.gBufferAlbedoRT, clear: true},
            {target: this.gBufferNormalRT, clear: true},
            {target: this.gBufferERMORT, clear: true},
        ];

        RendererContext.CopyTextureToTexture(this.gBufferAlbedoRT, this.gBufferAlbedoRTClone);
        RendererContext.CopyTextureToTexture(this.depthTexture, this.depthTextureClone);

        RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, {target: this.depthTexture, clear: true}, true);
        RendererContext.EndRenderPass();

        resources.setResource(PassParams.depthTexture, this.depthTexture);
        resources.setResource(PassParams.GBufferDepth, this.depthTexture);
        resources.setResource(PassParams.GBufferDepthClone, this.depthTextureClone);
        resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
        resources.setResource(PassParams.GBufferAlbedoClone, this.gBufferAlbedoRTClone);
        resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
        resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
        resources.setResource(PassParams.Skybox, this.skybox);

        const settings = new Float32Array([
            0, // +Debugger.isDebugDepthPassEnabled,
            0, // Debugger.debugDepthMipLevel,
            0, // Debugger.debugDepthExposure,
            0, // Renderer.info.viewTypeValue,
            0, // +Renderer.info.useHeightMapValue,
            0, // Debugger.heightScale,
            
            +DeferredShadowMapPassDebug.debugCascadesValue,
            DeferredShadowMapPassDebug.pcfResolutionValue,
            DeferredShadowMapPassDebug.blendThresholdValue,
            +DeferredShadowMapPassDebug.viewBlendThresholdValue,

            ...Camera.mainCamera.transform.position.elements, 0,
            0, 0
            
        ]);
        resources.setResource(PassParams.DebugSettings, settings);
    }
}