import { IndexAttribute, VertexAttribute, Texture, Geometry, Mathf, PBRMaterial, GameObject, Components } from '@trident/core';
import { AccessorComponentType, GLTFParser } from './GLTFParser.js';

class GLTFLoader {
  static TextureCache = /* @__PURE__ */ new Map();
  // ---------- Small generic helpers ----------
  static getTypedArray(buffer, componentType) {
    switch (componentType) {
      case AccessorComponentType.GL_UNSIGNED_BYTE:
        return new Uint8Array(buffer);
      case AccessorComponentType.GL_UNSIGNED_SHORT:
        return new Uint16Array(buffer);
      case AccessorComponentType.GL_UNSIGNED_INT:
        return new Uint32Array(buffer);
      case AccessorComponentType.GL_FLOAT:
        return new Float32Array(buffer);
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
    const countFloats = posAttr.array.length;
    if (!geom.index) {
      const indexBuffer = new Uint32Array(countFloats);
      for (let i = 0; i < countFloats; i++) indexBuffer[i] = i;
      geom.index = new IndexAttribute(indexBuffer);
      geom.ComputeNormals();
    }
    if (!geom.attributes.get("normal")) geom.ComputeNormals();
    if (!geom.attributes.get("uv")) {
      const uv = new Float32Array(countFloats / 3 * 2);
      geom.attributes.set("uv", new VertexAttribute(uv));
    }
  }
  // ---------- Textures ----------
  static async getTexture(textures, textureInfo, textureFormat) {
    if (!textures || !textureInfo) return void 0;
    const tex = textures[textureInfo.index];
    if (!tex?.source) throw Error("Invalid texture");
    let cached = this.TextureCache.get(tex);
    if (!cached) {
      cached = Texture.LoadImageSource(tex.source, textureFormat).then((t) => {
        t.GenerateMips();
        return t;
      });
      this.TextureCache.set(tex, cached);
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
    const base = acc.byteOffset ?? 0;
    const interleaved = stride > 0;
    const out = new Float32Array(acc.count * comps);
    const readScalar = (byteOffset) => {
      const dv = new DataView(acc.bufferView.data, byteOffset);
      switch (acc.componentType) {
        case AccessorComponentType.GL_FLOAT:
          return dv.getFloat32(0, true);
        case AccessorComponentType.GL_UNSIGNED_BYTE:
          return acc.normalized ? dv.getUint8(0) / 255 : dv.getUint8(0);
        case AccessorComponentType.GL_UNSIGNED_SHORT:
          return acc.normalized ? dv.getUint16(0, true) / 65535 : dv.getUint16(0, true);
        case AccessorComponentType.GL_BYTE:
          return acc.normalized ? Math.max(-1, dv.getInt8(0) / 127) : dv.getInt8(0);
        case AccessorComponentType.GL_SHORT:
          return acc.normalized ? Math.max(-1, dv.getInt16(0, true) / 32767) : dv.getInt16(0, true);
        default:
          throw Error("Unsupported attribute componentType");
      }
    };
    for (let i = 0; i < acc.count; i++) {
      const elementBase = interleaved ? base + i * stride : base + i * comps * compSize;
      for (let c = 0; c < comps; c++) {
        const off = interleaved ? elementBase + c * compSize : elementBase + c * compSize;
        out[i * comps + c] = readScalar(off);
      }
    }
    return out;
  }
  // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------
  static padVec3ToVec4(src, w = 1) {
    const n = src.length / 3 | 0;
    const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      out[4 * i + 0] = src[3 * i + 0];
      out[4 * i + 1] = src[3 * i + 1];
      out[4 * i + 2] = src[3 * i + 2];
      out[4 * i + 3] = w;
    }
    return out;
  }
  static toUint32(array) {
    if (array instanceof Uint32Array) return array;
    const converted = new Uint32Array(array.length);
    for (let i = 0; i < array.length; i++) converted[i] = array[i];
    return converted;
  }
  static async parsePrimitive(primitive, textures) {
    const geometry = new Geometry();
    if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.POSITION)));
    if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.NORMAL)));
    if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.TEXCOORD_0)));
    if (primitive.attributes.JOINTS_0) {
      const acc = primitive.attributes.JOINTS_0;
      const bv = acc.bufferView;
      const bytes = bv.data.slice(acc.byteOffset, acc.byteOffset + acc.count * this.byteSize(acc.componentType) * 4);
      const jointsSrc = this.getTypedArray(bytes, acc.componentType);
      const jointsU32 = new Uint32Array(jointsSrc.length);
      for (let i = 0; i < jointsSrc.length; i++) jointsU32[i] = jointsSrc[i];
      geometry.attributes.set("joints", new VertexAttribute(jointsU32));
    }
    if (primitive.attributes.WEIGHTS_0) {
      geometry.attributes.set("weights", new VertexAttribute(new Float32Array(primitive.attributes.WEIGHTS_0.bufferView.data)));
    }
    if (primitive.indices) {
      const acc = primitive.indices;
      const bv = acc.bufferView;
      const bytes = bv.data.slice(acc.byteOffset, acc.byteOffset + acc.count * this.byteSize(acc.componentType));
      geometry.index = new IndexAttribute(this.getTypedArray(bytes, acc.componentType));
    }
    let materialParams = {};
    const mat = primitive.material;
    if (mat?.pbrMetallicRoughness) {
      const pbr = mat.pbrMetallicRoughness;
      if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);
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
    materialParams.unlit = false;
    materialParams.doubleSided = !!mat?.doubleSided;
    materialParams.alphaCutoff = mat?.alphaCutoff;
    if (primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0) materialParams.isSkinned = true;
    this.finalizeGeometry(geometry);
    if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
      geometry.ComputeTangents();
    }
    geometry.ComputeBoundingVolume();
    const enableVertexPulling = false;
    materialParams.useVertexPulling = enableVertexPulling;
    return {
      name: "",
      geometry,
      material: new PBRMaterial(materialParams),
      children: [],
      localMatrix: new Mathf.Matrix4()
    };
  }
  // private static async parseNode(gltf: GLTF, node: Node, textures?: Texture[]): Promise<Object3D> {
  //     const nodeObj: Object3D = {
  //         name: node.name ?? undefined,
  //         children: [],
  //         localMatrix: new Mathf.Matrix4().setFromArray(node.matrix)
  //     };
  //     if (node.extensions?.EXT_mesh_gpu_instancing) {
  //         const attrs = node.extensions.EXT_mesh_gpu_instancing.attributes;
  //         if (!gltf.accessors) throw Error("No accessors");
  //         const t = new Float32Array(gltf.accessors[attrs.TRANSLATION].bufferView.data);
  //         const r = new Float32Array(gltf.accessors[attrs.ROTATION].bufferView.data);
  //         const s = new Float32Array(gltf.accessors[attrs.SCALE].bufferView.data);
  //         const count = t.length / 3;
  //         const instanceMatrices: Mathf.Matrix4[] = [];
  //         const P = new Mathf.Vector3(); const Q = new Mathf.Quaternion(); const S = new Mathf.Vector3(); const M = new Mathf.Matrix4();
  //         let psc = 0, rc = 0;
  //         for (let i = 0; i < count; i++) {
  //             P.set(t[psc], t[psc + 1], t[psc + 2]);
  //             Q.set(r[rc], r[rc + 1], r[rc + 2], r[rc + 3]);
  //             S.set(s[psc], s[psc + 1], s[psc + 2]);
  //             M.compose(P, Q, S);
  //             instanceMatrices.push(M.clone());
  //             psc += 3; rc += 4;
  //         }
  //         nodeObj.extensions = [{ instanceCount: count, instanceMatrices }];
  //     }
  //     for (const child of node.children) {
  //         nodeObj.children.push(await this.parseNode(gltf, child, textures));
  //     }
  //     if (node.mesh) {
  //         const { primitives, name } = node.mesh;
  //         if (primitives.length === 1) {
  //             const o = await this.parsePrimitive(primitives[0], gltf.textures);
  //             nodeObj.geometry = o.geometry;
  //             nodeObj.material = o.material;
  //         } else {
  //             let idx = 0;
  //             for (const p of primitives) {
  //                 const o = await this.parsePrimitive(p, gltf.textures);
  //                 o.name = name || `Object3D_${idx++}`;
  //                 nodeObj.children.push(o);
  //             }
  //         }
  //     }
  //     return nodeObj;
  // }
  // // ---------- Public: load as an Object3D tree ----------
  // public static async Load(url: string): Promise<Object3D> {
  //     const gltf = await new GLTFParser().load(url);
  //     if (!gltf?.scenes) throw Error("Invalid gltf");
  //     const sceneObj: Object3D = { name: "Scene", localMatrix: new Mathf.Matrix4(), children: [] };
  //     for (const scene of gltf.scenes) {
  //         if (!scene) continue;
  //         sceneObj.name = scene.name ?? "Scene";
  //         for (const node of scene.nodes) {
  //             sceneObj.children.push(await this.parseNode(gltf, node, gltf.textures));
  //         }
  //     }
  //     return sceneObj;
  // }
  // ---------- Public: load as GameObjects (Unity-style) ----------
  static async loadAsGameObjects(scene, url) {
    const gltf = await new GLTFParser().load(url);
    const gameObjects = [];
    const nodeGOs = [];
    const skins = [];
    const clips = [];
    if (!gltf.nodes) return gameObjects;
    const nodeIndex = /* @__PURE__ */ new Map();
    gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));
    let transforms = /* @__PURE__ */ new Map();
    for (let i = 0; i < gltf.nodes.length; i++) {
      const n = gltf.nodes[i];
      const go = new GameObject(scene);
      go.name = n.name || `Node_${i}`;
      go.transform.position.set(n.translation.x, n.translation.y, n.translation.z);
      go.transform.rotation.set(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w);
      go.transform.scale.set(n.scale.x, n.scale.y, n.scale.z);
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
    for (const [gameObject, transform] of transforms) {
      gameObject.transform.position.copy(transform.position);
      gameObject.transform.rotation.copy(transform.rotation);
      gameObject.transform.scale.copy(transform.scale);
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
    return gameObjects;
  }
}

export { GLTFLoader };
