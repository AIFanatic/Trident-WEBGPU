import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { ComponentRegistry } from "../engine-api/trident/ComponentRegistry";
import { FileBrowser } from "../helpers/FileBrowser";
import { Texture, GetSerializedFields, Serializer } from "@trident/core";
import { SaveToFile } from "./SaveToFile";

export async function SaveGameObjectAsAsset(baseDir: string, gameObject: IGameObject): Promise<void> {
    const rootName = gameObject.name;

    const fullAssetDir = `${baseDir}/${rootName}`;
    let geometryCounter = 0;
    let materialCounter = 0;
    let textureCounter = 0;

    const walkAndAssignPaths = (go: IGameObject) => {
        for (const component of go.GetComponents()) {
            const renderable = component as any;
            if ((component as any).constructor?.type === ComponentRegistry.Mesh ||
                (component as any).constructor?.type === ComponentRegistry.SkinnedMesh) {
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
                    for (const { name: texName, type } of GetSerializedFields(params)) {
                        if (type !== Texture) continue;
                        const tex = params[texName];
                        if (tex && !tex.assetPath && tex.blob) {
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

            if ((component as any).constructor?.type === ComponentRegistry.Animator) {
                const animator = component as any;
                if (!animator.assetPath) {
                    animator.assetPath = `${fullAssetDir}/${rootName}.animation`;
                }
            }

            if ((component as any).constructor?.type === ComponentRegistry.Terrain) {
                const terrain = component as any;
                if (!terrain.terrainData.assetPath) {
                    terrain.terrainData.assetPath = `${fullAssetDir}/${rootName}.terrain`;
                }
            }
        }

        for (const child of go.transform.children) {
            walkAndAssignPaths(child.gameObject);
        }
    };
    walkAndAssignPaths(gameObject);

    await FileBrowser.mkdir(fullAssetDir);

    const prefab = Serializer.serializeGameObject(gameObject as any);
    const prefabName = rootName && rootName !== "" ? `${rootName}.prefab` : "Untitled.prefab";
    SaveToFile(`${fullAssetDir}/${prefabName}`, new Blob([JSON.stringify(prefab)]));

    const saved = new Set<string>();
    const walkAndSave = (go: IGameObject) => {
        for (const _component of go.GetComponents()) {
            const component = _component as any;
            if (component.constructor === ComponentRegistry.Mesh || component.constructor === ComponentRegistry.SkinnedMesh) {
                const geometry = component.geometry;
                if (geometry && geometry.assetPath && !saved.has(geometry.assetPath)) {
                    saved.add(geometry.assetPath);
                    SaveToFile(geometry.assetPath, new Blob([JSON.stringify(Serializer.serializeFields(geometry))]));
                }

                const material = component.material;
                if (material && material.assetPath && !saved.has(material.assetPath)) {
                    const params = material.params;
                    if (params) {
                        for (const { name: texName, type } of GetSerializedFields(params)) {
                            if (type !== Texture) continue;
                            const tex = params[texName];
                            if (tex && tex.assetPath && !tex.blob) {
                                console.warn(`Skipping texture without source blob: ${tex.assetPath}`);
                                tex.assetPath = undefined;
                            }
                        }
                    }

                    saved.add(material.assetPath);
                    const ctor = material.constructor as any;
                    SaveToFile(material.assetPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(material) })]));

                    if (params) {
                        for (const { name: texName, type } of GetSerializedFields(params)) {
                            if (type !== Texture) continue;
                            const tex = params[texName];
                            if (tex && tex.blob && tex.assetPath && !saved.has(tex.assetPath)) {
                                saved.add(tex.assetPath);
                                SaveToFile(tex.assetPath, tex.blob);
                            }
                        }
                    }
                }
            }

            if (component.assetPath && !saved.has(component.assetPath) && component.constructor !== ComponentRegistry.Mesh && component.constructor !== ComponentRegistry.SkinnedMesh) {
                saved.add(component.assetPath);
                const ctor = component.constructor as any;
                SaveToFile(component.assetPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(component) })]));
            }

            if (component.constructor === ComponentRegistry.Terrain) {
                const terrain = component as any;
                const terrainPath = terrain.terrainData?.assetPath;
                if (terrainPath && !saved.has(terrainPath)) {
                    saved.add(terrainPath);
                    const ctor = terrain.terrainData.constructor as any;
                    SaveToFile(terrainPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(terrain.terrainData) })]));
                }
            }
        }

        for (const child of go.transform.children) {
            walkAndSave(child.gameObject);
        }
    };
    walkAndSave(gameObject);
}
