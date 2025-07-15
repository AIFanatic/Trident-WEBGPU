// import { Debugger } from "../plugins/Debugger";
// import { UIColorStat, UIFolder, UISliderStat, UIVecStat } from "../plugins/ui/UIStats";

import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    Renderer
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Water } from "@trident/plugins/Water/WaterPlugin";

const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.userSelect = `none`;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = false;
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.position.set(0, 6, -5);
        planeGO.transform.scale.set(3, 3, 3);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Cube());
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.position.set(0, 1, -5);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial());
    }


    // Water
    {
        const waterGameObject = new GameObject(scene);
        waterGameObject.transform.eulerAngles.x = -90;
        waterGameObject.transform.position.y = 5;
        const water = waterGameObject.AddComponent(Water);

        // // Debug
        // const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
        // new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], value => water.settings.set("wave_speed", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Depth offset:", -1, 1, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], value => water.settings.set("refraction", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], value => water.settings.set("foam_level", [value, 0, 0, 0]));
        // new UIColorStat(waterSettingsFolder, "Color deep:", new Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
        //     const c = Color.fromHex(parseInt(value.slice(1, value.length), 16));
        //     water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
        // });
        // new UIColorStat(waterSettingsFolder, "Color shallow:", new Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
        //     const c = Color.fromHex(parseInt(value.slice(1, value.length), 16));
        //     water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
        // });

        // waterSettingsFolder.Open();
    }

    scene.Start();
};

Application();