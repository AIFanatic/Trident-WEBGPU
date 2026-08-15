import { Components, GPU, Mathf, GameObject, Runtime, PlayerRuntime, PBRMaterial, Geometry, EventSystem } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { Sky } from "@trident/plugins/Environment/Sky";
import { FoliageMaterial } from "@trident/plugins/FoliageMaterial";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";

async function Application(canvas: HTMLCanvasElement) {
    
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 10000);


    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(2, 0, 0);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = false;
    light.intensity = 20;

    // const sky = new Sky();
    // await sky.init();
    // const skyTexture = sky.skyTextureCubemap;
    // const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    // const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
    // iblLightingPass.SetEnvironment(skyTexture);
    // skyboxPass.SetSkybox(skyTexture);


    const floorGameObject = new GameObject();
    floorGameObject.transform.scale.set(2000, 2000, 0);
    floorGameObject.transform.eulerAngles.x = -90
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    const rootGO = await GLTFLoader.Load("/extra/SampleProject/GameAssets/Trees/Eucalyptus camaldulensis RT.glb", scene);
    const meshes = rootGO.GetComponentsInChildren(Components.Mesh);
    let mesh = meshes[0];
    const material = mesh.material as PBRMaterial;
    // for (const mesh of meshes) console.log(mesh.material.params.albedoColor)
    mesh.material = new FoliageMaterial({foliageGeometry: mesh.geometry, foliageAlbedo: material.params.albedoMap, foliageNormal: material.params.normalMap });

    // mesh = meshes[1];
    // mesh.material = new FoliageMaterial(mesh.geometry, mesh.material.params.albedoMap, mesh.material.params.normalMap);


    Debugger.Enable();

    console.log("END");
};

Application(document.querySelector("canvas"));