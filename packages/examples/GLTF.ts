import {
    Components,
    Scene,
    Renderer,
    Mathf,
    GameObject,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFParser } from "@trident/plugins/GLTF/GLTF_Parser";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = document.body.clientWidth * aspectRatio;
canvas.height = document.body.clientHeight * aspectRatio;
canvas.style.width = `100vw`;
canvas.style.height = `100vh`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const helmet = (await GLTFParser.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf")).children[0];
    
    const helmetGameObject = new GameObject(scene);
    helmetGameObject.transform.eulerAngles.x = 90;
    const helmetMesh = helmetGameObject.AddComponent(Components.Mesh);
    helmetMesh.SetGeometry(helmet.geometry);
    helmetMesh.AddMaterial(helmet.material);


    scene.Start();
};

Application();