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
    camera.SetPerspective(70, canvas.width / canvas.height, 0.1, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floor = new GameObject(scene);
    floor.transform.scale.set(10000, 10000, 10000);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/Fox.glb");
    // const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/DamagedHelmet/DamagedHelmet.gltf");
    const root = gameObjects[0]
    root.transform.scale.mul(0.01);

    const animator = root.GetComponent(Components.Animator);
    animator.SetClipByIndex(0);

    // function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
    //     for (const gameObject of gameObjects) {
    //         fn(gameObject);
    //         for (const child of gameObject.transform.children) {
    //             traverse([child.gameObject], fn);
    //         }
    //     }
    // }
    // traverse(gameObjects, gameObject => {
    //     const mesh = gameObject.GetComponent(Components.Mesh);
    //     if (mesh) {
    //         mesh.enableShadows = false;
    //     }
    // })

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));