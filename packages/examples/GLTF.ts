import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Prefab } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu", 1);
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = true;
    light.intensity = 1

    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    // const prefab = await GLTFLoader.LoadFromURL("./assets/models/DamagedHelmet/DamagedHelmet.gltf");
    const prefab = await GLTFLoader.LoadFromURL("./assets/models/Fox.glb");
    const gameObject = scene.Instantiate(prefab);

    // {
    //     function traverse(objects: Prefab[], fn: (object: Prefab) => void) {
    //         for (const object of objects) {
    //             fn(object);
    //             for (const child of object.children) {
    //                 traverse([child], fn);
    //             }
    //         }
    //     }
        
    //     const serialized = scene.Serialize();
    //     console.log("serialized", serialized)
        
    //     traverse(serialized.gameObjects, gameObject => {
    //         for (const componet of gameObject.components) {
    //             if (componet.type === Components.Mesh.type) {
    //                 console.log("MESH", componet)
    //                 componet.geometry.assetPath = "/extra/test-assets/DamagedHelmet.mesh";
    //                 componet.material.assetPath = "/extra/test-assets/DamagedHelmet.mat";
    //             }
    //         }
    //     })


    //     scene.Clear();
    //     scene.Deserialize(serialized);
    //     Components.Camera.mainCamera = scene.GetGameObjects()[0].GetComponents(Components.Camera)[0];
    //     const controls = new OrbitControls(canvas, Components.Camera.mainCamera);
    // }
    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));