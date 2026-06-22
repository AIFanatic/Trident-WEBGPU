import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Object3D,
    Runtime,
    PlayerRuntime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { Debugger } from "@trident/plugins/Debugger";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";
import { Sky } from "@trident/plugins/Environment/Sky";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { FoliageMaterial } from "@trident/plugins/FoliageMaterial";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";


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
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0))
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);

        const sky = new Sky();
        sky.SUN_ELEVATION_DEGREES = 60;
        await sky.init();
        const skyTexture = sky.skyTextureCubemap;
        const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
        const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
        iblLightingPass.SetEnvironment(skyTexture);
        skyboxPass.SetSkybox(skyTexture);
    }

    // {
    //     const lightGameObject = new GameObject();
    //     lightGameObject.transform.position.set(-4, 4, -4);
    //     lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0))
    //     const light = lightGameObject.AddComponent(Components.DirectionalLight);
    //     light.intensity = 5;
    //     light.range = 1;
    //     light.color.set(1, 1, 1, 1);
    // }

    // const model = await GLTFLoader.Load("./assets/models/Tree.glb", scene);
    // const loadedGO = await GLTFLoader.Load("/extra/test-assets/nature/treessource/american_beech/american_beech_a.glb", scene);
    
    // {
    //     const loadedGO = await GLTFLoader.Load("./assets/models/bunny.glb", scene);
    //     const loadedMeshes = loadedGO.GetComponentsInChildren(Components.Mesh);
    //     const go = new GameObject();
    //     const bunnyImpostor = go.AddComponent(ImpostorMesh);
    //     await bunnyImpostor.Create(loadedMeshes, 4096, 16);
    //     loadedGO.transform.position.x -= 2;
    //     go.transform.position.x = 2;
    // }
    
    const loadedGO = await GLTFLoader.Load("/extra/SampleProject/GameAssets/Trees/Eucalyptus camaldulensis.glb", scene);
    loadedGO.enabled = false;
    const loadedMeshes = loadedGO.GetComponentsInChildren(Components.Mesh);
    const go = new GameObject();
    const bunnyImpostor = go.AddComponent(ImpostorMesh);
    loadedMeshes[0].material = new FoliageMaterial(loadedMeshes[0].geometry, loadedMeshes[0].material.params.albedoMap, loadedMeshes[0].material.params.normalMap);
    await bunnyImpostor.Create([loadedMeshes[0], loadedMeshes[2]], 4096, 16);
    
    new UITextureViewer(Debugger.ui, "Atlas", bunnyImpostor.atlasAlbedo);
    new UITextureViewer(Debugger.ui, "Atlas2", bunnyImpostor.atlasNormal);
    
    // RT
    {
        const rtGo = new GameObject();
        rtGo.transform.position.x = -20;
        {
            const rtMesh = rtGo.AddComponent(Components.Mesh);
            rtMesh.geometry = loadedMeshes[0].geometry;
            rtMesh.material = loadedMeshes[0].material;
        }
        {
            const rtMesh = rtGo.AddComponent(Components.Mesh);
            rtMesh.geometry = loadedMeshes[2].geometry;
            rtMesh.material = loadedMeshes[2].material;
        }
    }

    // Billboard, created
    {
        const billboardGO = new GameObject();
        const billboard = billboardGO.AddComponent(Billboarder);
        await billboard.Create([loadedMeshes[0], loadedMeshes[2]]);
        billboardGO.transform.position.x = 40;
    }

    // Billboard, original
    {
        const billboardGO = new GameObject();
        const billboard = billboardGO.AddComponent(Components.Mesh);
        billboard.geometry = loadedMeshes[1].geometry;
        billboard.material = loadedMeshes[1].material;
        billboardGO.transform.position.x = 60;
    }

    Debugger.Enable();
};

Application(document.querySelector("canvas"));