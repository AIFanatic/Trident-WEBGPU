import { Matrix4, Vector3, Quaternion } from './Math.js';

var AccessorComponentType = /* @__PURE__ */ ((AccessorComponentType2) => {
  AccessorComponentType2[AccessorComponentType2["GL_BYTE"] = 5120] = "GL_BYTE";
  AccessorComponentType2[AccessorComponentType2["GL_UNSIGNED_BYTE"] = 5121] = "GL_UNSIGNED_BYTE";
  AccessorComponentType2[AccessorComponentType2["GL_SHORT"] = 5122] = "GL_SHORT";
  AccessorComponentType2[AccessorComponentType2["GL_UNSIGNED_SHORT"] = 5123] = "GL_UNSIGNED_SHORT";
  AccessorComponentType2[AccessorComponentType2["GL_INT"] = 5124] = "GL_INT";
  AccessorComponentType2[AccessorComponentType2["GL_UNSIGNED_INT"] = 5125] = "GL_UNSIGNED_INT";
  AccessorComponentType2[AccessorComponentType2["GL_FLOAT"] = 5126] = "GL_FLOAT";
  return AccessorComponentType2;
})(AccessorComponentType || {});
class Scene {
  nodes;
  name;
  extensions;
  extras;
  constructor(sceneBase, gltf) {
    const length = sceneBase.nodes.length;
    this.nodes = [];
    for (let i = 0; i < length; i++) {
      this.nodes.push(gltf.nodes[sceneBase.nodes[i]]);
    }
    this.name = sceneBase.name !== void 0 ? sceneBase.name : null;
    this.extensions = sceneBase.extensions !== void 0 ? sceneBase.extensions : null;
    this.extras = sceneBase.extras !== void 0 ? sceneBase.extras : null;
  }
}
class Accessor {
  bufferView;
  byteOffset;
  componentType;
  normalized;
  count;
  type;
  max;
  min;
  sparse;
  name;
  extensions;
  extras;
  constructor(accessorBase, bufferView) {
    this.bufferView = bufferView;
    this.byteOffset = accessorBase.byteOffset !== void 0 ? accessorBase.byteOffset : 0;
    this.componentType = accessorBase.componentType;
    this.normalized = accessorBase.normalized !== void 0 ? accessorBase.normalized : false;
    this.count = accessorBase.count;
    this.type = accessorBase.type;
    this.max = accessorBase.max;
    this.min = accessorBase.min;
    this.sparse = accessorBase.sparse !== void 0 ? accessorBase.sparse : null;
    this.name = accessorBase.name !== void 0 ? accessorBase.name : null;
    this.extensions = accessorBase.extensions !== void 0 ? accessorBase.extensions : null;
    this.extras = accessorBase.extras !== void 0 ? accessorBase.extras : null;
  }
}
class BufferView {
  byteOffset;
  byteLength;
  byteStride;
  target;
  name;
  extensions;
  extras;
  data;
  constructor(bufferViewBase, bufferData) {
    this.byteOffset = bufferViewBase.byteOffset !== void 0 ? bufferViewBase.byteOffset : 0;
    this.byteLength = bufferViewBase.byteLength;
    this.byteStride = bufferViewBase.byteStride !== void 0 ? bufferViewBase.byteStride : 0;
    this.target = bufferViewBase.target !== void 0 ? bufferViewBase.target : 0;
    this.name = bufferViewBase.name !== void 0 ? bufferViewBase.name : null;
    this.extensions = bufferViewBase.extensions !== void 0 ? bufferViewBase.extensions : null;
    this.extras = bufferViewBase.extras !== void 0 ? bufferViewBase.extras : null;
    this.data = bufferData.slice(this.byteOffset, this.byteOffset + this.byteLength);
  }
}
class Camera {
  orthographic;
  perspective;
  type;
  name;
  extensions;
  extras;
  constructor(cameraBase) {
    this.orthographic = cameraBase.orthographic !== void 0 ? cameraBase.orthographic : null;
    this.perspective = cameraBase.perspective !== void 0 ? cameraBase.perspective : null;
    this.type = cameraBase.type;
    this.name = cameraBase.name !== void 0 ? cameraBase.name : null;
    this.extensions = cameraBase.extensions !== void 0 ? cameraBase.extensions : null;
    this.extras = cameraBase.extras !== void 0 ? cameraBase.extras : null;
  }
}
class Node {
  camera;
  children;
  skin;
  translation;
  rotation;
  scale;
  matrix;
  mesh;
  weights;
  name;
  extensions;
  extras;
  nodeID;
  childrenID;
  parent;
  skinLink;
  modelMatrix;
  worldMatrix;
  constructor(nodeBase, nodeID, currentLoader) {
    this.camera = nodeBase.camera !== void 0 ? nodeBase.camera : null;
    this.children = [];
    this.skin = null;
    this.translation = nodeBase.translation !== void 0 ? Vector3.fromArray(nodeBase.translation) : new Vector3();
    this.rotation = nodeBase.rotation !== void 0 ? Quaternion.fromArray(nodeBase.rotation) : new Quaternion();
    this.scale = nodeBase.scale !== void 0 ? Vector3.fromArray(nodeBase.scale) : new Vector3(1, 1, 1);
    if (nodeBase.matrix !== void 0) {
      this.matrix = Matrix4.clone(nodeBase.matrix);
    } else {
      this.matrix = Matrix4.fromRotationTranslationScale(Matrix4.create(), this.rotation, this.translation, this.scale);
    }
    this.mesh = nodeBase.mesh !== void 0 && currentLoader.glTF.meshes ? currentLoader.glTF.meshes[nodeBase.mesh] : null;
    this.weights = nodeBase.weights !== void 0 ? nodeBase.weights : null;
    this.name = nodeBase.name !== void 0 ? nodeBase.name : null;
    this.extensions = nodeBase.extensions !== void 0 ? nodeBase.extensions : null;
    this.extras = nodeBase.extras !== void 0 ? nodeBase.extras : null;
    this.nodeID = nodeID;
    this.childrenID = nodeBase.children !== void 0 ? nodeBase.children : [];
    this.parent = null;
    this.modelMatrix = Matrix4.clone(this.matrix);
    this.worldMatrix = Matrix4.clone(this.matrix);
    this.skinLink = null;
    if (typeof nodeBase.skin === "number" && currentLoader.glTF.skins) {
      this.skin = currentLoader.glTF.skins[nodeBase.skin] || null;
    }
    if (nodeBase.extensions?.gl_avatar && currentLoader.enableGLAvatar === true) {
      const linkedSkinName = nodeBase.extensions.gl_avatar.skin.name;
      const linkedSkinID = currentLoader._glTF.extensions?.gl_avatar?.skins?.[linkedSkinName];
      if (typeof linkedSkinID === "number" && currentLoader.skeletonGLTF?.skins) {
        const linkedSkin = currentLoader.skeletonGLTF.skins[linkedSkinID];
        this.skinLink = new SkinLink(
          linkedSkin,
          currentLoader.glTF,
          nodeBase.extensions.gl_avatar.skin.inverseBindMatrices
        );
      }
    }
  }
  traverse(traverseFunction, parent) {
    const p = parent ?? null;
    traverseFunction(this, p);
    for (let i = 0, len = this.children.length; i < len; i++) {
      this.children[i].traverse(traverseFunction, this);
    }
  }
  traversePostOrder(traverseFunction, parent) {
    const p = parent ?? null;
    for (let i = 0, len = this.children.length; i < len; i++) {
      this.children[i].traversePostOrder(traverseFunction, this);
    }
    traverseFunction(this, p);
  }
  traverseTwoFunction(traverseFunctionPreOrder, traverseFunctionPostOrder, parent) {
    const p = parent ?? null;
    traverseFunctionPreOrder(this, p);
    for (let i = 0, len = this.children.length; i < len; i++) {
      this.children[i].traverseTwoFunction(traverseFunctionPreOrder, traverseFunctionPostOrder, this);
    }
    traverseFunctionPostOrder(this, p);
  }
}
class Mesh {
  primitives;
  weights;
  name;
  extensions;
  extras;
  meshID;
  constructor(meshBase, meshID, currentLoader) {
    this.primitives = [];
    this.weights = meshBase.weights !== void 0 ? meshBase.weights : null;
    this.name = meshBase.name !== void 0 ? meshBase.name : null;
    this.extensions = meshBase.extensions !== void 0 ? meshBase.extensions : null;
    this.extras = meshBase.extras !== void 0 ? meshBase.extras : null;
    for (let i = 0; i < meshBase.primitives.length; i++) {
      const primitiveBase = meshBase.primitives[i];
      const primitive = new MeshPrimitive(primitiveBase, currentLoader.glTF, currentLoader);
      this.primitives.push(primitive);
    }
    this.meshID = meshID;
  }
}
class MeshPrimitive {
  attributesID;
  attributes;
  indicesID;
  indices;
  material;
  mode;
  targetsID;
  targets;
  extensions;
  extras;
  drawIndices;
  vertexArray;
  vertexBuffer;
  shader;
  constructor(primitiveBase, gltf, currentLoader) {
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
      if (accIndex !== void 0) {
        this.attributes[attributeName] = gltf.accessors[accIndex];
      }
    }
    const posAcc = this.attributes.POSITION;
    this.indicesID = primitiveBase.indices !== void 0 ? primitiveBase.indices : null;
    this.indices = null;
    this.drawIndices = null;
    if (this.indicesID !== null && gltf.accessors) {
      this.indices = gltf.accessors[this.indicesID];
    } else if (posAcc) {
      this.drawIndices = posAcc;
    }
    this.material = typeof primitiveBase.material === "number" && gltf.materials ? gltf.materials[primitiveBase.material] : null;
    this.mode = primitiveBase.mode !== void 0 ? primitiveBase.mode : 4 /* TRIANGLES */;
    this.targetsID = primitiveBase.targets;
    this.targets = void 0;
    this.extensions = primitiveBase.extensions !== void 0 ? primitiveBase.extensions : null;
    this.extras = primitiveBase.extras !== void 0 ? primitiveBase.extras : null;
    this.vertexArray = null;
    this.vertexBuffer = null;
    this.shader = null;
  }
}
class Texture {
  sampler;
  source;
  name;
  extensions;
  extras;
  constructor(textureBase, currentLoader) {
    this.sampler = typeof textureBase.sampler === "number" && currentLoader.glTF.samplers ? currentLoader.glTF.samplers[textureBase.sampler] : null;
    this.source = typeof textureBase.source === "number" && currentLoader.glTF.images ? currentLoader.glTF.images[textureBase.source] : null;
    this.name = textureBase.name !== void 0 ? textureBase.name : null;
    this.extensions = textureBase.extensions !== void 0 ? textureBase.extensions : null;
    this.extras = textureBase.extras !== void 0 ? textureBase.extras : null;
  }
}
class Sampler {
  magFilter;
  minFilter;
  wrapS;
  wrapT;
  name;
  extensions;
  extras;
  sampler;
  // or 'any' if your TS version lacks WebGLSampler definitions
  constructor(samplerBase) {
    this.magFilter = samplerBase.magFilter !== void 0 ? samplerBase.magFilter : null;
    this.minFilter = samplerBase.minFilter !== void 0 ? samplerBase.minFilter : null;
    this.wrapS = samplerBase.wrapS !== void 0 ? samplerBase.wrapS : 10497 /* REPEAT */;
    this.wrapT = samplerBase.wrapT !== void 0 ? samplerBase.wrapT : 10497 /* REPEAT */;
    this.name = samplerBase.name !== void 0 ? samplerBase.name : null;
    this.extensions = samplerBase.extensions !== void 0 ? samplerBase.extensions : null;
    this.extras = samplerBase.extras !== void 0 ? samplerBase.extras : null;
    this.sampler = null;
  }
}
class TextureInfo {
  index;
  texCoord;
  extensions;
  extras;
  constructor(textureInfoBase) {
    this.index = textureInfoBase.index;
    this.texCoord = textureInfoBase.texCoord !== void 0 ? textureInfoBase.texCoord : 0;
    this.extensions = textureInfoBase.extensions !== void 0 ? textureInfoBase.extensions : null;
    this.extras = textureInfoBase.extras !== void 0 ? textureInfoBase.extras : null;
  }
}
class Material {
  name;
  extensions;
  extras;
  pbrMetallicRoughness;
  normalTexture;
  occlusionTexture;
  emissiveTexture;
  emissiveFactor;
  alphaMode;
  alphaCutoff;
  doubleSided;
  constructor(materialBase) {
    this.name = materialBase.name !== void 0 ? materialBase.name : null;
    this.extensions = materialBase.extensions !== void 0 ? materialBase.extensions : null;
    this.extras = materialBase.extras !== void 0 ? materialBase.extras : null;
    this.pbrMetallicRoughness = new MaterialPbrMetallicRoughness(
      materialBase.pbrMetallicRoughness ?? {
        baseColorFactor: [1, 1, 1, 1],
        baseColorTexture: void 0,
        metallicFactor: 1,
        roughnessFactor: 1,
        metallicRoughnessTexture: void 0
      }
    );
    this.normalTexture = materialBase.normalTexture ? new MaterialNormalTextureInfo(materialBase.normalTexture) : null;
    this.occlusionTexture = materialBase.occlusionTexture ? new MaterialOcclusionTextureInfo(materialBase.occlusionTexture) : null;
    this.emissiveTexture = materialBase.emissiveTexture ? new TextureInfo(materialBase.emissiveTexture) : null;
    this.emissiveFactor = materialBase.emissiveFactor !== void 0 ? materialBase.emissiveFactor : [0, 0, 0];
    this.alphaMode = materialBase.alphaMode ?? "OPAQUE";
    this.alphaCutoff = materialBase.alphaCutoff ?? 0.5;
    this.doubleSided = !!materialBase.doubleSided;
  }
}
class MaterialPbrMetallicRoughness {
  baseColorFactor;
  baseColorTexture;
  metallicFactor;
  roughnessFactor;
  metallicRoughnessTexture;
  extensions;
  extras;
  constructor(base) {
    this.baseColorFactor = base.baseColorFactor ?? [1, 1, 1, 1];
    this.baseColorTexture = base.baseColorTexture ? new TextureInfo(base.baseColorTexture) : null;
    this.metallicFactor = base.metallicFactor ?? 1;
    this.roughnessFactor = base.roughnessFactor ?? 1;
    this.metallicRoughnessTexture = base.metallicRoughnessTexture ? new TextureInfo(base.metallicRoughnessTexture) : null;
    this.extensions = base.extensions ?? null;
    this.extras = base.extras ?? null;
  }
}
class MaterialNormalTextureInfo {
  index;
  texCoord;
  scale;
  extensions;
  extras;
  constructor(materialNormalTextureInfoBase) {
    this.index = materialNormalTextureInfoBase.index ?? 0;
    this.texCoord = materialNormalTextureInfoBase.texCoord ?? 0;
    this.scale = materialNormalTextureInfoBase.scale ?? 1;
    this.extensions = materialNormalTextureInfoBase.extensions ?? null;
    this.extras = materialNormalTextureInfoBase.extras ?? null;
  }
}
class MaterialOcclusionTextureInfo {
  index;
  texCoord;
  strength;
  extensions;
  extras;
  constructor(materialOcclusionTextureInfoBase) {
    this.index = materialOcclusionTextureInfoBase.index ?? 0;
    this.texCoord = materialOcclusionTextureInfoBase.texCoord ?? 0;
    this.strength = materialOcclusionTextureInfoBase.strength ?? 1;
    this.extensions = materialOcclusionTextureInfoBase.extensions ?? null;
    this.extras = materialOcclusionTextureInfoBase.extras ?? null;
  }
}
class Skin {
  inverseBindMatrices;
  skeleton;
  joints;
  name;
  extensions;
  extras;
  isLink;
  inverseBindMatricesData;
  inverseBindMatrix;
  constructor(skinBase, gltf) {
    this.inverseBindMatrices = typeof skinBase.inverseBindMatrices === "number" && gltf.accessors ? gltf.accessors[skinBase.inverseBindMatrices] : null;
    this.skeleton = typeof skinBase.skeleton === "number" && gltf.nodes ? gltf.nodes[skinBase.skeleton] : null;
    this.joints = [];
    if (skinBase.joints && gltf.nodes) {
      for (let i = 0; i < skinBase.joints.length; i++) {
        this.joints.push(gltf.nodes[skinBase.joints[i]]);
      }
    }
    this.name = skinBase.name !== void 0 ? skinBase.name : null;
    this.extensions = skinBase.extensions !== void 0 ? skinBase.extensions : null;
    this.extras = skinBase.extras !== void 0 ? skinBase.extras : null;
    this.isLink = false;
    this.inverseBindMatricesData = null;
    this.inverseBindMatrix = [];
    if (this.inverseBindMatrices) {
      this.inverseBindMatricesData = glTFLoaderBasic.getAccessorData(this.inverseBindMatrices);
      for (let i = 0; i < this.inverseBindMatricesData.length; i += 16) {
        this.inverseBindMatrix.push(
          Matrix4.fromValues(
            this.inverseBindMatricesData[i + 0],
            this.inverseBindMatricesData[i + 1],
            this.inverseBindMatricesData[i + 2],
            this.inverseBindMatricesData[i + 3],
            this.inverseBindMatricesData[i + 4],
            this.inverseBindMatricesData[i + 5],
            this.inverseBindMatricesData[i + 6],
            this.inverseBindMatricesData[i + 7],
            this.inverseBindMatricesData[i + 8],
            this.inverseBindMatricesData[i + 9],
            this.inverseBindMatricesData[i + 10],
            this.inverseBindMatricesData[i + 11],
            this.inverseBindMatricesData[i + 12],
            this.inverseBindMatricesData[i + 13],
            this.inverseBindMatricesData[i + 14],
            this.inverseBindMatricesData[i + 15]
          )
        );
      }
    }
  }
}
class SkinLink {
  inverseBindMatrices;
  skeleton;
  joints;
  name;
  extensions;
  extras;
  isLink;
  inverseBindMatricesData;
  inverseBindMatrix;
  constructor(linkedSkin, gltf, inverseBindMatricesAccessorID) {
    if (!gltf.skins) gltf.skins = [];
    gltf.skins.push(this);
    this.inverseBindMatrices = typeof inverseBindMatricesAccessorID === "number" && gltf.accessors ? gltf.accessors[inverseBindMatricesAccessorID] : null;
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
            this.inverseBindMatricesData[i],
            this.inverseBindMatricesData[i + 1],
            this.inverseBindMatricesData[i + 2],
            this.inverseBindMatricesData[i + 3],
            this.inverseBindMatricesData[i + 4],
            this.inverseBindMatricesData[i + 5],
            this.inverseBindMatricesData[i + 6],
            this.inverseBindMatricesData[i + 7],
            this.inverseBindMatricesData[i + 8],
            this.inverseBindMatricesData[i + 9],
            this.inverseBindMatricesData[i + 10],
            this.inverseBindMatricesData[i + 11],
            this.inverseBindMatricesData[i + 12],
            this.inverseBindMatricesData[i + 13],
            this.inverseBindMatricesData[i + 14],
            this.inverseBindMatricesData[i + 15]
          )
        );
      }
    }
  }
}
class Animation {
  samplers;
  channels;
  name;
  extensions;
  extras;
  constructor(animationBase, gltf) {
    this.samplers = [];
    for (let i = 0; i < animationBase.samplers.length; i++) {
      this.samplers.push(new AnimationSampler(animationBase.samplers[i], gltf));
    }
    this.channels = [];
    for (let i = 0; i < animationBase.channels.length; i++) {
      this.channels.push(new AnimationChannel(animationBase.channels[i], this));
    }
    this.name = animationBase.name !== void 0 ? animationBase.name : null;
    this.extensions = animationBase.extensions !== void 0 ? animationBase.extensions : null;
    this.extras = animationBase.extras !== void 0 ? animationBase.extras : null;
  }
}
class AnimationChannel {
  sampler;
  target;
  extensions;
  extras;
  constructor(animationChannelBase, animation) {
    this.sampler = animation.samplers[animationChannelBase.sampler];
    this.target = new AnimationChannelTarget(animationChannelBase.target);
    this.extensions = animationChannelBase.extensions !== void 0 ? animationChannelBase.extensions : null;
    this.extras = animationChannelBase.extras !== void 0 ? animationChannelBase.extras : null;
  }
}
class AnimationChannelTarget {
  nodeID;
  node;
  path;
  extensions;
  extras;
  constructor(animationChannelTargetBase) {
    this.nodeID = animationChannelTargetBase.node;
    this.node = null;
    this.path = animationChannelTargetBase.path;
    this.extensions = animationChannelTargetBase.extensions !== void 0 ? animationChannelTargetBase.extensions : null;
    this.extras = animationChannelTargetBase.extras !== void 0 ? animationChannelTargetBase.extras : null;
  }
}
class AnimationSampler {
  input;
  interpolation;
  output;
  extensions;
  extras;
  keyFrameIndices;
  keyFrameRaw;
  keyFrames;
  currentIndex;
  startTime;
  endTime;
  duration;
  constructor(animationSamplerBase, gltf) {
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
  updateKeyFrames(time) {
    while (this.currentIndex < this.keyFrameIndices.length - 2 && time >= this.keyFrameIndices[this.currentIndex + 1]) {
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
class GLTF {
  asset;
  scene = null;
  scenes = [];
  nodes = [];
  meshes = [];
  accessors = [];
  bufferViews = [];
  buffers = [];
  animations = [];
  cameras = [];
  textures = [];
  images = [];
  samplers = [];
  materials = [];
  skins = [];
  extensions;
  extensionsUsed;
  extensionsRequired;
  extras;
  constructor(glTFBase) {
    this.asset = glTFBase.asset;
    this.extensions = glTFBase.extensions !== void 0 ? glTFBase.extensions : null;
    this.extensionsUsed = glTFBase.extensionsUsed !== void 0 ? glTFBase.extensionsUsed : void 0;
    this.extensionsRequired = glTFBase.extensionsRequired !== void 0 ? glTFBase.extensionsRequired : void 0;
    this.extras = glTFBase.extras !== void 0 ? glTFBase.extras : null;
  }
}
class GLTFLoader {
  _glTF;
  glTF;
  baseUri = "";
  enableGLAvatar = false;
  skeletonGLTF = null;
  /**
   * Get base URL from the given URL
   * @param uri string The original URL
   * @returns string The base URL
   */
  getBaseUri(uri) {
    if (uri.lastIndexOf("/") !== -1) {
      return uri.substring(0, uri.lastIndexOf("/") + 1);
    }
    return "";
  }
  /**
   * infer attribute target for BufferView whether ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
   */
  inferBufferViewTarget() {
    if (!this._glTF || !this._glTF.meshes || !this._glTF.bufferViews || !this._glTF.accessors) return;
    this._glTF.meshes.forEach((mesh) => {
      mesh.primitives.forEach((primitive) => {
        for (const [attributeName, accessorIndex] of Object.entries(primitive.attributes)) {
          if (attributeName === "POSITION" || attributeName === "NORMAL" || attributeName === "TEXCOORD_0") {
            const accessor = this._glTF?.accessors?.[accessorIndex];
            if (accessor !== void 0 && accessor.bufferView !== void 0) {
              this._glTF.bufferViews[accessor.bufferView].target = 34962 /* ARRAY_BUFFER */;
            }
          }
        }
        if (primitive.indices !== void 0) {
          const indexAccessor = this._glTF.accessors[primitive.indices];
          const bufViewID = indexAccessor.bufferView;
          if (bufViewID !== void 0) {
            const bufferView = this._glTF.bufferViews[bufViewID];
            if (bufferView.target !== void 0) {
              if (bufferView.target !== 34963 /* ELEMENT_ARRAY_BUFFER */) {
                console.warn(
                  `BufferView ${primitive.indices} should be ELEMENT_ARRAY_BUFFER`
                );
              }
            } else {
              bufferView.target = 34963 /* ELEMENT_ARRAY_BUFFER */;
            }
          }
        }
      });
    });
  }
  async postProcess() {
    if (!this._glTF || !this.glTF) return;
    this.inferBufferViewTarget();
    if (this._glTF.bufferViews && this._glTF.buffers) {
      for (let i = 0; i < this._glTF.bufferViews.length; i++) {
        const bufferViewBase = this._glTF.bufferViews[i];
        const bufferIndex = bufferViewBase.buffer;
        const bufferData = this.glTF.buffers[bufferIndex];
        const bufferView = new BufferView(bufferViewBase, bufferData);
        this.glTF.bufferViews.push(bufferView);
      }
    }
    if (this._glTF.accessors && this.glTF.bufferViews) {
      for (let i = 0; i < this._glTF.accessors.length; i++) {
        const accessorBase = this._glTF.accessors[i];
        const bvIdx = accessorBase.bufferView ?? -1;
        const bv = bvIdx >= 0 ? this.glTF.bufferViews[bvIdx] : new BufferView({ buffer: 0, byteLength: 0 }, new ArrayBuffer(0));
        this.glTF.accessors.push(new Accessor(accessorBase, bv));
      }
    }
    if (this._glTF.cameras) {
      for (let i = 0; i < this._glTF.cameras.length; i++) {
        this.glTF.cameras.push(new Camera(this._glTF.cameras[i]));
      }
    }
    if (this._glTF.materials) {
      for (let i = 0; i < this._glTF.materials.length; i++) {
        this.glTF.materials.push(new Material(this._glTF.materials[i]));
      }
    }
    if (this._glTF.samplers) {
      for (let i = 0; i < this._glTF.samplers.length; i++) {
        this.glTF.samplers.push(new Sampler(this._glTF.samplers[i]));
      }
    }
    if (this._glTF.textures) {
      for (let i = 0; i < this._glTF.textures.length; i++) {
        const tex = new Texture(this._glTF.textures[i], this);
        this.glTF.textures.push(tex);
      }
    }
    if (this._glTF.meshes) {
      for (let i = 0; i < this._glTF.meshes.length; i++) {
        this.glTF.meshes.push(new Mesh(this._glTF.meshes[i], i, this));
      }
    }
    if (this._glTF.nodes) {
      for (let i = 0; i < this._glTF.nodes.length; i++) {
        this.glTF.nodes.push(new Node(this._glTF.nodes[i], i, this));
      }
      this.glTF.nodes.forEach((curNode) => {
        for (let i = 0; i < curNode.childrenID.length; i++) {
          curNode.children[i] = this.glTF.nodes[curNode.childrenID[i]];
          curNode.children[i].parent = curNode;
        }
      });
      if (this._glTF.scenes) {
        for (let i = 0; i < this._glTF.scenes.length; i++) {
          const sceneBase = this._glTF.scenes[i];
          if (!sceneBase.nodes) continue;
          this.glTF.scenes[i] = new Scene(sceneBase, this.glTF);
          const nodeCount = this.glTF.nodes.length;
          const nodeMatrices = Array.from({ length: nodeCount }, () => Matrix4.create());
          for (let j = 0; j < this.glTF.scenes[i].nodes.length; j++) {
            const rootNode = this.glTF.scenes[i].nodes[j];
            rootNode.traverseTwoFunction(
              (node, parent) => {
                if (parent) {
                  Matrix4.multiply(nodeMatrices[node.nodeID], nodeMatrices[parent.nodeID], node.modelMatrix);
                } else {
                  nodeMatrices[node.nodeID] = Matrix4.clone(node.modelMatrix);
                }
              },
              (node, parent) => {
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
    if (this._glTF.animations) {
      for (let i = 0; i < this._glTF.animations.length; i++) {
        const anim = new Animation(this._glTF.animations[i], this.glTF);
        this.glTF.animations.push(anim);
        anim.channels.forEach((channel) => {
          if (typeof channel.target.nodeID === "number") {
            channel.target.node = this.glTF.nodes[channel.target.nodeID];
          }
        });
      }
    }
    if (this._glTF.skins) {
      for (let i = 0; i < this._glTF.skins.length; i++) {
        const sk = new Skin(this._glTF.skins[i], this.glTF);
        this.glTF.skins.push(sk);
      }
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
  async loadGLTF(uri) {
    this.baseUri = this.getBaseUri(uri);
    try {
      const glTFBase = await fetch(uri).then((response) => {
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
    const loadBuffer = new Promise(async (resolve) => {
      if (this._glTF && this._glTF.buffers) {
        const bufferPromises = [];
        for (const bufferInfo of this._glTF.buffers) {
          if (!bufferInfo.uri) {
            bufferPromises.push(Promise.resolve(new ArrayBuffer(bufferInfo.byteLength)));
            continue;
          }
          try {
            const base64Magic = "data:application/octet-stream;base64,";
            if (bufferInfo.uri.indexOf(base64Magic) === 0) {
              const base64Data = bufferInfo.uri.slice(base64Magic.length);
              bufferPromises.push(
                Promise.resolve(Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))).then((u8) => u8.buffer)
              );
            } else {
              const url = this.baseUri + bufferInfo.uri;
              bufferPromises.push(
                fetch(url).then((response) => {
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
    const loadImage = new Promise(async (resolve) => {
      if (this._glTF && this._glTF.images) {
        const imagePromises = [];
        for (const imageInfo of this._glTF.images) {
          if (!imageInfo.uri) {
            imagePromises.push(Promise.resolve(new ImageBitmap()));
            continue;
          }
          try {
            const base64Magic = "data:image/png;base64,";
            if (imageInfo.uri.indexOf(base64Magic) === 0) {
              const base64Data = imageInfo.uri.slice(base64Magic.length);
              const arrayBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)).buffer;
              imagePromises.push(
                createImageBitmap(new Blob([arrayBuffer]))
              );
            } else {
              const url = this.baseUri + imageInfo.uri;
              imagePromises.push(
                fetch(url).then((response) => {
                  if (!response.ok) throw new Error("LoadingError: Could not fetch image.");
                  return response.blob();
                }).then((blob) => createImageBitmap(blob))
              );
            }
          } catch (err) {
            console.error(err);
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
var glTFLoaderBasic;
((glTFLoaderBasic2) => {
  function accessorTypeToNumComponents(type) {
    const map = /* @__PURE__ */ new Map([
      ["SCALAR", 1],
      ["VEC2", 2],
      ["VEC3", 3],
      ["VEC4", 4],
      ["MAT2", 4],
      ["MAT3", 9],
      ["MAT4", 16]
    ]);
    const val = map.get(type);
    if (val === void 0) {
      throw new Error(`No component count for accessor type: ${type}`);
    }
    return val;
  }
  glTFLoaderBasic2.accessorTypeToNumComponents = accessorTypeToNumComponents;
  function glTypeToTypedArray(type) {
    const map = /* @__PURE__ */ new Map([
      [5120, Int8Array],
      // gl.BYTE
      [5121, Uint8Array],
      // gl.UNSIGNED_BYTE
      [5122, Int16Array],
      // gl.SHORT
      [5123, Uint16Array],
      // gl.UNSIGNED_SHORT
      [5124, Int32Array],
      // gl.INT
      [5125, Uint32Array],
      // gl.UNSIGNED_INT
      [5126, Float32Array]
      // gl.FLOAT
    ]);
    const val = map.get(type);
    if (!val) {
      throw new Error(`No typed array constructor for glType: ${type}`);
    }
    return val;
  }
  glTFLoaderBasic2.glTypeToTypedArray = glTypeToTypedArray;
  function getAccessorData(accessor) {
    const ArrayCtor = glTypeToTypedArray(accessor.componentType);
    const numElems = accessor.count * accessorTypeToNumComponents(accessor.type);
    return new ArrayCtor(accessor.bufferView.data, accessor.byteOffset, numElems);
  }
  glTFLoaderBasic2.getAccessorData = getAccessorData;
})(glTFLoaderBasic || (glTFLoaderBasic = {}));

export { Accessor, AccessorComponentType, Animation, AnimationChannel, AnimationSampler, GLTF, GLTFLoader, MeshPrimitive, Node, Scene, Texture, TextureInfo, glTFLoaderBasic };
