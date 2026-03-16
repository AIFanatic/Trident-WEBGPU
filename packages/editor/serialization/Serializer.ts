/**
 * Serializer — all serialize functions for the editor.
 * Core types have no Serialize methods; this module handles it all.
 */

import {
    Scene,
    GameObject,
    Component,
    Geometry,
    IndexAttribute,
    VertexAttribute,
    InterleavedVertexAttribute,
    PBRMaterial,
    Texture,
    GPU,
    Mathf,
    Components,
    Utils,
} from "@trident/core";

import { Prefab, SerializedComponent, SerializedTexture } from "./Prefab";

// ────────────────────────────────────────────────────────────
// Math types
// ────────────────────────────────────────────────────────────

export function serializeVector2(v: Mathf.Vector2): object {
    return { type: "@trident/core/math/Vector2", x: v.x, y: v.y };
}

export function serializeVector3(v: Mathf.Vector3): object {
    return { type: "@trident/core/math/Vector3", x: v.x, y: v.y, z: v.z };
}

export function serializeQuaternion(q: Mathf.Quaternion): object {
    return { type: "@trident/core/math/Quaternion", x: q.x, y: q.y, z: q.z, w: q.w };
}

export function serializeColor(c: Mathf.Color): object {
    return { type: "@trident/core/math/Color", r: c.r, g: c.g, b: c.b, a: c.a };
}

// ────────────────────────────────────────────────────────────
// Typed array helpers
// ────────────────────────────────────────────────────────────

function getArrayTypeName(arr: ArrayLike<number>): string {
    if (arr instanceof Uint32Array) return "uint32";
    if (arr instanceof Uint16Array) return "uint16";
    if (arr instanceof Uint8Array) return "uint8";
    return "float32";
}

// ────────────────────────────────────────────────────────────
// Geometry
// ────────────────────────────────────────────────────────────

export function serializeGeometryAttribute(attr: VertexAttribute | InterleavedVertexAttribute | IndexAttribute): object {
    const result: any = {
        attributeType: attr.type,
        array: Array.from(attr.array),
        arrayType: getArrayTypeName(attr.array),
        currentOffset: attr.currentOffset,
        currentSize: attr.currentSize,
    };

    if (attr instanceof InterleavedVertexAttribute) {
        result.stride = attr.stride;
    }

    return result;
}

/** Full serialization — writes all attribute data. Used to save .geometry files. */
export function serializeGeometryAsset(geometry: Geometry): object {
    return {
        assetPath: geometry.assetPath,
        id: geometry.id,
        name: geometry.name,
        attributes: Array.from(geometry.attributes, ([key, attribute]) =>
            Object.assign(serializeGeometryAttribute(attribute), { name: key })
        ),
        index: geometry.index ? serializeGeometryAttribute(geometry.index) : undefined,
    };
}

/** Reference serialization — just the assetPath pointer. Used inside prefab components. */
export function serializeGeometryRef(geometry: Geometry): object {
    if (!geometry.assetPath) throw Error("Geometry doesn't have an assetPath.");
    return { id: geometry.id, name: geometry.name, assetPath: geometry.assetPath };
}

// ────────────────────────────────────────────────────────────
// Texture
// ────────────────────────────────────────────────────────────

export function serializeTexture(texture: Texture): SerializedTexture {
    if (!texture.assetPath) throw Error("Texture doesn't have an assetPath.");

    return {
        assetPath: texture.assetPath,
        name: texture.name,
        id: texture.id,
        format: texture.format,
        generateMips: texture.mipLevels > 1,
    };
}

// ────────────────────────────────────────────────────────────
// Material (PBR)
// ────────────────────────────────────────────────────────────

const textureFields = ['albedoMap', 'normalMap', 'armMap', 'heightMap', 'emissiveMap'] as const;
const scalarFields = ['roughness', 'metalness', 'doubleSided', 'alphaCutoff', 'unlit', 'wireframe', 'isSkinned', 'isDeferred'] as const;

export function serializePBRMaterialParams(params: any): object {
    const result: any = {
        albedoColor: serializeColor(params.albedoColor),
        emissiveColor: serializeColor(params.emissiveColor),
        repeat: serializeVector2(params.repeat),
        offset: serializeVector2(params.offset),
    };

    for (const field of textureFields) {
        const tex = params[field];
        if (tex && tex.assetPath) result[field] = serializeTexture(tex);
    }

    for (const field of scalarFields) {
        result[field] = params[field];
    }

    return result;
}

export function serializeMaterialAsset(material: GPU.Material): object {
    if (material instanceof PBRMaterial) {
        return {
            assetPath: material.assetPath,
            type: PBRMaterial.type,
            shader: undefined,
            params: serializePBRMaterialParams(material.params),
        };
    }

    return {
        type: GPU.Material.type,
        assetPath: material.assetPath,
        shader: material.shader ? serializeShader(material.shader) : undefined,
        params: { isDeferred: material.params.isDeferred },
    };
}

export function serializeMaterialRef(material: GPU.Material): object {
    if (material.assetPath) {
        const type = material instanceof PBRMaterial ? PBRMaterial.type : GPU.Material.type;
        return { type, id: material.id, assetPath: material.assetPath };
    }
    return serializeMaterialAsset(material);
}

// ────────────────────────────────────────────────────────────
// Shader
// ────────────────────────────────────────────────────────────

export function serializeShader(shader: GPU.Shader): object {
    return {
        code: shader.params.code,
        defines: shader.params.defines,
        attributes: shader.params.attributes,
        uniforms: Object.entries(shader.params.uniforms).map(([key, value]: [string, any]) => ({
            group: value.group, binding: value.binding, type: value.type
        })),
    };
}

// ────────────────────────────────────────────────────────────
// Generic value serialize (for @SerializeField)
// ────────────────────────────────────────────────────────────

function serializeValue(value: any): any {
    if (value === undefined || value === null) return null;
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

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function serializeComponent(component: Component, metadata: any = {}): SerializedComponent {
    if (component instanceof Components.Renderable) return serializeRenderable(component);
    if (component instanceof Components.Animator) return serializeAnimatorRef(component);

    const serializedFields = Utils.GetSerializedFields(component);
    const fields: any = {};
    for (const { name } of serializedFields) {
        fields[name] = serializeValue(component[name]);
    }
    const ctor = component.constructor as any;
    const assetPath = ctor.assetPath;
    const type = ctor.type || ctor.name;
    return { type, id: component.id, name: component.name, ...(assetPath ? { assetPath } : {}), ...fields };
}

// ────────────────────────────────────────────────────────────
// Transform
// ────────────────────────────────────────────────────────────

export function serializeTransform(transform: Components.Transform): SerializedComponent {
    return {
        type: Components.Transform.type,
        localPosition: serializeVector3(transform.localPosition),
        localRotation: serializeQuaternion(transform.localRotation),
        scale: serializeVector3(transform.scale),
    };
}

// ────────────────────────────────────────────────────────────
// Renderable (Mesh / SkinnedMesh)
// ────────────────────────────────────────────────────────────

export function serializeRenderable(renderable: Components.Renderable): SerializedComponent {
    return {
        type: (renderable.constructor as any).type,
        geometry: serializeGeometryRef(renderable.geometry),
        material: serializeMaterialRef(renderable.material),
        enableShadows: renderable.enableShadows,
    };
}

// ────────────────────────────────────────────────────────────
// Animator
// ────────────────────────────────────────────────────────────

export function serializeAnimatorAsset(animator: Components.Animator): object {
    const tracks: { [nodeName: string]: any[] } = {};
    const collectTrackData = (root: Components.Transform) => {
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
        tracks: Object.keys(tracks).length ? tracks : animator.tracksData,
    };
}

export function serializeAnimatorRef(animator: Components.Animator): SerializedComponent {
    if (animator.assetPath) {
        return { type: Components.Animator.type, id: animator.id, assetPath: animator.assetPath };
    }
    return serializeAnimatorAsset(animator) as SerializedComponent;
}

// ────────────────────────────────────────────────────────────
// GameObject -> Prefab
// ────────────────────────────────────────────────────────────

export function serializeGameObject(gameObject: GameObject, metadata: any = {}): Prefab {
    const prefab = new Prefab();
    prefab.id = gameObject.id;
    prefab.name = gameObject.name;
    prefab.transform = serializeTransform(gameObject.transform);

    if (gameObject.assetPath) {
        prefab.assetPath = gameObject.assetPath;
        return prefab;
    }

    prefab.components = gameObject.GetComponents().map(c => serializeComponent(c, metadata));
    for (const child of gameObject.transform.children) {
        prefab.children.push(serializeGameObject(child.gameObject, metadata));
    }
    return prefab;
}

// ────────────────────────────────────────────────────────────
// Scene
// ────────────────────────────────────────────────────────────

export function serializeScene(scene: any): object {
    const serialized: any = {
        type: Scene.type,
        name: scene.name,
        mainCamera: Components.Camera.mainCamera?.id,
        gameObjects: [],
    };

    for (const gameObject of scene.GetRootGameObjects()) {
        serialized.gameObjects.push(serializeGameObject(gameObject));
    }
    return serialized;
}
