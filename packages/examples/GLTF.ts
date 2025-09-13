// import {
//     Components,
//     Scene,
//     GPU,
//     Mathf,
//     GameObject,
//     VertexAttribute,
//     Object3D,
// } from "@trident/core";

// import { OrbitControls } from "@trident/plugins/OrbitControls";
// import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
// import { HDRParser } from "@trident/plugins/HDRParser";
// import { Debugger } from "@trident/plugins/Debugger";

// async function Application(canvas: HTMLCanvasElement) {
//     const renderer = GPU.Renderer.Create(canvas, "webgpu");
//     const scene = new Scene(renderer);

//     const mainCameraGameObject = new GameObject(scene);
//     mainCameraGameObject.transform.position.set(0,0,-15);
//     mainCameraGameObject.name = "MainCamera";
//     const camera = mainCameraGameObject.AddComponent(Components.Camera);
//     camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


//     mainCameraGameObject.transform.position.set(0, 0, 2);
//     mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

//     const controls = new OrbitControls(canvas, camera);

//     const lightGameObject = new GameObject(scene);
//     lightGameObject.transform.position.set(-4, 4, 4);
//     lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
//     const light = lightGameObject.AddComponent(Components.DirectionalLight);

//     function traverse(object3D: Object3D, func: (object3D: Object3D) => void) {
//         func(object3D);
//         for (const child of object3D.children) traverse(child, func);
//     }

//     const helmet = await GLTFLoader.Load("./assets/models/Tree.glb");

//     traverse(helmet, object3D => {
//         if (object3D.geometry && object3D.material) {
//             console.log(object3D, "ger")
//             const gameObject = new GameObject(scene);
//             const mesh = gameObject.AddComponent(Components.Mesh);
//             object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
//             // const positions = object3D.geometry.attributes.get("position").array;
//             // if (object3D.geometry.attributes.has("uv") === false) {
//             //     object3D.geometry.attributes.set("uv", new VertexAttribute(new Float32Array(positions.length / 3 * 2)))
//             // }
//             mesh.SetGeometry(object3D.geometry);
//             mesh.AddMaterial(object3D.material);
//         }
//     })

//     const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
//     const sky = await HDRParser.ToCubemap(hdr);

//     // const sky = await GPU.RenderTextureCube.Create(1,1,6, "rgba8unorm");
//     // sky.SetData( new Uint8Array([255, 0, 0, 255]), 4, 1);

//     // // 6 faces * 4 bytes per RGBA8 pixel = 24 bytes
//     // const data = new Uint8Array(6 * 4);
//     // for (let i = 0; i < 6; i++) data.set([255, 255, 255, 255], i * 4);
//     // sky.SetData(data, 4, 1); // bytesPerRow=4, rowsPerImage=1 is fine for writeTexture

//     const skyIrradiance = await HDRParser.GetIrradianceMap(sky);
//     const prefilterMap = await HDRParser.GetPrefilterMap(sky);
//     const brdfLUT = await HDRParser.GetBRDFLUT();

//     scene.renderPipeline.skybox = sky;
//     scene.renderPipeline.skyboxIrradiance = skyIrradiance;
//     scene.renderPipeline.skyboxPrefilter = prefilterMap;
//     scene.renderPipeline.skyboxBRDFLUT = brdfLUT;

//     Debugger.Enable();


//     scene.Start();
// };

// Application(document.querySelector("canvas"));






import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    VertexAttribute,
    Object3D,
    IndexAttribute,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { HDRParser } from "@trident/plugins/HDRParser";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0,0,-15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 2);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    function traverse(object3D: Object3D, func: (object3D: Object3D) => void) {
        func(object3D);
        for (const child of object3D.children) traverse(child, func);
    }

    const helmet = await GLTFLoader.Load("./assets/models/Fox.glb");

    traverse(helmet, object3D => {
        if (!object3D.geometry || !object3D.material) return;
        if (!object3D.geometry.index) {
            const positionsArray = object3D.geometry.attributes.get("position").array;
            let indexBuffer = new Uint32Array(positionsArray.length);
            for (let i = 0; i < indexBuffer.length; i++) {
                indexBuffer[i] = i;
            }
            object3D.geometry.index = new IndexAttribute(indexBuffer);
            object3D.geometry.ComputeNormals();
        }
        console.log(object3D, "ger")
        const gameObject = new GameObject(scene);
        const mesh = gameObject.AddComponent(Components.Mesh);
        object3D.localMatrix.decompose(gameObject.transform.position, gameObject.transform.rotation, gameObject.transform.scale);
        mesh.SetGeometry(object3D.geometry);
        mesh.AddMaterial(object3D.material);
    })

    Debugger.Enable();


    scene.Start();
};

Application(document.querySelector("canvas"));