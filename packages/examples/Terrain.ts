import {
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Runtime,
    Geometry,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Terrain } from "@trident/plugins/Terrain/Terrain";
import { Debugger } from "@trident/plugins/Debugger";
import { WireframePass } from "@trident/plugins/WireframePass";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000000);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const terrainGameObject = new GameObject();
    const terrain = terrainGameObject.AddComponent(Terrain);

    {
        const sphereGameObject = new GameObject();
        sphereGameObject.transform.scale.set(1000, 1, 1);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Cube();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1.0 });
        sphereMesh.material = mat;
    }


    // const wireframe = new WireframePass();
    // wireframe.color = [1, 1, 1];       // white lines
    // wireframe.enabled = true;           // toggle on/off
    // Runtime.Renderer.RenderPipeline.AddPass(wireframe, GPU.RenderPassOrder.AfterLighting);
    
    Debugger.Enable();

    Runtime.Play();
};

Application(document.querySelector("canvas"));