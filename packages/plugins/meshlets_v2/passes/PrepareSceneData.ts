import {
    EventSystem,
    Components,
    PBRMaterial,
    Mathf,
    GPU
} from "@trident/core";


import { Meshlet } from "../Meshlet";
import { MeshletMesh } from "../MeshletMesh";
import { MeshletPassParams } from "./MeshletDraw";
import { MeshletEvents } from "../MeshletEvents";
import { MeshletDebug } from "./MeshletDebug";

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

export interface TextureMaps {
    albedo: GPU.Texture;
    normal: GPU.Texture;
    height: GPU.Texture;
    metalness: GPU.Texture;
    emissive: GPU.Texture;
};

export class PrepareSceneData extends GPU.RenderPass {
    public name: string = "PrepareSceneData";
    private objectInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private vertexBuffer: GPU.DynamicBufferMemoryAllocator;

    private meshMaterialInfo: GPU.DynamicBufferMemoryAllocator;
    private meshMatrixInfoBuffer: GPU.DynamicBufferMemoryAllocator;
    private meshletInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private currentMeshCount: number = 0;
    private currentMeshletsCount: number = 0;

    private materialIndexCache: Map<string, number> = new Map();
    private albedoMaps: GPU.Texture[] = [];
    private normalMaps: GPU.Texture[] = [];
    private heightMaps: GPU.Texture[] = [];
    private metalnessMaps: GPU.Texture[] = [];
    private emissiveMaps: GPU.Texture[] = [];

    private textureMaps: TextureMaps;
    private materialMaps: Map<string, GPU.Texture> = new Map();

    private dummyTexture: GPU.TextureArray;

    private needsUpdate = false;

    public async init(resources: GPU.ResourcePool) {
        const bufferSize = 1024 * 100 * 1;
        this.meshMatrixInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);
        this.meshMaterialInfo = new GPU.DynamicBufferMemoryAllocator(bufferSize);
        this.meshletInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);
        this.vertexBuffer = new GPU.DynamicBufferMemoryAllocator(3072 * 10, 3072 * 10);
        this.objectInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);

        EventSystem.on(MeshletEvents.Updated, meshlet => {
            if (this.meshMatrixInfoBuffer.has(meshlet.id)) {
                this.meshMatrixInfoBuffer.set(meshlet.id, meshlet.transform.localToWorldMatrix.elements);
            }
            this.needsUpdate = true;
        })

        // EventSystem.on("MeshletDeleted", mesh => {
        //     console.log("Meshlet deleted");
        //     if (this.meshMatrixInfoBuffer.has(mesh.id)) this.meshMatrixInfoBuffer.delete(mesh.id);
        //     if (this.meshMaterialInfo.has(mesh.id)) this.meshMaterialInfo.delete(mesh.id);

        //     for (const meshlet of mesh.meshlets) {
        //         this.objectInfoBuffer.delete(`${mesh.id}-${meshlet.id}`);

        //         console.warn("TODO: Deleting meshlet, but since meshlets are shared need to check if any more meshes share this meshlet in order to delete form meshletInfoBuffer and vertexBuffer.");
        //         // if (this.meshletInfoBuffer.has(meshlet.id)) this.meshletInfoBuffer.delete(meshlet.id);
        //         // if (this.vertexBuffer.has(meshlet.id)) this.vertexBuffer.delete(meshlet.id);
        //     }

        // })

        this.dummyTexture = GPU.TextureArray.Create(1, 1, 1);

        this.initialized = true;
    }

    private getVertexInfo(meshlet: Meshlet): Float32Array {
        return meshlet.vertices_gpu;
    }

    private getMeshletInfo(meshlet: Meshlet): Float32Array {
        // Meshlet info
        const bv = meshlet.boundingVolume;
        const pbv = meshlet.parentBoundingVolume;
        return new Float32Array([
            ...meshlet.coneBounds.cone_apex.elements, 0,
            ...meshlet.coneBounds.cone_axis.elements, 0,
            meshlet.coneBounds.cone_cutoff, 0, 0, 0,
            bv.center.x, bv.center.y, bv.center.z, bv.radius,
            pbv.center.x, pbv.center.y, pbv.center.z, pbv.radius,
            meshlet.clusterError, 0, 0, 0,
            meshlet.parentError, 0, 0, 0,
            meshlet.lod, 0, 0, 0,
            ...meshlet.bounds.min.elements, 0,
            ...meshlet.bounds.max.elements, 0,
        ]);
    }

    private getMeshMaterialInfo(mesh: MeshletMesh): Float32Array | null {
        const material = mesh.material;
        if (!(material instanceof PBRMaterial)) return null;

        const albedoIndex = this.processMaterialMap(material.params.albedoMap, "albedo");
        const normalIndex = this.processMaterialMap(material.params.normalMap, "normal");
        const heightIndex = this.processMaterialMap(material.params.heightMap, "height");
        const metalnessIndex = this.processMaterialMap(material.params.metalnessMap, "metalness");
        const emissiveIndex = this.processMaterialMap(material.params.emissiveMap, "emissive");

        // AlbedoColor: vec4<f32>,
        // EmissiveColor: vec4<f32>,
        // Roughness: f32,
        // Metalness: f32,
        // Unlit: f32
        const albedoColor = material.params.albedoColor;
        const emissiveColor = material.params.emissiveColor;
        const roughness = material.params.roughness;
        const metalness = material.params.metalness;
        const unlit = material.params.unlit;
        const wireframe = material.params.wireframe;

        return new Float32Array([
            albedoIndex, normalIndex, heightIndex, metalnessIndex, emissiveIndex, 0, 0, 0,
            ...albedoColor.elements,
            ...emissiveColor.elements,
            roughness,
            metalness,
            +unlit,
            +wireframe
        ]);
    }

    private processMaterialMap(materialMap: GPU.Texture | undefined, type: "albedo" | "normal" | "height" | "metalness" | "emissive"): number {
        if (materialMap) {
            let materialIndexCached = this.materialIndexCache.get(materialMap.id);
            if (materialIndexCached === undefined) {
                materialIndexCached = this.materialIndexCache.size;
                this.materialIndexCache.set(materialMap.id, materialIndexCached);

                if (type === "albedo") this.albedoMaps.push(materialMap);
                else if (type === "normal") this.normalMaps.push(materialMap);
                else if (type === "height") this.heightMaps.push(materialMap);
                else if (type === "metalness") this.metalnessMaps.push(materialMap);
                else if (type === "emissive") this.emissiveMaps.push(materialMap);
            }
            return materialIndexCached;
        }
        return -1;
    }

    private createMaterialMap(textures: GPU.Texture[], type: "albedo" | "normal" | "height" | "metalness" | "emissive"): GPU.Texture {
        if (textures.length === 0) return this.dummyTexture;

        const w = textures[0].width;
        const h = textures[0].height;

        let materialMap = this.materialMaps.get(type);
        if (materialMap === undefined) {
            materialMap = GPU.TextureArray.Create(w, h, textures.length);
            materialMap.SetActiveLayer(0);
            this.materialMaps.set(type, materialMap); // TODO: Doesnt allow expansion
        }

        for (let i = 0; i < textures.length; i++) {
            if (textures[i].width !== w || textures[i].height !== h) {
                console.warn(`Creating blank texture because dimensions dont match`, w, h, textures[i].width, textures[i].height);
                const t = GPU.RenderTexture.Create(w, h);

                // Texture.Blit(textures[i], t, w, h);
                GPU.RendererContext.CopyTextureToTextureV2(t, materialMap, 0, 0, [w, h, 1], i);

                continue;
            }

            GPU.RendererContext.CopyTextureToTextureV2(textures[i], materialMap, 0, 0, [w, h, 1], i);
        }
        return materialMap;
    }

    // // At start, create buffers/texture
    // public init(resources: ResourcePool) {}
    // // Before render/compute. Fill buffers/textures. No buffer/texture creation is allowed.
    // public preExecute(resources: ResourcePool) {}
    // // Render/compute. No buffer/texture creation of filling is allowed.
    // public execute(resources: ResourcePool) {}

    public async preFrame(resources: GPU.ResourcePool) {
        const mainCamera = Components.Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const _sceneMeshlets = scene.GetComponents(MeshletMesh);
        let sceneMeshlets: MeshletMesh[] = [];
        for (const sceneMeshlet of _sceneMeshlets) {
            if (sceneMeshlet.constructor !== MeshletMesh) continue;
            sceneMeshlets.push(sceneMeshlet);
        }
        if (this.currentMeshCount !== sceneMeshlets.length || this.needsUpdate === true) {
            this.needsUpdate = false;
            const meshlets: SceneMesh[] = [];
            for (const meshlet of sceneMeshlets) {
                for (const geometry of meshlet.meshlets) {
                    meshlets.push({ mesh: meshlet, geometry: geometry });
                }
            }

            const indexedCache: Map<number, number> = new Map();
            const meshMatrixCache: Map<string, number> = new Map();
            const meshMaterialCache: Map<string, number> = new Map();

            for (const mesh of sceneMeshlets) {
                // Mesh material info
                let materialIndex = -1;
                const material = mesh.material;
                if (!(material instanceof PBRMaterial)) continue;
                if (!this.meshMaterialInfo.has(material.id)) {
                    const meshMaterialInfo = this.getMeshMaterialInfo(mesh);
                    if (meshMaterialInfo !== null) {
                        this.meshMaterialInfo.set(material.id, meshMaterialInfo);

                        meshMaterialCache.set(material.id, meshMaterialCache.size);
                    }
                }

                // Just to get material index
                let mc = meshMaterialCache.get(material.id);
                if (mc !== undefined) materialIndex = mc;
                if (!this.meshMatrixInfoBuffer.has(mesh.id)) {
                    this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
                }

                // Just to get mesh index
                let meshMatrixIndex = meshMatrixCache.get(mesh.id);
                if (meshMatrixIndex === undefined) {
                    meshMatrixIndex = meshMatrixCache.size;
                    meshMatrixCache.set(mesh.id, meshMatrixIndex);
                }

                // console.log(mesh.meshlets.length)
                for (const meshlet of mesh.meshlets) {
                    if (!this.meshletInfoBuffer.has(meshlet.id)) this.meshletInfoBuffer.set(meshlet.id, this.getMeshletInfo(meshlet));
                    if (!this.vertexBuffer.has(meshlet.id)) {
                        this.vertexBuffer.set(meshlet.id, this.getVertexInfo(meshlet));
                    }

                    // Just to get geometry index
                    let geometryIndex = indexedCache.get(meshlet.crc);
                    if (geometryIndex === undefined) {
                        geometryIndex = indexedCache.size;
                        indexedCache.set(meshlet.crc, geometryIndex);
                    }

                    // this.objectInfoBuffer.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshMatrixIndex, geometryIndex, materialIndex, 0]));
                    this.objectInfoBuffer.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshMatrixIndex, geometryIndex, 0, 0]));
                    // console.log(`${mesh.id}-${meshlet.id}`)
                }
            }

            this.currentMeshCount = sceneMeshlets.length;
            this.currentMeshletsCount = meshlets.length;

            MeshletDebug.totalMeshlets.SetValue(meshlets.length);
        }

        resources.setResource(MeshletPassParams.indirectVertices, this.vertexBuffer.getBuffer());
        resources.setResource(MeshletPassParams.indirectMeshInfo, this.meshMaterialInfo.getBuffer());
        resources.setResource(MeshletPassParams.indirectMeshletInfo, this.meshletInfoBuffer.getBuffer());
        resources.setResource(MeshletPassParams.indirectObjectInfo, this.objectInfoBuffer.getBuffer());
        resources.setResource(MeshletPassParams.indirectMeshMatrixInfo, this.meshMatrixInfoBuffer.getBuffer());
        resources.setResource(MeshletPassParams.meshletsCount, this.currentMeshletsCount);
    }

    public async execute(resources: GPU.ResourcePool) {
        // Mesh materials
        this.textureMaps = {
            albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
            normal: this.createMaterialMap(this.normalMaps, "normal"),
            height: this.createMaterialMap(this.heightMaps, "height"),
            metalness: this.createMaterialMap(this.metalnessMaps, "metalness"),
            emissive: this.createMaterialMap(this.emissiveMaps, "emissive"),
        }
        resources.setResource(MeshletPassParams.textureMaps, this.textureMaps);
    }
}