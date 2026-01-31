import { IndexAttribute, VertexAttribute, Texture, Geometry, Mathf, PBRMaterial, Components, Prefab, Utils, Assets } from '@trident/core';
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
    if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
      geometry.ComputeTangents();
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
            inverseBindMatrix: Array.from(new Float32Array(ibm.buffer, ibm.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i, 16))
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
