import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Object3D,
    Prefab,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { Debugger } from "@trident/plugins/Debugger";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";


// GLTFLoader.Load("./assets/DamagedHelmet/DamagedHelmet.gltf");

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-5);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 500);

    const controls = new OrbitControls(canvas, camera);

    {
        const lightGameObject = new GameObject(scene);
        lightGameObject.transform.position.set(-4, 4, -4);
        lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0))
        const light = lightGameObject.AddComponent(Components.DirectionalLight);
        light.intensity = 5;
        light.range = 1;
        light.color.set(1, 1, 1, 1);
    }

    // {
    //     const lightGameObject = new GameObject(scene);
    //     lightGameObject.transform.position.set(-4, 4, -4);
    //     lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0))
    //     const light = lightGameObject.AddComponent(Components.DirectionalLight);
    //     light.intensity = 5;
    //     light.range = 1;
    //     light.color.set(1, 1, 1, 1);
    // }

    // const model = await GLTFLoader.LoadFromURL("./assets/models/Tree.glb");
    const model = await GLTFLoader.LoadFromURL("./assets/models/bunny.glb");
    function traverse(object3D: Prefab, func: (o: Prefab) => void | Promise<void>) {
        func(object3D);
        for (const child of object3D.children) traverse(child, func);
    }

    let geometry: Geometry;
    let material = new PBRMaterial();
    traverse(model, prefab => {
        for (const component of prefab.components) {
            if (component.type === Components.Mesh.type) {
                geometry = Geometry.Deserialize(component.geometry);
            }
        }
    })
    const go = new GameObject(scene);

    const bunnyImpostor = go.AddComponent(ImpostorMesh);
    await bunnyImpostor.Create(geometry, material);
    // const m = new GPU.Material({isDeferred: true});
    // m.shader = bunnyImpostor.impostorShader;

    // const impostor = new GameObject(scene);
    // // impostor.transform.position.x = -2
    // // impostor.transform.scale.set(10, 10, 10)
    // const im = impostor.AddComponent(Components.Mesh);
    // im.geometry = bunnyImpostor.geometry;
    // im.material = m;

    new UITextureViewer(Debugger.ui, "Atlas", bunnyImpostor.albedoTexture);
    new UITextureViewer(Debugger.ui, "Atlas", bunnyImpostor.normalTexture);


    {
        Scene.Instantiate(model, new Mathf.Vector3(3, 0, 0));
    }


    // // const textureDilated = await Dilator.Dilate(bunnyImpostor.normalTexture);
    // // // bunnyImpostor.normalTexture = textureDilated;
    // // bunnyImpostor.impostorShader.SetTexture("normalTexture", textureDilated);

    // // {
    // //     const dilatorGameObject = new GameObject(scene);
    // //     dilatorGameObject.transform.position.x = 2;
    // //     const dilatorMesh = dilatorGameObject.AddComponent(Mesh);
    // //     await dilatorMesh.geometry = Geometry.Plane();

    // //     const dilatorMaterial = new PBRMaterial({albedoMap: textureDilated, unlit: true});
    // //     dilatorMesh.material = dilatorMaterial;
    // // }

    // {
    //     const planeGO = new GameObject(scene);
    //     planeGO.transform.eulerAngles.x = -90;
    //     planeGO.transform.position.set(0, -2, 0);
    //     planeGO.transform.scale.set(100, 100, 1);
    //     const sphereMesh = planeGO.AddComponent(Components.Mesh);
    //     sphereMesh.geometry = Geometry.Plane();
    //     const mat = new PBRMaterial({albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.5, roughness: 0.5});
    //     sphereMesh.material = mat;
    // }

    // // function traverse(object3D: Object3D, func: (object3D: Object3D) => void) {
    // //     func(object3D);
    // //     for (const child of object3D.children) traverse(child, func);
    // // }

    // // traverse(model, object3D => {
    // //     if (!object3D.geometry || !object3D.material) return;
    // //         const gameObject = new GameObject(scene);
    // //         const mesh = gameObject.AddComponent(Components.Mesh);
    // //         mesh.enableShadows = false;
    // //         object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
    // //         mesh.geometry = object3D.geometry;
    // //         mesh.material = object3D.material;
    // // })

    // const instancedMeshGameObject = new GameObject(scene);
    // const instancedMesh = instancedMeshGameObject.AddComponent(Components.InstancedMesh);
    // instancedMesh.enableShadows = false;
    // instancedMesh.geometry = bunnyImpostor.impostorGeometry;
    // instancedMesh.material = m;

    // const mat = new Mathf.Matrix4();
    // const p = new Mathf.Vector3();
    // const r = new Mathf.Quaternion();
    // const s = new Mathf.Vector3(1,1,1);
    // const c = 10;
    // let i = 0;
    // for (let x = 0; x < c; x++) {
    //     for (let z = 0; z < c; z++) {
    //         p.set((x * 2) - c, 0, (z * 2) - c);
    //         mat.compose(p, r, s);
    //         instancedMesh.SetMatrixAt(i, mat);
    //         i++;
    //     }
    // }

    // console.log(i)

    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));