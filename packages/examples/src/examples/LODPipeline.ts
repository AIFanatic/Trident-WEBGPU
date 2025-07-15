import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { RendererContext } from "../renderer/RendererContext";
import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";
import { Compute, Shader } from "../renderer/Shader";
import { ComputeContext } from "../renderer/ComputeContext";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Debugger } from "../plugins/Debugger";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { CubeTexture, DepthTexture, Texture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    // mainCameraGameObject.transform.position.set(0,0,15);
    mainCameraGameObject.transform.position.z = -5;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,0));

    const controls = new OrbitControls(canvas, camera);

    const depth = DepthTexture.Create(Renderer.width, Renderer.height);
    const shader = await Shader.Create({
        code: `
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
            @location(2) uv : vec2<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) normal : vec3<f32>,
            @location(1) uv : vec2<f32>,
            @location(2) fragPosition : vec4<f32>,
        };
        
        @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

        @group(0) @binding(3) var cubemap: texture_cube<f32>;
        @group(0) @binding(4) var cubemapSampler: sampler;

        @vertex
        fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
            var output : VertexOutput;
            var modelViewMatrix = viewMatrix * modelMatrix[instanceIdx];
            output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
            output.normal = input.normal;
            output.uv = input.uv;
            output.fragPosition = 0.5 * (vec4(input.position, 0.0) + vec4(1.0, 1.0, 1.0, 1.0));

            return output;
        }
        
        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            var light_pos = vec4(0.5, 1.0, 2.0, 1.0);
            var surface_pos = vec4(input.normal, 1.0);
            var normal_direction = vec4(vec3(input.normal), 0.0);
            var light_direction = normalize(light_pos-surface_pos);
            var intensity = dot(normal_direction, light_direction);
            intensity = clamp(intensity, 0.2, 1.0);
            // return vec4(intensity, intensity, intensity, 1.0);

            var cubemapVec = input.fragPosition.xyz - vec3(0.5);
            cubemapVec.z *= -1;
            return textureSample(cubemap, cubemapSampler, cubemapVec);
        }
        `,
        uniforms: {
            projectionMatrix: {group: 0, binding: 0, type: "storage"},
            viewMatrix: {group: 0, binding: 1, type: "storage"},
            modelMatrix: {group: 0, binding: 2, type: "storage"},
            cubemap: {group: 0, binding: 3, type: "texture"},
            cubemapSampler: {group: 0, binding: 4, type: "sampler"},
        },
        attributes: {
            position: {location: 0, size: 3, type: "vec3"},
            normal: {location: 1, size: 3, type: "vec3"},
            uv: {location: 2, size: 3, type: "vec2"},
        },
        colorOutputs: [{format: Renderer.SwapChainFormat}],
        depthOutput: "depth24plus",
        cullMode: "none"
    });
    
    // const geometry = Geometry.Cube();
    const geometry = new Geometry();
    const bunny = await OBJLoaderIndexed.load("./bunny.obj");
    const bunnyGeometry = new Geometry();
    bunnyGeometry.attributes.set("position", new VertexAttribute(bunny.vertices));
    if (bunny.normals) bunnyGeometry.attributes.set("normal", new VertexAttribute(bunny.normals));
    if (bunny.uvs) bunnyGeometry.attributes.set("uv", new VertexAttribute(bunny.uvs));
    if (bunny.indices) bunnyGeometry.index = new IndexAttribute(new Uint32Array(bunny.indices));

    geometry.attributes.set("position", new VertexAttribute(bunny.vertices));
    geometry.attributes.set("normal", new VertexAttribute(bunny.normals));
    geometry.attributes.set("uv", new VertexAttribute(bunny.uvs));
    geometry.index = new IndexAttribute(bunny.indices);

    let previousTime: number = 0;

    const loadTextures = async (): Promise<Texture> => {
        const urls = [
            './assets/cubemap/pos-x.jpg',
            './assets/cubemap/neg-x.jpg',
            './assets/cubemap/pos-y.jpg',
            './assets/cubemap/neg-y.jpg',
            './assets/cubemap/pos-z.jpg',
            './assets/cubemap/neg-z.jpg',
        ]
        let textures: Texture[] = [];
        for (const url of urls) {
            textures.push(await Texture.Load(url));
        }
        
        const source = textures[0];
        const cubemap = CubeTexture.Create(source.width, source.height, urls.length);

        renderer.BeginRenderFrame();
        for (let i = 0; i < textures.length; i++) {
            RendererContext.CopyTextureToTextureV3({texture: textures[i]}, {texture: cubemap, origin: [0, 0, i]})
        }
        renderer.EndRenderFrame();

        return cubemap;
    }
    const cubemap = await loadTextures();
    shader.SetTexture("cubemap", cubemap);
    shader.SetSampler("cubemapSampler", TextureSampler.Create());

    const bunnyGameObject = new GameObject(scene);
    bunnyGameObject.transform.scale.set(0.01, 0.01, 0.01);
    // bunnyGameObject.transform.scale.set(2, 2, 2);
    const render = () => {
        camera.Update();
        camera.transform.Update();
        bunnyGameObject.transform.Update();
        shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        shader.SetMatrix4("viewMatrix", camera.viewMatrix);
        shader.SetMatrix4("modelMatrix", bunnyGameObject.transform.localToWorldMatrix);

        renderer.BeginRenderFrame();

        RendererContext.BeginRenderPass("Forward", [{clear: true}], {target: depth, clear: true}, true);
        RendererContext.DrawGeometry(geometry, shader);
        RendererContext.EndRenderPass();
    
        renderer.EndRenderFrame();

        requestAnimationFrame(() => { render() })

        const currentTime = performance.now();
        const elapsed = currentTime - previousTime;
        previousTime = currentTime;
        Debugger.SetFPS(1 / elapsed * 1000);

        // setTimeout(() => {
        //     render();
        // }, 1000);
    }
    render();

    // scene.Start();
};

Application();