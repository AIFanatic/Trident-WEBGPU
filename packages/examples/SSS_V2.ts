import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
    Runtime
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

import { Debugger } from "@trident/plugins/Debugger";
import { SSS_V2 } from "@trident/plugins/SSS_V2";
import { FullscreenQuad } from "@trident/plugins/FullscreenQuad";


async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    // const light = lightGameObject.AddComponent(Components.SpotLight);
    // light.range = 200;
    // light.angle = 90;
    // light.intensity = 100;
    light.color.set(1, 1, 1, 1);
    light.castShadows = false;

    const top = new GameObject();
    top.transform.scale.set(100, 100, 1);
    top.transform.position.y = -5.1;
    top.transform.eulerAngles.x = -90;
    const meshtop = top.AddComponent(Components.Mesh);
    meshtop.geometry = Geometry.Plane();
    meshtop.material = new PBRMaterial();


    const roughness = 0.7;
    const metalness = 0.1;

    const topMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    
    const backMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    const leftMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject();
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = planeGeometry;
    meshbottom.material = floorMaterial;

    const left = new GameObject();
    left.transform.scale.set(0.05, 10, 10);
    left.transform.position.x = -5;
    // left.transform.eulerAngles.y = 90;
    const meshleft = left.AddComponent(Components.Mesh);
    meshleft.geometry = cubeGeometry;
    meshleft.material = leftMaterial;


    const right = new GameObject();
    right.transform.scale.set(0.05, 10, 10);
    right.transform.position.x = 5;
    // right.transform.eulerAngles.y = -90;
    const meshright = right.AddComponent(Components.Mesh);
    meshright.geometry = cubeGeometry;
    meshright.material = rightMaterial;

    const back = new GameObject();
    back.transform.scale.set(10, 10, 0.05);
    back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
    meshback.geometry = cubeGeometry;
    meshback.material = backMaterial;

    const cube = new GameObject();
    cube.transform.scale.set(2, 4, 2);
    cube.transform.position.set(-2, -3, -2);
    cube.transform.eulerAngles.y = 20;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = cubeGeometry;
    cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    // cubeMesh.enableShadows = false;

    const cube2 = new GameObject();
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.geometry = cubeGeometry;
    cubeMesh2.material = new PBRMaterial({ emissiveColor: new Mathf.Color(1, 0, 0, 1), albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    // cubeMesh2.enableShadows = false;


    const sssPass = new SSS_V2(light);
    Runtime.Renderer.RenderPipeline.AddPass(sssPass, GPU.RenderPassOrder.AfterLighting);

    Debugger.Enable();

    Runtime.Play();
};

Application(document.querySelector("canvas"));