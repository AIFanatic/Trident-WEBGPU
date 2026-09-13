import {
    GameObject,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
    Runtime,
    PlayerRuntime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";

import { MeshletMesh as MeshletMesh } from "@trident/plugins/meshlets/MeshletMesh";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";
import { HDRParser } from "@trident/plugins/HDRParser";

import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { InstancedMeshletMesh } from "@trident/plugins/meshlets/InstancedMeshletMesh";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.05, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    // TODO: Should be added automatically from plugin
    Runtime.Renderer.RenderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 20;
    light.color.set(1, 1, 1, 1);
    light.castShadows = false;

    {
        const mesh = await GLTFLoader.Load("/extra/test-assets/trees/Tree_realistic_highpoly.glb", scene);
        const meshes = mesh.GetComponentsInChildren(Components.Mesh);
        // const mesh = await OBJLoaderIndexed.load("./assets/models/bunny.obj");
        // mesh.geometry.ComputeNormals();
        // mesh.geometry.ComputeTangents();
        // const meshes = [mesh];
        mesh.enabled = false;
        
        function CreateMeshletFromMesh(mesh: Components.Mesh) {
            
            const go = new GameObject();
            const meshletInstanced = go.AddComponent(InstancedMeshletMesh);
            meshletInstanced.geometry = mesh.geometry;
            meshletInstanced.material = mesh.material;

            const c = 1;
            const off = 10;
            const total = c * c * c;
            const p = new Mathf.Vector3();
            const q = new Mathf.Quaternion();
            const s = new Mathf.Vector3(1, 1, 1);
            const m = new Mathf.Matrix4();
            const matrices = new Float32Array(total * 16);

            let i = 0;
            for (let x = 0; x < c; x++) {
                for (let y = 0; y < c; y++) {
                    for (let z = 0; z < c; z++) {
                        p.set(x * off, y * off, z * off);
                        m.compose(p, q, s);
                        matrices.set(m.elements, i * 16);
                        i++;
                    }
                }
            }
            meshletInstanced.SetMatricesBulk(matrices);

            return meshletInstanced

        }

        let instances = []
        for (let i = 0; i < meshes.length; i++) {
            const instance = CreateMeshletFromMesh(meshes[i]);
            instances.push(instance);
        }
        // console.log(meshletInstanced)

        // let j = 0;
        // for (const m of meshletInstanced.meshlets) if (m.lod === 0) j++;
        // console.log(j);

        // const p = new Mathf.Vector3();
        // const q = new Mathf.Quaternion();
        // const s = new Mathf.Vector3(1, 1, 1);
        // const m = new Mathf.Matrix4();
        // const matrices = new Float32Array(total * 16);

        // let i = 0;
        // for (let x = 0; x < c; x++) {
        //     for (let y = 0; y < c; y++) {
        //         for (let z = 0; z < c; z++) {
        //             p.set(x * off, y * off, z * off);
        //             m.compose(p, q, s);
        //             matrices.set(m.elements, i * 16);
        //             i++;
        //         }
        //     }
        // }

        // meshletInstanced.SetMatricesBulk(matrices);
    }

    const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
    iblLightingPass.SetEnvironment(skyTexture);
    skyboxPass.SetSkybox(skyTexture);
};

Application(document.querySelector("canvas"));