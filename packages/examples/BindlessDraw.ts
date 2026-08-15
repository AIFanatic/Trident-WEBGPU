import { Components, GameObject, Geometry, GPU, Mathf, PlayerRuntime, Runtime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { BindlessPBRMaterial } from "@trident/plugins/Bindless/BindlessPBRMaterial";
import { BindlessMesh } from "@trident/plugins/Bindless/components/BindlessMesh";
import { BindlessInstancedMesh } from "@trident/plugins/Bindless/components/BindlessInstancedMesh";
import { BindlessInstancedLODGroup } from "@trident/plugins/Bindless/components/BindlessInstancedLODGroup";

import { BindlessDrawPass } from "@trident/plugins/Bindless/passes/BindlessDrawPass";
import { BindlessShadowPass } from "@trident/plugins/Bindless/passes/BindlessShadowPass";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);

    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const cameraObject = new GameObject();
    cameraObject.name = "MainCamera";
    cameraObject.transform.position.set(0, 0, 5);

    const camera = cameraObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.01, 500);

    cameraObject.AddComponent(OrbitControls);

    const lightObject = new GameObject();
    lightObject.transform.position.set(3, 4, 3);
    lightObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightObject.AddComponent(Components.DirectionalLight);
    light.intensity = 2;
    light.castShadows = true;

    Runtime.Renderer.RenderPipeline.AddPass(new BindlessDrawPass(), GPU.RenderPassOrder.AfterGBuffer);
    Runtime.Renderer.RenderPipeline.AddPass(new BindlessShadowPass(), GPU.RenderPassOrder.AfterGBuffer);

    const cubeGeometry = Geometry.Cube();
    const redRough = new BindlessPBRMaterial({ albedo: [1.0, 0.15, 0.15, 1], roughness: 0.9 });
    const whiteMetal = new BindlessPBRMaterial({ albedo: [0.9, 0.9, 0.9, 1], roughness: 0.25, metalness: 1 });

    for (const [x, material] of [[-1.5, redRough], [0, redRough], [1.5, whiteMetal]] as const) {
        const go = new GameObject();
        go.transform.position.set(x, 0, 0);
        const mesh = go.AddComponent(BindlessMesh);
        mesh.geometry = cubeGeometry;
        mesh.material = material;
    }

    const ground = new GameObject();
    ground.transform.position.set(0, -1.5, 0);
    ground.transform.scale.set(20, 0.2, 20);
    const groundMesh = ground.AddComponent(BindlessMesh);
    groundMesh.geometry = cubeGeometry;
    groundMesh.material = new BindlessPBRMaterial({ albedo: [0.5, 0.5, 0.55, 1], roughness: 0.95 });

    function translation(x: number, y: number, z: number): Float32Array {
        return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
    }

    // const N = 10;   // 100x100 = 10,000 cubes
    // const field = new GameObject();
    // const instanced = field.AddComponent(BindlessInstancedMesh);
    // instanced.capacity = N * N * N;
    // instanced.geometry = cubeGeometry;
    // instanced.material = redRough;

    // let i = 0;
    // for (let x = 0; x < N; x++)
    //     for (let y = 0; y < N; y++)
    //         for (let z = 0; z < N; z++)
    //             instanced.SetMatrixAt(i++, translation((x - N / 2) * 2, (y - N / 2) * 2, (z - N / 2) * 2));




    const lodGO = new GameObject();
    lodGO.name = "BindlessLODField";
    const lodGroup = lodGO.AddComponent(BindlessInstancedLODGroup);
    // lodGroup.enableShadows = false;

    lodGroup.lods = [
        { screenSize: 0.20, renderers: [{ geometry: Geometry.Sphere(), material: new BindlessPBRMaterial({ albedo: [0.2, 0.9, 0.2, 1], roughness: 0.6 }) }] },
        { screenSize: 0.05, renderers: [{ geometry: Geometry.Cube(), material: new BindlessPBRMaterial({ albedo: [0.9, 0.8, 0.1, 1], roughness: 0.6 }) }] },
        { screenSize: 0.0, renderers: [{ geometry: Geometry.Cube(), material: new BindlessPBRMaterial({ albedo: [0.9, 0.2, 0.2, 1], roughness: 0.6 }) }] },
    ];

    const N = 200;                      // 200 x 200 = 40,000 instances
    const SPACING = 4;
    lodGroup.ReserveInstances(N * N);

    let li = 0;
    for (let x = 0; x < N; x++)
        for (let z = 0; z < N; z++)
            lodGroup.SetMatrixAt(li++, translation((x - N / 2) * SPACING, 0, (z - N / 2) * SPACING));

    Debugger.Enable();
}

Application(
    document.querySelector("canvas") as HTMLCanvasElement
);