import { IndexAttribute, VertexAttribute, Texture, Geometry, Mathf, PBRMaterial, GameObject, Components } from '@trident/core';
import { AccessorComponentType, GLTFParser } from './GLTFParser.js';

class GLTFLoader {
  static TextureCache = /* @__PURE__ */ new Map();
  // ---------- Small generic helpers ----------
  static getTypedArrayView(bytes, componentType) {
    const buf = bytes.buffer;
    const off = bytes.byteOffset;
    switch (componentType) {
      case AccessorComponentType.GL_UNSIGNED_BYTE:
        return new Uint8Array(buf, off, bytes.byteLength);
      case AccessorComponentType.GL_UNSIGNED_SHORT:
        return new Uint16Array(buf, off, bytes.byteLength / 2 | 0);
      case AccessorComponentType.GL_UNSIGNED_INT:
        return new Uint32Array(buf, off, bytes.byteLength / 4 | 0);
      case AccessorComponentType.GL_FLOAT:
        return new Float32Array(buf, off, bytes.byteLength / 4 | 0);
      default:
        throw new Error(`Unsupported component type: ${componentType}`);
    }
  }
  static byteSize(componentType) {
    switch (componentType) {
      case AccessorComponentType.GL_UNSIGNED_BYTE:
        return 1;
      case AccessorComponentType.GL_UNSIGNED_SHORT:
        return 2;
      case AccessorComponentType.GL_UNSIGNED_INT:
        return 4;
      case AccessorComponentType.GL_FLOAT:
        return 4;
      default:
        return 0;
    }
  }
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
  static componentCount(type) {
    switch (type) {
      case "SCALAR":
        return 1;
      case "VEC2":
        return 2;
      case "VEC3":
        return 3;
      case "VEC4":
        return 4;
      case "MAT2":
        return 4;
      case "MAT3":
        return 9;
      case "MAT4":
        return 16;
    }
  }
  // TODO: Support true interleaved vertex buffers
  static readAccessorAsFloat32(acc) {
    const stride = acc.bufferView.byteStride ?? 0;
    const comps = GLTFLoader.componentCount(acc.type);
    const compSize = GLTFLoader.byteSize(acc.componentType);
    const bvU8 = acc.bufferView.data;
    const baseInBV = acc.byteOffset ?? 0;
    const baseInAB = bvU8.byteOffset + baseInBV;
    const interleaved = stride > 0;
    const out = new Float32Array(acc.count * comps);
    const dv = new DataView(bvU8.buffer);
    const readScalarAt = (absByteOffset) => {
      switch (acc.componentType) {
        case AccessorComponentType.GL_FLOAT:
          return dv.getFloat32(absByteOffset, true);
        case AccessorComponentType.GL_UNSIGNED_BYTE:
          return acc.normalized ? dv.getUint8(absByteOffset) / 255 : dv.getUint8(absByteOffset);
        case AccessorComponentType.GL_UNSIGNED_SHORT:
          return acc.normalized ? dv.getUint16(absByteOffset, true) / 65535 : dv.getUint16(absByteOffset, true);
        case AccessorComponentType.GL_BYTE:
          return acc.normalized ? Math.max(-1, dv.getInt8(absByteOffset) / 127) : dv.getInt8(absByteOffset);
        case AccessorComponentType.GL_SHORT:
          return acc.normalized ? Math.max(-1, dv.getInt16(absByteOffset, true) / 32767) : dv.getInt16(absByteOffset, true);
        default:
          throw Error("Unsupported attribute componentType");
      }
    };
    for (let i = 0; i < acc.count; i++) {
      const elementBaseAbs = interleaved ? baseInAB + i * stride : baseInAB + i * comps * compSize;
      for (let c = 0; c < comps; c++) {
        out[i * comps + c] = readScalarAt(elementBaseAbs + c * compSize);
      }
    }
    return out;
  }
  static readAccessorAsUint32(acc) {
    const stride = acc.bufferView.byteStride ?? 0;
    const comps = GLTFLoader.componentCount(acc.type);
    const compSize = GLTFLoader.byteSize(acc.componentType);
    const bvU8 = acc.bufferView.data;
    const baseInBV = acc.byteOffset ?? 0;
    const baseInAB = bvU8.byteOffset + baseInBV;
    const interleaved = stride > 0;
    const out = new Uint32Array(acc.count * comps);
    const dv = new DataView(bvU8.buffer);
    const readScalarAt = (absByteOffset) => {
      switch (acc.componentType) {
        case AccessorComponentType.GL_UNSIGNED_BYTE:
          return dv.getUint8(absByteOffset);
        case AccessorComponentType.GL_UNSIGNED_SHORT:
          return dv.getUint16(absByteOffset, true);
        case AccessorComponentType.GL_UNSIGNED_INT:
          return dv.getUint32(absByteOffset, true);
        default:
          throw Error("Unsupported componentType");
      }
    };
    for (let i = 0; i < acc.count; i++) {
      const elementBaseAbs = interleaved ? baseInAB + i * stride : baseInAB + i * comps * compSize;
      for (let c = 0; c < comps; c++) {
        out[i * comps + c] = readScalarAt(elementBaseAbs + c * compSize);
      }
    }
    return out;
  }
  // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------
  static async parsePrimitive(primitive, textures) {
    const geometry = new Geometry();
    if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.POSITION)));
    if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.NORMAL)));
    if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.TEXCOORD_0)));
    if (primitive.attributes.JOINTS_0) {
      const jointsU32 = this.readAccessorAsUint32(primitive.attributes.JOINTS_0);
      geometry.attributes.set("joints", new VertexAttribute(jointsU32));
    }
    if (primitive.attributes.WEIGHTS_0) {
      const acc = primitive.attributes.WEIGHTS_0;
      const weightsF32 = this.readAccessorAsFloat32(acc);
      geometry.attributes.set("weights", new VertexAttribute(weightsF32));
    }
    if (primitive.indices) {
      const acc = primitive.indices;
      const bv = acc.bufferView;
      const byteLen = acc.count * this.byteSize(acc.componentType);
      const bytes = bv.data.subarray(acc.byteOffset, acc.byteOffset + byteLen);
      let indices = this.getTypedArrayView(bytes, acc.componentType);
      if (indices instanceof Uint8Array) {
        const promoted = new Uint16Array(indices.length);
        for (let i = 0; i < indices.length; i++) promoted[i] = indices[i];
        indices = promoted;
      }
      geometry.index = new IndexAttribute(indices);
    }
    let materialParams = {};
    const mat = primitive.material;
    if (mat?.pbrMetallicRoughness) {
      const pbr = mat.pbrMetallicRoughness;
      if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);
      console.log(textures);
      console.log(pbr.baseColorTexture);
      if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb");
      if (pbr.metallicRoughnessTexture) materialParams.metalnessMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm");
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
    if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
      geometry.ComputeTangents();
    }
    geometry.ComputeBoundingVolume();
    return {
      name: "",
      geometry,
      material: new PBRMaterial(materialParams),
      children: [],
      localMatrix: new Mathf.Matrix4()
    };
  }
  // ---------- Public: load as GameObjects (Unity-style) ----------
  static cache = /* @__PURE__ */ new Map();
  static async loadAsGameObjects(scene, url, format) {
    let cached = GLTFLoader.cache.get(url);
    if (!cached) {
      if (url.endsWith(".glb") || format === "glb") cached = await new GLTFParser().loadGLBUrl(url);
      else if (url.endsWith(".gltf") || format === "gltf") cached = await new GLTFParser().loadGLTF(url);
      GLTFLoader.cache.set(url, cached);
    }
    return this.parseAsGameObjects(scene, cached);
  }
  static async loadAsGameObjectsFromArrayBuffer(scene, arrayBuffer, key) {
    let cached = GLTFLoader.cache.get(key);
    if (!cached) {
      cached = await new GLTFParser().parseGLB(arrayBuffer);
      GLTFLoader.cache.set(key, cached);
    }
    return this.parseAsGameObjects(scene, cached);
  }
  static async parseAsGameObjects(scene, gltf) {
    const gameObjects = [];
    const nodeGOs = [];
    const skins = [];
    const clips = [];
    if (!gltf.nodes) return null;
    const nodeIndex = /* @__PURE__ */ new Map();
    gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      const go = new GameObject(scene);
      go.name = n.name || `Node_${i}`;
      nodeGOs.push(go);
      gameObjects.push(go);
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      const go = nodeGOs[i];
      for (const childId of n.childrenID) {
        nodeGOs[childId].transform.parent = go.transform;
      }
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      const go = nodeGOs[i];
      go.transform.localPosition.set(n.translation.x, n.translation.y, n.translation.z);
      go.transform.localRotation.set(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w);
      go.transform.scale.set(n.scale.x, n.scale.y, n.scale.z);
    }
    if (gltf.skins) {
      for (const s of gltf.skins) {
        const jointTransforms = s.joints.map((j) => nodeGOs[nodeIndex.get(j)].transform);
        const ibm = s.inverseBindMatricesData;
        if (!ibm) continue;
        skins.push(new Components.Skin(jointTransforms, ibm));
      }
    }
    if (gltf.animations) {
      const compCountForPath = (path) => path === "translation" || path === "scale" ? 3 : path === "rotation" ? 4 : path === "weights" ? 1 : 1;
      for (const a of gltf.animations) {
        const channels = [];
        let duration = 0;
        for (const ch of a.channels) {
          const targetIdx = ch.target.nodeID;
          const targetTransform = nodeGOs[targetIdx].transform;
          const times = ch.sampler.keyFrameIndices;
          const values = ch.sampler.keyFrameRaw;
          duration = Math.max(duration, times[times.length - 1] ?? 0);
          const sampler = {
            times,
            values,
            keyCount: times.length,
            compCount: compCountForPath(ch.target.path)
          };
          channels.push({ sampler, targetTransform, path: ch.target.path });
        }
        clips.push(new Components.AnimationClip(a.name || `Animation ${clips.length}`, channels, duration));
      }
    }
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (!node.mesh) continue;
      const nodeGO = nodeGOs[i];
      const skinIdx = node.skin ? gltf.skins.indexOf(node.skin) : -1;
      const skin = skinIdx >= 0 ? skins[skinIdx] : void 0;
      const primitives = node.mesh.primitives ?? [];
      let pIndex = 0;
      for (const primitive of primitives) {
        const primGO = new GameObject(scene);
        primGO.name = `${nodeGO.name}_Prim_${pIndex++}`;
        primGO.transform.parent = nodeGO.transform;
        const { geometry, material } = await this.parsePrimitive(primitive, gltf.textures);
        const hasSkin = !!primitive.attributes && !!primitive.attributes.JOINTS_0 && !!primitive.attributes.WEIGHTS_0;
        const mesh = hasSkin && skin ? primGO.AddComponent(Components.SkinnedMesh) : primGO.AddComponent(Components.Mesh);
        if (mesh instanceof Components.SkinnedMesh) mesh.skin = skin;
        mesh.geometry = geometry;
        mesh.material = material;
      }
    }
    if (clips.length && gameObjects.length) {
      const animator = gameObjects[0].AddComponent(Components.Animator);
      animator.clips = clips;
    }
    const childIDs = /* @__PURE__ */ new Set();
    for (const n of gltf.nodes) {
      for (const childId of n.childrenID) {
        childIDs.add(childId);
      }
    }
    const rootGameObjects = gltf.nodes.map((n, i) => ({ n, go: nodeGOs[i] })).filter(({ n }, i) => !childIDs.has(i)).map(({ go }) => go);
    const sceneGameObject = new GameObject(scene);
    for (const rootGameObject of rootGameObjects) rootGameObject.transform.parent = sceneGameObject.transform;
    return sceneGameObject;
  }
  static serializeTransform(position, rotation, scale) {
    return {
      type: Components.Transform.type,
      position: position.Serialize(),
      rotation: rotation.Serialize(),
      scale: scale.Serialize()
    };
  }
  static createEmptyGO(name, position, rotation, scale) {
    return {
      name,
      transform: this.serializeTransform(
        position ?? new Mathf.Vector3(),
        rotation ?? new Mathf.Quaternion(),
        scale ?? new Mathf.Vector3(1, 1, 1)
      ),
      components: [],
      children: []
    };
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
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (!node.mesh) continue;
      const nodeGO = nodes[i];
      const primitives = node.mesh.primitives ?? [];
      let pIndex = 0;
      for (const primitive of primitives) {
        const { geometry, material } = await this.parsePrimitive(primitive, gltf.textures);
        const hasSkin = primitive.attributes && primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0;
        if (hasSkin) {
          continue;
        }
        const renderable = {
          type: Components.Renderable.type,
          geometry: geometry.Serialize(),
          material: material.Serialize(),
          enableShadows: true
        };
        const meshComponent = {
          type: Components.Mesh.type,
          renderable
        };
        const primGO = this.createEmptyGO(`${nodeGO.name}_Prim_${pIndex++}`);
        primGO.components.push(meshComponent);
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
    return root;
  }
}

export { GLTFLoader };
