import { GPU, PBRMaterial, Renderer } from "@trident/core";
import { MeshletPassParams } from "./MeshletDraw";
import { MeshletDebug } from "../MeshletDebug";

export class CullingPass extends GPU.RenderPass {
    public name: string = "CullingPass";

    private instanceInfoBuffer: GPU.Buffer;

    private compute: GPU.ShaderCompute;

    private debugBuffer: GPU.Buffer;

    private visibleObjects = 0;
    private triangleCount = 0;
    private visibleTriangles = 0;

    public async init(resources: GPU.ResourcePool) {
        this.compute = await GPU.ShaderCompute.Create({
            name: this.name,
            code: await GPU.ShaderLoader.LoadURL(new URL("../resources/CullingPass.wgsl", import.meta.url)),
            computeEntrypoint: "main",
        });

        this.debugBuffer = new GPU.Buffer(4 * 4, GPU.BufferType.STORAGE);
        this.instanceInfoBuffer = new GPU.Buffer(8, GPU.BufferType.STORAGE_WRITE);

        this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
    }

    public preFrame(resources: GPU.ResourcePool) {
        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
        if (currentMeshletCount === 0) return;

        const frameBuffer            = resources.getResource(GPU.PassParams.FrameBuffer) as GPU.Buffer;
        const meshletParams          = resources.getResource(MeshletPassParams.MeshletParams) as GPU.Buffer;
        const meshletInfoBuffer      = resources.getResource(MeshletPassParams.MeshletBuffer) as GPU.Buffer;
        const meshInfoBuffer         = resources.getResource(MeshletPassParams.MeshBuffer) as GPU.Buffer;
        const lodMeshBuffer          = resources.getResource(MeshletPassParams.LodMeshBuffer) as GPU.Buffer;
        const objectInfoBuffer       = resources.getResource(MeshletPassParams.ObjectInfoBuffer) as GPU.Buffer;
        const drawIndirectBuffer     = resources.getResource(MeshletPassParams.DrawIndirectBuffer) as GPU.Buffer;
        const frameMeshlets          = resources.getResource(MeshletPassParams.FrameMeshlets) as Map<PBRMaterial, number>;

        // Per-material draw header. firstInstance is where this material's surviving
        // (objectIndex, instanceIndex) pairs land in instanceInfoBuffer.
        const drawInit = new Uint32Array(frameMeshlets.size * 4);
        let running = 0;
        let m = 0;
        for (const survivors of frameMeshlets.values()) {
            drawInit[m * 4 + 0] = 128 * 3; // vertexCount
            drawInit[m * 4 + 1] = 0;       // instanceCount (atomic)
            drawInit[m * 4 + 2] = 0;       // firstVertex
            drawInit[m * 4 + 3] = running; // firstInstance
            running += survivors;
            m++;
        }
        drawIndirectBuffer.SetArray(drawInit);

        // Two u32 per survivor: (objectIndex, instanceIndex).
        const requiredBytes = Math.max(8, running * 2 * 4);
        if (requiredBytes > this.instanceInfoBuffer.size) {
            this.instanceInfoBuffer = new GPU.Buffer(requiredBytes, GPU.BufferType.STORAGE_WRITE);
            this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
        }

        this.compute.SetBuffer("drawBuffer", drawIndirectBuffer);
        this.compute.SetBuffer("meshletInfoBuffer", meshletInfoBuffer);
        this.compute.SetBuffer("meshInfoBuffer", meshInfoBuffer);
        this.compute.SetBuffer("lodMeshBuffer", lodMeshBuffer);
        this.compute.SetBuffer("objectInfoBuffer", objectInfoBuffer);
        this.compute.SetBuffer("frameBuffer", frameBuffer);
        this.compute.SetBuffer("meshletParamsBuffer", meshletParams);

        resources.setResource(MeshletPassParams.InstanceInfoBuffer, this.instanceInfoBuffer);
    }

    public execute(resources: GPU.ResourcePool) {
        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount) as number;
        if (currentMeshletCount === 0) return;

        const maxInstanceCount = Math.max(1, (resources.getResource(MeshletPassParams.MaxInstanceCount) as number) ?? 1);

        // Matches @workgroup_size(8, 32, 1) in CullingPass.wgsl.
        // Y dim of 32 keeps us under the 65535-workgroups-per-dimension limit at 1M instances.
        GPU.ComputeContext.BeginComputePass(`Meshlets - Culling`, true);
        GPU.ComputeContext.Dispatch(
            this.compute,
            Math.ceil(currentMeshletCount / 8),
            Math.ceil(maxInstanceCount / 32),
            1,
        );
        GPU.ComputeContext.EndComputePass();

        console.log(currentMeshletCount * maxInstanceCount * 1)

        Renderer.info.visibleObjects += this.visibleObjects;
        Renderer.info.triangleCount += this.triangleCount;
        Renderer.info.visibleTriangles += this.visibleTriangles;

        this.debugBuffer.GetData().then(v => {
            const visibleMeshletCount = new Uint32Array(v)[1];
            MeshletDebug.visibleMeshes.SetValue(visibleMeshletCount);
            this.visibleObjects = visibleMeshletCount;
            this.triangleCount = 128 * currentMeshletCount;
            this.visibleTriangles = 128 * visibleMeshletCount;
        });
    }
}
