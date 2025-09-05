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

import { DebugTextureViewer } from "@trident/plugins/DebugTextureViewer";

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

    // const c = 4;
    // for (let x = 0; x <= c; x++) {
    //     for (let y = 0; y <= c; y++) {
    //         const sphereGameObject = new GameObject(scene);
    //         sphereGameObject.transform.position.set((x - c * 0.5) * 1.5, (y - c * 0.5) * 1.5, 0);
    //         const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    //         sphereMesh.SetGeometry(Geometry.Sphere());
    //         sphereMesh.AddMaterial(new PBRMaterial({
    //             albedoColor: new Mathf.Color(1, 0, 0, 1),
    //             metalness: x / c,
    //             roughness: y / c
    //         }));
    //     }
    // }
    
    const c = 6;
    for (let i = 0; i < c; i++) {
        const x = i;
        const y = 1;
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set((x - c * 0.5) * 1.5, y, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({
            albedoColor: new Mathf.Color(0.957, 0.792, 0.407, 1),
            metalness: i < 6 ? 1.0 : 0.0,
            roughness: i % 6 / 6
        }));
    }

    for (let i = 0; i < c; i++) {
        const x = i;
        const y = -1;
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set((x - c * 0.5) * 1.5, y, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({
            albedoColor: new Mathf.Color(1, 0, 0, 1),
            metalness: i < 6 ? 0.0 : 1.0,
            roughness: i % 6 / 6
        }));
    }

    // const sphereGameObject = new GameObject(scene);
    // sphereGameObject.transform.scale.set(5,5,5)
    // const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    // sphereMesh.SetGeometry(Geometry.Sphere());
    // sphereMesh.AddMaterial(new PBRMaterial({
    //     albedoColor: new Mathf.Color(1, 0, 0, 1),
    //     metalness: 0.0,
    //     roughness: 1
    // }));

    Debugger.Enable();

    const hdr = await HDRParser.Load("./assets/textures/HDR/dikhololo_night_1k.hdr");
    const sky = await HDRParser.ToCubemap(hdr);

    const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
    const prefilterMap = await HDRParser.GetPrefilterMap(sky);
    const brdfLUT = await HDRParser.GetBRDFLUT();

    scene.renderPipeline.skybox = sky;
    scene.renderPipeline.skyboxIrradiance = skyIrradiance;
    scene.renderPipeline.skyboxPrefilter = prefilterMap;
    scene.renderPipeline.skyboxBRDFLUT = brdfLUT;

    // const textureViewer = new DebugTextureViewer(brdfLUT);
    // scene.renderPipeline.AddPass(textureViewer, GPU.RenderPassOrder.AfterLighting);



    // const sphereGameObject = new GameObject(scene);
    // const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    // sphereMesh.SetGeometry(Geometry.Sphere());
    // skyIrradiance.SetActiveLayer(5)
    // sphereMesh.AddMaterial(new PBRMaterial({albedoMap: skyIrradiance}));


    scene.Start();
};

Application(document.querySelector("canvas"));