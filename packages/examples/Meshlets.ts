import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
    Runtime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

import { MeshletMesh as MeshletMesh } from "@trident/plugins/meshlets/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    // TODO: Should be added automatically from plugin
    Runtime.Renderer.RenderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 20;
    light.color.set(1, 1, 1, 1);
    light.castShadows = true;

    // {
    //     const mesh = await OBJLoaderIndexed.load("/dist/examples/assets/models/bunny.obj");
    //     mesh.geometry.ComputeTangents();
    //     const mat = new PBRMaterial({ albedoMap: await GPU.Texture.Load("/dist/examples/assets/textures/brick.png") })
    //     // const mesh = await OBJLoaderIndexed.load("/extra/test-assets/tree-01/tree-01.obj");
    //     const meshletGameObject = new GameObject();
    //     meshletGameObject.transform.position.x = -2;
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
    //     meshletMesh.enableShadows = false;
    //     meshletMesh.geometry = mesh.geometry;
    //     meshletMesh.material = mat;


    //     // const c = 10;
    //     // const off = 100;
    //     // for (let i = 0; i < c; i++) {
    //     //     const go2 = new GameObject();
    //     //     const meshletB = go2.AddComponent(MeshletMesh);
    //     //     meshletB.geometry = mesh.geometry;
    //     //     meshletB.transform.position.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
    //     //     meshletB.material = mat;
    //     // }
    // }



    {
        const mesh = await OBJLoaderIndexed.load("/dist/examples/assets/models/bunny.obj");
        // const mesh = await OBJLoaderIndexed.load("/extra/test-assets/lucy.obj");
        mesh.geometry.ComputeNormals();
        mesh.geometry.ComputeTangents();
        const mat = new PBRMaterial({albedoMap: await GPU.Texture.Load("/dist/examples/assets/textures/brick.png")})
        // const mesh = await OBJLoaderIndexed.load("/extra/test-assets/tree-01/tree-01.obj");
        const meshletGameObject = new GameObject();
        meshletGameObject.transform.position.x = 2;
        const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
        meshletMesh.enableShadows = false;
        meshletMesh.geometry = mesh.geometry;
        meshletMesh.material = mat;


        const c = 20;
        const off = 10;
        for (let x = 0; x < c; x++) {
            for (let y = 0; y < c; y++) {
                for (let z = 0; z < c; z++) {
                    const go2 = new GameObject();
                    const meshletB = go2.AddComponent(MeshletMesh);
                    meshletB.geometry = mesh.geometry;
                    meshletB.transform.position.set(x * off,y * off,z * off);
                    meshletB.material = mat;
                }
            }
        }
        // for (let i = 0; i < c; i++) {
        //     const go2 = new GameObject();
        //     const meshletB = go2.AddComponent(MeshletMesh);
        //     meshletB.geometry = mesh.geometry;
        //     meshletB.transform.position.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
        //     meshletB.material = mat;
        // }
    }






    // {
    //     const loadedGO = await GLTFLoader.Load("/extra/test-assets/trellis2/rock_pile.glb", scene);

    //     let mesh: { geometry: Geometry, material: GPU.Material };
    //     const loadedMeshes = loadedGO.GetComponentsInChildren(Components.Mesh);
    //     for (const m of loadedMeshes) {
    //         console.log("GOT IT", m)
    //         mesh = {
    //             geometry: m.geometry,
    //             material: m.material
    //         }
    //         mesh.geometry.ComputeTangents();
    //     }
    //     loadedGO.Destroy();

    //     console.log(mesh)

        const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
        const skyTexture = await HDRParser.ToCubemap(hdr);
    
        const environment = new Environment(scene, skyTexture);
        await environment.init();
        
    //     const meshletGameObject = new GameObject();
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
    //     meshletMesh.enableShadows = false;
    //     meshletMesh.geometry = mesh.geometry;
    //     meshletMesh.material = new PBRMaterial({albedoColor: new Mathf.Color(1,1,1,1), roughness: 0.99, metalness: 0.01, wireframe: false});
    // }

    Runtime.Play();
};

Application(document.querySelector("canvas"));