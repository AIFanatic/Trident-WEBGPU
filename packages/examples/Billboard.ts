import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Runtime,
    PlayerRuntime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { Debugger } from "@trident/plugins/Debugger";
import { UITextureViewer, UIVecStat } from "@trident/plugins/ui/UIStats";
import { Sky } from "@trident/plugins/Environment/Sky";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { FoliageMaterial } from "@trident/plugins/FoliageMaterial";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";
import { Dilator } from "@trident/plugins/Impostors/Dilator";
import { MeshBaker } from "@trident/plugins/Impostors/MeshBaker";


// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 500);
    mainCameraGameObject.AddComponent(OrbitControls);


    {
        const lightGameObject = new GameObject();
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 10;
        light.color.set(1, 1, 1, 1);

        // const lightHelper = new GameObject();
        // lightHelper.transform.position.x = 1000;
        // const lightHelperGeometry = lightHelper.AddComponent(Components.Mesh);
        // lightHelperGeometry.geometry = Geometry.Sphere();
        // lightHelperGeometry.material = new PBRMaterial({ unlit: true });
        // lightHelper.transform.position.copy(light.transform.position)

        new UIVecStat(Debugger.ui, "Light position:",
            { min: -100, max: 100, step: 0.1, value: light.transform.position.x },
            { min: -100, max: 100, step: 0.1, value: light.transform.position.y },
            { min: -100, max: 100, step: 0.1, value: light.transform.position.z },
            undefined,
            value => {
                light.transform.position.set(value.x, value.y, value.z);
                // lightHelper.transform.position.set(value.x, value.y, value.z);
                lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
            });


        const sky = new Sky();
        sky.SUN_ELEVATION_DEGREES = 60;
        await sky.init();
        const skyTexture = sky.skyTextureCubemap;
        const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
        const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
        iblLightingPass.SetEnvironment(skyTexture);
        skyboxPass.SetSkybox(skyTexture);
    }

    const sourceGameObject = new GameObject();
    const sourceMesh = sourceGameObject.AddComponent(Components.Mesh);
    sourceMesh.geometry = Geometry.Sphere();
    sourceMesh.material = new PBRMaterial({
        albedoMap: await GPU.Texture.Load("/extra/test-assets/worn-painted-metal-bl/worn-painted-metal_albedo.png", { format: "rgba8unorm-srgb" }),
        normalMap: await GPU.Texture.Load("/extra/test-assets/worn-painted-metal-bl/worn-painted-metal_normal-ogl.png", { format: "rgba8unorm" }),
        armMap: await GPU.Texture.Load("/extra/test-assets/worn-painted-metal-bl/worn-painted-metal_orm.png", { format: "rgba8unorm" }),
        repeat: new Mathf.Vector2(2, 2)
    });
    sourceGameObject.transform.position.x = -2;

    const impostorGameObject = new GameObject();
    impostorGameObject.transform.position.x = 2;
    const impostor = impostorGameObject.AddComponent(ImpostorMesh);
    await impostor.Create([sourceMesh], 8192, 12);

    new UITextureViewer(Debugger.ui, "atlasAlbedo", impostor.atlasAlbedo);
    new UITextureViewer(Debugger.ui, "atlasNormal", impostor.atlasNormal);
    new UITextureViewer(Debugger.ui, "atlasERMO", impostor.atlasERMO);

    // Billboard
    {
        const bbGO = new GameObject();
        const billboarder = bbGO.AddComponent(Billboarder);
        await billboarder.Create([sourceMesh], 2048);
        bbGO.transform.position.x = 4;
    }

    Debugger.Enable();
};

Application(document.querySelector("canvas"));