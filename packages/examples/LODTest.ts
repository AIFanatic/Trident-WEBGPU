import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { LODInstanceRenderable } from "@trident/plugins/LODGroup";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 5000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const floorGameObject = new GameObject(scene);
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(10, 10, 10);
    const floorMesh = floorGameObject.AddComponent(Components.Mesh);
    floorMesh.geometry = Geometry.Plane();
    floorMesh.material = new PBRMaterial();


    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const hdrCubemap = await HDRParser.ToCubemap(hdr);
    const environment = new Environment(scene, hdrCubemap);
    await environment.init();
        
    const lodGameObject = new GameObject(scene);
    const lodInstanceRenderable = lodGameObject.AddComponent(LODInstanceRenderable);

    // const tree = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/Stylized Nature MegaKit[Standard]/glTF/CommonTree_1.gltf");
    const tree = await GLTFLoader.loadAsGameObjects(scene, "/extra/test-assets/tree-01/tree.glb");

    function traverse(gameObjects: GameObject[], fn: (gameObject: GameObject) => void) {
        for (const gameObject of gameObjects) {
            fn(gameObject);
            for (const child of gameObject.transform.children) {
                traverse([child.gameObject], fn);
            }
        }
    }

    let lodGroupEntries: {geometry: Geometry, material: GPU.Material}[] = []
    traverse([tree], gameObject => {
        const mesh = gameObject.GetComponent(Components.Mesh);
        if (mesh) {
            const geometrySerialized = mesh.geometry.Serialize();
            const materialSerialized = mesh.material.Serialize();
            const materialClone = GPU.Material.Deserialize(materialSerialized);
            const geometryClone = new Geometry();
            geometryClone.Deserialize(geometrySerialized);

            console.log(materialSerialized.params)

            lodGroupEntries.push({geometry: geometryClone, material: materialClone});
        }
    })
    console.log(lodGroupEntries)
    tree.Destroy();

    lodInstanceRenderable.lods.push({renderers: lodGroupEntries, screenSize: 0});
    lodInstanceRenderable.lods.push({renderers: lodGroupEntries.slice(0, 2), screenSize: 20});
    lodInstanceRenderable.lods.push({renderers: lodGroupEntries.slice(2, 4), screenSize: 40});
    lodInstanceRenderable.lods.push({renderers: lodGroupEntries.slice(4, 6), screenSize: 60});
    lodInstanceRenderable.lods.push({renderers: lodGroupEntries.slice(6, 8), screenSize: 80});

    const p = new Mathf.Vector3();
    const r = new Mathf.Quaternion();
    const s = new Mathf.Vector3(1,1,1);
    const m = new Mathf.Matrix4();

    const c = 1000;
    const off = 100;

    const c2 = 20;

    // let i = 0;
    // for (let x = 0; x < c2; x++) {
    //     for (let z = 0; z < c2; z++) {
    //         p.set(x * off, 0, z * off);
    //         m.compose(p,r,s);
    //         lodInstanceRenderable.SetMatrixAt(i, m);
    //         i++;
    //     }
    // }
    for (let i = 0; i < c; i++) {
        p.set(Mathf.RandomRange(-off, off), 0, Mathf.RandomRange(-off, off));
        m.compose(p,r,s);
        lodInstanceRenderable.SetMatrixAt(i, m);
    }

    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));