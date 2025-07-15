import { Geometry, VertexAttribute } from "../../../Geometry";
import { Camera } from "../../../components/Camera";
import { Meshlet } from "../../../plugins/meshlets/Meshlet";
import { RenderPass } from "../../../renderer/RenderGraph";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { Shader } from "../../../renderer/Shader";
import { ShaderLoader } from "../../../renderer/ShaderUtils";
import { TextureSampler } from "../../../renderer/TextureSampler";
import { MeshletPassParams } from "./MeshletDraw";
import { RendererContext } from "../../../renderer/RendererContext";
export class IndirectGBufferPass extends RenderPass {
    name = "IndirectGBufferPass";
    shader;
    geometry;
    constructor() {
        super({
            inputs: [
                PassParams.DebugSettings,
                PassParams.depthTexture,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
                MeshletPassParams.indirectVertices,
                MeshletPassParams.indirectInstanceInfo,
                MeshletPassParams.indirectMeshInfo,
                MeshletPassParams.indirectObjectInfo,
                MeshletPassParams.indirectMeshMatrixInfo,
                MeshletPassParams.indirectDrawBuffer,
                MeshletPassParams.textureMaps,
                MeshletPassParams.isCullingPrepass,
            ],
            outputs: []
        });
    }
    async init(resources) {
        this.shader = await Shader.Create({
            code: await ShaderLoader.DrawIndirect,
            colorOutputs: [
                { format: "rgba16float" },
                { format: "rgba16float" },
                { format: "rgba16float" },
            ],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: { group: 0, binding: 0, type: "storage" },
                projectionMatrix: { group: 0, binding: 1, type: "storage" },
                instanceInfo: { group: 0, binding: 2, type: "storage" },
                meshMaterialInfo: { group: 0, binding: 3, type: "storage" },
                meshMatrixInfo: { group: 0, binding: 4, type: "storage" },
                objectInfo: { group: 0, binding: 5, type: "storage" },
                settings: { group: 0, binding: 6, type: "storage" },
                vertices: { group: 0, binding: 7, type: "storage" },
                textureSampler: { group: 0, binding: 8, type: "sampler" },
                albedoMaps: { group: 0, binding: 9, type: "texture" },
                normalMaps: { group: 0, binding: 10, type: "texture" },
                heightMaps: { group: 0, binding: 11, type: "texture" },
                metalnessMaps: { group: 0, binding: 12, type: "texture" },
                emissiveMaps: { group: 0, binding: 13, type: "texture" },
            },
        });
        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));
        const materialSampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", materialSampler);
        this.initialized = true;
    }
    execute(resources) {
        if (!this.initialized)
            return;
        const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices);
        const inputIndirectMeshInfo = resources.getResource(MeshletPassParams.indirectMeshInfo);
        const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo);
        const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo);
        const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo);
        const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer);
        const textureMaps = resources.getResource(MeshletPassParams.textureMaps);
        let inputIsCullingPrepass = resources.getResource(MeshletPassParams.isCullingPrepass);
        if (!inputIndirectVertices)
            return;
        if (!inputIndirectInstanceInfo)
            return;
        const mainCamera = Camera.mainCamera;
        this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
        this.shader.SetBuffer("vertices", inputIndirectVertices);
        this.shader.SetBuffer("meshMaterialInfo", inputIndirectMeshInfo);
        this.shader.SetBuffer("objectInfo", inputIndirectObjectInfo);
        this.shader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
        this.shader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
        if (textureMaps.albedo)
            this.shader.SetTexture("albedoMaps", textureMaps.albedo);
        if (textureMaps.normal)
            this.shader.SetTexture("normalMaps", textureMaps.normal);
        if (textureMaps.height)
            this.shader.SetTexture("heightMaps", textureMaps.height);
        if (textureMaps.metalness)
            this.shader.SetTexture("metalnessMaps", textureMaps.metalness);
        if (textureMaps.emissive)
            this.shader.SetTexture("emissiveMaps", textureMaps.emissive);
        const settings = resources.getResource(PassParams.DebugSettings);
        this.shader.SetArray("settings", settings);
        const gBufferAlbedoRT = resources.getResource(PassParams.GBufferAlbedo);
        const gBufferNormalRT = resources.getResource(PassParams.GBufferNormal);
        const gBufferERMORT = resources.getResource(PassParams.GBufferERMO);
        const gBufferDepthRT = resources.getResource(PassParams.GBufferDepth);
        const colorTargets = [
            { target: gBufferAlbedoRT, clear: inputIsCullingPrepass },
            { target: gBufferNormalRT, clear: inputIsCullingPrepass },
            { target: gBufferERMORT, clear: inputIsCullingPrepass },
        ];
        RendererContext.BeginRenderPass(`IGBuffer - prepass: ${+inputIsCullingPrepass}`, colorTargets, { target: gBufferDepthRT, clear: inputIsCullingPrepass }, true);
        RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
        RendererContext.EndRenderPass();
    }
}
