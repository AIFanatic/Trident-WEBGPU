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
import { UIColorStat, UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

import { Terrain } from "@trident/plugins/Terrain/Terrain";

import { Water } from "@trident/plugins/Water/WaterPlugin";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
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
    light.intensity = 1;

    const physicsWorld = new GameObject(scene);
    const physicsComponent = physicsWorld.AddComponent(PhysicsRapier);
    await physicsComponent.Load();

    
    
    // const terrain = new TerrainBuilder(terrainSize);
    const terrainGameObject = new GameObject(scene);
    const terrain = terrainGameObject.AddComponent(Terrain);
    terrain.width = 1000;
    terrain.length = 1000;
    terrain.height = 300;
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

    async function LoadTexture(url: string): Promise<GPU.Texture> {
        const texture = await GPU.Texture.Load(url);
        texture.GenerateMips();
        return texture;
    }

    const biomes_splat_map = await GPU.Texture.Load("/extra/test-assets/terrain/heightmaps/biomeids_1024x1024.png");
    biomes_splat_map.GenerateMips();
    terrain.material.layerTexture = biomes_splat_map;

    terrain.material.splatMapTextures = await LoadTerrainTextures([
        "/extra/test-assets/terrain/heightmaps/splatmap_1024x1024.png", //"/extra/test-assets/terrain/heightmaps/splat0_island_1024x1024.png",
    ]);

    const basePath = "/extra/test-assets/terrain/Terrain Textures";
    let transform = new Float32Array([2, 2, 0, 0]);
    terrain.material.layers = [
        { name: "TropicalForest", transform: transform, albedoMap: await LoadTexture(basePath + "/Grass 01/Grass 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Grass 01/Grass 01_Normal.png"), armMap: await LoadTexture(basePath + "/Grass 01/Grass 01_MaskMap.png")},
        { name: "Forest", transform: transform, albedoMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_Normal.png"), armMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_MaskMap.png")},
        { name: "Woodland", transform: transform, albedoMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_Normal.png"), armMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_MaskMap.png")},

        { name: "Savanna", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 01/Sand 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 01/Sand 01_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 01/Sand 01_MaskMap.png")},
        { name: "Desert", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 02/Sand 02_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 02/Sand 02_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 02/Sand 02_MaskMap.png")},
        { name: "Tundra", transform: transform, albedoMap: await LoadTexture(basePath + "/Soil 01/Soil 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Soil 01/Soil 01_Normal.png"), armMap: await LoadTexture(basePath + "/Soil 01/Soil 01_MaskMap.png")},

        { name: "Water", transform: transform, albedoMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_Normal.png"), armMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_MaskMap.png")},
        { name: "Beach", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 03/Sand 03_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 03/Sand 03_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 03/Sand 03_MaskMap.png")},
        { name: "Snow", transform: transform, albedoMap: await LoadTexture(basePath + "/Snow 01/Snow 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Snow 01/Snow 01_Normal.png"), armMap: await LoadTexture(basePath + "/Snow 01/Snow 01_MaskMap.png")},
    ]

    const heightsSize = Math.sqrt(terrain.heights.length);
    console.log(heightsSize)
    // const terrainCenter = terrain.size * scale * 0.5;
    // console.log(terrain.size)
    terrainGameObject.transform.position.z -= terrain.width * 0.5;
    terrainGameObject.transform.position.x -= terrain.length * 0.5;
    
    const terrainCollider = terrainGameObject.AddComponent(TerrainCollider);
    terrainCollider.SetTerrainData(heightsSize - 1, heightsSize - 1, terrain.heights, terrainGameObject.transform.scale);

    const go = new GameObject(scene);
    const line = go.AddComponent(LineRenderer);
    const positions = new Float32Array([
        0,0,0,   1024,0,1024,
        0,0,0,   1024,1024,1024,
        1024,0,1024,   1024,1024,1024,
    ]);
    line.SetPositions(positions);
    line.SetColors(new Float32Array(positions.length / 3 * 4 * 2));
    {
        {
            const boxGO = new GameObject(scene);
            boxGO.transform.position.y = 200;
            // boxGO.transform.position.x = 5;
            boxGO.transform.scale.set(1, 1, 1);
            const boxMesh = boxGO.AddComponent(Components.Mesh);
            boxMesh.geometry = Geometry.Cube();
            boxMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: 0.3});

            const collider = boxGO.AddComponent(BoxCollider);
            const rigidbody = boxGO.AddComponent(RigidBody);
            rigidbody.Create("fixed")
        }

        // {
        //     const boxGO = new GameObject(scene);
        //     boxGO.transform.position.y = 1.5;
        //     boxGO.transform.position.x = 2;
        //     const boxMesh = boxGO.AddComponent(Components.Mesh);
        //     boxMesh.geometry = Geometry.Cube();
        //     boxMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1) });

        //     const collider = boxGO.AddComponent(BoxCollider);
        //     const rigidbody = boxGO.AddComponent(RigidBody);
        // }
    }

    const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const sky = await HDRParser.ToCubemap(hdr);

    const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
    const prefilterMap = await HDRParser.GetPrefilterMap(sky);
    const brdfLUT = await HDRParser.GetBRDFLUT(1);

    scene.renderPipeline.skybox = sky;
    scene.renderPipeline.skyboxIrradiance = skyIrradiance;
    scene.renderPipeline.skyboxPrefilter = prefilterMap;
    scene.renderPipeline.skyboxBRDFLUT = brdfLUT;


    {
        function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
            for (const gameObject of gameObjects) {
                fn(gameObject);
                for (const child of gameObject.transform.children) {
                    traverse([child.gameObject], fn);
                }
            }
        }

        const sceneGameObject = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/Shadow.glb");

        let animator: Components.Animator = undefined;
        traverse([sceneGameObject], gameObject => {
            const _animator = gameObject.GetComponent(Components.Animator);
            if (_animator) animator = _animator;
        })

        if (!animator) throw Error("Could not find an animator component");

        // animator.SetClipByIndex(1);

        function GetClipIndexByName(animator: Components.Animator, name: string, partialMatch = true): number {
            for (let i = 0; i < animator.clips.length; i++) {
                const clip = animator.clips[i];
                if (partialMatch && animator.clips[i].name.toLowerCase().includes(name.toLocaleLowerCase())) return i;
                else if (animator.clips[i].name === name) return i;
            }
            return -1;
        }


        const playerGameObject = new GameObject(scene);
        // playerGameObject.transform.position.x -= terrainCenter;
        playerGameObject.transform.position.y = 300;
        // playerGameObject.transform.position.z -= terrainCenter;
        // playerGameObject.transform.position.set(-405, 105, 75);


        const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
        const playerRigidbody = playerGameObject.AddComponent(RigidBody);
        playerRigidbody.Create("dynamic");
        playerRigidbody.constraints = RigidbodyConstraints.FreezeRotation;
        const thirdPersonController = playerGameObject.AddComponent(ThirdPersonController);
        thirdPersonController._controller = playerRigidbody;
        thirdPersonController._model = sceneGameObject;
        thirdPersonController._mainCamera = camera.gameObject;
        thirdPersonController._animator = animator;
        thirdPersonController._animationIDS = { idle: GetClipIndexByName(animator, "Rig|Rig|Idle_Loop", false), walk: GetClipIndexByName(animator, "Rig|Rig|Walk_Loop", false), sprint: GetClipIndexByName(animator, "sprint"), jump: GetClipIndexByName(animator, "Jump_Start"), fall: GetClipIndexByName(animator, "fall") };
        thirdPersonController.animationSpeedRatio = 0.8;
        thirdPersonController.boostMultiplier = 20;

        const boxGO = new GameObject(scene);
        boxGO.transform.position.y = 1.5;
        boxGO.transform.position.x = 2;
        const boxMesh = boxGO.AddComponent(Components.Mesh);
        boxMesh.geometry = Geometry.Cube();
        boxMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1) });

        class NatureSpawner extends Components.Component {
            public spawnAnimationID = -1;
            public moveAnimationID = -1;
            public animator: Components.Animator;
            public thirdPersonController: ThirdPersonController;
            public rigidBody: RigidBody;

            public spawnPrefab: GameObject;

            private isSpelling = false;

            public Start(): void {
                if (!this.animator) throw Error("No animator");
                if (!this.thirdPersonController) throw Error("No thirdPersonController");
                if (!this.rigidBody) throw Error("No rigidbody");
                if (!this.spawnPrefab) throw Error("No spawnPrefab");
            }

            public Update() {

                if (!this.isSpelling) {
                    if (Input.GetKey(KeyCodes.Q)) {
                        this.animator.CrossFadeTo(this.spawnAnimationID);
                        this.isSpelling = true;
                    }
                }
                else {
                    const p = thirdPersonController.transform.position.clone();
                    p.y += 5;
                    const dir = new Mathf.Vector3(0, 0, -1).applyQuaternion(Components.Camera.mainCamera.transform.rotation).normalize();
                    const ray = new PhysicsRapier.Physics.Ray(p, dir);
                    const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, 100, true, undefined, undefined, undefined, this.rigidBody.rigidBody);
                    
                    if (rayHit) {
                        let hitPoint = ray.pointAt(rayHit.timeOfImpact);
                        const hitPointv = new Mathf.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
                        boxGO.transform.position.copy(hitPointv);

                        if (Input.GetMouseDown(MouseCodes.MOUSE_LEFT)) {
                            console.log("Moused")
                            Scene.Instantiate(this.spawnPrefab, hitPointv);
                        }
                    }
                    
                    if (Math.abs(this.thirdPersonController.move.x) > Mathf.Epsilon || Math.abs(this.thirdPersonController.move.y) > Mathf.Epsilon) {
                        this.animator.CrossFadeTo(this.moveAnimationID);
                        this.isSpelling = false;
                    }
                }
            }
        }

        const natureSpawner = playerGameObject.AddComponent(NatureSpawner);
        natureSpawner.spawnAnimationID = GetClipIndexByName(animator, "Spell_Simple_Idle_Loop");
        natureSpawner.moveAnimationID = GetClipIndexByName(animator, "Rig|Rig|Walk_Loop");
        natureSpawner.animator = animator;
        natureSpawner.rigidBody = playerRigidbody;
        natureSpawner.thirdPersonController = thirdPersonController;

        const tree = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf");
        natureSpawner.spawnPrefab = tree;
        console.log(playerGameObject)
    }

//     {
//         const scale = 100;
//         const waterGameObject = new GameObject(scene);
//         waterGameObject.transform.scale.set(scale, scale, scale);
//         waterGameObject.transform.eulerAngles.x = -90;
//         waterGameObject.transform.position.y = 0;
//         const water = waterGameObject.AddComponent(Water);
//         water.settings.set("sampler_scale", [1 / scale, 1 / scale]);
//         water.settings.set("uv_sampler_scale", [1 / scale, 1 / scale]);
//         water.settings.set("wave_speed", [0.1, 0, 0, 0]);

// // Debug
//         const container = document.createElement("div");
//         container.classList.add("stats-panel");
//         document.body.append(container);

//         const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
//         new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], value => water.settings.set("wave_speed", [value, 0, 0, 0]));
//         new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
//         new UISliderStat(waterSettingsFolder, "Depth offset:", -1, 1, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
//         new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], value => water.settings.set("refraction", [value, 0, 0, 0]));
//         new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], value => water.settings.set("foam_level", [value, 0, 0, 0]));
//         new UIColorStat(waterSettingsFolder, "Color deep:", new Mathf.Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
//             const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
//             water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
//         });
//         new UIColorStat(waterSettingsFolder, "Color shallow:", new Mathf.Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
//             const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
//             water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
//         });

//         const wave_a = water.settings.get("wave_a");
//         new UIVecStat(waterSettingsFolder, "Wave A:",
//             {value: wave_a[0], min: -1, max: 1, step: 0.01},
//             {value: wave_a[1], min: -1, max: 1, step: 0.01},
//             {value: wave_a[2], min: -1, max: 1, step: 0.01},
//             {value: wave_a[3], min: -1, max: 1, step: 0.01},
//             value => {
//                 water.settings.set("wave_a", [value.x, value.y, value.z, value.w])
//             }
//         )

//         const wave_b = water.settings.get("wave_b");
//         new UIVecStat(waterSettingsFolder, "Wave B:",
//             {value: wave_b[0], min: -1, max: 1, step: 0.01},
//             {value: wave_b[1], min: -1, max: 1, step: 0.01},
//             {value: wave_b[2], min: -1, max: 1, step: 0.01},
//             {value: wave_b[3], min: -1, max: 1, step: 0.01},
//             value => {
//                 water.settings.set("wave_b", [value.x, value.y, value.z, value.w])
//             }
//         )

//         const wave_c = water.settings.get("wave_c");
//         new UIVecStat(waterSettingsFolder, "Wave C:",
//             {value: wave_c[0], min: -1, max: 1, step: 0.01},
//             {value: wave_c[1], min: -1, max: 1, step: 0.01},
//             {value: wave_c[2], min: -1, max: 1, step: 0.01},
//             {value: wave_c[3], min: -1, max: 1, step: 0.01},
//             value => {
//                 water.settings.set("wave_c", [value.x, value.y, value.z, value.w])
//             }
//         )

//         waterSettingsFolder.Open();
//     }

    scene.renderPipeline.DeferredShadowMapPass.Settings.splitTypePracticalLambda = 0.99;

    // mainCameraGameObject.transform.position.set(0, 0, 500);
    // new OrbitControls(GPU.Renderer.canvas, camera);

    // const physicsDebuggerGO = new GameObject(scene);
    // physicsDebuggerGO.AddComponent(PhysicsDebugger);

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));