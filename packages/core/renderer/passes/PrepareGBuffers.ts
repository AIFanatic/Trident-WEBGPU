import { RenderPass, ResourcePool } from "../RenderGraph";
import { CubeTexture, DepthTexture, RenderTexture, Texture, TextureFormat } from "../Texture";
import { PassParams } from "../RenderingPipeline";
import { Renderer, RendererEvents } from "../Renderer";
import { RenderTarget, RendererContext } from "../RendererContext";
import { Camera } from "../../components/Camera";
import { EventSystem } from "../../Events";
import { Matrix4 } from "../../math/Matrix4";
import { ShadowMapSettings } from "./DeferredShadowMapPass";
import { Buffer, BufferType } from "../Buffer";

export class PrepareGBuffers extends RenderPass {
    public name: string = "PrepareGBuffers";
    
    public gBufferAlbedoRT: RenderTexture;
    public gBufferNormalRT: RenderTexture;
    public gBufferERMORT: RenderTexture;

    public depthTexture: DepthTexture;

    public skybox: CubeTexture;
    public skyboxIrradiance: CubeTexture;
    public skyboxPrefilter: CubeTexture;
    public skyboxBRDFLUT: Texture;

    public GBufferFormat: TextureFormat = "rgba16float";

    private FrameBuffer: Buffer;
    private FrameBufferValues = new ArrayBuffer(464);
    private FrameBufferViews = {
        projectionOutputSize: new Float32Array(this.FrameBufferValues, 0, 4),
        viewPosition: new Float32Array(this.FrameBufferValues, 16, 4),
        projectionInverseMatrix: new Float32Array(this.FrameBufferValues, 32, 16),
        viewInverseMatrix: new Float32Array(this.FrameBufferValues, 96, 16),
        viewMatrix: new Float32Array(this.FrameBufferValues, 160, 16),
        projectionMatrix: new Float32Array(this.FrameBufferValues, 224, 16),
        viewProjectionMatrix: new Float32Array(this.FrameBufferValues, 288, 16),
        cameraNearFar: new Float32Array(this.FrameBufferValues, 352, 4),
        frustum: new Float32Array(this.FrameBufferValues, 368, 24),
    };

    constructor() {
        super();
        EventSystem.on(RendererEvents.Resized, canvas => {
            this.CreateGBufferTextures();
        });
    }

    private CreateGBufferTextures() {
        if (this.depthTexture) this.depthTexture.Destroy();
        if (this.gBufferAlbedoRT) this.gBufferAlbedoRT.Destroy();
        if (this.gBufferNormalRT) this.gBufferNormalRT.Destroy();
        if (this.gBufferERMORT) this.gBufferERMORT.Destroy();

        this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
        this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
        this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
        this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
    }

    public async init(resources: ResourcePool) {
        this.CreateGBufferTextures();

        this.FrameBuffer = Buffer.Create(this.FrameBufferValues.byteLength, BufferType.STORAGE);

        this.initialized = true;
    }
    
    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        if (!Camera.mainCamera) return;

        resources.setResource(PassParams.depthTexture, this.depthTexture);
        resources.setResource(PassParams.GBufferDepth, this.depthTexture);
        resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
        resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
        resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);

        resources.setResource(PassParams.Skybox, this.skybox);
        resources.setResource(PassParams.SkyboxIrradiance, this.skyboxIrradiance);
        resources.setResource(PassParams.SkyboxPrefilter, this.skyboxPrefilter);
        resources.setResource(PassParams.SkyboxBRDFLUT, this.skyboxBRDFLUT);

        const settings = new Float32Array([
            0, // +Debugger.isDebugDepthPassEnabled,
            0, // Debugger.debugDepthMipLevel,
            0, // Debugger.debugDepthExposure,
            0, // Renderer.info.viewTypeValue,
            0, // +Renderer.info.useHeightMapValue,
            0, // Debugger.heightScale,
            
            +false, // ShadowMapSettings.debugCascadesValue.value,
            ShadowMapSettings.r_shadows_pcfResolution.value,
            ShadowMapSettings.r_shadows_csm_blendThresholdValue.value,
            +false,// DeferredShadowMapPassSettings.viewBlendThresholdValue,

            ...Camera.mainCamera.transform.position.elements, 0,
            0, 0
            
        ]);
        resources.setResource(PassParams.DebugSettings, settings);

        
        const camera = Camera.mainCamera;

        this.FrameBufferViews.projectionOutputSize.set([Renderer.width, Renderer.height, 0, 0]);
        this.FrameBufferViews.viewPosition.set([...camera.transform.position.elements, 0]);
        const tempMatrix = new Matrix4();
        this.FrameBufferViews.projectionInverseMatrix.set(tempMatrix.clone().copy(camera.projectionMatrix).invert().elements);
        this.FrameBufferViews.viewInverseMatrix.set(tempMatrix.clone().copy(camera.viewMatrix).invert().elements);
        this.FrameBufferViews.viewMatrix.set(camera.viewMatrix.elements);
        this.FrameBufferViews.projectionMatrix.set(camera.projectionMatrix.elements);
        this.FrameBufferViews.viewProjectionMatrix.set(camera.projectionMatrix.clone().mul(camera.viewMatrix).elements);
        this.FrameBufferViews.cameraNearFar.set([camera.near, camera.far]);
        this.FrameBufferViews.frustum.set([
            ...camera.frustum.planes[0].normal.elements, camera.frustum.planes[0].constant,
            ...camera.frustum.planes[1].normal.elements, camera.frustum.planes[1].constant,
            ...camera.frustum.planes[2].normal.elements, camera.frustum.planes[2].constant,
            ...camera.frustum.planes[3].normal.elements, camera.frustum.planes[3].constant,
            ...camera.frustum.planes[4].normal.elements, camera.frustum.planes[4].constant,
            ...camera.frustum.planes[5].normal.elements, camera.frustum.planes[5].constant,
        ]);

        this.FrameBuffer.SetArray(this.FrameBufferValues);

        resources.setResource(PassParams.FrameBuffer, this.FrameBuffer);
    }

    public async execute(resources: ResourcePool) {
        const colorTargets: RenderTarget[] = [
            {target: this.gBufferAlbedoRT, clear: true},
            {target: this.gBufferNormalRT, clear: true},
            {target: this.gBufferERMORT, clear: true},
        ];

        RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, {target: this.depthTexture, clear: true}, true);
        RendererContext.EndRenderPass();

        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutput) return;

        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: true }], undefined, true);
        RendererContext.EndRenderPass();
    }
}