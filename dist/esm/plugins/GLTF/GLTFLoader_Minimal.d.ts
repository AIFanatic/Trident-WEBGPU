import { Quaternion, Vector3, Matrix4 } from "./Math";
type GLTFID = number;
declare enum MeshPrimitiveType {
    POINTS = 0,
    LINES = 1,
    LINE_LOOP = 2,
    LINE_STRIP = 3,
    TRIANGLES = 4,
    TRIANGLE_STRIP = 5,
    TRIANGLE_FAN = 6
}
export declare enum AccessorComponentType {
    GL_BYTE = 5120,
    GL_UNSIGNED_BYTE = 5121,
    GL_SHORT = 5122,
    GL_UNSIGNED_SHORT = 5123,
    GL_INT = 5124,
    GL_UNSIGNED_INT = 5125,
    GL_FLOAT = 5126
}
declare enum AccessorSparseIndicesComponentType {
    GL_UNSIGNED_BYTE = 5121,
    GL_UNSIGNED_SHORT = 5123,
    GL_UNSIGNED_INT = 5125
}
declare enum BufferViewTarget {
    ARRAY_BUFFER = 34962,
    ELEMENT_ARRAY_BUFFER = 34963
}
declare enum SamplerMagnificationFilter {
    NEAREST = 9728,
    LINEAR = 9729
}
declare enum SamplerMinificationFilter {
    NEAREST = 9728,
    LINEAR = 9729,
    NEAREST_MIPMAP_NEAREST = 9984,
    LINEAR_MIPMAP_NEAREST = 9985,
    NEAREST_MIPMAP_LINEAR = 9986,
    LINEAR_MIPMAP_LINEAR = 9987
}
declare enum SamplerWrappingMode {
    CLAMP_TO_EDGE = 33071,
    MIRRORED_REPEAT = 33648,
    REPEAT = 10497
}
interface AssetBase {
    copyright?: string;
    generator?: string;
    version: string;
    minVersion?: string;
    extensions?: any;
    extras?: any;
}
interface SceneBase {
    nodes: GLTFID[];
    name?: string;
    extensions?: any;
    extras?: any;
}
interface NodeBase {
    camera?: GLTFID;
    children?: GLTFID[];
    skin?: GLTFID;
    matrix: Matrix4;
    mesh?: GLTFID;
    translation?: number[];
    rotation?: number[];
    scale?: number[];
    weights?: number[];
    name?: string;
    extensions?: any;
    extras?: any;
}
interface MeshBase {
    primitives: MeshPrimitiveBase[];
    weights?: number[];
    name?: string;
    extensions?: any;
    extras?: any;
}
interface MeshPrimitiveBase {
    attributes: {
        POSITION?: GLTFID;
        NORMAL?: GLTFID;
        TEXCOORD_0?: GLTFID;
    };
    indices?: GLTFID;
    material?: GLTFID;
    mode?: MeshPrimitiveType;
    targets?: {
        POSITION?: GLTFID;
        NORMAL?: GLTFID;
        TANGENT?: GLTFID;
    }[];
    extensions?: any;
    extras?: any;
}
interface AccessorBase {
    bufferView?: GLTFID;
    byteOffset?: number;
    componentType: AccessorComponentType;
    normalized?: boolean;
    count: number;
    type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";
    max?: number[];
    min?: number[];
    sparse?: AccessorSparseBase;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface AccessorSparseBase {
    count: number;
    indices: AccessorSparseIndicesBase;
    values: AccessorSparseValuesBase;
    extensions?: any;
    extras?: any;
}
interface AccessorSparseIndicesBase {
    bufferView: GLTFID;
    byteOffset?: number;
    componentType: AccessorSparseIndicesComponentType;
    extensions?: any;
    extras?: any;
}
interface AccessorSparseValuesBase {
    bufferView: GLTFID;
    byteOffset?: number;
    extensions?: any;
    extras?: any;
}
interface BufferViewBase {
    buffer: GLTFID;
    byteOffset?: number;
    byteLength: number;
    byteStride?: number;
    target?: BufferViewTarget;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface BufferBase {
    uri?: string;
    byteLength: number;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface AnimationBase {
    channels: AnimationChannelBase[];
    samplers: AnimationSamplerBase[];
    name?: string;
    extensions?: any;
    extras?: any;
}
interface AnimationChannelBase {
    sampler: GLTFID;
    target: AnimationChannelTargetBase;
    extensions?: any;
    extras?: any;
}
interface AnimationChannelTargetBase {
    node?: GLTFID;
    path: "translation" | "rotation" | "scale" | "weights";
    extensions?: any;
    extras?: any;
}
interface AnimationSamplerBase {
    input: GLTFID;
    interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE";
    output: GLTFID;
    extensions?: any;
    extras?: any;
}
interface CameraBase {
    orthographic?: CameraOrthographicBase;
    perspective?: CameraPerspectiveBase;
    type: "perspective" | "orthographic";
    name?: string;
    extensions?: any;
    extras?: any;
}
interface CameraOrthographicBase {
    xmag: number;
    ymag: number;
    zfar: number;
    znear: number;
    extensions?: any;
    extras?: any;
}
interface CameraPerspectiveBase {
    aspectRatio?: number;
    yfov: number;
    zfar?: number;
    znear: number;
    extensions?: any;
    extras?: any;
}
interface TextureBase {
    sampler?: GLTFID;
    source?: GLTFID;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface ImageBase {
    uri?: string;
    mimeType?: "image/jpeg" | "image/png";
    bufferView?: GLTFID;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface SamplerBase {
    magFilter?: SamplerMagnificationFilter;
    minFilter?: SamplerMinificationFilter;
    wrapS?: SamplerWrappingMode;
    wrapT?: SamplerWrappingMode;
    name?: string;
    extensions?: any;
    extras?: any;
}
interface MaterialBase {
    name?: string;
    extensions?: any;
    extras?: any;
    pbrMetallicRoughness?: MaterialPbrMetallicRoughnessBase;
    normalTexture?: MaterialNormalTextureInfoBase;
    occlusionTexture?: MaterialOcclusionTextureInfoBase;
    emissiveTexture?: TextureInfoBase;
    emissiveFactor?: number[];
    alphaMode?: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff?: number;
    doubleSided?: boolean;
}
interface MaterialPbrMetallicRoughnessBase {
    baseColorFactor?: number[];
    baseColorTexture?: TextureInfoBase;
    metallicFactor?: number;
    roughnessFactor?: number;
    metallicRoughnessTexture?: TextureInfoBase;
    extensions?: any;
    extras?: any;
}
interface MaterialNormalTextureInfoBase {
    index?: number;
    texCoord?: number;
    scale?: number;
    extensions?: any;
    extras?: any;
}
interface MaterialOcclusionTextureInfoBase {
    index?: number;
    texCoord?: number;
    strength?: number;
    extensions?: any;
    extras?: any;
}
interface TextureInfoBase {
    index: GLTFID;
    texCoord?: number;
    extensions?: any;
    extras?: any;
}
interface SkinBase {
    inverseBindMatrices?: GLTFID;
    skeleton?: GLTFID;
    joints: GLTFID[];
    name?: string;
    extensions?: any;
    extras?: any;
}
interface GLTFBase {
    asset: AssetBase;
    scenes?: SceneBase[];
    scene?: GLTFID;
    nodes?: NodeBase[];
    meshes?: MeshBase[];
    accessors?: AccessorBase[];
    bufferViews?: BufferViewBase[];
    buffers?: BufferBase[];
    animations?: AnimationBase[];
    cameras?: CameraBase[];
    textures?: TextureBase[];
    images?: ImageBase[];
    samplers?: SamplerBase[];
    materials?: MaterialBase[];
    skins?: SkinBase[];
    extensions?: any;
    extensionsRequired?: string[];
    extensionsUsed?: string[];
    extras?: any;
}
export declare class Scene {
    nodes: Node[];
    name: string | null;
    extensions: any;
    extras: any;
    constructor(sceneBase: SceneBase, gltf: GLTF);
}
export declare class Accessor {
    bufferView: BufferView;
    byteOffset: number;
    componentType: AccessorComponentType;
    normalized: boolean;
    count: number;
    type: "SCALAR" | "VEC2" | "VEC3" | "VEC4" | "MAT2" | "MAT3" | "MAT4";
    max: number[] | undefined;
    min: number[] | undefined;
    sparse: AccessorSparseBase | null;
    name: string | null;
    extensions: any;
    extras: any;
    constructor(accessorBase: AccessorBase, bufferView: BufferView);
}
declare class BufferView {
    byteOffset: number;
    byteLength: number;
    byteStride: number;
    target: BufferViewTarget | 0;
    name: string | null;
    extensions: any;
    extras: any;
    data: ArrayBuffer;
    constructor(bufferViewBase: BufferViewBase, bufferData: ArrayBuffer);
}
declare class Camera {
    orthographic: CameraOrthographicBase | null;
    perspective: CameraPerspectiveBase | null;
    type: "perspective" | "orthographic";
    name: string | null;
    extensions: any;
    extras: any;
    constructor(cameraBase: CameraBase);
}
export declare class Node {
    camera: GLTFID | null;
    children: Node[];
    skin: Skin | SkinLink | null;
    translation: Vector3;
    rotation: Quaternion;
    scale: Vector3;
    matrix: Matrix4;
    mesh: Mesh | null;
    weights: number[] | null;
    name: string | null;
    extensions: any;
    extras: any;
    nodeID: GLTFID;
    childrenID: GLTFID[];
    parent: Node | null;
    skinLink: SkinLink | null;
    modelMatrix: Matrix4;
    worldMatrix: Matrix4;
    constructor(nodeBase: NodeBase, nodeID: GLTFID, currentLoader: GLTFLoader);
    traverse(traverseFunction: (node: Node, parent: Node | null) => void, parent?: Node): void;
    traversePostOrder(traverseFunction: (node: Node, parent: Node | null) => void, parent?: Node): void;
    traverseTwoFunction(traverseFunctionPreOrder: (node: Node, parent: Node | null) => void, traverseFunctionPostOrder: (node: Node, parent: Node | null) => void, parent?: Node): void;
}
declare class Mesh {
    primitives: MeshPrimitive[];
    weights: number[] | null;
    name: string | null;
    extensions: any;
    extras: any;
    meshID: number;
    constructor(meshBase: MeshBase, meshID: number, currentLoader: GLTFLoader);
}
export declare class MeshPrimitive {
    attributesID: {
        POSITION?: GLTFID;
        NORMAL?: GLTFID;
        TEXCOORD_0?: GLTFID;
    };
    attributes: {
        POSITION?: Accessor | null;
        NORMAL?: Accessor | null;
        TEXCOORD_0?: Accessor | null;
    };
    indicesID: GLTFID | null;
    indices: Accessor | null;
    material: Material | null;
    mode: MeshPrimitiveType;
    targetsID?: {
        POSITION?: GLTFID;
        NORMAL?: GLTFID;
        TANGENT?: GLTFID;
    }[];
    targets?: {
        POSITION?: Accessor;
        NORMAL?: Accessor;
        TANGENT?: Accessor;
    }[];
    extensions: any;
    extras: any;
    drawIndices: Accessor | null;
    vertexArray: ArrayBuffer | null;
    vertexBuffer: ArrayBuffer | null;
    shader: WebGLShader | null;
    constructor(primitiveBase: MeshPrimitiveBase, gltf: GLTF, currentLoader: GLTFLoader);
}
export declare class Texture {
    sampler: Sampler | null;
    source: ImageBitmap | ImageData | HTMLImageElement | null;
    name: string | null;
    extensions: any;
    extras: any;
    constructor(textureBase: TextureBase, currentLoader: GLTFLoader);
}
declare class Sampler {
    magFilter: SamplerMagnificationFilter | null;
    minFilter: SamplerMinificationFilter | null;
    wrapS: SamplerWrappingMode;
    wrapT: SamplerWrappingMode;
    name: string | null;
    extensions: any;
    extras: any;
    sampler: WebGLSampler | null;
    constructor(samplerBase: SamplerBase);
}
export declare class TextureInfo {
    index: GLTFID;
    texCoord: number;
    extensions: any;
    extras: any;
    constructor(textureInfoBase: TextureInfoBase);
}
declare class Material {
    name: string | null;
    extensions: any;
    extras: any;
    pbrMetallicRoughness: MaterialPbrMetallicRoughness;
    normalTexture: MaterialNormalTextureInfo | null;
    occlusionTexture: MaterialOcclusionTextureInfo | null;
    emissiveTexture: TextureInfo | null;
    emissiveFactor: number[];
    alphaMode: "OPAQUE" | "MASK" | "BLEND";
    alphaCutoff: number;
    doubleSided: boolean;
    constructor(materialBase: MaterialBase);
}
declare class MaterialPbrMetallicRoughness {
    baseColorFactor: number[];
    baseColorTexture: TextureInfo | null;
    metallicFactor: number;
    roughnessFactor: number;
    metallicRoughnessTexture: TextureInfo | null;
    extensions: any;
    extras: any;
    constructor(base: MaterialPbrMetallicRoughnessBase);
}
declare class MaterialNormalTextureInfo {
    index: number;
    texCoord: number;
    scale: number;
    extensions: any;
    extras: any;
    constructor(materialNormalTextureInfoBase: MaterialNormalTextureInfoBase);
}
declare class MaterialOcclusionTextureInfo {
    index: number;
    texCoord: number;
    strength: number;
    extensions: any;
    extras: any;
    constructor(materialOcclusionTextureInfoBase: MaterialOcclusionTextureInfoBase);
}
declare class Skin {
    inverseBindMatrices: Accessor | null;
    skeleton: Node | null;
    joints: Node[];
    name: string | null;
    extensions: any;
    extras: any;
    isLink: boolean;
    inverseBindMatricesData: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
    inverseBindMatrix: Matrix4[];
    constructor(skinBase: SkinBase, gltf: GLTF);
}
declare class SkinLink {
    inverseBindMatrices: Accessor | null;
    skeleton: Node | null;
    joints: Node[];
    name: string | null;
    extensions: any;
    extras: any;
    isLink: boolean;
    inverseBindMatricesData: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
    inverseBindMatrix: Matrix4[];
    constructor(linkedSkin: Skin, gltf: GLTF, inverseBindMatricesAccessorID?: number);
}
export declare class Animation {
    samplers: AnimationSampler[];
    channels: AnimationChannel[];
    name: string | null;
    extensions: any;
    extras: any;
    constructor(animationBase: AnimationBase, gltf: GLTF);
}
export declare class AnimationChannel {
    sampler: AnimationSampler;
    target: AnimationChannelTarget;
    extensions: any;
    extras: any;
    constructor(animationChannelBase: AnimationChannelBase, animation: Animation);
}
declare class AnimationChannelTarget {
    nodeID: GLTFID | undefined;
    node: Node | null;
    path: "translation" | "rotation" | "scale" | "weights";
    extensions: any;
    extras: any;
    constructor(animationChannelTargetBase: AnimationChannelTargetBase);
}
export declare class AnimationSampler {
    input: Accessor;
    interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
    output: Accessor;
    extensions: any;
    extras: any;
    keyFrameIndices: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
    keyFrameRaw: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
    keyFrames: {
        src: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
        dst: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
    };
    currentIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
    constructor(animationSamplerBase: AnimationSamplerBase, gltf: GLTF);
    updateKeyFrames(time: number): void;
}
export declare class GLTF {
    asset: AssetBase;
    scene: Scene | null;
    scenes: Scene[];
    nodes: Node[];
    meshes: Mesh[];
    accessors: Accessor[];
    bufferViews: BufferView[];
    buffers: ArrayBuffer[];
    animations: Animation[];
    cameras: Camera[];
    textures: Texture[];
    images: (ImageBitmap | ImageData | HTMLImageElement)[];
    samplers: Sampler[];
    materials: Material[];
    skins: (Skin | SkinLink)[];
    extensions: any;
    extensionsUsed: string[] | undefined;
    extensionsRequired: string[] | undefined;
    extras: any;
    constructor(glTFBase: GLTFBase);
}
export declare class GLTFLoader {
    _glTF: GLTFBase;
    glTF: GLTF;
    baseUri: string;
    enableGLAvatar: boolean;
    skeletonGLTF: GLTF | null;
    /**
     * Get base URL from the given URL
     * @param uri string The original URL
     * @returns string The base URL
     */
    getBaseUri(uri: string): string;
    /**
     * infer attribute target for BufferView whether ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
     */
    private inferBufferViewTarget;
    private postProcess;
    loadGLTF(uri: string): Promise<GLTF>;
}
/** Basic utilities for glTF loading. */
export declare namespace glTFLoaderBasic {
    /**
     * Return the number of components in an accessor type
     */
    function accessorTypeToNumComponents(type: string): number;
    /**
     * Return the typed array constructor for a given component type
     */
    function glTypeToTypedArray(type: AccessorComponentType): Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor;
    /**
     * Returns a typed array containing the accessor data
     */
    function getAccessorData(accessor: Accessor): Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
}
export {};
