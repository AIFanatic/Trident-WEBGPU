import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Object3D,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;

    function traverse(object3D: Object3D, func: (object3D: Object3D) => void) {
        func(object3D);
        for (const child of object3D.children) traverse(child, func);
    }

    GLTFLoader.loadAsGameObjects(scene, "/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf");
    
    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));