import {
    Geometry,
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
    Renderer,
} from "@trident/core";

import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);

    // const observer = new ResizeObserver(entries => {
    //     camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);
    // });
    // observer.observe(canvas);


    // const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-1, 4, 0.01);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 10;

    const lightHelper = lightGameObject.AddComponent(DirectionalLightHelper);
    lightHelper.light = light;

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(10, 10, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-10, -1.5, 0);
        sphereGameObject.transform.scale.set(10, 10, 10);
        sphereGameObject.transform.eulerAngles.y = 90;
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 0.0 });
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1.0 });
        sphereMesh.material = mat;
    }

    {
        const skyAtmosphere = new Sky();
        await skyAtmosphere.init();

        // const skyTexture = hdrCubemap;
        const skyTexture = skyAtmosphere.skyTextureCubemap;

        const environment = new Environment(scene, skyTexture);
        await environment.init();

        setInterval(() => {
            const radius = 1; // distance of the directional light from origin
            const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
            const azimuthRad = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

            // Convert spherical coordinates to 3D position
            const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
            const y = radius * Mathf.Sin(elevationRad);
            const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

            const sunPos = new Mathf.Vector3(x, y, z);

            lightGameObject.transform.position = sunPos;
            lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        }, 100);
    }

    const postProcessing = new PostProcessingPass();
    const smaa = new PostProcessingSMAA();
    postProcessing.effects.push(smaa);
    scene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);

    scene.Start();
};

// Application(document.querySelector("canvas"));

// deno --allow-env --allow-read --allow-write --allow-ffi --sloppy-imports --unstable-raw-imports --unstable-webgpu ./packages/examples/ShadowTest.ts
import { createWindowGPU, mainloop } from "jsr:@gfx/dwm/ext/webgpu";
import { Sky } from "@trident/plugins/Environment/Sky";
import { Environment } from "@trident/plugins/Environment/Environment";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";

const window = await createWindowGPU({
    title: "DenoGL",
    width: 800,
    height: 600,
    resizable: true,
});
window.width = 800;
window.height = 600;

globalThis.mainloop = mainloop;
Application(window);