import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Material, PBRMaterial } from "../renderer/Material";

import { Mesh } from "../components/Mesh";

import { Vector3 } from "../math/Vector3";
import { DirectionalLight } from "../components/Light";
import { Quaternion } from "../math/Quaternion";

import { WEBGPUInspector } from "../plugins/WEBGPUInspector";
import { Debugger } from "../plugins/Debugger";
import { Shader } from "../renderer/Shader";
import { Buffer } from "../renderer/Buffer";
import { Texture } from "../renderer/Texture";
import { Matrix4 } from "../math/Matrix4";
import { TextureSampler } from "../renderer/TextureSampler";
import { DepthTarget, RenderTarget, RendererContext } from "../renderer/RendererContext";
import { TextureViewer } from "../plugins/TextureViewer";
import { PassParams, RenderPassOrder } from "../renderer/RenderingPipeline";
import { InstancedMesh } from "../components/InstancedMesh";

import { MeshletMesh } from "../plugins/meshlets/MeshletMesh";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { GLTFLoader } from "../plugins/GLTF/gltf";
import { PostProcessingPass } from "../plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "../plugins/PostProcessing/effects/FXAA";
import { MeshletDraw } from "../plugins/meshlets/passes/MeshletDraw";
import { DeferredGBufferPass } from "../renderer/passes/DeferredGBufferPass";
import { UIFolder, UISliderStat } from "../plugins/ui/UIStats";


import { EventType, WindowBuilder } from "https://deno.land/x/sdl2/mod.ts";

const windowBuilder = new WindowBuilder("Hello, Deno!", 640, 480);
windowBuilder.resizable();
const window = windowBuilder.build();
const canvas = window.canvas();

// const canvas = document.createElement("canvas");
// const aspectRatio = 1;
// canvas.width = window.innerWidth * aspectRatio;
// canvas.height = window.innerHeight * aspectRatio;
// canvas.style.width = `${window.innerWidth}px`;
// canvas.style.height = `${window.innerHeight}px`;
// document.body.appendChild(canvas);

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

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(-4, 4, -4);
    //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    //     const light = lightGameObject.AddComponent(DirectionalLight);
    //     light.intensity = 1;
    //     light.color.set(1, 1, 1, 1);

    //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    //     sphereMesh.enableShadows = false;
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));

    //     const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
    //     const lightPositionDebugX = new UISliderStat(lightPositionDebug, "X:", -10, 10, 1, 0, value => {lightGameObject.transform.position.x = value});
    //     const lightPositionDebugY = new UISliderStat(lightPositionDebug, "Y:", -10, 10, 1, 0, value => {lightGameObject.transform.position.y = value});
    //     const lightPositionDebugZ = new UISliderStat(lightPositionDebug, "Z:", -10, 10, 1, 0, value => {lightGameObject.transform.position.z = value});
    //     lightPositionDebug.Open();
    //     setInterval(() => {
    //         lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    //     }, 100);
    // }

    // // {
    // //     const lightGameObject = new GameObject(scene);
    // //     lightGameObject.transform.position.set(-4, 4, -4);
    // //     lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0))
    // //     const light = lightGameObject.AddComponent(DirectionalLight);
    // //     light.intensity = 1;
    // //     light.color.set(1, 1, 1, 1);

    // //     const sphereMesh = lightGameObject.AddComponent(Mesh);
    // //     await sphereMesh.SetGeometry(Geometry.Sphere());
    // //     sphereMesh.AddMaterial(new PBRMaterial({unlit: true}));
    // // }

    // {
    //     const planeGO = new GameObject(scene);
    //     planeGO.transform.scale.set(100, 100, 1);
    //     // planeGO.transform.position.x = 2.1;
    //     planeGO.transform.eulerAngles.x = -90;
    //     const sphereMesh = planeGO.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Plane());
    //     sphereMesh.AddMaterial(new PBRMaterial());
    // }

    // {
    //     const sphereGO = new GameObject(scene);
    //     sphereGO.transform.position.y = 2;
    //     const sphereMesh = sphereGO.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Sphere());
    //     sphereMesh.AddMaterial(new PBRMaterial());
    // }

    // {
    //     const sphereGO = new GameObject(scene);
    //     sphereGO.transform.position.x = -2;
    //     sphereGO.transform.position.y = 1;
    //     const sphereMesh = sphereGO.AddComponent(Mesh);
    //     await sphereMesh.SetGeometry(Geometry.Cube());
    //     sphereMesh.AddMaterial(new PBRMaterial());
    // }

    // // setTimeout(() => {
    // //     const shadowTexture = window.resources.getResource(PassParams.ShadowPassDepth);
    // //     new TextureViewer(shadowTexture);
    // // }, 1000);



    // // Instances
    // const pinesGO = new GameObject(scene);
    // const instancedMesh = pinesGO.AddComponent(InstancedMesh);
    // await instancedMesh.SetGeometry(Geometry.Sphere());
    // instancedMesh.AddMaterial(new PBRMaterial());

    // const m = new Matrix4();
    // const p = new Vector3();
    // const q = new Quaternion();
    // const s = new Vector3(1,1,1);

    // let instances = 0;
    // const count = 2;
    // for (let x = 0; x < count; x++) {
    //     for (let z = 0; z < count; z++) {
    //         p.set(x, 2, z);
    //         m.compose(p, q, s);
    //         instancedMesh.SetMatrixAt(instances, m);
    //         instances++;
    //     }
    // }

    // scene.renderPipeline.AddPass(new MeshletDraw(), RenderPassOrder.BeforeGBuffer);
    // scene.renderPipeline.AddPass(new DeferredGBufferPass(), RenderPassOrder.BeforeGBuffer);
    // {
    //     const bunnyGeometry = await OBJLoaderIndexed.load("./assets/bunny.obj");
    //     const pinesGO = new GameObject(scene);
    //     pinesGO.transform.position.set(4, 1, 0);
    //     pinesGO.transform.scale.set(0.01, 0.01, 0.01);
    //     const instancedMesh = pinesGO.AddComponent(MeshletMesh);
    //     await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
    //     instancedMesh.AddMaterial(bunnyGeometry[0].material);
    // }




    // // {
    // //     const sponza = await GLTFLoader.load("./test-assets/GLTFScenes/Sponza/Sponza.gltf");

    // //     for (const obj of sponza) {
    // //         const gameObject = new GameObject(scene);
    // //         // pinesGO.transform.position.set(4, 1, 0);
    // //         gameObject.transform.scale.set(0.01, 0.01, 0.01);
    // //         if (!obj.geometry) continue;
    // //         if (!obj.material) continue;

    // //         const mesh = gameObject.AddComponent(Mesh);
    // //         mesh.SetGeometry(obj.geometry);
    // //         mesh.AddMaterial(obj.material);
    // //         // // await instancedMesh.SetGeometry(bunnyGeometry[0].geometry);
    // //         // // instancedMesh.AddMaterial(bunnyGeometry[0].material);

    // //         // console.log("Adding", obj)
    // //     }

            
    // // }






    // const postProcessing = new PostProcessingPass();
    // postProcessing.effects.push(new PostProcessingFXAA());

    // scene.renderPipeline.AddPass(postProcessing, RenderPassOrder.AfterLighting);




    scene.Start();
};

Application();