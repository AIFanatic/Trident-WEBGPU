import {
    Geometry,
    Components,
    Mathf,
    PBRMaterial,
    Texture as TridentTexture,
    IndexAttribute, VertexAttribute,
    GPU,
    Scene,
    GameObject,
} from "@trident/core";

import { GLTFParser, MeshPrimitive, Texture, Node, AccessorComponentType, GLTF, TextureInfo, Accessor } from './GLTFParser'

export class GLTFLoader {
    private static TextureCache: Map<string, Promise<TridentTexture>> = new Map();

    private static sanitizeName(name: string) {
        return name.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    }

    private static fallbackName(value: string | null | undefined, fallback: string) {
        return this.sanitizeName(value && value.length > 0 ? value : fallback);
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
        if (!geom.attributes.has("tangent") && geom.attributes.has("position") && geom.attributes.has("normal") && geom.attributes.has("uv")) {
            geom.ComputeTangents();
        }
        if (!geom.attributes.has("tangent")) {
            const vertexCount = geom.attributes.get("position").array.length / 3;
            geom.attributes.set("tangent", new VertexAttribute(new Float32Array(vertexCount * 4)));
        }
    }

    // ---------- Textures ----------

    private static async getTexture(textures: Texture[] | undefined, textureInfo: TextureInfo | null, textureFormat: "bgra8unorm" | "bgra8unorm-srgb", fallbackName: string): Promise<TridentTexture | undefined> {
        if (!textures || !textureInfo) return undefined;

        const tex = textures[textureInfo.index];
        if (!tex?.source) throw Error("Invalid texture");

        const textureName = fallbackName; // this.fallbackName(tex.name || tex.source.name, fallbackName);
        const cacheKey = `${tex.source.checksum}:${textureFormat}`;

        let cached = this.TextureCache.get(cacheKey);
        if (!cached) {
            cached = TridentTexture.LoadBlob(new Blob([tex.source.bytes], { type: tex.source.mimeType }), textureFormat, { name: textureName, storeSource: true });
            this.TextureCache.set(cacheKey, cached);
        }

        return cached;
    }

    // ---------- Accessor parsing ----------

    private static parseAccessor(accessorDef: Accessor): Float32Array | Uint32Array | Uint16Array | Int16Array | Uint8Array | Int8Array {
        const WEBGL_TYPE_SIZES = { 'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16 };
        const WEBGL_COMPONENT_TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };

        const bufferView = accessorDef.bufferView;
        const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
        const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];

        const elementBytes = TypedArray.BYTES_PER_ELEMENT;
        const itemBytes = elementBytes * itemSize;
        const byteStride = accessorDef.bufferView !== undefined ? accessorDef.bufferView.byteStride : undefined;
        const normalized = accessorDef.normalized === true;
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
                        array[i * itemSize + j] = accessorDef.componentType === 5120
                            ? src.getInt8(b) : src.getUint8(b);
                    } else if (elementBytes === 2) {
                        array[i * itemSize + j] = accessorDef.componentType === 5122
                            ? src.getInt16(b, true) : src.getUint16(b, true);
                    } else {
                        array[i * itemSize + j] = accessorDef.componentType === 5125
                            ? src.getUint32(b, true) : src.getFloat32(b, true);
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

    private static async parsePrimitive(primitive: MeshPrimitive, textures: Texture[] | undefined, names: { rootName: string; nodeName: string; meshName: string; primitiveIndex: number }): Promise<{ geometry: Geometry, material: PBRMaterial }> {
        const geometry = new Geometry();

        if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(this.parseAccessor(primitive.attributes.POSITION) as Float32Array));
        if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(this.parseAccessor(primitive.attributes.NORMAL) as Float32Array));
        if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(this.parseAccessor(primitive.attributes.TEXCOORD_0) as Float32Array));
        if (primitive.attributes.TANGENT) geometry.attributes.set("tangent", new VertexAttribute(this.parseAccessor(primitive.attributes.TANGENT) as Float32Array));
        if (primitive.attributes.JOINTS_0) {
            const rawJoints = this.parseAccessor(primitive.attributes.JOINTS_0);
            const joints32 = (rawJoints instanceof Uint32Array) ? rawJoints : new Uint32Array(rawJoints);
            geometry.attributes.set("joints", new VertexAttribute(joints32));
        }
        if (primitive.attributes.WEIGHTS_0) geometry.attributes.set("weights", new VertexAttribute(this.parseAccessor(primitive.attributes.WEIGHTS_0) as Float32Array));
        if (primitive.indices) {
            let indices = this.parseAccessor(primitive.indices) as Uint32Array | Uint16Array | Uint8Array;
            if (indices instanceof Uint8Array) indices = new Uint16Array(indices);
            geometry.index = new IndexAttribute(indices);
        }


        const mat = primitive.material;
        const geomBaseName = this.fallbackName(names.meshName || names.nodeName, `${names.rootName}_Mesh`);
        const materialBaseName = this.fallbackName(mat?.name, `${geomBaseName}_Prim${names.primitiveIndex}_Mat`);

        let materialParams: any = {};
        if (mat?.occlusionTexture) {
            // TODO: If a separate occlusionTexture exists need to merge it into our ARM map R channel
            // console.log("mat?.occlusionTexture", await this.getTexture(textures, mat.occlusionTexture, "bgra8unorm-srgb"))
        }
        if (mat?.pbrMetallicRoughness) {
            const pbr = mat.pbrMetallicRoughness;
            if (pbr.baseColorFactor) materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);
            if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb", `${materialBaseName}_BaseColor`);
            if (pbr.metallicRoughnessTexture) materialParams.armMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm", `${materialBaseName}_MetallicRoughness`);
            if (pbr.roughnessFactor !== undefined) materialParams.roughness = pbr.roughnessFactor;
            if (pbr.metallicFactor !== undefined) materialParams.metalness = pbr.metallicFactor;
        }
        if (mat?.normalTexture) materialParams.normalMap = await this.getTexture(textures, mat.normalTexture, "bgra8unorm", `${materialBaseName}_Normal`);
        if (mat?.emissiveTexture) materialParams.emissiveMap = await this.getTexture(textures, mat.emissiveTexture, "bgra8unorm-srgb", `${materialBaseName}_Emissive`);
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
        geometry.name = names.primitiveIndex === 0 ? `${geomBaseName}_Geo` : `${geomBaseName}_Prim${names.primitiveIndex}_Geo`;

        const material = new PBRMaterial(materialParams);
        material.assetPath = undefined;
        material.name = materialBaseName;

        return { geometry, material };
    }

    // ---------- Public API ----------

    private static cache: Map<any, GLTF> = new Map();

    /**
     * Load a GLTF/GLB from URL and create live GameObjects in the scene.
     * Returns the root GameObject.
     */
    public static async Load(url: string, scene: Scene, format?: "glb" | "gltf"): Promise<GameObject> {
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
    public static async LoadFromArrayBuffer(arrayBuffer: ArrayBuffer, scene: Scene, name?: string, key?: any): Promise<GameObject> {
        const cacheKey = key ?? arrayBuffer;
        let cached = GLTFLoader.cache.get(cacheKey);
        if (!cached) {
            cached = await new GLTFParser().parseGLB(arrayBuffer);
            GLTFLoader.cache.set(cacheKey, cached);
        }
        return this.Build(name ?? "GameObject", cached, scene);
    }

    // ---------- Build live GameObjects from parsed GLTF ----------

    private static async Build(rootName: string, gltf: GLTF, scene: Scene): Promise<GameObject> {
        if (!gltf.nodes) {
            const empty = new GameObject();
            empty.name = rootName;
            return empty;
        }

        const nodeIndex = new Map<Node, number>();
        gltf.nodes.forEach((n, i) => nodeIndex.set(n, i));

        // Create GameObjects for each node
        const nodes: GameObject[] = [];
        for (let i = 0; i < gltf.nodes.length; i++) {
            const go = new GameObject();
            go.name = gltf.nodes[i].name || `Node_${i}`;
            nodes.push(go);
        }

        // Set up hierarchy BEFORE applying transforms so that
        // setting localPosition/localRotation correctly computes world values
        for (let i = 0; i < gltf.nodes.length; i++) {
            for (const childId of gltf.nodes[i].childrenID) {
                nodes[childId].transform.parent = nodes[i].transform;
            }
        }

        // Now apply local transforms (parent is already set)
        for (let i = 0; i < gltf.nodes.length; i++) {
            const n = gltf.nodes[i];
            nodes[i].transform.localPosition.set(n.translation.x, n.translation.y, n.translation.z);
            nodes[i].transform.localRotation.set(n.rotation.x, n.rotation.y, n.rotation.z, n.rotation.w);
            nodes[i].transform.scale.set(n.scale.x, n.scale.y, n.scale.z);
        }

        // Skins → Bone components
        if (gltf.skins) {
            for (let skinIndex = 0; skinIndex < gltf.skins.length; skinIndex++) {
                const s = gltf.skins[skinIndex];
                const ibm = s.inverseBindMatricesData as Float32Array;
                if (!ibm) continue;

                for (let i = 0; i < s.joints.length; i++) {
                    const jointIdx = nodeIndex.get(s.joints[i])!;
                    const bone = nodes[jointIdx].AddComponent(Components.Bone);
                    bone.index = i;
                    bone.skinId = skinIndex;
                    bone.inverseBindMatrix = new Float32Array(
                        ibm.buffer, ibm.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i, 16
                    ).slice(); // .slice() to own copy
                }
            }
        }

        // Animations → AnimationTrack + Animator
        let animatorComponent: Components.Animator | null = null;
        if (gltf.animations && gltf.animations.length) {
            const compCountForPath = (path: string) =>
                path === 'translation' || path === 'scale' ? 3 :
                    path === 'rotation' ? 4 : 1;

            const clipDefs: { name: string; duration: number }[] = [];
            const nodeTracks: any[][] = gltf.nodes.map(() => []);

            for (let a = 0; a < gltf.animations.length; a++) {
                const anim = gltf.animations[a];
                const perNodeChannels: Map<number, any[]> = new Map();
                let duration = 0;

                for (const ch of anim.channels) {
                    const targetIdx = ch.target.nodeID!;
                    const times = Array.from(ch.sampler.keyFrameIndices as Float32Array);
                    const values = Array.from(ch.sampler.keyFrameRaw as Float32Array);
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
                    perNodeChannels.get(targetIdx)!.push(channel);
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

            // Add AnimationTrack components to nodes with animation data
            const tracksData: { [nodeName: string]: any[] } = {};
            for (let i = 0; i < nodes.length; i++) {
                if (nodeTracks[i].length) {
                    const trackName = nodes[i].name;
                    tracksData[trackName] = nodeTracks[i];

                    const track = nodes[i].AddComponent(Components.AnimationTrack);
                    track.trackName = trackName;
                    track.clips = nodeTracks[i];
                }
            }

            // Animator goes on root (will be set up below once we have the root GO)
            // Store data to attach later
            animatorComponent = { clipDefs, tracksData } as any;
        }

        // Mesh primitives → child GameObjects with Mesh/SkinnedMesh
        for (let i = 0; i < gltf.nodes.length; i++) {
            const node = gltf.nodes[i];
            if (!node.mesh) continue;

            const nodeGO = nodes[i];
            const primitives = node.mesh.primitives ?? [];

            for (let primitiveIndex = 0; primitiveIndex < primitives.length; primitiveIndex++) {
                const primitive = primitives[primitiveIndex];

                const parsed = await this.parsePrimitive(primitive, gltf.textures, { rootName, nodeName: nodeGO.name, meshName: node.mesh.name || nodeGO.name, primitiveIndex });

                const primGO = new GameObject();
                primGO.name = primitives.length === 1 ? nodeGO.name : `${nodeGO.name}_Prim${primitiveIndex}`;

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

        // Build root
        const childIDs = new Set<number>();
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

        // Attach Animator to root
        if (animatorComponent) {
            const data = animatorComponent as any;
            const animator = root.AddComponent(Components.Animator);
            animator.clips = data.clipDefs;
            animator.tracksData = data.tracksData;
        }

        return root;
    }
}
