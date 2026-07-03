import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Runtime,
    Geometry,
    PlayerRuntime,
    Prefab,
    Utils,
    Assets,
    Component,
    Serializer,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Terrain } from "@trident/plugins/Terrain/Terrain";
import { Debugger } from "@trident/plugins/Debugger";
import { WireframePass } from "@trident/plugins/WireframePass";
import { Sky } from "@trident/plugins/Environment/Sky";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";

import { WaterV1 } from "@trident/plugins/Water/WaterV1";
import { WaterNoise } from "@trident/plugins/Water/WaterNoise";
import { WaterDynamic } from "@trident/plugins/Water/WaterDynamic";
import { UIFolder, UISliderStat, UITextureViewer } from "@trident/plugins/ui/UIStats";
import { TerrainProcedural } from "@trident/plugins/TerrainProcedural";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { TerrainProceduralProp } from "@trident/plugins/TerrainProceduralProp";
import { LODGroup, LODRenderer } from "@trident/plugins/LOD/LODGroup";
import { InstancedLODGroup } from "@trident/plugins/LOD/InstancedLODGroup";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { FoliageMaterial } from "@trident/plugins/FoliageMaterial";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";
import { InstancedMeshletMesh } from "@trident/plugins/meshlets/InstancedMeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";
import { HDRParser } from "@trident/plugins/HDRParser";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas, 1);
    PlayerRuntime.Renderer.SetResolution({mode: "fixed", width: 1280, height: 720})
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 1000);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const controls = mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 1


    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();
    const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    // const skycubemap = skyAtmosphere.skyTextureCubemap;
    const skycubemap = skyTexture


    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

    iblLightingPass.SetEnvironment(skycubemap);
    skyboxPass.SetSkybox(skycubemap);

    // {
    //     setInterval(() => {
    //         const radius = 1; // distance of the directional light from origin
    //         const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
    //         const azimuthRad = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

    //         // Convert spherical coordinates to 3D position
    //         const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
    //         const y = radius * Mathf.Sin(elevationRad);
    //         const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

    //         const sunPos = new Mathf.Vector3(x, y, z);

    //         lightGameObject.transform.position = sunPos;
    //         lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    //         skyAtmosphere.Update();
    //         iblLightingPass.SetEnvironment(skyAtmosphere.skyTextureCubemap);
    //         skyboxPass.SetSkybox(skyAtmosphere.skyTextureCubemap);
    //     }, 1000);
    //     const skySettings = new UIFolder(Debugger.ui, "Sky");

    //     new UISliderStat(skySettings, "SUN_ELEVATION_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_ELEVATION_DEGREES, value => skyAtmosphere.SUN_ELEVATION_DEGREES = value);
    //     new UISliderStat(skySettings, "SUN_AZIMUTH_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_AZIMUTH_DEGREES, value => skyAtmosphere.SUN_AZIMUTH_DEGREES = value);
    //     new UISliderStat(skySettings, "EYE_ALTITUDE:", 0, 1000, 0.01, skyAtmosphere.EYE_ALTITUDE, value => skyAtmosphere.EYE_ALTITUDE = value);

    //     // const o0 = new UITextureViewer(skySettings, "Sky output0:", skyAtmosphere.transmittanceLUT);
    //     // const o1 = new UITextureViewer(skySettings, "Sky output1:", skyTexture);

    //     skySettings.Open();
    // }


    const terrainGameObject = new GameObject();
    const terrain = terrainGameObject.AddComponent(Terrain);
    terrain.terrainData.Resize(3000, 2000, 3000);
    // terrain.terrainData.HeightmapFromTexture(await GPU.Texture.Load("/extra/test-assets/terrain/bora-bora.png"), true, 0.2);

    async function PBR(params: { albedoColor?: Mathf.Color, albedoURL?: string, normalURL?: string, armURL?: string }) {
        return {
            albedoColor: params.albedoColor ?? new Mathf.Color(1, 1, 1, 1),
            albedoMap: params.albedoURL ? await GPU.Texture.Load(params.albedoURL, { format: "rgba8unorm-srgb" }) : undefined,
            normalMap: params.normalURL ? await GPU.Texture.Load(params.normalURL, { format: "rgba8unorm" }) : undefined,
            armMap: params.armURL ? await GPU.Texture.Load(params.armURL, { format: "rgba8unorm" }) : undefined,
            // transform: [10, 10, 1, 1]
        }
    }

    const shadow = await GLTFLoader.Load("./assets/models/Shadow.glb", scene);
    // gameObject.transform.position.y = 300;
    controls.center.copy(shadow.transform.position)
    {
        const blankAlbedo = GPU.RenderTexture.Create(1, 1, 1, "bgra8unorm");
        blankAlbedo.SetData(new Uint8Array([255, 255, 255, 255]), 4);

        const base = "/extra/SampleProject/Nature/Terrain"
        const base2 = "/extra/SampleProject/NatureManufacture Assets/Forest Environment Dynamic Nature/Ground/M_ground_beech_forest_leaves_01"

        terrain.material.terrainLayers = [
            // CLIFF
            await PBR({ albedoURL: `${base}/Marble_Cliff_03/marble_cliff_03_diff_2k.jpg`, normalURL: `${base}/Marble_Cliff_03/marble_cliff_03_nor_gl_2k.jpg`, armURL: `${base}/Marble_Cliff_03/marble_cliff_03_arm_2k.jpg` }),
            // DIRT
            await PBR({ albedoURL: `${base}/Dirt/dirt_diff_2k.jpg`, normalURL: `${base}/Dirt/dirt_nor_gl_2k.jpg`, armURL: `${base}/Dirt/dirt_arm_2k.jpg` }),
            // GRASS
            await PBR({ albedoURL: `${base}/Leafy_Grass/leafy_grass_diff_2k.jpg`, normalURL: `${base}/Leafy_Grass/leafy_grass_nor_gl_2k.jpg`, armURL: `${base}/Leafy_Grass/leafy_grass_arm_2k.jpg` }),
            // SNOW
            await PBR({ albedoURL: `${base2}/T_ground_beech_forest_leaves_01_BC_SM.png`, normalURL: `${base2}/T_ground_beech_forest_leaves_01_N.png`, armURL: `${base2}/T_ground_beech_forest_leaves_01_MT_AO_H_SM_orm.png` }),
            // Sand
            await PBR({ albedoURL: `${base}/Sand_03/sand_03_diff_2k.jpg`, normalURL: `${base}/Sand_03/sand_03_nor_gl_2k.jpg`, armURL: `${base}/Sand_03/sand_03_arm_2k.jpg` }),
            // Water
            await PBR({ albedoURL: `${base}/Coral_Ground_02/coral_ground_02_diff_2k.jpg`, normalURL: `${base}/Coral_Ground_02/coral_ground_02_nor_gl_2k.jpg`, armURL: `${base}/Coral_Ground_02/coral_ground_02_arm_2k.jpg` }),


            // {name: "LAYER_OCEAN_COLOR", albedoColor: new Mathf.Color(0.02, 0.10, 0.22)},
            // {name: "LAYER_BEACH_COLOR", albedoColor: new Mathf.Color(0.82, 0.74, 0.52)},

            // {name: "LAYER_SCORCHED_COLOR", albedoColor: new Mathf.Color(0.35, 0.33, 0.32)},
            // {name: "LAYER_BARE_COLOR", albedoColor: new Mathf.Color(0.48, 0.43, 0.38)},
            // {name: "LAYER_TUNDRA_COLOR", albedoColor: new Mathf.Color(0.62, 0.66, 0.58)},
            // {name: "LAYER_SNOW_COLOR", albedoColor: new Mathf.Color(0.92, 0.92, 0.88)},

            // {name: "LAYER_TEMPERATE_DESERT_COLOR", albedoColor: new Mathf.Color(0.76, 0.66, 0.42)},
            // {name: "LAYER_SHRUBLAND_COLOR", albedoColor: new Mathf.Color(0.50, 0.56, 0.34)},
            // {name: "LAYER_TAIGA_COLOR", albedoColor: new Mathf.Color(0.28, 0.42, 0.34)},

            // {name: "LAYER_GRASSLAND_COLOR", albedoColor: new Mathf.Color(0.46, 0.62, 0.28)},
            // {name: "LAYER_TEMPERATE_DECIDUOUS_FOREST_COLOR", albedoColor: new Mathf.Color(0.22, 0.46, 0.20)},
            // {name: "LAYER_TEMPERATE_RAIN_FOREST_COLOR", albedoColor: new Mathf.Color(0.16, 0.36, 0.18)},

            // {name: "LAYER_SUBTROPICAL_DESERT_COLOR", albedoColor: new Mathf.Color(0.86, 0.72, 0.36)},
            // {name: "LAYER_TROPICAL_SEASONAL_FOREST_COLOR", albedoColor: new Mathf.Color(0.18, 0.50, 0.16)},
            // {name: "LAYER_TROPICAL_RAIN_FOREST_COLOR", albedoColor: new Mathf.Color(0.06, 0.32, 0.10)},


            // { name: "LAYER_OCEAN", albedoColor: new Mathf.Color(0.02, 0.10, 0.22, 0.0) },
            // { name: "LAYER_BEACH", albedoColor: new Mathf.Color(0.63, 0.56, 0.47, 1.0) },
            // { name: "LAYER_DESERT", albedoColor: new Mathf.Color(0.80, 0.75, 0.55, 2.0) },
            // { name: "LAYER_GRASSLAND", albedoColor: new Mathf.Color(0.53, 0.67, 0.33, 3.0) },
            // { name: "LAYER_FOREST", albedoColor: new Mathf.Color(0.40, 0.58, 0.35, 4.0) },
            // { name: "LAYER_RAINFOREST", albedoColor: new Mathf.Color(0.20, 0.47, 0.33, 5.0) },
            // { name: "LAYER_ROCK", albedoColor: new Mathf.Color(0.45, 0.45, 0.45, 6.0) },
            // { name: "LAYER_TUNDRA", albedoColor: new Mathf.Color(0.73, 0.73, 0.67, 7.0) },
            // { name: "LAYER_SNOW", albedoColor: new Mathf.Color(1.00, 1.00, 1.00, 8.0) },
        ]

        const terrainGameObject = new GameObject();
        const terrainProcedural = terrainGameObject.AddComponent(TerrainProcedural);
        terrainProcedural.params.RESOLUTION = 2048
        terrainProcedural.terrain = terrain;
        await terrainProcedural.Generate();

        const materialIdMapDebug = new UITextureViewer(Debugger.ui, "MaterialID", terrainProcedural.materialIdMap);

        // Props - RT mesh and RT impostor
        {
            Component.Registry.set(LODGroup.type, LODGroup);

            const PrefabFromGameObject = (go: GameObject): Prefab => {
                const data = Serializer.serializeGameObject(go);
                return Prefab.Deserialize(go.assetPath ?? "", data, data);
            }

            const gameObject = new GameObject();
            const lodGroup = gameObject.AddComponent(LODGroup);
            lodGroup.lods.push({ screenSize: 1e9, renderers: [{ geometry: Geometry.Cube(), material: new PBRMaterial() }] });
            const prefab = PrefabFromGameObject(gameObject);
            console.log(prefab)
            await terrain.terrainData.AddProp(prefab, terrain.gameObject);


            
            
            
            const rtGLB = await GLTFLoader.Load("/extra/SampleProject/GameAssets/Trees/Jacaranda mimosifolia RT.glb", scene);
            const rtMeshes = rtGLB.GetComponentsInChildren(Components.Mesh);
            console.log(rtMeshes)
            rtMeshes[0].material = new FoliageMaterial(rtMeshes[0].geometry, rtMeshes[0].material.params.albedoMap, rtMeshes[0].material.params.normalMap)
            rtMeshes[1].material = new FoliageMaterial(rtMeshes[1].geometry, rtMeshes[1].material.params.albedoMap, rtMeshes[1].material.params.normalMap)
            
            const go = new GameObject();
            const ldImpostor = go.AddComponent(ImpostorMesh);
            await ldImpostor.Create([rtMeshes[1], rtMeshes[2]], 4096, 16);

            const lodGameObject = new GameObject();
            const lodInstanceRenderable = lodGameObject.AddComponent(InstancedLODGroup);
            lodInstanceRenderable.enableShadows = false;

            const billboardGO = new GameObject();
            const billboard = billboardGO.AddComponent(Billboarder);
            await billboard.Create([rtMeshes[1], rtMeshes[2]]);
            billboard.material = new FoliageMaterial(billboard.geometry, billboard.albedoTexture, billboard.normalTexture)

            lodInstanceRenderable.lods.push({ renderers: [
                { geometry: rtMeshes[1].geometry, material: rtMeshes[1].material },
                { geometry: rtMeshes[2].geometry, material: rtMeshes[2].material }
            ], screenSize: 0.2 });
            lodInstanceRenderable.lods.push({ renderers: [{ geometry: ldImpostor.geometry, material: ldImpostor.material }], screenSize: 0.0 }); // Created impostor
            // lodInstanceRenderable.lods.push({ renderers: [{ geometry: rtMeshes[0].geometry, material: rtMeshes[0].material }], screenSize: 0.0 }); // Original billboard
            // lodInstanceRenderable.lods.push({ renderers: [{ geometry: billboard.geometry, material: billboard.material }], screenSize: 0.0 }); // Created billboard

            terrain.terrainData.paintPropData[0].instancedLODGroup = lodInstanceRenderable;
        }


        // // Props - LD Meshlets
        // {
        //     function MakeInstanced(instancedMesh: Components.InstancedMesh, rotation?: Mathf.Quaternion, scale?: Mathf.Vector3) {
        //         const p = new Mathf.Vector3();
        //         const q = rotation || new Mathf.Quaternion();
        //         const s = scale || new Mathf.Vector3(1, 1, 1);
        //         const m = new Mathf.Matrix4();
        //         const c = 10;
        //         const off = 100;
        //         const half = c * off * 0.5;
        //         let i = 0;
        //         const matrices = new Float32Array(c * c * c * 16);
        //         for (let x = 0; x < c; x++) {
        //             for (let y = 0; y < c; y++) {
        //                 for (let z = 0; z < c; z++) {
        //                     p.set(x * off - half, y * off - half, z * off - half);
        //                     terrain.SampleHeight(p);
        //                     m.compose(p, q, s);
        //                     // instancedMesh.SetMatrixAt(i, m);
        //                     matrices.set(m.elements, i * 16);
        //                     i++;
        //                 }
        //             }
        //         }
        //         console.log(i)
        //         instancedMesh.SetMatricesBulk(matrices);
        //     }
            
        //     const ldGLB = await GLTFLoader.Load("/extra/SampleProject/GameAssets/Trees/Eucalyptus camaldulensis_LD_Clean.glb", scene);
        //     var ldMeshes = ldGLB.GetComponentsInChildren(Components.Mesh);
        //     ldMeshes = [ldMeshes[1]]

        //     for (const mesh of ldMeshes) {
        //         const go = new GameObject();
        //         const meshletInstanced = go.AddComponent(InstancedMeshletMesh);
        //         meshletInstanced.geometry = mesh.geometry;
        //         meshletInstanced.material = mesh.material;

        //         MakeInstanced(meshletInstanced)
        //     }

        //     Runtime.Renderer.RenderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
        // }

        const terrainProceduralProp = terrainGameObject.AddComponent(TerrainProceduralProp);
        terrainProceduralProp.terrain = terrain;
        await terrainProceduralProp.Generate(terrainProcedural.terrainTexture, terrainProcedural.materialIdMap);

        const updateTerrainParam = async (param: string, value: number) => {
            terrainProcedural.params[param] = value;
            await terrainProcedural.Generate();
            await materialIdMapDebug.Update();
        }
        const terrainSettings = new UIFolder(Debugger.ui, "Terrain settings");
        terrainSettings.Open();
        new UISliderStat(terrainSettings, "SEED:", 0, 10000, 1, terrainProcedural.params.SEED, async value => { updateTerrainParam("SEED", value) });
        new UISliderStat(terrainSettings, "EROSION_SCALE:", 0, 1, 0.01, terrainProcedural.params.EROSION_SCALE, async value => { updateTerrainParam("EROSION_SCALE", value) });
        new UISliderStat(terrainSettings, "EROSION_STRENGTH:", 0, 1, 0.01, terrainProcedural.params.EROSION_STRENGTH, async value => { updateTerrainParam("EROSION_STRENGTH", value) });
        new UISliderStat(terrainSettings, "EROSION_SLOPE_POWER:", 0, 1, 0.01, terrainProcedural.params.EROSION_SLOPE_POWER, async value => { updateTerrainParam("EROSION_SLOPE_POWER", value) });
        new UISliderStat(terrainSettings, "EROSION_CELL_SCALE:", 0, 2, 0.01, terrainProcedural.params.EROSION_CELL_SCALE, async value => { updateTerrainParam("EROSION_CELL_SCALE", value) });
        new UISliderStat(terrainSettings, "EROSION_HEIGHT_OFFSET:", -1, 1, 0.01, terrainProcedural.params.EROSION_HEIGHT_OFFSET, async value => { updateTerrainParam("EROSION_HEIGHT_OFFSET", value) });
        new UISliderStat(terrainSettings, "EROSION_OCTAVES:", 0, 10, 1, terrainProcedural.params.EROSION_OCTAVES, async value => { updateTerrainParam("EROSION_OCTAVES", value) });
        new UISliderStat(terrainSettings, "EROSION_GAIN:", 0, 1, 0.01, terrainProcedural.params.EROSION_GAIN, async value => { updateTerrainParam("EROSION_GAIN", value) });
        new UISliderStat(terrainSettings, "EROSION_LACUNARITY:", 0, 10, 0.1, terrainProcedural.params.EROSION_LACUNARITY, async value => { updateTerrainParam("EROSION_LACUNARITY", value) });
        new UISliderStat(terrainSettings, "HEIGHT_TILES:", 0, 10, 0.1, terrainProcedural.params.HEIGHT_TILES, async value => { updateTerrainParam("HEIGHT_TILES", value) });
        new UISliderStat(terrainSettings, "HEIGHT_OCTAVES:", 0, 10, 1, terrainProcedural.params.HEIGHT_OCTAVES, async value => { updateTerrainParam("HEIGHT_OCTAVES", value) });
        new UISliderStat(terrainSettings, "HEIGHT_AMP:", 0, 1, 0.01, terrainProcedural.params.HEIGHT_AMP, async value => { updateTerrainParam("HEIGHT_AMP", value) });
        new UISliderStat(terrainSettings, "HEIGHT_GAIN:", 0, 1, 0.01, terrainProcedural.params.HEIGHT_GAIN, async value => { updateTerrainParam("HEIGHT_GAIN", value) });
        new UISliderStat(terrainSettings, "HEIGHT_LACUNARITY:", 0, 10, 0.1, terrainProcedural.params.HEIGHT_LACUNARITY, async value => { updateTerrainParam("HEIGHT_LACUNARITY", value) });
        new UISliderStat(terrainSettings, "WATER_HEIGHT:", 0, 1, 0.01, terrainProcedural.params.WATER_HEIGHT, async value => { updateTerrainParam("WATER_HEIGHT", value) });
        new UISliderStat(terrainSettings, "SCROLL_X:", -10, 10, 0.01, terrainProcedural.params.TERRAIN_SCROLL_X, async value => { updateTerrainParam("TERRAIN_SCROLL_X", value) });
        new UISliderStat(terrainSettings, "SCROLL_Y:", -10, 10, 0.01, terrainProcedural.params.TERRAIN_SCROLL_Y, async value => { updateTerrainParam("TERRAIN_SCROLL_Y", value) });
        new UISliderStat(terrainSettings, "IS_ISLAND:", 0, 1, 1, terrainProcedural.params.IS_ISLAND, async value => { updateTerrainParam("IS_ISLAND", value) });

        // Water
        const waterGameObject = new GameObject();
        waterGameObject.transform.eulerAngles.x = -90;
        // waterGameObject.transform.position.y = 280;
        waterGameObject.transform.scale.set(terrain.terrainData.size.x, terrain.terrainData.size.z, 1);
        const water = waterGameObject.AddComponent(WaterNoise);

        setInterval(() => {
            const ty = terrain.terrainData.size.y;
            waterGameObject.transform.position.y = terrainProcedural.params.WATER_HEIGHT * ty;
            waterGameObject.transform.position.y -= ty * 0.5;

            terrain.SampleHeight(shadow.transform.position);
            // controls.center.copy(shadow.transform.position)
        }, 1000);
    }




    // const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
    // new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
    // new UISliderStat(waterSettingsFolder, "Depth offset:", -10, 0, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));

    // const wireframe = new WireframePass();
    // wireframe.color = [1, 1, 1];       // white lines
    // wireframe.enabled = true;           // toggle on/off
    // Runtime.Renderer.RenderPipeline.AddPass(wireframe, GPU.RenderPassOrder.AfterLighting);

    // const postProcessing = new PostProcessingPass();
    // const smaa = new PostProcessingSMAA();
    // postProcessing.effects.push(smaa);
    // Runtime.Renderer.RenderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);


    const sphereGameObject = new GameObject();
    sphereGameObject.transform.position.set(0, 30, 0);
    const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Cube();
    sphereMesh.material = new PBRMaterial();

    Debugger.Enable();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);