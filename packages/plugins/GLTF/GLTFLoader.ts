import {
    Geometry,
    Object3D,
    Mathf,
    PBRMaterial,
    PBRMaterialParams,
    Texture as TridentTexture,
    IndexAttribute, VertexAttribute
} from "@trident/core";

import {GLTFParser, MeshPrimitive, Texture, Node, AccessorComponentType, GLTF, TextureInfo} from './GLTFParser'

export class GLTFLoader {
    private static TextureCache: Map<Texture, Promise<TridentTexture>> = new Map();

    private static async getTexture(textures: Texture[] | undefined, textureInfo: TextureInfo | null, textureFormat: "bgra8unorm" | "bgra8unorm-srgb"): Promise<TridentTexture | undefined> {
        if (!textures || !textureInfo) return undefined;

        let cachedTexture = this.TextureCache.get(textures[textureInfo.index]);
        
        if (cachedTexture === undefined) {
            const source = textures[textureInfo.index].source;
            if (source === null) throw Error("Invalid texture");
            cachedTexture = TridentTexture.LoadImageSource(source, textureFormat);
            cachedTexture.then(texture => {
                texture.GenerateMips();
            })
            this.TextureCache.set(textures[textureInfo.index], cachedTexture);
        }


        return cachedTexture;
    }

    private static async parsePrimitive(primitive: MeshPrimitive, textures?: Texture[]): Promise<Object3D> {
        const geometry = new Geometry();

        function getTypedArray(buffer, componentType) {
            switch (componentType) {
                case AccessorComponentType.GL_UNSIGNED_BYTE:
                    return new Uint8Array(buffer);
                case AccessorComponentType.GL_UNSIGNED_SHORT:
                    return new Uint16Array(buffer);
                case AccessorComponentType.GL_UNSIGNED_INT:
                    return new Uint32Array(buffer);
                default:
                    throw new Error('Unsupported component type for indices');
            }
        }

        function byteSize(componentType) {
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
                    return 0; // This should be handled as an error
            }
        }

        if (primitive.attributes.POSITION) geometry.attributes.set("position", new VertexAttribute(new Float32Array(primitive.attributes.POSITION.bufferView.data)));
        if (primitive.attributes.NORMAL) geometry.attributes.set("normal", new VertexAttribute(new Float32Array(primitive.attributes.NORMAL.bufferView.data)));
        if (primitive.attributes.TEXCOORD_0) geometry.attributes.set("uv", new VertexAttribute(new Float32Array(primitive.attributes.TEXCOORD_0.bufferView.data)));
        if (primitive.indices) {

            // if (primitive.indices.componentType === AccessorComponentType.GL_UNSIGNED_SHORT) {
            //     geometry.index = new IndexAttribute(new Uint32Array(new Uint16Array(primitive.indices.bufferView.data)));
            // }
            // else if (primitive.indices.componentType === AccessorComponentType.GL_UNSIGNED_INT) {
            //     geometry.index = new IndexAttribute(new Uint32Array(new Uint16Array(primitive.indices.bufferView.data)));
            // }
            // else {
            //     throw Error("cant parse index buffer")
            // }

            const indicesAccessor = primitive.indices;
            const indicesBufferView = indicesAccessor.bufferView;
            const indicesComponentType = indicesAccessor.componentType;
        
            // Create a typed array based on the component type of the indices
            const indexArray = getTypedArray(indicesBufferView.data.slice(indicesAccessor.byteOffset, indicesAccessor.byteOffset + indicesAccessor.count * byteSize(indicesComponentType)), indicesComponentType);
            geometry.index = new IndexAttribute(new Uint32Array(indexArray));
        }


        let materialParams: Partial<PBRMaterialParams> = {};
        if (primitive.material) {
            if (primitive.material.pbrMetallicRoughness) {
                const pbr = primitive.material.pbrMetallicRoughness;
                materialParams.albedoColor = new Mathf.Color(...pbr.baseColorFactor);

                if (pbr.baseColorTexture) materialParams.albedoMap = await this.getTexture(textures, pbr.baseColorTexture, "bgra8unorm-srgb");
                if (pbr.metallicRoughnessTexture) materialParams.metalnessMap = await this.getTexture(textures, pbr.metallicRoughnessTexture, "bgra8unorm");

                materialParams.roughness = pbr.roughnessFactor;
                materialParams.metalness = pbr.metallicFactor;
            }

            if (primitive.material.normalTexture) materialParams.normalMap = await this.getTexture(textures, primitive.material.normalTexture, "bgra8unorm");
            if (primitive.material.emissiveTexture) materialParams.emissiveMap = await this.getTexture(textures, primitive.material.emissiveTexture, "bgra8unorm-srgb");

            if (primitive.material.emissiveFactor) {
                materialParams.emissiveColor = new Mathf.Color(...primitive.material.emissiveFactor);
                if (primitive.material.extensions && primitive.material.extensions["KHR_materials_emissive_strength"]) {
                    materialParams.emissiveColor.mul(primitive.material.extensions["KHR_materials_emissive_strength"]["emissiveStrength"]);
                }
            }

            materialParams.unlit = false;
            materialParams.doubleSided = primitive.material.doubleSided;
            materialParams.alphaCutoff = primitive.material.alphaCutoff;
        }

        // Needs tangents?
        if (geometry.attributes.has("position") && geometry.attributes.has("normal") && geometry.attributes.has("uv") && materialParams.normalMap) geometry.ComputeTangents();

        return {
            name: "",
            geometry: geometry,
            material: new PBRMaterial(materialParams),
            children: [], // node.children,
            localMatrix: new Mathf.Matrix4()
        };
    }

    private static async parseNode(gltf: GLTF, node: Node, textures?: Texture[]): Promise<Object3D> {
        let nodeObject3D: Object3D = {
            name: node.name ? node.name : undefined,
            children: [],
            localMatrix: new Mathf.Matrix4().setFromArray(node.matrix)
        }

        if (node.extensions) {
            if (node.extensions.EXT_mesh_gpu_instancing) {
                if (!gltf.accessors) throw Error("No accessors");
                const attributes = node.extensions.EXT_mesh_gpu_instancing.attributes;
                const translation = new Float32Array(gltf.accessors[attributes.TRANSLATION].bufferView.data);
                const rotation = new Float32Array(gltf.accessors[attributes.ROTATION].bufferView.data);
                const scale = new Float32Array(gltf.accessors[attributes.SCALE].bufferView.data);

                const count = translation.length / 3;
                let instanceMatrices: Mathf.Matrix4[] = [];
                let p = new Mathf.Vector3();
                let r = new Mathf.Quaternion();
                let s = new Mathf.Vector3();
                let m = new Mathf.Matrix4();
                let psc = 0;
                let rc = 0;
                for (let i = 0; i < count; i++) {
                    p.set(translation[psc + 0], translation[psc + 1], translation[psc + 2]);
                    r.set(rotation[rc + 0], rotation[rc + 1], rotation[rc + 2], rotation[rc + 3]);
                    s.set(scale[psc + 0], scale[psc + 1], scale[psc + 2]);
                    m.compose(p, r, s);

                    instanceMatrices.push(m.clone());

                    psc += 3;
                    rc += 4;
                }
                nodeObject3D.extensions = [{instanceCount: count, instanceMatrices: instanceMatrices}];

                // console.log(translation, rotation, scale)
                // throw Error("Got one")
            }
        }

        for (const childNode of node.children) {
            nodeObject3D.children.push(await this.parseNode(gltf, childNode, textures));
        }

        if (node.mesh !== null) {
            if (node.mesh.primitives.length === 1) {
                const object3D = await this.parsePrimitive(node.mesh.primitives[0], textures);
                nodeObject3D.geometry = object3D.geometry;
                nodeObject3D.material = object3D.material;
            }
            else {
                for (const primitive of node.mesh.primitives) {
                    const object3D = await this.parsePrimitive(primitive, textures);
                    object3D.name = node.mesh.name || "Object3D";
                    nodeObject3D.children.push(object3D);
                }
            }
        }
        return nodeObject3D;
    }

    public static async Load(url: string): Promise<Object3D> {
        return new GLTFParser().load(url).then(async gltf => {
            if (!gltf || !gltf.scenes) throw Error("Invalid gltf");
            
            console.log("gltf", gltf)
            const sceneObject3D: Object3D = {
                name: "Scene",
                localMatrix: new Mathf.Matrix4(),
                children: []
            }

            for (const scene of gltf.scenes) {
                if (!scene) continue;
                sceneObject3D.name = scene.name ? scene.name : "Scene";
                for (const node of scene.nodes) {
                    sceneObject3D.children.push(await this.parseNode(gltf, node, gltf.textures));
                }
            }

            return sceneObject3D;
        });
    }
}