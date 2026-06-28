import { Components, Mathf, GameObject, Geometry, PBRMaterial, Runtime, PlayerRuntime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { InstancedLODGroup } from "@trident/plugins/LOD/InstancedLODGroup";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 500);

    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floorGameObject = new GameObject();
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(10, 10, 10);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();
        
    const lodGameObject = new GameObject();
    const lodInstanceRenderable = lodGameObject.AddComponent(InstancedLODGroup);

    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Cube(), material: new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)})}], screenSize: 1});
    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Sphere(), material: new PBRMaterial({albedoColor: new Mathf.Color(0, 1, 0, 1)})}], screenSize: 0.5});
    lodInstanceRenderable.lods.push({renderers: [{geometry: Geometry.Capsule(), material: new PBRMaterial({albedoColor: new Mathf.Color(0, 0, 1, 1)})}], screenSize: 0.1});

    lodInstanceRenderable.SetMatricesBulk(new Float32Array([...new Mathf.Matrix4().elements]));

    Debugger.Enable();
};

Application(document.querySelector("canvas"));
