import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Prefab,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.5, 100);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floor = new GameObject(scene);
    floor.transform.position.y = -0.5;
    floor.transform.scale.set(100, 100, 100);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const model = await GLTFLoader.LoadFromURL("./assets/models/bunny.glb");
    Scene.Instantiate(model);

    function traverse(object3D: Prefab, func: (o: Prefab) => void | Promise<void>) {
        func(object3D);
        for (const child of object3D.children) traverse(child, func);
    }

    let geometry: Geometry;
    let material: PBRMaterial;
    traverse(model, prefab => {
        for (const component of prefab.components) {
            if (component.type === Components.Mesh.type) {
                geometry = new Geometry();
                geometry.Deserialize(component.renderable.geometry);
                material = component.renderable.material;
            }
        }
    })

    console.log("geometry", geometry);

    const albedoTexture = GPU.Texture.Create(1, 1);
    albedoTexture.SetSubData(new Float32Array([1, 1, 1, 1]), 1, 1, 0);
    // albedoTexture.SetData(new Float32Array([1,1,1,1]),4);
    const billboardTexture = await Billboarder.Create(geometry, albedoTexture);
    billboardTexture.name = "Billboard"

    const billboard = new GameObject(scene);
    billboard.transform.position.set(1, 1, 0);
    // billboard.transform.eulerAngles.x = -90;
    const billboardMesh = billboard.AddComponent(Components.Mesh);
    billboardMesh.geometry = Geometry.Plane();
    billboardMesh.material = new PBRMaterial({ albedoMap: billboardTexture });

    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));