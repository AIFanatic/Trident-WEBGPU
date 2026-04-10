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
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

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

    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    const rootGameObject = await GLTFLoader.Load("/extra/dist_bak/test-assets/GLTF/scenes/Bistro.glb", scene);
    // const rootGameObject = await GLTFLoader.Load("/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf", scene);

    Debugger.Enable();

    const mat = new PBRMaterial();
    traverse([rootGameObject], gameObject => {
        const mesh = gameObject.GetComponent(Components.Mesh);
        if (mesh) {
            mesh.enableShadows = false;
            mesh.material = mat;
        }
    })

    Runtime.Play();
};

Application(document.querySelector("canvas"));