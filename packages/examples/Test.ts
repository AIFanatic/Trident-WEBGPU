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
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { MeshletMesh } from "@trident/plugins/meshlets/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
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
    light.intensity = 2


    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();
    // const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    // const skyTexture = await HDRParser.ToCubemap(hdr);

    const skycubemap = skyAtmosphere.skyTextureCubemap;

    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

    iblLightingPass.SetEnvironment(skycubemap);
    skyboxPass.SetSkybox(skycubemap);

    {
        setInterval(() => {
            const radius = 1; // distance of the directional light from origin
            const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
            const azimuthRad = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

            // Convert spherical coordinates to 3D position
            const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
            const y = radius * Mathf.Sin(elevationRad);
            const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

            const sunPos = new Mathf.Vector3(x, y, z);

            lightGameObject.transform.position = sunPos;
            lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

            skyAtmosphere.Update();
            iblLightingPass.SetEnvironment(skyAtmosphere.skyTextureCubemap);
            skyboxPass.SetSkybox(skyAtmosphere.skyTextureCubemap);
        }, 1000);
        const skySettings = new UIFolder(Debugger.ui, "Sky");

        new UISliderStat(skySettings, "SUN_ELEVATION_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_ELEVATION_DEGREES, value => skyAtmosphere.SUN_ELEVATION_DEGREES = value);
        new UISliderStat(skySettings, "SUN_AZIMUTH_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_AZIMUTH_DEGREES, value => skyAtmosphere.SUN_AZIMUTH_DEGREES = value);
        new UISliderStat(skySettings, "EYE_ALTITUDE:", 0, 1000, 0.01, skyAtmosphere.EYE_ALTITUDE, value => skyAtmosphere.EYE_ALTITUDE = value);

        // const o0 = new UITextureViewer(skySettings, "Sky output0:", skyAtmosphere.transmittanceLUT);
        // const o1 = new UITextureViewer(skySettings, "Sky output1:", skyTexture);

        skySettings.Open();
    }


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
        terrain.material.terrainLayers = [
            // CLIFF
            await PBR({ albedoURL: `${base}/Marble_Cliff_03/marble_cliff_03_diff_2k.jpg`, normalURL: `${base}/Marble_Cliff_03/marble_cliff_03_nor_gl_2k.jpg`, armURL: `${base}/Marble_Cliff_03/marble_cliff_03_arm_2k.jpg` }),
            // DIRT
            await PBR({ albedoURL: `${base}/Dirt/dirt_diff_2k.jpg`, normalURL: `${base}/Dirt/dirt_nor_gl_2k.jpg`, armURL: `${base}/Dirt/dirt_arm_2k.jpg` }),
            // GRASS
            await PBR({ albedoURL: `${base}/Leafy_Grass/leafy_grass_diff_2k.jpg`, normalURL: `${base}/Leafy_Grass/leafy_grass_nor_gl_2k.jpg`, armURL: `${base}/Leafy_Grass/leafy_grass_arm_2k.jpg` }),
            // SNOW
            await PBR({ albedoURL: `${base}/Snow_02/snow_02_diff_2k.jpg`, normalURL: `${base}/Snow_02/snow_02_nor_gl_2k.jpg`, armURL: `${base}/Snow_02/snow_02_arm_2k.jpg` }),
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

    // Drag and drop models
    {
        // TODO: Should be added automatically from plugin
        Runtime.Renderer.RenderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);

        function AddMeshlet(geometry: Geometry, material: PBRMaterial): MeshletMesh {
            const meshletGameObject = new GameObject();
            const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
            meshletMesh.enableShadows = false;
            meshletMesh.geometry = geometry;
            meshletMesh.material = material;
            return meshletMesh;


            // const c = 100;
            // // const off = 10;
            // // for (let x = 0; x < c; x++) {
            // //     for (let y = 0; y < c; y++) {
            // //         for (let z = 0; z < c; z++) {
            // //             const go2 = new GameObject();
            // //             const meshletB = go2.AddComponent(MeshletMesh);
            // //             meshletB.geometry = geometry;
            // //             meshletB.transform.position.set(x * off,y * off,z * off);
            // //             meshletB.material = material;
            // //         }
            // //     }
            // // }

            // for (let i = 0; i < c; i++) {
            //     const position = new Mathf.Vector3(Math.random() * terrain.terrainData.size.x, 0, Math.random() * terrain.terrainData.size.z);
            //     terrain.SampleHeight(position);
            //     console.log(position)

            //     const go2 = new GameObject();
            //     const meshletB = go2.AddComponent(MeshletMesh);
            //     meshletB.geometry = geometry;
            //     meshletB.transform.position.copy(position);
            //     meshletB.transform.scale.set(10, 10, 10)
            //     meshletB.material = material;
            // }
        }

        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (e) => {
            e.preventDefault();

            if (!e.dataTransfer) return;

            const file = e.dataTransfer.files[0];
            const extension = file.name.slice(file.name.lastIndexOf(".")+1);
            const url = URL.createObjectURL(file);

            console.log(`Loading ${file.name}`);

            if (extension === "obj") {
                const mesh = await OBJLoaderIndexed.load(url);
                mesh.geometry.ComputeNormals();
                mesh.geometry.ComputeTangents();
                const mat = new PBRMaterial({ albedoMap: await GPU.Texture.Load("./assets/textures/T_OmniDebugTexture_COL.jpg") })
                
                AddMeshlet(mesh.geometry, mat);
            }
            else if (extension === "glb") {
                const gameObject = await GLTFLoader.Load(url, scene, "glb");
                const meshes = gameObject.GetComponentsInChildren(Components.Mesh);

                const c = 1000;
                const thx = terrain.terrainData.size.x * 0.5;
                const thz = terrain.terrainData.size.z * 0.5;

                for (let i = 0; i < c; i++) {
                    const position = new Mathf.Vector3(Math.random() * terrain.terrainData.size.x - thx, 0, Math.random() * terrain.terrainData.size.z - thz);
                    terrain.SampleHeight(position);

                    for (const mesh of meshes) {
                        const meshlet = AddMeshlet(mesh.geometry, mesh.material as PBRMaterial);
                        meshlet.transform.position.copy(position);
                        meshlet.transform.scale.set(10, 10, 10);
                    }
                }
                

                gameObject.Destroy();
            }

        });
    }




    // const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
    // new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
    // new UISliderStat(waterSettingsFolder, "Depth offset:", -10, 0, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));

    // const wireframe = new WireframePass();
    // wireframe.color = [1, 1, 1];       // white lines
    // wireframe.enabled = true;           // toggle on/off
    // Runtime.Renderer.RenderPipeline.AddPass(wireframe, GPU.RenderPassOrder.AfterLighting);


    const sphereGameObject = new GameObject();
    sphereGameObject.transform.position.set(0, 30, 0);
    const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Cube();
    sphereMesh.material = new PBRMaterial();

    Debugger.Enable();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);