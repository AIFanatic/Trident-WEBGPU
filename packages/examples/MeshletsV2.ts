import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Material, PBRMaterial, PBRMaterialParams } from "../renderer/Material";

import { Mesh } from "../components/Mesh";

import { Vector3 } from "../math/Vector3";
import { DirectionalLight, PointLight } from "../components/Light";
import { Quaternion } from "../math/Quaternion";

import { WEBGPUInspector } from "../plugins/WEBGPUInspector";
import { Debugger } from "../plugins/Debugger";
import { Shader } from "../renderer/Shader";
import { Buffer } from "../renderer/Buffer";
import { Texture as TridentTexture } from "../renderer/Texture";
import { Matrix4 } from "../math/Matrix4";
import { TextureSampler } from "../renderer/TextureSampler";
import { DepthTarget, RenderTarget, RendererContext } from "../renderer/RendererContext";
import { TextureViewer } from "../plugins/TextureViewer";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";
import { InstancedMesh } from "../components/InstancedMesh";

import { MeshletMesh } from "../plugins/meshlets_v2/MeshletMesh";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
// import { GLTFLoader } from "../plugins/GLTF/gltf";
import { PostProcessingPass } from "../plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "../plugins/PostProcessing/effects/FXAA";
import { MeshletDraw } from "../plugins/meshlets_v2/passes/MeshletDraw";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";
import { UIButtonStat, UIFolder, UISliderStat } from "../plugins/ui/UIStats";

import { TerrainGenerator } from "../plugins/TerrainGenerator";
import { ImpostorMesh } from "../plugins/Impostors/ImpostorMesh";
// import { glTFLoader } from "../plugins/GLTF/GLTFLoader_Minimal";
import {GLTFLoader, GLTF, MeshPrimitive, Texture, Node, AccessorComponentType, Accessor} from '../plugins/GLTF/GLTFLoader_Minimal'

import { ExtensionInstanced, Object3D } from "../Object3D";
import { Color } from "../math/Color";
import { Transform } from "../components/Transform";
import { Vector2 } from "../math/Vector2";
import { PostProcessingSMAA } from "../plugins/PostProcessing/effects/SMAA";
import { GLTFParser } from "../plugins/GLTF/GLTF_Parser";
import { Vector4 } from "../math/Vector4";
import { MeshletDebug } from "../plugins/meshlets_v2/passes/MeshletDebug";


// import { WebIO } from '@gltf-transform/core';


const canvas = document.createElement("canvas");
const aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    // WEBGPUInspector.Load();

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);



    // const camera = mainCameraGameObject.AddComponent(Camera);
    // const size = 10;
    // camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
    // camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);

    // camera.near = 0.01;
    // camera.far = 100;
    // camera.SetPerspective(60, Renderer.width / Renderer.height, camera.near, camera.far);

    // this.camera.projectionMatrix.perspectiveZO(60, Renderer.width / Renderer.height, this.camera.near, this.camera.far);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    // lightGameObject.transform.position.set(4, 4, 4);
    // lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        const light = lightGameObject.AddComponent(DirectionalLight);
        light.intensity = 1;
        light.color.set(1, 1, 1, 1);
        light.castShadows = true;

        // let objs: GameObject[] = [];
        // for (let i = 0; i < 4; i++) {
        //     const lightGameObject = new GameObject(scene);
        //     lightGameObject.transform.scale.set(0.25, 0.25, 0.25);
        //     lightGameObject.transform.position.set(Math.random() * 10 - 5, Math.random() * 10, Math.random() * 10 - 5);
        //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        //     const light = lightGameObject.AddComponent(PointLight);
        //     light.intensity = 1;
        //     light.range = 10;
        //     light.color.set(Math.random(), Math.random(), Math.random(), 1);
        //     light.castShadows = false;

        //     let lightHelperMesh = lightGameObject.AddComponent(Mesh);
        //     lightHelperMesh.SetGeometry(Geometry.Sphere());
        //     lightHelperMesh.AddMaterial(new PBRMaterial({unlit: true, albedoColor: light.color}));
        //     lightHelperMesh.enableShadows = false;

        //     objs.push(lightGameObject);
        // }

        // setInterval(() => {
        //     for (const obj of objs) {
        //         obj.transform.position.add(0.01);
        //     }
        // }, 100);

        const sphereMesh = lightGameObject.AddComponent(Mesh);
        sphereMesh.enableShadows = false;
        await sphereMesh.SetGeometry(Geometry.Sphere());
        sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));

        const sunlightAngle = new Vector3(64, 64, 10);
        const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
        new UISliderStat(lightPositionDebug, "Altitude:", 0, 1000, 1, sunlightAngle.z, value => {sunlightAngle.z = value});
        new UISliderStat(lightPositionDebug, "Theta:", 0, 360, 1, sunlightAngle.x, value => {sunlightAngle.x = value});
        new UISliderStat(lightPositionDebug, "Phi:", 0, 360, 1, sunlightAngle.y, value => {sunlightAngle.y = value});
        new UIButtonStat(lightPositionDebug, "Cast shadows:", value => {light.castShadows = value}, light.castShadows);
        lightPositionDebug.Open();
        setInterval(() => {
            const theta = sunlightAngle.x * Math.PI / 180;
            const phi = sunlightAngle.y * Math.PI / 180;
            const x = Math.sin(theta) * Math.cos(phi);
            const y = Math.sin(theta) * Math.sin(phi);
            const z = Math.cos(theta);
            lightGameObject.transform.position.set(x, y, z).mul(sunlightAngle.z);
            lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
        }, 100);
    }



    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(4, 4, 4);
    //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 1;
    //     light.color.set(1, 1, 1, 1);

    //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    //     sphereMesh.enableShadows = false;
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));
    // }

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(-4, 4, -4);
    //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0))
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 1;
    //     light.color.set(1, 1, 1, 1);

    //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));
    // }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.scale.set(100, 100, 1);
        // planeGO.transform.position.x = 2.1;
        planeGO.transform.eulerAngles.x = -90;
        const sphereMesh = planeGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        const checkerboard = await TridentTexture.Load("./test-assets/textures/dev/dev_measurewall01a.png");
        checkerboard.GenerateMips();
        sphereMesh.AddMaterial(new PBRMaterial({
            albedoMap: checkerboard
            // wireframe: true
        }));
    }

    const sphereGeometry = await OBJLoaderIndexed.load("./test-assets/sphere.obj");

    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.y = 2;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(sphereGeometry[0].geometry);
        sphereMesh.AddMaterial(new PBRMaterial());

        setInterval(() => {
            sphereMesh.enabled = !sphereMesh.enabled;
        }, 1000);


    }


    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.x = 50;
        sphereGO.transform.position.y = 2;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(sphereGeometry[0].geometry);
        sphereMesh.AddMaterial(new PBRMaterial());
    }

    {
        const sphereGO = new GameObject(scene);
        sphereGO.transform.position.x = -2;
        sphereGO.transform.position.y = 1;
        const sphereMesh = sphereGO.AddComponent(Mesh);
        await sphereMesh.SetGeometry(Geometry.Cube());
        sphereMesh.AddMaterial(new PBRMaterial());
    }



    {
        // Instances
        const pinesGO = new GameObject(scene);
        const instancedMesh = pinesGO.AddComponent(InstancedMesh);
        await instancedMesh.SetGeometry(sphereGeometry[0].geometry);
        instancedMesh.AddMaterial(new PBRMaterial());
    
        const m = new Matrix4();
        const p = new Vector3();
        const q = new Quaternion();
        const s = new Vector3(1,1,1);
        const o = 2;
    
        let instances = 0;
        const count = 2;
        for (let x = 0; x < count; x++) {
            for (let z = 0; z < count; z++) {
                p.set(x + o, 2, z + o);
                m.compose(p, q, s);
                instancedMesh.SetMatrixAt(instances, m);
                instances++;
            }
        }
    }

    // {
    //     // Instances
    //     const pinesGO = new GameObject(scene);
    //     const instancedMesh = pinesGO.AddComponent(InstancedMesh);
    //     await instancedMesh.SetGeometry(Geometry.Sphere());
    //     instancedMesh.AddMaterial(new PBRMaterial());
    
    //     const m = new Matrix4();
    //     const p = new Vector3();
    //     const q = new Quaternion();
    //     const s = new Vector3(1,1,1);
    //     const o = -2;
    
    //     let instances = 0;
    //     const count = 2;
    //     for (let x = 0; x < count; x++) {
    //         for (let z = 0; z < count; z++) {
    //             p.set(x + o, 2, z + o);
    //             m.compose(p, q, s);
    //             instancedMesh.SetMatrixAt(instances, m);
    //             instances++;
    //         }
    //     }
    // }

    scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    {
        // const bunnyGeometry = await OBJLoaderIndexed.load("./test-assets/DamagedHelmet/DamagedHelmet.obj");
        const bunnyGeometry = await OBJLoaderIndexed.load("./assets/bunny.obj");
        // const bunnyGeometry = await OBJLoaderIndexed.load("./test-assets/lucy.obj");
        const pinesGO = new GameObject(scene);
        pinesGO.transform.position.set(4, 1, 0);
        const instancedMesh = pinesGO.AddComponent(MeshletMesh);
        await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
        // bunnyGeometry[0].material.params.wireframe = true;
        instancedMesh.AddMaterial(bunnyGeometry[0].material);
    }

    // {
    //     // const objs = await GLTFParser.Load("./test-assets/DamagedHelmet/DamagedHelmet.gltf");
    //     const objs = await GLTFParser.Load("./test-assets/quiver_tree_02/quiver_tree_02.gltf");
    //     console.log(objs)

    //     for (const obj of objs.children) {
    //         if (!obj.geometry || !obj.material) continue;

    //         const gameObject = new GameObject(scene);
    //         if (obj.localMatrix) {
    //             obj.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
    //         }
    //         gameObject.transform.position.set(4, 1, 0);
    //         const meshletMesh = gameObject.AddComponent(MeshletMesh);
    //         await meshletMesh.SetGeometry(obj.geometry);
    //         meshletMesh.AddMaterial(obj.material);
    //     }
    // }





    const postProcessing = new PostProcessingPass();
    postProcessing.effects.push(new PostProcessingFXAA());

    scene.renderPipeline.AddPass(postProcessing, RenderPassOrder.AfterLighting);








    scene.Start();
};

Application();