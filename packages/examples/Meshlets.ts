import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

import { MeshletMesh as MeshletMesh } from "@trident/plugins/meshlets/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);


    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    // TODO: Should be added automatically from plugin
    scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 20;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    // const floorGameObject = new GameObject(scene);
    // floorGameObject.transform.scale.set(100, 100, 1);
    // floorGameObject.transform.eulerAngles.x = -90;
    // const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    // floorMesh.geometry = Geometry.Plane();
    // floorMesh.material = new PBRMaterial();

    {
        const mesh = await OBJLoaderIndexed.load("./assets/models/bunny.obj");
        const meshletGameObject = new GameObject(scene);
        const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
        meshletMesh.enableShadows = false;
        meshletMesh.geometry = mesh.geometry;
        meshletMesh.material = mesh.material;
    }

    // {
    //     const mesh = await OBJLoaderIndexed.load("./assets/models/suzanne.obj");
    //     const meshletGameObject = new GameObject(scene);
    //     meshletGameObject.transform.position.x = 2;
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
    //     meshletMesh.enableShadows = false;
    //     await meshletMesh.SetGeometry(mesh.geometry, true);
    //     meshletMesh.material = mesh.material;
    // }




    // {
    //     async function traverse(gameObjects: GameObject[], fn: (go: GameObject) => Promise<boolean>) {
    //         for (const go of gameObjects) {
    //             if (!await fn(go)) continue;
    //             for (const child of go.transform.children) {
    //                 await traverse([child.gameObject], fn);
    //             }
    //         }
    //     }

    //     const tempScene = new Scene(renderer);
    //     // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf");
    //     // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/happy-buddha.glb");
    //     // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/GLTF/scenes/Bistro.glb");
    //     // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/dist/examples/assets/models/DamagedHelmet/DamagedHelmet.gltf");
    //     const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/test-assets/fir_tree_01_2k.glb");
    //     // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/dist/examples/assets/models/Monkey_Bunny.glb");
    //     console.log(gameObjects)

    //     // await traverse([gameObjects], async gameObject => {
    //     //     const mesh = gameObject.GetComponent(Components.Mesh);
    //     //     if (mesh) {
    //     //         const geometry = mesh.geometry;
    //     //         const material = mesh.material;
    //     //         gameObject.componentsByCtor.delete(mesh.constructor);
    //     //         const index = gameObject.allComponents.indexOf(mesh);
    //     //         if (index !== -1) gameObject.allComponents.splice(index, 1);
    //     //         scene.componentsByType.delete(mesh.contructor)

    //     //         const newMesh = gameObject.AddComponent(MeshletMesh);
    //     //         newMesh.geometry = geometry;
    //     //         newMesh.material = material;

    //     //         // newMesh.material = new PBRMaterial();
    //     //     }
    //     //     return true;
    //     // });

    //     const oldToNewMap: Map<GameObject, GameObject> = new Map();
    //     // First pass: Create all GameObjects
    //     await traverse([gameObjects], async gameObject => {
    //         const newGameObject = new GameObject(scene);
    //         newGameObject.name = gameObject.name;
    //         newGameObject.transform.position.copy(gameObject.transform.position);
    //         newGameObject.transform.rotation.copy(gameObject.transform.rotation);
    //         newGameObject.transform.scale.copy(gameObject.transform.scale);
    //         oldToNewMap.set(gameObject, newGameObject);
    //         return true;
    //     })
    //     // Second pass create hierarchy
    //     await traverse([gameObjects], async oldGameObject => {
    //         const newGameObject = oldToNewMap.get(oldGameObject)!;
    //         const parentOld = oldGameObject.transform.parent?.gameObject;
    //         const parentNew = parentOld ? oldToNewMap.get(parentOld) : undefined;
    //         if (parentNew) newGameObject.transform.parent = parentNew.transform;
    //         return true;
    //     });

    //     let i = 0;
    //     let delay = 0;

    //     let meshes = []
    //     const mat = new PBRMaterial();
    //     await traverse([gameObjects], async oldGameObject => {
    //         // if (i === 100) return true;
    //         // i++;

    //         const newGameObject = oldToNewMap.get(oldGameObject)!;
    //         newGameObject.transform.position.x += 2;
    //         const mesh = oldGameObject.GetComponent(Components.Mesh);
    //         if (!mesh) return true;

    //         // setTimeout(async () => {
    //             const newMesh = newGameObject.AddComponent(MeshletMesh);
    //             newMesh.geometry = mesh.geometry;
    //             if (newMesh["SetGeometry"]) {
    //                 newMesh.geometry = mesh.geometry;
    //                 // newMesh.SetGeometry(mesh.geometry, true);
    //             }
    //             newMesh.material = mat;
    //             newMesh.enableShadows = false;
    //             console.log(`Parsed ${i}/3064`);
    //             i++;
    //         // }, delay);
    //         delay += 100;


    //         return true;
    //     });
    //     console.log(meshes)

    //     scene.Start();
    // }

    scene.Start();
};

Application(document.querySelector("canvas"));