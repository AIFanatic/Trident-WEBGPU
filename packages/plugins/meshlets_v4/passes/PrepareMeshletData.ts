import {
    Components,
    EventSystem,
    GPU,
    PBRMaterial
} from "@trident/core";
import { MeshletMesh, MeshletEvents } from "../MeshletMesh";
import { MeshletPassParams } from "./MeshletDraw";

import { MeshletDebug } from "../MeshletDebug";

type Slot = { n: number; view: "f32" | "u32" | "i32" };

const f32 = { n: 1, view: "f32" } as const;
const u32 = { n: 1, view: "u32" } as const;
const i32 = { n: 1, view: "i32" } as const;

const vec2u = { n: 2, view: "u32" } as const;
const vecfu = { n: 2, view: "f32" } as const;

const vec4u = { n: 4, view: "u32" } as const;
const vec4f = { n: 4, view: "f32" } as const;
const mat4f = { n: 16, view: "f32" } as const;
function autoLayout<T extends Record<string, Slot>>(spec: T) {
    let offset = 0;
    const buffer = new ArrayBuffer(
        Object.values(spec).reduce((s, v) => s + v.n, 0) * 4
    );

    const views = {} as {
        [K in keyof T]:
        T[K]["view"] extends "u32" ? Uint32Array :
        T[K]["view"] extends "i32" ? Int32Array :
        Float32Array;
    };

    for (const k in spec) {
        const { n, view } = spec[k];
        views[k] =
            view === "u32"
                ? new Uint32Array(buffer, offset * 4, n)
                : view === "i32"
                    ? new Int32Array(buffer, offset * 4, n)
                    : new Float32Array(buffer, offset * 4, n) as any;

        offset += n;
    }

    return { buffer, views };
}

export class PrepareMeshletData extends GPU.RenderPass {
    public name: string = "PrepareMeshletData";

    private meshletParams: GPU.Buffer;

    /** Interleaved vertex attributes (Float32) for all meshes */
    private vertexAttribBuffer: GPU.DynamicBufferMemoryAllocator;

    /** meshopt arrays (u32) */
    private meshletTrianglesBuffer: GPU.DynamicBufferMemoryAllocator;  // expanded meshlet_triangles_result (u8→u32)
    /** meshlet headers: array<MeshletInfo> (4×u32 each = 16 bytes) */
    private meshletInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private lodMeshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    /** per-instance: ObjectInfo { meshletIndex:u32, lodMeshIndex:u32 } */
    private objectInfoBuffer: GPU.Buffer;

    private materialInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private currentObjectCount = 0;

    private needsUpdate = true;

    private meshletFrameBuffer = autoLayout({
        meshletCount: u32,
        isFrustumCullingEnabled: f32,
        isBackFaceCullingEnabled: f32,
        isOcclusionCullingEnabled: f32,
        isSmallFeaturesCullingEnabled: f32,

        isDebugDepthPassEnabled: f32,
        isDynamicLODEnabled: f32,
        staticLODValue: f32,
        dynamicLODErrorThresholdValue: f32
    });

    public async init(resources: GPU.ResourcePool) {
        const s = 1000;
        this.meshletParams = GPU.Buffer.Create(92 * 4, GPU.BufferType.STORAGE);
        this.vertexAttribBuffer = new GPU.DynamicBufferMemoryAllocator(s * 64 * 12 * 4); // guess: s verts * 8 floats * 4B // s * 64 * 8 * 4
        this.meshletTrianglesBuffer = new GPU.DynamicBufferMemoryAllocator(s * 128 * 3 * 4);// u32 (expanded)
        this.meshletInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 4 * 4);         // 16 bytes/meshlet
        this.meshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 16 * 4);         // 16 bytes/meshlet
        this.lodMeshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 10 * 4);
        this.objectInfoBuffer = GPU.Buffer.Create(s * 2 * 4, GPU.BufferType.STORAGE);
        this.materialInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 80 * 4);          // 80 bytes/mesh

        this.initialized = true;

        EventSystem.on(MeshletEvents.Updated, meshlet => {
            console.log("Updated", meshlet)
            this.needsUpdate = true;
        })

        MeshletDebug.isBackFaceCullingEnabled = true;
    }

    private getOrSet(buffer: GPU.DynamicBufferMemoryAllocator, link: any, setValue: Float32Array | Uint32Array | Uint16Array | Uint8Array) {
        if (buffer.has(link)) return buffer.get(link);
        return buffer.set(link, setValue);
    }

    public async preFrame(resources: GPU.ResourcePool) {
        if (this.needsUpdate) {
            const scene = Components.Camera.mainCamera.gameObject.scene;
            const sceneMeshlets = scene.GetComponents(MeshletMesh);

            // Sort frame meshlets per material
            let frameMeshlets: Map<PBRMaterial, MeshletMesh[]> = new Map();
            for (const meshletMesh of sceneMeshlets) {
                if (!(meshletMesh.material instanceof PBRMaterial)) continue;
                let array = frameMeshlets.get(meshletMesh.material) || [];
                array.push(meshletMesh);
                frameMeshlets.set(meshletMesh.material, array);
            }

            let materialIndices: Map<PBRMaterial, number> = new Map();
            let i = 0;
            for (const [material, frameMeshlet] of frameMeshlets) materialIndices.set(material, i++);

            const drawIndirectBuffer = GPU.Buffer.Create(frameMeshlets.size * 4 * 4, GPU.BufferType.INDIRECT);

            let totalMeshletCount = 0;
            for (const [, meshletMeshes] of frameMeshlets) {
                for (const meshletMesh of meshletMeshes) totalMeshletCount += meshletMesh.meshlets.length;
            }
            const requiredBytes = totalMeshletCount * 2 * 4;
            if (requiredBytes > this.objectInfoBuffer.size) {
                this.objectInfoBuffer.Destroy();
                this.objectInfoBuffer = GPU.Buffer.Create(requiredBytes, GPU.BufferType.STORAGE_WRITE);
            }

            this.currentObjectCount = 0;

            console.time("build")
            for (const [material, meshletMeshes] of frameMeshlets) {
                const materialIndex = materialIndices.get(material);

                const materialInfoIndex = this.getOrSet(this.materialInfoBuffer, material, new Float32Array([
                    material.params.albedoColor.r, material.params.albedoColor.g, material.params.albedoColor.b, material.params.albedoColor.a,
                    material.params.emissiveColor.r, material.params.emissiveColor.g, material.params.emissiveColor.b, material.params.emissiveColor.a,
                    material.params.roughness, material.params.metalness, +material.params.unlit, material.params.alphaCutoff,
                    material.params.repeat.x, material.params.repeat.y,
                    material.params.offset.x, material.params.offset.y,
                    +material.params.wireframe,
                    0, 0, 0
                ]));

                for (const meshletMesh of meshletMeshes) {
                    const meshIndex = this.getOrSet(this.meshInfoBuffer, meshletMesh.id, meshletMesh.transform.localToWorldMatrix.elements) / 16;

                    const baseVertexFloatOffset = this.getOrSet(this.vertexAttribBuffer, meshletMesh.interleavedVertices.crc, meshletMesh.interleavedVertices.array);
                    const baseTriangleOffset = this.getOrSet(this.meshletTrianglesBuffer, meshletMesh.indices.crc, meshletMesh.indices.array);

                    const meshlets = meshletMesh.meshlets;
                    const meshletInfoKey = meshletMesh.indices.crc;
                    let meshletInfoOffset = this.meshletInfoBuffer.get(meshletInfoKey);

                    if (meshletInfoOffset == null) {
                        meshletInfoOffset = this.meshletInfoBuffer.set(meshletInfoKey, meshletMesh.meshletInfoPacked);
                    }

                    const meshletBaseIndex = meshletInfoOffset / MeshletMesh.MeshletInfoFloatStride;
                    const objectInfo = new Uint32Array(meshlets.length * 2);
                    const lodIndexCache = new Map<number, number>();

                    for (let meshletIndex = 0; meshletIndex < meshlets.length; meshletIndex++) {
                        const meshlet = meshlets[meshletIndex];
                        let lodMeshIndex = lodIndexCache.get(meshlet.lod);
                        if (lodMeshIndex === undefined) {
                            const lodMeshData = new Uint32Array([meshlet.lod, meshIndex, baseVertexFloatOffset, baseTriangleOffset, materialIndex]);
                            lodMeshIndex = this.getOrSet(this.lodMeshInfoBuffer, `${meshletMesh.id}-${meshlet.lod}`, lodMeshData) / lodMeshData.length;
                            lodIndexCache.set(meshlet.lod, lodMeshIndex);
                        }

                        const base = meshletIndex * 2;
                        objectInfo[base] = meshletBaseIndex + meshletIndex;
                        objectInfo[base + 1] = lodMeshIndex;
                    }

                    const objectInfoByteOffset = this.currentObjectCount * 2 * 4;
                    this.objectInfoBuffer.SetArray(objectInfo, objectInfoByteOffset);
                    this.currentObjectCount += meshlets.length;
                }
            }
            console.timeEnd("build")

            resources.setResource(MeshletPassParams.DrawIndirectBuffer, drawIndirectBuffer);
            resources.setResource(MeshletPassParams.VertexBuffer, this.vertexAttribBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletTrianglesBuffer, this.meshletTrianglesBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletBuffer, this.meshletInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshBuffer, this.meshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.LodMeshBuffer, this.lodMeshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MaterialInfoBuffer, this.materialInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.ObjectInfoBuffer, this.objectInfoBuffer);
            resources.setResource(MeshletPassParams.CurrentMeshletCount, this.currentObjectCount);
            resources.setResource(MeshletPassParams.FrameMeshlets, frameMeshlets);
            console.log(frameMeshlets.size, frameMeshlets);

            this.needsUpdate = false;
        }

        this.meshletFrameBuffer.views.meshletCount.set([this.currentObjectCount]);
        this.meshletFrameBuffer.views.isFrustumCullingEnabled.set([+MeshletDebug.isFrustumCullingEnabled]);
        this.meshletFrameBuffer.views.isBackFaceCullingEnabled.set([+MeshletDebug.isBackFaceCullingEnabled]);
        this.meshletFrameBuffer.views.isOcclusionCullingEnabled.set([+MeshletDebug.isOcclusionCullingEnabled]);
        this.meshletFrameBuffer.views.isSmallFeaturesCullingEnabled.set([+MeshletDebug.isSmallFeaturesCullingEnabled]);
        this.meshletFrameBuffer.views.isDebugDepthPassEnabled.set([+MeshletDebug.isDebugDepthPassEnabled]);
        this.meshletFrameBuffer.views.isDynamicLODEnabled.set([+MeshletDebug.isDynamicLODEnabled]);
        this.meshletFrameBuffer.views.staticLODValue.set([MeshletDebug.staticLODValue]);
        this.meshletFrameBuffer.views.dynamicLODErrorThresholdValue.set([MeshletDebug.dynamicLODErrorThresholdValue]);

        this.meshletParams.SetArray(this.meshletFrameBuffer.buffer);
        resources.setResource(MeshletPassParams.MeshletParams, this.meshletParams);
    }
}
