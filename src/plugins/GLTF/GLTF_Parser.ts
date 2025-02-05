import { GameObject } from "../../GameObject";
import { Geometry, IndexAttribute, VertexAttribute } from "../../Geometry";
import { Object3D } from "../../Object3D";
import { Color } from "../../math/Color";
import { Matrix4 } from "../../math/Matrix4";
import { PBRMaterial, PBRMaterialParams } from "../../renderer/Material";
import {GLTFLoader, MeshPrimitive, Texture, Node, AccessorComponentType} from './GLTFLoader_Minimal'

export class GLTF {
    private static parsePrimitive(primitive: MeshPrimitive, textures?: Texture[]): Object3D {
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
            console.log("primitive.indices.componentType", primitive.indices.componentType)

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
        if (primitive.material && textures) {
            if (primitive.material.pbrMetallicRoughness) {
                materialParams.albedoColor = new Color(...primitive.material.pbrMetallicRoughness.baseColorFactor);

                if (primitive.material.pbrMetallicRoughness.baseColorTexture) materialParams.albedoMap = textures[primitive.material.pbrMetallicRoughness.baseColorTexture.index].texture;
                if (primitive.material.pbrMetallicRoughness.metallicRoughnessTexture) materialParams.metalnessMap = textures[primitive.material.pbrMetallicRoughness.metallicRoughnessTexture.index].texture;

                materialParams.roughness = primitive.material.pbrMetallicRoughness.roughnessFactor;
                materialParams.metalness = primitive.material.pbrMetallicRoughness.metallicFactor;
            }

            if (primitive.material.normalTexture) materialParams.normalMap = textures[primitive.material.normalTexture.index].texture;
            if (primitive.material.emissiveFactor) materialParams.emissiveColor = new Color(...primitive.material.emissiveFactor);
            if (primitive.material.emissiveTexture) materialParams.emissiveMap = textures[primitive.material.emissiveTexture.index].texture;

            materialParams.unlit = false;
            // materialParams.doubleSided = primitive.material.doubleSided;
        }

        return {
            geometry: geometry,
            material: new PBRMaterial(materialParams),
            children: [], // node.children,
        };
    }

    private static parseNode(node: Node, textures?: Texture[]): Object3D {
        let nodeObject3D: Object3D = {
            name: node.name ? node.name : undefined,
            children: [],
            localMatrix: new Matrix4().setFromArray(node.matrix)
        }

        for (const childNode of node.children) {
            nodeObject3D.children.push(this.parseNode(childNode, textures));
        }

        if (node.mesh !== null) {
            if (node.mesh.primitives.length === 1) {
                const object3D = this.parsePrimitive(node.mesh.primitives[0], textures);
                nodeObject3D.geometry = object3D.geometry;
                nodeObject3D.material = object3D.material;
            }
            else {
                for (const primitive of node.mesh.primitives) {
                    const object3D = this.parsePrimitive(primitive, textures);
                    object3D.name = node.mesh.name;
                    nodeObject3D.children.push(object3D);
                }
            }
        }
        return nodeObject3D;
    }

    public static Load(url: string) {
        new GLTFLoader().loadGLTF(url).then(gltf => {
            if (!gltf || !gltf.scenes) throw Error("Invalid gltf");

            console.log(gltf)
            const sceneObject3D: Object3D = {
                children: []
            }

            for (const scene of gltf.scenes) {
                if (!scene) continue;
                sceneObject3D.name = scene.name ? scene.name : "Scene";
                for (const node of scene.nodes) {
                    sceneObject3D.children.push(this.parseNode(node, gltf.textures));
                }
            }

            function AddObject3D(obj: Object3D): GameObject {
                const gameObject = new GameObject(scene);
                gameObject.name = obj.name ? obj.name : "GameObject";

                if (obj.localMatrix) {
                    obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale)
                }

                if (obj.geometry && obj.material) {
                    const mesh = gameObject.AddComponent(Mesh);
                    mesh.SetGeometry(obj.geometry);
                    mesh.AddMaterial(obj.material);
                }

                return gameObject;
            }

            function p(obj: Object3D, d = "", parent?: GameObject) {
                console.log(d, obj.name, obj.geometry ? "G: 1" : "G: 0", parent ? "P: " + parent.name : "P: none");
                const gameObject = AddObject3D(obj);

                if (parent && gameObject) {
                    gameObject.transform.parent = parent.transform;
                }

                for (const child of obj.children) {
                    p(child, d + "\t", gameObject ? gameObject : undefined);
                }

                return gameObject;
            }
            p(sceneObject3D)
        })
    }
}