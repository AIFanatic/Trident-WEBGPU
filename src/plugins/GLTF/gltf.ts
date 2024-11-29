import * as gltf from './types/gltf';
import { createMat4FromArray, applyRotationFromQuat, translate, scale, identity } from './mat';
import { Channel, Node, Mesh, Model, KeyFrame, Skin, Material, MeshBuffer, Animation, Buffer, BufferType } from './types/model';

import { Mesh as TridentMesh } from '../../components/Mesh';
import { GameObject } from '../../GameObject';
import { Geometry, IndexAttribute, VertexAttribute } from '../../Geometry';
import { Scene } from '../../Scene';
import { PBRMaterial, PBRMaterialParams } from '../../renderer/Material';
import { Texture } from '../../renderer/Texture';
import { Color } from '../../math/Color';
import { Matrix4 } from '../../math/Matrix4';
import { Object3D } from '../../Object3D';

const accessorSizes = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
};

const resolveEmbeddedBuffer = (uri: string): string => {
    const content = uri.split(',')[1]; 
    const binaryData = atob(content); 
    const arrayBuffer = new ArrayBuffer(binaryData.length);
    const uint8Array = new Uint8Array(arrayBuffer);

    for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], { type: 'application/octet-stream' }); // Crea un Blob
    return URL.createObjectURL(blob); 
}

const EMBEDDED_DATA_REGEXP = /(.*)data:(.*?)(;base64)?,(.*)$/;

const getBuffer = async (path: string, buffer: string) => {
    const dir = path.split('/').slice(0, -1).join('/');
    const finalPath = EMBEDDED_DATA_REGEXP.test(buffer) ? resolveEmbeddedBuffer(buffer) : `${dir}/${buffer}`;
    const response = await fetch(finalPath);
    return await response.arrayBuffer();
};

const getTexture = async (uri: string) => {
    return new Promise<HTMLImageElement>(resolve => {
        const img = new Image();
        img.onload = () => {
            resolve(img!);
        }
        img.src = EMBEDDED_DATA_REGEXP.test(uri) ? resolveEmbeddedBuffer(uri) : uri;
        img.crossOrigin = 'undefined';
    });
};

const readBufferFromFile = (gltf: gltf.GlTf, buffers: ArrayBuffer[], accessor: gltf.Accessor) => {
    const bufferView = gltf.bufferViews![accessor.bufferView as number];
    const size = accessorSizes[accessor.type];
    const componentType = accessor.componentType as BufferType;
    const type = accessor.type;

    let data;
    if (componentType === BufferType.Float) data = new Float32Array(buffers[bufferView.buffer], (accessor.byteOffset || 0) + (bufferView.byteOffset || 0), accessor.count * size);
    else if (componentType === BufferType.Short) data = new Int16Array(buffers[bufferView.buffer], (accessor.byteOffset || 0) + (bufferView.byteOffset || 0), accessor.count * size);
    else if (componentType === BufferType.Int) data = new Int32Array(buffers[bufferView.buffer], (accessor.byteOffset || 0) + (bufferView.byteOffset || 0), accessor.count * size);
    else throw Error(`Unknown component type ${componentType}`);

    return {
        size,
        data,
        type,
        componentType,
    } as Buffer;
};

const getAccessor = (gltf: gltf.GlTf, primitive: gltf.MeshPrimitive, attributeName: string) => {
    const attribute = primitive.attributes[attributeName];
    return gltf.accessors![attribute];
};

const getBufferFromName = (gltf: gltf.GlTf, buffers: ArrayBuffer[], primitive: gltf.MeshPrimitive, name: string) => {
    if (primitive.attributes[name] === undefined) {
        return null;
    }

    const accessor = getAccessor(gltf, primitive, name);
    const bufferData = readBufferFromFile(gltf, buffers, accessor);

    // const buffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // gl.bufferData(gl.ARRAY_BUFFER, bufferData.data, gl.STATIC_DRAW);

    return {
        buffer: bufferData,
        size: bufferData.size,
        type: bufferData.componentType,
    } as MeshBuffer;
};

const loadNodes = (index: number, node: gltf.Node): Node => {
    let transform = identity();

    if (node.translation !== undefined) transform = translate(transform, node.translation);
    if (node.rotation !== undefined) transform = applyRotationFromQuat(transform, node.rotation);
    if (node.scale !== undefined) transform = scale(transform, node.scale);
    if (node.matrix !== undefined) transform = createMat4FromArray(node.matrix);

    return {
        id: index,
        name: node.name,
        children: node.children || [],
        localBindTransform: transform,
        animatedTransform: identity(),
        skin: node.skin,
        mesh: node.mesh
    } as Node;
};

const loadAnimation = (gltf: gltf.GlTf, animation: gltf.Animation, buffers: ArrayBuffer[]) => {
    const channels = animation.channels.map(c => {
        const sampler = animation.samplers[c.sampler];
        const time = readBufferFromFile(gltf, buffers, gltf.accessors![sampler.input]);
        const buffer = readBufferFromFile(gltf, buffers, gltf.accessors![sampler.output]);

        return {
            node: c.target.node,
            type: c.target.path,
            time,
            buffer,
            interpolation: sampler.interpolation ? sampler.interpolation : 'LINEAR',
        };
    });

    const c: Channel = {};
    channels.forEach((channel) => {
        if (c[channel.node!] === undefined) {
            c[channel.node!] = {
                translation: [],
                rotation: [],
                scale: [],
            };
        }

        for (let i = 0; i < channel.time.data.length; i ++) {
            const size = channel.interpolation === 'CUBICSPLINE' ? channel.buffer.size * 3 : channel.buffer.size;
            const offset = channel.interpolation === 'CUBICSPLINE' ? channel.buffer.size : 0;

            const transform = channel.type === 'rotation'
                ? [
                    channel.buffer.data[i * size + offset],
                    channel.buffer.data[i * size + offset + 1],
                    channel.buffer.data[i * size + offset + 2],
                    channel.buffer.data[i * size + offset + 3]
                ]
                : [
                    channel.buffer.data[i * size + offset],
                    channel.buffer.data[i * size + offset + 1],
                    channel.buffer.data[i * size + offset + 2]
                ];

            c[channel.node!][channel.type].push({
                time: channel.time.data[i],
                transform: transform,
                type: channel.type,
            } as KeyFrame)
        }
    });

    return c;
};

const loadMesh = (gltf: gltf.GlTf, mesh: gltf.Mesh, buffers: ArrayBuffer[]) => {
    let indices: Buffer | null = null;
    let elementCount = 0;

    let meshes: Mesh[] = [];
    for (const primitive of mesh.primitives) {
        if (primitive.indices !== undefined) {
            const indexAccessor = gltf.accessors![primitive.indices];
            const indexBuffer = readBufferFromFile(gltf, buffers, indexAccessor);
    
            indices = indexBuffer;
            elementCount = indexBuffer.data.length;
        } else {
            const accessor = getAccessor(gltf, primitive, 'POSITION');
            elementCount = accessor.count;
        }

        meshes.push({
            indices,
            elementCount,
            positions: getBufferFromName(gltf, buffers, primitive, 'POSITION'),
            normals: getBufferFromName(gltf, buffers, primitive, 'NORMAL'),
            tangents: getBufferFromName(gltf, buffers, primitive, 'TANGENT'),
            texCoord: getBufferFromName(gltf, buffers, primitive, 'TEXCOORD_0'),
            joints: getBufferFromName(gltf, buffers, primitive, 'JOINTS_0'),
            weights: getBufferFromName(gltf, buffers, primitive, 'WEIGHTS_0'),
            material: primitive.material as number,
        })
    }


    return meshes;
};

const loadMaterial = async (material: gltf.Material, path: string, images?: gltf.Image[]): Promise<Material> => {
    const dir = path.split('/').slice(0, -1).join('/');

    let baseColorTexture: HTMLImageElement | null = null;
    let metallicRoughnessTexture: HTMLImageElement | null = null;
    let emissiveTexture: HTMLImageElement | null = null;
    let normalTexture: HTMLImageElement | null = null;
    let occlusionTexture: HTMLImageElement | null = null;

    let baseColorFactor = [1.0, 1.0, 1.0, 1.0];
    let roughnessFactor = 0.5;
    let metallicFactor = 0.0;
    let emissiveFactor = [0.0, 0.0, 0.0];

    const pbr = material.pbrMetallicRoughness;
    if (pbr) {
        if (pbr.baseColorTexture) {
            if (images !== undefined && images.length > pbr.baseColorTexture.index) {
                const uri = images![pbr.baseColorTexture.index].uri!;
                baseColorTexture = await getTexture(`${dir}/${uri}`);
            }
        }
        if (pbr.baseColorFactor) {
            baseColorFactor = pbr.baseColorFactor;
        }

        if (pbr.metallicRoughnessTexture) {
            const uri = images![pbr.metallicRoughnessTexture.index].uri!;
            metallicRoughnessTexture = await getTexture(`${dir}/${uri}`);
        }

        metallicFactor = pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1.0;
        roughnessFactor = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1.0;
    }

    if (material.emissiveTexture) {
        const uri = images![material.emissiveTexture.index].uri!;
        emissiveTexture = await getTexture(`${dir}/${uri}`);
    }

    if (material.normalTexture) {
        const uri = images![material.normalTexture.index].uri!;
        normalTexture = await getTexture(`${dir}/${uri}`);
    }

    if (material.occlusionTexture) {
        const uri = images![material.occlusionTexture.index].uri!;
        occlusionTexture = await getTexture(`${dir}/${uri}`);
    }

    if (material.emissiveFactor) {
        emissiveFactor = material.emissiveFactor;
    }


    return {
        baseColorTexture,
        baseColorFactor,
        metallicRoughnessTexture,
        metallicFactor,
        roughnessFactor,
        emissiveTexture,
        emissiveFactor,
        normalTexture,
        occlusionTexture,
    } as Material;
};

/**
 * Loads a GLTF model and its assets
 * @param uri URI to model
 */
const loadModel = async (uri: string) => {
    const response = await fetch(uri);
    const gltf = await response.json() as gltf.GlTf;

    if (gltf.accessors === undefined || gltf.accessors.length === 0) {
        throw new Error('GLTF File is missing accessors')
    }

    const buffers = await Promise.all(
        gltf.buffers!.map(async (b) => await getBuffer(uri, b.uri!)
    ));

    const scene = gltf.scenes![gltf.scene || 0];
    const meshes = gltf.meshes!.map(m => loadMesh(gltf, m, buffers)).flat();
    const materials = gltf.materials ? await Promise.all(gltf.materials.map(async (m) => await loadMaterial(m, uri, gltf.images))) : [];

    const rootNode = scene.nodes![0];
    const nodes = gltf.nodes!.map((n, i) => loadNodes(i, n));

    const animations = {} as Animation;
    gltf.animations?.forEach(anim => animations[anim.name as string] = loadAnimation(gltf, anim, buffers));

    const skins = gltf.skins ? gltf.skins.map(x => {
        const bindTransforms = readBufferFromFile(gltf, buffers, gltf.accessors![x.inverseBindMatrices!]);
        const inverseBindTransforms = x.joints.map((_, i) => createMat4FromArray(bindTransforms.data.slice(i * 16, i * 16 + 16)));

        return {
            joints: x.joints,
            inverseBindTransforms,
        };
    }) : [] as Skin[];

    const name = uri.split('/').slice(-1)[0];
    return {
        name,
        meshes,
        nodes,
        rootNode,
        animations,
        skins,
        materials,
    } as Model;
};

export class GLTFLoader {
    // GLB
    // fetch("./assets/GLTFScenes/SketchBook/world.glb").then(v => v.arrayBuffer()).then(arrayBuffer => {
    //     console.log(arrayBuffer)
    //     const dataView = new DataView(arrayBuffer);
    //     const header = new Uint8Array(dataView.buffer.slice(0, 4));
    //     const headerStr = String.fromCharCode(...header);
    //     if (headerStr !== "glTF") throw Error("Invalid glb");

    //     const version = dataView.getUint32(4, true);
    //     const length = dataView.getUint32(8, true);
    //     console.log(version, length)

    //     // Read the JSON chunk
    //     const jsonChunkLength = dataView.getUint32(12, true);
    //     const jsonChunkType = String.fromCharCode(dataView.getUint8(16), dataView.getUint8(17), dataView.getUint8(18), dataView.getUint8(19));
    //     if (jsonChunkType !== 'JSON') {
    //         throw new Error('Expected JSON chunk');
    //     }
    //     const jsonContent = JSON.parse(new TextDecoder().decode(new Uint8Array(dataView.buffer, dataView.byteOffset + 20, jsonChunkLength)));
    //     console.log('JSON Content:', jsonContent);
        
    //     // Read the binary chunk if exists
    //     const binaryChunkOffset = 20 + jsonChunkLength;
    //     if (binaryChunkOffset < length) {
    //         const binaryChunkLength = dataView.getUint32(binaryChunkOffset, true);
    //         const binaryChunkType = String.fromCharCode(dataView.getUint8(binaryChunkOffset + 4), dataView.getUint8(binaryChunkOffset + 5), dataView.getUint8(binaryChunkOffset + 6), dataView.getUint8(binaryChunkOffset + 7));
    //         if (binaryChunkType !== 'BIN\0') {
    //             throw new Error('Expected BIN chunk');
    //         }
    //         console.log(`Binary Chunk Length: ${binaryChunkLength}`);
    //         // Handle binary data as needed
    //     }
    // })

    public static async load(url: string): Promise<Object3D[]> {
        const gltfModel = await loadModel(url);
        console.log(gltfModel)

        const groupObject3D: Object3D[] = [];

        for (const node of gltfModel.nodes) {
            if (node.mesh === undefined) continue;

            const meshId = node.mesh;
            const gltfMesh = gltfModel.meshes[meshId];

            if (gltfMesh === undefined) continue;

            const geometry = new Geometry();
            geometry.attributes.set("position", new VertexAttribute(gltfMesh.positions.buffer.data as Float32Array));
            if (gltfMesh.normals) geometry.attributes.set("normal", new VertexAttribute(gltfMesh.normals.buffer.data as Float32Array));
            if (gltfMesh.texCoord) geometry.attributes.set("uv", new VertexAttribute(gltfMesh.texCoord.buffer.data as Float32Array));
            if (gltfMesh.indices) {
                // geometry.index = new IndexAttribute(new Uint32Array(gltfMesh.indices.data));

                const uint32Array = new Uint32Array(gltfMesh.indices.data.length);
                for (let i = 0; i < gltfMesh.indices.data.length; i++) {
                    uint32Array[i] = gltfMesh.indices.data[i] & 0xFFFF; // Convert signed to unsigned
                }

                geometry.index = new IndexAttribute(uint32Array);

            }

            const materialId = gltfMesh.material;
            const material = gltfModel.materials[materialId];
            const params: PBRMaterialParams = {albedoColor: new Color(1,1,1,1), emissiveColor: new Color(0,0,0,0), roughness: 0, metalness: 0, unlit: false};
            if (material) {
                params.albedoColor = new Color(material.baseColorFactor[0], material.baseColorFactor[1], material.baseColorFactor[2], material.baseColorFactor[3]);
                params.emissiveColor = new Color(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2], 0);
                params.roughness = material.roughnessFactor;
                params.metalness = material.metallicFactor;

                if (material.baseColorTexture) params.albedoMap = await Texture.LoadImageSource(material.baseColorTexture);
                if (material.normalTexture) params.normalMap = await Texture.LoadImageSource(material.normalTexture);
                if (material.metallicRoughnessTexture) params.metalnessMap = await Texture.LoadImageSource(material.metallicRoughnessTexture);
                if (material.emissiveTexture) params.emissiveMap = await Texture.LoadImageSource(material.emissiveTexture);
            }

            const mat = new PBRMaterial(params);

            console.log(params)
            groupObject3D.push({
                geometry: geometry,
                material: mat,
                children: node.children,
                localMatrix: new Matrix4().setFromArray(node.localBindTransform)
            });
        }
        return groupObject3D;
    }
}