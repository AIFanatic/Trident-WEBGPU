/**
 * Deserializer — all deserialize functions for the editor.
 * Core types have no Deserialize methods; this module handles it all.
 *
 * All deserialize functions are async — they await asset loading so that
 * GameObjects are fully ready when returned. No fire-and-forget.
 */

import {
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
    Assets,
    Components,
} from "@trident/core";
import { LoadScript } from "../loaders/ScriptLoader";

import { Prefab, SerializedTexture } from "./Prefab";
import { AssetRegistry } from "./AssetRegistry";

// ────────────────────────────────────────────────────────────
// Math types
// ────────────────────────────────────────────────────────────

export function deserializeVector2(data: any, target?: Mathf.Vector2): Mathf.Vector2 {
    const v = target ?? new Mathf.Vector2();
    v.set(data.x, data.y);
    return v;
}

export function deserializeVector3(data: any, target?: Mathf.Vector3): Mathf.Vector3 {
    const v = target ?? new Mathf.Vector3();
    v.set(data.x, data.y, data.z);
    return v;
}

export function deserializeQuaternion(data: any, target?: Mathf.Quaternion): Mathf.Quaternion {
    const q = target ?? new Mathf.Quaternion();
    q.set(data.x, data.y, data.z, data.w);
    return q;
}

export function deserializeColor(data: any, target?: Mathf.Color): Mathf.Color {
    const c = target ?? new Mathf.Color();
    c.set(data.r, data.g, data.b, data.a);
    return c;
}

// ────────────────────────────────────────────────────────────
// Typed array helpers
// ────────────────────────────────────────────────────────────

const typedArrayCtors: Record<string, { new(data: any[]): ArrayLike<number> }> = {
    float32: Float32Array,
    uint32: Uint32Array,
    uint16: Uint16Array,
    uint8: Uint8Array,
};

function makeTypedArray(data: any[], arrayType: string): any {
    const Ctor = typedArrayCtors[arrayType];
    if (!Ctor) throw Error(`Invalid array type "${arrayType}"`);
    return new Ctor(data);
}

// ────────────────────────────────────────────────────────────
// Geometry
// ────────────────────────────────────────────────────────────

function deserializeAttribute(data: any): VertexAttribute | InterleavedVertexAttribute | IndexAttribute {
    const array = makeTypedArray(data.array, data.arrayType);

    let attr: VertexAttribute | InterleavedVertexAttribute | IndexAttribute;
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

/** Deserialize geometry from full data (attributes inline). */
export function deserializeGeometryData(data: any, target?: Geometry): Geometry {
    const geometry = target ?? new Geometry();
    geometry.id = data.id;
    geometry.name = data.name;
    geometry.assetPath = data.assetPath;
    for (const attribute of data.attributes) {
        geometry.attributes.set(attribute.name, deserializeAttribute(attribute) as VertexAttribute | InterleavedVertexAttribute);
    }
    if (data.index) geometry.index = deserializeAttribute(data.index) as IndexAttribute;
    return geometry;
}

/** Load geometry by assetPath. Returns cached or loads from disk. */
export async function deserializeGeometryRef(data: any): Promise<Geometry> {
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

// ────────────────────────────────────────────────────────────
// Texture
// ────────────────────────────────────────────────────────────

export async function deserializeTexture(data: SerializedTexture): Promise<Texture> {
    const bytes = await Assets.Load(data.assetPath, "binary");
    const texture = await Texture.LoadBlob(new Blob([bytes]), data.format as GPU.TextureFormat, {
        name: data.name,
        generateMips: data.generateMips,
    });
    texture.assetPath = data.assetPath;
    return texture;
}

// ────────────────────────────────────────────────────────────
// Material (PBR)
// ────────────────────────────────────────────────────────────

const textureFields = ['albedoMap', 'normalMap', 'armMap', 'heightMap', 'emissiveMap'] as const;
const scalarFields = ['roughness', 'metalness', 'doubleSided', 'alphaCutoff', 'unlit', 'wireframe', 'isSkinned', 'isDeferred'] as const;

async function deserializePBRParams(data: any): Promise<any> {
    const params: any = {};
    const p = data?.params ?? {};

    for (const field of scalarFields) {
        if (p[field] !== undefined) params[field] = p[field];
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

async function deserializePBRMaterial(data: any): Promise<PBRMaterial> {
    const params = await deserializePBRParams(data);
    return new PBRMaterial(params);
}

async function deserializeMaterialData(material: GPU.Material, data: any) {
    if (data.params) {
        material.params.isDeferred = data.params.isDeferred;
    }
}

/** Load material by ref data. If it has an assetPath, loads from disk. */
export async function deserializeMaterial(data: any): Promise<GPU.Material> {
    if (data.assetPath) {
        const cached = AssetRegistry.GetInstance(data.assetPath);
        if (cached) return cached;

        const json = await Assets.Load(data.assetPath, "json");
        const materialType = json?.type ?? data.type;
        const material = materialType === PBRMaterial.type
            ? await deserializePBRMaterial(json)
            : GPU.Material.Create(materialType);
        material.assetPath = data.assetPath;
        if (!(material instanceof PBRMaterial)) {
            await deserializeMaterialData(material, json);
        }
        AssetRegistry.SetInstance(data.assetPath, material);
        return material;
    }

    const material = data?.type === PBRMaterial.type
        ? await deserializePBRMaterial(data)
        : GPU.Material.Create(data.type);
    if (!(material instanceof PBRMaterial)) {
        await deserializeMaterialData(material, data);
    }
    return material;
}

// ────────────────────────────────────────────────────────────
// Generic value deserialize (for @SerializeField)
// ────────────────────────────────────────────────────────────

function deserializeValue(target: any, data: any): any {
    if (typeof data === "boolean" || typeof data === "number" || typeof data === "string") return data;
    if (target instanceof Float32Array) return new Float32Array(data);
    if (target instanceof Array) return data;
    if (target instanceof Mathf.Vector3) { deserializeVector3(data, target); return target; }
    if (target instanceof Mathf.Vector2) { deserializeVector2(data, target); return target; }
    if (target instanceof Mathf.Color) { deserializeColor(data, target); return target; }
    if (target instanceof Mathf.Quaternion) { deserializeQuaternion(data, target); return target; }
    throw Error(`Could not deserialize value: ${data}`);
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

type DeferredRef = { component: Component; property: string; id: string };
const deferredRefs: DeferredRef[] = [];
const idMap = new Map<string, GameObject>();

async function deserializeComponentFields(component: Component, data: any) {
    if (component instanceof Components.Renderable) { await deserializeRenderable(component, data); return; }
    if (component instanceof Components.Animator) { await deserializeAnimatorFields(component, data); return; }

    for (const property in data) {
        if (property === "type" || property === "id" || property === "name" || property === "assetPath") continue;
        const value = data[property];
        if (value && typeof value === "object" && value.__ref === "GameObject") {
            deferredRefs.push({ component, property, id: value.id });
            continue;
        }
        if (component[property] === undefined) continue;
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

// ────────────────────────────────────────────────────────────
// Transform
// ────────────────────────────────────────────────────────────

function deserializeTransform(transform: Components.Transform, data: any) {
    if (!data) return;
    if (data.localPosition) deserializeVector3(data.localPosition, transform.localPosition);
    if (data.localRotation) deserializeQuaternion(data.localRotation, transform.localRotation);
    if (data.scale) deserializeVector3(data.scale, transform.scale);
}

// ────────────────────────────────────────────────────────────
// Renderable (Mesh / SkinnedMesh)
// ────────────────────────────────────────────────────────────

export async function deserializeRenderable(renderable: Components.Renderable, data: any) {
    renderable.enableShadows = data.enableShadows;
    renderable.geometry = await deserializeGeometryRef(data.geometry);
    renderable.material = await deserializeMaterial(data.material);
}

// ────────────────────────────────────────────────────────────
// Animator
// ────────────────────────────────────────────────────────────

async function deserializeAnimatorFields(animator: Components.Animator, data: any) {
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

// ────────────────────────────────────────────────────────────
// Prefab -> GameObject (instantiation)
// ────────────────────────────────────────────────────────────

export async function instantiatePrefab(scene: any, data: Prefab, parent?: Components.Transform): Promise<GameObject> {
    const gameObject = new GameObject(scene);
    if (data.id) idMap.set(data.id, gameObject);
    gameObject.enabled = false; // Hide from render loop during async loading
    if (parent) gameObject.transform.parent = parent;

    if (data.assetPath && data.components.length === 0) {
        gameObject.assetPath = data.assetPath;

        let prefabData = AssetRegistry.GetInstance(data.assetPath) as Prefab;
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

async function deserializeGameObjectFromPrefab(gameObject: GameObject, data: Prefab) {
    gameObject.name = data.name;
    deserializeTransform(gameObject.transform, data.transform);

    const componentInstances: Component[] = [];
    for (const component of data.components) {
        if (component.assetPath && !Component.Registry.get(component.type)) {
            await LoadScript(component.assetPath);
        }
        const componentClass = Component.Registry.get(component.type);
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

// ────────────────────────────────────────────────────────────
// Scene
// ────────────────────────────────────────────────────────────

export async function deserializeScene(scene: any, data: any) {
    for (const serializedGameObject of data.gameObjects) {
        await instantiatePrefab(scene, Prefab.Deserialize(serializedGameObject));
    }

    resolveDeferredRefs();

    // Restore mainCamera — IDs don't survive deserialization, so fall back to first Camera found
    let firstCamera: Components.Camera | null = null;
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
