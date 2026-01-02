import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = false;

    // const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/Fox.glb");
    const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/DamagedHelmet/DamagedHelmet.gltf");

    // function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
    //     for (const gameObject of gameObjects) {
    //         fn(gameObject);
    //         for (const child of gameObject.transform.children) {
    //             traverse([child.gameObject], fn);
    //         }
    //     }
    // }

    // let animator: Components.Animator = undefined;
    // traverse([gameObjects], gameObject => {
    //     const _animator = gameObject.GetComponent(Components.Animator);
    //     if (_animator) animator = _animator;
    // })

    // if (!animator) throw Error("Could not find an animator component");

    // animator.SetClipByIndex(0);
    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));