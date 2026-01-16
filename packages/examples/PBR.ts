import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { HDRParser } from "@trident/plugins/HDRParser";

import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightsInfo = [
        {position: new Mathf.Vector3(-10.0, 10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(10.0, 10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(-10.0, -10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
        {position: new Mathf.Vector3(10.0, -10.0, 10.0), color: new Mathf.Vector3(1, 1, 1) },
    ];

    for (const lightInfo of lightsInfo ) {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.copy(lightInfo.position);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.color = Mathf.Color.fromVector(lightInfo.color);
        light.castShadows = false;
    }

    const c = 6;
    for (let i = 0; i < c; i++) {
        const x = i;
        const y = 1;
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set((x - c * 0.5) * 1.5, y, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        sphereMesh.material = new PBRMaterial({
            albedoColor: new Mathf.Color(0.957, 0.792, 0.407, 1),
            metalness: i < 6 ? 1.0 : 0.0,
            roughness: i % 6 / 6
        });
    }

    for (let i = 0; i < c; i++) {
        const x = i;
        const y = -1;
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set((x - c * 0.5) * 1.5, y, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        sphereMesh.material = new PBRMaterial({
            albedoColor: new Mathf.Color(1, 0, 0, 1),
            metalness: i < 6 ? 0.0 : 1.0,
            roughness: i % 6 / 6
        });
    }

    Debugger.Enable();

    const hdr = await HDRParser.Load("./assets/textures/HDR/goegap_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    scene.Start();
};

Application(document.querySelector("canvas"));