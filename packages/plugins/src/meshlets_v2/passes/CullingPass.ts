import { Frustum } from "../../../math/Frustum";
import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { Compute } from "../../../renderer/Shader";
import { ShaderLoader } from "../../../renderer/ShaderUtils";
import { MeshletPassParams } from "./MeshletDraw";

import { Buffer, BufferType } from "../../../renderer/Buffer";
import { TextureSampler } from "../../../renderer/TextureSampler";
import { Camera } from "../../../components/Camera";
import { Renderer } from "../../../renderer/Renderer";
import { RendererContext } from "../../../renderer/RendererContext";
import { ComputeContext } from "../../../renderer/ComputeContext";
import { Meshlet } from "../Meshlet";
import { MeshletDebug } from "./MeshletDebug";
import { RendererDebug } from "../../../renderer/RendererDebug";

export class CullingPass extends RenderPass {
    public name: string = "CullingPass";

    private drawIndirectBuffer: Buffer;
    private compute: Compute;

    private cullData: Buffer;
    private frustum: Frustum = new Frustum();

    private visibilityBuffer: Buffer;
    private instanceInfoBuffer: Buffer;

    private debugBuffer: Buffer;

    constructor() {
        super({
            inputs: [
                MeshletPassParams.indirectMeshletInfo,
                MeshletPassParams.indirectObjectInfo,
                MeshletPassParams.indirectMeshMatrixInfo,
                MeshletPassParams.meshletsCount,
                MeshletPassParams.meshletSettings
            ],
            outputs: [
                MeshletPassParams.indirectDrawBuffer,
                MeshletPassParams.indirectInstanceInfo,

                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
                PassParams.GBufferDepth
            ]
        });
    }

    public async init(resources: ResourcePool) {
        this.compute = await Compute.Create({
            code: await ShaderLoader.Cull,
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

        this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";
        this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);


        const sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.compute.SetSampler("textureSampler", sampler);

        this.debugBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);
    }

    public execute(resources: ResourcePool) {
        const mainCamera = Camera.mainCamera;

        const meshletCount = resources.getResource(MeshletPassParams.meshletsCount) as number;
        const meshletInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshletInfo) as Buffer;
        const objectInfoBuffer = resources.getResource(MeshletPassParams.indirectObjectInfo) as Buffer;
        const meshMatrixInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo) as Buffer;
        
        if (meshletCount === 0) return;

        if (!this.visibilityBuffer) {
            const visibilityBufferArray = new Float32Array(meshletCount).fill(1);
            this.visibilityBuffer = Buffer.Create(visibilityBufferArray.byteLength, BufferType.STORAGE_WRITE);
            this.visibilityBuffer.SetArray(visibilityBufferArray);
        }
        if (!this.instanceInfoBuffer) {
            console.log("meshletCount", meshletCount)
            this.instanceInfoBuffer = Buffer.Create(meshletCount * 1 * 4, BufferType.STORAGE_WRITE);
            this.instanceInfoBuffer.name = "instanceInfoBuffer"
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
            Renderer.width, Renderer.height,0,0,
            mainCamera.near, mainCamera.far,
            ...mainCamera.projectionMatrix.clone().transpose().elements,
        ])
        if (!this.cullData) {
            this.cullData = Buffer.Create(cullDataArray.byteLength, BufferType.STORAGE);
            this.cullData.name = "cullData";
            this.compute.SetBuffer("cullData", this.cullData);
        }
        this.cullData.SetArray(cullDataArray);

        this.compute.SetArray("meshletSettings", resources.getResource(MeshletPassParams.meshletSettings));

        
        RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, this.debugBuffer);


        RendererContext.ClearBuffer(this.drawIndirectBuffer);

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletCount) / 4);

        ComputeContext.BeginComputePass(`Culling`, true);
        ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        ComputeContext.EndComputePass();

        resources.setResource(MeshletPassParams.indirectDrawBuffer, this.drawIndirectBuffer);
        resources.setResource(MeshletPassParams.indirectInstanceInfo, this.instanceInfoBuffer);

        this.debugBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            MeshletDebug.visibleMeshes.SetValue(visibleMeshCount);
            RendererDebug.SetTriangleCount(Meshlet.max_triangles * meshletCount);
            RendererDebug.SetVisibleTriangleCount(Meshlet.max_triangles * visibleMeshCount);
        })
    }
}