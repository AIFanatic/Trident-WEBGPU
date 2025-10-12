import {
    Components,
    EventSystem,
    GPU,
    Mathf
} from "@trident/core";
import { MeshletMeshV3, MeshletEvents } from "../MeshletMesh";
import { MeshletPassParams } from "./MeshletDraw";

import { MeshletDebug } from "../MeshletDebug";

export class PrepareMeshletData extends GPU.RenderPass {
    public name: string = "PrepareMeshletData";

    private frameBuffer: GPU.Buffer;

    /** Interleaved vertex attributes (Float32) for all meshes */
    private vertexAttribBuffer: GPU.DynamicBufferMemoryAllocator;

    /** meshopt arrays (u32) */
    private meshletVerticesBuffer: GPU.DynamicBufferMemoryAllocator;   // meshlet_vertices_result
    private meshletTrianglesBuffer: GPU.DynamicBufferMemoryAllocator;  // expanded meshlet_triangles_result (u8→u32)
    /** meshlet headers: array<MeshletInfo> (4×u32 each = 16 bytes) */
    private meshletInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private lodMeshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    /** per-instance: InstanceInfo { meshletIndex:u32, baseVertexFloatOffset:u32 } */
    private objectInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private currentMeshletCount = 0;

    private needsUpdate = true;

    public async init(resources: GPU.ResourcePool) {
        this.frameBuffer = GPU.Buffer.Create(92 * 4, GPU.BufferType.STORAGE);
        this.vertexAttribBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 64 * 8 * 4); // guess: 10000 verts * 8 floats * 4B
        this.meshletVerticesBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 128 * 4);    // u32
        this.meshletTrianglesBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 128 * 3 * 4);// u32 (expanded)
        this.meshletInfoBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 4 * 4);         // 16 bytes/meshlet
        this.meshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 16 * 4);         // 16 bytes/meshlet
        this.lodMeshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 8 * 4);         // 16 bytes/meshlet
        this.objectInfoBuffer = new GPU.DynamicBufferMemoryAllocator(10000 * 2 * 4);          // 12 bytes/instance (3×u32)

        this.initialized = true;

        EventSystem.on(MeshletEvents.Updated, meshlet => {
            this.needsUpdate = true;
        })

        MeshletDebug.isBackFaceCullingEnabled = true;
    }

    public async preFrame(resources: GPU.ResourcePool) {
        if (this.needsUpdate) {
            const scene = Components.Camera.mainCamera.gameObject.scene;
            const meshletMeshes = scene.GetComponents(MeshletMeshV3);
    
            this.currentMeshletCount = 0;
    
            for (const meshletMesh of meshletMeshes) {
                const lodMeshlets = meshletMesh.lodMeshlets;
                const meshIndex = this.meshInfoBuffer.set(meshletMesh.id, meshletMesh.transform.localToWorldMatrix.elements) / 16;
    
                for (const lodMeshlet of lodMeshlets) {
                    const lodKey = `${meshletMesh.id}-${lodMeshlet.lod}`;
                    const baseVertexOffset = this.meshletVerticesBuffer.set(lodKey, lodMeshlet.vertices);
                    const baseTriangleOffset = this.meshletTrianglesBuffer.set(lodKey, new Uint32Array(lodMeshlet.indices));
                    const baseVertexFloatOffset = this.vertexAttribBuffer.set(lodKey, lodMeshlet.interleavedVertices);
                    const lodMeshData = new Uint32Array([lodMeshlet.lod, meshIndex, baseVertexFloatOffset, baseVertexOffset, baseTriangleOffset]);
                    const lodMeshIndex = this.lodMeshInfoBuffer.set(lodKey, lodMeshData);
    
                    const meshlets = lodMeshlet.meshlets;
                    for (let meshletIndex = 0; meshletIndex < meshlets.length; meshletIndex++) {
                        const m = meshlets[meshletIndex];
    
                        const meshletInfo = new Float32Array([
                            m.vertex_offset,
                            m.triangle_offset,
                            m.triangle_count,
                            m.vertex_count,
                            ...m.bounds.center, m.bounds.radius,
                            ...m.parentBounds.center, m.parentBounds.radius,
                            ...m.cone.axis, m.cone.cutoff,
                            ...m.cone.apex, 0,
                            m.parentError, m.error, 0, 0
                        ]);
    
                        const meshletOffset = this.meshletInfoBuffer.set(`${lodKey}-${meshletIndex}`, meshletInfo);
    
                        this.objectInfoBuffer.set(this.currentMeshletCount, new Uint32Array([
                            meshletOffset / meshletInfo.length, // meshletIndex
                            lodMeshIndex / lodMeshData.length, // lodMeshIndex 
                        ]));
    
                        this.currentMeshletCount++;
                    }
                }
            }
    
            resources.setResource(MeshletPassParams.VertexBuffer, this.vertexAttribBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletVerticesBuffer, this.meshletVerticesBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletTrianglesBuffer, this.meshletTrianglesBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletBuffer, this.meshletInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshBuffer, this.meshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.LodMeshBuffer, this.lodMeshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.ObjectInfoBuffer, this.objectInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.CurrentMeshletCount, this.currentMeshletCount);

            this.needsUpdate = false;
        }

        const mainCamera = Components.Camera.mainCamera;
        const viewProjection = mainCamera.projectionMatrix.clone().mul(mainCamera.viewMatrix);
        const frustumPlanes = mainCamera.frustum.planes;

        const frameBufferData = new Float32Array([
            ...mainCamera.projectionMatrix.elements,
            ...mainCamera.viewMatrix.elements,
            ...mainCamera.transform.position.elements, 0,
            ...frustumPlanes[0].normal.elements, frustumPlanes[0].constant,
            ...frustumPlanes[1].normal.elements, frustumPlanes[1].constant,
            ...frustumPlanes[2].normal.elements, frustumPlanes[2].constant,
            ...frustumPlanes[3].normal.elements, frustumPlanes[3].constant,
            ...frustumPlanes[4].normal.elements, frustumPlanes[4].constant,
            ...frustumPlanes[5].normal.elements, frustumPlanes[5].constant,
            this.currentMeshletCount, 0,
            GPU.Renderer.width, GPU.Renderer.height, 0, 0,
            mainCamera.near, mainCamera.far,
            ...viewProjection.elements,

            +MeshletDebug.isFrustumCullingEnabled,
            +MeshletDebug.isBackFaceCullingEnabled,
            +MeshletDebug.isOcclusionCullingEnabled,
            +MeshletDebug.isSmallFeaturesCullingEnabled,

            +MeshletDebug.isDebugDepthPassEnabled,
            +MeshletDebug.isDynamicLODEnabled,
            +MeshletDebug.staticLODValue,
            MeshletDebug.dynamicLODErrorThresholdValue
        ]);
        this.frameBuffer.SetArray(frameBufferData);
        resources.setResource(MeshletPassParams.FrameBuffer, this.frameBuffer);
    }

    public async execute(_resources: GPU.ResourcePool) { }
}