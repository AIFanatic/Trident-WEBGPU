import { Geometry, VertexAttribute, GPU, Scene, PBRMaterial } from "@trident/core";
import { MeshletPassParams } from "./MeshletDraw";
import { MeshletMesh } from "../MeshletMesh";

export class IndirectGBufferPass extends GPU.RenderPass {
    public name: string = "IndirectGBufferPass";

    private shader: GPU.Shader;
    private geometry: Geometry;

    private dummyTexture: GPU.Texture;

    public async init(resources: GPU.ResourcePool) {
        const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

        this.shader = await GPU.Shader.Create({
            name: this.name,
            code: await GPU.ShaderLoader.LoadURL(new URL("../resources/DrawIndirectGBuffer.wgsl", import.meta.url)),
            colorOutputs: [
                { format: gbufferFormat },
                { format: gbufferFormat },
                { format: gbufferFormat },
            ],
            depthOutput: "depth24plus"
        });

        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(1)));

        this.shader.SetSampler("TextureSampler", GPU.TextureSampler.Create());

        // Dummy
        this.dummyTexture = GPU.Texture.Create(1,1);

        this.initialized = true;
    }

    public async preFrame(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
        if (currentMeshletCount === 0) return;

        const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer) as GPU.Buffer;
        const vertexBuffer = resources.getResource(MeshletPassParams.VertexBuffer) as GPU.Buffer;
        const meshletTrianglesBuffer = resources.getResource(MeshletPassParams.MeshletTrianglesBuffer) as GPU.Buffer;
        const meshletBuffer = resources.getResource(MeshletPassParams.MeshletBuffer) as GPU.Buffer;
        const meshBuffer = resources.getResource(MeshletPassParams.MeshBuffer) as GPU.Buffer;
        const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer) as GPU.Buffer;
        const materialInfoBuffer = resources.getResource(MeshletPassParams.MaterialInfoBuffer) as GPU.Buffer;
        const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer) as GPU.Buffer;
        const instanceInfoBuffer = resources.getResource(MeshletPassParams.InstanceInfoBuffer) as GPU.Buffer;

        this.shader.SetBuffer("frameBuffer", frameBuffer);
        this.shader.SetBuffer("vertexBuffer", vertexBuffer);
        this.shader.SetBuffer("meshletTrianglesBuffer", meshletTrianglesBuffer);
        this.shader.SetBuffer("meshletBuffer", meshletBuffer);
        this.shader.SetBuffer("meshBuffer", meshBuffer);
        this.shader.SetBuffer("lodMeshBuffer", lodMeshBuffer);
        this.shader.SetBuffer("materialInfoBuffer", materialInfoBuffer);
        this.shader.SetBuffer("objectInfoBuffer", objectInfoBuffer);
        this.shader.SetBuffer("instanceInfoBuffer", instanceInfoBuffer);
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
        if (currentMeshletCount === 0) return;

        const gBufferAlbedoRT = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const gBufferNormalRT = resources.getResource(GPU.PassParams.GBufferNormal);
        const gBufferERMORT = resources.getResource(GPU.PassParams.GBufferERMO);
        const gBufferDepthRT = resources.getResource(GPU.PassParams.GBufferDepth);

        const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.DrawIndirectBuffer) as GPU.Buffer;

        const colorTargets: GPU.RenderTarget[] = [
            { target: gBufferAlbedoRT, clear: false },
            { target: gBufferNormalRT, clear: false },
            { target: gBufferERMORT, clear: false },
        ];

        GPU.RendererContext.BeginRenderPass(`Meshlets - Draw prepass: ${+true}`, colorTargets, {target: gBufferDepthRT, clear: false}, true);
        const frameMeshlets = resources.getResource(MeshletPassParams.FrameMeshlets) as Map<PBRMaterial, MeshletMesh[]>;
        let materialIndex = 0;
        for (const [material] of frameMeshlets) {
            const albedoMap = material.params.albedoMap ? material.params.albedoMap : this.dummyTexture;
            const normalMap = material.params.normalMap ? material.params.normalMap : this.dummyTexture;
            const metalnessMap = material.params.metalnessMap ? material.params.metalnessMap : this.dummyTexture;
            // console.log(albedoMap.width)
            this.shader.SetTexture("AlbedoMap", albedoMap);
            this.shader.SetTexture("NormalMap", normalMap);
            this.shader.SetTexture("MetalnessMap", metalnessMap);
            GPU.RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer, materialIndex * 16);
            materialIndex++;
        }
        GPU.RendererContext.EndRenderPass();
    }
}
