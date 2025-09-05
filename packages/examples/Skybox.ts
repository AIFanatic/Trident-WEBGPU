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
import { UIColorStat, UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { Debugger } from "@trident/plugins/Debugger";
import { LineRenderer } from "@trident/plugins/LineRenderer";

import { SpotLightHelper } from "@trident/plugins/SpotLightHelper";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    let w;
    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(0.01, 4, 0.01);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.range = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;

        console.log("Light position:", lightGameObject.transform.position.elements);
        console.log("Light rotation:", lightGameObject.transform.rotation.elements);
        console.log("Light forward:", lightGameObject.transform.forward.elements);

        const waterSettingsFolder = new UIFolder(Debugger.ui, "Light");
        waterSettingsFolder.Open();
        new UIVecStat(waterSettingsFolder, "Position:",
            {min: -5, max: 5, value: light.transform.position.x, step: 0.1},
            {min: -5, max: 5, value: light.transform.position.y, step: 0.1},
            {min: -5, max: 5, value: light.transform.position.z, step: 0.1},
            undefined,
            value => {
                light.transform.position.x = value.x;
                light.transform.position.y = value.y;
                light.transform.position.z = value.z;
                light.transform.LookAtV1(new Mathf.Vector3(0,0,0))
            }
        );
        new UISliderStat(waterSettingsFolder, "Intensity:", 0, 100, 0.1, light.intensity, value => light.intensity = value);
        // new UISliderStat(waterSettingsFolder, "Angle:", 0, 3.14 * 0.5, 0.01, light.angle, value => {
        //     light.angle = value;
        // });
        new UISliderStat(waterSettingsFolder, "Range:", 0, 10, 0.1, light.range, value => light.range = value);
        
        const lightHelperGameObject = new GameObject(scene);
        const spotLightHelper = lightHelperGameObject.AddComponent(DirectionalLightHelper);
        spotLightHelper.light = light;
        w = waterSettingsFolder;
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(10, 10, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.5, roughness: 0.5});
        sphereMesh.AddMaterial(mat);
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(0.5843, 0.8353, 0.8784, 1), metalness: 0.5, roughness: 0.1});
        sphereMesh.AddMaterial(mat);
        new UIColorStat(w, "Color:", "#ffffff", color => {
            mat.params.albedoColor.setFromHex(color);
            mat.params.albedoColor = mat.params.albedoColor; // Proxy things
        });
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 1.0, roughness: 0.0});
        sphereMesh.AddMaterial(mat);
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 0.0});
        sphereMesh.AddMaterial(mat);
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(-1, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1.0});
        sphereMesh.AddMaterial(mat);
    }

    {
        const hdr = await HDRParser.Load("./assets/textures/HDR/dikhololo_night_1k.hdr");
        const sky = await HDRParser.ToCubemap(hdr);

        const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
        const prefilterMap = await HDRParser.GetPrefilterMap(sky);
        const brdfLUT = await HDRParser.GetBRDFLUT(1);
    
        scene.renderPipeline.skybox = sky;
        scene.renderPipeline.skyboxIrradiance = skyIrradiance;
        scene.renderPipeline.skyboxPrefilter = prefilterMap;
        scene.renderPipeline.skyboxBRDFLUT = brdfLUT;
    }

    scene.Start();
};

Application(document.querySelector("canvas"));