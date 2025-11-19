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
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(1000, 1000, 1000);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    const sphereInstanceGO = new GameObject(scene);
    const sphereInstanceMesh = sphereInstanceGO.AddComponent(Components.InstancedMesh);
    sphereInstanceMesh.material = new PBRMaterial({unlit: true});
    sphereInstanceMesh.geometry = Geometry.Sphere();
    sphereInstanceMesh.enableShadows = false;

    const p = new Mathf.Vector3();
    const r = new Mathf.Quaternion();
    const s = new Mathf.Vector3(1,1,1);
    const m = new Mathf.Matrix4();

    let count = 0;
    const offset = 10;
    const i = 50;
    const half = i * offset * 0.5;
    for (let x = 0; x < i; x++) {
        for (let y = 0; y < i; y++) {
            const lightGameObject = new GameObject(scene);
            lightGameObject.transform.position.set(x * offset - half, 0, y * offset - half);
            const look = lightGameObject.transform.position.clone();
            look.y -= 1;
            lightGameObject.transform.LookAtV1(look);
            const light = lightGameObject.AddComponent(Components.SpotLight);
            light.color.set(Math.random(), Math.random(), Math.random(), 1);
            // light.range = 10;
            light.angle = 10;
            light.intensity = 2
            // light.angle = 90;
            light.castShadows = false;

            p.copy(lightGameObject.transform.position);
            m.compose(p,r,s);
            sphereInstanceMesh.SetMatrixAt(count, m);
            count++;

            // const sphereGameObject = new GameObject(scene);
            // sphereGameObject.transform.position.copy(lightGameObject.transform.position);
            // const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            // sphereMesh.geometry = Geometry.Sphere();
            // sphereMesh.material = new PBRMaterial({albedoColor: light.color, emissiveColor: light.color, unlit: true});
        }
    }


    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));