import { GameObject } from "../GameObject";
import { Camera } from "../components/Camera";
import { Scene } from "../Scene";
import { Renderer } from "../renderer/Renderer";
import { OrbitControls } from "../plugins/OrbitControls";

import { Vector3 } from "../math/Vector3";
import { RendererContext } from "../renderer/RendererContext";
import { Geometry, IndexAttribute, InterleavedVertexAttribute, VertexAttribute } from "../Geometry";
import { Compute, Shader } from "../renderer/Shader";
import { ComputeContext } from "../renderer/ComputeContext";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Debugger } from "../plugins/Debugger";
import { OBJLoaderIndexed } from "../plugins/OBJLoader";
import { CubeTexture, DepthTexture, RenderTexture3D, RenderTextureArray, RenderTextureStorage, RenderTextureStorage3D, RenderTextureStorageArray, RenderTextureStorageCube, Texture, Texture3D, TextureArray } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { VoxelGenerator } from "../plugins/VoxelGenerator";

const canvas = document.createElement("canvas");
const aspectRatio = window.devicePixelRatio;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);

interface Object3D {
    gameObject: GameObject;
    geometry: Geometry;
    shader: Shader;
};

async function Application() {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    // mainCameraGameObject.transform.position.set(0,0,15);
    mainCameraGameObject.transform.position.z = 5;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 50000);
    camera.transform.LookAt(new Vector3(0,0,0));

    const controls = new OrbitControls(canvas, camera);

    function RenderObjects(camera: Camera, objects: Object3D[], depthTexture: DepthTexture) {
        camera.Update();
        camera.transform.Update();

        for (const object of objects) {
            object.gameObject.transform.Update();
            object.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
            object.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
            // object.shader.SetMatrix4("modelMatrix", object.gameObject.transform.localToWorldMatrix);

            object.shader.SetMatrix4("invViewMatrix", camera.viewMatrix.clone().invert());
        }

        Renderer.BeginRenderFrame();

        RendererContext.BeginRenderPass("Forward", [{clear: true}], {target: depthTexture, clear: true}, true);
        for (const object of objects) {
            RendererContext.DrawGeometry(object.geometry, object.shader);
        }
        RendererContext.EndRenderPass();
    
        Renderer.EndRenderFrame();
    }

    async function PlaneTexture(texture: Texture, position: Vector3): Promise<Object3D> {

        const shader = await Shader.Create({
            code: `
            //--------------------------------------------------------------------------------
            // common structs & bindings
            //--------------------------------------------------------------------------------
            struct VertexInput {
                @location(0) position : vec4<f32>,
                @location(1) normal   : vec4<f32>,
                @location(2) uv       : vec4<f32>,
            };
            
            struct VertexOutput {
                @builtin(position)   position   : vec4<f32>,
                @location(0)         uv         : vec2<f32>,
                @location(1)         rayOrigin  : vec3<f32>,
                @location(2)         rayDir     : vec3<f32>,
            };
            
            // camera / matrix uniforms
            @group(0) @binding(0) var<storage, read> projectionMatrix : mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix       : mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> invViewMatrix    : mat4x4<f32>;
            
            // voxel‐grid parameters in one UBO (must be 16‐byte aligned)
            struct Grid {
                origin   : vec4<f32>,  // xyz = world‐space corner of voxel (0,0,0)
                cellSize : vec4<f32>,  // xyz = size of one voxel in world units
                dims     : vec4<i32>,  // xyz = integer dimensions of the grid
            };
            @group(0) @binding(3) var<storage, read> grid : Grid;
            
            // the occupancy texture (no sampler; we use textureLoad)
            @group(0) @binding(4) var voxels : texture_3d<u32>;
            
            //--------------------------------------------------------------------------------
            // helper: intersect a ray with the grid‐AABB in grid‐space
            // returns (tmin, tmax)
            fn intersectAABB(ro: vec3<f32>, rd: vec3<f32>, bmin: vec3<f32>, bmax: vec3<f32>) -> vec2<f32> {
                let invDir = 1.0 / rd;
                let t0 = (bmin - ro) * invDir;
                let t1 = (bmax - ro) * invDir;
            
                let tmin = max(
                    max(min(t0.x, t1.x), min(t0.y, t1.y)),
                    min(t0.z, t1.z)
                );
                let tmax = min(
                    min(max(t0.x, t1.x), max(t0.y, t1.y)),
                    max(t0.z, t1.z)
                );
                return vec2<f32>(tmin, tmax);
            }
            
            //--------------------------------------------------------------------------------
            // generate a ray from the camera through the UV
            //--------------------------------------------------------------------------------
            struct Ray { origin: vec3<f32>, dir: vec3<f32> };
            
            fn rayFromCamera(uv: vec2<f32>,
                             invView: mat4x4<f32>,
                             proj   : mat4x4<f32>) -> Ray {
                // NDC (flip Y)
                let ndc = (uv * 2.0 - 1.0) * vec2<f32>(1, -1);
                // back‐project into view space
                let dirView = normalize(vec3<f32>(
                    ndc.x / proj[0][0],
                    ndc.y / proj[1][1],
                   -1.0
                ));
                // to world space (w=0 for direction)
                let dirWorld = (invView * vec4<f32>(dirView, 0.0)).xyz;
                // camera origin (invView * [0,0,0,1])
                let originWorld = (invView * vec4<f32>(0.0,0.0,0.0,1.0)).xyz;
                return Ray(originWorld, normalize(dirWorld));
            }
            
            //--------------------------------------------------------------------------------
            // vertex stage: pass through UV + ray
            //--------------------------------------------------------------------------------
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var out: VertexOutput;
                out.position = input.position;    // assume full‑screen quad in clip‐space
                out.uv       = input.uv.xy;
                let ray = rayFromCamera(out.uv, invViewMatrix, projectionMatrix);
                out.rayOrigin = ray.origin;
                out.rayDir = ray.dir;
                return out;
            }
            
            //--------------------------------------------------------------------------------
            // fragment stage: DDA through the uint3‐grid with AABB entry
            //--------------------------------------------------------------------------------
            @fragment
            fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
                let ro = in.rayOrigin;
                let rd = normalize(in.rayDir);

                // bring into grid‐space (1 voxel = 1 unit)
                let invCell = vec3<f32>(1.0) / grid.cellSize.xyz;
                var pos     = (ro - grid.origin.xyz) * invCell;
                let dir     = rd * invCell;

                // marching params
                let MAX_STEPS : i32 = 256;
                let STEP_SIZE : f32 = grid.cellSize.x;   // half a voxel per step

                var t : f32 = 0.0;
                for (var i: i32 = 0; i < MAX_STEPS; i = i + 1) {
                    let p   = ro + rd * t;
                    let gs  = (p - grid.origin.xyz) * invCell;
                    let idx = vec3<i32>(floor(gs));

                    // if outside, we’re done
                    if (idx.x < 0 || idx.y < 0 || idx.z < 0 ||
                        idx.x >= grid.dims.x ||
                        idx.y >= grid.dims.y ||
                        idx.z >= grid.dims.z) {
                        break;
                    }

                    // sample occupancy
                    if (textureLoad(voxels, idx, 0).r > 0u) {
                        // hit → white
                        return vec4<f32>(1.0, 1.0, 1.0, 1.0);
                    }

                    t = t + STEP_SIZE;
                }

                // no hit → black
                return vec4<f32>(0.0, 0.0, 0.0, 1.0);
            }
            `,
            uniforms: {
                projectionMatrix: {group: 0, binding: 0, type: "storage"},
                viewMatrix: {group: 0, binding: 1, type: "storage"},
                invViewMatrix: {group: 0, binding: 2, type: "storage"},
                grid: {group: 0, binding: 3, type: "storage"},
                voxels: {group: 0, binding: 4, type: "texture"},
            },
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            depthOutput: "depth24plus",
            cullMode: "none"
        });

        shader.SetTexture("voxels", texture);
        // shader.SetSampler("imageSampler", TextureSampler.Create({
        //     magFilter: "nearest",
        //     minFilter: "nearest",
        //     mipmapFilter: "nearest",
        //     addressModeU: "clamp-to-edge",
        //     addressModeV: "clamp-to-edge"}
        // ));
        const gameObject = new GameObject(scene);
        gameObject.transform.position.copy(position);

        return {gameObject: gameObject, geometry: Geometry.Plane(), shader: shader};
    }
    

    const depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    // const texture = Texture.Create(512, 512);
    // const planeTexture = await PlaneTexture(texture, new Vector3(0,0,0));

    let objects: Object3D[] = [];
    // objects.push(planeTexture);

    

    {
        // const suzanne = (await OBJLoaderIndexed.load("./assets/suzanne.obj"))[0];
        // const suzanne_sdf_texture = await VoxelGenerator.Generate(suzanne.geometry, new Vector3(1, 1, 1));

        const bunny = (await OBJLoaderIndexed.load("./assets/bunny.obj"))[0];
        const bunny_sdf_texture = await VoxelGenerator.Generate(bunny.geometry, new Vector3(1, 1, 1));
        
        const scene_sdf_resolution = 256;
        const scene_sdf_texture = RenderTexture3D.Create(bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth, "r32uint");
        // scene_sdf_texture.SetData(new Float32Array(Math.pow(scene_sdf_resolution, 3)).fill(0.01))

        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToTextureV3(
            {texture: bunny_sdf_texture, origin: [0, 0, 0]},
            {texture: scene_sdf_texture, origin: [0, 0, 0]},
            [bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth]
        );
        Renderer.EndRenderFrame();

        // Renderer.BeginRenderFrame();
        // RendererContext.CopyTextureToTextureV3(
        //     {texture: suzanne_sdf_texture, origin: [0, 0, 0]},
        //     {texture: scene_sdf_texture, origin: [70, 70, 70]},
        //     [suzanne_sdf_texture.width, suzanne_sdf_texture.height, suzanne_sdf_texture.depth]
        // );
        // Renderer.EndRenderFrame();

        const planeTexture = await PlaneTexture(scene_sdf_texture, new Vector3(0,0,0));
        planeTexture.shader.SetArray("grid", new Float32Array([
            0, 0, 0, 0, // origin
            0.025, 0.025, 0.025, 0, // cellSize
            bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth, 0 // dims
        ]))
        objects.push(planeTexture)
    }

    const render = () => {

        RenderObjects(camera, objects, depthTexture);

        requestAnimationFrame(() => { render() })
    }
    render();

    // scene.Start();
};

Application();