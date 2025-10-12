import {
    Components,
    Mathf,
    GPU
} from "@trident/core";

import { MeshletPassParams } from "./MeshletDraw";
import { MeshletDebug } from "./MeshletDebug";

export class CullingPass extends GPU.RenderPass {
    public name: string = "CullingPass";

    private drawIndirectBuffer: GPU.Buffer;
    private compute: GPU.Compute;

    private cullData: GPU.Buffer;
    private frustum: Mathf.Frustum = new Mathf.Frustum();

    private visibilityBuffer: GPU.Buffer;
    private instanceInfoBuffer: GPU.Buffer;

    private debugBuffer: GPU.Buffer;

    public async init(resources: GPU.ResourcePool) {
        this.compute = await GPU.Compute.Create({
            name: this.name,
            code: await GPU.ShaderLoader.LoadURL(new URL("../resources/Cull.wgsl", import.meta.url)),
            computeEntrypoint: "main",
            uniforms: {
                drawBuffer: {group: 0, binding: 0, type: "storage-write"},
                instanceInfo: {group: 0, binding: 1, type: "storage-write"},
                cullData: {group: 0, binding: 2, type: "storage"},

                meshletInfo: {group: 0, binding: 3, type: "storage"},
                objectInfo: {group: 0, binding: 4, type: "storage"},
                meshMatrixInfo: {group: 0, binding: 5, type: "storage"},

                visibilityBuffer: {group: 0, binding: 6, type: "storage-write"},
                bPrepass: {group: 0, binding: 7, type: "storage"},

                textureSampler: {group: 0, binding: 8, type: "sampler"},
                depthTexture: {group: 0, binding: 9, type: "depthTexture"},

                meshletSettings: {group: 0, binding: 10, type: "storage"},
            }
        });

        this.drawIndirectBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";
        this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);


        const sampler = GPU.TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.compute.SetSampler("textureSampler", sampler);

        this.debugBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);

        this.initialized = true;
    }

    private visibilityCapacity = 0;
    private instanceCapacity = 0;

    public async preFrame(resources: GPU.ResourcePool) {
        const mainCamera = Components.Camera.mainCamera;

        const meshletCount = resources.getResource(MeshletPassParams.meshletsCount) as number;
        const meshletInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshletInfo) as GPU.Buffer;
        const objectInfoBuffer = resources.getResource(MeshletPassParams.indirectObjectInfo) as GPU.Buffer;
        const meshMatrixInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo) as GPU.Buffer;
        
        if (meshletCount === 0) return;

        if (meshletCount > this.visibilityCapacity || !this.visibilityBuffer) {
            const visibilityBufferArray = new Float32Array(meshletCount).fill(1);
            this.visibilityBuffer = GPU.Buffer.Create(visibilityBufferArray.byteLength, GPU.BufferType.STORAGE_WRITE);
            this.visibilityBuffer.SetArray(visibilityBufferArray);
            this.visibilityCapacity = meshletCount;
        }
        if (meshletCount > this.instanceCapacity || !this.instanceInfoBuffer) {
            this.instanceInfoBuffer = GPU.Buffer.Create(meshletCount * 1 * 4, GPU.BufferType.STORAGE_WRITE);
            this.instanceInfoBuffer.name = "instanceInfoBuffer";
            this.instanceCapacity = meshletCount;
        }

        this.compute.SetBuffer("meshletInfo", meshletInfoBuffer);
        this.compute.SetBuffer("objectInfo", objectInfoBuffer);
        this.compute.SetBuffer("meshMatrixInfo", meshMatrixInfoBuffer);
        this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
        this.compute.SetBuffer("visibilityBuffer", this.visibilityBuffer);
        
        this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);

        const cullDataArray = new Float32Array([
            ...mainCamera.projectionMatrix.elements,
            ...mainCamera.viewMatrix.elements,
            ...mainCamera.transform.position.elements, 0,
            ...this.frustum.planes[0].normal.elements, this.frustum.planes[0].constant,
            ...this.frustum.planes[1].normal.elements, this.frustum.planes[1].constant,
            ...this.frustum.planes[2].normal.elements, this.frustum.planes[2].constant,
            ...this.frustum.planes[3].normal.elements, this.frustum.planes[3].constant,
            ...this.frustum.planes[4].normal.elements, this.frustum.planes[4].constant,
            ...this.frustum.planes[5].normal.elements, this.frustum.planes[5].constant,
            meshletCount, 0,
            GPU.Renderer.width, GPU.Renderer.height,0,0,
            mainCamera.near, mainCamera.far,
            ...mainCamera.projectionMatrix.clone().transpose().elements,
        ])
        if (!this.cullData) {
            this.cullData = GPU.Buffer.Create(cullDataArray.byteLength, GPU.BufferType.STORAGE);
            this.cullData.name = "cullData";
            this.compute.SetBuffer("cullData", this.cullData);
        }
        this.cullData.SetArray(cullDataArray);

        this.compute.SetArray("meshletSettings", resources.getResource(MeshletPassParams.meshletSettings));
    }

    public async execute(resources: GPU.ResourcePool) {
        const meshletCount = resources.getResource(MeshletPassParams.meshletsCount) as number;
        
        GPU.RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, this.debugBuffer);


        GPU.RendererContext.ClearBuffer(this.drawIndirectBuffer);

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletCount) / 4);

        GPU.ComputeContext.BeginComputePass(`Culling`, true);
        GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        GPU.ComputeContext.EndComputePass();

        resources.setResource(MeshletPassParams.indirectDrawBuffer, this.drawIndirectBuffer);
        resources.setResource(MeshletPassParams.indirectInstanceInfo, this.instanceInfoBuffer);

        this.debugBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            MeshletDebug.visibleMeshes.SetValue(visibleMeshCount);
            // RendererDebug.SetTriangleCount(Meshlet.max_triangles * meshletCount);
            // RendererDebug.visibleTriangles = Meshlet.max_triangles * visibleMeshCount;
        })
    }
}