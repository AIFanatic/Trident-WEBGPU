import { Components, Scene, PBRMaterial, GPU, Utils, Mathf, GameObject, InterleavedVertexAttribute, Assets, Component as Component$1, Geometry, IndexAttribute, VertexAttribute, Texture, Renderer, Input, Console } from '@trident/core';
import { OrbitControls } from '@trident/plugins/OrbitControls.js';
import { Environment } from '@trident/plugins/Environment/Environment.js';
import { Sky } from '@trident/plugins/Environment/Sky.js';
import { HDRParser } from '@trident/plugins/HDRParser.js';
import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';
import { PostProcessingPass } from '@trident/plugins/PostProcessing/PostProcessingPass.js';
import { PostProcessingSMAA } from '@trident/plugins/PostProcessing/effects/SMAA.js';

class Prefab {
  id;
  name;
  type;
  components = [];
  transform;
  children = [];
  assetPath;
  traverse(fn, prefab = this) {
    fn(prefab);
    for (const child of prefab.children) {
      this.traverse(fn, child);
    }
  }
  Deserialize(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.transform = data.transform;
    this.assetPath = data.assetPath;
    this.components = Array.isArray(data?.components) ? data.components : [];
    this.children = Array.isArray(data?.children) ? data.children.map((c) => Prefab.Deserialize(c)) : [];
    return this;
  }
  static Deserialize(data) {
    const prefab = new Prefab();
    prefab.Deserialize(data);
    return prefab;
  }
}

class AssetRegistry {
  static instanceCache = /* @__PURE__ */ new Map();
  static GetInstance(path) {
    return AssetRegistry.instanceCache.get(path);
  }
  static SetInstance(path, instance) {
    return AssetRegistry.instanceCache.set(path, instance);
  }
  static RemoveInstance(path) {
    return AssetRegistry.instanceCache.delete(path);
  }
  static Clear() {
    AssetRegistry.instanceCache.clear();
  }
}

function serializeVector2(v) {
  return { type: "@trident/core/math/Vector2", x: v.x, y: v.y };
}
function serializeVector3(v) {
  return { type: "@trident/core/math/Vector3", x: v.x, y: v.y, z: v.z };
}
function serializeQuaternion(q) {
  return { type: "@trident/core/math/Quaternion", x: q.x, y: q.y, z: q.z, w: q.w };
}
function serializeColor(c) {
  return { type: "@trident/core/math/Color", r: c.r, g: c.g, b: c.b, a: c.a };
}
function getArrayTypeName(arr) {
  if (arr instanceof Uint32Array) return "uint32";
  if (arr instanceof Uint16Array) return "uint16";
  if (arr instanceof Uint8Array) return "uint8";
  return "float32";
}
function serializeGeometryAttribute(attr) {
  const result = {
    attributeType: attr.type,
    array: Array.from(attr.array),
    arrayType: getArrayTypeName(attr.array),
    currentOffset: attr.currentOffset,
    currentSize: attr.currentSize
  };
  if (attr instanceof InterleavedVertexAttribute) {
    result.stride = attr.stride;
  }
  return result;
}
function serializeGeometryAsset(geometry) {
  return {
    assetPath: geometry.assetPath,
    id: geometry.id,
    name: geometry.name,
    attributes: Array.from(
      geometry.attributes,
      ([key, attribute]) => Object.assign(serializeGeometryAttribute(attribute), { name: key })
    ),
    index: geometry.index ? serializeGeometryAttribute(geometry.index) : void 0
  };
}
function serializeGeometryRef(geometry) {
  if (!geometry.assetPath) throw Error("Geometry doesn't have an assetPath.");
  return { id: geometry.id, name: geometry.name, assetPath: geometry.assetPath };
}
function serializeTexture(texture) {
  if (!texture.assetPath) throw Error("Texture doesn't have an assetPath.");
  return {
    assetPath: texture.assetPath,
    name: texture.name,
    id: texture.id,
    format: texture.format,
    generateMips: texture.mipLevels > 1
  };
}
const textureFields$1 = ["albedoMap", "normalMap", "armMap", "heightMap", "emissiveMap"];
const scalarFields$1 = ["roughness", "metalness", "doubleSided", "alphaCutoff", "unlit", "wireframe", "isSkinned", "isDeferred"];
function serializePBRMaterialParams(params) {
  const result = {
    albedoColor: serializeColor(params.albedoColor),
    emissiveColor: serializeColor(params.emissiveColor),
    repeat: serializeVector2(params.repeat),
    offset: serializeVector2(params.offset)
  };
  for (const field of textureFields$1) {
    const tex = params[field];
    if (tex && tex.assetPath) result[field] = serializeTexture(tex);
  }
  for (const field of scalarFields$1) {
    result[field] = params[field];
  }
  return result;
}
function serializeMaterialAsset(material) {
  if (material instanceof PBRMaterial) {
    return {
      assetPath: material.assetPath,
      type: PBRMaterial.type,
      shader: void 0,
      params: serializePBRMaterialParams(material.params)
    };
  }
  return {
    type: GPU.Material.type,
    assetPath: material.assetPath,
    shader: material.shader ? serializeShader(material.shader) : void 0,
    params: { isDeferred: material.params.isDeferred }
  };
}
function serializeMaterialRef(material) {
  if (material.assetPath) {
    const type = material instanceof PBRMaterial ? PBRMaterial.type : GPU.Material.type;
    return { type, id: material.id, assetPath: material.assetPath };
  }
  return serializeMaterialAsset(material);
}
function serializeShader(shader) {
  return {
    code: shader.params.code,
    defines: shader.params.defines,
    attributes: shader.params.attributes,
    uniforms: Object.entries(shader.params.uniforms).map(([key, value]) => ({
      group: value.group,
      binding: value.binding,
      type: value.type
    }))
  };
}
function serializeValue(value) {
  if (value === void 0 || value === null) return null;
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") return value;
  if (value instanceof Float32Array) return Array.from(value);
  if (value instanceof Array) return value;
  if (value instanceof Mathf.Vector3) return serializeVector3(value);
  if (value instanceof Mathf.Vector2) return serializeVector2(value);
  if (value instanceof Mathf.Color) return serializeColor(value);
  if (value instanceof Mathf.Quaternion) return serializeQuaternion(value);
  if (value instanceof GameObject) return { __ref: "GameObject", id: value.id };
  throw Error(`Could not serialize value: ${value}`);
}
function serializeComponent(component, metadata = {}) {
  if (component instanceof Components.Renderable) return serializeRenderable(component);
  if (component instanceof Components.Animator) return serializeAnimatorRef(component);
  const serializedFields = Utils.GetSerializedFields(component);
  const fields = {};
  for (const { name } of serializedFields) {
    fields[name] = serializeValue(component[name]);
  }
  const ctor = component.constructor;
  const assetPath = ctor.assetPath;
  const type = ctor.type || ctor.name;
  return { type, id: component.id, name: component.name, ...assetPath ? { assetPath } : {}, ...fields };
}
function serializeTransform(transform) {
  return {
    type: Components.Transform.type,
    localPosition: serializeVector3(transform.localPosition),
    localRotation: serializeQuaternion(transform.localRotation),
    scale: serializeVector3(transform.scale)
  };
}
function serializeRenderable(renderable) {
  return {
    type: renderable.constructor.type,
    geometry: serializeGeometryRef(renderable.geometry),
    material: serializeMaterialRef(renderable.material),
    enableShadows: renderable.enableShadows
  };
}
function serializeAnimatorAsset(animator) {
  const tracks = {};
  const collectTrackData = (root) => {
    const track = root.gameObject.GetComponent(Components.AnimationTrack);
    if (track && track.trackName && track.clips.length) {
      tracks[track.trackName] = track.clips;
    }
    for (const child of root.children) collectTrackData(child);
  };
  if (animator.gameObject) {
    collectTrackData(animator.gameObject.transform);
  }
  return {
    type: Components.Animator.type,
    assetPath: animator.assetPath,
    clips: animator.clips,
    tracks: Object.keys(tracks).length ? tracks : animator.tracksData
  };
}
function serializeAnimatorRef(animator) {
  if (animator.assetPath) {
    return { type: Components.Animator.type, id: animator.id, assetPath: animator.assetPath };
  }
  return serializeAnimatorAsset(animator);
}
function serializeGameObject(gameObject, metadata = {}) {
  const prefab = new Prefab();
  prefab.id = gameObject.id;
  prefab.name = gameObject.name;
  prefab.transform = serializeTransform(gameObject.transform);
  if (gameObject.assetPath) {
    prefab.assetPath = gameObject.assetPath;
    return prefab;
  }
  prefab.components = gameObject.GetComponents().map((c) => serializeComponent(c, metadata));
  for (const child of gameObject.transform.children) {
    prefab.children.push(serializeGameObject(child.gameObject, metadata));
  }
  return prefab;
}
function serializeScene(scene) {
  const serialized = {
    type: Scene.type,
    name: scene.name,
    mainCamera: Components.Camera.mainCamera?.id,
    gameObjects: []
  };
  for (const gameObject of scene.GetRootGameObjects()) {
    serialized.gameObjects.push(serializeGameObject(gameObject));
  }
  return serialized;
}

var browser = {exports: {}};

var hasRequiredBrowser;

function requireBrowser () {
	if (hasRequiredBrowser) return browser.exports;
	hasRequiredBrowser = 1;
	(function (module) {
		(module=>{
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		var __async = (__this, __arguments, generator) => {
		  return new Promise((resolve, reject) => {
		    var fulfilled = (value) => {
		      try {
		        step(generator.next(value));
		      } catch (e) {
		        reject(e);
		      }
		    };
		    var rejected = (value) => {
		      try {
		        step(generator.throw(value));
		      } catch (e) {
		        reject(e);
		      }
		    };
		    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
		    step((generator = generator.apply(__this, __arguments)).next());
		  });
		};

		// lib/npm/browser.ts
		var browser_exports = {};
		__export(browser_exports, {
		  analyzeMetafile: () => analyzeMetafile,
		  analyzeMetafileSync: () => analyzeMetafileSync,
		  build: () => build,
		  buildSync: () => buildSync,
		  context: () => context,
		  default: () => browser_default,
		  formatMessages: () => formatMessages,
		  formatMessagesSync: () => formatMessagesSync,
		  initialize: () => initialize,
		  stop: () => stop,
		  transform: () => transform,
		  transformSync: () => transformSync,
		  version: () => version
		});
		module.exports = __toCommonJS(browser_exports);

		// lib/shared/stdio_protocol.ts
		function encodePacket(packet) {
		  let visit = (value) => {
		    if (value === null) {
		      bb.write8(0);
		    } else if (typeof value === "boolean") {
		      bb.write8(1);
		      bb.write8(+value);
		    } else if (typeof value === "number") {
		      bb.write8(2);
		      bb.write32(value | 0);
		    } else if (typeof value === "string") {
		      bb.write8(3);
		      bb.write(encodeUTF8(value));
		    } else if (value instanceof Uint8Array) {
		      bb.write8(4);
		      bb.write(value);
		    } else if (value instanceof Array) {
		      bb.write8(5);
		      bb.write32(value.length);
		      for (let item of value) {
		        visit(item);
		      }
		    } else {
		      let keys = Object.keys(value);
		      bb.write8(6);
		      bb.write32(keys.length);
		      for (let key of keys) {
		        bb.write(encodeUTF8(key));
		        visit(value[key]);
		      }
		    }
		  };
		  let bb = new ByteBuffer();
		  bb.write32(0);
		  bb.write32(packet.id << 1 | +!packet.isRequest);
		  visit(packet.value);
		  writeUInt32LE(bb.buf, bb.len - 4, 0);
		  return bb.buf.subarray(0, bb.len);
		}
		function decodePacket(bytes) {
		  let visit = () => {
		    switch (bb.read8()) {
		      case 0:
		        return null;
		      case 1:
		        return !!bb.read8();
		      case 2:
		        return bb.read32();
		      case 3:
		        return decodeUTF8(bb.read());
		      case 4:
		        return bb.read();
		      case 5: {
		        let count = bb.read32();
		        let value2 = [];
		        for (let i = 0; i < count; i++) {
		          value2.push(visit());
		        }
		        return value2;
		      }
		      case 6: {
		        let count = bb.read32();
		        let value2 = {};
		        for (let i = 0; i < count; i++) {
		          value2[decodeUTF8(bb.read())] = visit();
		        }
		        return value2;
		      }
		      default:
		        throw new Error("Invalid packet");
		    }
		  };
		  let bb = new ByteBuffer(bytes);
		  let id = bb.read32();
		  let isRequest = (id & 1) === 0;
		  id >>>= 1;
		  let value = visit();
		  if (bb.ptr !== bytes.length) {
		    throw new Error("Invalid packet");
		  }
		  return { id, isRequest, value };
		}
		var ByteBuffer = class {
		  constructor(buf = new Uint8Array(1024)) {
		    this.buf = buf;
		    this.len = 0;
		    this.ptr = 0;
		  }
		  _write(delta) {
		    if (this.len + delta > this.buf.length) {
		      let clone = new Uint8Array((this.len + delta) * 2);
		      clone.set(this.buf);
		      this.buf = clone;
		    }
		    this.len += delta;
		    return this.len - delta;
		  }
		  write8(value) {
		    let offset = this._write(1);
		    this.buf[offset] = value;
		  }
		  write32(value) {
		    let offset = this._write(4);
		    writeUInt32LE(this.buf, value, offset);
		  }
		  write(bytes) {
		    let offset = this._write(4 + bytes.length);
		    writeUInt32LE(this.buf, bytes.length, offset);
		    this.buf.set(bytes, offset + 4);
		  }
		  _read(delta) {
		    if (this.ptr + delta > this.buf.length) {
		      throw new Error("Invalid packet");
		    }
		    this.ptr += delta;
		    return this.ptr - delta;
		  }
		  read8() {
		    return this.buf[this._read(1)];
		  }
		  read32() {
		    return readUInt32LE(this.buf, this._read(4));
		  }
		  read() {
		    let length = this.read32();
		    let bytes = new Uint8Array(length);
		    let ptr = this._read(bytes.length);
		    bytes.set(this.buf.subarray(ptr, ptr + length));
		    return bytes;
		  }
		};
		var encodeUTF8;
		var decodeUTF8;
		var encodeInvariant;
		if (typeof TextEncoder !== "undefined" && typeof TextDecoder !== "undefined") {
		  let encoder = new TextEncoder();
		  let decoder = new TextDecoder();
		  encodeUTF8 = (text) => encoder.encode(text);
		  decodeUTF8 = (bytes) => decoder.decode(bytes);
		  encodeInvariant = 'new TextEncoder().encode("")';
		} else if (typeof Buffer !== "undefined") {
		  encodeUTF8 = (text) => Buffer.from(text);
		  decodeUTF8 = (bytes) => {
		    let { buffer, byteOffset, byteLength } = bytes;
		    return Buffer.from(buffer, byteOffset, byteLength).toString();
		  };
		  encodeInvariant = 'Buffer.from("")';
		} else {
		  throw new Error("No UTF-8 codec found");
		}
		if (!(encodeUTF8("") instanceof Uint8Array))
		  throw new Error(`Invariant violation: "${encodeInvariant} instanceof Uint8Array" is incorrectly false

This indicates that your JavaScript environment is broken. You cannot use
esbuild in this environment because esbuild relies on this invariant. This
is not a problem with esbuild. You need to fix your environment instead.
`);
		function readUInt32LE(buffer, offset) {
		  return (buffer[offset++] | buffer[offset++] << 8 | buffer[offset++] << 16 | buffer[offset++] << 24) >>> 0;
		}
		function writeUInt32LE(buffer, value, offset) {
		  buffer[offset++] = value;
		  buffer[offset++] = value >> 8;
		  buffer[offset++] = value >> 16;
		  buffer[offset++] = value >> 24;
		}

		// lib/shared/uint8array_json_parser.ts
		var fromCharCode = String.fromCharCode;
		function throwSyntaxError(bytes, index, message) {
		  const c = bytes[index];
		  let line = 1;
		  let column = 0;
		  for (let i = 0; i < index; i++) {
		    if (bytes[i] === 10 /* Newline */) {
		      line++;
		      column = 0;
		    } else {
		      column++;
		    }
		  }
		  throw new SyntaxError(
		    message ? message : index === bytes.length ? "Unexpected end of input while parsing JSON" : c >= 32 && c <= 126 ? `Unexpected character ${fromCharCode(c)} in JSON at position ${index} (line ${line}, column ${column})` : `Unexpected byte 0x${c.toString(16)} in JSON at position ${index} (line ${line}, column ${column})`
		  );
		}
		function JSON_parse(bytes) {
		  if (!(bytes instanceof Uint8Array)) {
		    throw new Error(`JSON input must be a Uint8Array`);
		  }
		  const propertyStack = [];
		  const objectStack = [];
		  const stateStack = [];
		  const length = bytes.length;
		  let property = null;
		  let state = 0 /* TopLevel */;
		  let object;
		  let i = 0;
		  while (i < length) {
		    let c = bytes[i++];
		    if (c <= 32 /* Space */) {
		      continue;
		    }
		    let value;
		    if (state === 2 /* Object */ && property === null && c !== 34 /* Quote */ && c !== 125 /* CloseBrace */) {
		      throwSyntaxError(bytes, --i);
		    }
		    switch (c) {
		      // True
		      case 116 /* LowerT */: {
		        if (bytes[i++] !== 114 /* LowerR */ || bytes[i++] !== 117 /* LowerU */ || bytes[i++] !== 101 /* LowerE */) {
		          throwSyntaxError(bytes, --i);
		        }
		        value = true;
		        break;
		      }
		      // False
		      case 102 /* LowerF */: {
		        if (bytes[i++] !== 97 /* LowerA */ || bytes[i++] !== 108 /* LowerL */ || bytes[i++] !== 115 /* LowerS */ || bytes[i++] !== 101 /* LowerE */) {
		          throwSyntaxError(bytes, --i);
		        }
		        value = false;
		        break;
		      }
		      // Null
		      case 110 /* LowerN */: {
		        if (bytes[i++] !== 117 /* LowerU */ || bytes[i++] !== 108 /* LowerL */ || bytes[i++] !== 108 /* LowerL */) {
		          throwSyntaxError(bytes, --i);
		        }
		        value = null;
		        break;
		      }
		      // Number begin
		      case 45 /* Minus */:
		      case 46 /* Dot */:
		      case 48 /* Digit0 */:
		      case 49 /* Digit1 */:
		      case 50 /* Digit2 */:
		      case 51 /* Digit3 */:
		      case 52 /* Digit4 */:
		      case 53 /* Digit5 */:
		      case 54 /* Digit6 */:
		      case 55 /* Digit7 */:
		      case 56 /* Digit8 */:
		      case 57 /* Digit9 */: {
		        let index = i;
		        value = fromCharCode(c);
		        c = bytes[i];
		        while (true) {
		          switch (c) {
		            case 43 /* Plus */:
		            case 45 /* Minus */:
		            case 46 /* Dot */:
		            case 48 /* Digit0 */:
		            case 49 /* Digit1 */:
		            case 50 /* Digit2 */:
		            case 51 /* Digit3 */:
		            case 52 /* Digit4 */:
		            case 53 /* Digit5 */:
		            case 54 /* Digit6 */:
		            case 55 /* Digit7 */:
		            case 56 /* Digit8 */:
		            case 57 /* Digit9 */:
		            case 101 /* LowerE */:
		            case 69 /* UpperE */: {
		              value += fromCharCode(c);
		              c = bytes[++i];
		              continue;
		            }
		          }
		          break;
		        }
		        value = +value;
		        if (isNaN(value)) {
		          throwSyntaxError(bytes, --index, "Invalid number");
		        }
		        break;
		      }
		      // String begin
		      case 34 /* Quote */: {
		        value = "";
		        while (true) {
		          if (i >= length) {
		            throwSyntaxError(bytes, length);
		          }
		          c = bytes[i++];
		          if (c === 34 /* Quote */) {
		            break;
		          } else if (c === 92 /* Backslash */) {
		            switch (bytes[i++]) {
		              // Normal escape sequence
		              case 34 /* Quote */:
		                value += '"';
		                break;
		              case 47 /* Slash */:
		                value += "/";
		                break;
		              case 92 /* Backslash */:
		                value += "\\";
		                break;
		              case 98 /* LowerB */:
		                value += "\b";
		                break;
		              case 102 /* LowerF */:
		                value += "\f";
		                break;
		              case 110 /* LowerN */:
		                value += "\n";
		                break;
		              case 114 /* LowerR */:
		                value += "\r";
		                break;
		              case 116 /* LowerT */:
		                value += "	";
		                break;
		              // Unicode escape sequence
		              case 117 /* LowerU */: {
		                let code = 0;
		                for (let j = 0; j < 4; j++) {
		                  c = bytes[i++];
		                  code <<= 4;
		                  if (c >= 48 /* Digit0 */ && c <= 57 /* Digit9 */) code |= c - 48 /* Digit0 */;
		                  else if (c >= 97 /* LowerA */ && c <= 102 /* LowerF */) code |= c + (10 - 97 /* LowerA */);
		                  else if (c >= 65 /* UpperA */ && c <= 70 /* UpperF */) code |= c + (10 - 65 /* UpperA */);
		                  else throwSyntaxError(bytes, --i);
		                }
		                value += fromCharCode(code);
		                break;
		              }
		              // Invalid escape sequence
		              default:
		                throwSyntaxError(bytes, --i);
		                break;
		            }
		          } else if (c <= 127) {
		            value += fromCharCode(c);
		          } else if ((c & 224) === 192) {
		            value += fromCharCode((c & 31) << 6 | bytes[i++] & 63);
		          } else if ((c & 240) === 224) {
		            value += fromCharCode((c & 15) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63);
		          } else if ((c & 248) == 240) {
		            let codePoint = (c & 7) << 18 | (bytes[i++] & 63) << 12 | (bytes[i++] & 63) << 6 | bytes[i++] & 63;
		            if (codePoint > 65535) {
		              codePoint -= 65536;
		              value += fromCharCode(codePoint >> 10 & 1023 | 55296);
		              codePoint = 56320 | codePoint & 1023;
		            }
		            value += fromCharCode(codePoint);
		          }
		        }
		        value[0];
		        break;
		      }
		      // Array begin
		      case 91 /* OpenBracket */: {
		        value = [];
		        propertyStack.push(property);
		        objectStack.push(object);
		        stateStack.push(state);
		        property = null;
		        object = value;
		        state = 1 /* Array */;
		        continue;
		      }
		      // Object begin
		      case 123 /* OpenBrace */: {
		        value = {};
		        propertyStack.push(property);
		        objectStack.push(object);
		        stateStack.push(state);
		        property = null;
		        object = value;
		        state = 2 /* Object */;
		        continue;
		      }
		      // Array end
		      case 93 /* CloseBracket */: {
		        if (state !== 1 /* Array */) {
		          throwSyntaxError(bytes, --i);
		        }
		        value = object;
		        property = propertyStack.pop();
		        object = objectStack.pop();
		        state = stateStack.pop();
		        break;
		      }
		      // Object end
		      case 125 /* CloseBrace */: {
		        if (state !== 2 /* Object */) {
		          throwSyntaxError(bytes, --i);
		        }
		        value = object;
		        property = propertyStack.pop();
		        object = objectStack.pop();
		        state = stateStack.pop();
		        break;
		      }
		      default: {
		        throwSyntaxError(bytes, --i);
		      }
		    }
		    c = bytes[i];
		    while (c <= 32 /* Space */) {
		      c = bytes[++i];
		    }
		    switch (state) {
		      case 0 /* TopLevel */: {
		        if (i === length) {
		          return value;
		        }
		        break;
		      }
		      case 1 /* Array */: {
		        object.push(value);
		        if (c === 44 /* Comma */) {
		          i++;
		          continue;
		        }
		        if (c === 93 /* CloseBracket */) {
		          continue;
		        }
		        break;
		      }
		      case 2 /* Object */: {
		        if (property === null) {
		          property = value;
		          if (c === 58 /* Colon */) {
		            i++;
		            continue;
		          }
		        } else {
		          object[property] = value;
		          property = null;
		          if (c === 44 /* Comma */) {
		            i++;
		            continue;
		          }
		          if (c === 125 /* CloseBrace */) {
		            continue;
		          }
		        }
		        break;
		      }
		    }
		    break;
		  }
		  throwSyntaxError(bytes, i);
		}

		// lib/shared/common.ts
		var quote = JSON.stringify;
		var buildLogLevelDefault = "warning";
		var transformLogLevelDefault = "silent";
		function validateAndJoinStringArray(values, what) {
		  const toJoin = [];
		  for (const value of values) {
		    validateStringValue(value, what);
		    if (value.indexOf(",") >= 0) throw new Error(`Invalid ${what}: ${value}`);
		    toJoin.push(value);
		  }
		  return toJoin.join(",");
		}
		var canBeAnything = () => null;
		var mustBeBoolean = (value) => typeof value === "boolean" ? null : "a boolean";
		var mustBeString = (value) => typeof value === "string" ? null : "a string";
		var mustBeRegExp = (value) => value instanceof RegExp ? null : "a RegExp object";
		var mustBeInteger = (value) => typeof value === "number" && value === (value | 0) ? null : "an integer";
		var mustBeValidPortNumber = (value) => typeof value === "number" && value === (value | 0) && value >= 0 && value <= 65535 ? null : "a valid port number";
		var mustBeFunction = (value) => typeof value === "function" ? null : "a function";
		var mustBeArray = (value) => Array.isArray(value) ? null : "an array";
		var mustBeArrayOfStrings = (value) => Array.isArray(value) && value.every((x) => typeof x === "string") ? null : "an array of strings";
		var mustBeObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? null : "an object";
		var mustBeEntryPoints = (value) => typeof value === "object" && value !== null ? null : "an array or an object";
		var mustBeWebAssemblyModule = (value) => value instanceof WebAssembly.Module ? null : "a WebAssembly.Module";
		var mustBeObjectOrNull = (value) => typeof value === "object" && !Array.isArray(value) ? null : "an object or null";
		var mustBeStringOrBoolean = (value) => typeof value === "string" || typeof value === "boolean" ? null : "a string or a boolean";
		var mustBeStringOrObject = (value) => typeof value === "string" || typeof value === "object" && value !== null && !Array.isArray(value) ? null : "a string or an object";
		var mustBeStringOrArrayOfStrings = (value) => typeof value === "string" || Array.isArray(value) && value.every((x) => typeof x === "string") ? null : "a string or an array of strings";
		var mustBeStringOrUint8Array = (value) => typeof value === "string" || value instanceof Uint8Array ? null : "a string or a Uint8Array";
		var mustBeStringOrURL = (value) => typeof value === "string" || value instanceof URL ? null : "a string or a URL";
		function getFlag(object, keys, key, mustBeFn) {
		  let value = object[key];
		  keys[key + ""] = true;
		  if (value === void 0) return void 0;
		  let mustBe = mustBeFn(value);
		  if (mustBe !== null) throw new Error(`${quote(key)} must be ${mustBe}`);
		  return value;
		}
		function checkForInvalidFlags(object, keys, where) {
		  for (let key in object) {
		    if (!(key in keys)) {
		      throw new Error(`Invalid option ${where}: ${quote(key)}`);
		    }
		  }
		}
		function validateInitializeOptions(options) {
		  let keys = /* @__PURE__ */ Object.create(null);
		  let wasmURL = getFlag(options, keys, "wasmURL", mustBeStringOrURL);
		  let wasmModule = getFlag(options, keys, "wasmModule", mustBeWebAssemblyModule);
		  let worker = getFlag(options, keys, "worker", mustBeBoolean);
		  checkForInvalidFlags(options, keys, "in initialize() call");
		  return {
		    wasmURL,
		    wasmModule,
		    worker
		  };
		}
		function validateMangleCache(mangleCache) {
		  let validated;
		  if (mangleCache !== void 0) {
		    validated = /* @__PURE__ */ Object.create(null);
		    for (let key in mangleCache) {
		      let value = mangleCache[key];
		      if (typeof value === "string" || value === false) {
		        validated[key] = value;
		      } else {
		        throw new Error(`Expected ${quote(key)} in mangle cache to map to either a string or false`);
		      }
		    }
		  }
		  return validated;
		}
		function pushLogFlags(flags, options, keys, isTTY, logLevelDefault) {
		  let color = getFlag(options, keys, "color", mustBeBoolean);
		  let logLevel = getFlag(options, keys, "logLevel", mustBeString);
		  let logLimit = getFlag(options, keys, "logLimit", mustBeInteger);
		  if (color !== void 0) flags.push(`--color=${color}`);
		  else if (isTTY) flags.push(`--color=true`);
		  flags.push(`--log-level=${logLevel || logLevelDefault}`);
		  flags.push(`--log-limit=${logLimit || 0}`);
		}
		function validateStringValue(value, what, key) {
		  if (typeof value !== "string") {
		    throw new Error(`Expected value for ${what}${key !== void 0 ? " " + quote(key) : ""} to be a string, got ${typeof value} instead`);
		  }
		  return value;
		}
		function pushCommonFlags(flags, options, keys) {
		  let legalComments = getFlag(options, keys, "legalComments", mustBeString);
		  let sourceRoot = getFlag(options, keys, "sourceRoot", mustBeString);
		  let sourcesContent = getFlag(options, keys, "sourcesContent", mustBeBoolean);
		  let target = getFlag(options, keys, "target", mustBeStringOrArrayOfStrings);
		  let format = getFlag(options, keys, "format", mustBeString);
		  let globalName = getFlag(options, keys, "globalName", mustBeString);
		  let mangleProps = getFlag(options, keys, "mangleProps", mustBeRegExp);
		  let reserveProps = getFlag(options, keys, "reserveProps", mustBeRegExp);
		  let mangleQuoted = getFlag(options, keys, "mangleQuoted", mustBeBoolean);
		  let minify = getFlag(options, keys, "minify", mustBeBoolean);
		  let minifySyntax = getFlag(options, keys, "minifySyntax", mustBeBoolean);
		  let minifyWhitespace = getFlag(options, keys, "minifyWhitespace", mustBeBoolean);
		  let minifyIdentifiers = getFlag(options, keys, "minifyIdentifiers", mustBeBoolean);
		  let lineLimit = getFlag(options, keys, "lineLimit", mustBeInteger);
		  let drop = getFlag(options, keys, "drop", mustBeArrayOfStrings);
		  let dropLabels = getFlag(options, keys, "dropLabels", mustBeArrayOfStrings);
		  let charset = getFlag(options, keys, "charset", mustBeString);
		  let treeShaking = getFlag(options, keys, "treeShaking", mustBeBoolean);
		  let ignoreAnnotations = getFlag(options, keys, "ignoreAnnotations", mustBeBoolean);
		  let jsx = getFlag(options, keys, "jsx", mustBeString);
		  let jsxFactory = getFlag(options, keys, "jsxFactory", mustBeString);
		  let jsxFragment = getFlag(options, keys, "jsxFragment", mustBeString);
		  let jsxImportSource = getFlag(options, keys, "jsxImportSource", mustBeString);
		  let jsxDev = getFlag(options, keys, "jsxDev", mustBeBoolean);
		  let jsxSideEffects = getFlag(options, keys, "jsxSideEffects", mustBeBoolean);
		  let define = getFlag(options, keys, "define", mustBeObject);
		  let logOverride = getFlag(options, keys, "logOverride", mustBeObject);
		  let supported = getFlag(options, keys, "supported", mustBeObject);
		  let pure = getFlag(options, keys, "pure", mustBeArrayOfStrings);
		  let keepNames = getFlag(options, keys, "keepNames", mustBeBoolean);
		  let platform = getFlag(options, keys, "platform", mustBeString);
		  let tsconfigRaw = getFlag(options, keys, "tsconfigRaw", mustBeStringOrObject);
		  let absPaths = getFlag(options, keys, "absPaths", mustBeArrayOfStrings);
		  if (legalComments) flags.push(`--legal-comments=${legalComments}`);
		  if (sourceRoot !== void 0) flags.push(`--source-root=${sourceRoot}`);
		  if (sourcesContent !== void 0) flags.push(`--sources-content=${sourcesContent}`);
		  if (target) flags.push(`--target=${validateAndJoinStringArray(Array.isArray(target) ? target : [target], "target")}`);
		  if (format) flags.push(`--format=${format}`);
		  if (globalName) flags.push(`--global-name=${globalName}`);
		  if (platform) flags.push(`--platform=${platform}`);
		  if (tsconfigRaw) flags.push(`--tsconfig-raw=${typeof tsconfigRaw === "string" ? tsconfigRaw : JSON.stringify(tsconfigRaw)}`);
		  if (minify) flags.push("--minify");
		  if (minifySyntax) flags.push("--minify-syntax");
		  if (minifyWhitespace) flags.push("--minify-whitespace");
		  if (minifyIdentifiers) flags.push("--minify-identifiers");
		  if (lineLimit) flags.push(`--line-limit=${lineLimit}`);
		  if (charset) flags.push(`--charset=${charset}`);
		  if (treeShaking !== void 0) flags.push(`--tree-shaking=${treeShaking}`);
		  if (ignoreAnnotations) flags.push(`--ignore-annotations`);
		  if (drop) for (let what of drop) flags.push(`--drop:${validateStringValue(what, "drop")}`);
		  if (dropLabels) flags.push(`--drop-labels=${validateAndJoinStringArray(dropLabels, "drop label")}`);
		  if (absPaths) flags.push(`--abs-paths=${validateAndJoinStringArray(absPaths, "abs paths")}`);
		  if (mangleProps) flags.push(`--mangle-props=${jsRegExpToGoRegExp(mangleProps)}`);
		  if (reserveProps) flags.push(`--reserve-props=${jsRegExpToGoRegExp(reserveProps)}`);
		  if (mangleQuoted !== void 0) flags.push(`--mangle-quoted=${mangleQuoted}`);
		  if (jsx) flags.push(`--jsx=${jsx}`);
		  if (jsxFactory) flags.push(`--jsx-factory=${jsxFactory}`);
		  if (jsxFragment) flags.push(`--jsx-fragment=${jsxFragment}`);
		  if (jsxImportSource) flags.push(`--jsx-import-source=${jsxImportSource}`);
		  if (jsxDev) flags.push(`--jsx-dev`);
		  if (jsxSideEffects) flags.push(`--jsx-side-effects`);
		  if (define) {
		    for (let key in define) {
		      if (key.indexOf("=") >= 0) throw new Error(`Invalid define: ${key}`);
		      flags.push(`--define:${key}=${validateStringValue(define[key], "define", key)}`);
		    }
		  }
		  if (logOverride) {
		    for (let key in logOverride) {
		      if (key.indexOf("=") >= 0) throw new Error(`Invalid log override: ${key}`);
		      flags.push(`--log-override:${key}=${validateStringValue(logOverride[key], "log override", key)}`);
		    }
		  }
		  if (supported) {
		    for (let key in supported) {
		      if (key.indexOf("=") >= 0) throw new Error(`Invalid supported: ${key}`);
		      const value = supported[key];
		      if (typeof value !== "boolean") throw new Error(`Expected value for supported ${quote(key)} to be a boolean, got ${typeof value} instead`);
		      flags.push(`--supported:${key}=${value}`);
		    }
		  }
		  if (pure) for (let fn of pure) flags.push(`--pure:${validateStringValue(fn, "pure")}`);
		  if (keepNames) flags.push(`--keep-names`);
		}
		function flagsForBuildOptions(callName, options, isTTY, logLevelDefault, writeDefault) {
		  var _a;
		  let flags = [];
		  let entries = [];
		  let keys = /* @__PURE__ */ Object.create(null);
		  let stdinContents = null;
		  let stdinResolveDir = null;
		  pushLogFlags(flags, options, keys, isTTY, logLevelDefault);
		  pushCommonFlags(flags, options, keys);
		  let sourcemap = getFlag(options, keys, "sourcemap", mustBeStringOrBoolean);
		  let bundle = getFlag(options, keys, "bundle", mustBeBoolean);
		  let splitting = getFlag(options, keys, "splitting", mustBeBoolean);
		  let preserveSymlinks = getFlag(options, keys, "preserveSymlinks", mustBeBoolean);
		  let metafile = getFlag(options, keys, "metafile", mustBeBoolean);
		  let outfile = getFlag(options, keys, "outfile", mustBeString);
		  let outdir = getFlag(options, keys, "outdir", mustBeString);
		  let outbase = getFlag(options, keys, "outbase", mustBeString);
		  let tsconfig = getFlag(options, keys, "tsconfig", mustBeString);
		  let resolveExtensions = getFlag(options, keys, "resolveExtensions", mustBeArrayOfStrings);
		  let nodePathsInput = getFlag(options, keys, "nodePaths", mustBeArrayOfStrings);
		  let mainFields = getFlag(options, keys, "mainFields", mustBeArrayOfStrings);
		  let conditions = getFlag(options, keys, "conditions", mustBeArrayOfStrings);
		  let external = getFlag(options, keys, "external", mustBeArrayOfStrings);
		  let packages = getFlag(options, keys, "packages", mustBeString);
		  let alias = getFlag(options, keys, "alias", mustBeObject);
		  let loader = getFlag(options, keys, "loader", mustBeObject);
		  let outExtension = getFlag(options, keys, "outExtension", mustBeObject);
		  let publicPath = getFlag(options, keys, "publicPath", mustBeString);
		  let entryNames = getFlag(options, keys, "entryNames", mustBeString);
		  let chunkNames = getFlag(options, keys, "chunkNames", mustBeString);
		  let assetNames = getFlag(options, keys, "assetNames", mustBeString);
		  let inject = getFlag(options, keys, "inject", mustBeArrayOfStrings);
		  let banner = getFlag(options, keys, "banner", mustBeObject);
		  let footer = getFlag(options, keys, "footer", mustBeObject);
		  let entryPoints = getFlag(options, keys, "entryPoints", mustBeEntryPoints);
		  let absWorkingDir = getFlag(options, keys, "absWorkingDir", mustBeString);
		  let stdin = getFlag(options, keys, "stdin", mustBeObject);
		  let write = (_a = getFlag(options, keys, "write", mustBeBoolean)) != null ? _a : writeDefault;
		  let allowOverwrite = getFlag(options, keys, "allowOverwrite", mustBeBoolean);
		  let mangleCache = getFlag(options, keys, "mangleCache", mustBeObject);
		  keys.plugins = true;
		  checkForInvalidFlags(options, keys, `in ${callName}() call`);
		  if (sourcemap) flags.push(`--sourcemap${sourcemap === true ? "" : `=${sourcemap}`}`);
		  if (bundle) flags.push("--bundle");
		  if (allowOverwrite) flags.push("--allow-overwrite");
		  if (splitting) flags.push("--splitting");
		  if (preserveSymlinks) flags.push("--preserve-symlinks");
		  if (metafile) flags.push(`--metafile`);
		  if (outfile) flags.push(`--outfile=${outfile}`);
		  if (outdir) flags.push(`--outdir=${outdir}`);
		  if (outbase) flags.push(`--outbase=${outbase}`);
		  if (tsconfig) flags.push(`--tsconfig=${tsconfig}`);
		  if (packages) flags.push(`--packages=${packages}`);
		  if (resolveExtensions) flags.push(`--resolve-extensions=${validateAndJoinStringArray(resolveExtensions, "resolve extension")}`);
		  if (publicPath) flags.push(`--public-path=${publicPath}`);
		  if (entryNames) flags.push(`--entry-names=${entryNames}`);
		  if (chunkNames) flags.push(`--chunk-names=${chunkNames}`);
		  if (assetNames) flags.push(`--asset-names=${assetNames}`);
		  if (mainFields) flags.push(`--main-fields=${validateAndJoinStringArray(mainFields, "main field")}`);
		  if (conditions) flags.push(`--conditions=${validateAndJoinStringArray(conditions, "condition")}`);
		  if (external) for (let name of external) flags.push(`--external:${validateStringValue(name, "external")}`);
		  if (alias) {
		    for (let old in alias) {
		      if (old.indexOf("=") >= 0) throw new Error(`Invalid package name in alias: ${old}`);
		      flags.push(`--alias:${old}=${validateStringValue(alias[old], "alias", old)}`);
		    }
		  }
		  if (banner) {
		    for (let type in banner) {
		      if (type.indexOf("=") >= 0) throw new Error(`Invalid banner file type: ${type}`);
		      flags.push(`--banner:${type}=${validateStringValue(banner[type], "banner", type)}`);
		    }
		  }
		  if (footer) {
		    for (let type in footer) {
		      if (type.indexOf("=") >= 0) throw new Error(`Invalid footer file type: ${type}`);
		      flags.push(`--footer:${type}=${validateStringValue(footer[type], "footer", type)}`);
		    }
		  }
		  if (inject) for (let path of inject) flags.push(`--inject:${validateStringValue(path, "inject")}`);
		  if (loader) {
		    for (let ext in loader) {
		      if (ext.indexOf("=") >= 0) throw new Error(`Invalid loader extension: ${ext}`);
		      flags.push(`--loader:${ext}=${validateStringValue(loader[ext], "loader", ext)}`);
		    }
		  }
		  if (outExtension) {
		    for (let ext in outExtension) {
		      if (ext.indexOf("=") >= 0) throw new Error(`Invalid out extension: ${ext}`);
		      flags.push(`--out-extension:${ext}=${validateStringValue(outExtension[ext], "out extension", ext)}`);
		    }
		  }
		  if (entryPoints) {
		    if (Array.isArray(entryPoints)) {
		      for (let i = 0, n = entryPoints.length; i < n; i++) {
		        let entryPoint = entryPoints[i];
		        if (typeof entryPoint === "object" && entryPoint !== null) {
		          let entryPointKeys = /* @__PURE__ */ Object.create(null);
		          let input = getFlag(entryPoint, entryPointKeys, "in", mustBeString);
		          let output = getFlag(entryPoint, entryPointKeys, "out", mustBeString);
		          checkForInvalidFlags(entryPoint, entryPointKeys, "in entry point at index " + i);
		          if (input === void 0) throw new Error('Missing property "in" for entry point at index ' + i);
		          if (output === void 0) throw new Error('Missing property "out" for entry point at index ' + i);
		          entries.push([output, input]);
		        } else {
		          entries.push(["", validateStringValue(entryPoint, "entry point at index " + i)]);
		        }
		      }
		    } else {
		      for (let key in entryPoints) {
		        entries.push([key, validateStringValue(entryPoints[key], "entry point", key)]);
		      }
		    }
		  }
		  if (stdin) {
		    let stdinKeys = /* @__PURE__ */ Object.create(null);
		    let contents = getFlag(stdin, stdinKeys, "contents", mustBeStringOrUint8Array);
		    let resolveDir = getFlag(stdin, stdinKeys, "resolveDir", mustBeString);
		    let sourcefile = getFlag(stdin, stdinKeys, "sourcefile", mustBeString);
		    let loader2 = getFlag(stdin, stdinKeys, "loader", mustBeString);
		    checkForInvalidFlags(stdin, stdinKeys, 'in "stdin" object');
		    if (sourcefile) flags.push(`--sourcefile=${sourcefile}`);
		    if (loader2) flags.push(`--loader=${loader2}`);
		    if (resolveDir) stdinResolveDir = resolveDir;
		    if (typeof contents === "string") stdinContents = encodeUTF8(contents);
		    else if (contents instanceof Uint8Array) stdinContents = contents;
		  }
		  let nodePaths = [];
		  if (nodePathsInput) {
		    for (let value of nodePathsInput) {
		      value += "";
		      nodePaths.push(value);
		    }
		  }
		  return {
		    entries,
		    flags,
		    write,
		    stdinContents,
		    stdinResolveDir,
		    absWorkingDir,
		    nodePaths,
		    mangleCache: validateMangleCache(mangleCache)
		  };
		}
		function flagsForTransformOptions(callName, options, isTTY, logLevelDefault) {
		  let flags = [];
		  let keys = /* @__PURE__ */ Object.create(null);
		  pushLogFlags(flags, options, keys, isTTY, logLevelDefault);
		  pushCommonFlags(flags, options, keys);
		  let sourcemap = getFlag(options, keys, "sourcemap", mustBeStringOrBoolean);
		  let sourcefile = getFlag(options, keys, "sourcefile", mustBeString);
		  let loader = getFlag(options, keys, "loader", mustBeString);
		  let banner = getFlag(options, keys, "banner", mustBeString);
		  let footer = getFlag(options, keys, "footer", mustBeString);
		  let mangleCache = getFlag(options, keys, "mangleCache", mustBeObject);
		  checkForInvalidFlags(options, keys, `in ${callName}() call`);
		  if (sourcemap) flags.push(`--sourcemap=${sourcemap === true ? "external" : sourcemap}`);
		  if (sourcefile) flags.push(`--sourcefile=${sourcefile}`);
		  if (loader) flags.push(`--loader=${loader}`);
		  if (banner) flags.push(`--banner=${banner}`);
		  if (footer) flags.push(`--footer=${footer}`);
		  return {
		    flags,
		    mangleCache: validateMangleCache(mangleCache)
		  };
		}
		function createChannel(streamIn) {
		  const requestCallbacksByKey = {};
		  const closeData = { didClose: false, reason: "" };
		  let responseCallbacks = {};
		  let nextRequestID = 0;
		  let nextBuildKey = 0;
		  let stdout = new Uint8Array(16 * 1024);
		  let stdoutUsed = 0;
		  let readFromStdout = (chunk) => {
		    let limit = stdoutUsed + chunk.length;
		    if (limit > stdout.length) {
		      let swap = new Uint8Array(limit * 2);
		      swap.set(stdout);
		      stdout = swap;
		    }
		    stdout.set(chunk, stdoutUsed);
		    stdoutUsed += chunk.length;
		    let offset = 0;
		    while (offset + 4 <= stdoutUsed) {
		      let length = readUInt32LE(stdout, offset);
		      if (offset + 4 + length > stdoutUsed) {
		        break;
		      }
		      offset += 4;
		      handleIncomingPacket(stdout.subarray(offset, offset + length));
		      offset += length;
		    }
		    if (offset > 0) {
		      stdout.copyWithin(0, offset, stdoutUsed);
		      stdoutUsed -= offset;
		    }
		  };
		  let afterClose = (error) => {
		    closeData.didClose = true;
		    if (error) closeData.reason = ": " + (error.message || error);
		    const text = "The service was stopped" + closeData.reason;
		    for (let id in responseCallbacks) {
		      responseCallbacks[id](text, null);
		    }
		    responseCallbacks = {};
		  };
		  let sendRequest = (refs, value, callback) => {
		    if (closeData.didClose) return callback("The service is no longer running" + closeData.reason, null);
		    let id = nextRequestID++;
		    responseCallbacks[id] = (error, response) => {
		      try {
		        callback(error, response);
		      } finally {
		        if (refs) refs.unref();
		      }
		    };
		    if (refs) refs.ref();
		    streamIn.writeToStdin(encodePacket({ id, isRequest: true, value }));
		  };
		  let sendResponse = (id, value) => {
		    if (closeData.didClose) throw new Error("The service is no longer running" + closeData.reason);
		    streamIn.writeToStdin(encodePacket({ id, isRequest: false, value }));
		  };
		  let handleRequest = (id, request) => __async(null, null, function* () {
		    try {
		      if (request.command === "ping") {
		        sendResponse(id, {});
		        return;
		      }
		      if (typeof request.key === "number") {
		        const requestCallbacks = requestCallbacksByKey[request.key];
		        if (!requestCallbacks) {
		          return;
		        }
		        const callback = requestCallbacks[request.command];
		        if (callback) {
		          yield callback(id, request);
		          return;
		        }
		      }
		      throw new Error(`Invalid command: ` + request.command);
		    } catch (e) {
		      const errors = [extractErrorMessageV8(e, streamIn, null, void 0, "")];
		      try {
		        sendResponse(id, { errors });
		      } catch (e2) {
		      }
		    }
		  });
		  let isFirstPacket = true;
		  let handleIncomingPacket = (bytes) => {
		    if (isFirstPacket) {
		      isFirstPacket = false;
		      let binaryVersion = String.fromCharCode(...bytes);
		      if (binaryVersion !== "0.27.4") {
		        throw new Error(`Cannot start service: Host version "${"0.27.4"}" does not match binary version ${quote(binaryVersion)}`);
		      }
		      return;
		    }
		    let packet = decodePacket(bytes);
		    if (packet.isRequest) {
		      handleRequest(packet.id, packet.value);
		    } else {
		      let callback = responseCallbacks[packet.id];
		      delete responseCallbacks[packet.id];
		      if (packet.value.error) callback(packet.value.error, {});
		      else callback(null, packet.value);
		    }
		  };
		  let buildOrContext = ({ callName, refs, options, isTTY, defaultWD, callback }) => {
		    let refCount = 0;
		    const buildKey = nextBuildKey++;
		    const requestCallbacks = {};
		    const buildRefs = {
		      ref() {
		        if (++refCount === 1) {
		          if (refs) refs.ref();
		        }
		      },
		      unref() {
		        if (--refCount === 0) {
		          delete requestCallbacksByKey[buildKey];
		          if (refs) refs.unref();
		        }
		      }
		    };
		    requestCallbacksByKey[buildKey] = requestCallbacks;
		    buildRefs.ref();
		    buildOrContextImpl(
		      callName,
		      buildKey,
		      sendRequest,
		      sendResponse,
		      buildRefs,
		      streamIn,
		      requestCallbacks,
		      options,
		      isTTY,
		      defaultWD,
		      (err, res) => {
		        try {
		          callback(err, res);
		        } finally {
		          buildRefs.unref();
		        }
		      }
		    );
		  };
		  let transform2 = ({ callName, refs, input, options, isTTY, fs, callback }) => {
		    const details = createObjectStash();
		    let start = (inputPath) => {
		      try {
		        if (typeof input !== "string" && !(input instanceof Uint8Array))
		          throw new Error('The input to "transform" must be a string or a Uint8Array');
		        let {
		          flags,
		          mangleCache
		        } = flagsForTransformOptions(callName, options, isTTY, transformLogLevelDefault);
		        let request = {
		          command: "transform",
		          flags,
		          inputFS: inputPath !== null,
		          input: inputPath !== null ? encodeUTF8(inputPath) : typeof input === "string" ? encodeUTF8(input) : input
		        };
		        if (mangleCache) request.mangleCache = mangleCache;
		        sendRequest(refs, request, (error, response) => {
		          if (error) return callback(new Error(error), null);
		          let errors = replaceDetailsInMessages(response.errors, details);
		          let warnings = replaceDetailsInMessages(response.warnings, details);
		          let outstanding = 1;
		          let next = () => {
		            if (--outstanding === 0) {
		              let result = {
		                warnings,
		                code: response.code,
		                map: response.map,
		                mangleCache: void 0,
		                legalComments: void 0
		              };
		              if ("legalComments" in response) result.legalComments = response == null ? void 0 : response.legalComments;
		              if (response.mangleCache) result.mangleCache = response == null ? void 0 : response.mangleCache;
		              callback(null, result);
		            }
		          };
		          if (errors.length > 0) return callback(failureErrorWithLog("Transform failed", errors, warnings), null);
		          if (response.codeFS) {
		            outstanding++;
		            fs.readFile(response.code, (err, contents) => {
		              if (err !== null) {
		                callback(err, null);
		              } else {
		                response.code = contents;
		                next();
		              }
		            });
		          }
		          if (response.mapFS) {
		            outstanding++;
		            fs.readFile(response.map, (err, contents) => {
		              if (err !== null) {
		                callback(err, null);
		              } else {
		                response.map = contents;
		                next();
		              }
		            });
		          }
		          next();
		        });
		      } catch (e) {
		        let flags = [];
		        try {
		          pushLogFlags(flags, options, {}, isTTY, transformLogLevelDefault);
		        } catch (e2) {
		        }
		        const error = extractErrorMessageV8(e, streamIn, details, void 0, "");
		        sendRequest(refs, { command: "error", flags, error }, () => {
		          error.detail = details.load(error.detail);
		          callback(failureErrorWithLog("Transform failed", [error], []), null);
		        });
		      }
		    };
		    if ((typeof input === "string" || input instanceof Uint8Array) && input.length > 1024 * 1024) {
		      let next = start;
		      start = () => fs.writeFile(input, next);
		    }
		    start(null);
		  };
		  let formatMessages2 = ({ callName, refs, messages, options, callback }) => {
		    if (!options) throw new Error(`Missing second argument in ${callName}() call`);
		    let keys = {};
		    let kind = getFlag(options, keys, "kind", mustBeString);
		    let color = getFlag(options, keys, "color", mustBeBoolean);
		    let terminalWidth = getFlag(options, keys, "terminalWidth", mustBeInteger);
		    checkForInvalidFlags(options, keys, `in ${callName}() call`);
		    if (kind === void 0) throw new Error(`Missing "kind" in ${callName}() call`);
		    if (kind !== "error" && kind !== "warning") throw new Error(`Expected "kind" to be "error" or "warning" in ${callName}() call`);
		    let request = {
		      command: "format-msgs",
		      messages: sanitizeMessages(messages, "messages", null, "", terminalWidth),
		      isWarning: kind === "warning"
		    };
		    if (color !== void 0) request.color = color;
		    if (terminalWidth !== void 0) request.terminalWidth = terminalWidth;
		    sendRequest(refs, request, (error, response) => {
		      if (error) return callback(new Error(error), null);
		      callback(null, response.messages);
		    });
		  };
		  let analyzeMetafile2 = ({ callName, refs, metafile, options, callback }) => {
		    if (options === void 0) options = {};
		    let keys = {};
		    let color = getFlag(options, keys, "color", mustBeBoolean);
		    let verbose = getFlag(options, keys, "verbose", mustBeBoolean);
		    checkForInvalidFlags(options, keys, `in ${callName}() call`);
		    let request = {
		      command: "analyze-metafile",
		      metafile
		    };
		    if (color !== void 0) request.color = color;
		    if (verbose !== void 0) request.verbose = verbose;
		    sendRequest(refs, request, (error, response) => {
		      if (error) return callback(new Error(error), null);
		      callback(null, response.result);
		    });
		  };
		  return {
		    readFromStdout,
		    afterClose,
		    service: {
		      buildOrContext,
		      transform: transform2,
		      formatMessages: formatMessages2,
		      analyzeMetafile: analyzeMetafile2
		    }
		  };
		}
		function buildOrContextImpl(callName, buildKey, sendRequest, sendResponse, refs, streamIn, requestCallbacks, options, isTTY, defaultWD, callback) {
		  const details = createObjectStash();
		  const isContext = callName === "context";
		  const handleError = (e, pluginName) => {
		    const flags = [];
		    try {
		      pushLogFlags(flags, options, {}, isTTY, buildLogLevelDefault);
		    } catch (e2) {
		    }
		    const message = extractErrorMessageV8(e, streamIn, details, void 0, pluginName);
		    sendRequest(refs, { command: "error", flags, error: message }, () => {
		      message.detail = details.load(message.detail);
		      callback(failureErrorWithLog(isContext ? "Context failed" : "Build failed", [message], []), null);
		    });
		  };
		  let plugins;
		  if (typeof options === "object") {
		    const value = options.plugins;
		    if (value !== void 0) {
		      if (!Array.isArray(value)) return handleError(new Error(`"plugins" must be an array`), "");
		      plugins = value;
		    }
		  }
		  if (plugins && plugins.length > 0) {
		    if (streamIn.isSync) return handleError(new Error("Cannot use plugins in synchronous API calls"), "");
		    handlePlugins(
		      buildKey,
		      sendRequest,
		      sendResponse,
		      refs,
		      streamIn,
		      requestCallbacks,
		      options,
		      plugins,
		      details
		    ).then(
		      (result) => {
		        if (!result.ok) return handleError(result.error, result.pluginName);
		        try {
		          buildOrContextContinue(result.requestPlugins, result.runOnEndCallbacks, result.scheduleOnDisposeCallbacks);
		        } catch (e) {
		          handleError(e, "");
		        }
		      },
		      (e) => handleError(e, "")
		    );
		    return;
		  }
		  try {
		    buildOrContextContinue(null, (result, done) => done([], []), () => {
		    });
		  } catch (e) {
		    handleError(e, "");
		  }
		  function buildOrContextContinue(requestPlugins, runOnEndCallbacks, scheduleOnDisposeCallbacks) {
		    const writeDefault = streamIn.hasFS;
		    const {
		      entries,
		      flags,
		      write,
		      stdinContents,
		      stdinResolveDir,
		      absWorkingDir,
		      nodePaths,
		      mangleCache
		    } = flagsForBuildOptions(callName, options, isTTY, buildLogLevelDefault, writeDefault);
		    if (write && !streamIn.hasFS) throw new Error(`The "write" option is unavailable in this environment`);
		    const request = {
		      command: "build",
		      key: buildKey,
		      entries,
		      flags,
		      write,
		      stdinContents,
		      stdinResolveDir,
		      absWorkingDir: absWorkingDir || defaultWD,
		      nodePaths,
		      context: isContext
		    };
		    if (requestPlugins) request.plugins = requestPlugins;
		    if (mangleCache) request.mangleCache = mangleCache;
		    const buildResponseToResult = (response, callback2) => {
		      const result = {
		        errors: replaceDetailsInMessages(response.errors, details),
		        warnings: replaceDetailsInMessages(response.warnings, details),
		        outputFiles: void 0,
		        metafile: void 0,
		        mangleCache: void 0
		      };
		      const originalErrors = result.errors.slice();
		      const originalWarnings = result.warnings.slice();
		      if (response.outputFiles) result.outputFiles = response.outputFiles.map(convertOutputFiles);
		      if (response.metafile) result.metafile = parseJSON(response.metafile);
		      if (response.mangleCache) result.mangleCache = response.mangleCache;
		      if (response.writeToStdout !== void 0) console.log(decodeUTF8(response.writeToStdout).replace(/\n$/, ""));
		      runOnEndCallbacks(result, (onEndErrors, onEndWarnings) => {
		        if (originalErrors.length > 0 || onEndErrors.length > 0) {
		          const error = failureErrorWithLog("Build failed", originalErrors.concat(onEndErrors), originalWarnings.concat(onEndWarnings));
		          return callback2(error, null, onEndErrors, onEndWarnings);
		        }
		        callback2(null, result, onEndErrors, onEndWarnings);
		      });
		    };
		    let latestResultPromise;
		    let provideLatestResult;
		    if (isContext)
		      requestCallbacks["on-end"] = (id, request2) => new Promise((resolve) => {
		        buildResponseToResult(request2, (err, result, onEndErrors, onEndWarnings) => {
		          const response = {
		            errors: onEndErrors,
		            warnings: onEndWarnings
		          };
		          if (provideLatestResult) provideLatestResult(err, result);
		          latestResultPromise = void 0;
		          provideLatestResult = void 0;
		          sendResponse(id, response);
		          resolve();
		        });
		      });
		    sendRequest(refs, request, (error, response) => {
		      if (error) return callback(new Error(error), null);
		      if (!isContext) {
		        return buildResponseToResult(response, (err, res) => {
		          scheduleOnDisposeCallbacks();
		          return callback(err, res);
		        });
		      }
		      if (response.errors.length > 0) {
		        return callback(failureErrorWithLog("Context failed", response.errors, response.warnings), null);
		      }
		      let didDispose = false;
		      const result = {
		        rebuild: () => {
		          if (!latestResultPromise) latestResultPromise = new Promise((resolve, reject) => {
		            let settlePromise;
		            provideLatestResult = (err, result2) => {
		              if (!settlePromise) settlePromise = () => err ? reject(err) : resolve(result2);
		            };
		            const triggerAnotherBuild = () => {
		              const request2 = {
		                command: "rebuild",
		                key: buildKey
		              };
		              sendRequest(refs, request2, (error2, response2) => {
		                if (error2) {
		                  reject(new Error(error2));
		                } else if (settlePromise) {
		                  settlePromise();
		                } else {
		                  triggerAnotherBuild();
		                }
		              });
		            };
		            triggerAnotherBuild();
		          });
		          return latestResultPromise;
		        },
		        watch: (options2 = {}) => new Promise((resolve, reject) => {
		          if (!streamIn.hasFS) throw new Error(`Cannot use the "watch" API in this environment`);
		          const keys = {};
		          const delay = getFlag(options2, keys, "delay", mustBeInteger);
		          checkForInvalidFlags(options2, keys, `in watch() call`);
		          const request2 = {
		            command: "watch",
		            key: buildKey
		          };
		          if (delay) request2.delay = delay;
		          sendRequest(refs, request2, (error2) => {
		            if (error2) reject(new Error(error2));
		            else resolve(void 0);
		          });
		        }),
		        serve: (options2 = {}) => new Promise((resolve, reject) => {
		          if (!streamIn.hasFS) throw new Error(`Cannot use the "serve" API in this environment`);
		          const keys = {};
		          const port = getFlag(options2, keys, "port", mustBeValidPortNumber);
		          const host = getFlag(options2, keys, "host", mustBeString);
		          const servedir = getFlag(options2, keys, "servedir", mustBeString);
		          const keyfile = getFlag(options2, keys, "keyfile", mustBeString);
		          const certfile = getFlag(options2, keys, "certfile", mustBeString);
		          const fallback = getFlag(options2, keys, "fallback", mustBeString);
		          const cors = getFlag(options2, keys, "cors", mustBeObject);
		          const onRequest = getFlag(options2, keys, "onRequest", mustBeFunction);
		          checkForInvalidFlags(options2, keys, `in serve() call`);
		          const request2 = {
		            command: "serve",
		            key: buildKey,
		            onRequest: !!onRequest
		          };
		          if (port !== void 0) request2.port = port;
		          if (host !== void 0) request2.host = host;
		          if (servedir !== void 0) request2.servedir = servedir;
		          if (keyfile !== void 0) request2.keyfile = keyfile;
		          if (certfile !== void 0) request2.certfile = certfile;
		          if (fallback !== void 0) request2.fallback = fallback;
		          if (cors) {
		            const corsKeys = {};
		            const origin = getFlag(cors, corsKeys, "origin", mustBeStringOrArrayOfStrings);
		            checkForInvalidFlags(cors, corsKeys, `on "cors" object`);
		            if (Array.isArray(origin)) request2.corsOrigin = origin;
		            else if (origin !== void 0) request2.corsOrigin = [origin];
		          }
		          sendRequest(refs, request2, (error2, response2) => {
		            if (error2) return reject(new Error(error2));
		            if (onRequest) {
		              requestCallbacks["serve-request"] = (id, request3) => {
		                onRequest(request3.args);
		                sendResponse(id, {});
		              };
		            }
		            resolve(response2);
		          });
		        }),
		        cancel: () => new Promise((resolve) => {
		          if (didDispose) return resolve();
		          const request2 = {
		            command: "cancel",
		            key: buildKey
		          };
		          sendRequest(refs, request2, () => {
		            resolve();
		          });
		        }),
		        dispose: () => new Promise((resolve) => {
		          if (didDispose) return resolve();
		          didDispose = true;
		          const request2 = {
		            command: "dispose",
		            key: buildKey
		          };
		          sendRequest(refs, request2, () => {
		            resolve();
		            scheduleOnDisposeCallbacks();
		            refs.unref();
		          });
		        })
		      };
		      refs.ref();
		      callback(null, result);
		    });
		  }
		}
		var handlePlugins = (buildKey, sendRequest, sendResponse, refs, streamIn, requestCallbacks, initialOptions, plugins, details) => __async(null, null, function* () {
		  let onStartCallbacks = [];
		  let onEndCallbacks = [];
		  let onResolveCallbacks = {};
		  let onLoadCallbacks = {};
		  let onDisposeCallbacks = [];
		  let nextCallbackID = 0;
		  let i = 0;
		  let requestPlugins = [];
		  let isSetupDone = false;
		  plugins = [...plugins];
		  for (let item of plugins) {
		    let keys = {};
		    if (typeof item !== "object") throw new Error(`Plugin at index ${i} must be an object`);
		    const name = getFlag(item, keys, "name", mustBeString);
		    if (typeof name !== "string" || name === "") throw new Error(`Plugin at index ${i} is missing a name`);
		    try {
		      let setup = getFlag(item, keys, "setup", mustBeFunction);
		      if (typeof setup !== "function") throw new Error(`Plugin is missing a setup function`);
		      checkForInvalidFlags(item, keys, `on plugin ${quote(name)}`);
		      let plugin = {
		        name,
		        onStart: false,
		        onEnd: false,
		        onResolve: [],
		        onLoad: []
		      };
		      i++;
		      let resolve = (path, options = {}) => {
		        if (!isSetupDone) throw new Error('Cannot call "resolve" before plugin setup has completed');
		        if (typeof path !== "string") throw new Error(`The path to resolve must be a string`);
		        let keys2 = /* @__PURE__ */ Object.create(null);
		        let pluginName = getFlag(options, keys2, "pluginName", mustBeString);
		        let importer = getFlag(options, keys2, "importer", mustBeString);
		        let namespace = getFlag(options, keys2, "namespace", mustBeString);
		        let resolveDir = getFlag(options, keys2, "resolveDir", mustBeString);
		        let kind = getFlag(options, keys2, "kind", mustBeString);
		        let pluginData = getFlag(options, keys2, "pluginData", canBeAnything);
		        let importAttributes = getFlag(options, keys2, "with", mustBeObject);
		        checkForInvalidFlags(options, keys2, "in resolve() call");
		        return new Promise((resolve2, reject) => {
		          const request = {
		            command: "resolve",
		            path,
		            key: buildKey,
		            pluginName: name
		          };
		          if (pluginName != null) request.pluginName = pluginName;
		          if (importer != null) request.importer = importer;
		          if (namespace != null) request.namespace = namespace;
		          if (resolveDir != null) request.resolveDir = resolveDir;
		          if (kind != null) request.kind = kind;
		          else throw new Error(`Must specify "kind" when calling "resolve"`);
		          if (pluginData != null) request.pluginData = details.store(pluginData);
		          if (importAttributes != null) request.with = sanitizeStringMap(importAttributes, "with");
		          sendRequest(refs, request, (error, response) => {
		            if (error !== null) reject(new Error(error));
		            else resolve2({
		              errors: replaceDetailsInMessages(response.errors, details),
		              warnings: replaceDetailsInMessages(response.warnings, details),
		              path: response.path,
		              external: response.external,
		              sideEffects: response.sideEffects,
		              namespace: response.namespace,
		              suffix: response.suffix,
		              pluginData: details.load(response.pluginData)
		            });
		          });
		        });
		      };
		      let promise = setup({
		        initialOptions,
		        resolve,
		        onStart(callback) {
		          let registeredText = `This error came from the "onStart" callback registered here:`;
		          let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onStart");
		          onStartCallbacks.push({ name, callback, note: registeredNote });
		          plugin.onStart = true;
		        },
		        onEnd(callback) {
		          let registeredText = `This error came from the "onEnd" callback registered here:`;
		          let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onEnd");
		          onEndCallbacks.push({ name, callback, note: registeredNote });
		          plugin.onEnd = true;
		        },
		        onResolve(options, callback) {
		          let registeredText = `This error came from the "onResolve" callback registered here:`;
		          let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onResolve");
		          let keys2 = {};
		          let filter = getFlag(options, keys2, "filter", mustBeRegExp);
		          let namespace = getFlag(options, keys2, "namespace", mustBeString);
		          checkForInvalidFlags(options, keys2, `in onResolve() call for plugin ${quote(name)}`);
		          if (filter == null) throw new Error(`onResolve() call is missing a filter`);
		          let id = nextCallbackID++;
		          onResolveCallbacks[id] = { name, callback, note: registeredNote };
		          plugin.onResolve.push({ id, filter: jsRegExpToGoRegExp(filter), namespace: namespace || "" });
		        },
		        onLoad(options, callback) {
		          let registeredText = `This error came from the "onLoad" callback registered here:`;
		          let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onLoad");
		          let keys2 = {};
		          let filter = getFlag(options, keys2, "filter", mustBeRegExp);
		          let namespace = getFlag(options, keys2, "namespace", mustBeString);
		          checkForInvalidFlags(options, keys2, `in onLoad() call for plugin ${quote(name)}`);
		          if (filter == null) throw new Error(`onLoad() call is missing a filter`);
		          let id = nextCallbackID++;
		          onLoadCallbacks[id] = { name, callback, note: registeredNote };
		          plugin.onLoad.push({ id, filter: jsRegExpToGoRegExp(filter), namespace: namespace || "" });
		        },
		        onDispose(callback) {
		          onDisposeCallbacks.push(callback);
		        },
		        esbuild: streamIn.esbuild
		      });
		      if (promise) yield promise;
		      requestPlugins.push(plugin);
		    } catch (e) {
		      return { ok: false, error: e, pluginName: name };
		    }
		  }
		  requestCallbacks["on-start"] = (id, request) => __async(null, null, function* () {
		    details.clear();
		    let response = { errors: [], warnings: [] };
		    yield Promise.all(onStartCallbacks.map((_0) => __async(null, [_0], function* ({ name, callback, note }) {
		      try {
		        let result = yield callback();
		        if (result != null) {
		          if (typeof result !== "object") throw new Error(`Expected onStart() callback in plugin ${quote(name)} to return an object`);
		          let keys = {};
		          let errors = getFlag(result, keys, "errors", mustBeArray);
		          let warnings = getFlag(result, keys, "warnings", mustBeArray);
		          checkForInvalidFlags(result, keys, `from onStart() callback in plugin ${quote(name)}`);
		          if (errors != null) response.errors.push(...sanitizeMessages(errors, "errors", details, name, void 0));
		          if (warnings != null) response.warnings.push(...sanitizeMessages(warnings, "warnings", details, name, void 0));
		        }
		      } catch (e) {
		        response.errors.push(extractErrorMessageV8(e, streamIn, details, note && note(), name));
		      }
		    })));
		    sendResponse(id, response);
		  });
		  requestCallbacks["on-resolve"] = (id, request) => __async(null, null, function* () {
		    let response = {}, name = "", callback, note;
		    for (let id2 of request.ids) {
		      try {
		        ({ name, callback, note } = onResolveCallbacks[id2]);
		        let result = yield callback({
		          path: request.path,
		          importer: request.importer,
		          namespace: request.namespace,
		          resolveDir: request.resolveDir,
		          kind: request.kind,
		          pluginData: details.load(request.pluginData),
		          with: request.with
		        });
		        if (result != null) {
		          if (typeof result !== "object") throw new Error(`Expected onResolve() callback in plugin ${quote(name)} to return an object`);
		          let keys = {};
		          let pluginName = getFlag(result, keys, "pluginName", mustBeString);
		          let path = getFlag(result, keys, "path", mustBeString);
		          let namespace = getFlag(result, keys, "namespace", mustBeString);
		          let suffix = getFlag(result, keys, "suffix", mustBeString);
		          let external = getFlag(result, keys, "external", mustBeBoolean);
		          let sideEffects = getFlag(result, keys, "sideEffects", mustBeBoolean);
		          let pluginData = getFlag(result, keys, "pluginData", canBeAnything);
		          let errors = getFlag(result, keys, "errors", mustBeArray);
		          let warnings = getFlag(result, keys, "warnings", mustBeArray);
		          let watchFiles = getFlag(result, keys, "watchFiles", mustBeArrayOfStrings);
		          let watchDirs = getFlag(result, keys, "watchDirs", mustBeArrayOfStrings);
		          checkForInvalidFlags(result, keys, `from onResolve() callback in plugin ${quote(name)}`);
		          response.id = id2;
		          if (pluginName != null) response.pluginName = pluginName;
		          if (path != null) response.path = path;
		          if (namespace != null) response.namespace = namespace;
		          if (suffix != null) response.suffix = suffix;
		          if (external != null) response.external = external;
		          if (sideEffects != null) response.sideEffects = sideEffects;
		          if (pluginData != null) response.pluginData = details.store(pluginData);
		          if (errors != null) response.errors = sanitizeMessages(errors, "errors", details, name, void 0);
		          if (warnings != null) response.warnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
		          if (watchFiles != null) response.watchFiles = sanitizeStringArray(watchFiles, "watchFiles");
		          if (watchDirs != null) response.watchDirs = sanitizeStringArray(watchDirs, "watchDirs");
		          break;
		        }
		      } catch (e) {
		        response = { id: id2, errors: [extractErrorMessageV8(e, streamIn, details, note && note(), name)] };
		        break;
		      }
		    }
		    sendResponse(id, response);
		  });
		  requestCallbacks["on-load"] = (id, request) => __async(null, null, function* () {
		    let response = {}, name = "", callback, note;
		    for (let id2 of request.ids) {
		      try {
		        ({ name, callback, note } = onLoadCallbacks[id2]);
		        let result = yield callback({
		          path: request.path,
		          namespace: request.namespace,
		          suffix: request.suffix,
		          pluginData: details.load(request.pluginData),
		          with: request.with
		        });
		        if (result != null) {
		          if (typeof result !== "object") throw new Error(`Expected onLoad() callback in plugin ${quote(name)} to return an object`);
		          let keys = {};
		          let pluginName = getFlag(result, keys, "pluginName", mustBeString);
		          let contents = getFlag(result, keys, "contents", mustBeStringOrUint8Array);
		          let resolveDir = getFlag(result, keys, "resolveDir", mustBeString);
		          let pluginData = getFlag(result, keys, "pluginData", canBeAnything);
		          let loader = getFlag(result, keys, "loader", mustBeString);
		          let errors = getFlag(result, keys, "errors", mustBeArray);
		          let warnings = getFlag(result, keys, "warnings", mustBeArray);
		          let watchFiles = getFlag(result, keys, "watchFiles", mustBeArrayOfStrings);
		          let watchDirs = getFlag(result, keys, "watchDirs", mustBeArrayOfStrings);
		          checkForInvalidFlags(result, keys, `from onLoad() callback in plugin ${quote(name)}`);
		          response.id = id2;
		          if (pluginName != null) response.pluginName = pluginName;
		          if (contents instanceof Uint8Array) response.contents = contents;
		          else if (contents != null) response.contents = encodeUTF8(contents);
		          if (resolveDir != null) response.resolveDir = resolveDir;
		          if (pluginData != null) response.pluginData = details.store(pluginData);
		          if (loader != null) response.loader = loader;
		          if (errors != null) response.errors = sanitizeMessages(errors, "errors", details, name, void 0);
		          if (warnings != null) response.warnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
		          if (watchFiles != null) response.watchFiles = sanitizeStringArray(watchFiles, "watchFiles");
		          if (watchDirs != null) response.watchDirs = sanitizeStringArray(watchDirs, "watchDirs");
		          break;
		        }
		      } catch (e) {
		        response = { id: id2, errors: [extractErrorMessageV8(e, streamIn, details, note && note(), name)] };
		        break;
		      }
		    }
		    sendResponse(id, response);
		  });
		  let runOnEndCallbacks = (result, done) => done([], []);
		  if (onEndCallbacks.length > 0) {
		    runOnEndCallbacks = (result, done) => {
		      (() => __async(null, null, function* () {
		        const onEndErrors = [];
		        const onEndWarnings = [];
		        for (const { name, callback, note } of onEndCallbacks) {
		          let newErrors;
		          let newWarnings;
		          try {
		            const value = yield callback(result);
		            if (value != null) {
		              if (typeof value !== "object") throw new Error(`Expected onEnd() callback in plugin ${quote(name)} to return an object`);
		              let keys = {};
		              let errors = getFlag(value, keys, "errors", mustBeArray);
		              let warnings = getFlag(value, keys, "warnings", mustBeArray);
		              checkForInvalidFlags(value, keys, `from onEnd() callback in plugin ${quote(name)}`);
		              if (errors != null) newErrors = sanitizeMessages(errors, "errors", details, name, void 0);
		              if (warnings != null) newWarnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
		            }
		          } catch (e) {
		            newErrors = [extractErrorMessageV8(e, streamIn, details, note && note(), name)];
		          }
		          if (newErrors) {
		            onEndErrors.push(...newErrors);
		            try {
		              result.errors.push(...newErrors);
		            } catch (e) {
		            }
		          }
		          if (newWarnings) {
		            onEndWarnings.push(...newWarnings);
		            try {
		              result.warnings.push(...newWarnings);
		            } catch (e) {
		            }
		          }
		        }
		        done(onEndErrors, onEndWarnings);
		      }))();
		    };
		  }
		  let scheduleOnDisposeCallbacks = () => {
		    for (const cb of onDisposeCallbacks) {
		      setTimeout(() => cb(), 0);
		    }
		  };
		  isSetupDone = true;
		  return {
		    ok: true,
		    requestPlugins,
		    runOnEndCallbacks,
		    scheduleOnDisposeCallbacks
		  };
		});
		function createObjectStash() {
		  const map = /* @__PURE__ */ new Map();
		  let nextID = 0;
		  return {
		    clear() {
		      map.clear();
		    },
		    load(id) {
		      return map.get(id);
		    },
		    store(value) {
		      if (value === void 0) return -1;
		      const id = nextID++;
		      map.set(id, value);
		      return id;
		    }
		  };
		}
		function extractCallerV8(e, streamIn, ident) {
		  let note;
		  let tried = false;
		  return () => {
		    if (tried) return note;
		    tried = true;
		    try {
		      let lines = (e.stack + "").split("\n");
		      lines.splice(1, 1);
		      let location2 = parseStackLinesV8(streamIn, lines, ident);
		      if (location2) {
		        note = { text: e.message, location: location2 };
		        return note;
		      }
		    } catch (e2) {
		    }
		  };
		}
		function extractErrorMessageV8(e, streamIn, stash, note, pluginName) {
		  let text = "Internal error";
		  let location2 = null;
		  try {
		    text = (e && e.message || e) + "";
		  } catch (e2) {
		  }
		  try {
		    location2 = parseStackLinesV8(streamIn, (e.stack + "").split("\n"), "");
		  } catch (e2) {
		  }
		  return { id: "", pluginName, text, location: location2, notes: note ? [note] : [], detail: stash ? stash.store(e) : -1 };
		}
		function parseStackLinesV8(streamIn, lines, ident) {
		  let at = "    at ";
		  if (streamIn.readFileSync && !lines[0].startsWith(at) && lines[1].startsWith(at)) {
		    for (let i = 1; i < lines.length; i++) {
		      let line = lines[i];
		      if (!line.startsWith(at)) continue;
		      line = line.slice(at.length);
		      while (true) {
		        let match = /^(?:new |async )?\S+ \((.*)\)$/.exec(line);
		        if (match) {
		          line = match[1];
		          continue;
		        }
		        match = /^eval at \S+ \((.*)\)(?:, \S+:\d+:\d+)?$/.exec(line);
		        if (match) {
		          line = match[1];
		          continue;
		        }
		        match = /^(\S+):(\d+):(\d+)$/.exec(line);
		        if (match) {
		          let contents;
		          try {
		            contents = streamIn.readFileSync(match[1], "utf8");
		          } catch (e) {
		            break;
		          }
		          let lineText = contents.split(/\r\n|\r|\n|\u2028|\u2029/)[+match[2] - 1] || "";
		          let column = +match[3] - 1;
		          let length = lineText.slice(column, column + ident.length) === ident ? ident.length : 0;
		          return {
		            file: match[1],
		            namespace: "file",
		            line: +match[2],
		            column: encodeUTF8(lineText.slice(0, column)).length,
		            length: encodeUTF8(lineText.slice(column, column + length)).length,
		            lineText: lineText + "\n" + lines.slice(1).join("\n"),
		            suggestion: ""
		          };
		        }
		        break;
		      }
		    }
		  }
		  return null;
		}
		function failureErrorWithLog(text, errors, warnings) {
		  let limit = 5;
		  text += errors.length < 1 ? "" : ` with ${errors.length} error${errors.length < 2 ? "" : "s"}:` + errors.slice(0, limit + 1).map((e, i) => {
		    if (i === limit) return "\n...";
		    if (!e.location) return `
error: ${e.text}`;
		    let { file, line, column } = e.location;
		    let pluginText = e.pluginName ? `[plugin: ${e.pluginName}] ` : "";
		    return `
${file}:${line}:${column}: ERROR: ${pluginText}${e.text}`;
		  }).join("");
		  let error = new Error(text);
		  for (const [key, value] of [["errors", errors], ["warnings", warnings]]) {
		    Object.defineProperty(error, key, {
		      configurable: true,
		      enumerable: true,
		      get: () => value,
		      set: (value2) => Object.defineProperty(error, key, {
		        configurable: true,
		        enumerable: true,
		        value: value2
		      })
		    });
		  }
		  return error;
		}
		function replaceDetailsInMessages(messages, stash) {
		  for (const message of messages) {
		    message.detail = stash.load(message.detail);
		  }
		  return messages;
		}
		function sanitizeLocation(location2, where, terminalWidth) {
		  if (location2 == null) return null;
		  let keys = {};
		  let file = getFlag(location2, keys, "file", mustBeString);
		  let namespace = getFlag(location2, keys, "namespace", mustBeString);
		  let line = getFlag(location2, keys, "line", mustBeInteger);
		  let column = getFlag(location2, keys, "column", mustBeInteger);
		  let length = getFlag(location2, keys, "length", mustBeInteger);
		  let lineText = getFlag(location2, keys, "lineText", mustBeString);
		  let suggestion = getFlag(location2, keys, "suggestion", mustBeString);
		  checkForInvalidFlags(location2, keys, where);
		  if (lineText) {
		    const relevantASCII = lineText.slice(
		      0,
		      (column && column > 0 ? column : 0) + (length && length > 0 ? length : 0) + (terminalWidth && terminalWidth > 0 ? terminalWidth : 80)
		    );
		    if (!/[\x7F-\uFFFF]/.test(relevantASCII) && !/\n/.test(lineText)) {
		      lineText = relevantASCII;
		    }
		  }
		  return {
		    file: file || "",
		    namespace: namespace || "",
		    line: line || 0,
		    column: column || 0,
		    length: length || 0,
		    lineText: lineText || "",
		    suggestion: suggestion || ""
		  };
		}
		function sanitizeMessages(messages, property, stash, fallbackPluginName, terminalWidth) {
		  let messagesClone = [];
		  let index = 0;
		  for (const message of messages) {
		    let keys = {};
		    let id = getFlag(message, keys, "id", mustBeString);
		    let pluginName = getFlag(message, keys, "pluginName", mustBeString);
		    let text = getFlag(message, keys, "text", mustBeString);
		    let location2 = getFlag(message, keys, "location", mustBeObjectOrNull);
		    let notes = getFlag(message, keys, "notes", mustBeArray);
		    let detail = getFlag(message, keys, "detail", canBeAnything);
		    let where = `in element ${index} of "${property}"`;
		    checkForInvalidFlags(message, keys, where);
		    let notesClone = [];
		    if (notes) {
		      for (const note of notes) {
		        let noteKeys = {};
		        let noteText = getFlag(note, noteKeys, "text", mustBeString);
		        let noteLocation = getFlag(note, noteKeys, "location", mustBeObjectOrNull);
		        checkForInvalidFlags(note, noteKeys, where);
		        notesClone.push({
		          text: noteText || "",
		          location: sanitizeLocation(noteLocation, where, terminalWidth)
		        });
		      }
		    }
		    messagesClone.push({
		      id: id || "",
		      pluginName: pluginName || fallbackPluginName,
		      text: text || "",
		      location: sanitizeLocation(location2, where, terminalWidth),
		      notes: notesClone,
		      detail: stash ? stash.store(detail) : -1
		    });
		    index++;
		  }
		  return messagesClone;
		}
		function sanitizeStringArray(values, property) {
		  const result = [];
		  for (const value of values) {
		    if (typeof value !== "string") throw new Error(`${quote(property)} must be an array of strings`);
		    result.push(value);
		  }
		  return result;
		}
		function sanitizeStringMap(map, property) {
		  const result = /* @__PURE__ */ Object.create(null);
		  for (const key in map) {
		    const value = map[key];
		    if (typeof value !== "string") throw new Error(`key ${quote(key)} in object ${quote(property)} must be a string`);
		    result[key] = value;
		  }
		  return result;
		}
		function convertOutputFiles({ path, contents, hash }) {
		  let text = null;
		  return {
		    path,
		    contents,
		    hash,
		    get text() {
		      const binary = this.contents;
		      if (text === null || binary !== contents) {
		        contents = binary;
		        text = decodeUTF8(binary);
		      }
		      return text;
		    }
		  };
		}
		function jsRegExpToGoRegExp(regexp) {
		  let result = regexp.source;
		  if (regexp.flags) result = `(?${regexp.flags})${result}`;
		  return result;
		}
		function parseJSON(bytes) {
		  let text;
		  try {
		    text = decodeUTF8(bytes);
		  } catch (e) {
		    return JSON_parse(bytes);
		  }
		  return JSON.parse(text);
		}

		// lib/npm/browser.ts
		var version = "0.27.4";
		var build = (options) => ensureServiceIsRunning().build(options);
		var context = (options) => ensureServiceIsRunning().context(options);
		var transform = (input, options) => ensureServiceIsRunning().transform(input, options);
		var formatMessages = (messages, options) => ensureServiceIsRunning().formatMessages(messages, options);
		var analyzeMetafile = (metafile, options) => ensureServiceIsRunning().analyzeMetafile(metafile, options);
		var buildSync = () => {
		  throw new Error(`The "buildSync" API only works in node`);
		};
		var transformSync = () => {
		  throw new Error(`The "transformSync" API only works in node`);
		};
		var formatMessagesSync = () => {
		  throw new Error(`The "formatMessagesSync" API only works in node`);
		};
		var analyzeMetafileSync = () => {
		  throw new Error(`The "analyzeMetafileSync" API only works in node`);
		};
		var stop = () => {
		  if (stopService) stopService();
		  return Promise.resolve();
		};
		var initializePromise;
		var stopService;
		var longLivedService;
		var ensureServiceIsRunning = () => {
		  if (longLivedService) return longLivedService;
		  if (initializePromise) throw new Error('You need to wait for the promise returned from "initialize" to be resolved before calling this');
		  throw new Error('You need to call "initialize" before calling this');
		};
		var initialize = (options) => {
		  options = validateInitializeOptions(options || {});
		  let wasmURL = options.wasmURL;
		  let wasmModule = options.wasmModule;
		  let useWorker = options.worker !== false;
		  if (!wasmURL && !wasmModule) throw new Error('Must provide either the "wasmURL" option or the "wasmModule" option');
		  if (initializePromise) throw new Error('Cannot call "initialize" more than once');
		  initializePromise = startRunningService(wasmURL || "", wasmModule, useWorker);
		  initializePromise.catch(() => {
		    initializePromise = void 0;
		  });
		  return initializePromise;
		};
		var startRunningService = (wasmURL, wasmModule, useWorker) => __async(null, null, function* () {
		  let worker;
		  let rejectAllWith;
		  const rejectAllPromise = new Promise((resolve) => rejectAllWith = resolve);
		  if (useWorker) {
		    let blob = new Blob([`onmessage=${'((postMessage) => {\n      // Copyright 2018 The Go Authors. All rights reserved.\n      // Use of this source code is governed by a BSD-style\n      // license that can be found in the LICENSE file.\n      var __async = (__this, __arguments, generator) => {\n        return new Promise((resolve, reject) => {\n          var fulfilled = (value) => {\n            try {\n              step(generator.next(value));\n            } catch (e) {\n              reject(e);\n            }\n          };\n          var rejected = (value) => {\n            try {\n              step(generator.throw(value));\n            } catch (e) {\n              reject(e);\n            }\n          };\n          var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);\n          step((generator = generator.apply(__this, __arguments)).next());\n        });\n      };\n      let onmessage;\n      let globalThis = {};\n      for (let o = self; o; o = Object.getPrototypeOf(o))\n        for (let k of Object.getOwnPropertyNames(o))\n          if (!(k in globalThis))\n            Object.defineProperty(globalThis, k, { get: () => self[k] });\n      "use strict";\n      (() => {\n        const enosys = () => {\n          const err = new Error("not implemented");\n          err.code = "ENOSYS";\n          return err;\n        };\n        if (!globalThis.fs) {\n          let outputBuf = "";\n          globalThis.fs = {\n            constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1, O_DIRECTORY: -1 },\n            // unused\n            writeSync(fd, buf) {\n              outputBuf += decoder.decode(buf);\n              const nl = outputBuf.lastIndexOf("\\n");\n              if (nl != -1) {\n                console.log(outputBuf.substring(0, nl));\n                outputBuf = outputBuf.substring(nl + 1);\n              }\n              return buf.length;\n            },\n            write(fd, buf, offset, length, position, callback) {\n              if (offset !== 0 || length !== buf.length || position !== null) {\n                callback(enosys());\n                return;\n              }\n              const n = this.writeSync(fd, buf);\n              callback(null, n);\n            },\n            chmod(path, mode, callback) {\n              callback(enosys());\n            },\n            chown(path, uid, gid, callback) {\n              callback(enosys());\n            },\n            close(fd, callback) {\n              callback(enosys());\n            },\n            fchmod(fd, mode, callback) {\n              callback(enosys());\n            },\n            fchown(fd, uid, gid, callback) {\n              callback(enosys());\n            },\n            fstat(fd, callback) {\n              callback(enosys());\n            },\n            fsync(fd, callback) {\n              callback(null);\n            },\n            ftruncate(fd, length, callback) {\n              callback(enosys());\n            },\n            lchown(path, uid, gid, callback) {\n              callback(enosys());\n            },\n            link(path, link, callback) {\n              callback(enosys());\n            },\n            lstat(path, callback) {\n              callback(enosys());\n            },\n            mkdir(path, perm, callback) {\n              callback(enosys());\n            },\n            open(path, flags, mode, callback) {\n              callback(enosys());\n            },\n            read(fd, buffer, offset, length, position, callback) {\n              callback(enosys());\n            },\n            readdir(path, callback) {\n              callback(enosys());\n            },\n            readlink(path, callback) {\n              callback(enosys());\n            },\n            rename(from, to, callback) {\n              callback(enosys());\n            },\n            rmdir(path, callback) {\n              callback(enosys());\n            },\n            stat(path, callback) {\n              callback(enosys());\n            },\n            symlink(path, link, callback) {\n              callback(enosys());\n            },\n            truncate(path, length, callback) {\n              callback(enosys());\n            },\n            unlink(path, callback) {\n              callback(enosys());\n            },\n            utimes(path, atime, mtime, callback) {\n              callback(enosys());\n            }\n          };\n        }\n        if (!globalThis.process) {\n          globalThis.process = {\n            getuid() {\n              return -1;\n            },\n            getgid() {\n              return -1;\n            },\n            geteuid() {\n              return -1;\n            },\n            getegid() {\n              return -1;\n            },\n            getgroups() {\n              throw enosys();\n            },\n            pid: -1,\n            ppid: -1,\n            umask() {\n              throw enosys();\n            },\n            cwd() {\n              throw enosys();\n            },\n            chdir() {\n              throw enosys();\n            }\n          };\n        }\n        if (!globalThis.path) {\n          globalThis.path = {\n            resolve(...pathSegments) {\n              return pathSegments.join("/");\n            }\n          };\n        }\n        if (!globalThis.crypto) {\n          throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");\n        }\n        if (!globalThis.performance) {\n          throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");\n        }\n        if (!globalThis.TextEncoder) {\n          throw new Error("globalThis.TextEncoder is not available, polyfill required");\n        }\n        if (!globalThis.TextDecoder) {\n          throw new Error("globalThis.TextDecoder is not available, polyfill required");\n        }\n        const encoder = new TextEncoder("utf-8");\n        const decoder = new TextDecoder("utf-8");\n        globalThis.Go = class {\n          constructor() {\n            this.argv = ["js"];\n            this.env = {};\n            this.exit = (code) => {\n              if (code !== 0) {\n                console.warn("exit code:", code);\n              }\n            };\n            this._exitPromise = new Promise((resolve) => {\n              this._resolveExitPromise = resolve;\n            });\n            this._pendingEvent = null;\n            this._scheduledTimeouts = /* @__PURE__ */ new Map();\n            this._nextCallbackTimeoutID = 1;\n            const setInt64 = (addr, v) => {\n              this.mem.setUint32(addr + 0, v, true);\n              this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);\n            };\n            const setInt32 = (addr, v) => {\n              this.mem.setUint32(addr + 0, v, true);\n            };\n            const getInt64 = (addr) => {\n              const low = this.mem.getUint32(addr + 0, true);\n              const high = this.mem.getInt32(addr + 4, true);\n              return low + high * 4294967296;\n            };\n            const loadValue = (addr) => {\n              const f = this.mem.getFloat64(addr, true);\n              if (f === 0) {\n                return void 0;\n              }\n              if (!isNaN(f)) {\n                return f;\n              }\n              const id = this.mem.getUint32(addr, true);\n              return this._values[id];\n            };\n            const storeValue = (addr, v) => {\n              const nanHead = 2146959360;\n              if (typeof v === "number" && v !== 0) {\n                if (isNaN(v)) {\n                  this.mem.setUint32(addr + 4, nanHead, true);\n                  this.mem.setUint32(addr, 0, true);\n                  return;\n                }\n                this.mem.setFloat64(addr, v, true);\n                return;\n              }\n              if (v === void 0) {\n                this.mem.setFloat64(addr, 0, true);\n                return;\n              }\n              let id = this._ids.get(v);\n              if (id === void 0) {\n                id = this._idPool.pop();\n                if (id === void 0) {\n                  id = this._values.length;\n                }\n                this._values[id] = v;\n                this._goRefCounts[id] = 0;\n                this._ids.set(v, id);\n              }\n              this._goRefCounts[id]++;\n              let typeFlag = 0;\n              switch (typeof v) {\n                case "object":\n                  if (v !== null) {\n                    typeFlag = 1;\n                  }\n                  break;\n                case "string":\n                  typeFlag = 2;\n                  break;\n                case "symbol":\n                  typeFlag = 3;\n                  break;\n                case "function":\n                  typeFlag = 4;\n                  break;\n              }\n              this.mem.setUint32(addr + 4, nanHead | typeFlag, true);\n              this.mem.setUint32(addr, id, true);\n            };\n            const loadSlice = (addr) => {\n              const array = getInt64(addr + 0);\n              const len = getInt64(addr + 8);\n              return new Uint8Array(this._inst.exports.mem.buffer, array, len);\n            };\n            const loadSliceOfValues = (addr) => {\n              const array = getInt64(addr + 0);\n              const len = getInt64(addr + 8);\n              const a = new Array(len);\n              for (let i = 0; i < len; i++) {\n                a[i] = loadValue(array + i * 8);\n              }\n              return a;\n            };\n            const loadString = (addr) => {\n              const saddr = getInt64(addr + 0);\n              const len = getInt64(addr + 8);\n              return decoder.decode(new DataView(this._inst.exports.mem.buffer, saddr, len));\n            };\n            const testCallExport = (a, b) => {\n              this._inst.exports.testExport0();\n              return this._inst.exports.testExport(a, b);\n            };\n            const timeOrigin = Date.now() - performance.now();\n            this.importObject = {\n              _gotest: {\n                add: (a, b) => a + b,\n                callExport: testCallExport\n              },\n              gojs: {\n                // Go\'s SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)\n                // may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported\n                // function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).\n                // This changes the SP, thus we have to update the SP used by the imported function.\n                // func wasmExit(code int32)\n                "runtime.wasmExit": (sp) => {\n                  sp >>>= 0;\n                  const code = this.mem.getInt32(sp + 8, true);\n                  this.exited = true;\n                  delete this._inst;\n                  delete this._values;\n                  delete this._goRefCounts;\n                  delete this._ids;\n                  delete this._idPool;\n                  this.exit(code);\n                },\n                // func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)\n                "runtime.wasmWrite": (sp) => {\n                  sp >>>= 0;\n                  const fd = getInt64(sp + 8);\n                  const p = getInt64(sp + 16);\n                  const n = this.mem.getInt32(sp + 24, true);\n                  globalThis.fs.writeSync(fd, new Uint8Array(this._inst.exports.mem.buffer, p, n));\n                },\n                // func resetMemoryDataView()\n                "runtime.resetMemoryDataView": (sp) => {\n                  sp >>>= 0;\n                  this.mem = new DataView(this._inst.exports.mem.buffer);\n                },\n                // func nanotime1() int64\n                "runtime.nanotime1": (sp) => {\n                  sp >>>= 0;\n                  setInt64(sp + 8, (timeOrigin + performance.now()) * 1e6);\n                },\n                // func walltime() (sec int64, nsec int32)\n                "runtime.walltime": (sp) => {\n                  sp >>>= 0;\n                  const msec = (/* @__PURE__ */ new Date()).getTime();\n                  setInt64(sp + 8, msec / 1e3);\n                  this.mem.setInt32(sp + 16, msec % 1e3 * 1e6, true);\n                },\n                // func scheduleTimeoutEvent(delay int64) int32\n                "runtime.scheduleTimeoutEvent": (sp) => {\n                  sp >>>= 0;\n                  const id = this._nextCallbackTimeoutID;\n                  this._nextCallbackTimeoutID++;\n                  this._scheduledTimeouts.set(id, setTimeout(\n                    () => {\n                      this._resume();\n                      while (this._scheduledTimeouts.has(id)) {\n                        console.warn("scheduleTimeoutEvent: missed timeout event");\n                        this._resume();\n                      }\n                    },\n                    getInt64(sp + 8)\n                  ));\n                  this.mem.setInt32(sp + 16, id, true);\n                },\n                // func clearTimeoutEvent(id int32)\n                "runtime.clearTimeoutEvent": (sp) => {\n                  sp >>>= 0;\n                  const id = this.mem.getInt32(sp + 8, true);\n                  clearTimeout(this._scheduledTimeouts.get(id));\n                  this._scheduledTimeouts.delete(id);\n                },\n                // func getRandomData(r []byte)\n                "runtime.getRandomData": (sp) => {\n                  sp >>>= 0;\n                  crypto.getRandomValues(loadSlice(sp + 8));\n                },\n                // func finalizeRef(v ref)\n                "syscall/js.finalizeRef": (sp) => {\n                  sp >>>= 0;\n                  const id = this.mem.getUint32(sp + 8, true);\n                  this._goRefCounts[id]--;\n                  if (this._goRefCounts[id] === 0) {\n                    const v = this._values[id];\n                    this._values[id] = null;\n                    this._ids.delete(v);\n                    this._idPool.push(id);\n                  }\n                },\n                // func stringVal(value string) ref\n                "syscall/js.stringVal": (sp) => {\n                  sp >>>= 0;\n                  storeValue(sp + 24, loadString(sp + 8));\n                },\n                // func valueGet(v ref, p string) ref\n                "syscall/js.valueGet": (sp) => {\n                  sp >>>= 0;\n                  const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));\n                  sp = this._inst.exports.getsp() >>> 0;\n                  storeValue(sp + 32, result);\n                },\n                // func valueSet(v ref, p string, x ref)\n                "syscall/js.valueSet": (sp) => {\n                  sp >>>= 0;\n                  Reflect.set(loadValue(sp + 8), loadString(sp + 16), loadValue(sp + 32));\n                },\n                // func valueDelete(v ref, p string)\n                "syscall/js.valueDelete": (sp) => {\n                  sp >>>= 0;\n                  Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));\n                },\n                // func valueIndex(v ref, i int) ref\n                "syscall/js.valueIndex": (sp) => {\n                  sp >>>= 0;\n                  storeValue(sp + 24, Reflect.get(loadValue(sp + 8), getInt64(sp + 16)));\n                },\n                // valueSetIndex(v ref, i int, x ref)\n                "syscall/js.valueSetIndex": (sp) => {\n                  sp >>>= 0;\n                  Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));\n                },\n                // func valueCall(v ref, m string, args []ref) (ref, bool)\n                "syscall/js.valueCall": (sp) => {\n                  sp >>>= 0;\n                  try {\n                    const v = loadValue(sp + 8);\n                    const m = Reflect.get(v, loadString(sp + 16));\n                    const args = loadSliceOfValues(sp + 32);\n                    const result = Reflect.apply(m, v, args);\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 56, result);\n                    this.mem.setUint8(sp + 64, 1);\n                  } catch (err) {\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 56, err);\n                    this.mem.setUint8(sp + 64, 0);\n                  }\n                },\n                // func valueInvoke(v ref, args []ref) (ref, bool)\n                "syscall/js.valueInvoke": (sp) => {\n                  sp >>>= 0;\n                  try {\n                    const v = loadValue(sp + 8);\n                    const args = loadSliceOfValues(sp + 16);\n                    const result = Reflect.apply(v, void 0, args);\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 40, result);\n                    this.mem.setUint8(sp + 48, 1);\n                  } catch (err) {\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 40, err);\n                    this.mem.setUint8(sp + 48, 0);\n                  }\n                },\n                // func valueNew(v ref, args []ref) (ref, bool)\n                "syscall/js.valueNew": (sp) => {\n                  sp >>>= 0;\n                  try {\n                    const v = loadValue(sp + 8);\n                    const args = loadSliceOfValues(sp + 16);\n                    const result = Reflect.construct(v, args);\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 40, result);\n                    this.mem.setUint8(sp + 48, 1);\n                  } catch (err) {\n                    sp = this._inst.exports.getsp() >>> 0;\n                    storeValue(sp + 40, err);\n                    this.mem.setUint8(sp + 48, 0);\n                  }\n                },\n                // func valueLength(v ref) int\n                "syscall/js.valueLength": (sp) => {\n                  sp >>>= 0;\n                  setInt64(sp + 16, parseInt(loadValue(sp + 8).length));\n                },\n                // valuePrepareString(v ref) (ref, int)\n                "syscall/js.valuePrepareString": (sp) => {\n                  sp >>>= 0;\n                  const str = encoder.encode(String(loadValue(sp + 8)));\n                  storeValue(sp + 16, str);\n                  setInt64(sp + 24, str.length);\n                },\n                // valueLoadString(v ref, b []byte)\n                "syscall/js.valueLoadString": (sp) => {\n                  sp >>>= 0;\n                  const str = loadValue(sp + 8);\n                  loadSlice(sp + 16).set(str);\n                },\n                // func valueInstanceOf(v ref, t ref) bool\n                "syscall/js.valueInstanceOf": (sp) => {\n                  sp >>>= 0;\n                  this.mem.setUint8(sp + 24, loadValue(sp + 8) instanceof loadValue(sp + 16) ? 1 : 0);\n                },\n                // func copyBytesToGo(dst []byte, src ref) (int, bool)\n                "syscall/js.copyBytesToGo": (sp) => {\n                  sp >>>= 0;\n                  const dst = loadSlice(sp + 8);\n                  const src = loadValue(sp + 32);\n                  if (!(src instanceof Uint8Array || src instanceof Uint8ClampedArray)) {\n                    this.mem.setUint8(sp + 48, 0);\n                    return;\n                  }\n                  const toCopy = src.subarray(0, dst.length);\n                  dst.set(toCopy);\n                  setInt64(sp + 40, toCopy.length);\n                  this.mem.setUint8(sp + 48, 1);\n                },\n                // func copyBytesToJS(dst ref, src []byte) (int, bool)\n                "syscall/js.copyBytesToJS": (sp) => {\n                  sp >>>= 0;\n                  const dst = loadValue(sp + 8);\n                  const src = loadSlice(sp + 16);\n                  if (!(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)) {\n                    this.mem.setUint8(sp + 48, 0);\n                    return;\n                  }\n                  const toCopy = src.subarray(0, dst.length);\n                  dst.set(toCopy);\n                  setInt64(sp + 40, toCopy.length);\n                  this.mem.setUint8(sp + 48, 1);\n                },\n                "debug": (value) => {\n                  console.log(value);\n                }\n              }\n            };\n          }\n          run(instance) {\n            return __async(this, null, function* () {\n              if (!(instance instanceof WebAssembly.Instance)) {\n                throw new Error("Go.run: WebAssembly.Instance expected");\n              }\n              this._inst = instance;\n              this.mem = new DataView(this._inst.exports.mem.buffer);\n              this._values = [\n                // JS values that Go currently has references to, indexed by reference id\n                NaN,\n                0,\n                null,\n                true,\n                false,\n                globalThis,\n                this\n              ];\n              this._goRefCounts = new Array(this._values.length).fill(Infinity);\n              this._ids = /* @__PURE__ */ new Map([\n                // mapping from JS values to reference ids\n                [0, 1],\n                [null, 2],\n                [true, 3],\n                [false, 4],\n                [globalThis, 5],\n                [this, 6]\n              ]);\n              this._idPool = [];\n              this.exited = false;\n              let offset = 4096;\n              const strPtr = (str) => {\n                const ptr = offset;\n                const bytes = encoder.encode(str + "\\0");\n                new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);\n                offset += bytes.length;\n                if (offset % 8 !== 0) {\n                  offset += 8 - offset % 8;\n                }\n                return ptr;\n              };\n              const argc = this.argv.length;\n              const argvPtrs = [];\n              this.argv.forEach((arg) => {\n                argvPtrs.push(strPtr(arg));\n              });\n              argvPtrs.push(0);\n              const keys = Object.keys(this.env).sort();\n              keys.forEach((key) => {\n                argvPtrs.push(strPtr(`${key}=${this.env[key]}`));\n              });\n              argvPtrs.push(0);\n              const argv = offset;\n              argvPtrs.forEach((ptr) => {\n                this.mem.setUint32(offset, ptr, true);\n                this.mem.setUint32(offset + 4, 0, true);\n                offset += 8;\n              });\n              const wasmMinDataAddr = 4096 + 8192;\n              if (offset >= wasmMinDataAddr) {\n                throw new Error("total length of command line and environment variables exceeds limit");\n              }\n              this._inst.exports.run(argc, argv);\n              if (this.exited) {\n                this._resolveExitPromise();\n              }\n              yield this._exitPromise;\n            });\n          }\n          _resume() {\n            if (this.exited) {\n              throw new Error("Go program has already exited");\n            }\n            this._inst.exports.resume();\n            if (this.exited) {\n              this._resolveExitPromise();\n            }\n          }\n          _makeFuncWrapper(id) {\n            const go = this;\n            return function() {\n              const event = { id, this: this, args: arguments };\n              go._pendingEvent = event;\n              go._resume();\n              return event.result;\n            };\n          }\n        };\n      })();\n      onmessage = ({ data: wasm }) => {\n        let decoder = new TextDecoder();\n        let fs = globalThis.fs;\n        let stderr = "";\n        fs.writeSync = (fd, buffer) => {\n          if (fd === 1) {\n            postMessage(buffer);\n          } else if (fd === 2) {\n            stderr += decoder.decode(buffer);\n            let parts = stderr.split("\\n");\n            if (parts.length > 1) console.log(parts.slice(0, -1).join("\\n"));\n            stderr = parts[parts.length - 1];\n          } else {\n            throw new Error("Bad write");\n          }\n          return buffer.length;\n        };\n        let stdin = [];\n        let resumeStdin;\n        let stdinPos = 0;\n        onmessage = ({ data }) => {\n          if (data.length > 0) {\n            stdin.push(data);\n            if (resumeStdin) resumeStdin();\n          }\n          return go;\n        };\n        fs.read = (fd, buffer, offset, length, position, callback) => {\n          if (fd !== 0 || offset !== 0 || length !== buffer.length || position !== null) {\n            throw new Error("Bad read");\n          }\n          if (stdin.length === 0) {\n            resumeStdin = () => fs.read(fd, buffer, offset, length, position, callback);\n            return;\n          }\n          let first = stdin[0];\n          let count = Math.max(0, Math.min(length, first.length - stdinPos));\n          buffer.set(first.subarray(stdinPos, stdinPos + count), offset);\n          stdinPos += count;\n          if (stdinPos === first.length) {\n            stdin.shift();\n            stdinPos = 0;\n          }\n          callback(null, count);\n        };\n        let go = new globalThis.Go();\n        go.argv = ["", `--service=${"0.27.4"}`];\n        tryToInstantiateModule(wasm, go).then(\n          (instance) => {\n            postMessage(null);\n            go.run(instance);\n          },\n          (error) => {\n            postMessage(error);\n          }\n        );\n        return go;\n      };\n      function tryToInstantiateModule(wasm, go) {\n        return __async(this, null, function* () {\n          if (wasm instanceof WebAssembly.Module) {\n            return WebAssembly.instantiate(wasm, go.importObject);\n          }\n          const res = yield fetch(wasm);\n          if (!res.ok) throw new Error(`Failed to download ${JSON.stringify(wasm)}`);\n          if ("instantiateStreaming" in WebAssembly && /^application\\/wasm($|;)/i.test(res.headers.get("Content-Type") || "")) {\n            const result2 = yield WebAssembly.instantiateStreaming(res, go.importObject);\n            return result2.instance;\n          }\n          const bytes = yield res.arrayBuffer();\n          const result = yield WebAssembly.instantiate(bytes, go.importObject);\n          return result.instance;\n        });\n      }\n      return (m) => onmessage(m);\n    })'}(postMessage)`], { type: "text/javascript" });
		    worker = new Worker(URL.createObjectURL(blob));
		  } else {
		    let onmessage = ((postMessage) => {
		      // Copyright 2018 The Go Authors. All rights reserved.
		      // Use of this source code is governed by a BSD-style
		      // license that can be found in the LICENSE file.
		      var __async = (__this, __arguments, generator) => {
		        return new Promise((resolve, reject) => {
		          var fulfilled = (value) => {
		            try {
		              step(generator.next(value));
		            } catch (e) {
		              reject(e);
		            }
		          };
		          var rejected = (value) => {
		            try {
		              step(generator.throw(value));
		            } catch (e) {
		              reject(e);
		            }
		          };
		          var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
		          step((generator = generator.apply(__this, __arguments)).next());
		        });
		      };
		      let onmessage;
		      let globalThis = {};
		      for (let o = self; o; o = Object.getPrototypeOf(o))
		        for (let k of Object.getOwnPropertyNames(o))
		          if (!(k in globalThis))
		            Object.defineProperty(globalThis, k, { get: () => self[k] });
		      (() => {
		        const enosys = () => {
		          const err = new Error("not implemented");
		          err.code = "ENOSYS";
		          return err;
		        };
		        if (!globalThis.fs) {
		          let outputBuf = "";
		          globalThis.fs = {
		            constants: { O_WRONLY: -1, O_RDWR: -1, O_CREAT: -1, O_TRUNC: -1, O_APPEND: -1, O_EXCL: -1, O_DIRECTORY: -1 },
		            // unused
		            writeSync(fd, buf) {
		              outputBuf += decoder.decode(buf);
		              const nl = outputBuf.lastIndexOf("\n");
		              if (nl != -1) {
		                console.log(outputBuf.substring(0, nl));
		                outputBuf = outputBuf.substring(nl + 1);
		              }
		              return buf.length;
		            },
		            write(fd, buf, offset, length, position, callback) {
		              if (offset !== 0 || length !== buf.length || position !== null) {
		                callback(enosys());
		                return;
		              }
		              const n = this.writeSync(fd, buf);
		              callback(null, n);
		            },
		            chmod(path, mode, callback) {
		              callback(enosys());
		            },
		            chown(path, uid, gid, callback) {
		              callback(enosys());
		            },
		            close(fd, callback) {
		              callback(enosys());
		            },
		            fchmod(fd, mode, callback) {
		              callback(enosys());
		            },
		            fchown(fd, uid, gid, callback) {
		              callback(enosys());
		            },
		            fstat(fd, callback) {
		              callback(enosys());
		            },
		            fsync(fd, callback) {
		              callback(null);
		            },
		            ftruncate(fd, length, callback) {
		              callback(enosys());
		            },
		            lchown(path, uid, gid, callback) {
		              callback(enosys());
		            },
		            link(path, link, callback) {
		              callback(enosys());
		            },
		            lstat(path, callback) {
		              callback(enosys());
		            },
		            mkdir(path, perm, callback) {
		              callback(enosys());
		            },
		            open(path, flags, mode, callback) {
		              callback(enosys());
		            },
		            read(fd, buffer, offset, length, position, callback) {
		              callback(enosys());
		            },
		            readdir(path, callback) {
		              callback(enosys());
		            },
		            readlink(path, callback) {
		              callback(enosys());
		            },
		            rename(from, to, callback) {
		              callback(enosys());
		            },
		            rmdir(path, callback) {
		              callback(enosys());
		            },
		            stat(path, callback) {
		              callback(enosys());
		            },
		            symlink(path, link, callback) {
		              callback(enosys());
		            },
		            truncate(path, length, callback) {
		              callback(enosys());
		            },
		            unlink(path, callback) {
		              callback(enosys());
		            },
		            utimes(path, atime, mtime, callback) {
		              callback(enosys());
		            }
		          };
		        }
		        if (!globalThis.process) {
		          globalThis.process = {
		            getuid() {
		              return -1;
		            },
		            getgid() {
		              return -1;
		            },
		            geteuid() {
		              return -1;
		            },
		            getegid() {
		              return -1;
		            },
		            getgroups() {
		              throw enosys();
		            },
		            pid: -1,
		            ppid: -1,
		            umask() {
		              throw enosys();
		            },
		            cwd() {
		              throw enosys();
		            },
		            chdir() {
		              throw enosys();
		            }
		          };
		        }
		        if (!globalThis.path) {
		          globalThis.path = {
		            resolve(...pathSegments) {
		              return pathSegments.join("/");
		            }
		          };
		        }
		        if (!globalThis.crypto) {
		          throw new Error("globalThis.crypto is not available, polyfill required (crypto.getRandomValues only)");
		        }
		        if (!globalThis.performance) {
		          throw new Error("globalThis.performance is not available, polyfill required (performance.now only)");
		        }
		        if (!globalThis.TextEncoder) {
		          throw new Error("globalThis.TextEncoder is not available, polyfill required");
		        }
		        if (!globalThis.TextDecoder) {
		          throw new Error("globalThis.TextDecoder is not available, polyfill required");
		        }
		        const encoder = new TextEncoder("utf-8");
		        const decoder = new TextDecoder("utf-8");
		        globalThis.Go = class {
		          constructor() {
		            this.argv = ["js"];
		            this.env = {};
		            this.exit = (code) => {
		              if (code !== 0) {
		                console.warn("exit code:", code);
		              }
		            };
		            this._exitPromise = new Promise((resolve) => {
		              this._resolveExitPromise = resolve;
		            });
		            this._pendingEvent = null;
		            this._scheduledTimeouts = /* @__PURE__ */ new Map();
		            this._nextCallbackTimeoutID = 1;
		            const setInt64 = (addr, v) => {
		              this.mem.setUint32(addr + 0, v, true);
		              this.mem.setUint32(addr + 4, Math.floor(v / 4294967296), true);
		            };
		            const getInt64 = (addr) => {
		              const low = this.mem.getUint32(addr + 0, true);
		              const high = this.mem.getInt32(addr + 4, true);
		              return low + high * 4294967296;
		            };
		            const loadValue = (addr) => {
		              const f = this.mem.getFloat64(addr, true);
		              if (f === 0) {
		                return void 0;
		              }
		              if (!isNaN(f)) {
		                return f;
		              }
		              const id = this.mem.getUint32(addr, true);
		              return this._values[id];
		            };
		            const storeValue = (addr, v) => {
		              const nanHead = 2146959360;
		              if (typeof v === "number" && v !== 0) {
		                if (isNaN(v)) {
		                  this.mem.setUint32(addr + 4, nanHead, true);
		                  this.mem.setUint32(addr, 0, true);
		                  return;
		                }
		                this.mem.setFloat64(addr, v, true);
		                return;
		              }
		              if (v === void 0) {
		                this.mem.setFloat64(addr, 0, true);
		                return;
		              }
		              let id = this._ids.get(v);
		              if (id === void 0) {
		                id = this._idPool.pop();
		                if (id === void 0) {
		                  id = this._values.length;
		                }
		                this._values[id] = v;
		                this._goRefCounts[id] = 0;
		                this._ids.set(v, id);
		              }
		              this._goRefCounts[id]++;
		              let typeFlag = 0;
		              switch (typeof v) {
		                case "object":
		                  if (v !== null) {
		                    typeFlag = 1;
		                  }
		                  break;
		                case "string":
		                  typeFlag = 2;
		                  break;
		                case "symbol":
		                  typeFlag = 3;
		                  break;
		                case "function":
		                  typeFlag = 4;
		                  break;
		              }
		              this.mem.setUint32(addr + 4, nanHead | typeFlag, true);
		              this.mem.setUint32(addr, id, true);
		            };
		            const loadSlice = (addr) => {
		              const array = getInt64(addr + 0);
		              const len = getInt64(addr + 8);
		              return new Uint8Array(this._inst.exports.mem.buffer, array, len);
		            };
		            const loadSliceOfValues = (addr) => {
		              const array = getInt64(addr + 0);
		              const len = getInt64(addr + 8);
		              const a = new Array(len);
		              for (let i = 0; i < len; i++) {
		                a[i] = loadValue(array + i * 8);
		              }
		              return a;
		            };
		            const loadString = (addr) => {
		              const saddr = getInt64(addr + 0);
		              const len = getInt64(addr + 8);
		              return decoder.decode(new DataView(this._inst.exports.mem.buffer, saddr, len));
		            };
		            const testCallExport = (a, b) => {
		              this._inst.exports.testExport0();
		              return this._inst.exports.testExport(a, b);
		            };
		            const timeOrigin = Date.now() - performance.now();
		            this.importObject = {
		              _gotest: {
		                add: (a, b) => a + b,
		                callExport: testCallExport
		              },
		              gojs: {
		                // Go's SP does not change as long as no Go code is running. Some operations (e.g. calls, getters and setters)
		                // may synchronously trigger a Go event handler. This makes Go code get executed in the middle of the imported
		                // function. A goroutine can switch to a new stack if the current stack is too small (see morestack function).
		                // This changes the SP, thus we have to update the SP used by the imported function.
		                // func wasmExit(code int32)
		                "runtime.wasmExit": (sp) => {
		                  sp >>>= 0;
		                  const code = this.mem.getInt32(sp + 8, true);
		                  this.exited = true;
		                  delete this._inst;
		                  delete this._values;
		                  delete this._goRefCounts;
		                  delete this._ids;
		                  delete this._idPool;
		                  this.exit(code);
		                },
		                // func wasmWrite(fd uintptr, p unsafe.Pointer, n int32)
		                "runtime.wasmWrite": (sp) => {
		                  sp >>>= 0;
		                  const fd = getInt64(sp + 8);
		                  const p = getInt64(sp + 16);
		                  const n = this.mem.getInt32(sp + 24, true);
		                  globalThis.fs.writeSync(fd, new Uint8Array(this._inst.exports.mem.buffer, p, n));
		                },
		                // func resetMemoryDataView()
		                "runtime.resetMemoryDataView": (sp) => {
		                  this.mem = new DataView(this._inst.exports.mem.buffer);
		                },
		                // func nanotime1() int64
		                "runtime.nanotime1": (sp) => {
		                  sp >>>= 0;
		                  setInt64(sp + 8, (timeOrigin + performance.now()) * 1e6);
		                },
		                // func walltime() (sec int64, nsec int32)
		                "runtime.walltime": (sp) => {
		                  sp >>>= 0;
		                  const msec = (/* @__PURE__ */ new Date()).getTime();
		                  setInt64(sp + 8, msec / 1e3);
		                  this.mem.setInt32(sp + 16, msec % 1e3 * 1e6, true);
		                },
		                // func scheduleTimeoutEvent(delay int64) int32
		                "runtime.scheduleTimeoutEvent": (sp) => {
		                  sp >>>= 0;
		                  const id = this._nextCallbackTimeoutID;
		                  this._nextCallbackTimeoutID++;
		                  this._scheduledTimeouts.set(id, setTimeout(
		                    () => {
		                      this._resume();
		                      while (this._scheduledTimeouts.has(id)) {
		                        console.warn("scheduleTimeoutEvent: missed timeout event");
		                        this._resume();
		                      }
		                    },
		                    getInt64(sp + 8)
		                  ));
		                  this.mem.setInt32(sp + 16, id, true);
		                },
		                // func clearTimeoutEvent(id int32)
		                "runtime.clearTimeoutEvent": (sp) => {
		                  sp >>>= 0;
		                  const id = this.mem.getInt32(sp + 8, true);
		                  clearTimeout(this._scheduledTimeouts.get(id));
		                  this._scheduledTimeouts.delete(id);
		                },
		                // func getRandomData(r []byte)
		                "runtime.getRandomData": (sp) => {
		                  sp >>>= 0;
		                  crypto.getRandomValues(loadSlice(sp + 8));
		                },
		                // func finalizeRef(v ref)
		                "syscall/js.finalizeRef": (sp) => {
		                  sp >>>= 0;
		                  const id = this.mem.getUint32(sp + 8, true);
		                  this._goRefCounts[id]--;
		                  if (this._goRefCounts[id] === 0) {
		                    const v = this._values[id];
		                    this._values[id] = null;
		                    this._ids.delete(v);
		                    this._idPool.push(id);
		                  }
		                },
		                // func stringVal(value string) ref
		                "syscall/js.stringVal": (sp) => {
		                  sp >>>= 0;
		                  storeValue(sp + 24, loadString(sp + 8));
		                },
		                // func valueGet(v ref, p string) ref
		                "syscall/js.valueGet": (sp) => {
		                  sp >>>= 0;
		                  const result = Reflect.get(loadValue(sp + 8), loadString(sp + 16));
		                  sp = this._inst.exports.getsp() >>> 0;
		                  storeValue(sp + 32, result);
		                },
		                // func valueSet(v ref, p string, x ref)
		                "syscall/js.valueSet": (sp) => {
		                  sp >>>= 0;
		                  Reflect.set(loadValue(sp + 8), loadString(sp + 16), loadValue(sp + 32));
		                },
		                // func valueDelete(v ref, p string)
		                "syscall/js.valueDelete": (sp) => {
		                  sp >>>= 0;
		                  Reflect.deleteProperty(loadValue(sp + 8), loadString(sp + 16));
		                },
		                // func valueIndex(v ref, i int) ref
		                "syscall/js.valueIndex": (sp) => {
		                  sp >>>= 0;
		                  storeValue(sp + 24, Reflect.get(loadValue(sp + 8), getInt64(sp + 16)));
		                },
		                // valueSetIndex(v ref, i int, x ref)
		                "syscall/js.valueSetIndex": (sp) => {
		                  sp >>>= 0;
		                  Reflect.set(loadValue(sp + 8), getInt64(sp + 16), loadValue(sp + 24));
		                },
		                // func valueCall(v ref, m string, args []ref) (ref, bool)
		                "syscall/js.valueCall": (sp) => {
		                  sp >>>= 0;
		                  try {
		                    const v = loadValue(sp + 8);
		                    const m = Reflect.get(v, loadString(sp + 16));
		                    const args = loadSliceOfValues(sp + 32);
		                    const result = Reflect.apply(m, v, args);
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 56, result);
		                    this.mem.setUint8(sp + 64, 1);
		                  } catch (err) {
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 56, err);
		                    this.mem.setUint8(sp + 64, 0);
		                  }
		                },
		                // func valueInvoke(v ref, args []ref) (ref, bool)
		                "syscall/js.valueInvoke": (sp) => {
		                  sp >>>= 0;
		                  try {
		                    const v = loadValue(sp + 8);
		                    const args = loadSliceOfValues(sp + 16);
		                    const result = Reflect.apply(v, void 0, args);
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 40, result);
		                    this.mem.setUint8(sp + 48, 1);
		                  } catch (err) {
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 40, err);
		                    this.mem.setUint8(sp + 48, 0);
		                  }
		                },
		                // func valueNew(v ref, args []ref) (ref, bool)
		                "syscall/js.valueNew": (sp) => {
		                  sp >>>= 0;
		                  try {
		                    const v = loadValue(sp + 8);
		                    const args = loadSliceOfValues(sp + 16);
		                    const result = Reflect.construct(v, args);
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 40, result);
		                    this.mem.setUint8(sp + 48, 1);
		                  } catch (err) {
		                    sp = this._inst.exports.getsp() >>> 0;
		                    storeValue(sp + 40, err);
		                    this.mem.setUint8(sp + 48, 0);
		                  }
		                },
		                // func valueLength(v ref) int
		                "syscall/js.valueLength": (sp) => {
		                  sp >>>= 0;
		                  setInt64(sp + 16, parseInt(loadValue(sp + 8).length));
		                },
		                // valuePrepareString(v ref) (ref, int)
		                "syscall/js.valuePrepareString": (sp) => {
		                  sp >>>= 0;
		                  const str = encoder.encode(String(loadValue(sp + 8)));
		                  storeValue(sp + 16, str);
		                  setInt64(sp + 24, str.length);
		                },
		                // valueLoadString(v ref, b []byte)
		                "syscall/js.valueLoadString": (sp) => {
		                  sp >>>= 0;
		                  const str = loadValue(sp + 8);
		                  loadSlice(sp + 16).set(str);
		                },
		                // func valueInstanceOf(v ref, t ref) bool
		                "syscall/js.valueInstanceOf": (sp) => {
		                  sp >>>= 0;
		                  this.mem.setUint8(sp + 24, loadValue(sp + 8) instanceof loadValue(sp + 16) ? 1 : 0);
		                },
		                // func copyBytesToGo(dst []byte, src ref) (int, bool)
		                "syscall/js.copyBytesToGo": (sp) => {
		                  sp >>>= 0;
		                  const dst = loadSlice(sp + 8);
		                  const src = loadValue(sp + 32);
		                  if (!(src instanceof Uint8Array || src instanceof Uint8ClampedArray)) {
		                    this.mem.setUint8(sp + 48, 0);
		                    return;
		                  }
		                  const toCopy = src.subarray(0, dst.length);
		                  dst.set(toCopy);
		                  setInt64(sp + 40, toCopy.length);
		                  this.mem.setUint8(sp + 48, 1);
		                },
		                // func copyBytesToJS(dst ref, src []byte) (int, bool)
		                "syscall/js.copyBytesToJS": (sp) => {
		                  sp >>>= 0;
		                  const dst = loadValue(sp + 8);
		                  const src = loadSlice(sp + 16);
		                  if (!(dst instanceof Uint8Array || dst instanceof Uint8ClampedArray)) {
		                    this.mem.setUint8(sp + 48, 0);
		                    return;
		                  }
		                  const toCopy = src.subarray(0, dst.length);
		                  dst.set(toCopy);
		                  setInt64(sp + 40, toCopy.length);
		                  this.mem.setUint8(sp + 48, 1);
		                },
		                "debug": (value) => {
		                  console.log(value);
		                }
		              }
		            };
		          }
		          run(instance) {
		            return __async(this, null, function* () {
		              if (!(instance instanceof WebAssembly.Instance)) {
		                throw new Error("Go.run: WebAssembly.Instance expected");
		              }
		              this._inst = instance;
		              this.mem = new DataView(this._inst.exports.mem.buffer);
		              this._values = [
		                // JS values that Go currently has references to, indexed by reference id
		                NaN,
		                0,
		                null,
		                true,
		                false,
		                globalThis,
		                this
		              ];
		              this._goRefCounts = new Array(this._values.length).fill(Infinity);
		              this._ids = /* @__PURE__ */ new Map([
		                // mapping from JS values to reference ids
		                [0, 1],
		                [null, 2],
		                [true, 3],
		                [false, 4],
		                [globalThis, 5],
		                [this, 6]
		              ]);
		              this._idPool = [];
		              this.exited = false;
		              let offset = 4096;
		              const strPtr = (str) => {
		                const ptr = offset;
		                const bytes = encoder.encode(str + "\0");
		                new Uint8Array(this.mem.buffer, offset, bytes.length).set(bytes);
		                offset += bytes.length;
		                if (offset % 8 !== 0) {
		                  offset += 8 - offset % 8;
		                }
		                return ptr;
		              };
		              const argc = this.argv.length;
		              const argvPtrs = [];
		              this.argv.forEach((arg) => {
		                argvPtrs.push(strPtr(arg));
		              });
		              argvPtrs.push(0);
		              const keys = Object.keys(this.env).sort();
		              keys.forEach((key) => {
		                argvPtrs.push(strPtr(`${key}=${this.env[key]}`));
		              });
		              argvPtrs.push(0);
		              const argv = offset;
		              argvPtrs.forEach((ptr) => {
		                this.mem.setUint32(offset, ptr, true);
		                this.mem.setUint32(offset + 4, 0, true);
		                offset += 8;
		              });
		              const wasmMinDataAddr = 4096 + 8192;
		              if (offset >= wasmMinDataAddr) {
		                throw new Error("total length of command line and environment variables exceeds limit");
		              }
		              this._inst.exports.run(argc, argv);
		              if (this.exited) {
		                this._resolveExitPromise();
		              }
		              yield this._exitPromise;
		            });
		          }
		          _resume() {
		            if (this.exited) {
		              throw new Error("Go program has already exited");
		            }
		            this._inst.exports.resume();
		            if (this.exited) {
		              this._resolveExitPromise();
		            }
		          }
		          _makeFuncWrapper(id) {
		            const go = this;
		            return function() {
		              const event = { id, this: this, args: arguments };
		              go._pendingEvent = event;
		              go._resume();
		              return event.result;
		            };
		          }
		        };
		      })();
		      onmessage = ({ data: wasm }) => {
		        let decoder = new TextDecoder();
		        let fs = globalThis.fs;
		        let stderr = "";
		        fs.writeSync = (fd, buffer) => {
		          if (fd === 1) {
		            postMessage(buffer);
		          } else if (fd === 2) {
		            stderr += decoder.decode(buffer);
		            let parts = stderr.split("\n");
		            if (parts.length > 1) console.log(parts.slice(0, -1).join("\n"));
		            stderr = parts[parts.length - 1];
		          } else {
		            throw new Error("Bad write");
		          }
		          return buffer.length;
		        };
		        let stdin = [];
		        let resumeStdin;
		        let stdinPos = 0;
		        onmessage = ({ data }) => {
		          if (data.length > 0) {
		            stdin.push(data);
		            if (resumeStdin) resumeStdin();
		          }
		          return go;
		        };
		        fs.read = (fd, buffer, offset, length, position, callback) => {
		          if (fd !== 0 || offset !== 0 || length !== buffer.length || position !== null) {
		            throw new Error("Bad read");
		          }
		          if (stdin.length === 0) {
		            resumeStdin = () => fs.read(fd, buffer, offset, length, position, callback);
		            return;
		          }
		          let first = stdin[0];
		          let count = Math.max(0, Math.min(length, first.length - stdinPos));
		          buffer.set(first.subarray(stdinPos, stdinPos + count), offset);
		          stdinPos += count;
		          if (stdinPos === first.length) {
		            stdin.shift();
		            stdinPos = 0;
		          }
		          callback(null, count);
		        };
		        let go = new globalThis.Go();
		        go.argv = ["", `--service=${"0.27.4"}`];
		        tryToInstantiateModule(wasm, go).then(
		          (instance) => {
		            postMessage(null);
		            go.run(instance);
		          },
		          (error) => {
		            postMessage(error);
		          }
		        );
		        return go;
		      };
		      function tryToInstantiateModule(wasm, go) {
		        return __async(this, null, function* () {
		          if (wasm instanceof WebAssembly.Module) {
		            return WebAssembly.instantiate(wasm, go.importObject);
		          }
		          const res = yield fetch(wasm);
		          if (!res.ok) throw new Error(`Failed to download ${JSON.stringify(wasm)}`);
		          if ("instantiateStreaming" in WebAssembly && /^application\/wasm($|;)/i.test(res.headers.get("Content-Type") || "")) {
		            const result2 = yield WebAssembly.instantiateStreaming(res, go.importObject);
		            return result2.instance;
		          }
		          const bytes = yield res.arrayBuffer();
		          const result = yield WebAssembly.instantiate(bytes, go.importObject);
		          return result.instance;
		        });
		      }
		      return (m) => onmessage(m);
		    })((data) => worker.onmessage({ data }));
		    let go;
		    worker = {
		      onmessage: null,
		      postMessage: (data) => setTimeout(() => {
		        try {
		          go = onmessage({ data });
		        } catch (error) {
		          rejectAllWith(error);
		        }
		      }),
		      terminate() {
		        if (go)
		          for (let timeout of go._scheduledTimeouts.values())
		            clearTimeout(timeout);
		      }
		    };
		  }
		  let firstMessageResolve;
		  let firstMessageReject;
		  const firstMessagePromise = new Promise((resolve, reject) => {
		    firstMessageResolve = resolve;
		    firstMessageReject = reject;
		  });
		  worker.onmessage = ({ data: error }) => {
		    worker.onmessage = ({ data }) => readFromStdout(data);
		    if (error) firstMessageReject(error);
		    else firstMessageResolve();
		  };
		  worker.postMessage(wasmModule || new URL(wasmURL, location.href).toString());
		  let { readFromStdout, service } = createChannel({
		    writeToStdin(bytes) {
		      worker.postMessage(bytes);
		    },
		    isSync: false,
		    hasFS: false,
		    esbuild: browser_exports
		  });
		  yield firstMessagePromise;
		  stopService = () => {
		    worker.terminate();
		    initializePromise = void 0;
		    stopService = void 0;
		    longLivedService = void 0;
		  };
		  longLivedService = {
		    build: (options) => new Promise((resolve, reject) => {
		      rejectAllPromise.then(reject);
		      service.buildOrContext({
		        callName: "build",
		        refs: null,
		        options,
		        isTTY: false,
		        defaultWD: "/",
		        callback: (err, res) => err ? reject(err) : resolve(res)
		      });
		    }),
		    context: (options) => new Promise((resolve, reject) => {
		      rejectAllPromise.then(reject);
		      service.buildOrContext({
		        callName: "context",
		        refs: null,
		        options,
		        isTTY: false,
		        defaultWD: "/",
		        callback: (err, res) => err ? reject(err) : resolve(res)
		      });
		    }),
		    transform: (input, options) => new Promise((resolve, reject) => {
		      rejectAllPromise.then(reject);
		      service.transform({
		        callName: "transform",
		        refs: null,
		        input,
		        options: options || {},
		        isTTY: false,
		        fs: {
		          readFile(_, callback) {
		            callback(new Error("Internal error"), null);
		          },
		          writeFile(_, callback) {
		            callback(null);
		          }
		        },
		        callback: (err, res) => err ? reject(err) : resolve(res)
		      });
		    }),
		    formatMessages: (messages, options) => new Promise((resolve, reject) => {
		      rejectAllPromise.then(reject);
		      service.formatMessages({
		        callName: "formatMessages",
		        refs: null,
		        messages,
		        options,
		        callback: (err, res) => err ? reject(err) : resolve(res)
		      });
		    }),
		    analyzeMetafile: (metafile, options) => new Promise((resolve, reject) => {
		      rejectAllPromise.then(reject);
		      service.analyzeMetafile({
		        callName: "analyzeMetafile",
		        refs: null,
		        metafile: typeof metafile === "string" ? metafile : JSON.stringify(metafile),
		        options,
		        callback: (err, res) => err ? reject(err) : resolve(res)
		      });
		    })
		  };
		});
		var browser_default = browser_exports;
		})(module); 
	} (browser));
	return browser.exports;
}

var browserExports = requireBrowser();

let esbuildReady = false;
async function LoadScript(assetPath) {
  const response = await Assets.ResourceFetchFn(assetPath);
  const text = await response.text();
  if (!esbuildReady) {
    await browserExports.initialize({ worker: true, wasmURL: "https://unpkg.com/esbuild-wasm/esbuild.wasm" });
    esbuildReady = true;
  }
  const transpiled = await browserExports.transform(text, {
    loader: "ts",
    format: "esm",
    target: "es2022",
    sourcemap: "inline",
    tsconfigRaw: { compilerOptions: { useDefineForClassFields: true } }
  });
  const blob = new Blob([transpiled.code], { type: "text/javascript" });
  const blobUrl = URL.createObjectURL(blob);
  const module = await import(blobUrl);
  for (const key of Object.keys(module)) {
    if (typeof module[key] === "function") {
      module[key].assetPath = assetPath;
      Component$1.Registry.set(module[key].name, module[key]);
    }
  }
  return module;
}

var ScriptLoader = /*#__PURE__*/Object.freeze({
    __proto__: null,
    LoadScript: LoadScript
});

function deserializeVector2(data, target) {
  const v = target ?? new Mathf.Vector2();
  v.set(data.x, data.y);
  return v;
}
function deserializeVector3(data, target) {
  const v = target ?? new Mathf.Vector3();
  v.set(data.x, data.y, data.z);
  return v;
}
function deserializeQuaternion(data, target) {
  const q = target ?? new Mathf.Quaternion();
  q.set(data.x, data.y, data.z, data.w);
  return q;
}
function deserializeColor(data, target) {
  const c = target ?? new Mathf.Color();
  c.set(data.r, data.g, data.b, data.a);
  return c;
}
const typedArrayCtors = {
  float32: Float32Array,
  uint32: Uint32Array,
  uint16: Uint16Array,
  uint8: Uint8Array
};
function makeTypedArray(data, arrayType) {
  const Ctor = typedArrayCtors[arrayType];
  if (!Ctor) throw Error(`Invalid array type "${arrayType}"`);
  return new Ctor(data);
}
function deserializeAttribute(data) {
  const array = makeTypedArray(data.array, data.arrayType);
  let attr;
  if (data.attributeType === "@trident/core/Geometry/InterleavedVertexAttribute") {
    attr = new InterleavedVertexAttribute(array, data.stride);
  } else if (data.attributeType === "@trident/core/Geometry/IndexAttribute") {
    attr = new IndexAttribute(array);
  } else {
    attr = new VertexAttribute(array);
  }
  attr.currentOffset = data.currentOffset;
  attr.currentSize = data.currentSize;
  return attr;
}
function deserializeGeometryData(data, target) {
  const geometry = target ?? new Geometry();
  geometry.id = data.id;
  geometry.name = data.name;
  geometry.assetPath = data.assetPath;
  for (const attribute of data.attributes) {
    geometry.attributes.set(attribute.name, deserializeAttribute(attribute));
  }
  if (data.index) geometry.index = deserializeAttribute(data.index);
  return geometry;
}
async function deserializeGeometryRef(data) {
  if (!data.assetPath) throw Error("Geometry needs an assetPath.");
  const cached = AssetRegistry.GetInstance(data.assetPath);
  if (cached) return cached;
  const coreInstance = Assets.GetInstance(data.assetPath);
  if (coreInstance) return coreInstance;
  const json = await Assets.Load(data.assetPath, "json");
  const geometry = deserializeGeometryData(json);
  AssetRegistry.SetInstance(data.assetPath, geometry);
  return geometry;
}
async function deserializeTexture(data) {
  const bytes = await Assets.Load(data.assetPath, "binary");
  const texture = await Texture.LoadBlob(new Blob([bytes]), data.format, {
    name: data.name,
    generateMips: data.generateMips
  });
  texture.assetPath = data.assetPath;
  return texture;
}
const textureFields = ["albedoMap", "normalMap", "armMap", "heightMap", "emissiveMap"];
const scalarFields = ["roughness", "metalness", "doubleSided", "alphaCutoff", "unlit", "wireframe", "isSkinned", "isDeferred"];
async function deserializePBRParams(data) {
  const params = {};
  const p = data?.params ?? {};
  for (const field of scalarFields) {
    if (p[field] !== void 0) params[field] = p[field];
  }
  if (p.albedoColor) params.albedoColor = deserializeColor(p.albedoColor);
  if (p.emissiveColor) params.emissiveColor = deserializeColor(p.emissiveColor);
  if (p.repeat) params.repeat = deserializeVector2(p.repeat);
  if (p.offset) params.offset = deserializeVector2(p.offset);
  for (const field of textureFields) {
    if (p[field]) params[field] = await deserializeTexture(p[field]);
  }
  return params;
}
async function deserializePBRMaterial(data) {
  const params = await deserializePBRParams(data);
  return new PBRMaterial(params);
}
async function deserializeMaterialData(material, data) {
  if (data.params) {
    material.params.isDeferred = data.params.isDeferred;
  }
}
async function deserializeMaterial(data) {
  if (data.assetPath) {
    const cached = AssetRegistry.GetInstance(data.assetPath);
    if (cached) return cached;
    const json = await Assets.Load(data.assetPath, "json");
    const materialType = json?.type ?? data.type;
    const material2 = materialType === PBRMaterial.type ? await deserializePBRMaterial(json) : GPU.Material.Create(materialType);
    material2.assetPath = data.assetPath;
    if (!(material2 instanceof PBRMaterial)) {
      await deserializeMaterialData(material2, json);
    }
    AssetRegistry.SetInstance(data.assetPath, material2);
    return material2;
  }
  const material = data?.type === PBRMaterial.type ? await deserializePBRMaterial(data) : GPU.Material.Create(data.type);
  if (!(material instanceof PBRMaterial)) {
    await deserializeMaterialData(material, data);
  }
  return material;
}
function deserializeValue(target, data) {
  if (typeof data === "boolean" || typeof data === "number" || typeof data === "string") return data;
  if (target instanceof Float32Array) return new Float32Array(data);
  if (target instanceof Array) return data;
  if (target instanceof Mathf.Vector3) {
    deserializeVector3(data, target);
    return target;
  }
  if (target instanceof Mathf.Vector2) {
    deserializeVector2(data, target);
    return target;
  }
  if (target instanceof Mathf.Color) {
    deserializeColor(data, target);
    return target;
  }
  if (target instanceof Mathf.Quaternion) {
    deserializeQuaternion(data, target);
    return target;
  }
  throw Error(`Could not deserialize value: ${data}`);
}
const deferredRefs = [];
const idMap = /* @__PURE__ */ new Map();
async function deserializeComponentFields(component, data) {
  if (component instanceof Components.Renderable) {
    await deserializeRenderable(component, data);
    return;
  }
  if (component instanceof Components.Animator) {
    await deserializeAnimatorFields(component, data);
    return;
  }
  for (const property in data) {
    if (property === "type" || property === "id" || property === "name" || property === "assetPath") continue;
    const value = data[property];
    if (value && typeof value === "object" && value.__ref === "GameObject") {
      deferredRefs.push({ component, property, id: value.id });
      continue;
    }
    if (component[property] === void 0) continue;
    component[property] = deserializeValue(component[property], value);
  }
}
function resolveDeferredRefs() {
  for (const ref of deferredRefs) {
    ref.component[ref.property] = idMap.get(ref.id) ?? null;
  }
  deferredRefs.length = 0;
  idMap.clear();
}
function deserializeTransform(transform, data) {
  if (!data) return;
  if (data.localPosition) deserializeVector3(data.localPosition, transform.localPosition);
  if (data.localRotation) deserializeQuaternion(data.localRotation, transform.localRotation);
  if (data.scale) deserializeVector3(data.scale, transform.scale);
}
async function deserializeRenderable(renderable, data) {
  renderable.enableShadows = data.enableShadows;
  renderable.geometry = await deserializeGeometryRef(data.geometry);
  renderable.material = await deserializeMaterial(data.material);
}
async function deserializeAnimatorFields(animator, data) {
  if (data.assetPath) {
    animator.assetPath = data.assetPath;
    const cached = AssetRegistry.GetInstance(data.assetPath);
    if (cached) {
      animator.clips = cached.clips ?? [];
      animator.tracksData = cached.tracks ?? cached.tracksData ?? {};
      return;
    }
    const json = await Assets.Load(data.assetPath, "json");
    animator.clips = json.clips ?? [];
    animator.tracksData = json.tracks ?? {};
    AssetRegistry.SetInstance(data.assetPath, json);
    return;
  }
  animator.clips = data.clips ?? [];
  animator.tracksData = data.tracks ?? {};
}
async function instantiatePrefab(scene, data, parent) {
  const gameObject = new GameObject(scene);
  if (data.id) idMap.set(data.id, gameObject);
  gameObject.enabled = false;
  if (parent) gameObject.transform.parent = parent;
  if (data.assetPath && data.components.length === 0) {
    gameObject.assetPath = data.assetPath;
    let prefabData = AssetRegistry.GetInstance(data.assetPath);
    if (!prefabData) {
      const json = await Assets.Load(data.assetPath, "json");
      prefabData = Prefab.Deserialize(json);
      AssetRegistry.SetInstance(data.assetPath, prefabData);
    }
    gameObject.name = data.name;
    await deserializeGameObjectFromPrefab(gameObject, prefabData);
    gameObject.assetPath = data.assetPath;
    deserializeTransform(gameObject.transform, data.transform);
    if (!parent) gameObject.enabled = true;
    return gameObject;
  }
  await deserializeGameObjectFromPrefab(gameObject, data);
  if (!parent) gameObject.enabled = true;
  return gameObject;
}
async function deserializeGameObjectFromPrefab(gameObject, data) {
  gameObject.name = data.name;
  deserializeTransform(gameObject.transform, data.transform);
  const componentInstances = [];
  for (const component of data.components) {
    if (component.assetPath && !Component$1.Registry.get(component.type)) {
      await LoadScript(component.assetPath);
    }
    const componentClass = Component$1.Registry.get(component.type);
    if (!componentClass) throw Error(`Component ${component.type} not found in component registry.`);
    const instance = gameObject.AddComponent(componentClass);
    componentInstances.push(instance);
  }
  for (let i = 0; i < data.components.length; i++) {
    await deserializeComponentFields(componentInstances[i], data.components[i]);
  }
  for (const childData of data.children) {
    await instantiatePrefab(gameObject.scene, childData, gameObject.transform);
  }
}
async function deserializeScene(scene, data) {
  for (const serializedGameObject of data.gameObjects) {
    await instantiatePrefab(scene, Prefab.Deserialize(serializedGameObject));
  }
  resolveDeferredRefs();
  let firstCamera = null;
  for (const gameObject of scene.GetGameObjects()) {
    for (const component of gameObject.GetComponents(Components.Camera)) {
      if (!firstCamera) firstCamera = component;
      if (component.id === data.mainCamera) {
        Components.Camera.mainCamera = component;
        return;
      }
    }
  }
  if (firstCamera) Components.Camera.mainCamera = firstCamera;
}

class TridentAPI {
  currentScene;
  createRenderer(canvas) {
    Renderer.Create(canvas, "webgpu");
  }
  createScene() {
    this.currentScene = new Scene(Renderer);
    return this.currentScene;
  }
  createGameObject(scene) {
    const gameObject = new GameObject(scene);
    return gameObject;
  }
  createVector3(x, y, z) {
    const vec3 = new Mathf.Vector3(x, y, z);
    return vec3;
  }
  createVector2(x, y, z) {
    const vec2 = new Mathf.Vector2(x, y);
    return vec2;
  }
  createColor(r, g, b, a) {
    const color = new Mathf.Color(r, g, b, a);
    return color;
  }
  createPlaneGeometry() {
    return Geometry.Plane();
  }
  createCubeGeometry() {
    return Geometry.Cube();
  }
  createSphereGeometry() {
    return Geometry.Sphere();
  }
  createCapsuleGeometry() {
    return Geometry.Capsule();
  }
  createPBRMaterial(args) {
    return new PBRMaterial(args);
  }
  createPrefab() {
    return new Prefab();
  }
  async deserializeGeometry(serialized) {
    return deserializeGeometryRef(serialized);
  }
  async deserializeMaterial(serialized) {
    return deserializeMaterial(serialized);
  }
  deserializePrefab(serialized) {
    return Prefab.Deserialize(serialized);
  }
  async createTextureFromBlob(blob, format, options) {
    return GPU.Texture.LoadBlob(blob);
  }
  compareType(value, type) {
    if (typeof value === "function") return value === type;
    if (value instanceof type) return true;
    return value?.constructor?.type === type.type;
  }
  getFieldType(value) {
    if (this.compareType(value, Prefab)) return "Prefab";
    else if (this.compareType(value, GameObject)) return "GameObject";
    else if (this.compareType(value, Component$1)) return "Component";
    else if (this.compareType(value, Mathf.Vector3)) return "Vector3";
    else if (this.compareType(value, Mathf.Vector2)) return "Vector2";
    else if (this.compareType(value, Mathf.Color)) return "Color";
    else if (this.compareType(value, Geometry)) return "Geometry";
    else if (this.compareType(value, GPU.Material)) return "Material";
    else if (this.compareType(value, GPU.Texture)) return "Texture";
    return "unknown";
  }
  isGameObject(value) {
    if (typeof value === "function") return value === GameObject;
    return value instanceof GameObject;
  }
  isVector3(value) {
    if (typeof value === "function") return value === Mathf.Vector3;
    return value instanceof Mathf.Vector3;
  }
  isVector2(value) {
    if (typeof value === "function") return value === Mathf.Vector2;
    return value instanceof Mathf.Vector2;
  }
  isColor(value) {
    if (typeof value === "function") return value === Mathf.Color;
    return value instanceof Mathf.Color;
  }
  isComponent(value) {
    if (typeof value === "function") return value === Component$1;
    return value instanceof Component$1;
  }
  isPrefab(value) {
    if (typeof value === "function") return value === Prefab;
    return value instanceof Prefab;
  }
  isGeometry(value) {
    if (typeof value === "function") return value === Geometry;
    return value instanceof Geometry;
  }
  isMaterial(value) {
    if (typeof value === "function") return value === GPU.Material;
    return value instanceof GPU.Material;
  }
  isTexture(value) {
    if (typeof value === "function") return value === GPU.Texture;
    return value instanceof GPU.Texture;
  }
  GetSerializedFields = Utils.GetSerializedFields;
}

const createElement = (type, props, ...children) => {
  if (props === null) props = {};
  return { type, props, children };
};
const setAttribute = (dom, key, value) => {
  if (typeof value == "function" && key.startsWith("on")) {
    const eventType = key.slice(2).toLowerCase();
    dom.__gooactHandlers = dom.__gooactHandlers || {};
    dom.removeEventListener(eventType, dom.__gooactHandlers[eventType]);
    dom.__gooactHandlers[eventType] = value;
    dom.addEventListener(eventType, dom.__gooactHandlers[eventType]);
  } else if (key == "checked" || key == "value" || key == "className") dom[key] = value;
  else if (key == "style" && typeof value == "object") Object.assign(dom.style, value);
  else if (key == "ref" && typeof value == "function") value(dom);
  else if (key == "key") dom.__gooactKey = value;
  else if (typeof value != "object" && typeof value != "function") dom.setAttribute(key, value);
};
const render = (vdom, parent = null) => {
  const mount = parent ? (el) => {
    parent.appendChild(el);
    return el;
  } : (el) => el;
  if (typeof vdom == "string" || typeof vdom == "number") return mount(document.createTextNode(String(vdom)));
  else if (typeof vdom == "boolean" || vdom === null) return mount(document.createTextNode(""));
  else if (typeof vdom == "object" && typeof vdom.type == "function") return Component.render(vdom, parent);
  else if (typeof vdom == "object" && typeof vdom.type == "string") {
    const dom = mount(document.createElement(vdom.type));
    for (const child of [].concat(...vdom.children)) {
      render(child, dom);
    }
    for (const prop in vdom.props) {
      setAttribute(dom, prop, vdom.props[prop]);
    }
    return dom;
  } else throw new Error(`Invalid VDOM: ${vdom}.`);
};
const patch = (dom, vdom, parent = dom.parentNode) => {
  const replace = parent ? (el) => (parent.replaceChild(el, dom), el) : (el) => el;
  if (typeof vdom == "object" && vdom !== null && typeof vdom.type == "function") return Component.patch(dom, vdom, parent);
  else if ((typeof vdom != "object" || vdom === null) && dom instanceof Text) return dom.textContent != String(vdom) ? replace(render(vdom, parent)) : dom;
  else if (typeof vdom != "object" || vdom === null) return dom instanceof Text ? dom.textContent != String(vdom) ? replace(render(vdom, parent)) : dom : replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom instanceof Text) return replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom.nodeName != vdom.type.toString().toUpperCase()) return replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom.nodeName == vdom.type.toString().toUpperCase()) {
    const pool = {};
    const active = document.activeElement;
    [].concat(...dom.childNodes).map((child, index) => {
      const key = child.__gooactKey || `__index_${index}`;
      pool[key] = child;
    });
    const newChildren = [].concat(...vdom.children);
    const domChildren = dom.childNodes;
    let i = 0;
    for (const child of newChildren) {
      const key = child && child.props && child.props.key || `__index_${i}`;
      let existing = pool[key];
      let updatedNode;
      if (existing) {
        updatedNode = patch(existing, child);
        delete pool[key];
      } else {
        updatedNode = render(child, null);
      }
      const currentNodeAtIndex = domChildren[i];
      if (currentNodeAtIndex !== updatedNode) {
        dom.insertBefore(updatedNode, currentNodeAtIndex || null);
      }
      i++;
    }
    for (const key in pool) {
      const leftover = pool[key];
      const instance = leftover.__gooactInstance;
      if (instance) instance.componentWillUnmount();
      if (leftover.parentNode) {
        leftover.parentNode.removeChild(leftover);
      }
    }
    for (const key in pool) {
      const instance = pool[key].__gooactInstance;
      if (instance) instance.componentWillUnmount();
      pool[key].remove();
    }
    for (const attr of dom.attributes) dom.removeAttribute(attr.name);
    for (const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop]);
    active && active.focus();
    return dom;
  }
  return dom;
};
class Component {
  props;
  state;
  base;
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }
  static render(vdom, parent = null) {
    const props = Object.assign({}, vdom.props, { children: vdom.children });
    if (Component.isPrototypeOf(vdom.type)) {
      const Ctor = vdom.type;
      const instance = new Ctor(props);
      instance.componentWillMount();
      instance.base = render(instance.render(), parent);
      instance.base.__gooactInstance = instance;
      instance.base.__gooactKey = vdom.props && vdom.props.key;
      instance.componentDidMount();
      return instance.base;
    } else {
      const func = vdom.type;
      return render(func(props), parent);
    }
  }
  static patch(dom, vdom, parent = dom.parentNode) {
    const props = Object.assign({}, vdom.props, { children: vdom.children });
    if (dom.__gooactInstance && dom.__gooactInstance.constructor == vdom.type) {
      dom.__gooactInstance.componentWillReceiveProps(props);
      dom.__gooactInstance.props = props;
      return patch(dom, dom.__gooactInstance.render(), parent);
    } else if (Component.isPrototypeOf(vdom.type)) {
      const ndom = Component.render(vdom, parent);
      return parent ? (parent.replaceChild(ndom, dom), ndom) : ndom;
    } else if (!Component.isPrototypeOf(vdom.type)) {
      const func = vdom.type;
      return patch(dom, func(props), parent);
    }
    return dom;
  }
  // Note: the original behavior passes (this.props, nextState) to shouldComponentUpdate.
  setState(next) {
    const compat = (a) => typeof this.state == "object" && this.state !== null && typeof a == "object" && a !== null;
    if (this.base && this.shouldComponentUpdate(this.props, next)) {
      const prevState = this.state;
      this.componentWillUpdate(this.props, next);
      this.state = compat(next) ? Object.assign({}, this.state, next) : next;
      patch(this.base, this.render());
      this.componentDidUpdate(this.props, prevState);
    } else {
      this.state = compat(next) ? Object.assign({}, this.state, next) : next;
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps != this.props || nextState != this.state;
  }
  componentWillReceiveProps(nextProps) {
    return void 0;
  }
  componentWillUpdate(nextProps, nextState) {
    return void 0;
  }
  componentDidUpdate(prevProps, prevState) {
    return void 0;
  }
  componentWillMount() {
    return void 0;
  }
  componentDidMount() {
    return void 0;
  }
  componentWillUnmount() {
    return void 0;
  }
  render(_) {
    return null;
  }
}

class LayoutResizer extends Component {
  manageResize(md, sizeProp, posProp) {
    var r = md.target;
    var prev = r.previousElementSibling;
    var next = r.nextElementSibling;
    if (!prev || !next) {
      return;
    }
    md.preventDefault();
    var prevSize = prev[sizeProp];
    var nextSize = next[sizeProp];
    var sumSize = prevSize + nextSize;
    var prevGrow = Number(prev.style.flexGrow);
    var nextGrow = Number(next.style.flexGrow);
    var sumGrow = prevGrow + nextGrow;
    var lastPos = md[posProp];
    function onMouseMove(mm) {
      var pos = mm[posProp];
      var d = pos - lastPos;
      prevSize += d;
      nextSize -= d;
      if (prevSize < 0) {
        nextSize += prevSize;
        pos -= prevSize;
        prevSize = 0;
      }
      if (nextSize < 0) {
        prevSize += nextSize;
        pos += nextSize;
        nextSize = 0;
      }
      var prevGrowNew = sumGrow * (prevSize / sumSize);
      var nextGrowNew = sumGrow * (nextSize / sumSize);
      prev.style.flexGrow = prevGrowNew;
      next.style.flexGrow = nextGrowNew;
      lastPos = pos;
    }
    function onMouseUp(mu) {
      if (posProp === "pageX") {
        r.style.cursor = "ew-resize";
      } else {
        r.style.cursor = "ns-resize";
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
  onMouseDown(event) {
    var target = event.target;
    var parent = target.parentNode;
    var h = parent.classList.contains("h");
    var v = parent.classList.contains("v");
    if (h && v) return;
    else if (h) {
      target.style.cursor = "col-resize";
      this.manageResize(event, "offsetWidth", "pageX");
    } else if (v) {
      target.style.cursor = "row-resize";
      this.manageResize(event, "offsetHeight", "pageY");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("flex-resizer", { onMouseDown: (event) => {
      this.onMouseDown(event);
    } });
  }
}

const IComponents = {
  Camera: Components.Camera,
  SpotLight: Components.SpotLight,
  PointLight: Components.PointLight,
  DirectionalLight: Components.DirectionalLight,
  Mesh: Components.Mesh,
  SkinnedMesh: Components.SkinnedMesh,
  Animator: Components.Animator,
  AnimationTrack: Components.AnimationTrack
};

class ComponentEvents {
  static Created = (gameObject, component) => {
  };
  static Deleted = (gameObject, component) => {
  };
}
class GameObjectEvents {
  static Selected = (gameObject) => {
  };
  static Created = (gameObject) => {
  };
  static Deleted = (gameObject) => {
  };
  static Changed = (gameObject) => {
  };
}
class ProjectEvents {
  static Opened = () => {
  };
}
class FileEvents {
  static Created = (path, handle) => {
  };
  static Changed = (path, handle) => {
  };
  static Deleted = (path, handle) => {
  };
}
class DirectoryEvents {
  static Created = (path, handle) => {
  };
  static Deleted = (path, handle) => {
  };
}
class LayoutHierarchyEvents {
  static Selected = (gameObject) => {
  };
}
class SceneEvents {
  static Loaded = (scene) => {
  };
}
class EventSystem {
  static events = /* @__PURE__ */ new Map();
  static on(event, callback) {
    const events = this.events.get(event) || [];
    events.push(callback);
    this.events.set(event, events);
  }
  static emit(event, ...args) {
    const callbacks = this.events.get(event);
    if (callbacks === void 0) return;
    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i](...args);
    }
  }
}

const DYNAMIC_SLOT_BYTES = 256;
const DYNAMIC_SLOT_FLOATS = DYNAMIC_SLOT_BYTES / 4;
class Raycaster {
  shader;
  renderTarget;
  idMap;
  initialized = false;
  constructor() {
    this.init();
  }
  async init() {
    this.shader = await GPU.Shader.Create({
      code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                };

                @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(3) var<storage, read> id: f32;

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = projectionMatrix * viewMatrix * modelMatrix[0] * vec4(input.position, 1.0);
                    return output;
                }

                                  
                fn rand(x: f32) -> f32 {
                    return fract(sin(x) * 43758.5453123);
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) u32 {
                    // store object id in red channel
                    return u32(id);
                }
              `,
      colorOutputs: [{ format: "r32uint" }]
    });
    this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "r32uint");
    this.idMap = GPU.DynamicBuffer.Create(1e4 * DYNAMIC_SLOT_BYTES * 4, GPU.BufferType.STORAGE, DYNAMIC_SLOT_BYTES);
    this.shader.SetBuffer("id", this.idMap);
    this.initialized = true;
  }
  mouseToPixel() {
    const mousePosition = Input.mousePosition;
    const rect = GPU.Renderer.canvas.getBoundingClientRect();
    const u = (mousePosition.x - rect.left) / rect.width;
    const v = (mousePosition.y - rect.top) / rect.height;
    const texWidth = this.renderTarget.width;
    const texHeight = this.renderTarget.height;
    const x = Math.floor(u * texWidth);
    const y = Math.floor(v * texHeight);
    return {
      x: Math.max(0, Math.min(texWidth - 1, x)),
      y: Math.max(0, Math.min(texHeight - 1, y))
    };
  }
  async execute() {
    if (!this.initialized) return;
    const resources = Scene.mainScene.renderPipeline.renderGraph.resourcePool;
    const gBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!gBufferDepth) return;
    const camera = Components.Camera.mainCamera;
    this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
    this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
    const all = Scene.mainScene.GetComponents(Components.Renderable);
    const pickables = all.filter((r) => !!r.geometry);
    const ids = new Float32Array(pickables.length * DYNAMIC_SLOT_FLOATS);
    for (let slot = 0; slot < pickables.length; slot++) {
      pickables[slot].OnPreRender(this.shader);
      ids[slot * DYNAMIC_SLOT_FLOATS] = slot + 1;
    }
    this.idMap.SetArray(ids);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass("Raycaster", [{ target: this.renderTarget, clear: true }], gBufferDepth, true);
    for (let slot = 0; slot < pickables.length; slot++) {
      this.idMap.dynamicOffset = slot * DYNAMIC_SLOT_BYTES;
      pickables[slot].OnRenderObject(this.shader);
    }
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
    const mousePixel = this.mouseToPixel();
    const id = (await this.renderTarget.GetPixels(mousePixel.x, mousePixel.y, 1, 1, 0))[0];
    if (id > 0) {
      return pickables[id - 1].gameObject;
    }
    return null;
  }
}

class LayoutCanvas extends Component {
  async canvasRef(canvas) {
    const cameraSettings = {
      near: 0.05,
      far: 1e4
    };
    Console.getVar("r_shadows_csm_splittypepracticallambda").value = 0.99;
    const resize = () => {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      camera.SetPerspective(72, canvas.width / canvas.height, cameraSettings.near, cameraSettings.far);
    };
    new ResizeObserver(resize).observe(canvas);
    const EngineAPI = this.props.engineAPI;
    EngineAPI.createRenderer(canvas);
    const currentScene = EngineAPI.createScene();
    const mainCameraGameObject = EngineAPI.createGameObject(currentScene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(IComponents.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, cameraSettings.near, cameraSettings.far);
    EventSystem.on(GPU.RendererEvents.Resized, () => {
      console.log(canvas.getBoundingClientRect(), canvas.width, canvas.height);
      camera.SetPerspective(72, canvas.width / canvas.height, cameraSettings.near, cameraSettings.far);
    });
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    const controls = new OrbitControls(canvas, camera);
    const lightGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    lightGameObject.name = "Light";
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    const light = lightGameObject.AddComponent(IComponents.DirectionalLight);
    light.castShadows = true;
    const floorGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    floorGameObject.name = "Floor";
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(IComponents.Mesh);
    floorMesh.geometry = EngineAPI.createPlaneGeometry();
    floorMesh.material = EngineAPI.createPBRMaterial();
    const cubeGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    cubeGameObject.name = "Cube";
    const cubeMesh = cubeGameObject.AddComponent(IComponents.Mesh);
    cubeMesh.geometry = EngineAPI.createCubeGeometry();
    cubeMesh.material = EngineAPI.createPBRMaterial();
    const sky = new Sky();
    sky.SUN_ELEVATION_DEGREES = 60;
    await sky.init();
    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);
    const environment = new Environment(EngineAPI.currentScene, skyTexture);
    await environment.init();
    const raycaster = new Raycaster();
    let mouseDownPosition = { x: 0, y: 0 };
    let mouseUpPosition = { x: 0, y: 0 };
    let pickedGameObject = void 0;
    canvas.addEventListener("mousedown", (event) => {
      mouseDownPosition = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("mouseup", async (event) => {
      mouseUpPosition = { x: event.clientX, y: event.clientY };
      const mouseDrif = { x: mouseDownPosition.x - mouseUpPosition.x, y: mouseDownPosition.y - mouseUpPosition.y };
      if (mouseDrif.x == 0 && mouseDrif.y == 0) {
        pickedGameObject = await raycaster.execute();
        if (pickedGameObject) {
          EventSystem.emit(GameObjectEvents.Selected, pickedGameObject);
        }
      }
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "f") {
        if (pickedGameObject) {
          controls.center.copy(pickedGameObject.transform.position);
          Components.Camera.mainCamera;
          controls.orbit(0, 0);
        }
      }
    });
    EventSystem.on(LayoutHierarchyEvents.Selected, (_pickedGameObject) => {
      pickedGameObject = _pickedGameObject;
    });
    EventSystem.on(SceneEvents.Loaded, (scene) => {
      const mainCamera = Components.Camera.mainCamera;
      new OrbitControls(canvas, mainCamera);
    });
    {
      canvas.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      canvas.addEventListener("drop", async (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const arrayBuffer = await file.arrayBuffer();
        await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, currentScene, file.name);
      });
    }
    const postProcessing = new PostProcessingPass();
    const smaa = new PostProcessingSMAA();
    postProcessing.effects.push(smaa);
    currentScene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);
    currentScene.Start();
    new ResizeObserver(resize).observe(canvas);
    console.warn(`
            TODO: Figure out better component registration, needs to be automatic or something.
                Importing/Creating scripts is not that easy..need above otherwise need to register everything.
                Also need to import @trident/core properly (this is a typescript pattern).
                Also need to make SerializeField work somehow
            `);
    class Test extends Components.Component {
      static type = "@trident/core/components/Test";
      static types = (() => {
        console.log("CALLED without new Test");
      })();
    }
    console.log(Components.Component.Registry.get("@trident/core/components/Test"));
  }
  render() {
    return /* @__PURE__ */ createElement("canvas", { ref: (canvas) => this.canvasRef(canvas) });
  }
}

var MODE = /* @__PURE__ */ ((MODE2) => {
  MODE2[MODE2["R"] = 0] = "R";
  MODE2[MODE2["W"] = 1] = "W";
  MODE2[MODE2["A"] = 2] = "A";
  return MODE2;
})(MODE || {});
class _FileBrowser {
  rootFolderHandle;
  constructor() {
    if (!window.showDirectoryPicker) {
      alert("FileSystem API not supported.");
      throw Error("FileSystem API not supported.");
    }
  }
  setRootFolderHandle(handle) {
    this.rootFolderHandle = handle;
  }
  getRootFolderHandle() {
    return this.rootFolderHandle;
  }
  init() {
    return new Promise((resolve, reject) => {
      window.showDirectoryPicker().then((folderHandle) => {
        this.rootFolderHandle = folderHandle;
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });
  }
  async opendir(path) {
    if (!this.rootFolderHandle) {
      alert("Trying to open a directory without initializing the File System.");
      return;
    }
    if (path == "") return this.rootFolderHandle;
    const pathArray = path.split("/");
    let currentDirectoryHandle = this.rootFolderHandle;
    for (const entry of pathArray) {
      if (entry == "") continue;
      currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(entry);
    }
    if (currentDirectoryHandle.kind == "directory" && currentDirectoryHandle.name == pathArray[pathArray.length - 1]) {
      return currentDirectoryHandle;
    }
    throw Error(`Directory not found at "${path}"`);
  }
  async readdir(folderHandle) {
    let files = [];
    const values = folderHandle.values();
    for await (const entry of values) {
      files.push(entry);
    }
    return files;
  }
  mkdir(path) {
    const pathArray = path.split("/");
    const directoryName = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    return this.opendir(pathWithoutDirectory).then((folderHandle) => {
      return folderHandle.getDirectoryHandle(directoryName, {
        create: true
      });
    });
  }
  rmdir(path) {
    const parentPath = path.slice(0, path.lastIndexOf("/"));
    const dirName = path.slice(path.lastIndexOf("/") + 1);
    this.opendir(parentPath).then(async (folderHandle) => {
      folderHandle.removeEntry(dirName, { recursive: true });
    });
  }
  fopen(path, mode) {
    if (mode == 2 /* A */) {
      console.warn("MODE.A not implemented.");
    }
    const pathArray = path.split("/");
    const filename = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    return this.opendir(pathWithoutDirectory).then((folderHandle) => {
      return folderHandle.getFileHandle(filename, {
        create: mode == 2 /* A */ || mode == 1 /* W */ ? true : false
      });
    });
  }
  // TODO: Make more efficient by chunking
  fread(file, start, end) {
    return file.getFile().then((value) => {
      return value.slice(start, end);
    });
  }
  // TODO: Do append
  fwrite(file, buf) {
    return file.createWritable().then((writableStream) => {
      writableStream.write(buf);
      return writableStream.close();
    });
  }
  remove(path) {
    const pathArray = path.split("/");
    const filename = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    this.opendir(pathWithoutDirectory).then(async (folderHandle) => {
      const files = await this.readdir(folderHandle);
      for (let file of files) {
        if (file.kind == "file" && file.name == filename) {
          folderHandle.removeEntry(filename);
          break;
        }
      }
    });
  }
  is_directory(path) {
    return this.opendir(path).then((folderHandle) => {
      return true;
    }).catch((error) => {
      return false;
    });
  }
  exists(path) {
    return this.is_directory(path).then((isDirectory) => {
      if (isDirectory) {
        return true;
      }
      return this.fopen(path, 0 /* R */).then((file) => {
        return true;
      }).catch((error) => {
        return false;
      });
    });
  }
}
const FileBrowser = new _FileBrowser();

class FileWatcher {
  watches;
  constructor() {
    this.watches = /* @__PURE__ */ new Map();
    setInterval(() => this.update(), 500);
  }
  watch(directoryPath) {
    FileBrowser.opendir(directoryPath).then((directoryHandle) => {
      this.watches.set(directoryPath, {
        path: directoryPath,
        handle: directoryHandle,
        files: /* @__PURE__ */ new Map()
      });
    }).catch((error) => {
      console.warn("error", error);
    });
  }
  unwatch(directoryPath) {
    if (this.watches.has(directoryPath)) {
      this.watches.delete(directoryPath);
    }
  }
  getWatchMap() {
    return this.watches;
  }
  async update() {
    for (const [directoryPath, directoryWatch] of this.watches) {
      if (directoryPath[0] == ".") continue;
      const directoryPathExists = await FileBrowser.exists(directoryPath);
      if (!directoryPathExists) {
        this.watches.delete(directoryPath);
        EventSystem.emit(DirectoryEvents.Deleted, directoryPath, directoryWatch.handle);
        continue;
      }
      for (let watchFilesPair of directoryWatch.files) {
        const watchFilePath = watchFilesPair[0];
        const watchFile = watchFilesPair[1];
        const fileExists = await FileBrowser.exists(watchFilePath);
        if (!fileExists) {
          directoryWatch.files.delete(watchFile.path);
          if (watchFile.handle instanceof FileSystemFileHandle) {
            EventSystem.emit(FileEvents.Deleted, watchFile.path, watchFile.handle);
          }
        }
      }
      const files = await FileBrowser.readdir(directoryWatch.handle);
      for (let file of files) {
        if (file.name[0] == ".") continue;
        if (file.kind == "file") {
          const fileHandle = await file.getFile();
          const filePath = directoryPath + "/" + file.name;
          if (!directoryWatch.files.has(filePath)) {
            directoryWatch.files.set(filePath, {
              path: filePath,
              handle: file,
              lastModified: fileHandle.lastModified
            });
            EventSystem.emit(FileEvents.Created, filePath, file);
          } else {
            const storedFile = directoryWatch.files.get(filePath);
            if (storedFile.lastModified != fileHandle.lastModified) {
              storedFile.lastModified = fileHandle.lastModified;
              EventSystem.emit(FileEvents.Changed, filePath, file);
            }
          }
        } else if (file.kind == "directory") {
          const directoryDirectoryPath = directoryPath + "/" + file.name;
          if (!directoryWatch.files.has(directoryDirectoryPath)) {
            directoryWatch.files.set(directoryDirectoryPath, {
              path: directoryDirectoryPath,
              handle: file,
              lastModified: 0
            });
            EventSystem.emit(DirectoryEvents.Created, directoryDirectoryPath, file);
          }
        }
      }
    }
  }
}

class StringUtils {
  static CamelCaseToArray(str) {
    return str.split(/(?=[A-Z])/);
  }
  static CapitalizeStrArray(strArr) {
    let output = [];
    for (let word of strArr) {
      output.push(word[0].toUpperCase() + word.slice(1));
    }
    return output;
  }
  static GetEnumKeyByEnumValue(myEnum, enumValue) {
    let keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
    return keys.length > 0 ? keys[0] : null;
  }
  static GetNameForPath(path) {
    const extensionIndex = path.lastIndexOf(".");
    return path.slice(path.lastIndexOf("/") + 1, extensionIndex !== -1 ? extensionIndex : path.length);
  }
  static Dirname(path) {
    const pathArr = path.split("/");
    const parentPath = pathArr.slice(0, pathArr.length - 1);
    return parentPath.join("/");
  }
}

class ExtendedDataTransfer {
  static data;
}

class Arrow extends Component {
  render() {
    return /* @__PURE__ */ createElement("span", { style: `display: inline-block; rotate: ${this.props.isOpen ? "-90deg" : "180deg"}` }, "\u3031");
  }
}

class TreeFolder extends Component {
  folderRef;
  constructor(props) {
    super(props);
    this.state = { isOpen: false };
  }
  handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.onToggled) this.props.onToggled();
    this.setState({ isOpen: !this.state.isOpen });
  }
  onDragStart(event) {
    if (this.props.id) event.dataTransfer.setData("from-uuid", this.props.id);
    if (this.props.onDragStarted) this.props.onDragStarted(event);
  }
  onDrop(event) {
    if (this.props.onDropped) this.props.onDropped(event);
    if (this.folderRef) this.folderRef.style.backgroundColor = "";
    const fromUuid = event.dataTransfer.getData("from-uuid");
    if (fromUuid && this.props.onDroppedItem && this.props.id) {
      this.props.onDroppedItem(fromUuid, this.props.id);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
    if (this.folderRef) this.folderRef.style.backgroundColor = "#3498db80";
  }
  onDragLeave(event) {
    if (this.folderRef) this.folderRef.style.backgroundColor = "";
  }
  render() {
    let classes = "item-title";
    if (this.props.isSelected) classes += " active";
    return /* @__PURE__ */ createElement("div", { key: this.props.key, className: "item", ref: (ref) => this.folderRef = ref }, /* @__PURE__ */ createElement(
      "div",
      {
        style: { display: "flex", alignItems: "center" },
        className: classes,
        draggable: true,
        onDragStart: (event) => this.onDragStart(event),
        onDragEnter: (event) => this.onDragEnter(event),
        onDragLeave: (event) => this.onDragLeave(event),
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event),
        onPointerDown: (event) => {
          if (this.props.onPointerDown) this.props.onPointerDown();
        },
        onPointerUp: (event) => {
          if (this.props.onPointerUp) this.props.onPointerUp();
        },
        onDblClick: () => {
          if (this.props.onDoubleClicked) this.props.onDoubleClicked();
        }
      },
      /* @__PURE__ */ createElement(
        "span",
        {
          style: { width: "15px", height: "15px", fontSize: "10px" },
          onPointerDown: (event) => this.handleToggle(event)
        },
        /* @__PURE__ */ createElement(Arrow, { isOpen: this.state.isOpen })
      ),
      /* @__PURE__ */ createElement("span", null, this.props.name)
    ), /* @__PURE__ */ createElement("div", { className: "item-content", style: { height: this.state.isOpen ? "auto" : "0" } }, [this.props.children].flat(Infinity)));
  }
}

class TreeItem extends Component {
  itemRef;
  onDragStart(event) {
    if (this.props.id) event.dataTransfer.setData("from-uuid", this.props.id);
    if (this.props.onDragStarted) this.props.onDragStarted(event);
  }
  onDrop(event) {
    if (this.props.onDropped) this.props.onDropped(event);
    if (this.itemRef) this.itemRef.style.backgroundColor = "";
    const fromUuid = event.dataTransfer.getData("from-uuid");
    if (fromUuid && this.props.onDroppedItem && this.props.id) {
      this.props.onDroppedItem(fromUuid, this.props.id);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
    if (this.itemRef) this.itemRef.style.backgroundColor = "#3498db80";
  }
  onDragLeave(event) {
    if (this.itemRef) this.itemRef.style.backgroundColor = "";
  }
  lastClickTs = 0;
  dblMs = 220;
  onPointerDown(event) {
    if (this.props.onPointerDown) this.props.onPointerDown();
    const now = performance.now();
    if (now - this.lastClickTs < this.dblMs && this.props.onDoubleClicked) {
      this.props.onDoubleClicked();
    }
    this.lastClickTs = now;
  }
  render() {
    let classes = "item-title";
    if (this.props.isSelected) classes += " active";
    return /* @__PURE__ */ createElement("div", { className: "item", ref: (ref) => this.itemRef = ref }, /* @__PURE__ */ createElement(
      "div",
      {
        style: { display: "flex", alignItems: "center" },
        className: classes,
        draggable: true,
        onDragStart: (event) => this.onDragStart(event),
        onDragEnter: (event) => this.onDragEnter(event),
        onDragLeave: (event) => this.onDragLeave(event),
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event),
        onPointerDown: (event) => this.onPointerDown(event),
        onPointerUp: (event) => {
          if (this.props.onPointerUp) this.props.onPointerUp();
        }
      },
      /* @__PURE__ */ createElement("span", { style: { paddingLeft: "15px" } }),
      /* @__PURE__ */ createElement("span", null, this.props.name)
    ));
  }
}

class Tree extends Component {
  render() {
    return /* @__PURE__ */ createElement("div", { className: "treeview" }, [this.props.children].flat(Infinity));
  }
}

class FloatingMenu extends Component {
  menuEl = null;
  onWindowMouseDown = (event) => {
    if (!this.menuEl) return;
    const target = event.target;
    if (this.menuEl.contains(target)) return;
    const trigger = this.base?.previousElementSibling;
    if (trigger && trigger.contains(target)) return;
    if (this.props.onClose) this.props.onClose();
  };
  onMenuRef(el) {
    this.menuEl = el;
    this.reposition();
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.visible && !this.props.visible) {
      requestAnimationFrame(() => {
        this.reposition();
        window.addEventListener("mousedown", this.onWindowMouseDown);
      });
    } else if (!nextProps.visible && this.props.visible) {
      window.removeEventListener("mousedown", this.onWindowMouseDown);
    }
  }
  componentWillUnmount() {
    window.removeEventListener("mousedown", this.onWindowMouseDown);
  }
  reposition() {
    if (!this.menuEl || !this.props.visible) return;
    this.menuEl.style.right = "";
    this.menuEl.style.bottom = "";
    const rect = this.menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      this.menuEl.style.right = "0";
    }
    if (rect.bottom > window.innerHeight) {
      this.menuEl.style.bottom = "100%";
    }
  }
  render() {
    return /* @__PURE__ */ createElement(
      "div",
      {
        class: "Floating-Menu",
        ref: (el) => this.onMenuRef(el),
        style: `display: ${this.props.visible ? "inherit" : "none"}`
      },
      this.props.children
    );
  }
}

async function LoadFile(path, file, engineAPI) {
  const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
  if (extension === "glb") {
    const data = await file.getFile();
    const arrayBuffer = await data.arrayBuffer();
    const rootName = file.name.slice(0, file.name.lastIndexOf("."));
    return GLTFLoader.LoadFromArrayBuffer(arrayBuffer, engineAPI.currentScene, rootName);
  } else if (extension === "scene") {
    const data = await file.getFile();
    const text = await data.text();
    return JSON.parse(text);
  } else if (extension === "prefab") {
    const data = await file.getFile();
    const text = await data.text();
    return Prefab.Deserialize(JSON.parse(text));
  } else if (extension === "geometry") {
    const data = await file.getFile();
    const text = await data.text();
    const geometry = await deserializeGeometryRef(JSON.parse(text));
    geometry.assetPath = path;
    return geometry;
  } else if (extension === "material") {
    const data = await file.getFile();
    const text = await data.text();
    const material = await deserializeMaterial(JSON.parse(text));
    material.assetPath = path;
    return material;
  } else if (extension === "png" || extension === "jpg") {
    const data = await file.getFile();
    const arrayBuffer = await data.arrayBuffer();
    const texture = await engineAPI.createTextureFromBlob(new Blob([arrayBuffer]));
    texture.assetPath = path;
    return texture;
  } else if (extension === "ts") {
    const { LoadScript } = await Promise.resolve().then(function () { return ScriptLoader; });
    return LoadScript(path);
  }
  return file;
}

async function SaveToFile(path, blob) {
  try {
    const file = await FileBrowser.fopen(path, MODE.W);
    await FileBrowser.fwrite(file, blob);
  } catch (error) {
    console.error(`Failed to save at ${path}`);
    console.error(error);
  }
}

async function CreateFolder(currentPath) {
  const path = `${currentPath}/New folder`;
  const handle = await FileBrowser.mkdir(path);
  EventSystem.emit(DirectoryEvents.Created, path, handle);
}

async function CreateMaterial(engineAPI, currentPath) {
  const material = engineAPI.createPBRMaterial();
  material.assetPath = `${currentPath}/New Material.material`;
  const materialSerialized = serializeMaterialAsset(material);
  await SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
}

const DefaultScript = `
    import { Components, SerializeField } from "@trident/core";

    export class NewComponent extends Components.Component {
        @SerializeField public test = 123;
        Start() {

        }
        Update() {}
    }
`;
async function CreateScript(currentPath) {
  const scriptPath = `${currentPath}/NewComponent.ts`;
  await SaveToFile(scriptPath, new Blob([DefaultScript]));
}

async function CreateScene(_currentPath) {
  console.warn("CreateScene is not yet implemented.");
}

async function DeleteAsset(selected) {
  if (!selected) return;
  if (selected.file instanceof FileSystemFileHandle) {
    FileBrowser.remove(selected.path);
    EventSystem.emit(FileEvents.Deleted, selected.path, void 0);
  } else if (selected.file instanceof FileSystemDirectoryHandle) {
    FileBrowser.rmdir(selected.path);
    EventSystem.emit(DirectoryEvents.Deleted, selected.path, void 0);
  }
}

async function SavePrefab(baseDir, gameObject) {
  const rootName = gameObject.name;
  const prefabName = rootName && rootName !== "" ? `${rootName}.prefab` : "Untitled.prefab";
  const prefab = serializeGameObject(gameObject);
  await SaveToFile(`${baseDir}/${prefabName}`, new Blob([JSON.stringify(prefab)]));
}

async function SaveGameObjectAsAsset(baseDir, gameObject) {
  const rootName = gameObject.name;
  const fullAssetDir = `${baseDir}/${rootName}`;
  let geometryCounter = 0;
  let materialCounter = 0;
  let textureCounter = 0;
  const walkAndAssignPaths = (go) => {
    for (const component of go.GetComponents()) {
      const renderable = component;
      if (component.constructor?.type === IComponents.Mesh.type || component.constructor?.type === IComponents.SkinnedMesh.type) {
        const geometry = renderable.geometry;
        if (geometry && !geometry.assetPath) {
          geometry.assetPath = `${fullAssetDir}/${geometry.name || `geometry_${geometryCounter++}`}.geometry`;
        }
        const material = renderable.material;
        if (material && !material.assetPath) {
          material.assetPath = `${fullAssetDir}/${material.name || `material_${materialCounter++}`}.material`;
        }
        const params = material?.params;
        if (params) {
          for (const texName of ["albedoMap", "normalMap", "armMap", "heightMap", "emissiveMap"]) {
            const tex = params[texName];
            if (tex && !tex.assetPath) {
              const rawName = typeof tex.name === "string" ? tex.name.trim() : "";
              const invalidName = rawName.length === 0 || rawName.toLowerCase() === "undefined" || rawName.toLowerCase() === "null";
              const textureName = invalidName ? `texture_${textureCounter++}` : rawName;
              const hasExt = /\.[A-Za-z0-9]+$/.test(textureName);
              const mimeType = typeof tex.blob?.type === "string" ? tex.blob.type.toLowerCase() : "";
              const defaultExt = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
              tex.assetPath = `${fullAssetDir}/${hasExt ? textureName : `${textureName}.${defaultExt}`}`;
            }
          }
        }
      }
      if (component.constructor?.type === IComponents.Animator.type) {
        const animator = component;
        if (!animator.assetPath) {
          animator.assetPath = `${fullAssetDir}/${rootName}.animation`;
        }
      }
    }
    for (const child of go.transform.children) {
      walkAndAssignPaths(child.gameObject);
    }
  };
  walkAndAssignPaths(gameObject);
  await FileBrowser.mkdir(fullAssetDir);
  const prefab = serializeGameObject(gameObject);
  const prefabName = rootName && rootName !== "" ? `${rootName}.prefab` : "Untitled.prefab";
  SaveToFile(`${fullAssetDir}/${prefabName}`, new Blob([JSON.stringify(prefab)]));
  const saved = /* @__PURE__ */ new Set();
  const walkAndSave = (go) => {
    for (const component of go.GetComponents()) {
      const renderable = component;
      if (component.constructor?.type === IComponents.Mesh.type || component.constructor?.type === IComponents.SkinnedMesh.type) {
        const geometry = renderable.geometry;
        if (geometry && geometry.assetPath && !saved.has(geometry.assetPath)) {
          saved.add(geometry.assetPath);
          SaveToFile(geometry.assetPath, new Blob([JSON.stringify(serializeGeometryAsset(geometry))]));
        }
        const material = renderable.material;
        if (material && material.assetPath && !saved.has(material.assetPath)) {
          const params = material.params;
          if (params) {
            for (const texName of ["albedoMap", "normalMap", "armMap", "heightMap", "emissiveMap"]) {
              const tex = params[texName];
              if (tex && tex.assetPath && !tex.blob) {
                console.warn(`Skipping texture without source blob: ${tex.assetPath}`);
                tex.assetPath = void 0;
              }
            }
          }
          saved.add(material.assetPath);
          SaveToFile(material.assetPath, new Blob([JSON.stringify(serializeMaterialAsset(material))]));
          if (params) {
            for (const texName of ["albedoMap", "normalMap", "armMap", "heightMap", "emissiveMap"]) {
              const tex = params[texName];
              if (tex && tex.blob && tex.assetPath && !saved.has(tex.assetPath)) {
                saved.add(tex.assetPath);
                SaveToFile(tex.assetPath, tex.blob);
              }
            }
          }
        }
      }
      if (component.constructor?.type === IComponents.Animator.type) {
        const animator = component;
        if (animator.assetPath && !saved.has(animator.assetPath)) {
          saved.add(animator.assetPath);
          SaveToFile(animator.assetPath, new Blob([JSON.stringify(serializeAnimatorAsset(animator))]));
        }
      }
    }
    for (const child of go.transform.children) {
      walkAndSave(child.gameObject);
    }
  };
  walkAndSave(gameObject);
}

async function SaveMaterial(material) {
  if (!material.assetPath) {
    throw Error("SaveMaterial: material doesn't have an assetPath.");
  }
  const materialSerialized = serializeMaterialAsset(material);
  await SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
}

var ITreeMapType = /* @__PURE__ */ ((ITreeMapType2) => {
  ITreeMapType2[ITreeMapType2["Folder"] = 0] = "Folder";
  ITreeMapType2[ITreeMapType2["File"] = 1] = "File";
  return ITreeMapType2;
})(ITreeMapType || {});

class LayoutAssetEvents {
  static Selected = (instance) => {
  };
  static RequestSaveMaterial = (material) => {
  };
}
async function dir(h) {
  const r = indexedDB.open("d", 1);
  await new Promise((res) => (r.onupgradeneeded = () => r.result.createObjectStore("s"), r.onsuccess = res));
  const db = r.result;
  const t = db.transaction("s", h ? "readwrite" : "readonly").objectStore("s");
  if (h) return t.put(h, "h"), h;
  return new Promise((res) => t.get("h").onsuccess = (e) => res(e.target.result || null));
}
Assets.ResourceFetchFn = async (input, init) => {
  if (input instanceof Request || input instanceof URL) throw Error("Not implemented");
  const handle = await FileBrowser.fopen(input, MODE.R);
  if (!handle) throw Error(`Could not get file at ${input}`);
  const file = await handle.getFile();
  return new Response(file);
};
class LayoutAssets extends Component {
  fileWatcher;
  constructor(props) {
    super(props);
    this.setState({ currentTreeMap: /* @__PURE__ */ new Map(), selected: void 0, headerMenuOpen: false });
    this.fileWatcher = new FileWatcher();
    EventSystem.on(ProjectEvents.Opened, () => {
      this.fileWatcher.watch("");
      dir(FileBrowser.getRootFolderHandle());
    });
    EventSystem.on(FileEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
    EventSystem.on(DirectoryEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
    EventSystem.on(DirectoryEvents.Deleted, (path, handle) => {
      this.onFileOrDirectoryDeleted(path);
    });
    EventSystem.on(FileEvents.Deleted, (path, handle) => {
      this.onFileOrDirectoryDeleted(path);
    });
    EventSystem.on(LayoutAssetEvents.RequestSaveMaterial, (material) => {
      SaveMaterial(material);
    });
    dir().then((handle) => {
      if (handle) {
        FileBrowser.setRootFolderHandle(handle);
        EventSystem.emit(ProjectEvents.Opened);
      }
    });
  }
  onFileOrDirectoryDeleted(path) {
    this.fileWatcher.unwatch(path);
    this.state.currentTreeMap.delete(path);
    this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: void 0 });
  }
  onFileOrDirectoryCreated(path, file) {
    if (file instanceof FileSystemDirectoryHandle) {
      this.fileWatcher.watch(path);
    }
    if (!this.state.currentTreeMap.has(path)) {
      let type = file instanceof FileSystemFileHandle ? ITreeMapType.File : ITreeMapType.Folder;
      this.state.currentTreeMap.set(path, {
        id: path,
        name: file.name,
        isSelected: false,
        parent: StringUtils.Dirname(path) == path ? null : StringUtils.Dirname(path),
        type,
        data: {
          path,
          file,
          instance: null
        }
      });
    }
    this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: this.state.selected });
  }
  async onToggled(item) {
  }
  async onItemClicked(item) {
    if (!item.data.instance) {
      await this.loadTreeItem(item);
    }
    EventSystem.emit(LayoutAssetEvents.Selected, item.data.instance);
    this.setState({ ...this.state, currentTreeMap: this.state.currentTreeMap, selected: item.data });
  }
  async onItemDoubleClicked(item) {
    if (!item.data.instance) {
      await this.loadTreeItem(item);
    }
    if (item.data.instance.type === Scene.type) {
      this.props.engineAPI.currentScene.Clear();
      await deserializeScene(this.props.engineAPI.currentScene, item.data.instance);
      EventSystem.emit(SceneEvents.Loaded, item.data.instance);
    }
  }
  async loadTreeItem(item) {
    if (item.data.file.kind === "file") {
      const loadedFile = await LoadFile(item.data.path, item.data.file, this.props.engineAPI);
      item.data.instance = loadedFile;
      return loadedFile;
    }
    return item.data.file;
  }
  getCurrentPath() {
    if (!this.state.selected) return "";
    if (this.state.selected.file instanceof FileSystemFileHandle) return this.state.selected.path.slice(0, this.state.selected.path.lastIndexOf("/"));
    else if (this.state.selected.file instanceof FileSystemDirectoryHandle) return this.state.selected.path;
    throw Error("Invalid selected file");
  }
  async createFolder() {
    await CreateFolder(this.getCurrentPath());
    this.setState({ ...this.state, headerMenuOpen: false });
  }
  async createMaterial() {
    await CreateMaterial(this.props.engineAPI, this.getCurrentPath());
    this.setState({ ...this.state, headerMenuOpen: false });
  }
  async createScript() {
    await CreateScript(this.getCurrentPath());
    this.setState({ ...this.state, headerMenuOpen: false });
  }
  async createScene() {
    await CreateScene(this.getCurrentPath());
    this.setState({ ...this.state, headerMenuOpen: false });
  }
  async deleteAsset() {
    await DeleteAsset(this.state.selected);
    this.setState({ ...this.state, headerMenuOpen: false });
  }
  onDragStarted(event, item) {
    if (!item.data.instance) {
      this.loadTreeItem(item).then(() => {
        ExtendedDataTransfer.data = item.data.instance;
      });
    }
    ExtendedDataTransfer.data = item.data.instance;
  }
  onDragOver(event) {
    event.preventDefault();
  }
  async onDrop(event) {
    event.preventDefault();
    for (const file of event.dataTransfer?.files) {
      const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
      if (extension === "glb") {
        const arrayBuffer = await file.arrayBuffer();
        const rootName = file.name.slice(0, file.name.lastIndexOf("."));
        const rootGO = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, this.props.engineAPI.currentScene, rootName);
        SaveGameObjectAsAsset(this.getCurrentPath(), rootGO);
      }
    }
    const extendedEventData = ExtendedDataTransfer.data;
    if (this.props.engineAPI.isGameObject(extendedEventData)) {
      SavePrefab(this.getCurrentPath(), extendedEventData);
    }
  }
  renderTreeItems(items, allItems) {
    return items.map((item) => {
      const children = allItems.filter((i) => i.parent === item.id);
      if (item.type === ITreeMapType.Folder || children.length > 0) {
        return /* @__PURE__ */ createElement(
          TreeFolder,
          {
            name: item.name,
            id: item.id,
            isSelected: item.isSelected,
            onPointerDown: () => this.onItemClicked(item),
            onDoubleClicked: () => this.onItemDoubleClicked(item),
            onDropped: (event) => this.onDrop(event),
            onToggled: () => this.onToggled(item)
          },
          this.renderTreeItems(children, allItems)
        );
      }
      return /* @__PURE__ */ createElement(
        TreeItem,
        {
          name: item.name,
          id: item.id,
          isSelected: item.isSelected,
          onPointerUp: () => this.onItemClicked(item),
          onDoubleClicked: () => this.onItemDoubleClicked(item),
          onDropped: (event) => this.onDrop(event),
          onDragStarted: (event) => this.onDragStarted(event, item)
        }
      );
    });
  }
  render() {
    let treeMapArr = [];
    for (const [name, entry] of this.state.currentTreeMap) {
      entry.isSelected = this.state.selected && entry.id === this.state.selected.path ? true : false;
      treeMapArr.push(entry);
    }
    treeMapArr.sort(function(a, b) {
      if (a.type == ITreeMapType.Folder != (b.type == ITreeMapType.Folder)) {
        return a.type == ITreeMapType.Folder ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    const rootItems = treeMapArr.filter((item) => !item.parent);
    return /* @__PURE__ */ createElement(
      "div",
      {
        class: "Layout",
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event)
      },
      /* @__PURE__ */ createElement("div", { class: "header" }, /* @__PURE__ */ createElement("div", { class: "title" }, "Assets"), /* @__PURE__ */ createElement("div", { class: "right-action" }, /* @__PURE__ */ createElement("button", { onClick: (event) => {
        this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
      } }, "\u22EE"), /* @__PURE__ */ createElement(FloatingMenu, { visible: this.state.headerMenuOpen, onClose: () => this.setState({ ...this.state, headerMenuOpen: false }) }, /* @__PURE__ */ createElement(Tree, null, /* @__PURE__ */ createElement(TreeItem, { name: "Folder", onPointerDown: () => {
        this.createFolder();
      } }), /* @__PURE__ */ createElement(TreeItem, { name: "Material", onPointerDown: () => {
        this.createMaterial();
      } }), /* @__PURE__ */ createElement(TreeItem, { name: "Script", onPointerDown: () => {
        this.createScript();
      } }), /* @__PURE__ */ createElement(TreeItem, { name: "Scene", onPointerDown: () => {
        this.createScene();
      } }), /* @__PURE__ */ createElement(TreeItem, { name: "Delete", onPointerDown: () => {
        this.deleteAsset();
      } }))))),
      /* @__PURE__ */ createElement(Tree, null, this.renderTreeItems(rootItems, treeMapArr))
    );
  }
}

class LayoutHierarchy extends Component {
  constructor(props) {
    super(props);
    this.setState({ selectedGameObject: null, headerMenuOpen: false });
    EventSystem.on(GameObjectEvents.Created, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(GameObjectEvents.Deleted, (gameObject) => {
      if (gameObject === this.state.selectedGameObject) this.setState({ ...this.state, selectedGameObject: null });
    });
    EventSystem.on(GameObjectEvents.Selected, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(GameObjectEvents.Changed, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(SceneEvents.Loaded, (scene) => {
      this.setState({ ...this.state, selectedGameObject: null });
    });
  }
  selectGameObject(gameObject) {
    EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
    this.setState({ ...this.state, selectedGameObject: gameObject });
  }
  getGameObjectById(id) {
    for (const gameObject of this.props.engineAPI.currentScene.gameObjects) {
      if (gameObject.transform.id === id) return gameObject;
    }
    return void 0;
  }
  onDroppedItem(fromId, toId) {
    const fromGameObject = this.getGameObjectById(fromId);
    const toGameObject = this.getGameObjectById(toId);
    if (fromGameObject === toGameObject) return;
    if (fromGameObject && toGameObject) {
      fromGameObject.transform.parent = toGameObject.transform;
      this.selectGameObject(toGameObject);
    }
  }
  onDragStarted(event) {
    ExtendedDataTransfer.data = this.state.selectedGameObject;
  }
  async onDrop(event) {
    const extendedEvent = ExtendedDataTransfer.data;
    const instance = extendedEvent;
    if (instance && instance instanceof Prefab) {
      const gameObject = await instantiatePrefab(this.props.engineAPI.currentScene, instance);
      this.selectGameObject(gameObject);
      ExtendedDataTransfer.data = void 0;
    } else {
      const fromUuid = event.dataTransfer.getData("from-uuid");
      const gameObject = this.getGameObjectById(fromUuid);
      if (gameObject) {
        gameObject.transform.parent = null;
        this.selectGameObject(gameObject);
      }
    }
  }
  buildTreeFromGameObjects(gameObjects) {
    const treeMap = [];
    for (let gameObject of gameObjects) {
      treeMap.push({
        id: gameObject.transform.id,
        name: gameObject.name,
        isSelected: this.state.selectedGameObject && this.state.selectedGameObject == gameObject ? true : false,
        parent: gameObject.transform.parent ? gameObject.transform.parent.id : "",
        data: gameObject
      });
    }
    return treeMap;
  }
  createEmptyGameObject() {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    EventSystem.emit(GameObjectEvents.Created, gameObject);
    this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
  }
  deleteGameObject() {
    if (this.state.selectedGameObject === null) return;
    this.state.selectedGameObject.Destroy();
    EventSystem.emit(GameObjectEvents.Deleted, this.state.selectedGameObject);
    this.setState({ headerMenuOpen: !this.state.headerMenuOpen, selectedGameObject: null });
  }
  createPrimitive(primitiveType) {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    const mesh = gameObject.AddComponent(IComponents.Mesh);
    if (primitiveType === "Cube") mesh.geometry = this.props.engineAPI.createCubeGeometry(), gameObject.name = "Cube";
    else if (primitiveType === "Capsule") mesh.geometry = this.props.engineAPI.createCapsuleGeometry(), gameObject.name = "Capsule";
    else if (primitiveType === "Plane") mesh.geometry = this.props.engineAPI.createPlaneGeometry(), gameObject.name = "Plane";
    else if (primitiveType === "Sphere") mesh.geometry = this.props.engineAPI.createSphereGeometry(), gameObject.name = "Sphere";
    mesh.material = this.props.engineAPI.createPBRMaterial();
    EventSystem.emit(GameObjectEvents.Created, gameObject);
    this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
  }
  createLight(lightType) {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    if (lightType === "Directional") gameObject.AddComponent(IComponents.DirectionalLight), gameObject.name = "DirectionalLight";
    else if (lightType === "Point") gameObject.AddComponent(IComponents.PointLight), gameObject.name = "PointLight";
    else if (lightType === "Spot") gameObject.AddComponent(IComponents.SpotLight), gameObject.name = "SpotLight";
    EventSystem.emit(GameObjectEvents.Created, gameObject);
    this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
  }
  renderGameObjects(gameObjects) {
    return gameObjects.map((go) => {
      const isSelected = this.state.selectedGameObject === go;
      const children = go.transform.children;
      if (children.size > 0) {
        return /* @__PURE__ */ createElement(
          TreeFolder,
          {
            name: go.name,
            id: go.transform.id,
            isSelected,
            onPointerDown: () => this.selectGameObject(go),
            onDroppedItem: (from, to) => this.onDroppedItem(from, to),
            onDragStarted: (event) => this.onDragStarted(event)
          },
          this.renderGameObjects(Array.from(children).map((c) => c.gameObject))
        );
      }
      return /* @__PURE__ */ createElement(
        TreeItem,
        {
          name: go.name,
          id: go.transform.id,
          isSelected,
          onPointerDown: () => this.selectGameObject(go),
          onDroppedItem: (from, to) => this.onDroppedItem(from, to),
          onDragStarted: (event) => this.onDragStarted(event)
        }
      );
    });
  }
  render() {
    if (!this.props.engineAPI.currentScene) return;
    this.buildTreeFromGameObjects(this.props.engineAPI.currentScene.gameObjects);
    const rootGameObjects = this.props.engineAPI.currentScene.gameObjects.filter((go) => !go.transform.parent);
    return /* @__PURE__ */ createElement("div", { class: "Layout" }, /* @__PURE__ */ createElement("div", { class: "header" }, /* @__PURE__ */ createElement("div", { class: "title" }, "Sample scene"), /* @__PURE__ */ createElement("div", { class: "right-action" }, /* @__PURE__ */ createElement("button", { onClick: (event) => {
      this.setState({ ...this.state, headerMenuOpen: !this.state.headerMenuOpen });
    } }, "\u22EE"), /* @__PURE__ */ createElement(FloatingMenu, { visible: this.state.headerMenuOpen, onClose: () => this.setState({ ...this.state, headerMenuOpen: false }) }, /* @__PURE__ */ createElement(Tree, null, /* @__PURE__ */ createElement(TreeItem, { name: "Create Empty", onPointerDown: () => this.createEmptyGameObject() }), /* @__PURE__ */ createElement(TreeItem, { name: "Delete", onPointerDown: () => this.deleteGameObject() }), /* @__PURE__ */ createElement(TreeFolder, { name: "3D Object" }, /* @__PURE__ */ createElement(TreeItem, { name: "Cube", onPointerDown: () => this.createPrimitive("Cube") }), /* @__PURE__ */ createElement(TreeItem, { name: "Capsule", onPointerDown: () => this.createPrimitive("Capsule") }), /* @__PURE__ */ createElement(TreeItem, { name: "Plane", onPointerDown: () => this.createPrimitive("Plane") }), /* @__PURE__ */ createElement(TreeItem, { name: "Sphere", onPointerDown: () => this.createPrimitive("Sphere") })), /* @__PURE__ */ createElement(TreeFolder, { name: "Lights" }, /* @__PURE__ */ createElement(TreeItem, { name: "Directional Light", onPointerDown: () => this.createLight("Directional") }), /* @__PURE__ */ createElement(TreeItem, { name: "Point Light", onPointerDown: () => this.createLight("Point") }), /* @__PURE__ */ createElement(TreeItem, { name: "Spot Light", onPointerDown: () => this.createLight("Spot") })))))), /* @__PURE__ */ createElement(
      "div",
      {
        style: "width: 100%; height: 100%; overflow: auto;padding-top:5px",
        onDrop: (event) => this.onDrop(event),
        onDragOver: (e) => e.preventDefault()
      },
      /* @__PURE__ */ createElement(Tree, null, this.renderGameObjects(rootGameObjects))
    ));
  }
}

class Collapsible extends Component {
  constructor(props) {
    super(props);
    this.state = { isOpen: this.props.open ? this.props.open : true, height: "" };
  }
  handleFilterOpening() {
    if (this.state.isOpen) {
      this.setState({ isOpen: false, height: "0px" });
    } else {
      this.setState({ isOpen: true, height: "" });
    }
  }
  onRightMenuClicked(event) {
    if (this.props.onRightMenuClicked) {
      this.props.onRightMenuClicked();
    }
    event.preventDefault();
    event.stopPropagation();
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "collapsible-card-edonec", id: this.props.id ? this.props.id : "" }, /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "collapsible-header-edonec", onPointerDown: () => {
      this.handleFilterOpening();
    } }, /* @__PURE__ */ createElement("button", { type: "button", className: `collapsible-icon-button-edonec` }, /* @__PURE__ */ createElement(Arrow, { isOpen: this.state.isOpen })), /* @__PURE__ */ createElement("div", { className: "title-text-edonec" }, this.props.header), this.props.rightMenuText ? /* @__PURE__ */ createElement("div", { className: "title-right-menu", onPointerDown: (event) => {
      this.onRightMenuClicked(event);
    } }, this.props.rightMenuText) : "")), /* @__PURE__ */ createElement("div", { className: "collapsible-content-edonec", style: { height: `${this.state.height}` } }, /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "collapsible-content-padding-edonec collapsible-children" }, this.props.children))));
  }
}

class InspectorNumber extends Component {
  constructor(props) {
    super(props);
    this.setState({ value: this.props.value });
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      const value = parseFloat(input.value);
      this.props.onChanged(value);
      this.state.value = value;
      this.setState({ value: this.state.value });
    }
  }
  onClicked(event) {
    const MouseMoveEvent = (event2) => {
      const delta = event2.movementX;
      this.state.value += delta / 10;
      this.setState({ value: this.state.value });
      this.props.onChanged(this.state.value);
      event2.currentTarget.requestPointerLock();
    };
    const MouseUpEvent = (event2) => {
      document.body.removeEventListener("mousemove", MouseMoveEvent);
      document.body.removeEventListener("mouseup", MouseUpEvent);
      document.exitPointerLock();
    };
    document.body.addEventListener("mousemove", MouseMoveEvent);
    document.body.addEventListener("mouseup", MouseUpEvent);
  }
  render() {
    return /* @__PURE__ */ createElement("div", { class: "value" }, /* @__PURE__ */ createElement("span", { class: `vec-label ${this.props.titleClass}`, onMouseDown: (event) => {
      this.onClicked(event);
    } }, this.props.title), /* @__PURE__ */ createElement(
      "input",
      {
        class: "input vec-input",
        type: "number",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.state.value.toPrecision(4)
      }
    ));
  }
}

class InspectorVector3 extends Component {
  constructor(props) {
    super(props);
    this.setState({ vector3: this.props.vector3 });
  }
  onChanged(property, _value) {
    if (this.props.onChanged) {
      if (_value == "") return;
      const value = parseFloat(_value);
      if (property == 0 /* X */) this.state.vector3.x = value;
      else if (property == 1 /* Y */) this.state.vector3.y = value;
      else if (property == 2 /* Z */) this.state.vector3.z = value;
      this.props.onChanged(this.state.vector3);
    }
  }
  Vector3Equals(v1, v2, epsilon = Number.EPSILON) {
    return Math.abs(v1.x - v2.x) < epsilon && Math.abs(v1.y - v2.y) < epsilon && Math.abs(v1.z - v2.z) < epsilon;
  }
  componentDidUpdate() {
    if (!this.Vector3Equals(this.props.vector3, this.state.vector3)) {
      this.setState({ vector3: this.props.vector3 });
    }
  }
  onClicked(property, event) {
    event.preventDefault();
    const MouseMoveEvent = (event2) => {
      const delta = event2.movementX;
      if (property === 0 /* X */) this.state.vector3.x += delta / 10;
      if (property === 1 /* Y */) this.state.vector3.y += delta / 10;
      if (property === 2 /* Z */) this.state.vector3.z += delta / 10;
      this.setState({ vector3: this.props.vector3 });
    };
    const MouseUpEvent = (event2) => {
      document.body.removeEventListener("mousemove", MouseMoveEvent);
      document.body.removeEventListener("mouseup", MouseUpEvent);
    };
    document.body.addEventListener("mousemove", MouseMoveEvent);
    document.body.addEventListener("mouseup", MouseUpEvent);
  }
  render() {
    return /* @__PURE__ */ createElement("div", { class: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { class: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(InspectorNumber, { title: "X", titleClass: "red-bg", value: this.state.vector3.x, onChanged: (value) => {
      this.onChanged(0 /* X */, value);
    } }), /* @__PURE__ */ createElement(InspectorNumber, { title: "Y", titleClass: "green-bg", value: this.state.vector3.y, onChanged: (value) => {
      this.onChanged(1 /* Y */, value);
    } }), /* @__PURE__ */ createElement(InspectorNumber, { title: "Z", titleClass: "blue-bg", value: this.state.vector3.z, onChanged: (value) => {
      this.onChanged(2 /* Z */, value);
    } })));
  }
}

class InspectorColor extends Component {
  constructor(props) {
    super(props);
    this.state = { color: this.props.color };
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      this.state.color.setFromHex(input.value);
      this.props.onChanged(this.state.color);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        style: "padding: 2px;",
        type: "color",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.state.color.toHex().slice(0, 7)
      }
    )));
  }
}

class InspectorVector2 extends Component {
  constructor(props) {
    super(props);
    this.state = { vector2: this.props.vector2.clone() };
  }
  onChanged(property, event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      const value = parseFloat(input.value);
      if (property == 0 /* X */) this.state.vector2.x = value;
      else if (property == 1 /* Y */) this.state.vector2.y = value;
      this.props.onChanged(this.state.vector2);
    }
  }
  vector2Equals(v1, v2, epsilon = Number.EPSILON) {
    return Math.abs(v1.x - v2.x) < epsilon && Math.abs(v1.y - v2.y) < epsilon;
  }
  componentDidUpdate() {
    if (!this.vector2Equals(this.props.vector2, this.state.vector2)) {
      this.setState({ vector2: this.props.vector2.clone() });
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { style: {
      width: "35%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "X"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: "number",
        onChange: (event) => {
          this.onChanged(0 /* X */, event);
        },
        value: this.state.vector2.x
      }
    )), /* @__PURE__ */ createElement("div", { style: {
      width: "35%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "Y"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: "number",
        onChange: (event) => {
          this.onChanged(1 /* Y */, event);
        },
        value: this.state.vector2.y
      }
    )));
  }
}

class InspectorInput extends Component {
  constructor(props) {
    super(props);
  }
  onChanged(value) {
    if (this.props.onChanged) {
      if (value == "") return;
      this.props.onChanged(value);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(InspectorNumber, { title: "N", titleClass: "gray-bg", value: this.props.value, onChanged: (value) => {
      this.onChanged(value);
    } })));
  }
}

class InspectorCheckbox extends Component {
  constructor(props) {
    super(props);
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      this.props.onChanged(input.checked);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement(
      "div",
      {
        style: {
          width: "100%"
        }
      },
      /* @__PURE__ */ createElement(
        "input",
        {
          style: { marginLeft: "0px" },
          type: "checkbox",
          checked: this.props.selected,
          onChange: (event) => {
            this.onChanged(event);
          }
        }
      )
    ));
  }
}

class InspectorTexture extends Component {
  constructor(props) {
    super(props);
  }
  onDrop(event) {
    const draggedItem = ExtendedDataTransfer.data;
    const component = this.props.component[this.props.property];
    if (!draggedItem.constructor || !component.constructor) {
      console.warn("Invalid component");
      return;
    }
    const isValid = draggedItem.constructor === component.constructor;
    if (!isValid) return;
    this.props.component[this.props.property] = draggedItem;
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
    if (this.props.onChanged) {
      this.props.onChanged(draggedItem);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
    const draggedItem = ExtendedDataTransfer.data;
    const component = this.props.component[this.props.property];
    if (!draggedItem.constructor || !component.constructor) {
      console.warn("Invalid component");
      return;
    }
    const isValid = draggedItem.constructor === component.constructor;
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const input = event.currentTarget;
    if (!input.classList.contains("active")) {
      input.classList.add("active");
    }
  }
  onDragLeave(event) {
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement("span", { class: `vec-label`, style: `background-color: #e67e2250; cursor: auto` }, "T"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        disabled: true,
        value: this.props.value,
        onDragEnter: (event) => this.onDragEnter(event),
        onDragLeave: (event) => this.onDragLeave(event),
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event)
      }
    )));
  }
}

class InspectorMaterial extends Component {
  constructor(props) {
    super(props);
  }
  onPropertyChanged(object, property, value) {
    object[property] = value;
    this.setState({});
  }
  renderInspectorForComponentProperty(component, property) {
    const name = property.name;
    const type = property.type;
    const engineType = this.props.engineAPI.getFieldType(type);
    const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(name)).join(" ");
    if (engineType === "Vector3") return /* @__PURE__ */ createElement(InspectorVector3, { title, onChanged: (value) => {
      this.onPropertyChanged(component, name, value);
    }, vector3: component[name] });
    else if (engineType === "Vector2") return /* @__PURE__ */ createElement(InspectorVector2, { title, onChanged: (value) => {
      this.onPropertyChanged(component, name, value);
    }, vector2: component[name] });
    else if (engineType === "Color") return /* @__PURE__ */ createElement(InspectorColor, { title, onChanged: (value) => {
      this.onPropertyChanged(component, name, value);
    }, color: component[name] });
    else if (engineType === "Texture") {
      let valueForType = component[name].constructor.name;
      if (component[name].assetPath) {
        valueForType = StringUtils.GetNameForPath(component[name].assetPath);
      }
      return /* @__PURE__ */ createElement(
        InspectorTexture,
        {
          onChanged: (value) => {
            this.onPropertyChanged(component, name, value);
          },
          title,
          component,
          property: name,
          value: valueForType
        }
      );
    } else if (type === Number) return /* @__PURE__ */ createElement(InspectorInput, { onChanged: (value) => {
      this.onPropertyChanged(component, name, value);
    }, title, value: component[name], type: "number" });
    else if (type === Boolean) return /* @__PURE__ */ createElement(InspectorCheckbox, { onChanged: (value) => {
      this.onPropertyChanged(component, name, value);
    }, title, selected: component[name] });
  }
  renderInspectorForObject(object) {
    let componentPropertiesHTML = [];
    const serializedProperties = this.props.engineAPI.GetSerializedFields(object);
    for (let property of serializedProperties) {
      try {
        const componentPropertyElement = this.renderInspectorForComponentProperty(object, property);
        if (componentPropertyElement) {
          componentPropertiesHTML.push(componentPropertyElement);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    return componentPropertiesHTML;
  }
  SaveClicked() {
    console.log("CLCLC", this.props.material, this.props.material.assetPath);
    EventSystem.emit(LayoutAssetEvents.RequestSaveMaterial, this.props.material);
  }
  render() {
    let title = this.props.material.name;
    if (this.props.material.assetPath) {
      const path = this.props.material.assetPath;
      title = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
    }
    const componentsElements = this.renderInspectorForObject(this.props.material.params);
    return /* @__PURE__ */ createElement("div", { style: {
      height: "100%",
      overflow: "auto",
      width: "100%"
    } }, /* @__PURE__ */ createElement(Collapsible, { header: `Material: ${title}` }, ...componentsElements), /* @__PURE__ */ createElement(
      "button",
      {
        class: "Floating-Menu",
        style: { position: "initial", margin: "10px", width: "calc(100% - 20px)", color: "white", cursor: "pointer" },
        onClick: (event) => {
          this.SaveClicked();
        }
      },
      "SAVE"
    ));
  }
}

class AddComponent extends Component {
  constructor(props) {
    super(props);
  }
  addComponent(registryEntry) {
    const componentClass = Component$1.Registry.get(registryEntry);
    if (!componentClass) throw Error(`Component ${registryEntry} does not exist in Components.Registry`);
    const componentInstance = this.props.gameObject.AddComponent(componentClass);
    EventSystem.emit(ComponentEvents.Created, this.props.gameObject, componentInstance);
    this.setState({ isMenuOpen: false });
  }
  generateTree(entryMap) {
    const entriesByPath = /* @__PURE__ */ new Map();
    for (const [fullpath] of entryMap) {
      const path = fullpath.slice(fullpath.lastIndexOf("components/") + "components/".length, fullpath.lastIndexOf("/") + 1);
      const name = fullpath.slice(fullpath.lastIndexOf("/") + 1);
      const pathEntries = entriesByPath.get(path) || [];
      pathEntries.push({ name, type: fullpath });
      entriesByPath.set(path, pathEntries);
    }
    return Array.from(entriesByPath).map(([path, entries]) => {
      const items = entries.map(
        (e) => /* @__PURE__ */ createElement(TreeItem, { key: e.type, name: e.name, onPointerDown: () => this.addComponent(e.type) })
      );
      return path === "" ? items : /* @__PURE__ */ createElement(TreeFolder, { key: path, name: path.replace("/", "") }, items);
    });
  }
  render() {
    return /* @__PURE__ */ createElement("div", { class: "Floating-Menu", style: { position: "inherit", padding: "5px", margin: "10px" } }, /* @__PURE__ */ createElement(Tree, null, /* @__PURE__ */ createElement(TreeFolder, { name: "Add Component" }, this.generateTree(Component$1.Registry))));
  }
}

class InspectorType extends Component {
  constructor(props) {
    super(props);
  }
  isValidDrop(draggedItem) {
    if (!draggedItem) return false;
    if (this.props.expectedType) return draggedItem instanceof this.props.expectedType;
    const current = this.props.component[this.props.property];
    return current && draggedItem.constructor === current.constructor;
  }
  onDrop(event) {
    const draggedItem = ExtendedDataTransfer.data;
    if (!this.isValidDrop(draggedItem)) return;
    this.props.component[this.props.property] = draggedItem;
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
    if (this.props.onChanged) {
      this.props.onChanged(draggedItem);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
    const draggedItem = ExtendedDataTransfer.data;
    if (!this.isValidDrop(draggedItem)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const input = event.currentTarget;
    if (!input.classList.contains("active")) {
      input.classList.add("active");
    }
  }
  onDragLeave(event) {
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement("span", { class: `vec-label`, style: `background-color: #e67e2250; cursor: auto` }, "\u25C9"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        disabled: true,
        value: this.props.value,
        onDragEnter: (event) => this.onDragEnter(event),
        onDragLeave: (event) => this.onDragLeave(event),
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event)
      }
    )));
  }
}

class LayoutInspectorGameObject extends Component {
  constructor(props) {
    super(props);
  }
  onRemoveComponent(component) {
    component.Destroy();
    this.setState({});
  }
  onComponentPropertyChanged(component, property, value) {
    const type = typeof component[property];
    component.constructor.name;
    const customType = component[property];
    if (customType) {
      component[property] = value;
    } else if (this.props.engineAPI.isVector3(component[property]) && this.props.engineAPI.isVector3(value)) {
      component[property].copy(value);
    } else if (this.props.engineAPI.isColor(component[property]) && this.props.engineAPI.isColor(value)) {
      component[property].copy(value);
    } else if (type == "boolean") {
      component[property] = value;
    } else if (type == "number") {
      component[property] = parseFloat(value);
    }
    this.setState({});
  }
  onGameObjectNameChanged(gameObject, event) {
    const input = event.currentTarget;
    gameObject.name = input.value;
    EventSystem.emit(GameObjectEvents.Changed, gameObject);
  }
  renderInspectorForComponentProperty(component, property) {
    const name = property.name;
    const type = property.type;
    const engineType = this.props.engineAPI.getFieldType(type);
    const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(name)).join(" ");
    if (engineType === "Vector3") return /* @__PURE__ */ createElement(InspectorVector3, { title, onChanged: (value) => {
      this.onComponentPropertyChanged(component, name, value);
    }, vector3: component[name] });
    else if (engineType === "Vector2") return /* @__PURE__ */ createElement(InspectorVector2, { title, onChanged: (value) => {
      this.onComponentPropertyChanged(component, name, value);
    }, vector2: component[name] });
    else if (engineType === "Color") return /* @__PURE__ */ createElement(InspectorColor, { title, onChanged: (value) => {
      this.onComponentPropertyChanged(component, name, value);
    }, color: component[name] });
    else if (type === Number) return /* @__PURE__ */ createElement(InspectorInput, { onChanged: (value) => {
      this.onComponentPropertyChanged(component, name, value);
    }, title, value: component[name], type: "number" });
    else if (type === Boolean) return /* @__PURE__ */ createElement(InspectorCheckbox, { onChanged: (value) => {
      this.onComponentPropertyChanged(component, name, value);
    }, title, selected: component[name] });
    else if (typeof type === "function") {
      const currentValue = component[name];
      let valueForType = currentValue ? currentValue.constructor.name : "None";
      if (currentValue?.assetPath) {
        valueForType = StringUtils.GetNameForPath(currentValue.assetPath);
      }
      return /* @__PURE__ */ createElement(
        InspectorType,
        {
          onChanged: (value) => {
            this.onComponentPropertyChanged(component, name, value);
          },
          title,
          component,
          property: name,
          value: valueForType,
          expectedType: type
        }
      );
    }
  }
  renderInspectorForComponent(component) {
    let componentPropertiesHTML = [];
    const serializedProperties = this.props.engineAPI.GetSerializedFields(component);
    for (let property of serializedProperties) {
      try {
        const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
        if (componentPropertyElement) {
          componentPropertiesHTML.push(componentPropertyElement);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    return componentPropertiesHTML;
  }
  renderInspectorForGameObject(gameObject) {
    let inspectorHTML = [];
    const components = gameObject.GetComponents();
    for (let component of components) {
      const componentCast = component;
      const componentPropertiesHTML = this.renderInspectorForComponent(componentCast);
      const componentHTML = /* @__PURE__ */ createElement(
        Collapsible,
        {
          header: componentCast.constructor.name,
          onRightMenuClicked: () => this.onRemoveComponent(component),
          rightMenuText: "x"
        },
        ...componentPropertiesHTML
      );
      inspectorHTML.push(componentHTML);
    }
    return inspectorHTML;
  }
  onGameObjectEnabled(event) {
    this.props.gameObject.enabled = event.target.checked;
  }
  onDragEnter(event) {
    event.preventDefault();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  // TODO: This needs to be better
  onDrop(event) {
    const draggedItem = ExtendedDataTransfer.data;
    const component = draggedItem[Object.keys(draggedItem)[0]];
    this.props.gameObject.AddComponent(component);
    this.setState({});
  }
  render() {
    const componentsElements = this.renderInspectorForGameObject(this.props.gameObject);
    return /* @__PURE__ */ createElement(
      "div",
      {
        style: {
          height: "100%",
          overflow: "auto",
          width: "100%"
        },
        onDragEnter: (event) => {
          this.onDragEnter(event);
        },
        onDrop: (event) => {
          this.onDrop(event);
        },
        onDragOver: (event) => this.onDragOver(event)
      },
      /* @__PURE__ */ createElement("div", { style: {
        display: "flex",
        padding: "10px"
      } }, /* @__PURE__ */ createElement("input", { type: "checkbox", checked: this.props.gameObject.enabled, onChange: (event) => {
        this.onGameObjectEnabled(event);
      } }), /* @__PURE__ */ createElement(
        "input",
        {
          style: {
            width: "100%",
            fontSize: "12px",
            background: "#121212",
            borderRadius: "5px",
            color: "white",
            border: "none",
            outline: "none",
            paddingLeft: "5px"
          },
          type: "text",
          value: this.props.gameObject.name,
          onChange: (event) => {
            this.onGameObjectNameChanged(this.props.gameObject, event);
          }
        }
      )),
      /* @__PURE__ */ createElement(Collapsible, { header: "Transform" }, /* @__PURE__ */ createElement(InspectorVector3, { key: `position-${this.props.gameObject.id}`, title: "Position", onChanged: (value) => {
        this.onComponentPropertyChanged(this.props.gameObject.transform, "localPosition", value);
      }, vector3: this.props.gameObject.transform.localPosition }), /* @__PURE__ */ createElement(InspectorVector3, { key: `rotation-${this.props.gameObject.id}`, title: "Rotation", onChanged: (value) => {
        this.onComponentPropertyChanged(this.props.gameObject.transform, "localEulerAngles", value);
      }, vector3: this.props.gameObject.transform.localEulerAngles }), /* @__PURE__ */ createElement(InspectorVector3, { key: `scale-${this.props.gameObject.id}`, title: "Scale", onChanged: (value) => {
        this.onComponentPropertyChanged(this.props.gameObject.transform, "scale", value);
      }, vector3: this.props.gameObject.transform.scale })),
      componentsElements,
      /* @__PURE__ */ createElement(AddComponent, { gameObject: this.props.gameObject })
    );
  }
}

class LayoutInspector extends Component {
  constructor(props) {
    super(props);
    EventSystem.on(LayoutAssetEvents.Selected, (instance) => {
      if (this.props.engineAPI.isMaterial(instance)) {
        this.setState({ selected: instance });
      }
    });
    EventSystem.on(LayoutHierarchyEvents.Selected, (gameObject) => {
      this.setState({ selected: gameObject });
    });
    EventSystem.on(ComponentEvents.Created, (gameObject, component) => {
      this.setState({ selected: gameObject });
    });
    EventSystem.on(GameObjectEvents.Changed, (gameObject, component) => {
      this.setState({ selected: gameObject });
    });
    this.state = { selected: void 0 };
  }
  render() {
    let content = null;
    if (this.props.engineAPI.isGameObject(this.state.selected)) content = /* @__PURE__ */ createElement(LayoutInspectorGameObject, { engineAPI: this.props.engineAPI, gameObject: this.state.selected });
    else if (this.props.engineAPI.isMaterial(this.state.selected)) content = /* @__PURE__ */ createElement(InspectorMaterial, { engineAPI: this.props.engineAPI, material: this.state.selected });
    return /* @__PURE__ */ createElement("div", { style: { height: "100%", overflow: "auto", width: "100%" } }, content);
  }
}

class LayoutTopbar extends Component {
  constructor(props) {
    super(props);
    this.setState({ fileMenuOpen: false });
  }
  openProject() {
    console.log("CCC");
    FileBrowser.init().then(() => {
      EventSystem.emit(ProjectEvents.Opened);
    });
    this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
  }
  async saveProject() {
    const serializedScene = serializeScene(this.props.engineAPI.currentScene);
    const handle = await FileBrowser.fopen(`${this.props.engineAPI.currentScene.name}.scene`, MODE.W);
    FileBrowser.fwrite(handle, JSON.stringify(serializedScene));
    this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
  }
  async test() {
    const serializedScene = serializeScene(this.props.engineAPI.currentScene);
    console.log(JSON.stringify(serializedScene));
    this.setState({ fileMenuOpen: !this.state.fileMenuOpen });
  }
  render() {
    return /* @__PURE__ */ createElement("div", { style: { padding: "10px", marginLeft: "5px" } }, /* @__PURE__ */ createElement("a", { onClick: (event) => {
      this.setState({ ...this.state, fileMenuOpen: !this.state.fileMenuOpen });
    }, style: { cursor: "pointer" } }, "File"), /* @__PURE__ */ createElement(FloatingMenu, { visible: this.state.fileMenuOpen, onClose: () => this.setState({ ...this.state, fileMenuOpen: false }) }, /* @__PURE__ */ createElement(Tree, null, /* @__PURE__ */ createElement(TreeItem, { name: "Open Project...", onPointerDown: () => {
      this.openProject();
    } }), /* @__PURE__ */ createElement(TreeItem, { name: "Save Project", onPointerDown: () => {
      this.saveProject();
    } }), /* @__PURE__ */ createElement(TreeItem, { name: "Test", onPointerDown: () => {
      this.test();
    } }))));
  }
}

class Layout extends Component {
  render() {
    return /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex-item", null, /* @__PURE__ */ createElement(LayoutTopbar, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "h", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 3;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 3;" }, /* @__PURE__ */ createElement(LayoutCanvas, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex-item", { style: "flex: 2;" }, /* @__PURE__ */ createElement(LayoutAssets, { engineAPI: this.props.engineAPI }))), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutHierarchy, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutInspector, { engineAPI: this.props.engineAPI })))));
  }
}

const engineAPI = new TridentAPI();
class App extends Component {
  render() {
    return /* @__PURE__ */ createElement(Layout, { engineAPI });
  }
}
render(/* @__PURE__ */ createElement(App, null), document.body);
