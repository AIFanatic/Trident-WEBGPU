import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Object3D,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { Debugger } from "@trident/plugins/Debugger";


// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    // const b = new DynamicBufferMemoryAllocator(10, 10);
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    // b.set(1, new Float32Array([1,2,3,4,5,6,7,8]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    // b.set(2, new Float32Array([8,7,6,5,4,3,2,1]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))
    
    // b.delete(1);
    // console.log(new Float32Array(await b.getBuffer().GetData()))


    // b.set(3, new Float32Array([9,7,6,5,4,3,2,5]));
    // console.log(new Float32Array(await b.getBuffer().GetData()))

    // return;

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-5);
    // setInterval(() => {
    //     console.log(camera.transform.position.elements)
    // }, 1000);
    // mainCameraGameObject.transform.position.z = -15;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 500);
    // camera.transform.LookAt(new Vector3(0,0,0));
    

    // camera.transform.position.x = 10;

    const controls = new OrbitControls(canvas, camera);

    // let angle = 10;
    // setInterval(() => {
    //     console.log(angle)
    //     camera.transform.RotateAround(new Vector3(5, 0, 0), new Vector3(0, 1, 0), angle);
    // }, 1000);

    // camera.transform.RotateAround(new Vector3(), new Vector3(0, 1, 0), 90);

    
    // {
    //     const c = new GameObject(scene);
    //     c.transform.position.set(0, 0, 0);
    //     const g = Geometry.Cube();
    //     const mat = new PBRMaterial({albedoColor: new Color(1,1,1,1), unlit: false});
    //     const m = c.AddComponent(Mesh);
    //     await m.SetGeometry(g);
    //     m.AddMaterial(mat);
    // }

    // {
    //     const c = new GameObject(scene);
    //     c.transform.position.set(5, 5, 5);
    //     const g = Geometry.Cube();
    //     const mat = new PBRMaterial({unlit: false});
    //     const m = c.AddComponent(Mesh);
    //     await m.SetGeometry(g);
    //     m.AddMaterial(mat);
    // }

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(4, 4, 4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0))
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 5;
        light.range = 1;
        light.color.set(1, 1, 1, 1);
    }

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0))
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 5;
        light.range = 1;
        light.color.set(1, 1, 1, 1);
    }

    // const bunny = await OBJLoaderIndexed.load("./assets/models/bunny.obj");
    // const bunny = await GLTFLoader.load("./assets/low_poly_tree_pack/pine.gltf");
    // const bunny = await GLTFLoader.load("./assets/quiver_tree_02/quiver_tree_02.gltf");
    // const bunny = await GLTFLoader.load("./assets/GLTFScenes/barrel.gltf");
    // const bunny = [await GLTFParser.Load("./assets/models/DamagedHelmet/DamagedHelmet.gltf")];
    const model = await GLTFLoader.Load("./assets/models/Tree.glb");
    // console.log("bunny", bunny)
    const go = new GameObject(scene);
    // go.transform.scale.set(0.01, 0.01, 0.01);
    // // go.transform.position.z = -20;
    // const mesh = go.AddComponent(Mesh);
    // await mesh.SetGeometry(bunny[0].geometry);
    // mesh.AddMaterial(bunny[0].material);

    const bunnyImpostor = go.AddComponent(ImpostorMesh);
    await bunnyImpostor.Create(model);
    const m = new GPU.Material({isDeferred: true});
    m.shader = bunnyImpostor.impostorShader;

    // const impostor = new GameObject(scene);
    // // impostor.transform.position.x = -2
    // // impostor.transform.scale.set(10, 10, 10)
    // const im = impostor.AddComponent(Components.Mesh);
    // await im.SetGeometry(bunnyImpostor.impostorGeometry);
    // im.AddMaterial(m);


    // const textureDilated = await Dilator.Dilate(bunnyImpostor.normalTexture);
    // // bunnyImpostor.normalTexture = textureDilated;
    // bunnyImpostor.impostorShader.SetTexture("normalTexture", textureDilated);

    // {
    //     const dilatorGameObject = new GameObject(scene);
    //     dilatorGameObject.transform.position.x = 2;
    //     const dilatorMesh = dilatorGameObject.AddComponent(Mesh);
    //     await dilatorMesh.SetGeometry(Geometry.Plane());

    //     const dilatorMaterial = new PBRMaterial({albedoMap: textureDilated, unlit: true});
    //     dilatorMesh.AddMaterial(dilatorMaterial);
    // }

    {
        const planeGO = new GameObject(scene);
        planeGO.transform.eulerAngles.x = -90;
        planeGO.transform.position.set(0, -2, 0);
        planeGO.transform.scale.set(100, 100, 1);
        const sphereMesh = planeGO.AddComponent(Components.Mesh);
        await sphereMesh.SetGeometry(Geometry.Plane());
        const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.5, roughness: 0.5});
        sphereMesh.AddMaterial(mat);
    }

    // function traverse(object3D: Object3D, func: (object3D: Object3D) => void) {
    //     func(object3D);
    //     for (const child of object3D.children) traverse(child, func);
    // }

    // traverse(model, object3D => {
    //     if (!object3D.geometry || !object3D.material) return;
    //         const gameObject = new GameObject(scene);
    //         const mesh = gameObject.AddComponent(Components.Mesh);
    //         mesh.enableShadows = false;
    //         object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
    //         mesh.SetGeometry(object3D.geometry);
    //         mesh.AddMaterial(object3D.material);
    // })

    const instancedMeshGameObject = new GameObject(scene);
    const instancedMesh = instancedMeshGameObject.AddComponent(Components.InstancedMesh);
    instancedMesh.enableShadows = false;
    await instancedMesh.SetGeometry(bunnyImpostor.impostorGeometry);
    instancedMesh.AddMaterial(m);

    const mat = new Mathf.Matrix4();
    const p = new Mathf.Vector3();
    const r = new Mathf.Quaternion();
    const s = new Mathf.Vector3(1,1,1);
    const c = 10;
    let i = 0;
    for (let x = 0; x < c; x++) {
        for (let z = 0; z < c; z++) {
            p.set((x * 2) - c, 0, (z * 2) - c);
            mat.compose(p, r, s);
            instancedMesh.SetMatrixAt(i, mat);
            i++;
        }
    }

    console.log(i)

    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));