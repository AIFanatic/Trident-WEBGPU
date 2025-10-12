import { Components, Scene, GPU, Mathf, GameObject, Geometry, PBRMaterial, Component, VertexAttribute } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 10000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(10, 10, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.5, roughness: 0.5});
        sphereMesh.material = mat;
    }
    
    const gameObject = new GameObject(scene);
    const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);

    instancedMesh.geometry = Geometry.Cube();
    instancedMesh.material = new PBRMaterial({useVertexPulling: false});

    const count = 20;
    let position = new Mathf.Vector3();
    let rotation = new Mathf.Quaternion();
    let scale = new Mathf.Vector3(1,1,1);
    let matrix = new Mathf.Matrix4();

    const offset = 2;
    let i = 0;
    for (let x = 0; x < count; x++) {
        for (let y = 0; y < count; y++) {
            for (let z = 0; z < count; z++) {
                position.set(x * offset, y * offset, z * offset);
                matrix.compose(position, rotation, scale);
                instancedMesh.SetMatrixAt(i, matrix);
                i++;
            }
        }
    }


    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));