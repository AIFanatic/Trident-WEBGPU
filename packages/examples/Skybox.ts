import {
    Geometry,
    Components,
    Scene,
    Mathf,
    GPU,
    GameObject,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { HDRParser } from "@trident/plugins/HDRParser";
import { UIButtonStat, UIColorStat, UIFolder, UISliderStat, UITextureViewer, UIVecStat } from "@trident/plugins/ui/UIStats";
import { Debugger } from "@trident/plugins/Debugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

import { SpotLightHelper } from "@trident/plugins/SpotLightHelper";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { PointLightHelper } from "@trident/plugins/PointLightHelper";

import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "@trident/plugins/PostProcessing/effects/FXAA";
import { Sky } from "@trident/plugins/Environment/Sky";
import { Irradiance } from "@trident/plugins/Environment/Irradiance";
import { Prefilter } from "@trident/plugins/Environment/Prefilter";
import { BRDF } from "@trident/plugins/Environment/BRDF";
import { Environment } from "@trident/plugins/Environment/Environment";

import { PostProcessingFog } from "@trident/plugins/PostProcessing/effects/Fog";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);

    const observer = new ResizeObserver(entries => {
        camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);
    });
    observer.observe(canvas);


    const controls = new OrbitControls(canvas, camera);

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
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1});
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-10, -1.5, 0);
        sphereGameObject.transform.scale.set(10, 10, 10);
        sphereGameObject.transform.eulerAngles.y = 90;
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0});
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0});
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 0.0});
        sphereMesh.material = mat;
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1.0});
        sphereMesh.material = mat;
    }

    {
        const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/royal_esplanade_1k.hdr");
        const hdrCubemap = await HDRParser.ToCubemap(hdr);
        
        const skyAtmosphere = new Sky();
        await skyAtmosphere.init();

        // const skyTexture = hdrCubemap;
        const skyTexture = skyAtmosphere.skyTextureCubemap;

        const environment = new Environment(scene, skyTexture);
        await environment.init();

        setInterval(() => {
            const radius = 1; // distance of the directional light from origin
            const elevationRad = Mathf.Deg2Rad * skyAtmosphere.SUN_ELEVATION_DEGREES;
            const azimuthRad   = Mathf.Deg2Rad * skyAtmosphere.SUN_AZIMUTH_DEGREES; // or use your own azimuth angle

            // Convert spherical coordinates to 3D position
            const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
            const y = radius * Mathf.Sin(elevationRad);
            const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

            const sunPos = new Mathf.Vector3(x, y, z);

            lightGameObject.transform.position = sunPos;
            lightGameObject.transform.LookAtV1(new Mathf.Vector3(0,0,0));
        }, 100);

        {
            const skySettings = new UIFolder(Debugger.ui, "Sky");

            new UISliderStat(skySettings, "SUN_ELEVATION_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_ELEVATION_DEGREES, value => skyAtmosphere.SUN_ELEVATION_DEGREES = value);
            new UISliderStat(skySettings, "SUN_AZIMUTH_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_AZIMUTH_DEGREES, value => skyAtmosphere.SUN_AZIMUTH_DEGREES = value);
            new UISliderStat(skySettings, "EYE_ALTITUDE:", 0, 1000, 0.01, skyAtmosphere.EYE_ALTITUDE, value => skyAtmosphere.EYE_ALTITUDE = value);

            // const o0 = new UITextureViewer(skySettings, "Sky output0:", skyAtmosphere.transmittanceLUT);
            // const o1 = new UITextureViewer(skySettings, "Sky output1:", skyTexture);

            new UIButtonStat(skySettings, "Rebuild:", async value => {
                skyAtmosphere.Update();
                environment.Update();

                // o0.Update();
                // o1.Update();
            });
    
            skySettings.Open();
        }
    }

    scene.Start();
};

Application(document.querySelector("canvas"));