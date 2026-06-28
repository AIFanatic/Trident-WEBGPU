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
import { UIFolder, UISliderStat } from "@trident/plugins/ui/UIStats";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);


    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();
    // const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    // const skyTexture = await HDRParser.ToCubemap(hdr);

    const skycubemap = skyAtmosphere.skyTextureCubemap;

    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

    iblLightingPass.SetEnvironment(skycubemap);
    skyboxPass.SetSkybox(skycubemap);
    
    const terrainGameObject = new GameObject();
    const terrain = terrainGameObject.AddComponent(Terrain);
    terrain.terrainData.HeightmapFromTexture(await GPU.Texture.Load("/extra/test-assets/terrain/bora-bora.png", {format: "rgba8unorm", storeSource: true}), true, 0.2);

    // Water
    const waterGameObject = new GameObject();
    waterGameObject.transform.eulerAngles.x = -90;
    waterGameObject.transform.position.y = 20;
    waterGameObject.transform.scale.set(1024, 1024, 1);
    const water = waterGameObject.AddComponent(WaterNoise);
    
    
    const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
    new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
    new UISliderStat(waterSettingsFolder, "Depth offset:", -10, 0, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
    
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