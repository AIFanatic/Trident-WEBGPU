import {
    Geometry,
    GameObject,
    Scene,
    Components,
    Object3D,
    Mathf,
    PBRMaterial,
    PBRMaterialParams,
    Texture as TridentTexture,
    IndexAttribute, VertexAttribute
} from "@trident/core";

import { GLTFParser, MeshPrimitive, Texture, Node, AccessorComponentType, GLTF, TextureInfo, Accessor } from './GLTFParser'

export class GLTFLoader {
    private static TextureCache: Map<Texture, Promise<TridentTexture>> = new Map();

    // ---------- Small generic helpers ----------

    private static getTypedArray(buffer: ArrayBufferLike, componentType: AccessorComponentType) {
        switch (componentType) {
            case AccessorComponentType.GL_UNSIGNED_BYTE: return new Uint8Array(buffer);
            case AccessorComponentType.GL_UNSIGNED_SHORT: return new Uint16Array(buffer);
            case AccessorComponentType.GL_UNSIGNED_INT: return new Uint32Array(buffer);
            case AccessorComponentType.GL_FLOAT: return new Float32Array(buffer);
            default: throw new Error(`Unsupported component type: ${componentType}`);
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
        const countFloats = (posAttr.array as any).length;

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

    private static async getTexture(textures: Texture[] | undefined, textureInfo: TextureInfo | null, textureFormat: "bgra8unorm" | "bgra8unorm-srgb"): Promise<TridentTexture | undefined> {
        if (!textures || !textureInfo) return undefined;
        const tex = textures[textureInfo.index];
        if (!tex?.source) throw Error("Invalid texture");

        let cached = this.TextureCache.get(tex);
        if (!cached) {
            cached = TridentTexture.LoadImageSource(tex.source, textureFormat).then(t => {
                t.GenerateMips();
                return t;
            });
            this.TextureCache.set(tex, cached);
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
        const stride = acc.bufferView.byteStride ?? 0;          // bytes per vertex if interleaved
        const comps = GLTFLoader.componentCount(acc.type);
        const compSize = GLTFLoader.byteSize(acc.componentType);  // bytes per component
        const base = acc.byteOffset ?? 0;                     // offset within this bufferView
        const interleaved = stride > 0;

        const out = new Float32Array(acc.count * comps);

        const readScalar = (byteOffset: number) => {
            const dv = new DataView(acc.bufferView.data as ArrayBufferLike, byteOffset);
            switch (acc.componentType) {
                case AccessorComponentType.GL_FLOAT: return dv.getFloat32(0, true);
                case AccessorComponentType.GL_UNSIGNED_BYTE: return acc.normalized ? dv.getUint8(0) / 255 : dv.getUint8(0);
                case AccessorComponentType.GL_UNSIGNED_SHORT: return acc.normalized ? dv.getUint16(0, true) / 65535 : dv.getUint16(0, true);
                case AccessorComponentType.GL_BYTE: return acc.normalized ? Math.max(-1, dv.getInt8(0) / 127) : dv.getInt8(0);
                case AccessorComponentType.GL_SHORT: return acc.normalized ? Math.max(-1, dv.getInt16(0, true) / 32767) : dv.getInt16(0, true);
                default: throw Error("Unsupported attribute componentType");
            }
        };

        for (let i = 0; i < acc.count; i++) {
            const elementBase = interleaved ? base + i * stride : base + i * comps * compSize; // tightly packed

            for (let c = 0; c < comps; c++) {
                const off = interleaved ? elementBase + c * compSize : elementBase + c * compSize;
                out[i * comps + c] = readScalar(off);
            }
        }
        return out;
    }

    // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------

    private static async parsePrimitive(primitive: MeshPrimitive, textures?: Texture[]): Promise<Object3D> {
        const geometry = new Geometry();

        if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.POSITION)));
        if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.NORMAL)));
        if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.TEXCOORD_0)));

        // JOINTS_0 (u8/u16) → promote to u32 if your engine expects that
        if (primitive.attributes.JOINTS_0) {
            const acc = primitive.attributes.JOINTS_0;
            const bv = acc.bufferView;
            const bytes = bv.data.slice(acc.byteOffset, acc.byteOffset + acc.count * this.byteSize(acc.componentType) * 4);
            const jointsSrc = this.getTypedArray(bytes, acc.componentType);
            const jointsU32 = new Uint32Array(jointsSrc.length);
            for (let i = 0; i < jointsSrc.length; i++) jointsU32[i] = (jointsSrc as any)[i];
            geometry.attributes.set("joints", new VertexAttribute(jointsU32));
        }
        if (primitive.attributes.WEIGHTS_0) {
            geometry.attributes.set("weights", new VertexAttribute(new Float32Array(primitive.attributes.WEIGHTS_0.bufferView.data)));
        }

        if (primitive.indices) {
            const acc = primitive.indices;
            const bv = acc.bufferView;
            const bytes = bv.data.slice(acc.byteOffset, acc.byteOffset + acc.count * this.byteSize(acc.componentType));
            geometry.index = new IndexAttribute(this.getTypedArray(bytes, acc.componentType) as Uint32Array | Uint16Array);
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
        materialParams.unlit = false;
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
            name: "",
            geometry,
            material: new PBRMaterial(materialParams),
            children: [],
            localMatrix: new Mathf.Matrix4(),
        };
    }

    // ---------- Public: load as GameObjects (Unity-style) ----------

    public static async loadAsGameObjects(scene: Scene, url: string): Promise<GameObject> {
        const gltf = await new GLTFParser().load(url);
        const gameObjects: GameObject[] = [];
        const nodeGOs: GameObject[] = [];
        const skins: Components.Skin[] = [];
        const clips: Components.AnimationClip[] = [];

        if (!gltf.nodes) return null;

        // Build quick lookup to avoid indexOf on nodes later
        const nodeIndex = new Map<Node, number>();
        gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));

        let transforms: Map<GameObject, {position: Mathf.Vector3, rotation: Mathf.Quaternion, scale: Mathf.Vector3}> = new Map();

        // 1) Create empty GOs with transforms
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

        // 2) Wire hierarchy
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
        sceneGameObject.name = url.slice(url.lastIndexOf("/") + 1);
        for (const rootGameObject of rootGameObjects) rootGameObject.transform.parent = sceneGameObject.transform;

        return sceneGameObject;
    }
}
