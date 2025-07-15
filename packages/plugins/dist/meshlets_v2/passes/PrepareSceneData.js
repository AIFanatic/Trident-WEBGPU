import { EventSystem } from "../../../Events";
import { Camera } from "../../../components/Camera";
import { MeshletMesh } from "../MeshletMesh";
import { PBRMaterial } from "../../../renderer/Material";
import { RenderPass } from "../../../renderer/RenderGraph";
import { RendererContext } from "../../../renderer/RendererContext";
import { RenderTexture, TextureArray } from "../../../renderer/Texture";
import { DynamicBufferMemoryAllocator } from "../../../utils/MemoryAllocator";
import { MeshletPassParams } from "./MeshletDraw";
import { MeshletEvents } from "../MeshletEvents";
import { MeshletDebug } from "./MeshletDebug";
;
;
export class PrepareSceneData extends RenderPass {
    name = "PrepareSceneData";
    objectInfoBuffer;
    vertexBuffer;
    meshMaterialInfo;
    meshMatrixInfoBuffer;
    meshletInfoBuffer;
    currentMeshCount = 0;
    currentMeshletsCount = 0;
    materialIndexCache = new Map();
    albedoMaps = [];
    normalMaps = [];
    heightMaps = [];
    metalnessMaps = [];
    emissiveMaps = [];
    textureMaps;
    materialMaps = new Map();
    dummyTexture;
    constructor() {
        super({
            outputs: [
                MeshletPassParams.indirectVertices,
                MeshletPassParams.indirectMeshInfo,
                MeshletPassParams.indirectMeshletInfo,
                MeshletPassParams.indirectObjectInfo,
                MeshletPassParams.indirectMeshMatrixInfo,
                MeshletPassParams.meshletsCount,
                MeshletPassParams.textureMaps,
            ]
        });
    }
    async init(resources) {
        const bufferSize = 1024 * 100 * 1;
        this.meshMatrixInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
        this.meshMaterialInfo = new DynamicBufferMemoryAllocator(bufferSize);
        this.meshletInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
        this.vertexBuffer = new DynamicBufferMemoryAllocator(3072 * 10, 3072 * 10);
        this.objectInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
        EventSystem.on(MeshletEvents.Updated, meshlet => {
            if (this.meshMatrixInfoBuffer.has(meshlet.id)) {
                this.meshMatrixInfoBuffer.set(meshlet.id, meshlet.transform.localToWorldMatrix.elements);
            }
        });
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
        this.dummyTexture = TextureArray.Create(1, 1, 1);
        this.initialized = true;
    }
    getVertexInfo(meshlet) {
        return meshlet.vertices_gpu;
    }
    getMeshletInfo(meshlet) {
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
    getMeshMaterialInfo(mesh) {
        let materials = mesh.GetMaterials(PBRMaterial);
        if (materials.length === 0)
            return null;
        if (materials.length > 1)
            throw Error("Multiple materials not supported");
        const material = materials[0];
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
    processMaterialMap(materialMap, type) {
        if (materialMap) {
            let materialIndexCached = this.materialIndexCache.get(materialMap.id);
            if (materialIndexCached === undefined) {
                materialIndexCached = this.materialIndexCache.size;
                this.materialIndexCache.set(materialMap.id, materialIndexCached);
                if (type === "albedo")
                    this.albedoMaps.push(materialMap);
                else if (type === "normal")
                    this.normalMaps.push(materialMap);
                else if (type === "height")
                    this.heightMaps.push(materialMap);
                else if (type === "metalness")
                    this.metalnessMaps.push(materialMap);
                else if (type === "emissive")
                    this.emissiveMaps.push(materialMap);
            }
            return materialIndexCached;
        }
        return -1;
    }
    createMaterialMap(textures, type) {
        if (textures.length === 0)
            return this.dummyTexture;
        const w = textures[0].width;
        const h = textures[0].height;
        let materialMap = this.materialMaps.get(type);
        if (materialMap === undefined) {
            materialMap = TextureArray.Create(w, h, textures.length);
            materialMap.SetActiveLayer(0);
            this.materialMaps.set(type, materialMap); // TODO: Doesnt allow expansion
        }
        for (let i = 0; i < textures.length; i++) {
            if (textures[i].width !== w || textures[i].height !== h) {
                console.warn(`Creating blank texture because dimensions dont match`, w, h, textures[i].width, textures[i].height);
                const t = RenderTexture.Create(w, h);
                // Texture.Blit(textures[i], t, w, h);
                RendererContext.CopyTextureToTextureV2(t, materialMap, 0, 0, [w, h, 1], i);
                continue;
            }
            RendererContext.CopyTextureToTextureV2(textures[i], materialMap, 0, 0, [w, h, 1], i);
        }
        return materialMap;
    }
    // // At start, create buffers/texture
    // public init(resources: ResourcePool) {}
    // // Before render/compute. Fill buffers/textures. No buffer/texture creation is allowed.
    // public preExecute(resources: ResourcePool) {}
    // // Render/compute. No buffer/texture creation of filling is allowed.
    // public execute(resources: ResourcePool) {}
    execute(resources) {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
        if (this.currentMeshCount !== sceneMeshlets.length) {
            const meshlets = [];
            for (const meshlet of sceneMeshlets) {
                for (const geometry of meshlet.meshlets) {
                    meshlets.push({ mesh: meshlet, geometry: geometry });
                }
            }
            const indexedCache = new Map();
            const meshMatrixCache = new Map();
            const meshMaterialCache = new Map();
            for (const mesh of sceneMeshlets) {
                // Mesh material info
                let materialIndex = -1;
                for (const material of mesh.GetMaterials(PBRMaterial)) {
                    if (!this.meshMaterialInfo.has(material.id)) {
                        const meshMaterialInfo = this.getMeshMaterialInfo(mesh);
                        if (meshMaterialInfo !== null) {
                            this.meshMaterialInfo.set(material.id, meshMaterialInfo);
                            meshMaterialCache.set(material.id, meshMaterialCache.size);
                        }
                    }
                    // Just to get material index
                    let mc = meshMaterialCache.get(material.id);
                    if (mc !== undefined)
                        materialIndex = mc;
                }
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
                    if (!this.meshletInfoBuffer.has(meshlet.id))
                        this.meshletInfoBuffer.set(meshlet.id, this.getMeshletInfo(meshlet));
                    if (!this.vertexBuffer.has(meshlet.id)) {
                        console.log("Setting vertices");
                        this.vertexBuffer.set(meshlet.id, this.getVertexInfo(meshlet));
                    }
                    // Just to get geometry index
                    let geometryIndex = indexedCache.get(meshlet.crc);
                    if (geometryIndex === undefined) {
                        geometryIndex = indexedCache.size;
                        indexedCache.set(meshlet.crc, geometryIndex);
                    }
                    this.objectInfoBuffer.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshMatrixIndex, geometryIndex, materialIndex, 0]));
                    // console.log(`${mesh.id}-${meshlet.id}`)
                }
            }
            // Mesh materials
            this.textureMaps = {
                albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
                normal: this.createMaterialMap(this.normalMaps, "normal"),
                height: this.createMaterialMap(this.heightMaps, "height"),
                metalness: this.createMaterialMap(this.metalnessMaps, "metalness"),
                emissive: this.createMaterialMap(this.emissiveMaps, "emissive"),
            };
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
        resources.setResource(MeshletPassParams.textureMaps, this.textureMaps);
    }
}
