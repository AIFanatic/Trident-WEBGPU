import { IndexAttribute, VertexAttribute, Texture, Geometry, Mathf, PBRMaterial, GameObject, Components } from '@trident/core';
import { GLTFParser } from './GLTFParser.js';

class GLTFLoader {
  static TextureCache = /* @__PURE__ */ new Map();
  static ParseCounter = 0;
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
    if (!geom.attributes.has("tangent") && geom.attributes.has("position") && geom.attributes.has("normal") && geom.attributes.has("uv")) {
      geom.ComputeTangents();
    }
    if (!geom.attributes.has("tangent")) {
      const vertexCount2 = geom.attributes.get("position").array.length / 3;
      geom.attributes.set("tangent", new VertexAttribute(new Float32Array(vertexCount2 * 4)));
    }
  }
  // ---------- Textures ----------
  static async getTexture(textures, textureInfo, textureFormat) {
    if (!textures || !textureInfo) return void 0;
    const tex = textures[textureInfo.index];
    if (!tex?.source) throw Error("Invalid texture");
    let cached = this.TextureCache.get(tex.source.checksum);
    if (!cached) {
      cached = Texture.LoadBlob(new Blob([tex.source.bytes], { type: tex.source.mimeType }), textureFormat, { name: tex.source.name, storeSource: true });
      this.TextureCache.set(tex.source.checksum, cached);
    }
    return cached;
  }
  // ---------- Accessor parsing ----------
  static parseAccessor(accessorDef) {
    const WEBGL_TYPE_SIZES = { "SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4, "MAT3": 9, "MAT4": 16 };
    const WEBGL_COMPONENT_TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const bufferView = accessorDef.bufferView;
    const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
    const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
    const elementBytes = TypedArray.BYTES_PER_ELEMENT;
    const itemBytes = elementBytes * itemSize;
    const byteStride = accessorDef.bufferView !== void 0 ? accessorDef.bufferView.byteStride : void 0;
    accessorDef.normalized === true;
    let array;
    if (byteStride && byteStride !== itemBytes) {
      array = new TypedArray(accessorDef.count * itemSize);
      const srcByteStart = bufferView.data.byteOffset + accessorDef.byteOffset;
      const src = new DataView(bufferView.data.buffer);
      for (let i = 0; i < accessorDef.count; i++) {
        const rowByte = srcByteStart + i * byteStride;
        for (let j = 0; j < itemSize; j++) {
          const b = rowByte + j * elementBytes;
          if (elementBytes === 1) {
            array[i * itemSize + j] = accessorDef.componentType === 5120 ? src.getInt8(b) : src.getUint8(b);
          } else if (elementBytes === 2) {
            array[i * itemSize + j] = accessorDef.componentType === 5122 ? src.getInt16(b, true) : src.getUint16(b, true);
          } else {
            array[i * itemSize + j] = accessorDef.componentType === 5125 ? src.getUint32(b, true) : src.getFloat32(b, true);
          }
        }
      }
    } else {
      const byteOffset = (bufferView?.data.byteOffset || 0) + (accessorDef.byteOffset || 0);
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
    if (primitive.attributes.JOINTS_0) {
      const rawJoints = this.parseAccessor(primitive.attributes.JOINTS_0);
      const joints32 = rawJoints instanceof Uint32Array ? rawJoints : new Uint32Array(rawJoints);
      geometry.attributes.set("joints", new VertexAttribute(joints32));
    }
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
    const material = new PBRMaterial(materialParams);
    material.assetPath = void 0;
    if (primitive.material && primitive.material.name) material.name = primitive.material.name;
    return { geometry, material };
  }
  // ---------- Public API ----------
  static cache = /* @__PURE__ */ new Map();
  /**
   * Load a GLTF/GLB from URL and create live GameObjects in the scene.
   * Returns the root GameObject.
   */
  static async Load(url, scene, format) {
    let cached = GLTFLoader.cache.get(url);
    if (!cached) {
      if (url.endsWith(".glb") || format === "glb") cached = await new GLTFParser().loadGLBUrl(url);
      else if (url.endsWith(".gltf") || format === "gltf") cached = await new GLTFParser().loadGLTF(url);
      GLTFLoader.cache.set(url, cached);
    }
    const rootName = url.slice(url.lastIndexOf("/") + 1, url.lastIndexOf("."));
    return this.Build(rootName, cached, scene);
  }
  /**
   * Load from an ArrayBuffer and create live GameObjects in the scene.
   * Returns the root GameObject.
   */
  static async LoadFromArrayBuffer(arrayBuffer, scene, name, key) {
    const cacheKey = key ?? arrayBuffer;
    let cached = GLTFLoader.cache.get(cacheKey);
    if (!cached) {
      cached = await new GLTFParser().parseGLB(arrayBuffer);
      GLTFLoader.cache.set(cacheKey, cached);
    }
    return this.Build(name ?? "GameObject", cached, scene);
  }
  // ---------- Build live GameObjects from parsed GLTF ----------
  static async Build(rootName, gltf, scene) {
    if (!gltf.nodes) {
      const empty = new GameObject();
      empty.name = rootName;
      return empty;
    }
    const nodeIndex = /* @__PURE__ */ new Map();
    gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));
    const nodes = [];
    for (let i = 0; i < gltf.nodes.length; i++) {
      const go = new GameObject();
      go.name = gltf.nodes[i].name || `Node_${i}`;
      nodes.push(go);
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      for (const childId of gltf.nodes[i].childrenID) {
        nodes[childId].transform.parent = nodes[i].transform;
      }
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      nodes[i].transform.localPosition.set(n.translation.x, n.translation.y, n.translation.z);
      nodes[i].transform.localRotation.set(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w);
      nodes[i].transform.scale.set(n.scale.x, n.scale.y, n.scale.z);
    }
    if (gltf.skins) {
      for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
        const s = gltf.skins[skinIndex];
        const ibm = s.inverseBindMatricesData;
        if (!ibm) continue;
        for (let i = 0; i < s.joints.length; i++) {
          const jointIdx = nodeIndex.get(s.joints[i]);
          const bone = nodes[jointIdx].AddComponent(Components.Bone);
          bone.index = i;
          bone.skinId = skinIndex;
          bone.inverseBindMatrix = new Float32Array(
            ibm.buffer,
            ibm.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
            16
          ).slice();
        }
      }
    }
    let animatorComponent = null;
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
          nodeTracks[nodeId].push({ clipIndex, channels });
        }
      }
      const tracksData = {};
      for (let i = 0; i < nodes.length; i++) {
        if (nodeTracks[i].length) {
          const trackName = nodes[i].name;
          tracksData[trackName] = nodeTracks[i];
          const track = nodes[i].AddComponent(Components.AnimationTrack);
          track.trackName = trackName;
          track.clips = nodeTracks[i];
        }
      }
      animatorComponent = { clipDefs, tracksData };
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (!node.mesh) continue;
      const nodeGO = nodes[i];
      const primitives = node.mesh.primitives ?? [];
      for (const primitive of primitives) {
        const parsed = await this.parsePrimitive(primitive, gltf.textures);
        const primGO = new GameObject();
        primGO.name = nodeGO.name;
        primGO.transform.parent = nodeGO.transform;
        primGO.transform.localPosition.set(0, 0, 0);
        primGO.transform.localRotation.set(0, 0, 0, 1);
        const hasSkin = primitive.attributes && primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0;
        if (hasSkin) {
          const mesh = primGO.AddComponent(Components.SkinnedMesh);
          mesh.geometry = parsed.geometry;
          mesh.material = parsed.material;
          mesh.enableShadows = true;
        } else {
          const mesh = primGO.AddComponent(Components.Mesh);
          mesh.geometry = parsed.geometry;
          mesh.material = parsed.material;
          mesh.enableShadows = true;
        }
      }
    }
    const childIDs = /* @__PURE__ */ new Set();
    for (const n of gltf.nodes) {
      for (const childId of n.childrenID) childIDs.add(childId);
    }
    const root = new GameObject();
    root.name = rootName;
    for (let i = 0; i < gltf.nodes.length; i++) {
      if (!childIDs.has(i)) {
        nodes[i].transform.parent = root.transform;
      }
    }
    if (animatorComponent) {
      const data = animatorComponent;
      const animator = root.AddComponent(Components.Animator);
      animator.clips = data.clipDefs;
      animator.tracksData = data.tracksData;
    }
    return root;
  }
}

export { GLTFLoader };
