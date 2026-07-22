import { Components, Scene, GPU, Mathf, GameObject, Geometry, PBRMaterial, Component, VertexAttribute, Runtime, PlayerRuntime } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

async function Application(canvas: HTMLCanvasElement) {
    await PlayerRuntime.Create(canvas);
    const scene = PlayerRuntime.SceneManager.CreateScene("DefaultScene");
    PlayerRuntime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.transform.position.set(0, 0, -15);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(70, window.innerWidth / window.innerHeight, 0.1, 1000);


    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAt(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);

    const planeGO = new GameObject();
    planeGO.transform.eulerAngles.x = -90;
    planeGO.transform.position.set(0, -2, 0);
    planeGO.transform.scale.set(10000, 10000, 10000);
    const sphereMesh = planeGO.AddComponent(Components.Mesh);
    sphereMesh.geometry = Geometry.Plane();
    const mat = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1), metalness: 0.5, roughness: 0.5 });
    sphereMesh.material = mat;


    {
        const gizmoGO = new GameObject();
        const gizmoMesh = gizmoGO.AddComponent(Components.Mesh);
        gizmoMesh.enableShadows = false;
        gizmoMesh.geometry = Geometry.Cube().Clone();
        const cubeUVs = new Float32Array([
            // x+ RIGHT
            0, 0.5,
            0.333, 0.5,
            0, 1,
            0.333, 1,

            // x- LEFT
            0, 0,
            0.333, 0,
            0, 0.5,
            0.333, 0.5,

            // y+ TOP
            0.333, 0,
            0.667, 0,
            0.333, 0.5,
            0.667, 0.5,

            // y- BOTTOM
            0.333, 0.5,
            0.667, 0.5,
            0.333, 1,
            0.667, 1,

            // z+ — FRONT
            0.667, 0,
            1,     0,
            0.667, 0.5,
            1,     0.5,

            // z- — BACK
            0.667, 0.5,
            1, 0.5,
            0.667, 1,
            1, 1,
        ]);
        gizmoMesh.geometry.attributes.set("uv", new VertexAttribute(cubeUVs));
        gizmoMesh.material = new GPU.ShaderMaterial({
            isDeferred: false,
            shader: await GPU.Shader.Create({
                code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) normal : vec3<f32>,
                    @location(1) uv : vec2<f32>,
                };
                
                @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

                @group(0) @binding(2) var texture: texture_2d<f32>;
                @group(0) @binding(3) var textureSampler: sampler;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var out: VertexOutput;
                    var p = input.position;

                    var m = mat4x4<f32>(
                        frameBuffer.viewMatrix[0],
                        frameBuffer.viewMatrix[1],
                        frameBuffer.viewMatrix[2],
                        vec4f(0.0),
                    );
                    p = (m * vec4f(input.position, 1.0)).xyz;

                    p *= 0.1;
                    p += vec3f(0.8,0.8,0);
                    out.position = vec4f(p.xyz + vec3f(0,0,0.5), 1.0);
                    out.normal = input.normal;
                    out.uv = input.uv;
                    return out;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let color = textureSample(texture, textureSampler, input.uv);
                    return color;
                }
                `,
                colorOutputs: [{ format: "rgba16float" }],
                depthOutput: "depth24plus"
            })
        });

        gizmoMesh.material.shader.SetTexture("texture", await GPU.Texture.Load("/dist/examples/assets/textures/cube.png"));
        gizmoMesh.material.shader.SetSampler("textureSampler", new GPU.TextureSampler());
    }

    Debugger.Enable();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);