import { Geometry, VertexAttribute } from "../../Geometry";
import { Camera } from "../../components/Camera";
import { Debugger } from "../../plugins/Debugger";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { Buffer } from "../Buffer";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { RenderTarget, RendererContext } from "../RendererContext";
import { PassParams } from "../RenderingPipeline";
import { Shader } from "../Shader";
import { ShaderLoader } from "../ShaderUtils";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { TextureMaps } from "./PrepareSceneData";

export class IndirectGBufferPass extends RenderPass {
    public name: string = "IndirectGBufferPass";
    
    private shader: Shader;
    private geometry: Geometry;

    public initialized: boolean;

    public gBufferAlbedoRT: RenderTexture;
    public gBufferNormalRT: RenderTexture;
    public gBufferERMORT: RenderTexture;

    public depthTexture: DepthTexture;

    constructor() {
        super({
            inputs: [
                PassParams.indirectVertices,
                PassParams.indirectInstanceInfo,
                PassParams.indirectMeshInfo,
                PassParams.indirectObjectInfo,
                PassParams.indirectDrawBuffer,
                PassParams.textureMaps,
                PassParams.isCullingPrepass,
            ],
            outputs: [
                PassParams.depthTexture,

                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
            ]
        });

        this.init();
    }

    protected async init() {
        this.shader = await Shader.Create({
            code: await ShaderLoader.DrawIndirect,
            colorOutputs: [
                {format: "rgba16float"},
                {format: "rgba16float"},
                {format: "rgba16float"},
            ],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: {group: 0, binding: 0, type: "storage"},
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                instanceInfo: {group: 0, binding: 2, type: "storage"},
                meshInfo: {group: 0, binding: 3, type: "storage"},
                objectInfo: {group: 0, binding: 4, type: "storage"},
                settings: {group: 0, binding: 5, type: "storage"},

                vertices: {group: 0, binding: 6, type: "storage"},

                textureSampler: {group: 0, binding: 7, type: "sampler"},
                albedoMaps: {group: 0, binding: 8, type: "texture"},
                normalMaps: {group: 0, binding: 9, type: "texture"},
                heightMaps: {group: 0, binding: 10, type: "texture"},
            },
        });
        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));

        const materialSampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", materialSampler);
        this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);

        this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        
        this.initialized = true;
    }
    
    public execute(
        resources: ResourcePool,
        inputIndirectVertices: Buffer, inputIndirectInstanceInfo: Buffer, inputIndirectMeshInfo: Buffer, inputIndirectObjectInfo: Buffer, inputIndirectDrawBuffer: Buffer, textureMaps: TextureMaps, inputIsCullingPrepass: boolean,
        outputDepthTexture: string, outputGBufferAlbedo: string, outputGBufferNormal: string, outputGBufferERMO: string, outputGBufferDepth: string
    ) {
        if (!this.initialized) return;
        
        const mainCamera = Camera.mainCamera;
        this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);

        this.shader.SetBuffer("vertices", inputIndirectVertices);
        this.shader.SetBuffer("meshInfo", inputIndirectMeshInfo);
        this.shader.SetBuffer("objectInfo", inputIndirectObjectInfo);
        this.shader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
        this.shader.SetTexture("albedoMaps", textureMaps.albedo);
        this.shader.SetTexture("normalMaps", textureMaps.normal);
        this.shader.SetTexture("heightMaps", textureMaps.height);

        // Temp
        const settings = new Float32Array([
            +Debugger.isFrustumCullingEnabled,
            +Debugger.isBackFaceCullingEnabled,
            +Debugger.isOcclusionCullingEnabled,
            +Debugger.isSmallFeaturesCullingEnabled,
            Debugger.staticLOD,
            Debugger.dynamicLODErrorThreshold,
            +Debugger.isDynamicLODEnabled,
            +Debugger.viewInstanceColors,
            Meshlet.max_triangles,
            0, 0, 0
        ]);
        this.shader.SetArray("settings", settings);

        const colorTargets: RenderTarget[] = [
            {target: this.gBufferAlbedoRT, clear: inputIsCullingPrepass},
            {target: this.gBufferNormalRT, clear: inputIsCullingPrepass},
            {target: this.gBufferERMORT, clear: inputIsCullingPrepass},
        ];
        RendererContext.BeginRenderPass(`IGBuffer - prepass: ${+inputIsCullingPrepass}`, colorTargets, {target: this.depthTexture, clear: inputIsCullingPrepass}, true);
        RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
        RendererContext.EndRenderPass();

        resources.setResource(outputDepthTexture, this.depthTexture);
        // PassParams.depthTexture,

        // PassParams.GBufferAlbedo,
        // PassParams.GBufferNormal,
        // PassParams.GBufferERMO,
        // PassParams.GBufferDepth
        resources.setResource(outputDepthTexture, this.depthTexture);
        resources.setResource(outputGBufferDepth, this.depthTexture);
        resources.setResource(outputGBufferAlbedo, this.gBufferAlbedoRT);
        resources.setResource(outputGBufferNormal, this.gBufferNormalRT);
        resources.setResource(outputGBufferERMO, this.gBufferERMORT);
    }
}