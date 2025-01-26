import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, DepthTextureArray, RenderTexture } from "../Texture";
import { PassParams } from "../RenderingPipeline";
import { Renderer } from "../Renderer";
import { RenderTarget, RendererContext } from "../RendererContext";
import { Debugger } from "../../plugins/Debugger";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { Camera } from "../../components/Camera";
import { AreaLight, DirectionalLight, PointLight, SpotLight } from "../../components/Light";
import { MeshletDebug } from "../../plugins/meshlets/passes/MeshletDebug";
import { RendererDebug } from "../RendererDebug";
import { DeferredShadowMapPassDebug } from "./DeferredShadowMapPass";

export class PrepareGBuffers extends RenderPass {
    public name: string = "PrepareGBuffers";
    
    public gBufferAlbedoRT: RenderTexture;
    public gBufferNormalRT: RenderTexture;
    public gBufferERMORT: RenderTexture;

    public depthTexture: DepthTexture;

    private shadowOutput: DepthTextureArray;
    private shadowWidth = 4096;
    private shadowHeight = 4096;

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
        
        this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);

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
            +MeshletDebug.isFrustumCullingEnabled,
            +MeshletDebug.isBackFaceCullingEnabled,
            +MeshletDebug.isOcclusionCullingEnabled,
            +MeshletDebug.isSmallFeaturesCullingEnabled,
            MeshletDebug.staticLODValue,
            MeshletDebug.dynamicLODErrorThresholdValue,
            +MeshletDebug.isDynamicLODEnabled,
            RendererDebug.viewTypeValue,
            MeshletDebug.meshletsViewType,
            +RendererDebug.useHeightMapValue,
            Debugger.heightScale,
            Meshlet.max_triangles,
            
            +DeferredShadowMapPassDebug.debugCascadesValue,
            DeferredShadowMapPassDebug.pcfResolutionValue,
            DeferredShadowMapPassDebug.blendThresholdValue,
            +DeferredShadowMapPassDebug.viewBlendThresholdValue,

            ...Camera.mainCamera.transform.position.elements, 0,
            0, 0
            
        ]);
        resources.setResource(PassParams.DebugSettings, settings);



        const scene = Camera.mainCamera.gameObject.scene;
        const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
        if (lights.length === 0) {
            resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
            return;
        }

        if (lights.length !== this.shadowOutput.depth) {
            this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
        }

        RendererContext.BeginRenderPass(`PrepareGBuffers - Shadow clear`, [], {target: this.shadowOutput, clear: true}, true);
        RendererContext.EndRenderPass();
        resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
    }
}