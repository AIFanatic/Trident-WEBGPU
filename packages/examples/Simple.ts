import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    const i = 5;
    for (let x = 0; x < i; x++) {
        for (let y = 0; y < i; y++) {
            const sphereGameObject = new GameObject(scene);
            sphereGameObject.transform.position.set((x * 2) - i * 0.5 * 2, 0, (y * 2) - i * 0.5 * 2);
            const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            sphereMesh.geometry = Geometry.Sphere();
            sphereMesh.material = new PBRMaterial();

            const lightGameObject = new GameObject(scene);
            lightGameObject.transform.position.copy(sphereGameObject.transform.position);
            lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
            const light = lightGameObject.AddComponent(Components.SpotLight);
            light.color.set(Math.random(), Math.random(), Math.random(), 1);
            light.angle = 90;
            light.castShadows = false;
        }
    }


    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));