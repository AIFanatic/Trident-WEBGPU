import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    PBRMaterial,
    GPU,
    Input,
    MouseCodes,
    KeyCodes,
    Runtime
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

import { Debugger } from "@trident/plugins/Debugger";
import { SSS_V2 } from "@trident/plugins/SSS_V2";
import { FullscreenQuad } from "@trident/plugins/FullscreenQuad";
import { UIFolder, UIVecStat } from "@trident/plugins/ui/UIStats";
import { DirectionalLightHelper } from "@trident/plugins/DirectionalLightHelper";


async function Application(canvas: HTMLCanvasElement) {
    await Runtime.Create(canvas);
    const scene = Runtime.SceneManager.CreateScene("DefaultScene");
    Runtime.SceneManager.SetActiveScene(scene);

    const mainCameraGameObject = new GameObject(scene);
    mainCameraGameObject.transform.position.set(0, 0, 20);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);


    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(2, 5, 10);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);
    // const light = lightGameObject.AddComponent(Components.SpotLight);
    // light.range = 200;
    // light.angle = 90;
    light.intensity = 3;
    light.color.set(1, 1, 1, 1);
    light.castShadows = false;

    // const top = new GameObject(scene);
    // top.transform.scale.set(100, 100, 1);
    // top.transform.position.y = -5.1;
    // top.transform.eulerAngles.x = -90;
    // const meshtop = top.AddComponent(Components.Mesh);
    // meshtop.geometry = Geometry.Plane();
    // meshtop.material = new PBRMaterial();


    const roughness = 0.7;
    const metalness = 0.1;

    // const topMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    const floorMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    // const backMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });

    // const leftMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(1, 0, 0, 1), roughness: roughness, metalness: metalness });
    // const rightMaterial = new PBRMaterial({ albedoColor: new Mathf.Color(0, 1, 0, 1), roughness: roughness, metalness: metalness });

    const planeGeometry = Geometry.Plane();
    const cubeGeometry = Geometry.Cube();

    const floor = new GameObject(scene);
    floor.transform.scale.set(5, 5, 5);
    floor.transform.position.y = -5;
    floor.transform.eulerAngles.x = -90;
    const meshbottom = floor.AddComponent(Components.Mesh);
    meshbottom.geometry = planeGeometry;
    meshbottom.material = floorMaterial;

    // const left = new GameObject(scene);
    // left.transform.scale.set(0.05, 10, 10);
    // left.transform.position.x = -5;
    // // left.transform.eulerAngles.y = 90;
    // const meshleft = left.AddComponent(Components.Mesh);
    // meshleft.geometry = cubeGeometry;
    // meshleft.material = leftMaterial;


    // const right = new GameObject(scene);
    // right.transform.scale.set(0.05, 10, 10);
    // right.transform.position.x = 5;
    // // right.transform.eulerAngles.y = -90;
    // const meshright = right.AddComponent(Components.Mesh);
    // meshright.geometry = cubeGeometry;
    // meshright.material = rightMaterial;

    // const back = new GameObject(scene);
    // back.transform.scale.set(10, 10, 0.05);
    // back.transform.position.z = -5;
    // const meshback = back.AddComponent(Components.Mesh);
    // meshback.geometry = cubeGeometry;
    // meshback.material = backMaterial;

    // const cube = new GameObject(scene);
    // cube.transform.scale.set(2, 4, 2);
    // cube.transform.position.set(-2, -3, -2);
    // cube.transform.eulerAngles.y = 20;
    // const cubeMesh = cube.AddComponent(Components.Mesh);
    // cubeMesh.geometry = cubeGeometry;
    // cubeMesh.material = new PBRMaterial({ albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    // // cubeMesh.enableShadows = false;

    const cube2 = new GameObject(scene);
    cube2.transform.scale.set(2, 2, 2);
    cube2.transform.position.set(2, -4, 2);
    cube2.transform.eulerAngles.y = 65;
    const cubeMesh2 = cube2.AddComponent(Components.Mesh);
    cubeMesh2.geometry = cubeGeometry;
    cubeMesh2.material = new PBRMaterial({ emissiveColor: new Mathf.Color(1, 0, 0, 1), albedoColor: new Mathf.Color(1, 1, 1, 1), roughness: roughness, metalness: metalness });
    // cubeMesh2.enableShadows = false;


    const back = new GameObject(scene);
    back.transform.scale.set(10, 10, 1);
    // back.transform.position.z = -5;
    const meshback = back.AddComponent(Components.Mesh);
    meshback.geometry = Geometry.Plane();
    // meshback.material = new PBRMaterial({ albedoMap: await GPU.Texture.Load("/extra/test-assets/pebbles.png"), normalMap: await GPU.Texture.Load("/extra/test-assets/pebbles-normal-3.png", "rgba8unorm") });
    meshback.material = new PBRMaterial({
        albedoMap: await GPU.Texture.Load("/extra/test-assets/terrain/brown_mud_leaves_01/brown_mud_leaves_01_diff_1k.jpg", "rgba8unorm-srgb"),
        normalMap: await GPU.Texture.Load("/extra/test-assets/terrain/brown_mud_leaves_01/brown_mud_leaves_01_nor_gl_1k.jpg", "rgba8unorm")
    });



    let SampleCount = 32.0;
    let HeightScale = 0.8;       // was 1.5 - less exaggeration on fine normals
    let ShadowHardness = 3.0;     // was 2.0 - sharper shadows to show fine detail
    let ShadowLength = 0.015;     // was 0.05 - MUCH shorter walk for fine detail

    const t = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    const f = new FullscreenQuad({
        code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };

            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
                @location(1) fragCoord : vec2<f32>,
            };

            struct Params {
                resolution : vec4<f32>,
                lightDir: vec4<f32>,

                SampleCount: f32,
                HeightScale: f32,        // was 1.5 - less exaggeration on fine normals
                ShadowHardness: f32,     // was 2.0 - sharper shadows to show fine detail
                ShadowLength: f32,     // was 0.05 - MUCH shorter walk for fine detail
            };

            @group(0) @binding(0) var texSampler : sampler;
            @group(0) @binding(1) var lightingTex : texture_2d<f32>;
            @group(0) @binding(2) var normalTex : texture_2d<f32>;
            @group(0) @binding(4) var<uniform> params : Params;
            @group(0) @binding(5) var<storage, read> frameBuffer : FrameBuffer;

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4<f32>(input.position, 1.0);
                output.uv = input.uv;
                // Reconstruct fragCoord-equivalent from NDC position
                output.fragCoord = (input.position.xy * 0.5 + 0.5) * params.resolution.xy;
                output.fragCoord.y = params.resolution.y - output.fragCoord.y;
                return output;
            }
                

            fn computeNormal(uv: vec2f, texelSize: vec2f) -> vec3f {
                let normalSample = textureSampleLevel(normalTex, texSampler, uv, 0.0);
                var worldNormal = OctDecode(normalSample.rg);
                
                // Boost XY to make fine detail cast stronger shadows
                // Increase this multiplier (1.0 = no boost, 3.0 = strong boost)
                let normalStrength = 2.5;
                worldNormal = normalize(vec3(worldNormal.xy * normalStrength, worldNormal.z));
                
                return worldNormal;
            }
                
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let resolution = params.resolution.xy;
                let uv = vec2(input.fragCoord.x / resolution.x, input.fragCoord.y / resolution.y);
                let texelSize = 1.0 / vec2f(textureDimensions(normalTex));

                // World space normal (no view transform)
                var normal = computeNormal(uv, texelSize);

                // World space light direction (from preFrame, see JS change below)
                let lightdir = normalize(params.lightDir.xyz);

                // NdotL
                let lighting = clamp(dot(lightdir, normal), 0.0, 1.0);

                let aspectRatio = resolution.x / resolution.y;
                let dir = vec2(lightdir.x / aspectRatio, -lightdir.y) * params.HeightScale;

                let invsamplecount = 1.0 / params.SampleCount;
                let hardness = params.HeightScale * params.ShadowHardness;
                let stepSize = invsamplecount * params.ShadowLength;

                var noise = fract(input.fragCoord.xy * 0.5);
                noise.x = (noise.x * 0.5 + noise.y) * (1.0 / 1.5 - 0.25);
                var pos = stepSize * noise.x;

                var slope = -lighting;
                var maxslope = 0.0;
                var shadow = 0.0;

                for (var i = 0; i < i32(params.SampleCount); i++) {
                    let tmpNormal = computeNormal(uv + dir * pos, texelSize);
                    let tmpLighting = dot(lightdir, tmpNormal);
                    let shadowed = -tmpLighting;

                    slope += shadowed;

                    if (slope > maxslope) {
                        shadow += hardness * (1.0 - pos);
                    }
                    maxslope = max(maxslope, slope);
                    pos += stepSize;
                }

                shadow = clamp(1.0 - shadow * invsamplecount, 0.0, 1.0);

                let color = textureSample(lightingTex, texSampler, uv);
                return color * clamp(shadow, 0.4, 1.0);
                // return vec4<f32>(clamp(shadow, 0.5, 1.0));
            }
        `,
        target: t,
        init: (resources, shader) => {
            shader.SetSampler("texSampler", new GPU.TextureSampler());
        },
        preFrame: (resources, shader) => {
            const lighting = resources.getResource(GPU.PassParams.LightingPassOutput);
            const normalTex = resources.getResource(GPU.PassParams.GBufferNormal);
            const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
            if (!lighting) return;
            shader.SetTexture("lightingTex", lighting);
            shader.SetTexture("normalTex", normalTex);
            shader.SetTexture("frameBuffer", frameBuffer);

            const lightWorldPos = light.transform.position;
            const lightWorldDir = lightWorldPos.clone()
                .sub(new Mathf.Vector3(0, 0, 0))
                .normalize();

            // Pass world space dir directly - NO view matrix multiplication
            shader.SetArray("params", new Float32Array([
                GPU.Renderer.width, GPU.Renderer.height, 0, 0,
                lightWorldDir.x, lightWorldDir.y, lightWorldDir.z, 1.0,
                
                SampleCount,
                HeightScale,        // was 1.5 - less exaggeration on fine normals
                ShadowHardness,     // was 2.0 - sharper shadows to show fine detail
                ShadowLength,     // was 0.05 - MUCH shorter walk for fine detail
            ]));
        },
        afterExecute: (resources, shader) => {
            const lighting = resources.getResource(GPU.PassParams.LightingPassOutput);
            if (!lighting) return;
            GPU.RendererContext.CopyTextureToTextureV3({ texture: t }, { texture: lighting });
        }

    });
    Runtime.Renderer.RenderPipeline.AddPass(f, GPU.RenderPassOrder.AfterLighting);

    const lightSettings = new UIFolder(Debugger.ui, "Light");
    new UIVecStat(lightSettings, "Position:",
        { min: -10, max: 10, step: 0.1, value: light.transform.position.x },
        { min: -10, max: 10, step: 0.1, value: light.transform.position.y },
        { min: -10, max: 10, step: 0.1, value: light.transform.position.z },
        undefined,
        value => {
            light.transform.position.set(value.x, value.y, value.z)
        }
    );

    const go = new GameObject(scene);
    const dirHelper = go.AddComponent(DirectionalLightHelper);
    dirHelper.light = light;

    setInterval(() => {
        const iTime = performance.now() / 1000;
        // light.transform.position.x = (Math.sin(iTime * 1.0) + 1.0) * 5;
        light.transform.position.x = (Math.sin(iTime * 1.0)) * 5 - 2.5;
		light.transform.position.y = (Math.cos(iTime * 2.5)) * 10 - 1.5;
    }, 100);

    Debugger.Enable();

    Runtime.Play();
};

Application(document.querySelector("canvas"));