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
import { UIButtonStat, UIColorStat, UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

import { Terrain } from "@trident/plugins/Terrain/Terrain";

import { Water } from "@trident/plugins/Water/WaterPlugin";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFog } from "@trident/plugins/PostProcessing/effects/Fog";

import { Sky } from "@trident/plugins/Environment/Sky";
import { Environment } from "@trident/plugins/Environment/Environment";

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
    light.intensity = 10;

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

    const basePath = "/extra/test-assets/terrain/Terrain Textures";
    let transform = new Float32Array([2, 2, 0, 0]);
    // terrain.material.layers = [
    //     { name: "TropicalForest", transform: transform, albedoMap: await LoadTexture(basePath + "/Grass 01/Grass 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Grass 01/Grass 01_Normal.png"), armMap: await LoadTexture(basePath + "/Grass 01/Grass 01_MaskMap.png") },
    //     { name: "Forest", transform: transform, albedoMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_Normal.png"), armMap: await LoadTexture(basePath + "/Leaves 01/Leaves 01_MaskMap.png") },
    //     { name: "Woodland", transform: transform, albedoMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_Normal.png"), armMap: await LoadTexture(basePath + "/Leaves 02/Leaves 02_MaskMap.png") },

    //     { name: "Savanna", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 01/Sand 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 01/Sand 01_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 01/Sand 01_MaskMap.png") },
    //     { name: "Desert", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 02/Sand 02_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 02/Sand 02_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 02/Sand 02_MaskMap.png") },
    //     { name: "Tundra", transform: transform, albedoMap: await LoadTexture(basePath + "/Soil 01/Soil 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Soil 01/Soil 01_Normal.png"), armMap: await LoadTexture(basePath + "/Soil 01/Soil 01_MaskMap.png") },

    //     { name: "Water", transform: transform, albedoMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_Normal.png"), armMap: await LoadTexture(basePath + "/Asphalt 01/Asphalt 01_MaskMap.png") },
    //     { name: "Beach", transform: transform, albedoMap: await LoadTexture(basePath + "/Sand 03/Sand 03_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Sand 03/Sand 03_Normal.png"), armMap: await LoadTexture(basePath + "/Sand 03/Sand 03_MaskMap.png") },
    //     { name: "Snow", transform: transform, albedoMap: await LoadTexture(basePath + "/Snow 01/Snow 01_BaseColor.png"), normalMap: await LoadTexture(basePath + "/Snow 01/Snow 01_Normal.png"), armMap: await LoadTexture(basePath + "/Snow 01/Snow 01_MaskMap.png") },
    // ]

    // const albedoTexture = await LoadTexture(`/extra/test-assets/terrain/Terrain Textures/Grass 01/Grass 01_BaseColor.png`, "rgba8unorm-srgb");
    // const normalTexture = await LoadTexture(`/extra/test-assets/terrain/Terrain Textures/Grass 01/Grass 01_Normal.png`, "rgba8unorm");
    // const armMap = await LoadTexture(`/extra/test-assets/terrain/Terrain Textures/Grass 01/Grass 01_MaskMap.png`, "rgba8unorm");
    const albedoTexture = await LoadTexture(`/extra/test-assets/terrain/Terrain_Textures_v2/T_ground_grass_01_BC_SM.png`, "rgba8unorm-srgb");
    const normalTexture = await LoadTexture(`/extra/test-assets/terrain/Terrain_Textures_v2/T_ground_grass_01_N.png`, "rgba8unorm");
    const armMap = await LoadTexture(`/extra/test-assets/terrain/Terrain_Textures_v2/T_ground_grass_01_MT_AO_H_SM.png`, "rgba8unorm");
    terrain.material.layers = [
        { name: "TropicalForest", transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },

        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },

        // { name: `Water`, transform: transform, albedoMap: await LoadTexture(basePath + `/Asphalt 01/Asphalt 01_BaseColor.png`), normalMap: await LoadTexture(basePath + `/Asphalt 01/Asphalt 01_Normal.png`), armMap: await LoadTexture(basePath + `/Asphalt 01/Asphalt 01_MaskMap.png`) },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
        { name: `TropicalForest`, transform: transform, albedoMap: albedoTexture, normalMap: normalTexture, armMap: armMap },
    ]

    const heightsSize = Math.sqrt(terrain.heights.length);
    console.log(heightsSize)
    // const terrainCenter = terrain.size * scale * 0.5;
    // console.log(terrain.size)
    terrainGameObject.transform.position.z -= terrain.width * 0.5;
    terrainGameObject.transform.position.x -= terrain.length * 0.5;

    const terrainCollider = terrainGameObject.AddComponent(TerrainCollider);
    terrainCollider.SetTerrainData(heightsSize - 1, heightsSize - 1, terrain.heights, terrainGameObject.transform.scale);

    {
        {
            const boxGO = new GameObject(scene);
            boxGO.transform.position.y = 200;
            // boxGO.transform.position.x = 5;
            boxGO.transform.scale.set(1, 1, 1);
            const boxMesh = boxGO.AddComponent(Components.Mesh);
            boxMesh.geometry = Geometry.Cube();
            boxMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: 0.3 });

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

    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();

    // const skyTexture = hdrCubemap;
    const skyTexture = skyAtmosphere.skyTextureCubemap;

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    {
        const skySettings = new UIFolder(Debugger.ui, "Sky");
        new UISliderStat(skySettings, "SUN_ELEVATION_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_ELEVATION_DEGREES, value => skyAtmosphere.SUN_ELEVATION_DEGREES = value);
        new UISliderStat(skySettings, "EYE_ALTITUDE:", 0, 1000, 0.01, skyAtmosphere.EYE_ALTITUDE, value => skyAtmosphere.EYE_ALTITUDE = value);

        new UIButtonStat(skySettings, "Rebuild:", async value => {
            skyAtmosphere.Update();
            environment.Update();
        });

        skySettings.Open();

        // setInterval(async () => {
        //     await skyAtmosphere.init();
        //     await skyAtmosphere.preFrame();
        //     await skyAtmosphere.execute();

        //     // const hdr = await HDRParser.Load("./assets/textures/HDR/kloofendal_48d_partly_cloudy_puresky_1k.hdr");
        //     // const sky = await HDRParser.ToCubemap(hdr);
        //     const sky = await HDRParser.ToCubemap(skyAtmosphere.output);

        //     const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
        //     const prefilterMap = await HDRParser.GetPrefilterMap(sky);
        //     const brdfLUT = await HDRParser.GetBRDFLUT(1);

        //     scene.renderPipeline.skybox = sky;
        //     scene.renderPipeline.skyboxIrradiance = skyIrradiance;
        //     scene.renderPipeline.skyboxPrefilter = prefilterMap;
        //     scene.renderPipeline.skyboxBRDFLUT = brdfLUT;
        // }, 1000);
    }


    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    // Player
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
    // playerGameObject.transform.position.y = 200;
    // playerGameObject.transform.position.set(0, 100, 0);
    playerGameObject.transform.position.set(-125, 30, 255);


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


    const playerSettings = new UIFolder(Debugger.ui, "Player");
    const playerPosition = new UIVecStat(playerSettings, "Position:",
        { value: playerGameObject.transform.position.x, min: -1000, max: 1000, step: 1 },
        { value: playerGameObject.transform.position.y, min: -1000, max: 1000, step: 1 },
        { value: playerGameObject.transform.position.z, min: -1000, max: 1000, step: 1 },
        undefined,
        value => {
            playerGameObject.transform.position.set(value.x, value.y, value.z)
        }
    )
    setInterval(() => {
        const p = playerGameObject.transform.position;
        playerPosition.SetValue(p.x, p.y, p.z);
    }, 100);


    // Billboard grass
    {
        class FrustumInstance extends Components.InstancedMesh {
            public distance: number = 10;
            public amount: number = 100;
            public scale: Mathf.Vector3 = new Mathf.Vector3(1, 1, 1);
            public rotation: Mathf.Vector3 = new Mathf.Vector3(0, 0, 0);
            public ground_height: number = 0;
            public target: Components.Transform;

            public heightSamplingFunction = (point: Mathf.Vector3): number => { return 0 };

            private randomPointInAnnulus(center: Mathf.Vector3, innerRadius: number, outerRadius: number) {
                const angle = Mathf.RandomRange(0, 1) * Math.PI * 2;

                // Uniform distribution between innerRadius and outerRadius
                const inner2 = innerRadius * innerRadius;
                const outer2 = outerRadius * outerRadius;
                const radius = Math.sqrt(Mathf.RandomRange(inner2, outer2));

                return new Mathf.Vector3(
                    center.x + Math.cos(angle) * radius,
                    center.y,
                    center.z + Math.sin(angle) * radius
                );
            }

            private randomPointOnCircle(center: Mathf.Vector3, radius: number) {
                const angle = Mathf.RandomRange(0, 1) * Math.PI * 2;
                const uniformRadius = radius * Math.sqrt(Mathf.RandomRange(0, 1));
                return new Mathf.Vector3(center.x + Math.cos(angle) * uniformRadius, center.y, center.z + Math.sin(angle) * uniformRadius);
            }

            public Start() {
                if (!this.target) throw Error("No transform");
                if (!this.geometry || !this.material) throw Error("No geometry or material");

                const p = new Mathf.Vector3();
                const r = new Mathf.Quaternion();

                const _euler = new Mathf.Vector3();
                const c = this.amount;

                const calculateNewPosition = (target: Mathf.Vector3, minRadius: number, maxRadius: number): Mathf.Matrix4 => {
                    const m = new Mathf.Matrix4();
                    _euler.set(
                        Mathf.RandomRange(-10, 10) * Mathf.Deg2Rad,
                        Mathf.RandomRange(0, 360) * Mathf.Deg2Rad,
                        0
                    ).add(this.rotation);
                    r.setFromEuler(_euler);

                    const objectCenter = minRadius <= 0
                        ? this.randomPointOnCircle(target, maxRadius)              // full disk
                        : this.randomPointInAnnulus(target, minRadius, maxRadius); // outer ring

                    p.copy(objectCenter);

                    p.y = this.heightSamplingFunction(p);
                    p.y += this.scale.y * 0.5;
                    p.y += this.ground_height;

                    m.compose(p, r, this.scale);
                    return m;
                };

                let instances: { i: number; m: Mathf.Matrix4 }[] = [];

                // Initial placement: anywhere in [0, distance]
                for (let i = 0; i < c; i++) {
                    const mat = calculateNewPosition(this.target.position, 0, this.distance);
                    this.SetMatrixAt(i, mat);
                    instances.push({ i, m: mat });
                }

                // Updates
                setInterval(() => {
                    for (const instance of instances) {
                        instance.m.decompose(p, r, this.scale);

                        const dist = this.target.position.distanceTo(p);
                        if (dist > this.distance) {
                            // Recycle ONLY in outer ring, e.g. 70%–100% of max radius
                            const inner = this.distance * 0.7;
                            const outer = this.distance;

                            const mat = calculateNewPosition(this.target.position, inner, outer);
                            this.SetMatrixAt(instance.i, mat);
                            instance.m = mat;
                        }
                    }
                }, 1000);
            }
        }

        const billboards = [
            // { geometry: Geometry.Plane(), material: new PBRMaterial({ albedoMap: await GPU.Texture.Load("/extra/test-assets/billboards/grass/grassbushcc008.png", "rgba8unorm", false, true), alphaCutoff: 0.5, albedoColor: Mathf.Color.fromHex(0x707070ff) }), amount: 100000, distance: 25, ground_height: 0, scale: new Mathf.Vector3(0.5, 0.5, 0.5) },
            // {geometry: Geometry.Plane(), material: new PBRMaterial({ albedoMap: await GPU.Texture.Load("/extra/test-assets/billboards/grass/grassbushcc008.png", "rgba8unorm", false, true), alphaCutoff: 0.5, albedoColor: Mathf.Color.fromHex(0x707070ff) }), amount: 5000, distance: 500, ground_height: 0, scale: new Mathf.Vector3(1,1,1)},
            // {texture: await GPU.Texture.Load("/extra/test-assets/billboards/grass/grassbushcc007.png"), amount: 10000, distance: 50, ground_height: 0, scale: new Mathf.Vector3(1,1,1)},
            // {geometry: Geometry.Plane(), material: new PBRMaterial({ albedoMap: await GPU.Texture.Load("/extra/test-assets/billboards/trees/tree002.png", "rgba8unorm", false, true), alphaCutoff: 0.5, unlit: false}), amount: 100, distance: 50, ground_height: 2, scale: new Mathf.Vector3(5,5,5)},
            // {geometry: treeGeometry, material: treeMaterial, amount: 1000, distance: 300, ground_height: 8, scale: new Mathf.Vector3(1,1,1), rotation: new Mathf.Vector3(-Math.PI / 2,0,0)},
        ]

        const treesGameObject = new GameObject(scene);

        for (const billboard of billboards) {
            const treesInstance = treesGameObject.AddComponent(FrustumInstance);
            treesInstance.amount = billboard.amount;
            treesInstance.distance = billboard.distance;
            treesInstance.ground_height = billboard.ground_height;
            treesInstance.scale = billboard.scale;
            treesInstance.target = playerGameObject.transform;
            if (billboard.rotation) treesInstance.rotation = billboard.rotation;
            treesInstance.enableShadows = false;
            treesInstance.geometry = billboard.geometry;
            treesInstance.material = billboard.material;
            treesInstance.heightSamplingFunction = p => { return terrain.SampleHeight(p) };
        }
    }


    // Instanced Tree
    interface Instance {
        geometry: Geometry;
        material: PBRMaterial;
    };

    class InstancedMultiMesh {
        private instancedMeshes: Components.InstancedMesh[] = [];

        constructor(gameObject: GameObject, instances: Instance[]) {
            for (const instance of instances) {
                const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
                instancedMesh.geometry = instance.geometry;
                instancedMesh.material = instance.material;
                this.instancedMeshes.push(instancedMesh);
            }
        }

        public SetMatrixAt(index: number, matrix: Mathf.Matrix4) {
            for (const instancedMesh of this.instancedMeshes) {
                instancedMesh.SetMatrixAt(index, matrix);
            }
        }
    }

    // const commonTree = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf");
    const commonTree = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-02.glb");

    let instances: Instance[] = [];
    traverse([commonTree], gameObject => {
        const mesh = gameObject.GetComponent(Components.Mesh);
        if (mesh) {
            instances.push({ geometry: mesh.geometry, material: mesh.material as PBRMaterial });
        }
    })

    // const g = new GameObject(scene);
    // const instancedMultiMesh = new InstancedMultiMesh(g, instances);

    // const p = new Mathf.Vector3();
    // const r = new Mathf.Vector3();
    // const _q = new Mathf.Quaternion();
    // const s = new Mathf.Vector3(1, 1, 1);
    // const m = new Mathf.Matrix4();
    // const center = playerGameObject.transform.position;

    // let index = 0;
    // let c = 1000;
    // for (let i = 0; i < c; i++) {
    //     const angle = i / c * Math.PI * 2;
    //     const radius = Mathf.RandomRange(20, 1000);

    //     const x = center.x + Mathf.Cos(angle) * radius;
    //     const z = center.z + Mathf.Sin(angle) * radius;

    //     p.set(x, 0, z);
    //     terrain.SampleHeight(p);

    //     // p.y *= Mathf.RandomRange(0.95, 1.0);
    //     r.set(0, Mathf.RandomRange(0, 360), 0);

    //     if (p.y > 20) { // Dont place on water
    //         _q.setFromEuler(r, true);
    //         m.compose(p, _q, s);
    //         instancedMultiMesh.SetMatrixAt(index, m);
    //         index++;
    //     }
    // }


    interface InstancedLODLevelConfig {
        geometry: Geometry;
        material: GPU.Material;
        maxDistance?: number; // exclusive switch distance, Infinity if omitted
    }

    interface InstanceSlot {
        matrix: Mathf.Matrix4;
        position: Mathf.Vector3;
        lodIndex: number;
    }

    interface LODLevel {
        mesh: Components.InstancedMesh;
        maxDistance: number;
        minDistance: number;
        minDistanceSq: number;
        maxDistanceSq: number;
        cursor: number;
    }

    class InstancedLODGroup extends Component {
        public static type = "@trident/core/components/InstancedLODGroup";

        public hysteresis = 5;
        private lodLevels: LODLevel[] = [];
        private instances: (InstanceSlot | undefined)[] = [];
        private cameraPosition = new Mathf.Vector3();

        public AddLevel(config: InstancedLODLevelConfig): Components.InstancedMesh {
            const level: LODLevel = {
                mesh: this.gameObject.AddComponent(Components.InstancedMesh),
                maxDistance: config.maxDistance ?? Number.POSITIVE_INFINITY,
                minDistance: 0,
                minDistanceSq: 0,
                maxDistanceSq: Number.POSITIVE_INFINITY,
                cursor: 0
            };
            level.mesh.geometry = config.geometry;
            level.mesh.material = config.material;
            this.lodLevels.push(level);
            this.recalculateRanges();
            return level.mesh;
        }

        public SetMatrixAt(index: number, matrix: Mathf.Matrix4) {
            let slot = this.instances[index];
            if (!slot) {
                slot = { matrix: new Mathf.Matrix4(), position: new Mathf.Vector3(), lodIndex: -1 };
                this.instances[index] = slot;
            }
            slot.matrix.copy(matrix);
            slot.position.setFromMatrixPosition(matrix);
        }

        public Update() {
            if (!this.enabled || this.lodLevels.length === 0) return;
            const camera = Components.Camera.mainCamera;
            if (!camera) return;

            this.cameraPosition.copy(camera.transform.position);
            for (const level of this.lodLevels) {
                level.cursor = 0;
                level.mesh.ResetInstances();
            }

            for (const slot of this.instances) {
                if (!slot) continue;
                const distanceSq = slot.position.distanceToSquared(this.cameraPosition);
                const target = this.selectLOD(distanceSq, slot.lodIndex);
                slot.lodIndex = target;
                const level = this.lodLevels[target];
                level.mesh.SetMatrixAt(level.cursor++, slot.matrix);
            }
        }

        private selectLOD(distanceSq: number, previousLOD: number): number {
            if (previousLOD >= 0) {
                const level = this.lodLevels[previousLOD];
                const near = Math.max(0, level.minDistance - this.hysteresis);
                const far = Number.isFinite(level.maxDistance)
                    ? level.maxDistance + this.hysteresis
                    : Number.POSITIVE_INFINITY;
                const nearSq = near * near;
                const farSq = Number.isFinite(far) ? far * far : Number.POSITIVE_INFINITY;
                if (distanceSq >= nearSq && distanceSq < farSq) return previousLOD;
            }
            for (let i = 0; i < this.lodLevels.length; i++) {
                if (distanceSq < this.lodLevels[i].maxDistanceSq) return i;
            }
            return this.lodLevels.length - 1;
        }

        private recalculateRanges() {
            this.lodLevels.sort((a, b) => a.maxDistance - b.maxDistance);
            let previousMax = 0;
            for (const level of this.lodLevels) {
                level.minDistance = previousMax;
                level.minDistanceSq = level.minDistance * level.minDistance;
                level.maxDistanceSq = Number.isFinite(level.maxDistance)
                    ? level.maxDistance * level.maxDistance
                    : Number.POSITIVE_INFINITY;
                previousMax = level.maxDistance;
            }
        }
    }

    const lodTrees = terrainGameObject.AddComponent(InstancedLODGroup);
    lodTrees.hysteresis = 15;

    const mat = new PBRMaterial({doubleSided: true});
    lodTrees.AddLevel({ geometry: Geometry.Sphere(), material: mat, maxDistance: 10 });
    lodTrees.AddLevel({ geometry: Geometry.Cube(), material: mat, maxDistance: 20 });
    lodTrees.AddLevel({ geometry: Geometry.Plane(), material: mat }); // catches everything beyond 120m


    {
        const p = new Mathf.Vector3();
        const r = new Mathf.Vector3();
        const _q = new Mathf.Quaternion();
        const s = new Mathf.Vector3(1, 1, 1);
        const m = new Mathf.Matrix4();
        const center = playerGameObject.transform.position;
    
        let index = 0;
        let c = 1000;
        for (let i = 0; i < c; i++) {
            const angle = i / c * Math.PI * 2;
            // const radius = Mathf.RandomRange(20, 1000);
            const radius = Mathf.RandomRange(0, 100);
    
            const x = center.x + Mathf.Cos(angle) * radius;
            const z = center.z + Mathf.Sin(angle) * radius;
    
            p.set(x, 0, z);
            terrain.SampleHeight(p);
            p.y += 0.5;
            // p.y *= Mathf.RandomRange(0.95, 1.0);
            // r.set(0, Mathf.RandomRange(0, 360), 0);
            // r.set(0,90,0);
    
            // if (p.y > 20) { // Dont place on water
                _q.setFromEuler(r, true);
                m.compose(p, _q, s);
                lodTrees.SetMatrixAt(i, m);
                index++;
            // }
        }
    }




    // Water
    {
        const scale = 1000;
        const waterGameObject = new GameObject(scene);
        waterGameObject.transform.scale.set(scale, scale, 1);
        waterGameObject.transform.eulerAngles.x = -90;
        waterGameObject.transform.position.y = 18;
        const water = waterGameObject.AddComponent(Water);
        // water.settings.set("sampler_scale", [1 / scale, 1 / scale, 0, 0]);
        // water.settings.set("uv_sampler_scale", [1 / scale, 1 / scale, 0, 0]);

        const invScale = 1 / scale;


        //   const rescaleWave = name => {
        //     const wave = water.settings.get(name);
        //     water.settings.set(name, [wave[0], wave[1], wave[2] * invScale, wave[3] * invScale]);
        //   };
        //   ["wave_a", "wave_b", "wave_c"].forEach(rescaleWave);

        //   water.settings.set("wave_speed", [water.settings.get("wave_speed")[0] * invScale, 0, 0, 0]);
        //   water.settings.set("sampler_direction", [
        //     water.settings.get("sampler_direction")[0] * invScale,
        //     water.settings.get("sampler_direction")[1] * invScale,
        //     0,
        //     0,
        //   ]);

        water.settings.set("sampler_scale", [invScale, invScale, 0, 0]);
        water.settings.set("uv_sampler_scale", [invScale, invScale, 0, 0]);

        // Debug
        const container = document.createElement("div");
        container.classList.add("stats-panel");
        document.body.append(container);

        const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
        new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], value => water.settings.set("wave_speed", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Depth offset:", -1, 1, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], value => water.settings.set("refraction", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], value => water.settings.set("foam_level", [value, 0, 0, 0]));
        new UIColorStat(waterSettingsFolder, "Color deep:", new Mathf.Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
            const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
            water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
        });
        new UIColorStat(waterSettingsFolder, "Color shallow:", new Mathf.Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
            const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
            water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
        });

        const wave_a = water.settings.get("wave_a");
        new UIVecStat(waterSettingsFolder, "Wave A:",
            { value: wave_a[0], min: -1, max: 1, step: 0.01 },
            { value: wave_a[1], min: -1, max: 1, step: 0.01 },
            { value: wave_a[2], min: -1, max: 1, step: 0.01 },
            { value: wave_a[3], min: -1, max: 1, step: 0.01 },
            value => {
                water.settings.set("wave_a", [value.x, value.y, value.z, value.w])
            }
        )

        const wave_b = water.settings.get("wave_b");
        new UIVecStat(waterSettingsFolder, "Wave B:",
            { value: wave_b[0], min: -1, max: 1, step: 0.01 },
            { value: wave_b[1], min: -1, max: 1, step: 0.01 },
            { value: wave_b[2], min: -1, max: 1, step: 0.01 },
            { value: wave_b[3], min: -1, max: 1, step: 0.01 },
            value => {
                water.settings.set("wave_b", [value.x, value.y, value.z, value.w])
            }
        )

        const wave_c = water.settings.get("wave_c");
        new UIVecStat(waterSettingsFolder, "Wave C:",
            { value: wave_c[0], min: -1, max: 1, step: 0.01 },
            { value: wave_c[1], min: -1, max: 1, step: 0.01 },
            { value: wave_c[2], min: -1, max: 1, step: 0.01 },
            { value: wave_c[3], min: -1, max: 1, step: 0.01 },
            value => {
                water.settings.set("wave_c", [value.x, value.y, value.z, value.w])
            }
        )

        const sampler_scale = water.settings.get("sampler_scale");
        new UIVecStat(waterSettingsFolder, "Sample scale:",
            { value: sampler_scale[0], min: -5, max: 5, step: 0.01 },
            { value: sampler_scale[1], min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            value => {
                water.settings.set("sampler_scale", [value.x, value.y, 0.0, 0.0])
            }
        )

        const sampler_direction = water.settings.get("sampler_direction");
        new UIVecStat(waterSettingsFolder, "Sample direction:",
            { value: sampler_direction[0], min: -5, max: 5, step: 0.01 },
            { value: sampler_direction[1], min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            undefined,
            value => {
                water.settings.set("sampler_direction", [value.x, value.y, 0.0, 0.0])
            }
        )

        const uv_sampler_scale = water.settings.get("uv_sampler_scale");
        new UIVecStat(waterSettingsFolder, "UV Sampler scale:",
            { value: uv_sampler_scale[0], min: -5, max: 5, step: 0.01 },
            { value: uv_sampler_scale[1], min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            undefined,
            value => {
                water.settings.set("uv_sampler_scale", [value.x, value.y, 0.0, 0.0])
            }
        )

        const uv_sampler_strength = water.settings.get("uv_sampler_strength");
        new UIVecStat(waterSettingsFolder, "UV Sampler strength:",
            { value: uv_sampler_strength[0], min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            { value: 0, min: -5, max: 5, step: 0.01 },
            undefined,
            value => {
                water.settings.set("uv_sampler_strength", [value.x, 0, 0.0, 0.0])
            }
        )

        // sampler_scale: [0.25, 0.25, 0.0, 0.0],
        // sampler_direction: [0.05, 0.04, 0.0, 0.0],

        // uv_sampler_scale: [0.25, 0.25, 0.0, 0.0],
        // uv_sampler_strength: [0.04, 0.0, 0.0, 0.0],

        waterSettingsFolder.Open();
    }

    Console.getVar("r_exposure").value = -2;
    Console.getVar("r_shadows_csm_splittypepracticallambda").value = 0.99;

    mainCameraGameObject.transform.position.set(0, 0, 500);
    const controls = new OrbitControls(GPU.Renderer.canvas, camera);


    // const physicsDebuggerGO = new GameObject(scene);
    // physicsDebuggerGO.AddComponent(PhysicsDebugger);

    // const postProcessing = new PostProcessingPass();
    // postProcessing.effects.push(new PostProcessingFog());
    // scene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.AfterLighting);

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));