import {
    Components,
    Scene,
    GPU,
    Mathf,
    GameObject,
    Geometry,
    PBRMaterial,
    Runtime,
    VertexAttribute,
    IndexAttribute,
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { HDRParser } from "@trident/plugins/HDRParser";

import { Environment } from "@trident/plugins/Environment/Environment";

import { WireframePass } from "@trident/plugins/WireframePass";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas, window.devicePixelRatio);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);


    mainCameraGameObject.transform.position.set(0, 0, 5);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(0, 0, 0);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    light.intensity = 0.01;
    light.castShadows = false;

    // const hdr = await HDRParser.Load("/extra/test-assets/editor/brown_photostudio_01_1k.hdr");
    const hdr = await HDRParser.Load("/dist/examples/assets/textures/HDR/spruit_sunrise_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);

    const environment = new Environment(scene, skyTexture);
    await environment.init();


    function HighQualitySphere(
        radius = 0.5,
        widthSegments = 16,
        heightSegments = 16,
    ): Geometry {
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        for (let y = 0; y <= heightSegments; y++) {
            const v = y / heightSegments;
            const theta = v * Math.PI;

            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let x = 0; x <= widthSegments; x++) {
                const u = x / widthSegments;
                const phi = u * Math.PI * 2;

                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const nx = -cosPhi * sinTheta;
                const ny = cosTheta;
                const nz = sinPhi * sinTheta;

                vertices.push(radius * nx, radius * ny, radius * nz);
                normals.push(nx, ny, nz);
                uvs.push(u, 1 - v);
            }
        }

        for (let y = 0; y < heightSegments; y++) {
            for (let x = 0; x < widthSegments; x++) {
                const a = y * (widthSegments + 1) + x;
                const b = a + widthSegments + 1;
                const c = b + 1;
                const d = a + 1;

                if (y !== 0) {
                    indices.push(a, b, d);
                }

                if (y !== heightSegments - 1) {
                    indices.push(b, c, d);
                }
            }
        }

        const geometry = new Geometry();
        geometry.name = "HighQualitySphere";
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.ComputeTangents();

        return geometry;
    }
    // Floor

    {
        const gameObject = new GameObject();
        gameObject.transform.eulerAngles.x = -90;
        gameObject.transform.scale.set(10, 10, 10);
        gameObject.transform.position.set(0, -0.5, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Plane();
        const albedo = await GPU.Texture.Load("/dist/examples/assets/textures/uv_grid.png", "bgra8unorm-srgb");
        mesh.material = new PBRMaterial({ albedoMap: albedo, repeat: new Mathf.Vector2(5, 5) });
    }

    {
        const gameObject = new GameObject();
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
        const gameObject = new GameObject();
        gameObject.transform.position.set(-0.75, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = new PBRMaterial({ metalness: 0, roughness: 1 }); // Rough
    }

    {
        const gameObject = new GameObject();
        gameObject.transform.position.set(0.75, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = new PBRMaterial({ metalness: 1, roughness: 0 }); // Metal
    }

    {
        const gameObject = new GameObject();
        gameObject.transform.position.set(2.25, 0, 0);
        const mesh = gameObject.AddComponent(Components.Mesh);
          mesh.geometry = HighQualitySphere();
        mesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(75 / 255, 185 / 255, 200 / 255), metalness: 0.0, roughness: 0.2 }); // Metal Color
    }

    // const wireframe = new WireframePass();
    // Runtime.Renderer.RenderPipeline.AddPass(wireframe, GPU.RenderPassOrder.AfterLighting);

    Debugger.Enable();
    Runtime.Play();
};

Application(document.querySelector("canvas"));