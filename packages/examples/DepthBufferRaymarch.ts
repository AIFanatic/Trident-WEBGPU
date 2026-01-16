import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { DepthBufferRaymarchPass } from "@trident/plugins/DepthBufferRaymarch";

import { Debugger } from "@trident/plugins/Debugger";
import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { SSSRenderPass } from "@trident/plugins/SSS";


async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 3);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, window.innerWidth / window.innerHeight, 0.1, 5000);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-1, -1, -1).normalize().mul(-200);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    // const light = lightGameObject.AddComponent(Components.SpotLight);
    // light.range = 200;
    // light.angle = 90;
    // light.intensity = 0.01;
    // light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    const target = new Mathf.Vector3(0,0,0);
    const lightPos = lightGameObject.transform.position;

    const lightDir = target.sub(lightPos).normalize();
    console.log(lightDir)

    const floor = new GameObject(scene);
    floor.transform.scale.set(10000, 10000, 10000);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const cube = new GameObject(scene);
    cube.transform.position.y = 0.5;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = Geometry.Cube();

    const texture = await GPU.Texture.Load("./assets/textures/32x32.png")
    cubeMesh.material = new PBRMaterial({ albedoMap: texture, roughness: 0.7, metalness: 0.1 });

    const depthBufferRaymarchPass = new DepthBufferRaymarchPass();
    scene.renderPipeline.AddPass(depthBufferRaymarchPass, GPU.RenderPassOrder.AfterLighting);

    // const sss = new SSSRenderPass(light);
    // scene.renderPipeline.AddPass(sss, GPU.RenderPassOrder.AfterLighting);
    
    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));