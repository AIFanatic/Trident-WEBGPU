import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { MeshletMesh } from "../components/MeshletMesh";
import { Vector3 } from "../math/Vector3";
import { DeferredMeshMaterial, DeferredMeshMaterialParams } from "../renderer/Material";
import { Texture } from "../renderer/Texture";
import { DirectionalLight } from "../components/Light";

import { loadModel } from "../plugins/GLTF2/gltf";
import { Color } from "../math/Color";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { FQMR } from "../plugins/meshlets/FQMR";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Mesh } from "../components/Mesh";

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
    mainCameraGameObject.transform.position.set(0,0,-15);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,1));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(4, 4, 0);
    lightGameObject.transform.LookAt(new Vector3(0, 0, 0))
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.range = 100;
    light.color.set(1, 1, 1, 1);

    const damagedHelmet = await loadModel("./assets/DamagedHelmet/DamagedHelmet.gltf");
    // const damagedHelmet = await loadModel("./assets/modular_mecha_doll_neon_mask/scene.gltf");
    console.log(damagedHelmet);

    for (const node of damagedHelmet.nodes) {
        if (node.mesh === undefined) continue;

        const meshId = node.mesh;
        const mesh = damagedHelmet.meshes[meshId];

        if (mesh === undefined) continue;

        const damagedHelmetGeometry = new Geometry();
        damagedHelmetGeometry.attributes.set("position", new VertexAttribute(mesh.positions.buffer.data as Float32Array));
        if (mesh.normals) damagedHelmetGeometry.attributes.set("normal", new VertexAttribute(mesh.normals.buffer.data as Float32Array));
        if (mesh.texCoord) damagedHelmetGeometry.attributes.set("uv", new VertexAttribute(mesh.texCoord.buffer.data as Float32Array));
        if (mesh.indices) damagedHelmetGeometry.index = new IndexAttribute(new Uint32Array(mesh.indices.data));

        const material = damagedHelmet.materials[meshId];
        const params: DeferredMeshMaterialParams = {
            albedoColor: new Color(material.baseColorFactor[0], material.baseColorFactor[1], material.baseColorFactor[2], material.baseColorFactor[3]),
            emissiveColor: new Color(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2], 0),
            roughness: material.roughnessFactor,
            metalness: material.metallicFactor,
            unlit: false
        };
        if (material.baseColorTexture) params.albedoMap = await Texture.LoadImageSource(material.baseColorTexture);
        if (material.normalTexture) params.normalMap = await Texture.LoadImageSource(material.normalTexture);
        if (material.metallicRoughnessTexture) params.metalnessMap = await Texture.LoadImageSource(material.metallicRoughnessTexture);
        if (material.emissiveTexture) params.emissiveMap = await Texture.LoadImageSource(material.emissiveTexture);
    
        const mat = new DeferredMeshMaterial(params);

        let c = 2;
        let o = 5;
        for (let x = 0; x < c; x++) {
            for (let y = 0; y < c; y++) {
                for (let z = 0; z < c; z++) {
                    const damagedHelmetGameObject = new GameObject(scene);
                    damagedHelmetGameObject.transform.position.set(x * o, y * o, z * o);
                    // const damagedHelmetMesh = damagedHelmetGameObject.AddComponent(MeshletMesh);
                    const damagedHelmetMesh = damagedHelmetGameObject.AddComponent(Mesh);
                    await damagedHelmetMesh.SetGeometry(damagedHelmetGeometry);
                    damagedHelmetMesh.AddMaterial(mat);
                }
            }
        }


        {
            const cubeGeometry = Geometry.Cube();
            const cube = new GameObject(scene);
            cube.transform.scale.set(2, 4, 2);
            cube.transform.position.set(-2, -3, -2);
            cube.transform.eulerAngles.y = 20;
            const cubeMesh = cube.AddComponent(Mesh);
            cubeMesh.SetGeometry(cubeGeometry);

            const params: DeferredMeshMaterialParams = {
                albedoColor: new Color(1, 1, 1, 1),
                emissiveColor: new Color(0, 0, 0, 0),
                roughness: 0.5,
                metalness: 0.5,
                unlit: false
            };
            params.albedoMap = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
            params.normalMap = await Texture.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
        
            const mat = new DeferredMeshMaterial(params);
            cubeMesh.AddMaterial(mat);
        }
    

        break;
    }


    scene.Start();
};

Application();