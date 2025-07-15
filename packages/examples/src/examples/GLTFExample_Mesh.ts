import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { PBRMaterial } from "../renderer/Material";
import { DirectionalLight } from "../components/Light";

import { GLTFLoad, GLTFLoader } from "../plugins/GLTF/gltf";
import { Color } from "../math/Color";
import { Mesh } from "../components/Mesh";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { Component } from "../components/Component";
import { Utils } from "../utils/Utils";
import { Texture } from "../renderer/Texture";
import { InstancedMesh } from "../components/InstancedMesh";
import { Matrix4 } from "../math/Matrix4";
import { Quaternion } from "../math/Quaternion";

// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-5);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    // // const damagedHelmet = await GLTFLoad("./bunny.gltf");
    // const damagedHelmet = await GLTFLoad("./assets/DamagedHelmet/DamagedHelmet.gltf");
    // // const damagedHelmet = await loadModel("./assets/modular_mecha_doll_neon_mask/scene.gltf");
    // console.log(damagedHelmet);

    // for (const node of damagedHelmet.nodes) {
    //     if (node.mesh === undefined) continue;

    //     const meshId = node.mesh;
    //     const mesh = damagedHelmet.meshes[meshId];

    //     if (mesh === undefined) continue;

    //     const damagedHelmetGameObject = new GameObject(scene);
    //     damagedHelmetGameObject.transform.position.x = 2
    //     const damagedHelmetMesh = damagedHelmetGameObject.AddComponent(MeshletMesh);

    //     const damagedHelmetGeometry = new Geometry();
    //     damagedHelmetGeometry.attributes.set("position", new VertexAttribute(mesh.positions.buffer.data as Float32Array));
    //     if (mesh.normals) damagedHelmetGeometry.attributes.set("normal", new VertexAttribute(mesh.normals.buffer.data as Float32Array));
    //     if (mesh.texCoord) damagedHelmetGeometry.attributes.set("uv", new VertexAttribute(mesh.texCoord.buffer.data as Float32Array));
    //     if (mesh.indices) damagedHelmetGeometry.index = new IndexAttribute(new Uint32Array(mesh.indices.data));

    //     console.log(damagedHelmetGeometry);

    //     await damagedHelmetMesh.SetGeometry(damagedHelmetGeometry);

    //     const material = damagedHelmet.materials[meshId];
    //     let mat2;
    //     if (material) {
    //         console.log(material)
    //         // const d = document.createElement("img");

    //         const params: PBRMaterialParams = {
    //             albedoColor: new Color(material.baseColorFactor[0], material.baseColorFactor[1], material.baseColorFactor[2], material.baseColorFactor[3]),
    //             emissiveColor: new Color(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2], 0),
    //             roughness: material.roughnessFactor,
    //             metalness: material.metallicFactor,
    //             unlit: false
    //         };
    //         if (material.baseColorTexture) params.albedoMap = await Texture.LoadImageSource(material.baseColorTexture);
    //         if (material.normalTexture) params.normalMap = await Texture.LoadImageSource(material.normalTexture);
    //         if (material.metallicRoughnessTexture) params.metalnessMap = await Texture.LoadImageSource(material.metallicRoughnessTexture);
    //         if (material.emissiveTexture) params.emissiveMap = await Texture.LoadImageSource(material.emissiveTexture);
        
    //         const mat = new PBRMaterial(params);
    //         damagedHelmetMesh.AddMaterial(mat);
    //         mat2 = mat;

    //     }

    //     // setTimeout(() => {
    //     //     console.log("CHAnigng")
    //     //     damagedHelmetGameObject.transform.position.x = 2
    //     // }, 2000);



    //     // // const planeGeometry = Geometry.Cube();
    //     // const planeGeometry = damagedHelmetGeometry;
    //     // const mat = new PBRMaterial({albedoColor: new Color(1, 0, 0, 1), unlit: true});

    //     // let c = 20;
    //     // for (let x = 0; x < c; x++) {
    //     //     for (let y = 0; y < c; y++) {
    //     //         const planeGO = new GameObject(scene);
    //     //         planeGO.transform.position.x = x * 2;
    //     //         // planeGO.transform.position.y = y * 2;
    //     //         planeGO.transform.position.z = y * 2;
    //     //         const mesh = planeGO.AddComponent(MeshletMesh);
    //     //         await mesh.SetGeometry(planeGeometry);
    //     //         mesh.AddMaterial(mat2);
    //     //     }
    //     // }
    //     break;
    // }

    async function addMesh(url: string, type: "meshlet" | "mesh", position: Vector3, scale: Vector3): Promise<Mesh> {
        const bunnyGeometry = await OBJLoaderIndexed.load(url);
    
        const gameObject = new GameObject(scene);
        gameObject.transform.position.copy(position);
        gameObject.transform.scale.copy(scale);
        const mesh = type === "meshlet" ? gameObject.AddComponent(MeshletMesh) : gameObject.AddComponent(Mesh);
        await mesh.SetGeometry(bunnyGeometry, true);
        
        // const albedo = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_albedo.png");
        // const normal = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_normal-ogl.png");
        // const metalness = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_metallic.png");
        // const ao = await Texture.Load("./assets/textures/brick-wall-unity/brick-wall_ao.png");
    
        const mat = new PBRMaterial({
            // albedoColor: new Color(1,1,1,1)
            // albedoMap: albedo,
            // normalMap: normal,
            // metalnessMap: metalness,
            // // aoMap: ao
            // // roughness: 0.1,
            // // metalness: 0.3
        });
        mesh.AddMaterial(mat);

        return mesh;
    }

    // const mesh1 = await addMesh("./bunny.obj", "meshlet", new Vector3(0,0,0), new Vector3(0.01, 0.01, 0.01));
    // const mesh2 = await addMesh("./assets/suzanne.obj", "mesh", new Vector3(2,0,0), new Vector3(1,1,1));


    // mesh2.transform.parent = mesh1.transform;
    // setTimeout(() => {
    //     console.log("Updating");
    //     mesh1.transform.position.x = 2;
    //     setTimeout(() => {
    //         console.log("Updating");
    //         mesh2.transform.position.x = 4;
    //         setTimeout(() => {
    //             console.log("Updating");
    //             mesh1.transform.position.x = 4;
    //         }, 3000);
    //     }, 3000);
    // }, 3000);

    // await addMesh("./bunny.obj", "meshlet", new Vector3(-2,0,0), new Vector3(0.01, 0.01, 0.01));
    const bunny = await OBJLoaderIndexed.load("./bunny.obj");
    // const bunnyGeometry = new Geometry();
    // bunnyGeometry.attributes.set("position", new VertexAttribute(bunny.vertices));
    // if (bunny.normals) bunnyGeometry.attributes.set("normal", new VertexAttribute(bunny.normals));
    // if (bunny.uvs) bunnyGeometry.attributes.set("uv", new VertexAttribute(bunny.uvs));
    // if (bunny.indices) bunnyGeometry.index = new IndexAttribute(new Uint32Array(bunny.indices));

    // // const bunnyGameObject = new GameObject(scene);
    // // bunnyGameObject.transform.scale.set(0.01, 0.01, 0.01);
    // // const bunnyMesh = bunnyGameObject.AddComponent(MeshletMesh);
    // // await bunnyMesh.SetGeometry(bunnyGeometry);
    
    // const mat = new PBRMaterial();
    // // bunnyMesh.AddMaterial(mat);

    // let c = 2;
    // for (let x = 0; x < c; x++) {
    //     for (let y = 0; y < c; y++) {
    //         const planeGO = new GameObject(scene);
    //         planeGO.transform.scale.set(0.01, 0.01, 0.01);
    //         planeGO.transform.position.x = x * 2;
    //         // planeGO.transform.position.y = y * 2;
    //         planeGO.transform.position.z = y * 2;
    //         const mesh = planeGO.AddComponent(Mesh);
    //         await mesh.SetGeometry(bunny[0].geometry);
    //         mesh.AddMaterial(bunny[0].material);
    //     }
    // }

    // const damagedHelmet = await GLTFLoader.load("./assets/GLTFScenes/Sponza/Sponza.gltf", scene, MeshletMesh);
    // const damagedHelmet = await GLTFLoader.load("./assets/GLTFScenes/AntiqueCamera/AntiqueCamera.gltf", scene, MeshletMesh);
    // const damagedHelmet = await GLTFLoader.load("./assets/GLTFScenes/rusty_old_truck_free_raw_scan/scene.gltf", scene, Mesh);
    // const damagedHelmet = await GLTFLoader.load("./assets/GLTFScenes/SketchBook/world.gltf");

    // const damagedHelmet = await GLTFLoader.load("./assets/Tree-same/Tree.gltf");
    const damagedHelmet = await GLTFLoader.load("./bunny.gltf");
    // const damagedHelmet = await OBJLoaderIndexed.load("./assets/trees9.obj")
    // const damagedHelmet = await GLTFLoader.load("./assets/low_poly_tree_scene_free/grass/grass.gltf");
    // const damagedHelmet = await GLTFLoader.load("./assets/low_poly_tree_pack/pine.gltf");

    let gameObjects: GameObject[] = [];
    const c = 2;
    for (let x = 0; x < c; x++) {
        for (let y = 0; y < c; y++) {
            for (const o of damagedHelmet) {
                if (o.geometry?.attributes.size !== 3) continue;
                const gameObject = new GameObject(scene);
                const mesh = gameObject.AddComponent(MeshletMesh);
                if (o.geometry !== null) await mesh.SetGeometry(o.geometry, true);
                if (o.material !== null) {
                    // const o = new PBRMaterial();
                    mesh.AddMaterial(o.material);
                }
        
                console.log("Placfing")
                if (o.localMatrix !== null) {
                    gameObject.transform.localToWorldMatrix.premultiply(o.localMatrix);
                    // o.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
                }
        
                // gameObject.transform.rotation.fromEuler(new Vector3(0, Math.random() * 180, 0), true);
                gameObject.transform.eulerAngles.x = 90;
                gameObject.transform.position.set(x * 10, 0, y * 10);
                gameObject.transform.scale.set(0.01, 0.01, 0.01)

                gameObjects.push(gameObject);
            }
        }
    }

    scene.Start();
};

Application();