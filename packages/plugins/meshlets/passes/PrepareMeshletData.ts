import {
    Components,
    EventSystem,
    GPU,
    InterleavedVertexAttribute,
    IndexAttribute,
    PBRMaterial,
    Scene
} from "@trident/core";
import { MeshletMesh, MeshletEvents, MeshletInfoFloatStride } from "../MeshletMesh";
import { InstancedMeshletMesh } from "../InstancedMeshletMesh";
import { Meshlet } from "../meshoptimizer/Meshoptimizer";
import { MeshletPassParams } from "./MeshletDraw";

import { MeshletDebug } from "../MeshletDebug";

type Slot = { n: number; view: "f32" | "u32" | "i32" };

const f32 = { n: 1, view: "f32" } as const;
const u32 = { n: 1, view: "u32" } as const;

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

interface Item {
    id: string;
    material: PBRMaterial;
    meshlets: Meshlet[];
    interleavedVertices: InterleavedVertexAttribute;
    indices: IndexAttribute;
    meshletInfoPacked: Float32Array;
    matrices: Float32Array;
    instanceCount: number;
}

export class PrepareMeshletData extends GPU.RenderPass {
    public name: string = "PrepareMeshletData";

    private meshletParams: GPU.Buffer;

    private vertexAttribBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshletTrianglesBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshletInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private lodMeshInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private objectInfoBuffer: GPU.Buffer;
    private materialInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private currentObjectCount = 0;
    private maxInstanceCount = 0;

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
        this.meshletParams = new GPU.Buffer(92 * 4, GPU.BufferType.STORAGE);
        this.vertexAttribBuffer = new GPU.DynamicBufferMemoryAllocator(s * 64 * 12 * 4);
        this.meshletTrianglesBuffer = new GPU.DynamicBufferMemoryAllocator(s * 128 * 3 * 4);
        this.meshletInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 4 * 4);
        this.meshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 16 * 4);
        this.lodMeshInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 10 * 4);
        this.objectInfoBuffer = new GPU.Buffer(s * 2 * 4, GPU.BufferType.STORAGE);
        this.materialInfoBuffer = new GPU.DynamicBufferMemoryAllocator(s * 80 * 4);

        this.initialized = true;

        EventSystem.on(MeshletEvents.Updated, () => { this.needsUpdate = true; });

        MeshletDebug.isBackFaceCullingEnabled = true;
    }

    private getOrSet(buffer: GPU.DynamicBufferMemoryAllocator, link: any, value: Float32Array | Uint32Array | Uint16Array | Uint8Array) {
        if (buffer.has(link)) return buffer.get(link);
        return buffer.set(link, value);
    }

    private collectItems(scene: Scene): Item[] {
        const out: Item[] = [];

        for (const m of scene.GetComponents(MeshletMesh)) {
            if (!(m.material instanceof PBRMaterial)) continue;
            out.push({
                id: m.id,
                material: m.material,
                meshlets: m.meshlets,
                interleavedVertices: m.interleavedVertices,
                indices: m.indices,
                meshletInfoPacked: m.meshletInfoPacked,
                matrices: m.transform.localToWorldMatrix.elements,
                instanceCount: 1,
            });
        }

        for (const g of scene.GetComponents(InstancedMeshletMesh)) {
            if (!(g.material instanceof PBRMaterial)) continue;
            if (g.instanceCount === 0) continue;
            out.push({
                id: g.id,
                material: g.material,
                meshlets: g.meshlets,
                interleavedVertices: g.interleavedVertices,
                indices: g.indices,
                meshletInfoPacked: g.meshletInfoPacked,
                matrices: g.matrices,
                instanceCount: g.instanceCount,
            });
        }

        return out;
    }

    private materialFloats(material: PBRMaterial): Float32Array {
        const p = material.params;
        return new Float32Array([
            p.albedoColor.r, p.albedoColor.g, p.albedoColor.b, p.albedoColor.a,
            p.emissiveColor.r, p.emissiveColor.g, p.emissiveColor.b, p.emissiveColor.a,
            p.roughness, p.metalness, +p.unlit, p.alphaCutoff,
            p.repeat.x, p.repeat.y,
            p.offset.x, p.offset.y,
            +p.wireframe,
            0, 0, 0,
        ]);
    }

    public preFrame(resources: GPU.ResourcePool) {
        if (this.needsUpdate) {
            resources.setResource(MeshletPassParams.CurrentMeshletCount, 0);

            const scene = Components.Camera.mainCamera.gameObject.scene;
            const items = this.collectItems(scene);
            if (items.length === 0) { this.needsUpdate = false; return; }

            const byMaterial = new Map<PBRMaterial, Item[]>();
            for (const it of items) {
                let bucket = byMaterial.get(it.material);
                if (!bucket) byMaterial.set(it.material, bucket = []);
                bucket.push(it);
            }

            const materialIndex = new Map<PBRMaterial, number>();
            let mi = 0;
            for (const mat of byMaterial.keys()) materialIndex.set(mat, mi++);

            let totalObjects = 0;
            for (const it of items) totalObjects += it.meshlets.length;

            const objectBytes = Math.max(8, totalObjects * 2 * 4);
            if (objectBytes > this.objectInfoBuffer.size) {
                this.objectInfoBuffer.Destroy();
                this.objectInfoBuffer = new GPU.Buffer(objectBytes, GPU.BufferType.STORAGE_WRITE);
            }

            this.currentObjectCount = 0;
            this.maxInstanceCount = 0;
            const frameMeshlets = new Map<PBRMaterial, number>();

            for (const [material, bucket] of byMaterial) {
                const matIdx = materialIndex.get(material)!;
                this.getOrSet(this.materialInfoBuffer, material, this.materialFloats(material));

                let survivors = 0;
                for (const it of bucket) {
                    if (it.instanceCount > this.maxInstanceCount) this.maxInstanceCount = it.instanceCount;

                    const meshIndex = this.getOrSet(this.meshInfoBuffer, it.id, it.matrices) / 16;
                    const baseVertexFloatOffset = this.getOrSet(this.vertexAttribBuffer, it.interleavedVertices.crc, it.interleavedVertices.array);
                    const baseTriangleOffset    = this.getOrSet(this.meshletTrianglesBuffer, it.indices.crc, it.indices.array);

                    const meshletInfoOffset = this.getOrSet(this.meshletInfoBuffer, it.indices.crc, it.meshletInfoPacked);
                    const meshletBaseIndex  = meshletInfoOffset / MeshletInfoFloatStride;

                    const objectInfo = new Uint32Array(it.meshlets.length * 2);
                    const lodIndexCache = new Map<number, number>();

                    for (let i = 0; i < it.meshlets.length; i++) {
                        const meshlet = it.meshlets[i];
                        let lodIdx = lodIndexCache.get(meshlet.lod);
                        if (lodIdx === undefined) {
                            const lodData = new Uint32Array([meshlet.lod, meshIndex, baseVertexFloatOffset, baseTriangleOffset, matIdx, it.instanceCount]);
                            lodIdx = this.getOrSet(this.lodMeshInfoBuffer, `${it.id}-${meshlet.lod}`, lodData) / lodData.length;
                            lodIndexCache.set(meshlet.lod, lodIdx);
                        }
                        objectInfo[i * 2]     = meshletBaseIndex + i;
                        objectInfo[i * 2 + 1] = lodIdx;
                    }

                    this.objectInfoBuffer.SetArray(objectInfo, this.currentObjectCount * 2 * 4);
                    this.currentObjectCount += it.meshlets.length;
                    survivors += it.meshlets.length * it.instanceCount;
                }

                frameMeshlets.set(material, survivors);
            }

            const drawIndirectBuffer = new GPU.Buffer(byMaterial.size * 4 * 4, GPU.BufferType.INDIRECT);

            resources.setResource(MeshletPassParams.DrawIndirectBuffer, drawIndirectBuffer);
            resources.setResource(MeshletPassParams.VertexBuffer, this.vertexAttribBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletTrianglesBuffer, this.meshletTrianglesBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshletBuffer, this.meshletInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MeshBuffer, this.meshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.LodMeshBuffer, this.lodMeshInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.MaterialInfoBuffer, this.materialInfoBuffer.getBuffer());
            resources.setResource(MeshletPassParams.ObjectInfoBuffer, this.objectInfoBuffer);
            resources.setResource(MeshletPassParams.CurrentMeshletCount, this.currentObjectCount);
            resources.setResource(MeshletPassParams.MaxInstanceCount, this.maxInstanceCount);
            resources.setResource(MeshletPassParams.FrameMeshlets, frameMeshlets);

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
