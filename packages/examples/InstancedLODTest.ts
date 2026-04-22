import { Components, Mathf, GameObject, Geometry, PBRMaterial, Runtime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { InstancedLODGroup } from "@trident/plugins/LOD/InstancedLODGroup";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 500);

    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(10, 10, 10);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();
        
    const lodGameObject = new GameObject(scene);
    const lodInstanceRenderable = lodGameObject.AddComponent(InstancedLODGroup);

    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Cube(), material: new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)})}], screenSize: 20});
    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Sphere(), material: new PBRMaterial({albedoColor: new Mathf.Color(0, 1, 0, 1)})}], screenSize: 40});
    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Capsule(), material: new PBRMaterial({albedoColor: new Mathf.Color(0, 0, 1, 1)})}], screenSize: 80});

    lodInstanceRenderable.SetMatricesBulk(new Float32Array([...new Mathf.Matrix4().elements]));

    Debugger.Enable();


    Runtime.Play();
};

Application(document.querySelector("canvas"));
