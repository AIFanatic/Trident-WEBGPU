import { Components, GPU, Mathf, Renderer } from "@trident/core";
import { MeshletPassParams } from "./MeshletDraw";
import { MeshletDebug } from "../MeshletDebug";
import { MeshletMesh } from "../MeshletMesh";

export class CullingPass extends GPU.RenderPass {
    public name: string = "CullingPass";

    private instanceInfoBuffer: GPU.Buffer;

    private compute: GPU.Compute;

    private debugBuffer: GPU.Buffer;

    // Debug
    private visibleObjects = 0;
    private triangleCount = 0;
    private visibleTriangles = 0;

    public async init(resources: GPU.ResourcePool) {
        this.compute = await GPU.Compute.Create({
            name: this.name,
            code: await GPU.ShaderLoader.LoadURL(new URL("../resources/CullingPass.wgsl", import.meta.url)),
            computeEntrypoint: "main",
        });

        this.debugBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
        this.instanceInfoBuffer = GPU.Buffer.Create(1 * 1 * 4, GPU.BufferType.STORAGE_WRITE);

        this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
    }

    public async preFrame(resources: GPU.ResourcePool) {
        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
        if (currentMeshletCount === 0) return;
        const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer) as GPU.Buffer;
        const meshletParams = resources.getResource(MeshletPassParams.MeshletParams) as GPU.Buffer;
        const meshletInfoBuffer = resources.getResource(MeshletPassParams.MeshletBuffer) as GPU.Buffer;
        const meshInfoBuffer = resources.getResource(MeshletPassParams.MeshBuffer) as GPU.Buffer;
        const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer) as GPU.Buffer;
        const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer) as GPU.Buffer;
        const drawIndirectBuffer = resources.getResource(MeshletPassParams.DrawIndirectBuffer) as GPU.Buffer;

        if (currentMeshletCount > this.instanceInfoBuffer.size / 4) {
            this.instanceInfoBuffer = GPU.Buffer.Create(currentMeshletCount * 4, GPU.BufferType.STORAGE_WRITE);
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

        const frameMeshlets = resources.getResource(MeshletPassParams.FrameMeshlets) as Map<GPU.Material, MeshletMesh[]>;

        const drawInit = new Uint32Array(frameMeshlets.size * 4);

        let running = 0;
        let m = 0;
        for (const [, meshlets] of frameMeshlets) {
            let meshletCount = 0;
            for (const meshletMesh of meshlets) meshletCount += meshletMesh.meshlets.length;

            drawInit[m * 4 + 0] = 128 * 3; // vertexCount
            drawInit[m * 4 + 1] = 0;       // instanceCount
            drawInit[m * 4 + 2] = 0;       // firstVertex
            drawInit[m * 4 + 3] = running; // firstInstance

            running += meshletCount;
            m++;
        }

        drawIndirectBuffer.SetArray(drawInit);
    }

    public async execute(resources: GPU.ResourcePool) {
        const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount) as number;
        const drawIndirectBuffer = resources.getResource(MeshletPassParams.DrawIndirectBuffer) as GPU.Buffer;
        if (currentMeshletCount === 0) return;

        // GPU.RendererContext.CopyBufferToBuffer(drawIndirectBuffer, this.debugBuffer);

        // GPU.RendererContext.ClearBuffer(drawIndirectBuffer);

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(currentMeshletCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(currentMeshletCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(currentMeshletCount) / 4);

        GPU.ComputeContext.BeginComputePass(`Meshlets - Culling`, true);
        GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        GPU.ComputeContext.EndComputePass();

        Renderer.info.visibleObjects += this.visibleObjects;
        Renderer.info.triangleCount += this.triangleCount;
        Renderer.info.visibleTriangles += this.visibleTriangles;

        this.debugBuffer.GetData().then(v => {
            const visibleMeshletCount = new Uint32Array(v)[1];
            MeshletDebug.visibleMeshes.SetValue(visibleMeshletCount)
            this.visibleObjects = visibleMeshletCount;
            this.triangleCount = 128 * currentMeshletCount;
            this.visibleTriangles = 128 * visibleMeshletCount;
        })
    }
}