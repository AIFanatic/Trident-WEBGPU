import { Components, Mathf, GameObject, Runtime, GPU, Geometry } from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";
import { Debugger } from "@trident/plugins/Debugger";

import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { SHGenerator } from "@trident/plugins/SHGenerator";
import { GLSL2WGSL } from "@trident/plugins/GLSLParser/GLSLParser";
import { HDRParser } from "@trident/plugins/HDRParser";
import { UITextureViewer } from "@trident/plugins/ui/UIStats";
import { Environment } from "@trident/plugins/Environment/Environment";

import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";

async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject();
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 100);

    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    mainCameraGameObject.AddComponent(OrbitControls);

    const lightGameObject = new GameObject();
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.PointLight);
    light.intensity = 10;
    light.range = 20;

    // await GLTFLoader.Load("./assets/models/cornell.glb", scene);

    const hdr = await HDRParser.Load("./assets/textures/HDR/spruit_sunrise_1k.hdr");
    const skyTexture = await HDRParser.ToCubemap(hdr);
    const environment = new Environment(scene, skyTexture);
    await environment.init();

    const shgenerator = new SHGenerator();
    await shgenerator.Initialize(skyTexture.width);

    const coefficients = await shgenerator.FromCubemap(skyTexture);
    console.log(coefficients)


    console.warn("Continue moving IBL, Sky and PostExposureTonemap to a plugin, remove from core, then implement LightProbes")


    {

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

                @group(0) @binding(3) var<storage, read> Coeffs: array<vec4<f32>, 9>;
                
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
                        
                fn CalcIrradiance(nor: vec3f) -> vec3f { 
                    let c1 = 0.429043;
                    let c2 = 0.511664;
                    let c3 = 0.743125;
                    let c4 = 0.886227;
                    let c5 = 0.247708;
                    return (
                        c1 * Coeffs[8].xyz * (nor.x * nor.x - nor.y * nor.y) +
                        c3 * Coeffs[6].xyz * nor.z * nor.z +
                        c4 * Coeffs[0].xyz -
                        c5 * Coeffs[6].xyz +
                        2.0 * c1 * Coeffs[4].xyz * nor.x * nor.y +
                        2.0 * c1 * Coeffs[7].xyz * nor.x * nor.z +
                        2.0 * c1 * Coeffs[5].xyz * nor.y * nor.z +
                        2.0 * c2 * Coeffs[3].xyz * nor.x +
                        2.0 * c2 * Coeffs[1].xyz * nor.y +
                        2.0 * c2 * Coeffs[2].xyz * nor.z
                    );
                }
                        
                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    let shColor = CalcIrradiance(normalize(input.normal));

                    return vec4f(shColor, 1.0);
                }
            `,
                colorOutputs: [{ format: "rgba16float", blendMode: "alpha" }],
                depthOutput: "depth24plus",
            }),
        });

        const coeffsVec4 = new Float32Array(9 * 4);

        for (let i = 0; i < 9; i++) {
            coeffsVec4[i * 4 + 0] = coefficients[i * 3 + 0];
            coeffsVec4[i * 4 + 1] = coefficients[i * 3 + 1];
            coeffsVec4[i * 4 + 2] = coefficients[i * 3 + 2];
            coeffsVec4[i * 4 + 3] = 0;
        }
        
        material.shader.SetArray("Coeffs", coeffsVec4);

        const gameObject = new GameObject();
        gameObject.transform.scale.set(10, 10, 10);
        const mesh = gameObject.AddComponent(Components.Mesh);
        mesh.geometry = Geometry.Sphere();
        mesh.material = material;

        new UITextureViewer(Debugger.ui, "ENV", skyTexture);
    }

    Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
    Debugger.Enable();

    Runtime.Play();
};

Application(document.querySelector("canvas") as HTMLCanvasElement);