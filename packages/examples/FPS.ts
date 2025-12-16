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
    light.color.set(1.0, 0.96, 0.88, 1);
    light.intensity = 10;

    new UIColorStat(Debugger.ui, "Light Color:", light.color.toHex(), value => {
        light.color.setFromHex(value);
    })

    setInterval(() => {
        const radius = 1; // distance of the directional light from origin
        const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
        const azimuthRad   = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

        // Convert spherical coordinates to 3D position
        const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
        const y = radius * Mathf.Sin(elevationRad);
        const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

        const sunPos = new Mathf.Vector3(x, y, z);

        lightGameObject.transform.position = sunPos;
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0,0,0));
    }, 100);

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
    console.log(terrain)
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
    const skyTexture = skyAtmosphere.skyTextureCubemap;

    // const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    // const skyTexture = await HDRParser.ToCubemap(hdr);

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
    boxMesh.geometry = Geometry.Sphere();
    boxMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1) });

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

                // // Updates
                // setInterval(() => {
                //     for (const instance of instances) {
                //         instance.m.decompose(p, r, this.scale);

                //         const dist = this.target.position.distanceTo(p);
                //         if (dist > this.distance) {
                //             // Recycle ONLY in outer ring, e.g. 70%–100% of max radius
                //             const inner = this.distance * 0.7;
                //             const outer = this.distance;

                //             const mat = calculateNewPosition(this.target.position, inner, outer);
                //             this.SetMatrixAt(instance.i, mat);
                //             instance.m = mat;
                //         }
                //     }
                // }, 1000);
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

    // Trees
    {
        const tree1 = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-01/tree-01.glb");
    
        let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
        traverse([tree1], gameObject => {
            const mesh = gameObject.GetComponent(Components.Mesh);
            if (mesh) {
                const geometrySerialized = mesh.geometry.Serialize();
                const materialSerialized = mesh.material.Serialize();
                console.log(materialSerialized.params.roughness, materialSerialized.params.metalness)
                materialSerialized.params.roughness = 1.0
                materialSerialized.params.metalness = 0.0;
                const materialClone = GPU.Material.Deserialize(materialSerialized);
                const geometryClone = new Geometry();
                geometryClone.Deserialize(geometrySerialized);
    
                lodGroupEntries.push({ geometry: geometryClone, material: materialClone });
            }
        })
        tree1.Destroy();
    
        console.log(lodGroupEntries)
    
        const lodGameObject = new GameObject(scene);
        const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);
        // lodInstanceRenderable.lods.push({ renderers: lodGroupEntries, screenSize: 0 });
        lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 2), screenSize: 0 });
        lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(2, 4), screenSize: 40 });
        lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(4, 6), screenSize: 80 });
        lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(6, 8), screenSize: 200 });
    
        const p = new Mathf.Vector3();
        const r = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3(1, 1, 1);
        const m = new Mathf.Matrix4();
    
        const c = 50000;
        const off = 500;
    
        const c2 = 20;
    
        const center = playerGameObject.transform.position;
    
        for (let i = 0; i < c; i++) {
    
            const angle = i / c * Math.PI * 2;
            // const radius = Mathf.RandomRange(20, 1000);
            const radius = Mathf.RandomRange(0, 1000);
    
            // const x = center.x + Mathf.Cos(angle) * radius;
            // const z = center.z + Mathf.Sin(angle) * radius;
    
            const x = Mathf.RandomRange(-off, off);
            const z = Mathf.RandomRange(-off, off);
    
            p.set(x, 0, z);
            terrain.SampleHeight(p);
    
            r.y = Mathf.RandomRange(0, 360);
            q.setFromEuler(r);
            p.y += Mathf.RandomRange(-1, 0);
            m.compose(p, q, s);
    
            if (p.y > 25) {
                lodInstanceRenderable.SetMatrixAt(i, m);
            }
        }
    }

    // Grass
    {
        const tree1 = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-01/grass.glb");
    
        let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
        traverse([tree1], gameObject => {
            const mesh = gameObject.GetComponent(Components.Mesh);
            if (mesh) {
                const geometrySerialized = mesh.geometry.Serialize();
                const materialSerialized = mesh.material.Serialize();
                console.log(materialSerialized.params.roughness, materialSerialized.params.metalness)
                materialSerialized.params.roughness = 1.0
                materialSerialized.params.metalness = 0.0;
                const materialClone = GPU.Material.Deserialize(materialSerialized);
                const geometryClone = new Geometry();
                geometryClone.Deserialize(geometrySerialized);
    
                lodGroupEntries.push({ geometry: geometryClone, material: materialClone });
            }
        })
        tree1.Destroy();
    
        const lodGameObject = new GameObject(scene);
        const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);
        lodInstanceRenderable.lods.push({ renderers: lodGroupEntries, screenSize: 0 });
        // lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 2), screenSize: 0 });
        // lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(2, 4), screenSize: 40 });
        // lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(4, 6), screenSize: 80 });
        // lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(6, 8), screenSize: 200 });
    
        const p = new Mathf.Vector3();
        const r = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3(1, 1, 1);
        const m = new Mathf.Matrix4();
    
        const c = 20000;
        const off = 1000;
    
        const c2 = 20;
    
        const center = playerGameObject.transform.position;
    
        for (let i = 0; i < c; i++) {
    
            const angle = i / c * Math.PI * 2;
            // const radius = Mathf.RandomRange(20, 1000);
            const radius = Mathf.RandomRange(0, 100);
    
            const x = center.x + Mathf.Cos(angle) * radius;
            const z = center.z + Mathf.Sin(angle) * radius;
    
            p.set(x, 0, z);
            terrain.SampleHeight(p);
    
            r.y = Mathf.RandomRange(0, 360);
            q.setFromEuler(r);
            p.y += 0.1;
            m.compose(p, q, s);
    
            if (p.y > 25) {
                lodInstanceRenderable.SetMatrixAt(i, m);
            }
        }
    }




    // Water
    {
        const scale = 1000;
        const waterGameObject = new GameObject(scene);
        waterGameObject.transform.scale.set(scale, scale, 1);
        waterGameObject.transform.eulerAngles.x = -90;
        waterGameObject.transform.position.y = 25;
        const water = waterGameObject.AddComponent(Water);
    }

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


    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));