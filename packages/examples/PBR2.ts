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

import { HDRParser } from "@trident/plugins/HDRParser";

import { Environment } from "@trident/plugins/Environment/Environment";

async function Application(canvas: HTMLCanvasElement) {
    const renderer = GPU.Renderer.Create(canvas, "webgpu");
    const scene = new Scene(renderer);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(0, 0, 0);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 0.01;
    light.castShadows = false;

    const hdr = await HDRParser.Load("/extra/test-assets/editor/brown_photostudio_01_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();


    // Floor

    {
        const gameObject = new GameObject(scene);
        gameObject.transform.eulerAngles.x = -90;
        gameObject.transform.scale.set(10, 10, 10);
        gameObject.transform.position.set(0, -0.5, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Plane();
        const albedo = await GPU.Texture.Load("/dist/examples/assets/textures/uv_grid.png", "bgra8unorm-srgb");
        mesh.material = new PBRMaterial({ albedoMap: albedo, repeat: new Mathf.Vector2(5, 5) });
    }

    {
        const gameObject = new GameObject(scene);
        gameObject.transform.position.set(-2.25, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();


        const material = new GPU.Material({
            isDeferred: false,
            shader: await GPU.Shader.Create({
                code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) normal : vec3<f32>,
                @location(1) uv : vec2<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
            
                var modelMatrixInstance = modelMatrix[input.instanceIdx];
                var modelViewMatrix = viewMatrix * modelMatrixInstance;
            
                output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
                
                output.normal = input.normal.xyz;
                output.uv = input.uv;
            
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                return vec4f(input.normal, 0.2);
            }
            `,
                colorOutputs: [{ format: "rgba16float", blendMode: "alpha" }],
                depthOutput: "depth24plus",
            })
        });
        mesh.material = material; // new PBRMaterial({ isDeferred: false, albedoColor: new Mathf.Color(1, 0, 0, 0.5) }); // Glass
    }

    {
        const gameObject = new GameObject(scene);
        gameObject.transform.position.set(-0.75, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = new PBRMaterial({ metalness: 0, roughness: 1 }); // Rough
    }

    {
        const gameObject = new GameObject(scene);
        gameObject.transform.position.set(0.75, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = new PBRMaterial({ metalness: 1, roughness: 0 }); // Metal
    }

    {
        const gameObject = new GameObject(scene);
        gameObject.transform.position.set(2.25, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(75 / 255, 185 / 255, 200 / 255), metalness: 0.0, roughness: 0.2 }); // Metal Color
    }

    Debugger.Enable();
    scene.Start();
};

Application(document.querySelector("canvas"));