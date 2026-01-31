import {
    Geometry,
    GameObject,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    PBRMaterialParams,
    Texture as TridentTexture,
    IndexAttribute, VertexAttribute,
    Prefab,
    GPU,
    Assets
} from "@trident/core";

import { GLTFParser, MeshPrimitive, Texture, Node, AccessorComponentType, GLTF, TextureInfo, Accessor } from './GLTFParser'

export class GLTFLoader {
    private static TextureCache: Map<number, Promise<TridentTexture>> = new Map();

    // ---------- Small generic helpers ----------

    private static getTypedArrayView(bytes: Uint8Array, componentType: AccessorComponentType) {
        const buf = bytes.buffer;
        const off = bytes.byteOffset;

        switch (componentType) {
            case AccessorComponentType.GL_UNSIGNED_BYTE:
                return new Uint8Array(buf, off, bytes.byteLength);

            case AccessorComponentType.GL_UNSIGNED_SHORT:
                return new Uint16Array(buf, off, (bytes.byteLength / 2) | 0);

            case AccessorComponentType.GL_UNSIGNED_INT:
                return new Uint32Array(buf, off, (bytes.byteLength / 4) | 0);

            case AccessorComponentType.GL_FLOAT:
                return new Float32Array(buf, off, (bytes.byteLength / 4) | 0);

            default:
                throw new Error(`Unsupported component type: ${componentType}`);
        }
    }

    private static byteSize(componentType: AccessorComponentType) {
        switch (componentType) {
            case AccessorComponentType.GL_UNSIGNED_BYTE: return 1;
            case AccessorComponentType.GL_UNSIGNED_SHORT: return 2;
            case AccessorComponentType.GL_UNSIGNED_INT: return 4;
            case AccessorComponentType.GL_FLOAT: return 4;
            default: return 0;
        }
    }

    private static finalizeGeometry(geom: Geometry) {
        const posAttr = geom.attributes.get("position");
        if (!posAttr) throw Error("Geometry missing position attribute.");
        const floatCount = posAttr.array.length;
        const vertexCount = (floatCount / 3) | 0;

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

    private static async getTexture(textures: Texture[] | undefined, textureInfo: TextureInfo | null, textureFormat: "bgra8unorm" | "bgra8unorm-srgb"): Promise<TridentTexture | undefined> {
        if (!textures || !textureInfo) return undefined;
        const tex = textures[textureInfo.index];
        if (!tex?.source) throw Error("Invalid texture");

        let cached = this.TextureCache.get(tex.source.checksum);
        if (!cached) {
            // cached = TridentTexture.LoadImageSource(new Blob([tex.source.bytes], { type: tex.source.mimeType }), textureFormat, {resizeWidth: 1024, resizeHeight: 1024});
            cached = TridentTexture.LoadImageSource(new Blob([tex.source.bytes], { type: tex.source.mimeType }), textureFormat);
            this.TextureCache.set(tex.source.checksum, cached);
        }
        return cached;
    }

    private static componentCount(type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4") {
        switch (type) {
            case "SCALAR": return 1;
            case "VEC2": return 2;
            case "VEC3": return 3;
            case "VEC4": return 4;
            case "MAT2": return 4;
            case "MAT3": return 9;
            case "MAT4": return 16;
        }
    }

    // TODO: Support true interleaved vertex buffers
    private static readAccessorAsFloat32(acc: Accessor): Float32Array {
        const stride = acc.bufferView.byteStride ?? 0;
        const comps = GLTFLoader.componentCount(acc.type);
        const compSize = GLTFLoader.byteSize(acc.componentType);

        const bvU8 = acc.bufferView.data;
        const baseInBV = acc.byteOffset ?? 0; // offset INSIDE bufferView
        const baseInAB = bvU8.byteOffset + baseInBV; // absolute offset into underlying ArrayBuffer

        const interleaved = stride > 0;
        const out = new Float32Array(acc.count * comps);

        const dv = new DataView(bvU8.buffer); // one DataView, reuse it

        const readScalarAt = (absByteOffset: number) => {
            switch (acc.componentType) {
                case AccessorComponentType.GL_FLOAT: return dv.getFloat32(absByteOffset, true);
                case AccessorComponentType.GL_UNSIGNED_BYTE: return acc.normalized ? dv.getUint8(absByteOffset) / 255 : dv.getUint8(absByteOffset);
                case AccessorComponentType.GL_UNSIGNED_SHORT: return acc.normalized ? dv.getUint16(absByteOffset, true) / 65535 : dv.getUint16(absByteOffset, true);
                case AccessorComponentType.GL_BYTE: return acc.normalized ? Math.max(-1, dv.getInt8(absByteOffset) / 127) : dv.getInt8(absByteOffset);
                case AccessorComponentType.GL_SHORT: return acc.normalized ? Math.max(-1, dv.getInt16(absByteOffset, true) / 32767) : dv.getInt16(absByteOffset, true);
                default: throw Error("Unsupported attribute componentType");
            }
        };

        for (let i = 0; i < acc.count; i++) {
            const elementBaseAbs = interleaved
                ? baseInAB + i * stride
                : baseInAB + i * comps * compSize;

            for (let c = 0; c < comps; c++) {
                out[i * comps + c] = readScalarAt(elementBaseAbs + c * compSize);
            }
        }

        return out;
    }

    private static readAccessorAsUint32(acc: Accessor): Uint32Array {
        const stride = acc.bufferView.byteStride ?? 0;
        const comps = GLTFLoader.componentCount(acc.type);
        const compSize = GLTFLoader.byteSize(acc.componentType);

        const bvU8 = acc.bufferView.data;
        const baseInBV = acc.byteOffset ?? 0;
        const baseInAB = bvU8.byteOffset + baseInBV;

        const interleaved = stride > 0;
        const out = new Uint32Array(acc.count * comps);
        const dv = new DataView(bvU8.buffer);

        const readScalarAt = (absByteOffset: number) => {
            switch (acc.componentType) {
                case AccessorComponentType.GL_UNSIGNED_BYTE: return dv.getUint8(absByteOffset);
                case AccessorComponentType.GL_UNSIGNED_SHORT: return dv.getUint16(absByteOffset, true);
                case AccessorComponentType.GL_UNSIGNED_INT: return dv.getUint32(absByteOffset, true);
                default: throw Error("Unsupported componentType");
            }
        };

        for (let i = 0; i < acc.count; i++) {
            const elementBaseAbs = interleaved
                ? baseInAB + i * stride
                : baseInAB + i * comps * compSize;

            for (let c = 0; c < comps; c++) {
                out[i * comps + c] = readScalarAt(elementBaseAbs + c * compSize);
            }
        }
        return out;
    }

    // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------

    private static async parsePrimitive(primitive: MeshPrimitive, textures?: Texture[]): Promise<{geometry: Geometry, material: GPU.Material}> {
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

            // Read like other attributes (handles normalized + stride)
            const weightsF32 = this.readAccessorAsFloat32(acc);
            geometry.attributes.set("weights", new VertexAttribute(weightsF32));
        }

        if (primitive.indices) {
            const acc = primitive.indices;
            const bv = acc.bufferView;

            const byteLen = acc.count * this.byteSize(acc.componentType);
            const bytes = bv.data.subarray(acc.byteOffset, acc.byteOffset + byteLen);

            let indices = this.getTypedArrayView(bytes, acc.componentType);

            // WebGPU index buffers must be u16/u32
            if (indices instanceof Uint8Array) {
                const promoted = new Uint16Array(indices.length);
                for (let i = 0; i < indices.length; i++) promoted[i] = indices[i];
                indices = promoted;
            }

            geometry.index = new IndexAttribute(indices as Uint16Array | Uint32Array);
        }

        let materialParams: Partial<PBRMaterialParams> = {};

        const mat = primitive.material;
        if (mat?.pbrMetallicRoughness) {
            const pbr = mat.pbrMetallicRoughness;
            if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);

            if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb");
            if (pbr.metallicRoughnessTexture) materialParams.metalnessMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm");

            if (pbr.roughnessFactor !== undefined) materialParams.roughness = pbr.roughnessFactor;
            if (pbr.metallicFactor !== undefined) materialParams.metalness = pbr.metallicFactor;
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
        // tangents if needed
        if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
            geometry.ComputeTangents();
        }

        geometry.ComputeBoundingVolume();

        return {
            geometry: geometry,
            material: new PBRMaterial(materialParams),
        };
    }

    // ---------- Public: load as GameObjects (Unity-style) ----------

    private static cache: Map<any, GLTF> = new Map();

    private static serializeTransform(position: Mathf.Vector3, rotation: Mathf.Quaternion, scale: Mathf.Vector3) {
        return {
            type: Components.Transform.type,
            localPosition: position.Serialize(),
            localRotation: rotation.Serialize(),
            scale: scale.Serialize()
        };
    }

    private static createEmptyGO(name: string, position?: Mathf.Vector3, rotation?: Mathf.Quaternion, scale?: Mathf.Vector3): Prefab {
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

    public static async LoadFromURL(url: string, format?: "glb" | "gltf"): Promise<Prefab> {
        let cached = GLTFLoader.cache.get(url);
        if (!cached) {
            if (url.endsWith(".glb") || format === "glb") cached = await new GLTFParser().loadGLBUrl(url);
            else if (url.endsWith(".gltf") || format === "gltf") cached = await new GLTFParser().loadGLTF(url);
            GLTFLoader.cache.set(url, cached);
        }

        return this.Parse(cached);
    }

    public static async LoadFromArrayBuffer(arrayBuffer: ArrayBuffer, key?: any): Promise<Prefab> {
        const cacheKey = key ?? arrayBuffer;
        let cached = GLTFLoader.cache.get(cacheKey);
        if (!cached) {
            cached = await new GLTFParser().parseGLB(arrayBuffer);
            GLTFLoader.cache.set(cacheKey, cached);
        }
        return this.Parse(cached);
    }

    private static async Parse(gltf: GLTF): Promise<Prefab> {
        if (!gltf.nodes) {
            return this.createEmptyGO("GLTFPrefab");
        }

        const nodeIndex = new Map<Node, number>();
        gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));

        const nodes: Prefab[] = [];
        for (let i = 0; i < gltf.nodes.length; i++) {
            const n = gltf.nodes[i];
            nodes.push(this.createEmptyGO(
                n.name || `Node_${i}`,
                new Mathf.Vector3(n.translation.x, n.translation.y, n.translation.z),
                new Mathf.Quaternion(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w),
                new Mathf.Vector3(n.scale.x, n.scale.y, n.scale.z)
            ));
        }

        // Hierarchy
        for (let i = 0; i < gltf.nodes.length; i++) {
            const n = gltf.nodes[i];
            for (const childId of n.childrenID) {
                nodes[i].children.push(nodes[childId]);
            }
        }

        // Mesh primitives -> child GOs
        for (let i = 0; i < gltf.nodes.length; i++) {
            const node = gltf.nodes[i];
            if (!node.mesh) continue;

            const nodeGO = nodes[i];
            const primitives = node.mesh.primitives ?? [];
            let pIndex = 0;

            for (const primitive of primitives) {
                const parsedPrimitive = await this.parsePrimitive(primitive, gltf.textures);
                // Cache geometry and material
                const geometryInstance = parsedPrimitive.geometry;
                const materialInstance = parsedPrimitive.material;
                const primitiveIndex = pIndex++;
                const geometryKey = `geometry:${nodeGO.name}_Prim_${primitiveIndex}:Geometry`;
                const materialKey = `material:${nodeGO.name}_Prim_${primitiveIndex}:Material`;
                await Assets.SetInstance(geometryKey, geometryInstance);
                await Assets.SetInstance(materialKey, materialInstance);

                const hasSkin = primitive.attributes && primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0;
                if (hasSkin) {
                    // SkinnedMesh serialization is not implemented; skip for now.
                    continue;
                }

                const meshComponent = {
                    type: Components.Mesh.type,
                    geometry: {assetPath: geometryKey},
                    material: {assetPath: materialKey},
                    enableShadows: true
                };

                const primGO = this.createEmptyGO(`${nodeGO.name}_Prim_${pIndex++}`);
                primGO.components.push(meshComponent);
                nodeGO.children.push(primGO);
            }
        }

        // Roots
        const childIDs = new Set<number>();
        for (const n of gltf.nodes) {
            for (const childId of n.childrenID) childIDs.add(childId);
        }

        const root = this.createEmptyGO("GLTFPrefab");
        for (let i = 0; i < gltf.nodes.length; i++) {
            if (!childIDs.has(i)) root.children.push(nodes[i]);
        }

        return root;
    }




















    public static async loadAsGameObjects(scene: Scene, url: string, format?: "glb" | "gltf"): Promise<GameObject> {
        let cached = GLTFLoader.cache.get(url);
        if (!cached) {
            if (url.endsWith(".glb") || format === "glb") cached = await new GLTFParser().loadGLBUrl(url);
            else if (url.endsWith(".gltf") || format === "gltf") cached = await new GLTFParser().loadGLTF(url);
            GLTFLoader.cache.set(url, cached);
        }

        return this.parseAsGameObjects(scene, cached);
    }

    public static async loadAsGameObjectsFromArrayBuffer(scene: Scene, arrayBuffer: ArrayBuffer, key?: any): Promise<GameObject> {
        let cached = GLTFLoader.cache.get(key);
        if (!cached) {
            cached = await new GLTFParser().parseGLB(arrayBuffer);
            GLTFLoader.cache.set(key, cached);
        }
        return this.parseAsGameObjects(scene, cached);
    }

    private static async parseAsGameObjects(scene: Scene, gltf: GLTF): Promise<GameObject> {
        const gameObjects: GameObject[] = [];
        const nodeGOs: GameObject[] = [];
        const skins: Components.Skin[] = [];
        const clips: Components.AnimationClip[] = [];

        if (!gltf.nodes) return null;

        // Build quick lookup to avoid indexOf on nodes later
        const nodeIndex = new Map<Node, number>();
        gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));

        let transforms: Map<GameObject, { position: Mathf.Vector3, rotation: Mathf.Quaternion, scale: Mathf.Vector3 }> = new Map();

        // 1) Create empty GOs (set transforms after parenting)
        for (let i = 0; i < gltf.nodes.length; i++) {
            const n = gltf.nodes[i];
            const go = new GameObject(scene);
            go.name = n.name || `Node_${i}`;

            nodeGOs.push(go);
            gameObjects.push(go);
        }

        // 2) Wire hierarchy
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

        // 3) Skins
        if (gltf.skins) {
            for (const s of gltf.skins) {
                const jointTransforms = s.joints.map(j => nodeGOs[nodeIndex.get(j)!].transform);
                const ibm = s.inverseBindMatricesData;
                if (!ibm) continue;
                skins.push(new Components.Skin(jointTransforms, ibm as Float32Array));
            }
        }

        // 4) Animations
        if (gltf.animations) {
            const compCountForPath = (path: string) =>
                path === 'translation' || path === 'scale' ? 3 :
                    path === 'rotation' ? 4 :
                        path === 'weights' ? 1 : 1;

            for (const a of gltf.animations) {
                const channels: any[] = [];
                let duration = 0;

                for (const ch of a.channels) {
                    const targetIdx = ch.target.nodeID!;
                    const targetTransform = nodeGOs[targetIdx].transform;
                    const times = ch.sampler.keyFrameIndices as Float32Array;
                    const values = ch.sampler.keyFrameRaw as Float32Array;

                    duration = Math.max(duration, times[times.length - 1] ?? 0);

                    const sampler: Components.AnimationSampler = {
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

        // 5) Attach mesh components (one child GO per primitive)
        for (let i = 0; i < gltf.nodes.length; i++) {
            const node = gltf.nodes[i];
            if (!node.mesh) continue;

            const nodeGO = nodeGOs[i];
            const skinIdx = node.skin ? gltf.skins!.indexOf(node.skin) : -1;
            const skin = skinIdx >= 0 ? skins[skinIdx] : undefined;

            const primitives = node.mesh.primitives ?? [];
            let pIndex = 0;
            for (const primitive of primitives) {
                const primGO = new GameObject(scene);
                primGO.name = `${nodeGO.name}_Prim_${pIndex++}`;
                primGO.transform.parent = nodeGO.transform;

                const { geometry, material } = await this.parsePrimitive(primitive, gltf.textures);

                const hasSkin = !!primitive.attributes && !!(primitive.attributes as any).JOINTS_0 && !!(primitive.attributes as any).WEIGHTS_0;

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


        // Get root gameobjects
        const childIDs = new Set<number>();
        for (const n of gltf.nodes) {
            for (const childId of n.childrenID) {
                childIDs.add(childId);
            }
        }

        const rootGameObjects = gltf.nodes.map((n, i) => ({ n, go: nodeGOs[i] })).filter(({ n }, i) => !childIDs.has(i)).map(({ go }) => go);

        const sceneGameObject = new GameObject(scene);
        // sceneGameObject.name = url.slice(url.lastIndexOf("/") + 1);
        for (const rootGameObject of rootGameObjects) rootGameObject.transform.parent = sceneGameObject.transform;

        return sceneGameObject;
    }
}
