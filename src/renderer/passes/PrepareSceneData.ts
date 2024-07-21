import { RenderPass, ResourcePool } from "../RenderGraph";

import { Buffer, BufferType } from "../Buffer";
import { Texture, TextureArray } from "../Texture";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { MeshletMesh } from "../../components/MeshletMesh";
import { DeferredMeshMaterial } from "../Material";
import { RendererContext } from "../RendererContext";
import { Camera } from "../../components/Camera";
import { Debugger } from "../../plugins/Debugger";
import { PassParams } from "../RenderingPipeline";

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
    public meshInfoBuffer: Buffer;
    public meshletInfoBuffer: Buffer;
    public objectInfoBuffer: Buffer;
    public vertexBuffer: Buffer;

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
                PassParams.meshletsCount,
                PassParams.textureMaps
            ]
        });
    }

    private getVertexInfo(meshlet: Meshlet): Float32Array {
        return meshlet.vertices_gpu;
    }

    private getMeshletInfo(meshlet: Meshlet): number[] {
        // Meshlet info
        const bv = meshlet.boundingVolume;
        const pbv = meshlet.boundingVolume;
        return [
            ...bv.cone_apex.elements, 0,
            ...bv.cone_axis.elements, 0,
            bv.cone_cutoff, 0, 0, 0,
            bv.center.x, bv.center.y, bv.center.z, bv.radius,
            pbv.center.x, pbv.center.y, pbv.center.z, pbv.radius,
            meshlet.clusterError, 0, 0, 0,
            meshlet.parentError, 0, 0, 0,
            meshlet.lod, 0, 0, 0,
            ...meshlet.bounds.min.elements, 0,
            ...meshlet.bounds.max.elements, 0
        ]
    }

    private getMeshMaterialInfo(mesh: MeshletMesh): number[] {
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

        return [
            albedoIndex, normalIndex, heightIndex, 0,
            ...albedoColor.elements,
            ...emissiveColor.elements,
            roughness,
            metalness,
            +unlit,
            
            0
        ];
    }

    private getMeshInfo(mesh: MeshletMesh): number[] {
        const materialInfo = this.getMeshMaterialInfo(mesh);
        return [
            ...mesh.transform.localToWorldMatrix.elements,
            ...mesh.transform.position.elements, 0,
            ...mesh.transform.scale.elements, 0,
            ...materialInfo
        ]
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

    private createMaterialMap(textures: Texture[], type: "albedo" | "normal" | "height"): Texture | undefined {
        if (textures.length === 0) return;
        
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
    
    public execute(resources: ResourcePool, indirectVertices: string, indirectMeshInfo: string, indirectMeshletInfo: string, indirectObjectInfo: string, meshletsCount: string, textureMaps: string) {
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

            let meshletInfo: number[] = [];
            let meshInfo: number[] = [];
            let objectInfo: number[] = [];

            let vertices: number[] = [];

            const indexedCache: Map<number, number> = new Map();
            const meshCache: Map<string, number> = new Map();

            for (let i = 0; i < meshlets.length; i++) {
                const sceneMesh = meshlets[i];
                let geometryIndex = indexedCache.get(sceneMesh.geometry.crc);
                if (geometryIndex === undefined) {
                    geometryIndex = indexedCache.size;
                    indexedCache.set(sceneMesh.geometry.crc, geometryIndex);

                    const meshletVertexArray = this.getVertexInfo(sceneMesh.geometry);
                    vertices.push(...meshletVertexArray);

                    const meshletInfoArray = this.getMeshletInfo(sceneMesh.geometry);
                    meshletInfo.push(...meshletInfoArray);
                }

                // Mesh info
                let meshIndex = meshCache.get(sceneMesh.mesh.id);
                if (meshIndex === undefined) {
                    meshIndex = meshCache.size;
                    meshCache.set(sceneMesh.mesh.id, meshIndex);

                    const meshInfoArray = this.getMeshInfo(sceneMesh.mesh);
                    meshInfo.push(...meshInfoArray);
                }

                // Object info
                objectInfo.push(
                    meshIndex, geometryIndex, 0, 0,
                )
            }

            // Mesh materials
            this.textureMaps = {
                albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
                normal: this.createMaterialMap(this.normalMaps, "normal"),
                height: this.createMaterialMap(this.heightMaps, "height")
            }

            // Vertex buffer
            const verticesArray = new Float32Array(vertices);
            this.vertexBuffer = Buffer.Create(verticesArray.byteLength, BufferType.STORAGE);
            this.vertexBuffer.name = "vertexBuffer"
            this.vertexBuffer.SetArray(verticesArray);

            // Meshlet info buffer
            const meshletInfoArray = new Float32Array(meshletInfo);
            this.meshletInfoBuffer = Buffer.Create(meshletInfoArray.byteLength, BufferType.STORAGE);
            this.meshletInfoBuffer.name = "meshletInfoBuffer";
            this.meshletInfoBuffer.SetArray(meshletInfoArray);

            // Mesh info buffer
            const meshInfoBufferArray = new Float32Array(meshInfo);
            this.meshInfoBuffer = Buffer.Create(meshInfoBufferArray.byteLength, BufferType.STORAGE);
            this.meshInfoBuffer.name = "meshInfoBuffer";
            this.meshInfoBuffer.SetArray(meshInfoBufferArray);

            // Object info buffer
            const objectInfoBufferArray = new Float32Array(objectInfo);
            this.objectInfoBuffer = Buffer.Create(objectInfoBufferArray.byteLength, BufferType.STORAGE);
            this.objectInfoBuffer.name = "objectInfoBuffer";
            this.objectInfoBuffer.SetArray(objectInfoBufferArray);
            
            console.log("meshletInfoBuffer", meshletInfoArray.byteLength);
            console.log("meshInfoBufferArray", meshInfoBufferArray.byteLength);
            console.log("objectInfoBufferArray", objectInfoBufferArray.byteLength);
            console.log("verticesArray", verticesArray.byteLength)

            this.currentMeshCount = sceneMeshlets.length;
            this.currentMeshletsCount = meshlets.length;

            Debugger.SetTotalMeshlets(meshlets.length);
        }

        resources.setResource(indirectVertices, this.vertexBuffer);
        resources.setResource(indirectMeshInfo, this.meshInfoBuffer);
        resources.setResource(indirectMeshletInfo, this.meshletInfoBuffer);
        resources.setResource(indirectObjectInfo, this.objectInfoBuffer);
        resources.setResource(meshletsCount, this.currentMeshletsCount);
        resources.setResource(textureMaps, this.textureMaps);
    }
}