import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Prefab,
    VertexAttribute,
    IndexAttribute,
    InterleavedVertexAttribute,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";


import { Meshoptimizer } from "@trident/plugins/meshoptimizer/Meshoptimizer";
import { MeshletDraw } from "@trident/plugins/meshlets_v4/passes/MeshletDraw";
import { MeshletMesh } from "@trident/plugins/meshlets_v4/MeshletMesh";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { LODInstanceRenderable } from "@trident/plugins/LODGroup";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    // const floor = new GameObject(scene);
    // floor.transform.position.y = -0.5;
    // floor.transform.scale.set(100, 100, 100);
    // floor.transform.eulerAngles.x = -90;
    // const meshbottom = floor.AddComponent(Components.Mesh);
    // meshbottom.geometry = Geometry.Plane();
    // meshbottom.material = new PBRMaterial();

    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();

    const model = await GLTFLoader.LoadFromURL("./assets/models/bunny.glb");
    const material = new PBRMaterial({ albedoMap: await GPU.Texture.Load("/dist/examples/assets/textures/T_OmniDebugTexture_COL.jpg"), roughness: 1.0, metalness: 0.0, alphaCutoff: 0.1 });
    Scene.Instantiate(model);
    console.log("model", model)

    function traverse(object3D: Prefab, func: (o: Prefab) => void | Promise<void>) {
        func(object3D);
        for (const child of object3D.children) traverse(child, func);
    }

    let geometry: Geometry;
    traverse(model, prefab => {
        for (const component of prefab.components) {
            if (component.type === Components.Mesh.type) {
                geometry = new Geometry();
                geometry.Deserialize(component.renderable.geometry);
            }
        }
    })
    geometry.ComputeBoundingVolume();
    geometry = geometry.Center();

    function MakeInstanced(instancedMesh: Components.InstancedMesh, rotation?: Mathf.Quaternion, scale?: Mathf.Vector3) {
        const p = new Mathf.Vector3();
        const q = rotation || new Mathf.Quaternion();
        const s = scale || new Mathf.Vector3(1, 1, 1);
        const m = new Mathf.Matrix4();
        const c = 10;
        const off = 10;
        const half = c * off * 0.5;
        let i = 0;
        for (let x = 0; x < c; x++) {
            for (let y = 0; y < c; y++) {
                for (let z = 0; z < c; z++) {
                    p.set(x * off - half, y * off - half, z * off - half);
                    m.compose(p, q, s);
                    instancedMesh.SetMatrixAt(i, m);
                    i++;
                }
            }
        }
    }

    // // Billboards
    // {
    //     const sampleTexture = await GPU.Texture.Load("/dist/examples/assets/textures/T_OmniDebugTexture_COL.jpg");
    //     // const sampleTexture = await GPU.Texture.Load("/packages/examples/assets/models/tree/branch.png", "rgba8unorm-srgb");

    //     const angles = [[0, 0, 0], [0, 45, 0], [0, 90, 0], [0, -45, 0], [90, 0, 0]];
    //     // const angles = [[0, 0, 0]];
    //     const radius = geometry.boundingVolume.radius;

    //     for (const angle of angles) {
    //         const billboardTexture = GPU.RenderTexture.Create(128, 128, 1, "rgba16float");
    //         const positon = new Mathf.Vector3(0, 0, 0);
    //         const rotation = new Mathf.Quaternion(0, 0, 0).setFromEuler(new Mathf.Vector3(angle[0], angle[1], angle[2]), true);
    //         const scale = new Mathf.Vector3(1 / radius, 1 / radius, 1 / radius);
    //         const modelMatrix = new Mathf.Matrix4().compose(positon, rotation, scale);
    //         await Billboarder.Create(geometry, modelMatrix, billboardTexture, sampleTexture);

    //         // const billboard = new GameObject(scene);
    //         // billboard.transform.rotation.setFromEuler(new Mathf.Vector3(-angle[0], -angle[1], -angle[2]), true);
    //         // billboard.transform.position.set(4, 1, 0);
    //         // billboard.transform.scale.set(radius, radius, radius);
    //         // const billboardMesh = billboard.AddComponent(Components.Mesh);
    //         // billboardMesh.geometry = Geometry.Plane();
    //         // billboardMesh.material = new PBRMaterial({ albedoMap: billboardTexture, doubleSided: true, roughness: 1.0, metalness: 0, alphaCutoff: 0.1 });


    //         const gameObject = new GameObject(scene);
    //         const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //         instancedMesh.geometry = Geometry.Plane();
    //         instancedMesh.material = new PBRMaterial({ albedoMap: billboardTexture, doubleSided: true, roughness: 1.0, metalness: 0, alphaCutoff: 0.1 });

    //         MakeInstanced(instancedMesh, new Mathf.Quaternion().setFromEuler(new Mathf.Vector3(-angle[0], -angle[1], -angle[2]), true), new Mathf.Vector3(radius, radius, radius));
    //     }
    // }

    // Impostors
    {
        const radius = 1;
        console.log(radius)
        const impostorGameObject = new GameObject(scene);
        const impostor = impostorGameObject.AddComponent(ImpostorMesh);
        await impostor.Create(geometry, material);
        
        const gameObject = new GameObject(scene);
        const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
        instancedMesh.geometry = impostor.geometry;
        instancedMesh.material = impostor.material;

        MakeInstanced(instancedMesh, new Mathf.Quaternion(), new Mathf.Vector3(radius, radius, radius));
    }

    // // Meshoptimizer, simplified, minimum
    // {

    //     const indices = new Uint32Array(geometry.index.array);
    //     const vertices = geometry.attributes.get("position").array as Float32Array;
    //     const normals = geometry.attributes.get("normal").array as Float32Array;
    //     const uvs = geometry.attributes.get("uv").array as Float32Array;

    //     await Meshoptimizer.load();
    //     const result = Meshoptimizer.meshopt_simplify(indices, vertices, vertices.length / 3,  8, 128, 1000, 0);
    //     console.log(indices.length / 3, result.destination.length / 3)

    //     const gameObject = new GameObject(scene);
    //     const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //     instancedMesh.geometry = geometry.Clone();
    //     instancedMesh.geometry.index = new IndexAttribute(result.destination);
    //     instancedMesh.material = material;
    //     MakeInstanced(instancedMesh);
    // }

    // // Meshlets
    // {
    //     scene.renderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
    //     geometry.ComputeNormals();
    //     geometry.ComputeTangents();

    //     const c = 50;
    //     const off = 10;
    //     const half = c * off * 0.5;
    //     for (let x = 0; x < c; x++) {
    //         for (let y = 0; y < c; y++) {
    //             for (let z = 0; z < c; z++) {
    //                 const go2 = new GameObject(scene);
    //                 const meshletB = go2.AddComponent(MeshletMesh);
    //                 meshletB.transform.position.set(x * off - half, y * off - half, z * off - half);
    //                 meshletB.geometry = geometry;
    //                 meshletB.material = material;
    //             }
    //         }
    //     }
    // }

    // // LODS
    // {
    //     const lodGameObject = new GameObject(scene);
    //     const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);

    //     const indices = new Uint32Array(geometry.index.array);
    //     const vertices = geometry.attributes.get("position").array as Float32Array;
    //     await Meshoptimizer.load();

    //     let lastGeometry: Geometry
    //     const lodScreenSizes = [10, 20, 100, 300]
    //     const maxLods = 4;
    //     const ratio = Math.floor(indices.length / maxLods);
    //     lodInstanceRenderable.lods.push({ renderers: [{geometry: geometry.Clone(), material: material.clone()}], screenSize: 5 });
    //     for (let lod = 0; lod < maxLods; lod++) {
    //         const target_index_count = indices.length - (lod + 1) * ratio || 1;
    //         const result = Meshoptimizer.meshopt_simplify(indices, vertices, vertices.length / 3, 3, target_index_count, 1000, 0);
    //         console.log(indices.length / 3, result.destination.length / 3, 20 + lod * 20)

    //         const lodGeometry = geometry.Clone();
    //         lodGeometry.index = new IndexAttribute(result.destination);
    //         lodInstanceRenderable.lods.push({ renderers: [{geometry: lodGeometry, material: material.clone()}], screenSize: 20 + lod * 20 });
    //         lastGeometry = lodGeometry;
    //     }
    //     lodInstanceRenderable.lods.push({ renderers: [{geometry: lastGeometry, material: material.clone()}], screenSize: 10000 });

    //     MakeInstanced(lodInstanceRenderable);
    // }

    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));