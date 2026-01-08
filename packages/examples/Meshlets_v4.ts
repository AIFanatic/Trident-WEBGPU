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

import { MeshletMesh as MeshletMesh } from "@trident/plugins/meshlets_v4/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets_v4/passes/MeshletDraw";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.5, 50000);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    // TODO: Should be added automatically from plugin
    scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);

    const lightGameObject = new GameObject(scene);
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
    //     const meshletGameObject = new GameObject(scene);
    //     meshletGameObject.transform.position.x = -2;
    //     const meshletMesh = meshletGameObject.AddComponent(MeshletMesh);
    //     meshletMesh.enableShadows = false;
    //     meshletMesh.geometry = mesh.geometry;
    //     meshletMesh.material = mat;


    //     // const c = 10;
    //     // const off = 100;
    //     // for (let i = 0; i < c; i++) {
    //     //     const go2 = new GameObject(scene);
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
        const meshletGameObject = new GameObject(scene);
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
                    const go2 = new GameObject(scene);
                    const meshletB = go2.AddComponent(MeshletMesh);
                    meshletB.geometry = mesh.geometry;
                    meshletB.transform.position.set(x * off,y * off,z * off);
                    meshletB.material = mat;
                }
            }
        }
        // for (let i = 0; i < c; i++) {
        //     const go2 = new GameObject(scene);
        //     const meshletB = go2.AddComponent(MeshletMesh);
        //     meshletB.geometry = mesh.geometry;
        //     meshletB.transform.position.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
        //     meshletB.material = mat;
        // }
    }






    // {
    //     function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
    //         for (const gameObject of gameObjects) {
    //             fn(gameObject);
    //             for (const child of gameObject.transform.children) {
    //                 traverse([child.gameObject], fn);
    //             }
    //         }
    //     }

    //     const tree1 = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-01/tree-01.glb");

    //     let lodGroupEntries: { geometry: Geometry, material: GPU.Material }[] = []
    //     traverse([tree1], gameObject => {
    //         const mesh = gameObject.GetComponent(Components.Mesh);
    //         if (mesh) {
    //             const geometrySerialized = mesh.geometry.Serialize();
    //             const materialSerialized = mesh.material.Serialize();
    //             const materialClone = GPU.Material.Deserialize(materialSerialized);
    //             const geometryClone = new Geometry();
    //             geometryClone.Deserialize(geometrySerialized);

    //             lodGroupEntries.push({ geometry: geometryClone, material: materialClone });
    //         }
    //     })
    //     tree1.Destroy();

    //     // console.log(lodGroupEntries[0])

    //     console.log(lodGroupEntries[0].material.params)
    //     // (lodGroupEntries[0].material as PBRMaterial).params.albedoColor.set(1, 0, 0, 1)

    //     const entries = lodGroupEntries.slice(0, 2);
    //     for (const treeLOD of entries) {
    //         const go2 = new GameObject(scene);
    //         const meshletB = go2.AddComponent(MeshletMesh);
    //         meshletB.geometry = treeLOD.geometry;
    //         meshletB.material = treeLOD.material;
    //     }

    //     const c = 10000;
    //     const off = 1000;
    //     for (let i = 0; i < c; i++) {
    //         const x = Mathf.RandomRange(-off, off);
    //         const z = Mathf.RandomRange(-off, off);
    //         for (const treeLOD of entries) {
    //             const go2 = new GameObject(scene);
    //             go2.transform.position.set(x, 0, z);
    //             const meshletB = go2.AddComponent(MeshletMesh);
    //             meshletB.geometry = treeLOD.geometry;
    //             meshletB.material = treeLOD.material;
    //         }
    //     }
    // }

    scene.Start();
};

Application(document.querySelector("canvas"));