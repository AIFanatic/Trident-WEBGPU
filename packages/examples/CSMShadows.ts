import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
    Console
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

import { Debugger } from "@trident/plugins/Debugger";
import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat, UIVecStat } from "@trident/plugins/ui/UIStats";
import { LineRenderer } from "@trident/plugins/LineRenderer";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";


async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 3);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.transform.position.set( 60, 60, 0 );
    
    
    const controls = new OrbitControls(canvas, camera);
    camera.transform.LookAtV1(new Mathf.Vector3(-100, 10, 0))

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-1, -1, -1).normalize().mul(-200);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floor = new GameObject(scene);
    floor.transform.scale.set(10000, 10000, 10000);
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = Geometry.Plane();
    meshbottom.material = new PBRMaterial();

    const cube = new GameObject(scene);
    cube.transform.position.y = 0.5;
    const cubeMesh = cube.AddComponent(Components.Mesh);
    cubeMesh.geometry = Geometry.Cube();

    const texture = await GPU.Texture.Load("./assets/textures/32x32.png")
    cubeMesh.material = new PBRMaterial({ albedoMap: texture, roughness: 0.7, metalness: 0.1 });



    const material1 = new PBRMaterial({albedoColor: Mathf.Color.fromHex(0x08d9d6)});
    const material2 = new PBRMaterial({albedoColor: Mathf.Color.fromHex(0xff2e63)});

    const geometry = Geometry.Cube();

    for ( let i = 0; i < 40; i ++ ) {
        // const cube1 = new THREE.Mesh( geometry, i % 2 === 0 ? material1 : material2 );
        // const cube1 = new Mesh( geometry, i % 2 === 0 ? material1 : material2 );

        const gameObject1 = new GameObject(scene);
        const cube1 = gameObject1.AddComponent(Components.Mesh);
        cube1.geometry = geometry;
        cube1.material = i % 2 === 0 ? material1.clone() : material2.clone();
        cube1.transform.position.set( - i * 25, 20, 30 );
        cube1.transform.scale.y = Math.random() * 2 + 6;
        cube1.transform.scale.mul(10);

        const gameObject2 = new GameObject(scene);
        const cube2 = gameObject2.AddComponent(Components.Mesh);
        cube2.geometry = geometry;
        cube2.material = i % 2 === 0 ? material2.clone() : material1.clone();

        cube2.transform.position.set( - i * 25, 20, - 30 );
        cube2.transform.scale.y = Math.random() * 2 + 6;
        cube2.transform.scale.mul(10);
    }



    // // const depthBufferRaymarchPass = new DepthBufferRaymarchPass();
    // // scene.renderPipeline.AddPass(depthBufferRaymarchPass, GPU.RenderPassOrder.AfterLighting);

    // // const sss = new SSSRenderPass(light);
    // // scene.renderPipeline.AddPass(sss, GPU.RenderPassOrder.AfterLighting);
    
    // {
    //     function worldCornersFromViewProj(viewProj: Mathf.Matrix4): Mathf.Vector3[] {
    //         const invVP = viewProj.clone().invert();

    //         // Clip-space corners for three.js default (NDC z in [-1, +1])
    //         // If your projection used z in [0,1], change zNear=-1 -> 0 and zFar=1 -> 1,
    //         // then still do the homogeneous divide.
    //         const zNear = 0, zFar = 1;
    //         const ndc = [
    //             new Mathf.Vector4(-1,-1,zNear,1), new Mathf.Vector4(-1, 1,zNear,1),
    //             new Mathf.Vector4( 1, 1,zNear,1), new Mathf.Vector4( 1,-1,zNear,1),
    //             new Mathf.Vector4(-1,-1,zFar ,1), new Mathf.Vector4(-1, 1,zFar ,1),
    //             new Mathf.Vector4( 1, 1,zFar ,1), new Mathf.Vector4( 1,-1,zFar ,1),
    //         ];

    //         return ndc.map(p => {
    //             p.applyMatrix4(invVP);
    //             p.mul(1 / p.w);
    //             return new Mathf.Vector3(p.x, p.y, p.z);
    //         });
    //     }


    //     const csmDebugGO = new GameObject(scene);
    //     const lineRenderer = csmDebugGO.AddComponent(LineRenderer);

    //     const shadowPass = scene.renderPipeline.DeferredShadowMapPass;
    //     const lightsShadowData = shadowPass.lightShadowData;
    
    //     const CSMFolder = new UIFolder(Debugger.ui, "CSM");
    //     CSMFolder.Open();

    //     new UIButtonStat(CSMFolder, "Enabled:", state => {
    //         Console.getVar("r_shadows_enabled").value = state;
    //         camera.SetPerspective(camera.fov, camera.aspect, camera.near, state ? 1000 : 50000);
    //         console.log(camera.fov, state)
            
    //     }, Console.getVar<boolean>("r_shadows_enabled").value);

    //     // lineRenderer.SetPositions([
            
    //     // ]);

    //     const m = new Mathf.Matrix4();
    //     setInterval(() => {
    //         let positions: Mathf.Vector3[] = [];
    //         let colors: Mathf.Color[] = [];

    //         const palette = [
    //             Mathf.Color.fromHex(0xff0000),
    //             Mathf.Color.fromHex(0x00ff00),
    //             Mathf.Color.fromHex(0x0000ff),
    //             Mathf.Color.fromHex(0xffff00),
    //         ];

    //         function DrawFrustum(corners: Mathf.Vector3[], color: Mathf.Color, matrix = new Mathf.Matrix4()) {
    //             if (corners.length !== 8) throw Error("Need 8 corners")
    //             const [c0, c1, c2, c3, c4, c5, c6, c7] = corners;
    //             // Apply matrix
    //             c0.applyMatrix4(matrix); c1.applyMatrix4(matrix); c2.applyMatrix4(matrix); c3.applyMatrix4(matrix);
    //             c4.applyMatrix4(matrix); c5.applyMatrix4(matrix); c6.applyMatrix4(matrix); c7.applyMatrix4(matrix);

    //             // Near
    //             positions.push(c0, c1);
    //             positions.push(c1, c2);
    //             positions.push(c2, c3);
    //             positions.push(c3, c0);

    //             // Far
    //             positions.push(c4, c5);
    //             positions.push(c5, c6);
    //             positions.push(c6, c7);
    //             positions.push(c7, c4);

    //             // Connections
    //             positions.push(c0, c4);
    //             positions.push(c1, c5);
    //             positions.push(c2, c6);
    //             positions.push(c3, c7);

    //             colors.push(...new Array(24).fill(color));
    //         }

    //         window.meshes = window.meshes || new Array(4);
    //         function DrawSphere(index: number, position: Mathf.Vector3, radius: number = 1, color = new Mathf.Color(1, 0, 0, 1)) {
    //             let mesh = window.meshes[index];
    //             if (!mesh) {
    //                 const gameObject = new GameObject(scene);
    //                 const newMesh = gameObject.AddComponent(Components.Mesh);
    //                 newMesh.enableShadows = false;
    //                 newMesh.geometry = Geometry.Sphere();
    //                 newMesh.material = new PBRMaterial({unlit: true, albedoColor: color});
    //                 window.meshes[index] = newMesh;
    //                 console.log("HERE", mesh)
    //                 mesh = newMesh;
    //             }

    //             mesh.transform.position.copy(position);
    //             mesh.transform.scale.mul(radius);
    //         }

    //         const m = new Mathf.Matrix4(); //camera.projectionMatrix.clone().mul(camera.viewMatrix);
    //         DrawFrustum(shadowPass.frustumData.corners.slice(0, 8), palette[0], m);
    //         DrawFrustum(shadowPass.frustumData.corners.slice(8, 16), palette[0], m);
    //         DrawFrustum(shadowPass.frustumData.corners.slice(16, 24), palette[0], m);
    //         DrawFrustum(shadowPass.frustumData.corners.slice(24, 32), palette[0], m);

    //         DrawSphere(0, shadowPass.frustumData.frustumCenters[0], 1, palette[0]);
    //         DrawSphere(1, shadowPass.frustumData.frustumCenters[1], 1, palette[1]);
    //         DrawSphere(2, shadowPass.frustumData.frustumCenters[2], 10, palette[2]);
    //         DrawSphere(3, shadowPass.frustumData.frustumCenters[3], 100, palette[3]);

    //         // DrawFrustum(shadowPass.frustumData.corners.slice(0, 8), palette[1], shadowPass.frustumData.lightMatrix);

    //         const shadowEntry = lightsShadowData.get(light.id);
    //         if (shadowEntry) {
    //             const { projectionMatrices } = shadowEntry;
    //             for (let cascade = 0; cascade < Console.getVar<number>("r_shadows_csm_numofcascades").value; cascade++) {
    //                 const vp = new Mathf.Matrix4();
    //                 vp.setFromArray(projectionMatrices.subarray(cascade * 16, (cascade + 1) * 16));
    //                 const lightCorners = worldCornersFromViewProj(vp); // zNear=0, zFar=1 for orthoZO
    //                 DrawFrustum(lightCorners, palette[cascade]);

    //             }
    //         }

    //         lineRenderer.SetPositions(positions);
    //         lineRenderer.SetColors(colors);
    //     }, 1000);
    // }

    // // const gameObjects = await GLTFLoader.loadAsGameObjects(scene, "./assets/models/Fox.glb");
    // // const root = gameObjects[0]
    // // // root.transform.scale.mul(0.01);
    // // // root.transform.position.x = 5;
    
    Debugger.Enable();

    scene.Start();
};

Application(document.querySelector("canvas"));