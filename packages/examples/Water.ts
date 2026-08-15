import {
    GameObject,
    Geometry,
    Components,
    Mathf,
    PBRMaterial,
    Renderer,
    Runtime,
    PlayerRuntime,
    GPU
} from "@trident/core";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";

import { Debugger } from "@trident/plugins/Debugger";
import { OrbitControls } from "@trident/plugins/OrbitControls";

import { UIColorStat, UIFolder, UISliderStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { Sky } from "@trident/plugins/Environment/Sky";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Bloom } from "@trident/plugins/Bloom";

import { WaterV1 } from "@trident/plugins/Water/WaterV1";
import { WaterDynamic } from "@trident/plugins/Water/WaterDynamic";
import { WaterFFT } from "@trident/plugins/Water/WaterFFT";
import { WaterNoise } from "@trident/plugins/Water/WaterNoise";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);


    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 5120);
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.eulerAngles.set(-50, -30, 0);
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    // lightGameObject.AddComponent(DirectionalLightHelper);

//     const sphereGameObject = new GameObject();
//     const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
//     sphereMesh.geometry = Geometry.Plane();
//     sphereMesh.material = new GPU.Material({
//         isDeferred: false,
//         shader: await GPU.Shader.Create({
//             code: `
//               #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

//             struct VertexInput {
//                 @builtin(instance_index) instanceIdx : u32, 
//                 @location(0) position : vec3<f32>,
//                 @location(1) normal : vec3<f32>,
//                 @location(2) uv : vec2<f32>,
//             };

//               struct VertexOutput {
//                   @builtin(position) position : vec4f,
//                   @location(0) uv : vec2f,
//               };

//               @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
//               @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

//               @group(1) @binding(0) var tex: texture_2d<f32>;
//               @group(1) @binding(1) var texSampler: sampler;

//               @vertex
//               fn vertexMain(input: VertexInput) -> VertexOutput {
//                   var output: VertexOutput;
//                   let world = modelMatrix[input.instanceIdx] * vec4f(input.position, 1.0);
//                   output.position = frameBuffer.projectionMatrix * frameBuffer.viewMatrix * world;
//                   output.uv = input.uv;
//                   return output;
//               }

//    @fragment
//   fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
//       let mipCount = textureNumLevels(tex);
//       let baseSize = vec2f(textureDimensions(tex, 0));
//       let aspect = baseSize.x / baseSize.y;

//       var totalWidth = 0.0;
//       var scale = 1.0;

//       for (var i = 0u; i < mipCount; i = i + 1u) {
//           totalWidth += scale * aspect;
//           scale *= 0.5;
//       }

//       let p = vec2f(input.uv.x * totalWidth, input.uv.y);

//       var x = 0.0;
//       var w = aspect;
//       var h = 1.0;

//       for (var mip = 0u; mip < mipCount; mip = mip + 1u) {
//           if (p.x >= x && p.x < x + w && p.y >= 0.0 && p.y <= h) {
//               let localUv = vec2f(
//                   (p.x - x) / w,
//                   p.y / h
//               );

//               let color = textureSampleLevel(tex, texSampler, localUv, f32(mip)).rgb;

//               let borderPx = 0.01;
//               let border =
//                   localUv.x < borderPx ||
//                   localUv.y < borderPx ||
//                   localUv.x > 1.0 - borderPx ||
//                   localUv.y > 1.0 - borderPx;

//               if (border) {
//                   return vec4f(1.0, 0.0, 0.0, 1.0);
//               }

//               return vec4f(color, 1.0);
//           }

//           x += w;
//           w *= 0.5;
//           h *= 0.5;
//       }

//       return vec4f(0.0, 0.0, 0.0, 1.0);
//   }
//             `,
//             colorOutputs: [{format: "rgba16float"}],
//             depthOutput: "depth24plus"
//         })
//     })

//     const texture = await GPU.Texture.Load("./assets/textures/T_OmniDebugTexture_COL.jpg");
//     sphereMesh.material.shader.SetTexture("tex", texture);
//     sphereMesh.material.shader.SetSampler("texSampler", new GPU.TextureSampler());

//       const aspect = texture.width / texture.height;
//   sphereGameObject.transform.scale.set(4 * aspect, 2, 1);

    const skyAtmosphere = new Sky();
    await skyAtmosphere.init();
    // const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    // const skyTexture = await HDRParser.ToCubemap(hdr);

    const skycubemap = skyAtmosphere.skyTextureCubemap;

    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

    iblLightingPass.SetEnvironment(skycubemap);
    skyboxPass.SetSkybox(skycubemap);

    const sphereGameObject = new GameObject();
    // sphereGameObject.transform.position.set(1, -1.5, 0);
    const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Sphere();
    sphereMesh.material = new PBRMaterial();

    // Water
    const waterGameObject = new GameObject();
    waterGameObject.transform.eulerAngles.x = -90;
    waterGameObject.transform.position.y = 5;
    waterGameObject.transform.scale.set(1024, 1024, 1);
    const water = waterGameObject.AddComponent(WaterV1);


        // // Debug
        // const container = document.createElement("div");
        // container.classList.add("stats-panel");
        // document.body.append(container);

        // const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
        // new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], value => water.settings.set("wave_speed", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], value => water.settings.set("beers_law", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Depth offset:", -10, 0, 0.01, water.settings.get("depth_offset")[0], value => water.settings.set("depth_offset", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], value => water.settings.set("refraction", [value, 0, 0, 0]));
        // new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], value => water.settings.set("foam_level", [value, 0, 0, 0]));
        // new UIColorStat(waterSettingsFolder, "Color deep:", new Mathf.Color(...water.settings.get("color_deep")).toHex().slice(0, 7), value => {
        //     const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
        //     water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
        // });
        // new UIColorStat(waterSettingsFolder, "Color shallow:", new Mathf.Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), value => {
        //     const c = Mathf.Color.fromHex(parseInt(value.slice(1, value.length), 16));
        //     water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
        // });

        
        // function addVecSetting(name: string, setting: any) {
        //     new UIVecStat(waterSettingsFolder, name,
        //         {value: setting[0], min: -1, max: 1, step: 0.01},
        //         {value: setting[1], min: -1, max: 1, step: 0.01},
        //         {value: setting[2], min: -1, max: 1, step: 0.01},
        //         {value: setting[3], min: -1, max: 1, step: 0.01},
        //         value => {
        //             water.settings.set(name, [value.x, value.y, value.z, value.w])
        //         }
        //     )
        // }

        // addVecSetting("sampler_scale", water.settings.get("sampler_scale"));
        // addVecSetting("uv_sampler_scale", water.settings.get("uv_sampler_scale"));

        // function addWaveStat(name: "wave_a" | "wave_b" | "wave_c", setting) {
        //     const wave = setting; //water.settings.get("wave_a");
        //     new UIVecStat(waterSettingsFolder, name,
        //         {value: wave[0], min: -1, max: 1, step: 0.01},
        //         {value: wave[1], min: -1, max: 1, step: 0.01},
        //         {value: wave[2], min: -1, max: 1, step: 0.01},
        //         {value: wave[3], min: -1, max: 1, step: 0.01},
        //         value => {
        //             water.settings.set(name, [value.x, value.y, value.z, value.w])
        //         }
        //     )
        // }


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
        lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

        skyAtmosphere.Update();
        iblLightingPass.SetEnvironment(skycubemap);
        skyboxPass.SetSkybox(skycubemap);
    }, 1000);

    {
        const skySettings = new UIFolder(Debugger.ui, "Sky");

        new UISliderStat(skySettings, "SUN_ELEVATION_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_ELEVATION_DEGREES, value => skyAtmosphere.SUN_ELEVATION_DEGREES = value);
        new UISliderStat(skySettings, "SUN_AZIMUTH_DEGREES:", 0, 180, 0.01, skyAtmosphere.SUN_AZIMUTH_DEGREES, value => skyAtmosphere.SUN_AZIMUTH_DEGREES = value);
        new UISliderStat(skySettings, "EYE_ALTITUDE:", 0, 1000, 0.01, skyAtmosphere.EYE_ALTITUDE, value => skyAtmosphere.EYE_ALTITUDE = value);

        // const o0 = new UITextureViewer(skySettings, "Sky output0:", skyAtmosphere.transmittanceLUT);
        // const o1 = new UITextureViewer(skySettings, "Sky output1:", skyTexture);

        skySettings.Open();
    }

    const offset = 10;
    const i = 5;
    for (let x = 0; x < i; x++) {
        for (let y = 0; y < i; y++) {

            const lightGameObject = new GameObject();
            lightGameObject.transform.position.set((x * offset) - i * 0.5 * 2, 6, (y * offset) - i * 0.5 * 2);
            const look = lightGameObject.transform.position.clone();
            look.y -= 1;
            lightGameObject.transform.LookAt(look);
            const light = lightGameObject.AddComponent(Components.PointLight);
            light.color.set(Math.random(), Math.random(), Math.random(), 1);
            light.range = 20;
            light.intensity = 10
            // light.angle = 90;
            light.castShadows = false;

            const sphereGameObject = new GameObject();
            sphereGameObject.transform.position.copy(lightGameObject.transform.position);
            const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
            sphereMesh.geometry = Geometry.Sphere();
            sphereMesh.material = new PBRMaterial({ albedoColor: light.color, emissiveColor: light.color, unlit: false });
        }
    }

    {
        const planeGO = new GameObject();
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, 3, 0);
        planeGO.transform.scale.set(10, 10, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1});
        sphereMesh.material = mat;
    }

{
        const planeGO = new GameObject();
        planeGO.transform.eulerAngles.x = -45;
        planeGO.transform.position.set(10, -5, 0);
        planeGO.transform.scale.set(10, 20, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        sphereMesh.geometry = Geometry.Plane();
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.0, roughness: 1});
        sphereMesh.material = mat;
    }
    Debugger.Enable();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);