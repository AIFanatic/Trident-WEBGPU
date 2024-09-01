import { RenderPass, ResourcePool } from "../RenderGraph";
import { Texture, TextureArray } from "../Texture";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { MeshletMesh } from "../../components/MeshletMesh";
import { DeferredMeshMaterial } from "../Material";
import { RendererContext } from "../RendererContext";
import { Camera } from "../../components/Camera";
import { Debugger } from "../../plugins/Debugger";
import { PassParams } from "../RenderingPipeline";
import { BufferMemoryAllocator, MemoryAllocator, MemoryAllocatorViewer } from "../../utils/MemoryAllocator";
import { EventSystem } from "../../Events";

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

export interface TextureMaps {
    albedo: Texture;
    normal: Texture;
    height: Texture;
};

export class PrepareSceneData extends RenderPass {
    public name: string = "PrepareSceneData";
    private objectInfoBufferV2: BufferMemoryAllocator;
    private vertexBuffer: BufferMemoryAllocator;

    private meshMaterialInfo: BufferMemoryAllocator;
    private meshMatrixInfoBuffer: BufferMemoryAllocator;
    private meshletInfoBuffer: BufferMemoryAllocator;

    private currentMeshCount: number = 0;
    private currentMeshletsCount: number = 0;
    
    private materialIndexCache: Map<string, number> = new Map();
    private albedoMaps: Texture[] = [];
    private normalMaps: Texture[] = [];
    private heightMaps: Texture[] = [];
    
    private textureMaps: TextureMaps;
    private materialMaps: Map<string, Texture> = new Map();

    constructor() {
        super({
            outputs: [
                PassParams.indirectVertices,
                PassParams.indirectMeshInfo,
                PassParams.indirectMeshletInfo,
                PassParams.indirectObjectInfo,
                PassParams.indirectMeshMatrixInfo,
                PassParams.meshletsCount,
                PassParams.textureMaps
            ]
        });

        const meshMatrixBufferSize = 1024 * 1024 * 1;
        this.meshMatrixInfoBuffer = new BufferMemoryAllocator(meshMatrixBufferSize);
        this.meshMaterialInfo = new BufferMemoryAllocator(meshMatrixBufferSize);
        this.meshletInfoBuffer = new BufferMemoryAllocator(meshMatrixBufferSize);
        this.vertexBuffer = new BufferMemoryAllocator(meshMatrixBufferSize);
        this.objectInfoBufferV2 = new BufferMemoryAllocator(meshMatrixBufferSize);

        EventSystem.on("MeshletUpdated", mesh => {
            console.log("Meshlet updated");
            if (this.meshMatrixInfoBuffer.has(mesh.id)) {
                this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
            }
        })

        EventSystem.on("MeshletDeleted", mesh => {
            console.log("Meshlet deleted");
            if (this.meshMatrixInfoBuffer.has(mesh.id)) this.meshMatrixInfoBuffer.delete(mesh.id);
            if (this.meshMaterialInfo.has(mesh.id)) this.meshMaterialInfo.delete(mesh.id);

            for (const meshlet of mesh.meshlets) {
                this.objectInfoBufferV2.delete(`${mesh.id}-${meshlet.id}`);
            }
        })
    }

    private getVertexInfo(meshlet: Meshlet): Float32Array {
        return meshlet.vertices_gpu;
    }

    private getMeshletInfo(meshlet: Meshlet): Float32Array {
        // Meshlet info
        const bv = meshlet.boundingVolume;
        const pbv = meshlet.boundingVolume;
        return new Float32Array([
            0, 0, 0, 0, // ...bv.cone_apex.elements, 0,
            0, 0, 0, 0, // ...bv.cone_axis.elements, 0,
            0, 0, 0, 0, // bv.cone_cutoff, 0, 0, 0,
            bv.center.x, bv.center.y, bv.center.z, bv.radius,
            pbv.center.x, pbv.center.y, pbv.center.z, pbv.radius,
            meshlet.clusterError, 0, 0, 0,
            meshlet.parentError, 0, 0, 0,
            meshlet.lod, 0, 0, 0,
            ...meshlet.bounds.min.elements, 0,
            ...meshlet.bounds.max.elements, 0
        ]);
    }

    private getMeshMaterialInfo(mesh: MeshletMesh): Float32Array {
        let materials = mesh.GetMaterials(DeferredMeshMaterial);
        if (materials.length > 1) throw Error("Multiple materials not supported");

        const material = materials[0];

        let albedoIndex = this.processMaterialMap(material.params.albedoMap, "albedo");
        let normalIndex = this.processMaterialMap(material.params.normalMap, "normal");
        let heightIndex = this.processMaterialMap(material.params.heightMap, "height");

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

        return new Float32Array([
            albedoIndex, normalIndex, heightIndex, 0,
            ...albedoColor.elements,
            ...emissiveColor.elements,
            roughness,
            metalness,
            +unlit,
            
            0
        ]);
    }

    private processMaterialMap(materialMap: Texture | undefined, type: "albedo" | "normal" | "height"): number {
        if (materialMap) {
            let materialIndexCached = this.materialIndexCache.get(materialMap.id);
            if (materialIndexCached === undefined) {
                materialIndexCached = this.materialIndexCache.size;
                this.materialIndexCache.set(materialMap.id, materialIndexCached);

                if (type === "albedo") this.albedoMaps.push(materialMap);
                else if (type === "normal") this.normalMaps.push(materialMap);
                else if (type === "height") this.heightMaps.push(materialMap);
            }
            return materialIndexCached;
        }
        return -1;
    }

    private createMaterialMap(textures: Texture[], type: "albedo" | "normal" | "height"): Texture {
        if (textures.length === 0) return TextureArray.Create(1, 1, 1);
        
        const w = textures[0].width;
        const h = textures[0].height;

        let materialMap = this.materialMaps.get(type);
        if (!materialMap) {
            materialMap = TextureArray.Create(w, h, textures.length);
            materialMap.SetActiveLayer(0);
            this.materialMaps.set(type, materialMap); // TODO: Doesnt allow expansion
        }

        for (let i = 0; i < textures.length; i++) {
            RendererContext.CopyTextureToTexture(textures[i], materialMap, 0, 0, [w, h, i+1]);
        }
        return materialMap;
        
    }
    
    public execute(resources: ResourcePool) {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];

        if (this.currentMeshCount !== sceneMeshlets.length) {
            const meshlets: SceneMesh[] = [];
            for (const meshlet of sceneMeshlets) {
                for (const geometry of meshlet.meshlets) {
                    meshlets.push({mesh: meshlet, geometry: geometry});
                }
            }

            const indexedCache: Map<number, number> = new Map();
            const meshCache: Map<string, number> = new Map();

            for (const mesh of sceneMeshlets) {
                // Mesh material info
                if (!this.meshMaterialInfo.has(mesh.id)) this.meshMaterialInfo.set(mesh.id, this.getMeshMaterialInfo(mesh));
                if (!this.meshMatrixInfoBuffer.has(mesh.id)) {
                    console.log(mesh.id, mesh.transform.localToWorldMatrix.elements);
                    this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
                }

                // Just to get mesh index
                let meshIndex = meshCache.get(mesh.id);
                if (meshIndex === undefined) {
                    meshIndex = meshCache.size;
                    meshCache.set(mesh.id, meshIndex);
                }
                
                for (const meshlet of mesh.meshlets) {
                    if (!this.meshletInfoBuffer.has(meshlet.id)) this.meshletInfoBuffer.set(meshlet.id, this.getMeshletInfo(meshlet));
                    if (!this.vertexBuffer.has(meshlet.id)) this.vertexBuffer.set(meshlet.id, this.getVertexInfo(meshlet));

                    // Just to get geometry index
                    let geometryIndex = indexedCache.get(meshlet.crc);
                    if (geometryIndex === undefined) {
                        geometryIndex = indexedCache.size;
                        indexedCache.set(meshlet.crc, geometryIndex);
                    }

                    this.objectInfoBufferV2.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshIndex, geometryIndex, 0, 0]));
                }
            }

            // Mesh materials
            this.textureMaps = {
                albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
                normal: this.createMaterialMap(this.normalMaps, "normal"),
                height: this.createMaterialMap(this.heightMaps, "height")
            }

            
            this.currentMeshCount = sceneMeshlets.length;
            this.currentMeshletsCount = meshlets.length;

            Debugger.SetTotalMeshlets(meshlets.length);
        }

        // // Test updating mesh matrices naively
        // for (const mesh of sceneMeshlets) {
        //     this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
        // }

        resources.setResource(PassParams.indirectVertices, this.vertexBuffer.getBuffer());
        resources.setResource(PassParams.indirectMeshInfo, this.meshMaterialInfo.getBuffer());
        resources.setResource(PassParams.indirectMeshletInfo, this.meshletInfoBuffer.getBuffer());
        resources.setResource(PassParams.indirectObjectInfo, this.objectInfoBufferV2.getBuffer());
        resources.setResource(PassParams.indirectMeshMatrixInfo, this.meshMatrixInfoBuffer.getBuffer());
        resources.setResource(PassParams.meshletsCount, this.currentMeshletsCount);
        resources.setResource(PassParams.textureMaps, this.textureMaps);
    }
}