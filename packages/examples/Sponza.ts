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

import { GLTFParser } from "@trident/plugins/GLTF/GLTF_Parser";

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

    const sponza = (await GLTFParser.Load("/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf"));
    traverse(sponza, object3D => {
        console.log(object3D)
        if (object3D.geometry && object3D.material) {
            const gameObject = new GameObject(scene);
            gameObject.transform.scale.set(0.01, 0.01, 0.01);
            const mesh = gameObject.AddComponent(Components.Mesh);
            mesh.SetGeometry(object3D.geometry);
            mesh.AddMaterial(object3D.material);
        }
    })

    const i = 10;
    for (let x = 0; x < i; x++) {
        for (let y = 0; y < i; y++) {
            const sphereGameObject = new GameObject(scene);
            sphereGameObject.transform.position.set((x * 2) - i * 0.5 * 2, 5, (y * 2) - i * 0.5 * 2);
            const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            sphereMesh.SetGeometry(Geometry.Sphere());
            sphereMesh.AddMaterial(new PBRMaterial());

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