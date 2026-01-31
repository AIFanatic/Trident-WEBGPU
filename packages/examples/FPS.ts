import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Geometry,
    Input,
    KeyCodes,
    MouseCodes,
    VertexAttribute,
    IndexAttribute,
    Console,
    Component,
    Prefab,
} from "@trident/core";

import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { TerrainCollider } from "@trident/plugins/PhysicsRapier/colliders/TerrainCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { ThirdPersonController } from "@trident/plugins/PhysicsRapier/ThirdPersonController";
import { RigidBody, RigidbodyConstraints } from "@trident/plugins/PhysicsRapier/RigidBody";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { UIButtonStat, UIColorStat, UIFolder, UISliderStat, UITextureViewer, UIVecStat } from "@trident/plugins/ui/UIStats";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

import { Terrain } from "@trident/plugins/Terrain/Terrain";

import { Water } from "@trident/plugins/Water/WaterPlugin";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFog } from "@trident/plugins/PostProcessing/effects/Fog";
import { PostProcessingFXAA } from "@trident/plugins/PostProcessing/effects/FXAA";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";

import { Sky } from "@trident/plugins/Environment/Sky";
import { Environment } from "@trident/plugins/Environment/Environment";
import { LODInstanceRenderable } from "@trident/plugins/LODGroup";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { MeshletMesh } from "@trident/plugins/meshlets_v4/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets_v4/passes/MeshletDraw";
import { Bloom } from "@trident/plugins/Bloom";
import { SerializedGameObject } from "@trident/core/GameObject";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu", 1);
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, canvas.width / canvas.height, 0.2, 10000);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4).mul(10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.color.set(1.0, 0.96, 0.88, 1);
    light.intensity = 1;
    // light.castShadows = false;

    new UIColorStat(Debugger.ui, "Light Color:", light.color.toHex(), value => {
        light.color.setFromHex(value);
    })

    // setInterval(() => {
    //     const radius = 1; // distance of the directional light from origin
    //     const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
    //     const azimuthRad   = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

    //     // Convert spherical coordinates to 3D position
    //     const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
    //     const y = radius * Mathf.Sin(elevationRad);
    //     const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

    //     const sunPos = new Mathf.Vector3(x, y, z);

    //     lightGameObject.transform.position = sunPos;
    //     lightGameObject.transform.LookAtV1(new Mathf.Vector3(0,0,0));

    //     light.intensity = skyAtmosphere.SUN_ELEVATION_DEGREES / 10;
    // }, 100);

    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();



    // const terrain = new TerrainBuilder(terrainSize);
    const terrainGameObject = new GameObject(scene);
    const terrain = terrainGameObject.AddComponent(Terrain);
    terrain.width = 1000;
    terrain.length = 1000;
    terrain.height = 200;
    await terrain.HeightmapFromPNG("/extra/test-assets/terrain/heightmaps/elevation_1024x1024.png", true, 0.25);

    async function LoadTerrainTextures(urls: string[]): Promise<GPU.Texture[]> {
        let textures: GPU.Texture[] = [];
        for (const url of urls) {
            const texture = await GPU.Texture.Load(url);
            texture.GenerateMips();
            textures.push(texture);
        }
        return textures;
    }

    async function LoadTexture(url: string, format: GPU.TextureFormat = "rgba8unorm-srgb"): Promise<GPU.Texture> {
        const texture = await GPU.Texture.Load(url, format);
        texture.GenerateMips();
        return texture;
    }

    const biomes_splat_map = await GPU.Texture.Load("/extra/test-assets/terrain/heightmaps/biomeids_1024x1024.png");
    biomes_splat_map.GenerateMips();
    terrain.material.layerTexture = biomes_splat_map;

    terrain.material.splatMapTextures = await LoadTerrainTextures([
        "/extra/test-assets/terrain/heightmaps/splatmap_1024x1024.png", //"/extra/test-assets/terrain/heightmaps/splat0_island_1024x1024.png",
    ]);

    let transform = new Float32Array([10, 10, 0, 0]);
    const albedoTexture = await LoadTexture(`/extra/test-assets/terrain/rocky_terrain_02_2k/rocky_terrain_02_diff_2k.jpg`, "rgba8unorm-srgb");
    const normalTexture = await LoadTexture(`/extra/test-assets/terrain/rocky_terrain_02_2k/rocky_terrain_02_nor_gl_2k.jpg`, "rgba8unorm");
    const armMap = await LoadTexture(`/extra/test-assets/terrain/rocky_terrain_02_2k/rocky_terrain_02_arm_2k.jpg`, "rgba8unorm");
    terrain.material.layers = [
        { name: "TropicalForest", transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
    ]

    const heightsSize = Math.sqrt(terrain.heights.length);
    console.log(heightsSize)
    // const terrainCenter = terrain.size * scale * 0.5;
    // console.log(terrain.size)
    terrainGameObject.transform.position.z -= terrain.width * 0.5;
    terrainGameObject.transform.position.x -= terrain.length * 0.5;

    const terrainCollider = terrainGameObject.AddComponent(TerrainCollider);
    terrainCollider.SetTerrainData(heightsSize - 1, heightsSize - 1, terrain.heights, terrainGameObject.transform.scale);

    const sky = new Sky();
    sky.SUN_ELEVATION_DEGREES = 60;
    await sky.init();
    const skyTexture = sky.skyTextureCubemap;

    setInterval(() => {
        const radius = 1; // distance of the directional light from origin
        const elevationRad = Mathf.Deg2Rad * sky.SUN_ELEVATION_DEGREES;
        const azimuthRad = Mathf.Deg2Rad * sky.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

        // Convert spherical coordinates to 3D position
        const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
        const y = radius * Mathf.Sin(elevationRad);
        const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

        const sunPos = new Mathf.Vector3(x, y, z);

        lightGameObject.transform.position = sunPos;
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

        light.intensity = sky.SUN_ELEVATION_DEGREES / 10;
    }, 100);

    // const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    // const skyTexture = await HDRParser.ToCubemap(hdr);


    const environment = new Environment(scene, skyTexture);
    await environment.init();

    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    // Player
    const shadowPrefab = await GLTFLoader.LoadFromURL("./assets/models/Shadow.glb");
    console.log(shadowPrefab)
    const sceneGameObject = scene.Instantiate(shadowPrefab);

    let animator: Components.Animator = undefined;
    traverse([sceneGameObject], gameObject => {
        const _animator = gameObject.GetComponent(Components.Animator);
        if (_animator) animator = _animator;
    })

    if (!animator) throw Error("Could not find an animator component");
    console.log(animator)

    const playerGameObject = new GameObject(scene);
    playerGameObject.transform.position.set(20, 33, 185);
    // playerGameObject.transform.scale.set(0.01, 0.01, 0.01);


    const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
    const playerRigidbody = playerGameObject.AddComponent(RigidBody);
    playerRigidbody.Create("dynamic");
    playerRigidbody.constraints = RigidbodyConstraints.FreezeRotation;
    const thirdPersonController = playerGameObject.AddComponent(ThirdPersonController);
    thirdPersonController._controller = playerRigidbody;
    thirdPersonController._model = sceneGameObject;
    thirdPersonController._mainCamera = camera.gameObject;
    thirdPersonController._animator = animator;
    thirdPersonController._animationIDS = {
        idle: animator.GetClipIndexByName("Rig|Rig|Idle_Loop"), 
        walk: animator.GetClipIndexByName("Rig|Rig|Walk_Loop"), 
        sprint: animator.GetClipIndexByName("Rig|Rig|Sprint_Loop"), 
        jump: animator.GetClipIndexByName("Rig|Rig|Jump_Start"),
        fall: animator.GetClipIndexByName("Rig|Rig|Jump_Land")
    };
    thirdPersonController.animationSpeedRatio = 0.8;
    thirdPersonController.boostMultiplier = 20;

    // Trees
    {
        interface TerrainObjectSpawnerOptions {
            spawnAroundTarget?: Mathf.Vector3;
            enableShadows?: boolean;
            heightRandom?: number;
        }
        async function TerrainObjectSpawner(glbURL, count, _options?: TerrainObjectSpawnerOptions) {
            const defaults: TerrainObjectSpawnerOptions = { spawnAroundTarget: undefined, enableShadows: true, heightRandom: -0.5 };
            const options = Object.assign({}, defaults, _options);

            function traversePrefab(gameObjects: Prefab[], fn: (gameObject: SerializedGameObject) => void) {
                for (const gameObject of gameObjects) {
                    fn(gameObject);
                    for (const child of gameObject.children) {
                        traversePrefab([child], fn);
                    }
                }
            }
            const prefab = await GLTFLoader.LoadFromURL(glbURL);

            let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
            traversePrefab([prefab], prefab => {
                for (const component of prefab.components) {
                    if (component.type === Components.Mesh.type) {
                        const geometry = Geometry.Deserialize(component.geometry);
                        const material = GPU.Material.Deserialize(component.material);
                        // Double sided?
                        lodGroupEntries.push({ geometry: geometry, material: material });
                    }
                }
            })

            const lodGameObject = new GameObject(scene);
            const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);
            if (lodGroupEntries.length >= 2) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 2), screenSize: 10 });
            if (lodGroupEntries.length >= 4) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(2, 4), screenSize: 20 });
            if (lodGroupEntries.length >= 6) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(4, 6), screenSize: 100 });
            if (lodGroupEntries.length >= 7) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(6, 7), screenSize: 300 });
            else if (lodGroupEntries.length >= 1) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 1), screenSize: 300 });

            lodInstanceRenderable.enableShadows = options.enableShadows;

            const p = new Mathf.Vector3();
            const r = new Mathf.Vector3();
            const q = new Mathf.Quaternion();
            const s = new Mathf.Vector3(1, 1, 1);
            const m = new Mathf.Matrix4();

            const c = count;
            const off = 500;

            let treeCount = 0;
            for (let i = 0; i < c; i++) {

                let x = Mathf.RandomRange(-off, off);
                let z = Mathf.RandomRange(-off, off);

                if (options.spawnAroundTarget) {
                    const angle = i / c * Math.PI * 2;
                    const radius = Mathf.RandomRange(0, 200);

                    x = options.spawnAroundTarget.x + Mathf.Cos(angle) * radius;
                    z = options.spawnAroundTarget.z + Mathf.Sin(angle) * radius;
                }

                p.set(x, 0, z);
                terrain.SampleHeight(p);

                r.y = Mathf.RandomRange(0, 360);
                q.setFromEuler(r);
                if (options.heightRandom) {
                    p.y += Mathf.RandomRange(options.heightRandom, 0);
                }
                m.compose(p, q, s);

                if (p.y > 25 && p.y < 100) {
                    lodInstanceRenderable.SetMatrixAt(treeCount, m);
                    treeCount++
                }
            }

            console.log(treeCount)
        }

        const ta = 5000;
        await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_01.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_02.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_03.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_04.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_06.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_07.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_08.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_09.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_plant_01.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_plant_02.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_plant_03.glb", ta);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Pine_trees/Prefabs/Prefab_Forest_pine_tree_00_A.glb", ta);


        // // await TerrainObjectSpawner("/extra/test-assets/tree-01/grass.glb", 50000000);
        // const grassOptions: TerrainObjectSpawnerOptions = {spawnAroundTarget: playerGameObject.transform.position, enableShadows: false, heightRandom: undefined};
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Foliage and Grass/Prefabs/Prefab_grass_01_1.glb", 50000, grassOptions);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Foliage and Grass/Prefabs/Prefab_grass_01_4.glb", 50000, grassOptions);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Foliage and Grass/Prefabs/Prefab_grass_03_C_1.glb", 5000, grassOptions);
        // await TerrainObjectSpawner("/extra/test-assets/Mountain Environment/Foliage and Grass/Prefabs/Prefab_grass_03_A_1.glb", 50000, grassOptions);



        // {
        //     const tree1 = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/Mountain Environment/Foliage and Grass/Prefabs/Prefab_grass_01_1.glb");

        //     let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
        //     traverse([tree1], gameObject => {
        //         const mesh = gameObject.GetComponent(Components.Mesh);
        //         if (mesh) {
        //             const geometrySerialized = mesh.geometry.Serialize();
        //             const materialSerialized = mesh.material.Serialize();
        //             const materialClone = GPU.Material.Deserialize(materialSerialized);
        //             const geometryClone = new Geometry();
        //             geometryClone.Deserialize(geometrySerialized);

        //             lodGroupEntries.push({ geometry: geometryClone, material: materialClone });
        //         }
        //     })
        //     tree1.Destroy();

        //     const gameObject = new GameObject(scene);
        //     const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
        //     instancedMesh.enableShadows = false;

        //     console.log(lodGroupEntries)
        //     instancedMesh.geometry = lodGroupEntries[0].geometry;
        //     instancedMesh.material = lodGroupEntries[0].material;

        //     const count = 100000;
        //     const p = new Mathf.Vector3();
        //     const r = new Mathf.Vector3();
        //     const q = new Mathf.Quaternion();
        //     const s = new Mathf.Vector3(1, 1, 1);
        //     const m = new Mathf.Matrix4();

        //     const c = count;
        //     const off = 500;

        //     let treeCount = 0;
        //     for (let i = 0; i < c; i++) {

        //         let x = Mathf.RandomRange(-off, off);
        //         let z = Mathf.RandomRange(-off, off);

        //         p.set(x, 0, z);
        //         terrain.SampleHeight(p);

        //         r.y = Mathf.RandomRange(0, 360);
        //         q.setFromEuler(r);
        //         m.compose(p, q, s);

        //         if (p.y > 25) {
        //             instancedMesh.SetMatrixAt(treeCount, m);
        //             treeCount++
        //         }
        //     }
        // }
    }

    // // Grass
    // {
    //     const tree1 = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-01/grass.glb");

    //     let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
    //     traverse([tree1], gameObject => {
    //         const mesh = gameObject.GetComponent(Components.Mesh);
    //         if (mesh) {
    //             const geometrySerialized = mesh.geometry.Serialize();
    //             const materialSerialized = mesh.material.Serialize();
    //             console.log(materialSerialized.params.roughness, materialSerialized.params.metalness)
    //             const materialClone = GPU.Material.Deserialize(materialSerialized);
    //             const geometryClone = new Geometry();
    //             geometryClone.Deserialize(geometrySerialized);

    //             lodGroupEntries.push({ geometry: geometryClone, material: materialClone });
    //         }
    //     })
    //     tree1.Destroy();

    //     const lodGameObject = new GameObject(scene);
    //     const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);
    //     lodInstanceRenderable.enableShadows = false;
    //     lodInstanceRenderable.lods.push({ renderers: lodGroupEntries, screenSize: 0 });
    //     lodInstanceRenderable.lods.push({ renderers: lodGroupEntries, screenSize: 1000 });

    //     const p = new Mathf.Vector3();
    //     const r = new Mathf.Vector3();
    //     const q = new Mathf.Quaternion();
    //     const s = new Mathf.Vector3(1, 1, 1);
    //     const m = new Mathf.Matrix4();

    //     const c = 20000;
    //     const off = 500;

    //     const center = playerGameObject.transform.position;

    //     for (let i = 0; i < c; i++) {

    //         const angle = i / c * Math.PI * 2;
    //         // const radius = Mathf.RandomRange(20, 1000);
    //         const radius = Mathf.RandomRange(0, 100);

    //         const x = center.x + Mathf.Cos(angle) * radius;
    //         const z = center.z + Mathf.Sin(angle) * radius;

    //         // const x = Mathf.RandomRange(-off, off);
    //         // const z = Mathf.RandomRange(-off, off);            

    //         p.set(x, 0, z);
    //         terrain.SampleHeight(p);

    //         r.y = Mathf.RandomRange(0, 360);
    //         q.setFromEuler(r);
    //         p.y += 0.1;
    //         m.compose(p, q, s);

    //         if (p.y > 25) {
    //             lodInstanceRenderable.SetMatrixAt(i, m);
    //         }
    //     }
    // }




    // // Water
    // {
    //     const scale = 1000;
    //     const waterGameObject = new GameObject(scene);
    //     waterGameObject.transform.scale.set(scale, scale, 1);
    //     waterGameObject.transform.eulerAngles.x = -90;
    //     waterGameObject.transform.position.y = 25;
    //     const water = waterGameObject.AddComponent(Water);

    //     new UIColorStat(Debugger.ui, "Color deep:", new Mathf.Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
    //         const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
    //         water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
    //     });
    //     new UIColorStat(Debugger.ui, "Color shallow:", new Mathf.Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
    //         const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
    //         water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
    //     });
    // }

    Console.getVar("r_exposure").value = 0;
    Console.getVar("r_shadows_csm_splittypepracticallambda").value = 0.99;

    mainCameraGameObject.transform.position.set(0, 0, 500);
    // const controls = new OrbitControls(GPU.Renderer.canvas, camera);


    // const physicsDebuggerGO = new GameObject(scene);
    // physicsDebuggerGO.AddComponent(PhysicsDebugger);

    const postProcessing = new PostProcessingPass();
    // postProcessing.effects.push(new PostProcessingFog());
    // postProcessing.effects.push(new PostProcessingFXAA());
    const smaa = new PostProcessingSMAA();
    postProcessing.effects.push(smaa);
    scene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);

    new UIButtonStat(Debugger.ui, "Disable SMAA:", async value => {
        smaa.enabled = value;
    });


    new UISliderStat(Debugger.ui, "Exposure:", -4, 4, 0.1, Console.getVar<number>("r_exposure").value, value => Console.getVar("r_exposure").value = value);
    new UISliderStat(Debugger.ui, "Saturation:", -4, 4, 0.1, Console.getVar<number>("r_saturation").value, value => Console.getVar("r_saturation").value = value);
    new UISliderStat(Debugger.ui, "Contrast:", -4, 4, 0.1, Console.getVar<number>("r_contrast").value, value => Console.getVar("r_contrast").value = value);

    Debugger.Enable();


    // Drag and drop models
    {
    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = playerGameObject.transform.position.y - 5;
    floorGameObject.transform.scale.set(1000, 1000, 1000);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorGameObject.AddComponent(PlaneCollider);
    floorMesh.material = new PBRMaterial();
    
        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (e) => {
            e.preventDefault();

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            const url = URL.createObjectURL(file);
            const prefab = await GLTFLoader.LoadFromURL(url, "glb");
            const obj = scene.Instantiate(prefab);
            obj.transform.position.copy(playerGameObject.transform.position);
            obj.transform.eulerAngles.x += 90
        });
    }

    scene.Start();
};

Application(document.querySelector("canvas"));