import { IndexAttribute, VertexAttribute, Texture, Geometry, Mathf, PBRMaterial, Components, Prefab, Utils, Assets } from '@trident/core';
import { GLTFParser } from './GLTFParser.js';

class GLTFLoader {
  static TextureCache = /* @__PURE__ */ new Map();
  static finalizeGeometry(geom) {
    const posAttr = geom.attributes.get("position");
    if (!posAttr) throw Error("Geometry missing position attribute.");
    const floatCount = posAttr.array.length;
    const vertexCount = floatCount / 3 | 0;
    if (!geom.index) {
      const indexBuffer = new Uint32Array(vertexCount);
      for (let i = 0; i < vertexCount; i++) indexBuffer[i] = i;
      geom.index = new IndexAttribute(indexBuffer);
      geom.ComputeNormals();
    }
    if (!geom.attributes.get("normal")) geom.ComputeNormals();
    if (!geom.attributes.get("uv")) {
      const uv = new Float32Array(floatCount / 3 * 2);
      geom.attributes.set("uv", new VertexAttribute(uv));
    }
  }
  // ---------- Textures ----------
  static async getTexture(textures, textureInfo, textureFormat) {
    if (!textures || !textureInfo) return void 0;
    const tex = textures[textureInfo.index];
    if (!tex?.source) throw Error("Invalid texture");
    let cached = this.TextureCache.get(tex.source.checksum);
    if (!cached) {
      cached = Texture.LoadImageSource(new Blob([tex.source.bytes], { type: tex.source.mimeType }), textureFormat);
      this.TextureCache.set(tex.source.checksum, cached);
    }
    return cached;
  }
  // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------
  // From threejs
  static parseAccessor(accessorDef) {
    const WEBGL_TYPE_SIZES = { "SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16 };
    const WEBGL_COMPONENT_TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const bufferView = accessorDef.bufferView;
    const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
    const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
    const elementBytes = TypedArray.BYTES_PER_ELEMENT;
    const itemBytes = elementBytes * itemSize;
    const byteOffset = accessorDef.bufferView.data.byteOffset || 0;
    const byteStride = accessorDef.bufferView !== void 0 ? accessorDef.bufferView.byteStride : void 0;
    accessorDef.normalized === true;
    let array;
    if (byteStride && byteStride !== itemBytes) {
      const ibSlice = Math.floor(byteOffset / byteStride);
      const ibCacheKey = "InterleavedBuffer:" + accessorDef.bufferView + ":" + accessorDef.componentType + ":" + ibSlice + ":" + accessorDef.count;
      let ib = this.cache.get(ibCacheKey);
      if (!ib) {
        array = new TypedArray(bufferView.data.buffer, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes);
        ib = array;
        this.cache.set(ibCacheKey, ib);
      }
      console.warn("TODO: INTERLEAVED");
    } else {
      if (bufferView === null) array = new TypedArray(accessorDef.count * itemSize);
      else array = new TypedArray(bufferView.data.buffer, byteOffset, accessorDef.count * itemSize);
    }
    return array;
  }
  static async parsePrimitive(primitive, textures) {
    const geometry = new Geometry();
    if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.parseAccessor(primitive.attributes.POSITION)));
    if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.parseAccessor(primitive.attributes.NORMAL)));
    if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.parseAccessor(primitive.attributes.TEXCOORD_0)));
    if (primitive.attributes.TANGENT) geometry.attributes.set("tangent", new VertexAttribute(this.parseAccessor(primitive.attributes.TANGENT)));
    if (primitive.attributes.JOINTS_0) geometry.attributes.set("joints", new VertexAttribute(this.parseAccessor(primitive.attributes.JOINTS_0)));
    if (primitive.attributes.WEIGHTS_0) geometry.attributes.set("weights", new VertexAttribute(this.parseAccessor(primitive.attributes.WEIGHTS_0)));
    if (primitive.indices) {
      let indices = this.parseAccessor(primitive.indices);
      if (indices instanceof Uint8Array) indices = new Uint16Array(indices);
      geometry.index = new IndexAttribute(indices);
    }
    let materialParams = {};
    const mat = primitive.material;
    if (mat?.pbrMetallicRoughness) {
      const pbr = mat.pbrMetallicRoughness;
      if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);
      if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb");
      if (pbr.metallicRoughnessTexture) materialParams.armMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm");
      if (pbr.roughnessFactor !== void 0) materialParams.roughness = pbr.roughnessFactor;
      if (pbr.metallicFactor !== void 0) materialParams.metalness = pbr.metallicFactor;
    }
    if (mat?.normalTexture) materialParams.normalMap = await this.getTexture(textures, mat.normalTexture, "bgra8unorm");
    if (mat?.emissiveTexture) materialParams.emissiveMap = await this.getTexture(textures, mat.emissiveTexture, "bgra8unorm-srgb");
    if (mat?.emissiveFactor) {
      materialParams.emissiveColor = new Mathf.Color(...mat.emissiveFactor);
      const ext = mat.extensions?.["KHR_materials_emissive_strength"];
      if (ext?.emissiveStrength) materialParams.emissiveColor.mul(ext.emissiveStrength);
    }
    materialParams.unlit = mat?.extensions?.["KHR_materials_unlit"] ? true : false;
    materialParams.doubleSided = !!mat?.doubleSided;
    materialParams.alphaCutoff = mat?.alphaCutoff;
    if (primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0) materialParams.isSkinned = true;
    this.finalizeGeometry(geometry);
    if (!geometry.attributes.has("tangent")) {
      if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
        geometry.ComputeTangents();
      }
    }
    geometry.ComputeBoundingVolume();
    return {
      geometry,
      material: new PBRMaterial(materialParams)
    };
  }
  // ---------- Public: load as GameObjects (Unity-style) ----------
  static cache = /* @__PURE__ */ new Map();
  static serializeTransform(position, rotation, scale) {
    return {
      type: Components.Transform.type,
      localPosition: position.Serialize(),
      localRotation: rotation.Serialize(),
      scale: scale.Serialize()
    };
  }
  static createEmptyGO(name, position, rotation, scale) {
    const prefab = new Prefab();
    prefab.name = name;
    prefab.transform = this.serializeTransform(position ?? new Mathf.Vector3(), rotation ?? new Mathf.Quaternion(), scale ?? new Mathf.Vector3(1, 1, 1));
    return prefab;
  }
  static async LoadFromURL(url, format) {
    let cached = GLTFLoader.cache.get(url);
    if (!cached) {
      if (url.endsWith(".glb") || format === "glb") cached = await new GLTFParser().loadGLBUrl(url);
      else if (url.endsWith(".gltf") || format === "gltf") cached = await new GLTFParser().loadGLTF(url);
      GLTFLoader.cache.set(url, cached);
    }
    return this.Parse(cached);
  }
  static async LoadFromArrayBuffer(arrayBuffer, key) {
    const cacheKey = key ?? arrayBuffer;
    let cached = GLTFLoader.cache.get(cacheKey);
    if (!cached) {
      cached = await new GLTFParser().parseGLB(arrayBuffer);
      GLTFLoader.cache.set(cacheKey, cached);
    }
    return this.Parse(cached);
  }
  static async Parse(gltf) {
    if (!gltf.nodes) {
      return this.createEmptyGO("GLTFPrefab");
    }
    const nodeIndex = /* @__PURE__ */ new Map();
    gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));
    const nodes = [];
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      nodes.push(this.createEmptyGO(
        n.name || `Node_${i}`,
        new Mathf.Vector3(n.translation.x, n.translation.y, n.translation.z),
        new Mathf.Quaternion(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w),
        new Mathf.Vector3(n.scale.x, n.scale.y, n.scale.z)
      ));
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      for (const childId of n.childrenID) {
        nodes[i].children.push(nodes[childId]);
      }
    }
    if (gltf.skins) {
      for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
        const s = gltf.skins[skinIndex];
        const ibm = s.inverseBindMatricesData;
        if (!ibm) continue;
        for (let i = 0; i < s.joints.length; i++) {
          const jointIdx = nodeIndex.get(s.joints[i]);
          const jointGO = nodes[jointIdx];
          jointGO.components.push({
            type: Components.Bone.type,
            index: i,
            skinId: skinIndex,
            inverseBindMatrix: new Float32Array(ibm.buffer, ibm.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i, 16)
          });
        }
      }
    }
    if (gltf.animations && gltf.animations.length) {
      const compCountForPath = (path) => path === "translation" || path === "scale" ? 3 : path === "rotation" ? 4 : 1;
      const clipDefs = [];
      const nodeTracks = gltf.nodes.map(() => []);
      for (let a = 0; a < gltf.animations.length; a++) {
        const anim = gltf.animations[a];
        const perNodeChannels = /* @__PURE__ */ new Map();
        let duration = 0;
        for (const ch of anim.channels) {
          const targetIdx = ch.target.nodeID;
          const times = Array.from(ch.sampler.keyFrameIndices);
          const values = Array.from(ch.sampler.keyFrameRaw);
          duration = Math.max(duration, times[times.length - 1] ?? 0);
          const channel = {
            path: ch.target.path,
            sampler: {
              times,
              values,
              keyCount: times.length,
              compCount: compCountForPath(ch.target.path)
            }
          };
          if (!perNodeChannels.has(targetIdx)) perNodeChannels.set(targetIdx, []);
          perNodeChannels.get(targetIdx).push(channel);
        }
        const clipIndex = clipDefs.length;
        clipDefs.push({
          name: anim.name || `Animation ${a}`,
          duration
        });
        for (const [nodeId, channels] of perNodeChannels) {
          nodeTracks[nodeId].push({
            clipIndex,
            channels
          });
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        if (nodeTracks[i].length) {
          nodes[i].components.push({
            id: Utils.UUID(),
            type: Components.AnimationTrack.type,
            clips: nodeTracks[i]
          });
        }
      }
      nodes[0].__rootAnimator = {
        id: Utils.UUID(),
        type: Components.Animator.type,
        clips: clipDefs
      };
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (!node.mesh) continue;
      const nodeGO = nodes[i];
      const primitives = node.mesh.primitives ?? [];
      let pIndex = 0;
      for (const primitive of primitives) {
        const parsedPrimitive = await this.parsePrimitive(primitive, gltf.textures);
        const geometryInstance = parsedPrimitive.geometry;
        const materialInstance = parsedPrimitive.material;
        const primitiveIndex = pIndex++;
        const geometryKey = `geometry:${nodeGO.name}_Prim_${primitiveIndex}:Geometry`;
        const materialKey = `material:${nodeGO.name}_Prim_${primitiveIndex}:Material`;
        await Assets.SetInstance(geometryKey, geometryInstance);
        await Assets.SetInstance(materialKey, materialInstance);
        const primGO = this.createEmptyGO(`${nodeGO.name}_Prim_${pIndex++}`);
        const hasSkin = primitive.attributes && primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0;
        if (hasSkin) {
          primGO.components.push({
            type: Components.SkinnedMesh.type,
            geometry: { assetPath: geometryKey },
            material: { assetPath: materialKey },
            enableShadows: true
          });
        } else {
          primGO.components.push({
            type: Components.Mesh.type,
            geometry: { assetPath: geometryKey },
            material: { assetPath: materialKey },
            enableShadows: true
          });
        }
        nodeGO.children.push(primGO);
      }
    }
    const childIDs = /* @__PURE__ */ new Set();
    for (const n of gltf.nodes) {
      for (const childId of n.childrenID) childIDs.add(childId);
    }
    const root = this.createEmptyGO("GLTFPrefab");
    for (let i = 0; i < gltf.nodes.length; i++) {
      if (!childIDs.has(i)) root.children.push(nodes[i]);
    }
    if (nodes[0].__rootAnimator) {
      root.components.push(nodes[0].__rootAnimator);
    }
    return root;
  }
}

export { GLTFLoader };
