import { Quaternion, Vector3, Matrix4 } from "./Math";

type GLTFID = number;

enum MeshPrimitiveType {
	POINTS = 0,
	LINES = 1,
	LINE_LOOP = 2,
	LINE_STRIP = 3,
	TRIANGLES = 4,
	TRIANGLE_STRIP = 5,
	TRIANGLE_FAN = 6
}

export enum AccessorComponentType {
	GL_BYTE = 5120,
	GL_UNSIGNED_BYTE = 5121,
	GL_SHORT = 5122,
	GL_UNSIGNED_SHORT = 5123,
	GL_INT = 5124,
	GL_UNSIGNED_INT = 5125,
	GL_FLOAT = 5126
}

enum AccessorSparseIndicesComponentType {
	GL_UNSIGNED_BYTE = 5121,
	GL_UNSIGNED_SHORT = 5123,
	GL_UNSIGNED_INT = 5125
}

enum BufferViewTarget {
	ARRAY_BUFFER = 34962,
	ELEMENT_ARRAY_BUFFER = 34963
}

enum SamplerMagnificationFilter {
	NEAREST = 9728,
	LINEAR = 9729
}

enum SamplerMinificationFilter {
	NEAREST = 9728,
	LINEAR = 9729,
	NEAREST_MIPMAP_NEAREST = 9984,
	LINEAR_MIPMAP_NEAREST = 9985,
	NEAREST_MIPMAP_LINEAR = 9986,
	LINEAR_MIPMAP_LINEAR = 9987
}

enum SamplerWrappingMode {
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
	targets?: { POSITION?: GLTFID; NORMAL?: GLTFID; TANGENT?: GLTFID }[];
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

export class Scene {
	nodes: Node[];
	name: string | null;
	extensions: any;
	extras: any;

	constructor(sceneBase: SceneBase, gltf: GLTF) {
		const length = sceneBase.nodes.length;
		this.nodes = [];
		for (let i = 0; i < length; i++) {
			this.nodes.push(gltf.nodes[sceneBase.nodes[i]]);
		}
		this.name = (sceneBase.name !== undefined) ? sceneBase.name : null;
		this.extensions = (sceneBase.extensions !== undefined) ? sceneBase.extensions : null;
		this.extras = (sceneBase.extras !== undefined) ? sceneBase.extras : null;
	}
}

export class Accessor {
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

	constructor(accessorBase: AccessorBase, bufferView: BufferView) {
		this.bufferView = bufferView;
		this.byteOffset = (accessorBase.byteOffset !== undefined) ? accessorBase.byteOffset : 0;
		this.componentType = accessorBase.componentType;
		this.normalized = (accessorBase.normalized !== undefined) ? accessorBase.normalized : false;
		this.count = accessorBase.count;
		this.type = accessorBase.type;
		this.max = accessorBase.max;
		this.min = accessorBase.min;
		this.sparse = (accessorBase.sparse !== undefined) ? accessorBase.sparse : null;
		this.name = (accessorBase.name !== undefined) ? accessorBase.name : null;
		this.extensions = (accessorBase.extensions !== undefined) ? accessorBase.extensions : null;
		this.extras = (accessorBase.extras !== undefined) ? accessorBase.extras : null;
	}
}

class BufferView {
	byteOffset: number;
	byteLength: number;
	byteStride: number;
	target: BufferViewTarget | 0;
	name: string | null;
	extensions: any;
	extras: any;
	data: ArrayBuffer;

	constructor(bufferViewBase: BufferViewBase, bufferData: ArrayBuffer) {
		this.byteOffset = (bufferViewBase.byteOffset !== undefined) ? bufferViewBase.byteOffset : 0;
		this.byteLength = bufferViewBase.byteLength;
		this.byteStride = (bufferViewBase.byteStride !== undefined) ? bufferViewBase.byteStride : 0;
		this.target = (bufferViewBase.target !== undefined) ? bufferViewBase.target : 0;
		this.name = (bufferViewBase.name !== undefined) ? bufferViewBase.name : null;
		this.extensions = (bufferViewBase.extensions !== undefined) ? bufferViewBase.extensions : null;
		this.extras = (bufferViewBase.extras !== undefined) ? bufferViewBase.extras : null;

		this.data = bufferData.slice(this.byteOffset, this.byteOffset + this.byteLength);
	}
}

class Camera {
	orthographic: CameraOrthographicBase | null;
	perspective: CameraPerspectiveBase | null;
	type: "perspective" | "orthographic";
	name: string | null;
	extensions: any;
	extras: any;

	constructor(cameraBase: CameraBase) {
		this.orthographic = (cameraBase.orthographic !== undefined) ? cameraBase.orthographic : null;
		this.perspective = (cameraBase.perspective !== undefined) ? cameraBase.perspective : null;
		this.type = cameraBase.type;
		this.name = (cameraBase.name !== undefined) ? cameraBase.name : null;
		this.extensions = (cameraBase.extensions !== undefined) ? cameraBase.extensions : null;
		this.extras = (cameraBase.extras !== undefined) ? cameraBase.extras : null;
	}
}

export class Node {
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

	constructor(nodeBase: NodeBase, nodeID: GLTFID, currentLoader: GLTFLoader) {
		this.camera = (nodeBase.camera !== undefined) ? nodeBase.camera : null;
		this.children = [];
		this.skin = null; // assigned later if needed
		this.translation = (nodeBase.translation !== undefined) ? Vector3.fromArray(nodeBase.translation) : new Vector3();
		this.rotation = (nodeBase.rotation !== undefined) ? Quaternion.fromArray(nodeBase.rotation) : new Quaternion();
		this.scale = (nodeBase.scale !== undefined) ? Vector3.fromArray(nodeBase.scale) : new Vector3(1.0, 1.0, 1.0);

		if (nodeBase.matrix !== undefined) {
			this.matrix = Matrix4.clone(nodeBase.matrix);
		} else {
			this.matrix = Matrix4.fromRotationTranslationScale(Matrix4.create(), this.rotation, this.translation, this.scale);
		}

		this.mesh = (nodeBase.mesh !== undefined && currentLoader.glTF.meshes) ? currentLoader.glTF.meshes[nodeBase.mesh] : null;

		this.weights = (nodeBase.weights !== undefined) ? nodeBase.weights : null;
		this.name = (nodeBase.name !== undefined) ? nodeBase.name : null;
		this.extensions = (nodeBase.extensions !== undefined) ? nodeBase.extensions : null;
		this.extras = (nodeBase.extras !== undefined) ? nodeBase.extras : null;
		this.nodeID = nodeID;
		this.childrenID = (nodeBase.children !== undefined) ? nodeBase.children : [];
		this.parent = null;
		this.modelMatrix = Matrix4.clone(this.matrix);
		this.worldMatrix = Matrix4.clone(this.matrix);

		this.skinLink = null;

		// If there's a known 'skin' index, assign the standard glTF skin:
		if (typeof nodeBase.skin === "number" && currentLoader.glTF.skins) {
			this.skin = currentLoader.glTF.skins[nodeBase.skin] || null;
		}

		// If gl_avatar extension is present and toggled on:
		if (nodeBase.extensions?.gl_avatar && currentLoader.enableGLAvatar === true) {
			const linkedSkinName = nodeBase.extensions.gl_avatar.skin.name;
			const linkedSkinID = currentLoader._glTF.extensions?.gl_avatar?.skins?.[linkedSkinName];
			if (typeof linkedSkinID === "number" && currentLoader.skeletonGLTF?.skins) {
				const linkedSkin: Skin = currentLoader.skeletonGLTF.skins[linkedSkinID] as Skin;
				this.skinLink = new SkinLink(
					linkedSkin, currentLoader.glTF,
					nodeBase.extensions.gl_avatar.skin.inverseBindMatrices
				);
			}
		}
	}

	traverse(traverseFunction: (node: Node, parent: Node | null) => void, parent?: Node): void {
		const p = parent ?? null;
		traverseFunction(this, p);
		for (let i = 0, len = this.children.length; i < len; i++) {
			this.children[i].traverse(traverseFunction, this);
		}
	}

	traversePostOrder(traverseFunction: (node: Node, parent: Node | null) => void, parent?: Node): void {
		const p = parent ?? null;
		for (let i = 0, len = this.children.length; i < len; i++) {
			this.children[i].traversePostOrder(traverseFunction, this);
		}
		traverseFunction(this, p);
	}

	traverseTwoFunction(
		traverseFunctionPreOrder: (node: Node, parent: Node | null) => void,
		traverseFunctionPostOrder: (node: Node, parent: Node | null) => void,
		parent?: Node
	): void {
		const p = parent ?? null;
		traverseFunctionPreOrder(this, p);
		for (let i = 0, len = this.children.length; i < len; i++) {
			this.children[i].traverseTwoFunction(traverseFunctionPreOrder, traverseFunctionPostOrder, this);
		}
		traverseFunctionPostOrder(this, p);
	}
}

class Mesh {
	primitives: MeshPrimitive[];
	weights: number[] | null;
	name: string | null;
	extensions: any;
	extras: any;
	meshID: number;

	constructor(meshBase: MeshBase, meshID: number, currentLoader: GLTFLoader) {
		this.primitives = [];
		this.weights = (meshBase.weights !== undefined) ? meshBase.weights : null;
		this.name = (meshBase.name !== undefined) ? meshBase.name : null;
		this.extensions = (meshBase.extensions !== undefined) ? meshBase.extensions : null;
		this.extras = (meshBase.extras !== undefined) ? meshBase.extras : null;

		for (let i = 0; i < meshBase.primitives.length; i++) {
			const primitiveBase = meshBase.primitives[i];
			const primitive = new MeshPrimitive(primitiveBase, currentLoader.glTF, currentLoader);
			this.primitives.push(primitive);
		}
		this.meshID = meshID;
	}
}

export class MeshPrimitive {
	attributesID: { POSITION?: GLTFID; NORMAL?: GLTFID; TEXCOORD_0?: GLTFID };
	attributes: { POSITION?: Accessor | null; NORMAL?: Accessor | null; TEXCOORD_0?: Accessor | null };
	indicesID: GLTFID | null;
	indices: Accessor | null;
	material: Material | null;
	mode: MeshPrimitiveType;
	targetsID?: { POSITION?: GLTFID; NORMAL?: GLTFID; TANGENT?: GLTFID }[];
	targets?: { POSITION?: Accessor; NORMAL?: Accessor; TANGENT?: Accessor }[];
	extensions: any;
	extras: any;
	drawIndices: Accessor | null;
	vertexArray: ArrayBuffer | null;
	vertexBuffer: ArrayBuffer | null;
	shader: WebGLShader | null;

	constructor(primitiveBase: MeshPrimitiveBase, gltf: GLTF, currentLoader: GLTFLoader) {
		this.attributesID = { ...primitiveBase.attributes };
		if (primitiveBase.extensions?.gl_avatar && currentLoader.enableGLAvatar === true) {
			const extAttrs = primitiveBase.extensions.gl_avatar.attributes;
			if (extAttrs) {
				for (const attributeName in extAttrs) {
					this.attributesID[attributeName] = extAttrs[attributeName];
				}
			}
		}

		this.attributes = {
			POSITION: null,
			NORMAL: null,
			TEXCOORD_0: null
		};

		for (const attributeName in this.attributesID) {
			const accIndex = this.attributesID[attributeName];
			if (accIndex !== undefined) {
				this.attributes[attributeName] = gltf.accessors[accIndex];
			}
		}

		// If we have position accessors with min/max, build bounding box
		const posAcc = this.attributes.POSITION;
		this.indicesID = (primitiveBase.indices !== undefined) ? primitiveBase.indices : null;
		this.indices = null;
		this.drawIndices = null;

		if (this.indicesID !== null && gltf.accessors) {
			this.indices = gltf.accessors[this.indicesID];
		} else if (posAcc) {
			this.drawIndices = posAcc;
		}

		this.material = (typeof primitiveBase.material === "number" && gltf.materials)
			? gltf.materials[primitiveBase.material]
			: null;

		this.mode = (primitiveBase.mode !== undefined) ? primitiveBase.mode : MeshPrimitiveType.TRIANGLES;
		this.targetsID = primitiveBase.targets;
		this.targets = undefined;

		this.extensions = (primitiveBase.extensions !== undefined) ? primitiveBase.extensions : null;
		this.extras = (primitiveBase.extras !== undefined) ? primitiveBase.extras : null;

		this.vertexArray = null;
		this.vertexBuffer = null;
		this.shader = null;
	}
}

export class Texture {
	sampler: Sampler | null;
	source: ImageBitmap | ImageData | HTMLImageElement | null;
	name: string | null;
	extensions: any;
	extras: any;

	constructor(textureBase: TextureBase, currentLoader: GLTFLoader) {
		this.sampler = (typeof textureBase.sampler === "number" && currentLoader.glTF.samplers)
			? currentLoader.glTF.samplers[textureBase.sampler]
			: null;
		this.source = (typeof textureBase.source === "number" && currentLoader.glTF.images)
			? currentLoader.glTF.images[textureBase.source]
			: null;
		this.name = (textureBase.name !== undefined) ? textureBase.name : null;
		this.extensions = (textureBase.extensions !== undefined) ? textureBase.extensions : null;
		this.extras = (textureBase.extras !== undefined) ? textureBase.extras : null;
	}
}

class Sampler {
	magFilter: SamplerMagnificationFilter | null;
	minFilter: SamplerMinificationFilter | null;
	wrapS: SamplerWrappingMode;
	wrapT: SamplerWrappingMode;
	name: string | null;
	extensions: any;
	extras: any;
	sampler: WebGLSampler | null; // or 'any' if your TS version lacks WebGLSampler definitions

	constructor(samplerBase: SamplerBase) {
		this.magFilter = (samplerBase.magFilter !== undefined) ? samplerBase.magFilter : null;
		this.minFilter = (samplerBase.minFilter !== undefined) ? samplerBase.minFilter : null;
		this.wrapS = (samplerBase.wrapS !== undefined) ? samplerBase.wrapS : SamplerWrappingMode.REPEAT;
		this.wrapT = (samplerBase.wrapT !== undefined) ? samplerBase.wrapT : SamplerWrappingMode.REPEAT;
		this.name = (samplerBase.name !== undefined) ? samplerBase.name : null;
		this.extensions = (samplerBase.extensions !== undefined) ? samplerBase.extensions : null;
		this.extras = (samplerBase.extras !== undefined) ? samplerBase.extras : null;
		this.sampler = null;
	}
}

export class TextureInfo {
	index: GLTFID;
	texCoord: number;
	extensions: any;
	extras: any;

	constructor(textureInfoBase: TextureInfoBase) {
		this.index = textureInfoBase.index;
		this.texCoord = (textureInfoBase.texCoord !== undefined) ? textureInfoBase.texCoord : 0;
		this.extensions = (textureInfoBase.extensions !== undefined) ? textureInfoBase.extensions : null;
		this.extras = (textureInfoBase.extras !== undefined) ? textureInfoBase.extras : null;
	}
}

class Material {
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

	constructor(materialBase: MaterialBase) {
		this.name = (materialBase.name !== undefined) ? materialBase.name : null;
		this.extensions = (materialBase.extensions !== undefined) ? materialBase.extensions : null;
		this.extras = (materialBase.extras !== undefined) ? materialBase.extras : null;

		this.pbrMetallicRoughness = new MaterialPbrMetallicRoughness(
			materialBase.pbrMetallicRoughness ?? {
				baseColorFactor: [1, 1, 1, 1],
				baseColorTexture: undefined,
				metallicFactor: 1,
				roughnessFactor: 1,
				metallicRoughnessTexture: undefined
			}
		);

		this.normalTexture = materialBase.normalTexture
			? new MaterialNormalTextureInfo(materialBase.normalTexture)
			: null;

		this.occlusionTexture = materialBase.occlusionTexture
			? new MaterialOcclusionTextureInfo(materialBase.occlusionTexture)
			: null;

		this.emissiveTexture = materialBase.emissiveTexture
			? new TextureInfo(materialBase.emissiveTexture)
			: null;

		this.emissiveFactor = (materialBase.emissiveFactor !== undefined)
			? materialBase.emissiveFactor
			: [0, 0, 0];

		this.alphaMode = materialBase.alphaMode ?? "OPAQUE";
		this.alphaCutoff = materialBase.alphaCutoff ?? 0.5;
		this.doubleSided = !!materialBase.doubleSided;
	}
}

class MaterialPbrMetallicRoughness {
	baseColorFactor: number[];
	baseColorTexture: TextureInfo | null;
	metallicFactor: number;
	roughnessFactor: number;
	metallicRoughnessTexture: TextureInfo | null;
	extensions: any;
	extras: any;

	constructor(base: MaterialPbrMetallicRoughnessBase) {
		this.baseColorFactor = base.baseColorFactor ?? [1, 1, 1, 1];
		this.baseColorTexture = base.baseColorTexture
			? new TextureInfo(base.baseColorTexture)
			: null;
		this.metallicFactor = base.metallicFactor ?? 1;
		this.roughnessFactor = base.roughnessFactor ?? 1;
		this.metallicRoughnessTexture = base.metallicRoughnessTexture
			? new TextureInfo(base.metallicRoughnessTexture)
			: null;
		this.extensions = base.extensions ?? null;
		this.extras = base.extras ?? null;
	}
}

class MaterialNormalTextureInfo {
	index: number;
	texCoord: number;
	scale: number;
	extensions: any;
	extras: any;

	constructor(materialNormalTextureInfoBase: MaterialNormalTextureInfoBase) {
		this.index = materialNormalTextureInfoBase.index ?? 0;
		this.texCoord = materialNormalTextureInfoBase.texCoord ?? 0;
		this.scale = materialNormalTextureInfoBase.scale ?? 1;
		this.extensions = materialNormalTextureInfoBase.extensions ?? null;
		this.extras = materialNormalTextureInfoBase.extras ?? null;
	}
}

class MaterialOcclusionTextureInfo {
	index: number;
	texCoord: number;
	strength: number;
	extensions: any;
	extras: any;

	constructor(materialOcclusionTextureInfoBase: MaterialOcclusionTextureInfoBase) {
		this.index = materialOcclusionTextureInfoBase.index ?? 0;
		this.texCoord = materialOcclusionTextureInfoBase.texCoord ?? 0;
		this.strength = materialOcclusionTextureInfoBase.strength ?? 1;
		this.extensions = materialOcclusionTextureInfoBase.extensions ?? null;
		this.extras = materialOcclusionTextureInfoBase.extras ?? null;
	}
}

class Skin {
	inverseBindMatrices: Accessor | null;
	skeleton: Node | null;
	joints: Node[];
	name: string | null;
	extensions: any;
	extras: any;
	isLink: boolean;
	inverseBindMatricesData: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
	inverseBindMatrix: Matrix4[];

	constructor(skinBase: SkinBase, gltf: GLTF) {
		this.inverseBindMatrices = (typeof skinBase.inverseBindMatrices === "number" && gltf.accessors)
			? gltf.accessors[skinBase.inverseBindMatrices]
			: null;
		this.skeleton = (typeof skinBase.skeleton === "number" && gltf.nodes)
			? gltf.nodes[skinBase.skeleton]
			: null;
		this.joints = [];
		if (skinBase.joints && gltf.nodes) {
			for (let i = 0; i < skinBase.joints.length; i++) {
				this.joints.push(gltf.nodes[skinBase.joints[i]]);
			}
		}
		this.name = (skinBase.name !== undefined) ? skinBase.name : null;
		this.extensions = (skinBase.extensions !== undefined) ? skinBase.extensions : null;
		this.extras = (skinBase.extras !== undefined) ? skinBase.extras : null;
		this.isLink = false;

		this.inverseBindMatricesData = null;
		this.inverseBindMatrix = [];

		if (this.inverseBindMatrices) {
			this.inverseBindMatricesData = glTFLoaderBasic.getAccessorData(this.inverseBindMatrices);
			for (let i = 0; i < this.inverseBindMatricesData.length; i += 16) {
				this.inverseBindMatrix.push(
					Matrix4.fromValues(
						this.inverseBindMatricesData[i + 0], this.inverseBindMatricesData[i + 1], this.inverseBindMatricesData[i + 2], this.inverseBindMatricesData[i + 3],
						this.inverseBindMatricesData[i + 4], this.inverseBindMatricesData[i + 5], this.inverseBindMatricesData[i + 6], this.inverseBindMatricesData[i + 7],
						this.inverseBindMatricesData[i + 8], this.inverseBindMatricesData[i + 9], this.inverseBindMatricesData[i + 10], this.inverseBindMatricesData[i + 11],
						this.inverseBindMatricesData[i + 12], this.inverseBindMatricesData[i + 13], this.inverseBindMatricesData[i + 14], this.inverseBindMatricesData[i + 15],
					)
				);
			}
		}
	}
}

class SkinLink {
	inverseBindMatrices: Accessor | null;
	skeleton: Node | null;
	joints: Node[];
	name: string | null;
	extensions: any;
	extras: any;
	isLink: boolean;
	inverseBindMatricesData: Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | null;
	inverseBindMatrix: Matrix4[];

	constructor(linkedSkin: Skin, gltf: GLTF, inverseBindMatricesAccessorID?: number) {
		if (!gltf.skins) gltf.skins = [];

		gltf.skins.push(this);
		this.inverseBindMatrices = (typeof inverseBindMatricesAccessorID === "number" && gltf.accessors)
			? gltf.accessors[inverseBindMatricesAccessorID]
			: null;
		this.skeleton = linkedSkin.skeleton;
		this.joints = linkedSkin.joints;
		this.name = linkedSkin.name;
		this.extensions = linkedSkin.extensions;
		this.extras = linkedSkin.extras;
		this.isLink = true;

		this.inverseBindMatricesData = null;
		this.inverseBindMatrix = [];

		if (this.inverseBindMatrices) {
			this.inverseBindMatricesData = glTFLoaderBasic.getAccessorData(this.inverseBindMatrices);
			for (let i = 0; i < this.inverseBindMatricesData.length; i += 16) {
				this.inverseBindMatrix.push(
					Matrix4.fromValues(
						this.inverseBindMatricesData[i], this.inverseBindMatricesData[i + 1], this.inverseBindMatricesData[i + 2], this.inverseBindMatricesData[i + 3],
						this.inverseBindMatricesData[i + 4], this.inverseBindMatricesData[i + 5], this.inverseBindMatricesData[i + 6], this.inverseBindMatricesData[i + 7],
						this.inverseBindMatricesData[i + 8], this.inverseBindMatricesData[i + 9], this.inverseBindMatricesData[i + 10], this.inverseBindMatricesData[i + 11],
						this.inverseBindMatricesData[i + 12], this.inverseBindMatricesData[i + 13], this.inverseBindMatricesData[i + 14], this.inverseBindMatricesData[i + 15],
					)
				);
			}
		}
	}
}

export class Animation {
	samplers: AnimationSampler[];
	channels: AnimationChannel[];
	name: string | null;
	extensions: any;
	extras: any;

	constructor(animationBase: AnimationBase, gltf: GLTF) {
		this.samplers = [];
		for (let i = 0; i < animationBase.samplers.length; i++) {
			this.samplers.push(new AnimationSampler(animationBase.samplers[i], gltf));
		}
		this.channels = [];
		for (let i = 0; i < animationBase.channels.length; i++) {
			this.channels.push(new AnimationChannel(animationBase.channels[i], this));
		}
		this.name = (animationBase.name !== undefined) ? animationBase.name : null;
		this.extensions = (animationBase.extensions !== undefined) ? animationBase.extensions : null;
		this.extras = (animationBase.extras !== undefined) ? animationBase.extras : null;
	}
}

export class AnimationChannel {
	sampler: AnimationSampler;
	target: AnimationChannelTarget;
	extensions: any;
	extras: any;

	constructor(animationChannelBase: AnimationChannelBase, animation: Animation) {
		this.sampler = animation.samplers[animationChannelBase.sampler];
		this.target = new AnimationChannelTarget(animationChannelBase.target);
		this.extensions = (animationChannelBase.extensions !== undefined) ? animationChannelBase.extensions : null;
		this.extras = (animationChannelBase.extras !== undefined) ? animationChannelBase.extras : null;
	}
}

class AnimationChannelTarget {
	nodeID: GLTFID | undefined;
	node: Node | null;
	path: "translation" | "rotation" | "scale" | "weights";
	extensions: any;
	extras: any;

	constructor(animationChannelTargetBase: AnimationChannelTargetBase) {
		this.nodeID = animationChannelTargetBase.node;
		this.node = null; // Will be filled in after creation
		this.path = animationChannelTargetBase.path;
		this.extensions = (animationChannelTargetBase.extensions !== undefined)
			? animationChannelTargetBase.extensions
			: null;
		this.extras = (animationChannelTargetBase.extras !== undefined)
			? animationChannelTargetBase.extras
			: null;
	}
}

export class AnimationSampler {
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

	constructor(animationSamplerBase: AnimationSamplerBase, gltf: GLTF) {
		this.input = gltf.accessors[animationSamplerBase.input];
		this.interpolation = animationSamplerBase.interpolation ?? "LINEAR";
		this.output = gltf.accessors[animationSamplerBase.output];
		this.extensions = animationSamplerBase.extensions ?? null;
		this.extras = animationSamplerBase.extras ?? null;

		this.keyFrameIndices = glTFLoaderBasic.getAccessorData(this.input);
		this.keyFrameRaw = glTFLoaderBasic.getAccessorData(this.output);

		this.keyFrames = { src: null, dst: null };
		this.currentIndex = 0;
		this.startTime = this.keyFrameIndices[0];
		this.endTime = this.keyFrameIndices[this.keyFrameIndices.length - 1];
		this.duration = this.endTime - this.startTime;
	}

	updateKeyFrames(time: number): void {
		while (
			this.currentIndex < this.keyFrameIndices.length - 2 &&
			time >= this.keyFrameIndices[this.currentIndex + 1]
		) {
			this.currentIndex++;
		}
		const componentsPerKey = glTFLoaderBasic.accessorTypeToNumComponents(this.output.type);
		const srcStart = this.currentIndex * componentsPerKey;
		const srcEnd = (this.currentIndex + 1) * componentsPerKey;
		const dstStart = srcEnd;
		const dstEnd = (this.currentIndex + 2) * componentsPerKey;

		this.keyFrames.src = this.keyFrameRaw.slice(srcStart, srcEnd);
		this.keyFrames.dst = this.keyFrameRaw.slice(dstStart, dstEnd);

		if (time >= this.endTime) {
			this.currentIndex = 0;
		}
	}
}

export class GLTF {
	asset: AssetBase;
	scene: Scene | null = null;
	scenes: Scene[] = [];
	nodes: Node[] = [];
	meshes: Mesh[] = [];
	accessors: Accessor[] = [];
	bufferViews: BufferView[] = [];
	buffers: ArrayBuffer[] = [];
	animations: Animation[] = [];
	cameras: Camera[] = [];
	textures: Texture[] = [];
	images: (ImageBitmap | ImageData | HTMLImageElement)[] = [];
	samplers: Sampler[] = [];
	materials: Material[] = [];
	skins: (Skin | SkinLink)[] = [];
	extensions: any;
	extensionsUsed: string[] | undefined;
	extensionsRequired: string[] | undefined;
	extras: any;

	constructor(glTFBase: GLTFBase) {
		this.asset = glTFBase.asset;
		this.extensions = (glTFBase.extensions !== undefined) ? glTFBase.extensions : null;
		this.extensionsUsed = (glTFBase.extensionsUsed !== undefined) ? glTFBase.extensionsUsed : undefined;
		this.extensionsRequired = (glTFBase.extensionsRequired !== undefined) ? glTFBase.extensionsRequired : undefined;
		this.extras = (glTFBase.extras !== undefined) ? glTFBase.extras : null;
	}
}

export class GLTFLoader {
	_glTF: GLTFBase;
	glTF: GLTF;
	baseUri: string = "";
	enableGLAvatar: boolean = false;
	skeletonGLTF: GLTF | null = null;

	/**
	 * Get base URL from the given URL
	 * @param uri string The original URL
	 * @returns string The base URL
	 */
	public getBaseUri(uri: string): string {
		if (uri.lastIndexOf('/') !== -1) {
			return uri.substring(0, uri.lastIndexOf('/') + 1);
		}
		return "";
	}

	/**
	 * infer attribute target for BufferView whether ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
	 */
	private inferBufferViewTarget(): void {
		if (!this._glTF || !this._glTF.meshes || !this._glTF.bufferViews || !this._glTF.accessors) return;

		this._glTF.meshes.forEach((mesh: MeshBase) => {
			mesh.primitives.forEach((primitive: MeshPrimitiveBase) => {
				// set bufferView.target for POSITION, NORMAL, and TEXCOORD_0
				for (const [attributeName, accessorIndex] of Object.entries(primitive.attributes)) {
					if (attributeName === "POSITION" || attributeName === "NORMAL" || attributeName === "TEXCOORD_0") {
						const accessor = this._glTF?.accessors?.[accessorIndex];
						if (accessor !== undefined && accessor.bufferView !== undefined) {
							this._glTF.bufferViews[accessor.bufferView].target = BufferViewTarget.ARRAY_BUFFER;
						}
					}
				}
				if (primitive.indices !== undefined) {
					const indexAccessor = this._glTF.accessors[primitive.indices];
					const bufViewID = indexAccessor.bufferView;
					if (bufViewID !== undefined) {
						const bufferView = this._glTF.bufferViews[bufViewID];
						if (bufferView.target !== undefined) {
							if (bufferView.target !== BufferViewTarget.ELEMENT_ARRAY_BUFFER) {
								console.warn(
									`BufferView ${primitive.indices} should be ELEMENT_ARRAY_BUFFER`
								);
							}
						} else {
							bufferView.target = BufferViewTarget.ELEMENT_ARRAY_BUFFER;
						}
					}
				}
			});
		});
	}

	private async postProcess() {
		if (!this._glTF || !this.glTF) return;

		this.inferBufferViewTarget();

		// Create BufferViews
		if (this._glTF.bufferViews && this._glTF.buffers) {
			for (let i = 0; i < this._glTF.bufferViews.length; i++) {
				const bufferViewBase = this._glTF.bufferViews[i];
				const bufferIndex = bufferViewBase.buffer;
				const bufferData = this.glTF.buffers[bufferIndex];
				const bufferView = new BufferView(bufferViewBase, bufferData);
				this.glTF.bufferViews.push(bufferView);
			}
		}

		// Create Accessors
		if (this._glTF.accessors && this.glTF.bufferViews) {
			for (let i = 0; i < this._glTF.accessors.length; i++) {
				const accessorBase = this._glTF.accessors[i];
				const bvIdx = accessorBase.bufferView ?? -1;
				const bv = (bvIdx >= 0)
					? this.glTF.bufferViews[bvIdx]
					: new BufferView({ buffer: 0, byteLength: 0 }, new ArrayBuffer(0));
				this.glTF.accessors.push(new Accessor(accessorBase, bv));
			}
		}

		// Create Cameras
		if (this._glTF.cameras) {
			for (let i = 0; i < this._glTF.cameras.length; i++) {
				this.glTF.cameras.push(new Camera(this._glTF.cameras[i]));
			}
		}

		// Create Materials
		if (this._glTF.materials) {
			for (let i = 0; i < this._glTF.materials.length; i++) {
				this.glTF.materials.push(new Material(this._glTF.materials[i]));
			}
		}

		// Create Samplers
		if (this._glTF.samplers) {
			for (let i = 0; i < this._glTF.samplers.length; i++) {
				this.glTF.samplers.push(new Sampler(this._glTF.samplers[i]));
			}
		}

		// Create Textures
		if (this._glTF.textures) {
			for (let i = 0; i < this._glTF.textures.length; i++) {
				const tex = new Texture(this._glTF.textures[i], this);
				this.glTF.textures.push(tex);
			}
		}

		// Create Meshes
		if (this._glTF.meshes) {
			for (let i = 0; i < this._glTF.meshes.length; i++) {
				this.glTF.meshes.push(new Mesh(this._glTF.meshes[i], i, this));
			}
		}

		// Create Nodes
		if (this._glTF.nodes) {
			for (let i = 0; i < this._glTF.nodes.length; i++) {
				this.glTF.nodes.push(new Node(this._glTF.nodes[i], i, this));
			}

			// Link children
			this.glTF.nodes.forEach((curNode) => {
				for (let i = 0; i < curNode.childrenID.length; i++) {
					curNode.children[i] = this.glTF.nodes[curNode.childrenID[i]];
					curNode.children[i].parent = curNode;
				}
			});

			// Create Scenes
			if (this._glTF.scenes) {
				for (let i = 0; i < this._glTF.scenes.length; i++) {
					const sceneBase = this._glTF.scenes[i];
					if (!sceneBase.nodes) continue;
					this.glTF.scenes[i] = new Scene(sceneBase, this.glTF);

					// We'll keep track of node local transforms:
					const nodeCount = this.glTF.nodes.length;
					const nodeMatrices = Array.from({ length: nodeCount }, () => Matrix4.create());

					// Pre/post function for bounding
					for (let j = 0; j < this.glTF.scenes[i].nodes.length; j++) {
						const rootNode = this.glTF.scenes[i].nodes[j];
						rootNode.traverseTwoFunction(
							(node: Node, parent: Node | null) => {
								if (parent) {
									Matrix4.multiply(nodeMatrices[node.nodeID], nodeMatrices[parent.nodeID], node.modelMatrix);
								} else {
									nodeMatrices[node.nodeID] = Matrix4.clone(node.modelMatrix);
								}
							},
							(node: Node, parent: Node | null) => {
							}
						);
					}
				}

				if (typeof this._glTF.scene === "number") {
					this.glTF.scene = this.glTF.scenes[this._glTF.scene];
				} else if (this.glTF.scenes.length > 0) {
					this.glTF.scene = this.glTF.scenes[0];
				}
			}
		}

		// Create Animations
		if (this._glTF.animations) {
			for (let i = 0; i < this._glTF.animations.length; i++) {
				const anim = new Animation(this._glTF.animations[i], this.glTF);
				this.glTF.animations.push(anim);

				// Link channels to real nodes
				anim.channels.forEach((channel) => {
					if (typeof channel.target.nodeID === "number") {
						channel.target.node = this.glTF.nodes[channel.target.nodeID];
					}
				});
			}
		}

		// Create Skins
		if (this._glTF.skins) {
			for (let i = 0; i < this._glTF.skins.length; i++) {
				const sk = new Skin(this._glTF.skins[i], this.glTF);
				this.glTF.skins.push(sk);
			}

			// Hook up each node's skin pointer if it references a standard glTF skin
			if (this._glTF.nodes) {
				for (let i = 0; i < this.glTF.nodes.length; i++) {
					const nodeBase = this._glTF.nodes[i];
					if (typeof nodeBase.skin === "number") {
						this.glTF.nodes[i].skin = this.glTF.skins[nodeBase.skin] ?? null;
					}
				}
			}
		}
	}

	public async loadGLTF(uri: string): Promise<GLTF> {
		this.baseUri = this.getBaseUri(uri);

		try {
			const glTFBase: GLTFBase = await fetch(uri).then((response: Response) => {
				if (response.ok) {
					return response.json();
				}
				throw Error("LoadingError: Error occurred loading glTF JSON.");
			});
			this._glTF = glTFBase;
			this.glTF = new GLTF(glTFBase);

		} catch (error) {
			console.error(error);
			throw error;
		}

		if (!this._glTF || !this.glTF) {
			throw new Error("Failed to load glTF JSON.");
		}

		const loadBuffer: Promise<void> = new Promise(async (resolve) => {
			if (this._glTF && this._glTF.buffers) {
				const bufferPromises: Promise<ArrayBuffer>[] = [];

				for (const bufferInfo of this._glTF.buffers) {
					if (!bufferInfo.uri) {
						// Possibly a GLB scenario or missing URI
						bufferPromises.push(Promise.resolve(new ArrayBuffer(bufferInfo.byteLength)));
						continue;
					}
					try {
						const base64Magic = "data:application/octet-stream;base64,";
						if (bufferInfo.uri.indexOf(base64Magic) === 0) {
							// base64-encoded
							const base64Data = bufferInfo.uri.slice(base64Magic.length);
							bufferPromises.push(
								Promise.resolve(Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))).then(u8 => u8.buffer)
							);
						} else {
							// external .bin
							const url = this.baseUri + bufferInfo.uri;
							bufferPromises.push(
								fetch(url).then((response: Response) => {
									if (!response.ok) throw new Error("LoadingError: Could not fetch buffer.");
									return response.arrayBuffer();
								})
							);
						}
					} catch (err) {
						console.error(err);
						bufferPromises.push(Promise.resolve(new ArrayBuffer(bufferInfo.byteLength)));
					}
				}

				const buffers = await Promise.all(bufferPromises);
				for (let i = 0; i < buffers.length; i++) {
					this.glTF.buffers[i] = buffers[i];
					console.log(`buffer ${i} complete`);
				}
			}
			resolve();
		});

		const loadImage: Promise<void> = new Promise(async (resolve) => {
			if (this._glTF && this._glTF.images) {
				const imagePromises: Promise<ImageBitmap>[] = [];
				for (const imageInfo of this._glTF.images) {
					if (!imageInfo.uri) {
						// Possibly external bufferView-based image
						// For simplicity, ignoring that path here
						imagePromises.push(Promise.resolve(new ImageBitmap()));
						continue;
					}
					try {
						const base64Magic = "data:image/png;base64,";
						if (imageInfo.uri.indexOf(base64Magic) === 0) {
							const base64Data = imageInfo.uri.slice(base64Magic.length);
							const arrayBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer;
							imagePromises.push(
								createImageBitmap(new Blob([arrayBuffer]))
							);
						} else {
							const url = this.baseUri + imageInfo.uri;
							imagePromises.push(
								fetch(url).then(response => {
									if (!response.ok) throw new Error("LoadingError: Could not fetch image.");
									return response.blob();
								}).then(blob => createImageBitmap(blob))
							);
						}
					} catch (err) {
						console.error(err);
						// fallback dummy image
						imagePromises.push(Promise.resolve(new ImageBitmap()));
					}
				}

				const images = await Promise.all(imagePromises);
				for (let i = 0; i < images.length; i++) {
					this.glTF.images[i] = images[i];
					console.log(`image ${i} complete`);
				}
			}
			resolve();
		});

		await loadBuffer;
		await loadImage;

		await this.postProcess();
		return this.glTF;
	}
}

/** Basic utilities for glTF loading. */
export namespace glTFLoaderBasic {
	/** 
	 * Return the number of components in an accessor type
	 */
	export function accessorTypeToNumComponents(type: string): number {
		const map = new Map<string, number>([
			["SCALAR", 1],
			["VEC2", 2],
			["VEC3", 3],
			["VEC4", 4],
			["MAT2", 4],
			["MAT3", 9],
			["MAT4", 16]
		]);
		const val = map.get(type);
		if (val === undefined) {
			throw new Error(`No component count for accessor type: ${type}`);
		}
		return val;
	}

	/** 
	 * Return the typed array constructor for a given component type
	 */
	export function glTypeToTypedArray(type: AccessorComponentType):
		Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor |
		Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor |
		Float32ArrayConstructor {
		const map = new Map<number, any>([
			[5120, Int8Array],    // gl.BYTE
			[5121, Uint8Array],   // gl.UNSIGNED_BYTE
			[5122, Int16Array],   // gl.SHORT
			[5123, Uint16Array],  // gl.UNSIGNED_SHORT
			[5124, Int32Array],   // gl.INT
			[5125, Uint32Array],  // gl.UNSIGNED_INT
			[5126, Float32Array]  // gl.FLOAT
		]);
		const val = map.get(type);
		if (!val) {
			throw new Error(`No typed array constructor for glType: ${type}`);
		}
		return val;
	}

	/**
	 * Returns a typed array containing the accessor data
	 */
	export function getAccessorData(accessor: Accessor):
		Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array {
		const ArrayCtor = glTypeToTypedArray(accessor.componentType);
		const numElems = accessor.count * accessorTypeToNumComponents(accessor.type);
		return new ArrayCtor(accessor.bufferView.data, accessor.byteOffset, numElems);
	}
}