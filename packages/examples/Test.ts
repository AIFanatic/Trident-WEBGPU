import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

import { MeshletMeshV3 } from "@trident/plugins/meshlets_v3/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets_v3/passes/MeshletDraw";
import { Debugger } from "@trident/plugins/Debugger";
import { SSSRenderPass } from "@trident/plugins/SSS";
import { UIButtonStat, UIFolder, UISliderStat } from "@trident/plugins/ui/UIStats";
import { HDRParser } from "@trident/plugins/HDRParser";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 50000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 1;
    light.color.set(1, 1, 1, 1);
    light.castShadows = false;

    // const floorGameObject = new GameObject(scene);
    // floorGameObject.transform.scale.set(100, 100, 1);
    // floorGameObject.transform.eulerAngles.x = -90;
    // const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    // floorMesh.geometry = Geometry.Plane();
    // floorMesh.material = new PBRMaterial();

    // TODO: Should be added automatically from plugin
    scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
    
    // {
    //     const mesh = await OBJLoaderIndexed.load("./assets/models/bunny.obj");
    //     const meshletGameObject = new GameObject(scene);
    //     meshletGameObject.transform.position.x = -2;
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMeshV3);
    //     meshletMesh.enableShadows = false;
    //     meshletMesh.geometry = mesh.geometry;
    //     meshletMesh.material = mesh.material;
    // }

    
    // {
    //     const mesh = await OBJLoaderIndexed.load("./assets/models/suzanne.obj");
    //     const meshletGameObject = new GameObject(scene);
    //     meshletGameObject.transform.position.x = 2;
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMeshV3);
    //     meshletMesh.enableShadows = false;
    //     meshletMesh.geometry = mesh.geometry;
    //     meshletMesh.material = mesh.material;
    // }
    
    Debugger.Enable();

    // scene.Start();




    {
        async function traverse(gameObjects: GameObject[], fn: (go: GameObject) => Promise<boolean>) {
            for (const go of gameObjects) {
                if (!await fn(go)) continue;
                for (const child of go.transform.children) {
                    await traverse([child.gameObject], fn);
                }
            }
        }

        const tempScene = new Scene(renderer);
        // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/GLTF/scenes/Sponza/Sponza.gltf");
        // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/happy-buddha.glb");
        const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "/extra/dist_bak/test-assets/GLTF/scenes/Bistro.glb");
        // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/extra/dist_bak/test-assets/DamagedHelmet/DamagedHelmet.gltf");
        // const gameObjects = await GLTFLoader.loadAsGameObjects(tempScene, "/dist/examples/assets/models/Monkey_Bunny.glb");
        // console.log(gameObjects)

        // // await traverse(gameObjects, async gameObject => {
        // //     const mesh = gameObject.GetComponent(Components.Mesh);
        // //     if (mesh) {
        // //         const geometry = mesh.geometry;
        // //         const material = mesh.material;
        // //         gameObject.componentsByCtor.delete(mesh.constructor);
        // //         const index = gameObject.allComponents.indexOf(mesh);
        // //         if (index !== -1) gameObject.allComponents.splice(index, 1);
        // //         scene.componentsByType.delete(mesh.contructor)

        // //         const newMesh = gameObject.AddComponent(MeshletMesh);
        // //         await newMesh.SetGeometry(geometry, true);
        // //         newMesh.material = material;

        // //         // newMesh.material = new PBRMaterial();
        // //     }
        // // });

        // const oldToNewMap: Map<GameObject, GameObject> = new Map();
        // // First pass: Create all GameObjects
        // await traverse(gameObjects, async gameObject => {
        //     const newGameObject = new GameObject(scene);
        //     newGameObject.name = gameObject.name;
        //     newGameObject.transform.position.copy(gameObject.transform.position);
        //     newGameObject.transform.rotation.copy(gameObject.transform.rotation);
        //     newGameObject.transform.scale.copy(gameObject.transform.scale);
        //     oldToNewMap.set(gameObject, newGameObject);
        //     return true;
        // })
        // // Second pass create hierarchy
        // await traverse(gameObjects, async oldGameObject => {
        //     const newGameObject = oldToNewMap.get(oldGameObject)!;
        //     const parentOld = oldGameObject.transform.parent?.gameObject;
        //     const parentNew = parentOld ? oldToNewMap.get(parentOld) : undefined;
        //     if (parentNew) newGameObject.transform.parent = parentNew.transform;
        //     return true;
        // });

        // let i = 0;
        // let delay = 0;

        // let meshes = []
        // const mat = new PBRMaterial();
        // await traverse(gameObjects, async oldGameObject => {
        //     // if (i > 100) return true;
        //     // i++;

        //     const newGameObject = oldToNewMap.get(oldGameObject)!;
        //     const mesh = oldGameObject.GetComponent(Components.Mesh);
        //     if (!mesh) return true;

        //     // setTimeout(async () => {
        //         const newMesh = newGameObject.AddComponent(MeshletMeshV3);
        //         newMesh.geometry = mesh.geometry;
        //         newMesh.material = mat;
        //         newMesh.enableShadows = false;
        //         console.log(`Parsed ${i}/3064`);
        //         i++;
        //     // }, delay);
        //     delay += 100;


        //     return true;
        // });
        // console.log(meshes)



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
        

        {
            const sss = new SSSRenderPass(light);
            scene.renderPipeline.AddPass(sss, GPU.RenderPassOrder.AfterLighting);
    
            // Debug
            const sssDebugFolder = new UIFolder(Debugger.ui, "Plugin - ScreenSpaceShadows");
            sssDebugFolder.Open();
            new UIButtonStat(sssDebugFolder, "Enable:", state => { sss.Enabled = state }, sss.Enabled);
            new UISliderStat(sssDebugFolder, "Blend Shadow Strength:", 0, 1, 0.01, sss.BlendShadowStrength, value => {sss.BlendShadowStrength = value});
            new UISliderStat(sssDebugFolder, "Surface Thickness:", 0, 1, 0.001, sss.SurfaceThickness, value => {sss.SurfaceThickness = value});
            new UISliderStat(sssDebugFolder, "Bilinear Threshold:", 0, 1, 0.001, sss.BilinearThreshold, value => {sss.BilinearThreshold = value});
            new UISliderStat(sssDebugFolder, "ShadowContrast:", 0, 16, 1, sss.ShadowContrast, value => {sss.ShadowContrast = value});
            new UIButtonStat(sssDebugFolder, "Ignore Edge Pixels:", state => { sss.IgnoreEdgePixels = state }, sss.IgnoreEdgePixels);
            new UIButtonStat(sssDebugFolder, "Use Precision Offset:", state => { sss.UsePrecisionOffset = state }, sss.UsePrecisionOffset);
            new UIButtonStat(sssDebugFolder, "Bilinear Sampling Offset Mode:", state => { sss.BilinearSamplingOffsetMode = state }, sss.BilinearSamplingOffsetMode);
            new UIButtonStat(sssDebugFolder, "Debug Output Edge Mask:", state => { sss.DebugOutputEdgeMask = state }, sss.DebugOutputEdgeMask);
            new UIButtonStat(sssDebugFolder, "Debug Output Thread Index:", state => { sss.DebugOutputThreadIndex = state }, sss.DebugOutputThreadIndex);
            new UIButtonStat(sssDebugFolder, "Debug Output Wave Index:", state => { sss.DebugOutputWaveIndex = state }, sss.DebugOutputWaveIndex);
            new UIButtonStat(sssDebugFolder, "Use Early Out:", state => { sss.UseEarlyOut = state }, sss.UseEarlyOut);
        }
        scene.Start();
    }

};

Application(document.querySelector("canvas"));