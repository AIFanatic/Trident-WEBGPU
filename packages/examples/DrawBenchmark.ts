import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    VertexAttribute,
    IndexAttribute,
    InterleavedVertexAttribute,
    Runtime,
    PlayerRuntime,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Billboarder } from "@trident/plugins/Impostors/Billboarder";


import { Meshoptimizer } from "@trident/plugins/meshoptimizer/Meshoptimizer";
import { MeshletDraw } from "@trident/plugins/meshlets/passes/MeshletDraw";
import { MeshletMesh } from "@trident/plugins/meshlets/MeshletMesh";
import { ImpostorMesh } from "@trident/plugins/Impostors/ImpostorMesh";
import { InstancedLODGroup } from "@trident/plugins/LOD/InstancedLODGroup";
import { HDRParser } from "@trident/plugins/HDRParser";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { InstancedMeshletMesh } from "@trident/plugins/meshlets/InstancedMeshletMesh";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(60, canvas.width / canvas.height, 0.5, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    // const floor = new GameObject();
    // floor.transform.position.y = -0.5;
    // floor.transform.scale.set(100, 100, 100);
    // floor.transform.eulerAngles.x = -90;
    // const meshbottom = floor.AddComponent(Components.Mesh);
    // meshbottom.geometry = Geometry.Plane();
    // meshbottom.material = new PBRMaterial();

    const hdr = await HDRParser.Load("./assets/textures/HDR/autumn_field_puresky_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    // const sky = new Sky();
    // await sky.init();
    // const skyTexture = sky.skyTextureCubemap;
    const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);
    iblLightingPass.SetEnvironment(skyTexture);
    skyboxPass.SetSkybox(skyTexture);

    const model = await GLTFLoader.Load("./assets/models/bunny.glb", scene);
    const material = new PBRMaterial({ albedoMap: await GPU.Texture.Load("./assets/textures/T_OmniDebugTexture_COL.jpg"), roughness: 1.0, metalness: 0.0, alphaCutoff: 0.1 });
    console.log("model", model)

    let geometry: Geometry;
    const modelMeshes = model.GetComponentsInChildren(Components.Mesh);
    for (const mesh of modelMeshes) {
        geometry = mesh.geometry;
    }
    geometry.ComputeBoundingVolume();
    geometry = geometry.Center();

    function MakeInstanced(instancedMesh: Components.InstancedMesh, rotation?: Mathf.Quaternion, scale?: Mathf.Vector3) {
        const p = new Mathf.Vector3();
        const q = rotation || new Mathf.Quaternion();
        const s = scale || new Mathf.Vector3(1, 1, 1);
        const m = new Mathf.Matrix4();
        const c = 100;
        const off = 10;
        const half = c * off * 0.5;
        let i = 0;
        const matrices = new Float32Array(c * c * c * 16);
        for (let x = 0; x < c; x++) {
            for (let y = 0; y < c; y++) {
                for (let z = 0; z < c; z++) {
                    p.set(x * off - half, y * off - half, z * off - half);
                    m.compose(p, q, s);
                    // instancedMesh.SetMatrixAt(i, m);
                    matrices.set(m.elements, i * 16);
                    i++;
                }
            }
        }
        instancedMesh.SetMatricesBulk(matrices);
    }

    // // Billboards
    // {
    //     const sampleTexture = await GPU.Texture.Load("./assets/textures/T_OmniDebugTexture_COL.jpg");
    //     // const sampleTexture = await GPU.Texture.Load("/packages/examples/assets/models/tree/branch.png", "rgba8unorm-srgb");

    //     // const angles = [[0, 0, 0], [0, 45, 0], [0, 90, 0], [0, -45, 0], [90, 0, 0]];
    //     const angles = [[0, 0, 0]];
    //     const radius = geometry.boundingVolume.radius;

    //     for (const angle of angles) {
    //         const billboardTexture = GPU.RenderTexture.Create(128, 128, 1, "rgba16float");
    //         const positon = new Mathf.Vector3(0, 0, 0);
    //         const rotation = new Mathf.Quaternion(0, 0, 0).setFromEuler(new Mathf.Vector3(angle[0], angle[1], angle[2]), true);
    //         const scale = new Mathf.Vector3(1 / radius, 1 / radius, 1 / radius);
    //         const modelMatrix = new Mathf.Matrix4().compose(positon, rotation, scale);
    //         await Billboarder.Create(geometry, modelMatrix, billboardTexture, sampleTexture);

    //         // const billboard = new GameObject();
    //         // billboard.transform.rotation.setFromEuler(new Mathf.Vector3(-angle[0], -angle[1], -angle[2]), true);
    //         // billboard.transform.position.set(4, 1, 0);
    //         // billboard.transform.scale.set(radius, radius, radius);
    //         // const billboardMesh = billboard.AddComponent(Components.Mesh);
    //         // billboardMesh.geometry = Geometry.Plane();
    //         // billboardMesh.material = new PBRMaterial({ albedoMap: billboardTexture, doubleSided: true, roughness: 1.0, metalness: 0, alphaCutoff: 0.1 });


    //         const gameObject = new GameObject();
    //         const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //         instancedMesh.geometry = Geometry.Plane();
    //         instancedMesh.material = new PBRMaterial({ albedoMap: billboardTexture, doubleSided: true, roughness: 1.0, metalness: 0, alphaCutoff: 0.1 });

    //         MakeInstanced(instancedMesh, new Mathf.Quaternion().setFromEuler(new Mathf.Vector3(-angle[0], -angle[1], -angle[2]), true), new Mathf.Vector3(radius, radius, radius));
    //     }
    // }

    // // Impostors
    // {
    //     const radius = 1;
    //     console.log(radius)
    //     const impostorGameObject = new GameObject();
    //     const impostor = impostorGameObject.AddComponent(ImpostorMesh);
    //     await impostor.Create(modelMeshes);

    //     const gameObject = new GameObject();
    //     const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //     instancedMesh.enableShadows = false;
    //     instancedMesh.geometry = impostor.geometry;
    //     instancedMesh.material = impostor.material;

    //     MakeInstanced(instancedMesh, new Mathf.Quaternion(), new Mathf.Vector3(radius, radius, radius));
    // }

    // // Meshoptimizer, simplified, minimum
    // {

    //     const indices = new Uint32Array(geometry.index.array);
    //     const vertices = geometry.attributes.get("position").array as Float32Array;
    //     const normals = geometry.attributes.get("normal").array as Float32Array;
    //     const uvs = geometry.attributes.get("uv").array as Float32Array;

    //     await Meshoptimizer.load();
    //     const result = Meshoptimizer.meshopt_simplify(indices, vertices, vertices.length / 3,  8, 128, 1000, 0);
    //     console.log(indices.length / 3, result.destination.length / 3)

    //     const gameObject = new GameObject();
    //     const instancedMesh = gameObject.AddComponent(Components.InstancedMesh);
    //     instancedMesh.geometry = geometry.Clone();
    //     instancedMesh.geometry.index = new IndexAttribute(result.destination);
    //     instancedMesh.material = material;
    //     MakeInstanced(instancedMesh);
    // }

  // Meshlets
  {
      Runtime.Renderer.RenderPipeline.AddPass(new MeshletDraw(), GPU.RenderPassOrder.BeforeGBuffer);
      geometry.ComputeNormals();
      geometry.ComputeTangents();

      const go = new GameObject();
      const meshletGroup = go.AddComponent(InstancedMeshletMesh);
      meshletGroup.geometry = geometry;
      meshletGroup.material = material;

      MakeInstanced(meshletGroup);
  }

    // // LODS
    // {
    //     await Meshoptimizer.load();

    //     const lodGameObject = new GameObject();
    //     const lodInstanceRenderable = lodGameObject.AddComponent(InstancedLODGroup);

    //     const indices = new Uint32Array(geometry.index.array);
    //     const vertices = geometry.attributes.get("position").array as Float32Array;

    //     const simplificationSteps = 3;
    //     const ratio = Math.floor(indices.length / (simplificationSteps + 1));
    //     const thresholds = [0.15, 0.08, 0.04, 0.02];

    //     // LOD 0: full geometry.
    //     lodInstanceRenderable.lods.push({
    //         renderers: [{ geometry: geometry.Clone(), material }],
    //         screenSize: thresholds[0],
    //     });

    //     // LOD 1..N-1: progressively simplified meshopt outputs.
    //     for (let lod = 0; lod < simplificationSteps; lod++) {
    //         const target_index_count = indices.length - (lod + 1) * ratio || 1;
    //         const result = Meshoptimizer.meshopt_simplify(
    //             indices, vertices, vertices.length / 3, 3, target_index_count, 1000, 0
    //         );

    //         const lodGeometry = geometry.Clone();
    //         lodGeometry.index = new IndexAttribute(result.destination);

    //         lodInstanceRenderable.lods.push({
    //             renderers: [{ geometry: lodGeometry, material }],
    //             screenSize: thresholds[lod + 1],
    //         });

    //         console.log(`LOD ${lod + 1}: ${result.destination.length / 3} tris @ ${thresholds[lod + 1]}`);
    //     }

    //     // Last LOD: billboard. Bake one view of the bunny onto a texture, slap it on a plane.
    //     const radius = geometry.boundingVolume.radius;
    //     const billboardTexture = GPU.RenderTexture.Create(256, 256, 1, "rgba16float");
    //     const sampleTexture = await GPU.Texture.Load("./assets/textures/T_OmniDebugTexture_COL.jpg");
    //     const billboardMatrix = new Mathf.Matrix4().compose(
    //         new Mathf.Vector3(0, 0, 0),
    //         new Mathf.Quaternion(),
    //         new Mathf.Vector3(1 / radius, 1 / radius, 1 / radius),
    //     );
    //     await Billboarder.Create(geometry, billboardMatrix, billboardTexture, sampleTexture);

    //     const billboardMaterial = new PBRMaterial({
    //         albedoMap: billboardTexture,
    //         doubleSided: true,
    //         roughness: 1.0,
    //         metalness: 0,
    //         alphaCutoff: 0.1,
    //     });

    //     lodInstanceRenderable.lods.push({
    //         renderers: [{ geometry: Geometry.Plane(), material: billboardMaterial }],
    //         screenSize: 0,
    //     });

    //     MakeInstanced(lodInstanceRenderable);
    // }

    Debugger.Enable();
};

Application(document.querySelector("canvas"));
