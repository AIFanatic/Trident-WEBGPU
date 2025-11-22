import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    Renderer
} from "@trident/core";

import { Debugger } from "@trident/plugins/Debugger";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Water } from "@trident/plugins/Water/WaterPlugin";

import { UIColorStat, UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";

async function Application(canvas: HTMLCanvasElement) {
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
        sphereMesh.geometry = Geometry.Cube();
        sphereMesh.material = new PBRMaterial();
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.scale.set(5, 5, 5);
        planeGO.transform.position.set(5, 5, -5);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Sphere();
        sphereMesh.material = new PBRMaterial();
    }


    // Water
    {
        const waterGameObject = new GameObject(scene);
        waterGameObject.transform.eulerAngles.x = -90;
        waterGameObject.transform.position.y = 5;
        const water = waterGameObject.AddComponent(Water);

        // Debug
        const container = document.createElement("div");
        container.classList.add("stats-panel");
        document.body.append(container);

        const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
        new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], value => water.settings.set("wave_speed", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Depth offset:", -10, 0, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], value => water.settings.set("refraction", [value, 0, 0, 0]));
        new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], value => water.settings.set("foam_level", [value, 0, 0, 0]));
        new UIColorStat(waterSettingsFolder, "Color deep:", new Mathf.Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
            const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
            water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
        });
        new UIColorStat(waterSettingsFolder, "Color shallow:", new Mathf.Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
            const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
            water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
        });

        function addWaveStat(name: "wave_a" | "wave_b" | "wave_c", setting) {
            const wave = setting; //water.settings.get("wave_a");
            new UIVecStat(waterSettingsFolder, name,
                {value: wave[0], min: -1, max: 1, step: 0.01},
                {value: wave[1], min: -1, max: 1, step: 0.01},
                {value: wave[2], min: -1, max: 1, step: 0.01},
                {value: wave[3], min: -1, max: 1, step: 0.01},
                value => {
                    water.settings.set(name, [value.x, value.y, value.z, value.w])
                }
            )
        }

        addWaveStat("wave_a", water.settings.get("wave_a"));
        addWaveStat("wave_b", water.settings.get("wave_b"));
        addWaveStat("wave_c", water.settings.get("wave_c"));

        waterSettingsFolder.Open();
    }

    const offset = 10;
    const i = 5;
    for (let x = 0; x < i; x++) {
        for (let y = 0; y < i; y++) {

            const lightGameObject = new GameObject(scene);
            lightGameObject.transform.position.set((x * offset) - i * 0.5 * 2, 7, (y * offset) - i * 0.5 * 2);
            const look = lightGameObject.transform.position.clone();
            look.y -= 1;
            lightGameObject.transform.LookAtV1(look);
            const light = lightGameObject.AddComponent(Components.PointLight);
            light.color.set(Math.random(), Math.random(), Math.random(), 1);
            light.range = 20;
            light.intensity = 10
            // light.angle = 90;
            light.castShadows = false;

            const sphereGameObject = new GameObject(scene);
            sphereGameObject.transform.position.copy(lightGameObject.transform.position);
            const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            sphereMesh.geometry = Geometry.Sphere();
            sphereMesh.material = new PBRMaterial({albedoColor: light.color, emissiveColor: light.color, unlit: false});
        }
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, 3, 0);
        planeGO.transform.scale.set(100, 100, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1});
        sphereMesh.material = mat;
    }


    scene.Start();
};

Application(document.querySelector("canvas"));