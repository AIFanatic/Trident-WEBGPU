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

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = false;
    }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(100, 100, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        sphereMesh.AddMaterial(new PBRMaterial({albedoColor: new Mathf.Color(1, 0, 0), metalness: 1, roughness: 0}));
    }

    {
        const sphereGameObject = new GameObject(scene);
        sphereGameObject.transform.position.set(3, -1.5, 0);
        const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Sphere());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(0, 1, 1), metalness: 0.5, roughness: 0.1});
        sphereMesh.AddMaterial(mat);
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
        // const t = await GPU.Texture.Load("./assets/textures/HDR/drakensberg_solitary_mountain_puresky_1k.png", "bgra8unorm-srgb")
        // console.log("t", t)
        // const c = GPU.CubeTexture.Create(1024, 1024, 6, "bgra8unorm-srgb");
    
        // GPU.Renderer.BeginRenderFrame();
        // // +X face (Right)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [2048, 1024, 0] }, { texture: c, origin: [0, 0, 0] }, [1024, 1024, 1]);
        // // -X face (Left)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [0, 1024, 0] }, { texture: c, origin: [0, 0, 1] }, [1024, 1024, 1]);
        // // +Y face (Top)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 0, 0] }, { texture: c, origin: [0, 0, 2] }, [1024, 1024, 1]);
        // // -Y face (Bottom)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 2048, 0] }, { texture: c, origin: [0, 0, 3] }, [1024, 1024, 1]);
        // // +Z face (Front)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [1024, 1024, 0] }, { texture: c, origin: [0, 0, 4] }, [1024, 1024, 1]);
        // // -Z face (Back)
        // GPU.RendererContext.CopyTextureToTextureV3( { texture: t, origin: [3072, 1024, 0] }, { texture: c, origin: [0, 0, 5] }, [1024, 1024, 1]);
        // GPU.Renderer.EndRenderFrame();

        // scene.renderPipeline.skybox = c;

        const hdr = await HDRParser.Load("./assets/textures/HDR/dikhololo_night_1k.hdr");
        const sky = await HDRParser.ToCubemap(hdr);
    
        const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
        const prefilterMap = await HDRParser.GetPrefilterMap(sky);
        const brdfLUT = await HDRParser.GetBRDFLUT();
    
        scene.renderPipeline.skybox = sky;
        scene.renderPipeline.skyboxIrradiance = skyIrradiance;
        scene.renderPipeline.skyboxPrefilter = prefilterMap;
        scene.renderPipeline.skyboxBRDFLUT = brdfLUT;
    }

    scene.Start();
};

Application(document.querySelector("canvas"));