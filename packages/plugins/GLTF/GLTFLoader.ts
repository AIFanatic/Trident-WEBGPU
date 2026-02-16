import {
    Geometry,
    Components,
    Mathf,
    PBRMaterial,
    PBRMaterialParams,
    Texture as TridentTexture,
    IndexAttribute, VertexAttribute,
    Prefab,
    GPU,
    Assets,
    Utils,
} from "@trident/core";

import { GLTFParser, MeshPrimitive, Texture, Node, AccessorComponentType, GLTF, TextureInfo, Accessor } from './GLTFParser'

export class GLTFLoader {
    private static TextureCache: Map<number, Promise<TridentTexture>> = new Map();

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

    // ---------- Primitive / Node parsing to Object3D (your existing pipeline, tidied) ----------

    // From threejs
    private static parseAccessor(accessorDef: Accessor): Float32Array | Uint32Array | Uint16Array | Int16Array | Uint8Array | Int8Array {
        const WEBGL_TYPE_SIZES = { 'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16};
        const WEBGL_COMPONENT_TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array};

        const bufferView = accessorDef.bufferView;
        const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
        const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];

        const elementBytes = TypedArray.BYTES_PER_ELEMENT;
        const itemBytes = elementBytes * itemSize;
        const byteOffset = accessorDef.bufferView.data.byteOffset || 0;
        const byteStride = accessorDef.bufferView !== undefined ? accessorDef.bufferView.byteStride : undefined;
        const normalized = accessorDef.normalized === true;
        let array;

        // Interleaved
        if (byteStride && byteStride !== itemBytes) {
            const ibSlice = Math.floor(byteOffset / byteStride);
            const ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
            let ib: Float32Array = this.cache.get(ibCacheKey);

            if (!ib) {
                array = new TypedArray(bufferView.data.buffer, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes);
                ib = array;
                this.cache.set(ibCacheKey, ib);
            }

            // bufferAttribute = new InterleavedVertexAttribute(ib, (byteOffset % byteStride) / elementBytes);
            console.warn("TODO: INTERLEAVED");
        } else {
            if (bufferView === null) array = new TypedArray(accessorDef.count * itemSize);
            else array = new TypedArray(bufferView.data.buffer, byteOffset, accessorDef.count * itemSize);
            // bufferAttribute = new VertexAttribute(array);
        }

        return array;
    }

    private static async parsePrimitive(primitive: MeshPrimitive, textures?: Texture[]): Promise<{ geometry: Geometry, material: GPU.Material }> {
        const geometry = new Geometry();

        // if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.readAccessorAsFloat32(primitive.attributes.POSITION)));
        if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.parseAccessor(primitive.attributes.POSITION) as Float32Array));
        if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.parseAccessor(primitive.attributes.NORMAL) as Float32Array));
        if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.parseAccessor(primitive.attributes.TEXCOORD_0) as Float32Array));
        if (primitive.attributes.TANGENT) geometry.attributes.set("tangent", new VertexAttribute(this.parseAccessor(primitive.attributes.TANGENT) as Float32Array));
        if (primitive.attributes.JOINTS_0) geometry.attributes.set("joints", new VertexAttribute(this.parseAccessor(primitive.attributes.JOINTS_0) as Float32Array));
        if (primitive.attributes.WEIGHTS_0) geometry.attributes.set("weights", new VertexAttribute(this.parseAccessor(primitive.attributes.WEIGHTS_0) as Float32Array));
        if (primitive.indices) {
            let indices = this.parseAccessor(primitive.indices) as Uint32Array | Uint16Array | Uint8Array;
            if (indices instanceof Uint8Array) indices = new Uint16Array(indices);
            geometry.index = new IndexAttribute(indices);
        }

        let materialParams: Partial<PBRMaterialParams> = {};

        const mat = primitive.material;
        if (mat?.pbrMetallicRoughness) {
            const pbr = mat.pbrMetallicRoughness;
            if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);

            if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb");
            if (pbr.metallicRoughnessTexture) materialParams.armMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm");

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
        if (!geometry.attributes.has("tangent")) {
            if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) {
                geometry.ComputeTangents();
            }
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
        const prefab = new Prefab();
        prefab.name = name;
        prefab.transform = this.serializeTransform(position ?? new Mathf.Vector3(), rotation ?? new Mathf.Quaternion(), scale ?? new Mathf.Vector3(1, 1, 1));
        return prefab;
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

        if (gltf.skins) {
            for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
                const s = gltf.skins[skinIndex];
                const ibm = s.inverseBindMatricesData as Float32Array;
                if (!ibm) continue;

                for (let i = 0; i < s.joints.length; i++) {
                    const jointIdx = nodeIndex.get(s.joints[i])!;
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
            const compCountForPath = (path: string) =>
                path === 'translation' || path === 'scale' ? 3 :
                    path === 'rotation' ? 4 : 1;

            const clipDefs: SerializedAnimationClipDef[] = [];
            const nodeTracks: SerializedAnimationTrackClip[][] = gltf.nodes.map(() => []);

            for (let a = 0; a < gltf.animations.length; a++) {
                const anim = gltf.animations[a];
                const perNodeChannels: Map<number, SerializedAnimationChannel[]> = new Map();
                let duration = 0;

                for (const ch of anim.channels) {
                    const targetIdx = ch.target.nodeID!;
                    const times = Array.from(ch.sampler.keyFrameIndices as Float32Array);
                    const values = Array.from(ch.sampler.keyFrameRaw as Float32Array);
                    duration = Math.max(duration, times[times.length - 1] ?? 0);

                    const channel: SerializedAnimationChannel = {
                        path: ch.target.path as any,
                        sampler: {
                            times,
                            values,
                            keyCount: times.length,
                            compCount: compCountForPath(ch.target.path)
                        }
                    };

                    if (!perNodeChannels.has(targetIdx)) perNodeChannels.set(targetIdx, []);
                    perNodeChannels.get(targetIdx)!.push(channel);
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

            (nodes[0] as any).__rootAnimator = {
                id: Utils.UUID(),
                type: Components.Animator.type,
                clips: clipDefs
            };
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

                const primGO = this.createEmptyGO(`${nodeGO.name}_Prim_${pIndex++}`);

                const hasSkin = primitive.attributes && primitive.attributes.JOINTS_0 && primitive.attributes.WEIGHTS_0;
                if (hasSkin) {
                    primGO.components.push({
                        type: Components.SkinnedMesh.type,
                        geometry: { assetPath: geometryKey },
                        material: { assetPath: materialKey },
                        enableShadows: true
                    });
                }
                else {
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

        // Roots
        const childIDs = new Set<number>();
        for (const n of gltf.nodes) {
            for (const childId of n.childrenID) childIDs.add(childId);
        }

        const root = this.createEmptyGO("GLTFPrefab");
        for (let i = 0; i < gltf.nodes.length; i++) {
            if (!childIDs.has(i)) root.children.push(nodes[i]);
        }

        if ((nodes[0] as any).__rootAnimator) {
            root.components.push((nodes[0] as any).__rootAnimator);
        }

        return root;
    }
}
