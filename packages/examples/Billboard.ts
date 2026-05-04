import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Runtime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.5, 100);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floor = new GameObject();
    floor.transform.position.y = -0.5;
    floor.transform.scale.set(100, 100, 100);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const model = await GLTFLoader.Load("./assets/models/bunny.glb", scene);

    let geometry: Geometry;
    let material: PBRMaterial;
    const modelMeshes = model.GetComponentsInChildren(Components.Mesh);
    for (const mesh of modelMeshes) {
        geometry = mesh.geometry;
        material = mesh.material as PBRMaterial;
    }

    console.log("geometry", geometry);

    const albedoTexture = GPU.Texture.Create(1, 1);
    albedoTexture.SetSubData(new Float32Array([1, 1, 1, 1]), 1, 1, 0);
    // albedoTexture.SetData(new Float32Array([1,1,1,1]),4);
    const billboardTexture = await Billboarder.Create(geometry, albedoTexture);
    billboardTexture.name = "Billboard"

    const billboard = new GameObject();
    billboard.transform.position.set(1, 1, 0);
    // billboard.transform.eulerAngles.x = -90;
    const billboardMesh = billboard.AddComponent(Components.Mesh);
    billboardMesh.geometry = Geometry.Plane();
    billboardMesh.material = new PBRMaterial({ albedoMap: billboardTexture });

    Debugger.Enable();
    Runtime.Play();
};

Application(document.querySelector("canvas"));