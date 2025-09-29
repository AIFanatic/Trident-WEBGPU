import { Components, Scene, GPU, Mathf, GameObject, Geometry, PBRMaterial, Component } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
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

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();

    {
        const floorGameObject = new GameObject(scene);
        floorGameObject.transform.eulerAngles.x = -90;
        floorGameObject.transform.position.y = -1;
        const floorMesh = floorGameObject.AddComponent(Components.Mesh);
        floorMesh.geometry = Geometry.Cube();
        floorMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0, 1)});
    }

    {
        console.log("lightGameObject.GetComponents(Light)", lightGameObject.GetComponents(Components.Light));
        console.log("lightGameObject.GetComponents(DirectionalLight)", lightGameObject.GetComponents(Components.DirectionalLight));

        console.log("scene.GetComponents(Light)", scene.GetComponents(Components.Light));
        console.log("scene.GetComponents(DirectionalLight)", scene.GetComponents(Components.DirectionalLight));
    }

    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));