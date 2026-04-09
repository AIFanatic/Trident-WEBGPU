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
    Runtime,
    Renderer,
    SceneManager,
} from "@trident/core";

import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { TerrainCollider } from "@trident/plugins/PhysicsRapier/colliders/TerrainCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { ThirdPersonController } from "@trident/plugins/PhysicsRapier/ThirdPersonController";
import { FirstPersonController } from "@trident/plugins/PhysicsRapier/FirstPersonController";
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
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { SSS_V2 } from "@trident/plugins/SSS_V2";
import { SSSRenderPass } from "@trident/plugins/SSS";
import { FullscreenQuad } from "@trident/plugins/FullscreenQuad";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 10000);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 4).mul(10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.color.set(1.0, 0.96, 0.88, 1);
    light.intensity = 1;
    light.castShadows = false;

    new UIColorStat(Debugger.ui, "Light Color:", light.color.toHex(), value => {
        light.color.setFromHex(value);
    })

    await Runtime.AddSystem(PhysicsRapier);



    // const terrain = new TerrainBuilder(terrainSize);
    const terrainGameObject = new GameObject(scene);
    const terrain = terrainGameObject.AddComponent(Terrain);
    terrain.width = 4000;
    terrain.length = 4000;
    terrain.height = 1000;
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
        const texture = await GPU.Texture.Load(url, format, {generateMips: true});
        return texture;
    }

    const biomes_splat_map = await GPU.Texture.Load("/extra/test-assets/terrain/heightmaps/biomeids_1024x1024.png");
    biomes_splat_map.GenerateMips();
    terrain.material.layerTexture = biomes_splat_map;

    terrain.material.splatMapTextures = await LoadTerrainTextures([
        "/extra/test-assets/terrain/heightmaps/splatmap_1024x1024.png", //"/extra/test-assets/terrain/heightmaps/splat0_island_1024x1024.png",
    ]);

    let transform = new Float32Array([10, 10, 0, 0]);
    const albedoTexture = await LoadTexture(`/extra/test-assets/terrain/brown_mud_leaves_01/brown_mud_leaves_01_diff_4k.jpg`, "rgba8unorm-srgb");
    const normalTexture = await LoadTexture(`/extra/test-assets/terrain/brown_mud_leaves_01/brown_mud_leaves_01_nor_gl_4k.jpg`, "rgba8unorm");
    const armMap = await LoadTexture(`/extra/test-assets/terrain/brown_mud_leaves_01/brown_mud_leaves_01_arm_4k.jpg`, "rgba8unorm");
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

        light.intensity = sky.SUN_ELEVATION_DEGREES / 20;
        // light.intensity = 0.0001;
    }, 100);

    // const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/spruit_sunrise_1k.hdr");
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
    const sceneGameObject = await GLTFLoader.Load("./assets/models/Shadow.glb", scene);

    let animator: Components.Animator = undefined;
    traverse([sceneGameObject], gameObject => {
        const _animator = gameObject.GetComponent(Components.Animator);
        if (_animator) animator = _animator;
    })

    if (!animator) throw Error("Could not find an animator component");
    console.log(animator)

    const playerGameObject = new GameObject(scene);
    const p = new Mathf.Vector3(20, 0, 185);
    terrain.SampleHeight(p)
    p.y += 1;
    playerGameObject.transform.position.copy(p);
    // playerGameObject.transform.scale.set(0.01, 0.01, 0.01);

    // Weapon
    // const weaponGameObject = await GLTFLoader.Load("/extra/test-assets/ak47u.worldmodel.glb", scene);
    const weaponGameObject = await GLTFLoader.Load("/extra/test-assets/semi_auto_rifle.worldmodel.glb", scene);
    // const weaponGameObject = await GLTFLoader.Load("/extra/test-assets/bouquet.glb", scene);
    weaponGameObject.transform.position.copy(camera.transform.position);
    weaponGameObject.transform.parent = camera.transform;
    // weaponGameObject.transform.localEulerAngles.set(175, 10, 180);
    // weaponGameObject.transform.localPosition.set(0.15, -0.25, -0.3);

    // weaponGameObject.transform.localEulerAngles.set(175, 10 - 90, 180);
    // weaponGameObject.transform.localPosition.set(0.15, -0.10, -0.3);

    weaponGameObject.transform.localEulerAngles.set(195, -80, 180);
    weaponGameObject.transform.localPosition.set(0.95, -0.5, -1.5);

    const playerCollider = playerGameObject.AddComponent(CapsuleCollider);
    const playerRigidbody = playerGameObject.AddComponent(RigidBody);
    playerRigidbody.Create("dynamic");
    playerRigidbody.constraints = RigidbodyConstraints.FreezeRotation;
    // const thirdPersonController = playerGameObject.AddComponent(ThirdPersonController);
    const thirdPersonController = playerGameObject.AddComponent(FirstPersonController);
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







    {
        interface AddLODOptions {
            count: number;
            enableShadows: boolean;
        }
        async function addLOD(url, options: AddLODOptions = {count: 1, enableShadows: false}) {

            const loadedGO = await GLTFLoader.Load(url, scene);

            let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
            const meshes = loadedGO.GetComponentsInChildren(Components.Mesh);
            for (const mesh of meshes) {
                const mat = mesh.material as PBRMaterial;
                const clonedMat = new PBRMaterial({...mat.params, doubleSided: true, alphaCutoff: 0.1});
                lodGroupEntries.push({ geometry: mesh.geometry, material: clonedMat });
            }
            loadedGO.enabled = false;
        
            const lodGameObject = new GameObject(scene);
            const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);
            lodInstanceRenderable.enableShadows = options.enableShadows;
            if (lodGroupEntries.length > 0) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 1), screenSize: 100 });
            if (lodGroupEntries.length > 1) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(1, 2), screenSize: 200 });
            if (lodGroupEntries.length > 2) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(2, 3), screenSize: 500 });
            if (lodGroupEntries.length > 3) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(3, 4), screenSize: 4000 });
            // else if (lodGroupEntries.length >= 1) lodInstanceRenderable.lods.push({ renderers: lodGroupEntries.slice(0, 1), screenSize: 300 });
    
            console.log(lodInstanceRenderable.lods)
        
            const p = new Mathf.Vector3();
            const r = new Mathf.Vector3();
            const q = new Mathf.Quaternion();
            const s = new Mathf.Vector3(1, 1, 1);
            const m = new Mathf.Matrix4();
        
            const off = terrain.width * 0.4;
        
            // let i = 0;
            // for (let x = 0; x < c2; x++) {
            //     for (let z = 0; z < c2; z++) {
            //         p.set(x * off, 0, z * off);
            //         m.compose(p,r,s);
            //         lodInstanceRenderable.SetMatrixAt(i, m);
            //         i++;
            //     }
            // }
            let matrices = new Float32Array(options.count * 16);
            for (let i = 0; i < options.count; i++) {
                p.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
                
                r.y = Mathf.RandomRange(0, 360);
                q.setFromEuler(r);
                terrain.SampleHeight(p);
                m.compose(p, q, s);
                matrices.set(m.elements, i * 16);
                // lodInstanceRenderable.SetMatrixAt(i, m);
            }
            lodInstanceRenderable.SetMatricesBulk(matrices);
        }


        const trees = [
            "./american_beech/american_beech_a_new.glb",

            "./bush_mormon_tea/mormon_tea_d.glb",
            "./bush_mormon_tea/mormon_tea_b.glb",
            "./bush_mormon_tea/mormon_tea_c.glb",
            "./bush_mormon_tea/mormon_tea_a.glb",
            "./bush_ocotillo/ocotillo_a.glb",
            "./bush_ocotillo/ocotillo_c.glb",
            "./bush_ocotillo/ocotillo_b.glb",
            "./bush_ocotillo/ocotillo_d.glb",
            "./bush_ocotillo/ocotillo_dry_d.glb",
            "./bush_ocotillo/ocotillo_dry_c.glb",
            "./bush_ocotillo/ocotillo_dry_b.glb",
            "./bush_ocotillo/ocotillo_dry_a.glb",
            "./oak/oak_e_tundra.glb",
            "./oak/oak_b_tundra.glb",
            "./oak/oak_a_tundra.glb",
            "./oak/oak_e.glb",
            "./oak/oak_f_tundra.glb",
            "./oak/oak_d.glb",
            "./oak/oak_f.glb",
            "./oak/oak_c.glb",
            "./oak/oak_b.glb",
            "./oak/oak_a.glb",
            "./bush_creosote/creosote_bush_dry_a.glb",
            "./bush_creosote/creosote_bush_dry_b.glb",
            "./bush_creosote/creosote_bush_b.glb",
            "./bush_creosote/creosote_bush_c.glb",
            "./bush_creosote/creosote_bush_a.glb",
            "./bush_creosote/creosote_bush_d.glb",
            "./american_beech/american_beech_a.glb",
            "./american_beech/american_beech_c.glb",
            "./american_beech/american_beech_b.glb",
            "./american_beech/american_beech_e.glb",
            "./american_beech/american_beech_d.glb",
            "./american_beech/american_beech_e_dead.glb",
            "./american_beech/american_beech_d_dead.glb",
            "./american_beech/american_beech_a_dead.glb",
            "./pine/pine_sapling_a_snow.glb",
            "./pine/Pine_d_snow.glb",
            "./pine/Pine_b_snow.glb",
            "./pine/Pine_c_snow.glb",
            "./pine/Pine_d.glb",
            "./pine/Pine_a.glb",
            "./pine/Pine_c.glb",
            "./pine/Pine_b.glb",
            "./pine/pine_sapling_b.glb",
            "./pine/pine_sapling_c.glb",
            "./pine/pine_sapling_a.glb",
            "./pine/pine_sapling_d.glb",
            "./pine/pine_sapling_c_snow.glb",
            "./pine/pine_sapling_b_snow.glb",
            "./pine/pine_sapling_e.glb",
            "./pine/pine_sapling_d_snow.glb",
            "./pine/pine_sapling_e_snow.glb",
            "./pine/Pine_a_snow.glb",
            "./swamp_trees/swamp_tree_d.glb",
            "./swamp_trees/swamp_tree_e.glb",
            "./swamp_trees/swamp_tree_f.glb",
            "./swamp_trees/swamp_tree_b.glb",
            "./swamp_trees/swamp_tree_c.glb",
            "./swamp_trees/swamp_tree_a.glb",
            "./swamp_trees/swamp_hero_tree_b.glb",
            "./swamp_trees/swamp_hero_tree_a.glb",
            "./birch/birch_small_temp.glb",
            "./birch/birch_tiny_temp.glb",
            "./birch/birch_big_temp.glb",
            "./birch/birch_medium_tundra.glb",
            "./birch/birch_medium_temp.glb",
            "./birch/birch_tiny_tundra.glb",
            "./birch/birch_large_temp.glb",
            "./birch/birch_large_tundra.glb",
            "./birch/birch_small_tundra.glb",
            "./birch/birch_big_tundra.glb",
            "./douglas_fir/douglas_fir_b_snow.glb",
            "./douglas_fir/douglas_fir_c_snow.glb",
            "./douglas_fir/douglas_fir_d_snow.glb",
            "./douglas_fir/douglas_fir_d.glb",
            "./douglas_fir/douglas_fir_c.glb",
            "./douglas_fir/douglas_fir_a_snow.glb",
            "./douglas_fir/douglas_fir_b.glb",
            "./douglas_fir/douglas_fir_a.glb",
            "./bush_spicebush/bush_spicebush_d.glb",
            "./bush_spicebush/bush_spicebush_b_tundra.glb",
            "./bush_spicebush/bush_spicebush_c.glb",
            "./bush_spicebush/bush_spicebush_b.glb",
            "./bush_spicebush/bush_spicebush_a.glb",
            "./bush_spicebush/bush_spicebush_c_snow.glb",
            "./bush_spicebush/bush_spicebush_c_tundra.glb",
            "./bush_spicebush/bush_spicebush_a_tundra.glb",
            "./bush_spicebush/bush_spicebush_a_snow.glb",
            "./bush_spicebush/bush_spicebush_d_tundra.glb",
            "./palm_trees/palm_tree_small_c.glb",
            "./palm_trees/palm_tree_small_b.glb",
            "./palm_trees/palm_tree_small_a.glb",
            "./palm_trees/palm_tree_tall_b.glb",
            "./palm_trees/palm_tree_tall_a.glb",
            "./palm_trees/palm_tree_short_c.glb",
            "./palm_trees/palm_tree_short_b.glb",
            "./palm_trees/palm_tree_short_a.glb",
            "./palm_trees/palm_tree_short_e.glb",
            "./palm_trees/palm_tree_short_d.glb",
            "./palm_trees/palm_tree_med_b.glb",
            "./palm_trees/palm_tree_med_a.glb",
            "./bush_willow/bush_willow_d.glb",
            "./bush_willow/bush_willow_c.glb",
            "./bush_willow/bush_willow_b.glb",
            "./bush_willow/bush_willow_a.glb",
            "./bush_willow/bush_willow_snow_small_a.glb",
            "./bush_willow/bush_willow_snow_a.glb",
            "./bush_willow/bush_willow_snow_c.glb",
            "./bush_willow/bush_willow_snow_small_b.glb",
            "./bush_willow/bush_willow_snow_b.glb",
            "./bush_willow/bush_willow_snow_d.glb",
        ]
        // addLOD("/extra/test-assets/tree-01/american_beech_a_lod.glb", 2000)
        console.log(trees.length)
        for (let i = 0; i < 50; i++) {
            const name = trees[i];
            if (name.includes("swamp")) continue;
            if (name.includes("tundra")) continue;
            if (name.includes("snow")) continue;
            
            if (!name.includes("Pine_a.glb")) continue;

            console.log("Loading", name)

            addLOD("/extra/test-assets/nature/treessource/" + name, {count: 1000, enableShadows: false})
        }

        // const grassGO = await GLTFLoader.Load("/extra/test-assets/nature/treessource/american_beech/american_beech_a.glb", scene);
        const grassGO = await GLTFLoader.Load("/extra/test-assets/patch_grass_medium.glb", scene);

        let _prefabMeshes: { geometry: Geometry, material: GPU.Material }[] = [];
        const grassMeshes = grassGO.GetComponentsInChildren(Components.Mesh);
        for (const mesh of grassMeshes) {
            const mat = mesh.material as PBRMaterial;
            // mat.params.doubleSided = true;
            // mat.params.alphaCutoff = 0.1;
            // mat.params.roughness = 10.0;

            _prefabMeshes.push({geometry: mesh.geometry, material: new PBRMaterial(mat.params) });
            break;
        }
        grassGO.enabled = false;

        console.log(_prefabMeshes)

        const prefabMesh = _prefabMeshes[_prefabMeshes.length-1];
        console.log(_prefabMeshes)

        {
            const gameObject = new GameObject(scene);
            const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
            instancedMesh.enableShadows = false;
            instancedMesh.geometry = prefabMesh.geometry
            instancedMesh.material = prefabMesh.material;
    
            const count = 10000;
            let p = new Mathf.Vector3();
            let r = new Mathf.Vector3();
            let q = new Mathf.Quaternion();
            let s = new Mathf.Vector3(1,1,1);
            let m = new Mathf.Matrix4();
    
            let matrices: number[] = [];
            const off = terrain.width * 0.4;
            const _p = new Mathf.Vector3();
            const up = new Mathf.Vector3(0,1,0)
            let i = 0;
            for (let i = 0; i < count; i++) {
                p.copy(playerGameObject.transform.position);
                _p.set(Mathf.Cos(i % count) * 0.5, 0, Mathf.Sin(i * count) * 0.5).mul(100);
                p.add(_p);
                terrain.SampleHeight(p);

                const normal = terrain.SampleNormal(p);
                const qAlign = new Mathf.Quaternion().setFromUnitVectors(up, normal);
                const qTwist = new Mathf.Quaternion().setFromAxisAngle(up, Mathf.RandomRange(0, 360));
                q = qAlign.mul(qTwist);

                m.compose(p, q, s);
                matrices.push(...m.elements);


                // p.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
                
                // r.y = Mathf.RandomRange(0, 360);
                // q.setFromEuler(r);
                // terrain.SampleHeight(p);
                // if (p.y > 1000) continue;
                // m.compose(p, q, s);
                // matrices.push(...m.elements);
                // // lodInstanceRenderable.SetMatrixAt(i, m);

                i++;
            }
            instancedMesh.SetMatricesBulk(new Float32Array(matrices));
        }
    }


    // // Tree impostors
    // {
    //     function MakeInstanced(instancedMesh: Components.InstancedMesh, rotation?: Mathf.Quaternion, scale?: Mathf.Vector3) {
    //         const p = new Mathf.Vector3();
    //         const r = new Mathf.Vector3();
    //         const q = new Mathf.Quaternion();
    //         const s = new Mathf.Vector3(1, 1, 1);
    //         const m = new Mathf.Matrix4();
        
    //         const off = terrain.width * 0.4;
        
    //         const count = 500000;
    //         // let matrices = new Float32Array(count * 16);
    //         let matrices: number[] = [];
    //         for (let i = 0; i < count; i++) {
    //             p.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
                
    //             // r.y = Mathf.RandomRange(0, 360);
    //             // q.setFromEuler(r);
    //             terrain.SampleHeight(p);
    //             p.y += 8;
    //             if (p.y > 1000) continue;
    //             m.compose(p, q, s);
    //             // matrices.set(m.elements, i * 16);
    //             matrices.push(...m.elements);
    //             // lodInstanceRenderable.SetMatrixAt(i, m);
    //         }
    //         instancedMesh.SetMatricesBulk(new Float32Array(matrices));
    //     }
        
    //     const treeGO = await GLTFLoader.Load("/extra/test-assets/nature/treessource/american_beech/american_beech_a.glb", scene);

    //     let prefabMesh: { geometry: Geometry, material: PBRMaterial };
    //     const treeMeshes = treeGO.GetComponentsInChildren(Components.Mesh);
    //     for (const mesh of treeMeshes) {
    //         if (prefabMesh) break;
    //         const mat = mesh.material as PBRMaterial;
    //         // mat.doubleSided = false;
    //         // mat.alphaCutoff = 0.1;
    //         // mat.roughness = 10.0;
    //         const matSerialized = mat.Serialize()
    //         console.log("rrr", matSerialized.params.albedoMap)
    //         console.log("rrr", GPU.Material.Deserialize(matSerialized).params.albedoMap)

    //         prefabMesh = { geometry: mesh.geometry, material: mesh.material };
    //     }
    //     treeGO.Destroy();

    //     const radius = 1;
    //     console.log(radius)
    //     const impostorGameObject = new GameObject(scene);
    //     const impostor = impostorGameObject.AddComponent(ImpostorMesh);
    //     await impostor.Create(prefabMesh.geometry, prefabMesh.material);
        
    //     const gameObject = new GameObject(scene);
    //     const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //     instancedMesh.enableShadows = false;
    //     instancedMesh.geometry = impostor.geometry;
    //     instancedMesh.material = impostor.material;


    //     new UITextureViewer(Debugger.ui, "Atlas", impostor.albedoTexture);
    //     new UITextureViewer(Debugger.ui, "Atlas2", impostor.normalTexture);

    //     MakeInstanced(instancedMesh, new Mathf.Quaternion(), new Mathf.Vector3(radius, radius, radius));
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
    Renderer.RenderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);

    new UIButtonStat(Debugger.ui, "Disable SMAA:", async value => {
        smaa.enabled = value;
    });


    new UISliderStat(Debugger.ui, "Exposure:", -4, 4, 0.1, Console.getVar<number>("r_exposure").value, value => Console.getVar("r_exposure").value = value);
    new UISliderStat(Debugger.ui, "Saturation:", -4, 4, 0.1, Console.getVar<number>("r_saturation").value, value => Console.getVar("r_saturation").value = value);
    new UISliderStat(Debugger.ui, "Contrast:", -4, 4, 0.1, Console.getVar<number>("r_contrast").value, value => Console.getVar("r_contrast").value = value);

    Debugger.Enable();


    // Drag and drop models
    {
        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (e) => {
            e.preventDefault();

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            const url = URL.createObjectURL(file);
            const obj = await GLTFLoader.Load(url, scene, "glb");
            
            
            
            const p = playerGameObject.transform.position.clone();
            terrain.SampleHeight(p);
            p.y += 2.5;
            obj.transform.position.copy(p);

            // const normal = terrain.SampleNormal(p);
            // console.log(p)
            // // obj.transform.rotation.setFromUnitVectors(new Mathf.Vector3(0, 1, 0), normal.normalize());
            // const q = new Mathf.Quaternion().setFromUnitVectors(new Mathf.Vector3(0,1,0), normal.normalize());
            // obj.transform.rotation.copy(q);
            // console.log(obj)
        });

        setTimeout(() => {
            terrain.SampleNormal(playerGameObject.transform.position)
        }, 2000);
    }

    // const sss = new SSSRenderPass(light);
    // scene.renderPipeline.AddPass(sss, GPU.RenderPassOrder.AfterLighting);
    // // const sssPass = new SSS(light);
    // // scene.renderPipeline.AddPass(sssPass, GPU.RenderPassOrder.AfterLighting);

    Runtime.Play();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);
