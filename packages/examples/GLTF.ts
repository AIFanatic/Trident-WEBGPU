import { Components, Scene, GPU, Mathf, GameObject, Geometry, IndexAttribute, PBRMaterial, VertexAttribute, Prefab } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Debugger } from "@trident/plugins/Debugger";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";
import { Sky } from "@trident/plugins/Environment/Sky";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu", 2);
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(2, 0, 0);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.castShadows = false;
    light.intensity = 2;

    // const lightHelper = lightGameObject.AddComponent(DirectionalLightHelper);
    // lightHelper.light = light;


    // const cube = new GameObject(scene);
    // cube.transform.position.y = 0.5;
    // const cubeMesh = cube.AddComponent(Components.Mesh);
    // cubeMesh.geometry = Geometry.Cube();
    // cubeMesh.material = new PBRMaterial();


    // const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/spruit_sunrise_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    // const sky = new Sky();
    // sky.SUN_ELEVATION_DEGREES = 60;
    // await sky.init();
    // const skyTexture = sky.skyTextureCubemap;

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    // const prefab = await GLTFLoader.LoadFromURL("./assets/models/DamagedHelmet/DamagedHelmet.gltf");
    const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/bouquet.glb");
    // const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/nature/overgrowth/patch_grass_medium.glb");
    // const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/tree-01/american_beech_a/american_beech_a.glb");
    // const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/ak47u.worldmodel.glb");
    // const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/semi_auto_rifle.worldmodel.glb");
    // const prefab = await GLTFLoader.LoadFromURL("/extra/test-assets/sphere/sphere.gltf");
    // const prefab = await GLTFLoader.LoadFromURL("./assets/models/Fox.glb");

    // prefab.traverse(prefab => {
    //     for (const component of prefab.components) {
    //         if (component.type === Components.Mesh.type) {
    //             const mat = GPU.Material.Deserialize(component.material) as PBRMaterial;
    //             // mat.params.doubleSided = true;
    //             mat.params.albedoColor.r = 29 / 255;
    //             mat.params.albedoColor.g = 33 / 255;
    //             mat.params.albedoColor.b = 21 / 255;
    //             mat.params.alphaCutoff = 0.25;
    //             // 29 33 21 255 0.25
    //             // mat.params.roughness = 10.0;

    //             return;
    //         }
    //     }
    // })
    const gameObject = scene.Instantiate(prefab);

    // const go = new GameObject(scene);
    // const mesh = go.AddComponent(Components.Mesh);
    // mesh.geometry = Geometry.Sphere();
    // mesh.material = new PBRMaterial({roughness: 0.0, metallic: 1.0});

    // {
    //     function traverse(objects: Prefab[], fn: (object: Prefab) => void) {
    //         for (const object of objects) {
    //             fn(object);
    //             for (const child of object.children) {
    //                 traverse([child], fn);
    //             }
    //         }
    //     }
        
    setTimeout(() => {
        
        const serialized = scene.Serialize();
        console.log("serialized", serialized)
    }, 1000);

    console.warn(`
        glb imports to:
            mesh
            material
            shader (always pbr)
            animation
            bones/skin

        even on editor create those files separately (can deal with animation and bones later)
    `)
        
    //     traverse(serialized.gameObjects, gameObject => {
    //         for (const componet of gameObject.components) {
    //             if (componet.type === Components.Mesh.type) {
    //                 console.log("MESH", componet)
    //                 componet.geometry.assetPath = "/extra/test-assets/DamagedHelmet.mesh";
    //                 componet.material.assetPath = "/extra/test-assets/DamagedHelmet.mat";
    //             }
    //         }
    //     })


    //     scene.Clear();
    //     scene.Deserialize(serialized);
    //     Components.Camera.mainCamera = scene.GetGameObjects()[0].GetComponents(Components.Camera)[0];
    //     const controls = new OrbitControls(canvas, Components.Camera.mainCamera);
    // }


    // Drag and drop models
    {
        window.addEventListener("dragover", (e) => {
            e.preventDefault(); // allow drop
        });

        window.addEventListener("drop", async (e) => {
            e.preventDefault();

            const file = e.dataTransfer?.files?.[0];
            if (!file) return;

            const url = URL.createObjectURL(file);
            const prefab = await GLTFLoader.LoadFromURL(url, "glb");
            const obj = scene.Instantiate(prefab);

            console.log(obj)
        });
    }
    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));