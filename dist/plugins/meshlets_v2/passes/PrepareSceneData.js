import { GPU, EventSystem, PBRMaterial, Components } from '@trident/core';
import { MeshletMesh } from '../MeshletMesh.js';
import { MeshletPassParams } from './MeshletDraw.js';
import { MeshletEvents } from '../MeshletEvents.js';
import { MeshletDebug } from './MeshletDebug.js';

class PrepareSceneData extends GPU.RenderPass {
  name = "PrepareSceneData";
  objectInfoBuffer;
  vertexBuffer;
  meshMaterialInfo;
  meshMatrixInfoBuffer;
  meshletInfoBuffer;
  currentMeshCount = 0;
  currentMeshletsCount = 0;
  materialIndexCache = /* @__PURE__ */ new Map();
  albedoMaps = [];
  normalMaps = [];
  heightMaps = [];
  metalnessMaps = [];
  emissiveMaps = [];
  textureMaps;
  materialMaps = /* @__PURE__ */ new Map();
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
        MeshletPassParams.textureMaps
      ]
    });
  }
  async init(resources) {
    const bufferSize = 1024 * 100 * 1;
    this.meshMatrixInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);
    this.meshMaterialInfo = new GPU.DynamicBufferMemoryAllocator(bufferSize);
    this.meshletInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);
    this.vertexBuffer = new GPU.DynamicBufferMemoryAllocator(3072 * 10, 3072 * 10);
    this.objectInfoBuffer = new GPU.DynamicBufferMemoryAllocator(bufferSize);
    EventSystem.on(MeshletEvents.Updated, (meshlet) => {
      if (this.meshMatrixInfoBuffer.has(meshlet.id)) {
        this.meshMatrixInfoBuffer.set(meshlet.id, meshlet.transform.localToWorldMatrix.elements);
      }
    });
    this.dummyTexture = GPU.TextureArray.Create(1, 1, 1);
    this.initialized = true;
  }
  getVertexInfo(meshlet) {
    return meshlet.vertices_gpu;
  }
  getMeshletInfo(meshlet) {
    const bv = meshlet.boundingVolume;
    const pbv = meshlet.parentBoundingVolume;
    return new Float32Array([
      ...meshlet.coneBounds.cone_apex.elements,
      0,
      ...meshlet.coneBounds.cone_axis.elements,
      0,
      meshlet.coneBounds.cone_cutoff,
      0,
      0,
      0,
      bv.center.x,
      bv.center.y,
      bv.center.z,
      bv.radius,
      pbv.center.x,
      pbv.center.y,
      pbv.center.z,
      pbv.radius,
      meshlet.clusterError,
      0,
      0,
      0,
      meshlet.parentError,
      0,
      0,
      0,
      meshlet.lod,
      0,
      0,
      0,
      ...meshlet.bounds.min.elements,
      0,
      ...meshlet.bounds.max.elements,
      0
    ]);
  }
  getMeshMaterialInfo(mesh) {
    let materials = mesh.GetMaterials(PBRMaterial);
    if (materials.length === 0) return null;
    if (materials.length > 1) throw Error("Multiple materials not supported");
    const material = materials[0];
    const albedoIndex = this.processMaterialMap(material.params.albedoMap, "albedo");
    const normalIndex = this.processMaterialMap(material.params.normalMap, "normal");
    const heightIndex = this.processMaterialMap(material.params.heightMap, "height");
    const metalnessIndex = this.processMaterialMap(material.params.metalnessMap, "metalness");
    const emissiveIndex = this.processMaterialMap(material.params.emissiveMap, "emissive");
    const albedoColor = material.params.albedoColor;
    const emissiveColor = material.params.emissiveColor;
    const roughness = material.params.roughness;
    const metalness = material.params.metalness;
    const unlit = material.params.unlit;
    const wireframe = material.params.wireframe;
    return new Float32Array([
      albedoIndex,
      normalIndex,
      heightIndex,
      metalnessIndex,
      emissiveIndex,
      0,
      0,
      0,
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
      if (materialIndexCached === void 0) {
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
  createMaterialMap(textures, type) {
    if (textures.length === 0) return this.dummyTexture;
    const w = textures[0].width;
    const h = textures[0].height;
    let materialMap = this.materialMaps.get(type);
    if (materialMap === void 0) {
      materialMap = GPU.TextureArray.Create(w, h, textures.length);
      materialMap.SetActiveLayer(0);
      this.materialMaps.set(type, materialMap);
    }
    for (let i = 0; i < textures.length; i++) {
      if (textures[i].width !== w || textures[i].height !== h) {
        console.warn(`Creating blank texture because dimensions dont match`, w, h, textures[i].width, textures[i].height);
        const t = GPU.RenderTexture.Create(w, h);
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
  execute(resources) {
    const mainCamera = Components.Camera.mainCamera;
    const scene = mainCamera.gameObject.scene;
    const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
    if (this.currentMeshCount !== sceneMeshlets.length) {
      const meshlets = [];
      for (const meshlet of sceneMeshlets) {
        for (const geometry of meshlet.meshlets) {
          meshlets.push({ mesh: meshlet, geometry });
        }
      }
      const indexedCache = /* @__PURE__ */ new Map();
      const meshMatrixCache = /* @__PURE__ */ new Map();
      const meshMaterialCache = /* @__PURE__ */ new Map();
      for (const mesh of sceneMeshlets) {
        let materialIndex = -1;
        for (const material of mesh.GetMaterials(PBRMaterial)) {
          if (!this.meshMaterialInfo.has(material.id)) {
            const meshMaterialInfo = this.getMeshMaterialInfo(mesh);
            if (meshMaterialInfo !== null) {
              this.meshMaterialInfo.set(material.id, meshMaterialInfo);
              meshMaterialCache.set(material.id, meshMaterialCache.size);
            }
          }
          let mc = meshMaterialCache.get(material.id);
          if (mc !== void 0) materialIndex = mc;
        }
        if (!this.meshMatrixInfoBuffer.has(mesh.id)) {
          this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
        }
        let meshMatrixIndex = meshMatrixCache.get(mesh.id);
        if (meshMatrixIndex === void 0) {
          meshMatrixIndex = meshMatrixCache.size;
          meshMatrixCache.set(mesh.id, meshMatrixIndex);
        }
        for (const meshlet of mesh.meshlets) {
          if (!this.meshletInfoBuffer.has(meshlet.id)) this.meshletInfoBuffer.set(meshlet.id, this.getMeshletInfo(meshlet));
          if (!this.vertexBuffer.has(meshlet.id)) {
            console.log("Setting vertices");
            this.vertexBuffer.set(meshlet.id, this.getVertexInfo(meshlet));
          }
          let geometryIndex = indexedCache.get(meshlet.crc);
          if (geometryIndex === void 0) {
            geometryIndex = indexedCache.size;
            indexedCache.set(meshlet.crc, geometryIndex);
          }
          this.objectInfoBuffer.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshMatrixIndex, geometryIndex, materialIndex, 0]));
        }
      }
      this.textureMaps = {
        albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
        normal: this.createMaterialMap(this.normalMaps, "normal"),
        height: this.createMaterialMap(this.heightMaps, "height"),
        metalness: this.createMaterialMap(this.metalnessMaps, "metalness"),
        emissive: this.createMaterialMap(this.emissiveMaps, "emissive")
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

export { PrepareSceneData };
