import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Prefab } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu", 2);
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    // mainCameraGameObject.transform.position.set(5295, 2770, -70);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 1000);


    // mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = false;
    light.intensity = 1


    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/dikhololo_night_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    {
        function readEntry(entry: FileSystemEntry, path: string = ""): Promise<Array<{ type: "file", path: string, file: File }>> {
            return new Promise((resolve, reject) => {
                if (entry.isFile) {
                    const fileEntry = entry as FileSystemFileEntry;

                    fileEntry.file(
                        (file: File) => {
                            resolve([ { type: "file", path: path + entry.name, file } ]);
                        },
                        (err) => reject(err)
                    );
                }
                else if (entry.isDirectory) {
                    const dirEntry = entry as FileSystemDirectoryEntry;
                    const reader = dirEntry.createReader();
                    const entries: Array<{ type: "file", path: string, file: File }> = [];

                    const readBatch = () => {
                        reader.readEntries(
                            async (batch: FileSystemEntry[]) => {
                                if (batch.length === 0) {
                                    resolve(entries);
                                    return;
                                }

                                for (const child of batch) {
                                    const childEntries = await readEntry(
                                        child,
                                        path + entry.name + "/"
                                    );
                                    entries.push(...childEntries);
                                }

                                readBatch(); // keep reading until empty
                            },
                            (err) => reject(err)
                        );
                    };

                    readBatch();
                } else {
                    resolve([]);
                }
            });
        }

        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (ev) => {
            ev.preventDefault();

            // ----------------------------
            // Helpers
            // ----------------------------
            function traverse(prefabs, fn) {
                for (const prefab of prefabs) {
                    fn(prefab);
                    for (const child of prefab.children) traverse([child], fn);
                }
            }

            function makeLimiter(max) {
                let inFlight = 0;
                const queue = [];
                return async function runLimited(task) {
                    if (inFlight >= max) await new Promise((r) => queue.push(r));
                    inFlight++;
                    try {
                        return await task();
                    } finally {
                        inFlight--;
                        const next = queue.shift();
                        if (next) next();
                    }
                };
            }

            // Keep these LOW. Raise slowly if stable.
            const READ_CONCURRENCY = 4;   // file.arrayBuffer()
            const PARSE_CONCURRENCY = 4;  // GLTF parse + component creation

            const runReadLimited = makeLimiter(READ_CONCURRENCY);
            const runParseLimited = makeLimiter(PARSE_CONCURRENCY);

            // ----------------------------
            // Drop handling
            // ----------------------------
            const rootItem = ev.dataTransfer?.items?.[0];
            if (!rootItem) return;

            const entry = rootItem.webkitGetAsEntry?.();
            if (!entry) return;

            const files = await readEntry(entry); // <- assumes your existing helper returns [{path, file}, ...]
            const filesByPath = new Map();
            for (const f of files) filesByPath.set(f.path, f.file);

            const sceneJsonFile = filesByPath.get("GLB/Scene.json");
            if (!sceneJsonFile) {
                console.warn("Missing GLB/Scene.json");
                return;
            }

            const sceneFile = JSON.parse(await sceneJsonFile.text());

            // ----------------------------
            // Build unique load list (but do not load yet)
            // ----------------------------
            const MAX_INSTANCES = 3000;
            let instanceCount = 0;

            // assetPath -> { rootGameObject, instancedMeshes, loadPromise }
            const uniques = new Map();

            async function loadUniqueGLB(assetPath, file, record) {
                // (1) read with low concurrency
                const arrayBuffer = await runReadLimited(() => file.arrayBuffer());

                // (2) parse + instantiate mesh components with low concurrency
                await runParseLimited(async () => {
                    console.log("Loading", assetPath);

                    const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer);

                    const rootGameObject = record.rootGameObject;
                    traverse([prefab], (p) => {
                        for (const component of p.components) {
                            if (component.type === Components.Mesh.type) {
                                const instancedMesh = rootGameObject.AddComponent(Components.InstancedMesh);

                                instancedMesh.geometry = Geometry.Deserialize(component.geometry);
                                instancedMesh.material = GPU.Material.Deserialize(component.material);

                                record.instancedMeshes.push(instancedMesh);
                            }
                        }
                    });
                });
            }

            // Collect unique assets + schedule loads
            for (const actor of sceneFile.actors) {
                if (actor.class !== "StaticMeshActor") continue;
                if (instanceCount >= MAX_INSTANCES) break;

                for (const m of actor.static_meshes) {
                    if (instanceCount >= MAX_INSTANCES) break;

                    const assetName = m.asset_name;
                    let assetPath = m.asset_path.replace("/Game", "GLB");
                    assetPath = assetPath.slice(0, assetPath.lastIndexOf(".")) + ".glb";
                    if (!assetName) continue;

                    if (!uniques.has(assetPath)) {
                        const file = filesByPath.get(assetPath);
                        if (!file) {
                            console.warn("Missing GLB:", assetPath, "assetName:", assetName);
                            continue;
                        }

                        const record = {
                            rootGameObject: new GameObject(scene),
                            instancedMeshes: [],
                            loadPromise: null,
                        };

                        // schedule load ONCE
                        record.loadPromise = loadUniqueGLB(assetPath, file, record).catch((err) => {
                            console.warn("Failed loading", assetPath, err);
                            // keep record but mark as empty; we'll skip later
                        });

                        uniques.set(assetPath, record);
                    }

                    instanceCount++;
                }
            }

            console.log("Unique assets:", uniques.size);

            // ----------------------------
            // Wait for all unique loads to finish
            // ----------------------------
            await Promise.all([...uniques.values()].map((u) => u.loadPromise));

            // ----------------------------
            // Apply instance transforms
            // ----------------------------
            const p = new Mathf.Vector3();
            const e = new Mathf.Vector3();
            const r = new Mathf.Quaternion();
            const s = new Mathf.Vector3(1, 1, 1);
            const mat = new Mathf.Matrix4();

            instanceCount = 0;

            for (const actor of sceneFile.actors) {
                if (actor.class !== "StaticMeshActor") continue;
                if (instanceCount >= MAX_INSTANCES) break;

                for (const static_mesh of actor.static_meshes) {
                    if (instanceCount >= MAX_INSTANCES) break;

                    const assetName = static_mesh.asset_name;
                    let assetPath = static_mesh.asset_path.replace("/Game", "GLB");
                    assetPath = assetPath.slice(0, assetPath.lastIndexOf(".")) + ".glb";
                    if (!assetName) continue;

                    const record = uniques.get(assetPath);
                    if (!record || record.instancedMeshes.length === 0) {
                        // asset missing or failed to load
                        instanceCount++;
                        continue;
                    }

                    const { location, rotation_euler_deg, scale } = actor.transform;

                    p.set(-location.y / 100, location.z / 100, location.x / 100);
                    e.set(rotation_euler_deg.roll, -90 + rotation_euler_deg.yaw, rotation_euler_deg.pitch);
                    r.setFromEuler(e, true);
                    s.set(scale.x, scale.y, scale.z);
                    mat.compose(p, r, s);

                    for (const inst of record.instancedMeshes) {
                        inst.SetMatrixAt(inst.instanceCount, mat);
                    }

                    instanceCount++;
                }
            }

            // ----------------------------
            // Debug info
            // ----------------------------
            for (const [assetPath, record] of uniques) {
                if (record.instancedMeshes.length === 0) {
                    console.warn(assetPath, "loaded 0 meshes (failed load or no mesh components).");
                    continue;
                }
                console.log(`${assetPath} has ${record.instancedMeshes[0].instanceCount} instances`);
            }

            // // Load lights
            // for (const actor of sceneFile.actors) {
            //     if (actor.class !== "StaticMeshActor") continue;
            //     // if (instanceCount >= MAX_INSTANCES) break;

            //     for (const m of actor.static_meshes) {
            //         // if (instanceCount >= MAX_INSTANCES) break;

            //         const assetName = m.asset_name as string;
            //         if (!assetName) continue;

            //         if (!assetName.toLowerCase().includes("light")) continue;

            //         const { location, rotation_euler_deg, scale } = actor.transform;

            //         // 0.533, 0.847, 1.0
            //         const lightGameObject = new GameObject(scene);
            //         lightGameObject.transform.position.set(-location.y / 100, location.z / 100, location.x / 100);
            //         const light = lightGameObject.AddComponent(Components.PointLight);
            //         light.color.set(0.533, 0.847, 1.0, 1.0);
            //         light.intensity = 10;
            //         light.range = 50;
            //         console.log(`Added light ${assetName} at ${lightGameObject.transform.position}`)
            //     }
            // }
        });
    }

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));