type Matrix4 = number[];
type Vector3 = number[];
type Vector4 = number[];
type Quaternion = number[];

/**
 * Model root
 */
export interface Model {
    name: string;
    meshes: Mesh[];
    nodes: Node[];
    rootNode: number;
    animations: Animation;
    skins: Skin[];
    materials: Material[];
}

/**
 * Model node hiearchy with animation transforms and reference to mesh + skin
 */
export interface Node {
    id: number;
    name: string;
    children: number[];
    localBindTransform: Matrix4;
    skin?: number;
    mesh?: number;
}

/**
 * Skinning information with the inversed bind transform and affected joints
 */
export interface Skin {
    joints: number[];
    inverseBindTransforms: Matrix4[];
}

/**
 * Root for each animation
 */
export interface Animation {
    [name: string]: Channel;
}

/**
 * List of keyframes for each animation
 */
export interface Channel {
    [key: number]: Transform;
}

/**
 * Animation keyFrames
 */
export interface Transform {
    translation: KeyFrame[];
    rotation: KeyFrame[];
    scale: KeyFrame[];
}

/**
 * Transform executed at specific time.
 */
export interface KeyFrame {
    time: number;
    transform: Vector3 | Quaternion;
    type: 'translation' | 'rotation' | 'scale';
}

export interface Buffer {
    data: Float32Array | Int16Array;
    size: number;
    type: string;
    componentType: BufferType;
}

export enum BufferType {
    Float = 5126,
    Short = 5123,
    Int = 5125,
    Byte = 5121
}

/**
 * Mesh buffer information
 */
export interface MeshBuffer {
    buffer: Buffer;
    type: number;
    size: number;
}

/**
 * Mesh buffers and associated material
 */
export interface Mesh {
    elementCount: number;
    indices: Buffer | null;
    positions: MeshBuffer;
    normals: MeshBuffer | null;
    tangents: MeshBuffer | null;
    texCoord: MeshBuffer | null;
    joints: MeshBuffer | null;
    weights: MeshBuffer | null;
    material: number;
}

/**
 * Textures and material info for PBR.
 */
export interface Material {
    baseColorTexture: HTMLImageElement | null;
    baseColorFactor: Vector4;
    metallicRoughnessTexture: HTMLImageElement | null;
    metallicFactor: number;
    roughnessFactor: number;
    emissiveTexture: HTMLImageElement | null;
    emissiveFactor: Vector3;
    normalTexture: HTMLImageElement | null;
    occlusionTexture: HTMLImageElement | null;
}