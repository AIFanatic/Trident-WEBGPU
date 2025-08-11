import {
    GameObject,
    Geometry,
    Scene,
    Components,
    Mathf,
    GPU,
    PBRMaterial,
    Renderer
} from "@trident/core";

import { OrbitControls } from "@trident/plugins/OrbitControls";

import { OBJLoaderIndexed } from "@trident/plugins/OBJLoader";
import { VoxelGenerator } from "@trident/plugins/VoxelGenerator";

interface Object3D {
    gameObject: GameObject;
    geometry: Geometry;
    shader: GPU.Shader;
};

async function Application(canvas: HTMLCanvasElement) {
    const renderer = Renderer.Create(canvas, "webgpu");

    const scene = new Scene(renderer);
    const mainCameraGameObject = new GameObject(scene);
    // mainCameraGameObject.transform.position.set(0,0,15);
    mainCameraGameObject.transform.position.z = 5;
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(Components.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);
    camera.transform.LookAt(new Mathf.Vector3(0,0,0));

    const controls = new OrbitControls(canvas, camera);

    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, 4);
    lightGameObject.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(Components.DirectionalLight);


    class VoxelRenderPass extends GPU.RenderPass {
        public name: string = "VoxelRenderPass";

        private voxelRenderShader: GPU.Shader;
        private geometry: Geometry;

        public voxelTextures: GPU.RenderTexture3D[] = [];

        constructor() {
            super({
                inputs: [
                    GPU.PassParams.GBufferAlbedo,
                ],
                outputs: [
                ]
            });
        }
    
        public async init(resources: GPU.ResourcePool) {
    
            this.voxelRenderShader = await GPU.Shader.Create({
                // code: await Assets.Load("./WaterPass.wgsl", "json"),
                code: `
                //--------------------------------------------------------------------------------
                // common structs & bindings
                //--------------------------------------------------------------------------------
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position)   position   : vec4<f32>,
                    @location(0)         uv         : vec2<f32>,
                    @location(1)         rayOrigin  : vec3<f32>,
                    @location(2)         rayDir     : vec3<f32>,
                };
                
                // camera / matrix uniforms
                @group(0) @binding(0) var<storage, read> projectionMatrix : mat4x4<f32>;
                @group(0) @binding(1) var<storage, read> invProjectionMatrix       : mat4x4<f32>;
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

                @group(0) @binding(5) var<storage, read> camera_position: vec3f;
                
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
                    out.position = vec4f(input.position, 1.0);    // assume full‑screen quad in clip‐space
                    out.uv       = input.uv;
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

                    let invCell = 1.0 / grid.cellSize.xyz;

                    // Convert world‐space ray into grid‐space  
                    let bmin = grid.origin.xyz;
                    let bmax = grid.origin.xyz + grid.cellSize.xyz * vec3<f32>(grid.dims.xyz);
                    // intersect in world‐space
                    let tAABB = intersectAABB(ro, rd, bmin, bmax);
                    let tmin = tAABB.x;
                    let tmax = tAABB.y;
                    if (tmax < 0.0 || tmin > tmax) {
                        discard;  // ray misses the box entirely
                    }

                    // march from the entry point
                    let stepSize = min(min(grid.cellSize.x, grid.cellSize.y), grid.cellSize.z);
                    var t = max(tmin + 0.5 * stepSize, 0.0);
                    let tEnd = tmax;

                    for (var i: i32 = 0; i < 256 && t < tEnd; i = i + 1) {
                        let samplePos = ro + rd * t;
                        let gs = (samplePos - grid.origin.xyz) * invCell;
                        let idx = vec3<i32>(floor(gs));

                        // No longer need the OOB check here,
                        // because our t < tEnd guarantees we’re inside
                        if (textureLoad(voxels, idx, 0).r > 0u) {
                            return vec4<f32>(1.0);  // hit
                        }
                        t = t + stepSize;
                    }
                    discard;
                    return vec4<f32>(0.0);
                }
                `,
                uniforms: {
                    projectionMatrix: {group: 0, binding: 0, type: "storage"},
                    invProjectionMatrix: {group: 0, binding: 1, type: "storage"},
                    invViewMatrix: {group: 0, binding: 2, type: "storage"},
                    grid: {group: 0, binding: 3, type: "storage"},
                    voxels: {group: 0, binding: 4, type: "texture"},
                    camera_position: {group: 0, binding: 5, type: "storage"},
                },
                attributes: {
                    position: {location: 0, size: 3, type: "vec3"},
                    normal: {location: 1, size: 3, type: "vec3"},
                    uv: {location: 2, size: 2, type: "vec2"},
                },
                colorOutputs: [{format: "rgba16float"}],
                depthOutput: "depth24plus",
            })

            this.geometry = Geometry.Plane();
    
            this.initialized = true;
        }
    
        public execute(resources: GPU.ResourcePool) {
            if (!this.initialized) return;
    
            const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
            const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
            GPU.RendererContext.BeginRenderPass(this.name,
                [
                    { target: inputGBufferAlbedo, clear: false },
                ]
                , { target: inputGBufferDepth, clear: false }
                , true);
    
            this.voxelRenderShader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
            this.voxelRenderShader.SetMatrix4("invProjectionMatrix", camera.projectionMatrix.clone().invert());
            this.voxelRenderShader.SetMatrix4("invViewMatrix", camera.viewMatrix.clone().invert());
            this.voxelRenderShader.SetVector3("camera_position", camera.transform.position);

            for (const voxelTexture of this.voxelTextures) {
                this.voxelRenderShader.SetArray("grid", new Float32Array([
                    0, 0, 0, 0, // origin
                    0.025, 0.025, 0.025, 0, // cellSize
                    voxelTexture.width, voxelTexture.height, voxelTexture.depth, 0 // dims
                ]));
                this.voxelRenderShader.SetTexture("voxels", voxelTexture);
                GPU.RendererContext.DrawGeometry(this.geometry, this.voxelRenderShader, 1);
            }
    
    
            GPU.RendererContext.EndRenderPass();
        }
    }

    const sphereGameObject = new GameObject(scene);
    sphereGameObject.transform.position.x = 2;
    const sphereMesh = sphereGameObject.AddComponent(Components.Mesh);
    sphereMesh.SetGeometry(Geometry.Sphere());
    sphereMesh.AddMaterial(new PBRMaterial());


    // const suzanne = (await OBJLoaderIndexed.load("./assets/suzanne.obj"))[0];
    // const suzanne_sdf_texture = await VoxelGenerator.Generate(suzanne.geometry, new Vector3(1, 1, 1));

    const bunny = (await OBJLoaderIndexed.load("./assets/models//bunny.obj"))[0];
    const bunny_sdf_texture = await VoxelGenerator.Generate(bunny.geometry, new Mathf.Vector3(1, 1, 1));
    
    const scene_sdf_resolution = 256;
    const scene_sdf_texture = GPU.RenderTexture3D.Create(bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth, "r32uint");
    // scene_sdf_texture.SetData(new Float32Array(Math.pow(scene_sdf_resolution, 3)).fill(0.01))

    Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyTextureToTextureV3(
        {texture: bunny_sdf_texture, origin: [0, 0, 0]},
        {texture: scene_sdf_texture, origin: [0, 0, 0]},
        [bunny_sdf_texture.width, bunny_sdf_texture.height, bunny_sdf_texture.depth]
    );
    Renderer.EndRenderFrame();

    const voxelRenderPass = new VoxelRenderPass();
    voxelRenderPass.voxelTextures.push(scene_sdf_texture);
    scene.renderPipeline.AddPass(voxelRenderPass, GPU.RenderPassOrder.BeforeLighting);

    scene.Start();
};

Application(document.querySelector("canvas"));