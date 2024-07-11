import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Compute, Shader } from "../Shader";
import { Geometry, VertexAttribute } from "../../Geometry";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";
import { ComputeContext } from "../ComputeContext";
import { DepthTexture, RenderTexture, RenderTextureStorage } from "../Texture";
import { Frustum } from "../../math/Frustum";
import { Debugger } from "../../plugins/Debugger";
import { MeshletMesh } from "../../components/MeshletMesh";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { TextureSampler } from "../TextureSampler";
import { Color } from "../../math/Color";
import { DepthViewer } from "./DepthViewer";
import { TextureViewer } from "./TextureViewer";
import { Vector3 } from "../../math/Vector3";
import { Vector4 } from "../../math/Vector4";
import { Vector2 } from "../../math/Vector2";
import { glMatrix, mat2, mat4, vec2, vec4 } from "gl-matrix";
import { Matrix4 } from "../../math/Matrix4";

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

const vertexSize = 128 * 3;
const workgroupSize = 64;


function getAxisAlignedBoundingBoxFast(C: Vector3, r: number, nearZ: number, P00: number, P11: number): Vector4 {
    if (-C.z < r + nearZ) return new Vector4();

    const cx = vec2.fromValues(-C.x, C.z);
    let vx = vec2.fromValues(Math.sqrt(vec2.dot(cx, cx) - r * r), r);
    vx = vec2.div(vx, vec2.clone(vx), vec2.fromValues(vec2.len(cx), vec2.len(cx)));

    // console.log("vx", vx);
    
    const minx = vec2.transformMat2(vec2.create(), cx, mat2.fromValues(vx[0], vx[1], -vx[1], vx[0]));
    const maxx = vec2.transformMat2(vec2.create(), cx, mat2.fromValues(vx[0], -vx[1], vx[1], vx[0]));

    // console.log("minx", minx);
    // console.log("maxx", maxx);


    const cy = vec2.fromValues(-C.y, C.z);
    let vy = vec2.fromValues(Math.sqrt(vec2.dot(cy, cy) - r * r), r);
    vy = vec2.div(vy, vec2.clone(vy), vec2.fromValues(vec2.len(cy), vec2.len(cy)));

    const miny = vec2.transformMat2(vec2.create(), cy, mat2.fromValues(vy[0], -vy[1], vy[1], vy[0]));
    const maxy = vec2.transformMat2(vec2.create(), cy, mat2.fromValues(vy[0], vy[1], -vy[1], vy[0]));

    // console.log("miny", miny);
    // console.log("maxy", maxy);

    let a = vec4.fromValues(minx[0] / minx[1] * P00, miny[0] / miny[1] * P11, maxx[0] / maxx[1] * P00, maxy[0] / maxy[1] * P11);
    let b = vec4.fromValues(0.5, -0.5, 0.5, -0.5);
    let c = vec4.fromValues(0.5, 0.5, 0.5, 0.5);

    let out = vec4.create();
    vec4.mul(out, a, b);
    vec4.add(out, out, c);

    return new Vector4(out[0], out[1], out[2], out[3]);
}


// console.log(
//     getAxisAlignedBoundingBoxFast(
//         new Vector3(-3.162088394165039, 0.1436321884393692, 15.219886302947998),
//         1.170837163925171,
//         0.5,
//         1.952405,
//         3.077683
//     )
// )

export class GPUDriven extends RenderPass {
    public name: string = "GPUDriven";
    private shader: Shader;
    private geometry: Geometry;

    private currentMeshCount: number = 0;

    private drawIndirectBuffer: Buffer;
    private compute: Compute;
    private computeDrawBuffer: Buffer;
    private instanceInfoBuffer: Buffer;

    private vertexBuffer: Buffer;

    private depthTarget: DepthTexture;
    
    private cullData: Buffer;
    private frustum: Frustum = new Frustum();
    
    private depthPyramidShader: Shader;
    private depthPyramidCompute: Shader;
    public depthPyramidTargetTexture: DepthTexture;
    private depthPyramidTargetTextureMipLevels: number;
    private depthPyramidTargetTextureWidth: number;
    private depthPyramidTargetTextureHeight: number;

    private depthPyramidGeometry: Geometry;

    private visibilityBuffer: Buffer;
    private currentPassBuffer: Buffer;

    private visibleBuffer: Buffer;
    private nonVisibleBuffer: Buffer;


    private debugPyramid: boolean = false;

    private colorTarget: RenderTexture;

    private depthViewer: DepthViewer;
    private textureViewer: TextureViewer;
    private debugLevel: number = 0;
    
    constructor() {
        super({});

        document.body.addEventListener("keypress", event => {
            const numKey = parseInt(event.key);
            if (event.key === "d") {
                this.debugPyramid = !this.debugPyramid;
            }

            if (!isNaN(numKey)) {
                this.debugLevel = numKey;
            }
        })

        const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIndex : u32,
            @builtin(vertex_index) vertexIndex : u32,
            @location(0) position : vec3<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) @interpolate(flat) instance : u32,
        };

        @group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;

        @group(0) @binding(2) var<storage, read> vertices: array<vec4<f32>>;

        struct InstanceInfo {
            meshID: u32
        };

        @group(0) @binding(3) var<storage, read> instanceInfo: array<InstanceInfo>;



        struct MeshInfo {
            modelMatrix: mat4x4<f32>,
            position: vec4<f32>,
            scale: vec4<f32>
        };

        struct ObjectInfo {
            meshID: f32,
            meshletID: f32,
            padding: vec2<f32>,
        };

        @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
        @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let meshID = instanceInfo[input.instanceIndex].meshID;
            // let mesh = meshInfo[meshID];
            let object = objectInfo[meshID];
            let mesh = meshInfo[u32(object.meshID)];
            let modelMatrix = mesh.modelMatrix;
            
            let vertexID = input.vertexIndex + u32(object.meshletID) * ${vertexSize};
            let position = vertices[vertexID];
            
            let modelViewMatrix = viewMatrix * modelMatrix;
            output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
            output.instance = meshID;

            return output;
        }
        

        fn rand(co: f32) -> f32 {
            return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let r = rand(f32(input.instance) + 12.1212);
            let g = rand(f32(input.instance) + 22.1212);
            let b = rand(f32(input.instance) + 32.1212);

            return vec4(r, g, b, 1.0);
        }
        `;

        this.shader = Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: {group: 0, binding: 0, type: "storage"},
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                vertices: {group: 0, binding: 2, type: "storage"},
                instanceInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},
            },
        });

        this.compute = Compute.Create({
            code: `
                struct DrawBuffer {
                    vertexCount: u32,
                    instanceCount: atomic<u32>,
                    firstVertex: u32,
                    firstInstance: u32,
                };

                @group(0) @binding(0) var<storage, read_write> drawBuffer: DrawBuffer;

                struct InstanceInfo {
                    meshID: u32
                };

                @group(0) @binding(1) var<storage, read_write> instanceInfo: array<InstanceInfo>;


                struct CullData {
                    projectionMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    cameraPosition: vec4<f32>,
                    frustum: array<vec4<f32>, 6>,
                    meshCount: vec4<f32>,
                    screenSize: vec4<f32>,
                    depthPyramidSize: vec4<f32>,
                    cameraNearFar: vec4<f32>,
                    projectionMatrixTransposed: mat4x4<f32>,
                };

                @group(0) @binding(2) var<storage, read> cullData: CullData;
                

                struct MeshletInfo {
                    cone_apex: vec4<f32>,
                    cone_axis: vec4<f32>,
                    cone_cutoff: f32,

                    boundingSphere: vec4<f32>,
                    parentBoundingSphere: vec4<f32>,
                    error: vec4<f32>,
                    parentError: vec4<f32>,
                    lod: vec4<f32>
                };

                struct MeshInfo {
                    modelMatrix: mat4x4<f32>,
                    position: vec4<f32>,
                    scale: vec4<f32>
                };

                struct ObjectInfo {
                    meshID: f32,
                    meshletID: f32,
                    padding: vec2<f32>,
                };

                @group(0) @binding(3) var<storage, read> meshletInfo: array<MeshletInfo>;
                @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
                @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

                @group(0) @binding(6) var<storage, read_write> visibilityBuffer: array<vec4<f32>>;
                @group(0) @binding(7) var<storage, read> currentPass: f32;

                @group(0) @binding(8) var textureSampler: sampler;
                @group(0) @binding(9) var depthTexture: texture_depth_2d;


                // assume a fixed resolution and fov
                const PI = 3.141592653589793;
                const testFOV = PI * 0.5;
                const cotHalfFov = 1.0 / tan(testFOV / 2.0);

                // TODO: Pass these
                const screenHeight = 609.0;
                const lodErrorThreshold = 1.0;
                const forcedLOD = 0;
                
                fn transformSphere(sphere: vec4<f32>, transform: mat4x4<f32>) -> vec4<f32> {
                    var hCenter = vec4(sphere.xyz, 1.0);
                    hCenter = transform * hCenter;
                    let center = hCenter.xyz / hCenter.w;
                    return vec4(center, length((transform * vec4(sphere.w, 0, 0, 0)).xyz));
                }

                // project given transformed (ie in view space) sphere to an error value in pixels
                // xyz is center of sphere
                // w is radius of sphere
                fn projectErrorToScreen(transformedSphere: vec4<f32>) -> f32 {
                    // https://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
                    if (transformedSphere.w > 1000000.0) {
                        return transformedSphere.w;
                    }
                    let d2 = dot(transformedSphere.xyz, transformedSphere.xyz);
                    let r = transformedSphere.w;
                    return cullData.screenSize.y * cotHalfFov * r / sqrt(d2 - r*r);
                }


                fn cull(meshlet: MeshletInfo, modelview: mat4x4<f32>) -> bool {
                    var projectedBounds = vec4(meshlet.boundingSphere.xyz, max(meshlet.error.x, 10e-10f));
                    projectedBounds = transformSphere(projectedBounds, modelview);
            
                    var parentProjectedBounds = vec4(meshlet.parentBoundingSphere.xyz, max(meshlet.parentError.x, 10e-10f));
                    parentProjectedBounds = transformSphere(parentProjectedBounds, modelview);
            
                    let clusterError = projectErrorToScreen(projectedBounds);
                    let parentError = projectErrorToScreen(parentProjectedBounds);
                    let render = clusterError <= lodErrorThreshold && parentError > lodErrorThreshold;
                    return render;

                    // // Disable culling
                    // return u32(meshlet.lod.x) == u32(forcedLOD);
                }



                fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
                    return dot(normal, point) + constant;
                }

                fn IsVisible(objectIndex: u32) -> bool {
                    let object = objectInfo[objectIndex];
                    let mesh = meshInfo[u32(object.meshID)];
                    let meshlet = meshletInfo[u32(object.meshletID)];

                    let v = cull(meshlet, cullData.viewMatrix * mesh.modelMatrix);
                    if (!v) {
                        return false;
                    }

                    // Backface
                    if (dot(normalize(meshlet.cone_apex.xyz - cullData.cameraPosition.xyz), meshlet.cone_axis.xyz) >= meshlet.cone_cutoff) {
                        return false;
                    }
                    
                    // Camera frustum
                    let scale = mesh.scale.x;
                    let boundingSphere = meshlet.boundingSphere * scale;
                    let center = (cullData.viewMatrix * vec4(boundingSphere.xyz + mesh.position.xyz, 1.0)).xyz;
                    let negRadius = -boundingSphere.w;

                    for (var i = 0; i < 6; i++) {
                        let distance = planeDistanceToPoint(cullData.frustum[i].xyz, cullData.frustum[i].w, center);

                        if (distance < negRadius) {
                            return false;
                        }
                    }

                    return true;
                }

                struct Projected {
                    ret: bool,
                    aabb: vec4f,
                };

                fn projectSphere(C: vec3f, r: f32, nearZ: f32, P00: f32, P11: f32) -> Projected {
                    var projected: Projected;

                    if (-C.z < r + nearZ) {
                        projected.ret = false;
                        return projected;
                    }
                
                    let cx = vec2(-C.x, C.z);
                    let vX = vec2(sqrt(dot(cx, cx) - r * r), r) / length(cx);
                    let minX = mat2x2(vX.x, vX.y, -vX.y, vX.x) * cx;
                    let maxX = mat2x2(vX.x, -vX.y, vX.y, vX.x) * cx;
                
                    let cy = vec2(-C.y, C.z);
                    let vY = vec2(sqrt(dot(cy, cy) - r * r), r) / length(cy);
                    let minY = mat2x2(vY.x, -vY.y, vY.y, vY.x) * cy;
                    let maxY = mat2x2(vY.x, vY.y, -vY.y, vY.x) * cy;

                    projected.aabb = vec4(
                        minX.x / minX.y * P00, minY.x / minY.y * P11,
                        maxX.x / maxX.y * P00, maxY.x / maxY.y * P11
                    ) * vec4f(0.5, -0.5, 0.5, -0.5) + vec4(0.5);
                
                    projected.ret = true;
                    return projected;
                }

                const blockSize: u32 = 4;
                
                @compute @workgroup_size(blockSize, blockSize, blockSize)
                fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                    // let objectIndex = grid.z * (blockSizeX * blockSizeY) + grid.y * blockSizeX + grid.x;
                    
                    let size = u32(ceil(pow(cullData.meshCount.x, 1.0 / 3.0) / 4));
                    let objectIndex = grid.x + (grid.y * size * blockSize) + (grid.z * size * size * blockSize * blockSize);
    

                    if (objectIndex >= u32(cullData.meshCount.x)) {
                        return;
                    }

                    let isFirstPass = currentPass > 0.5;

                    let LATE = !isFirstPass;

                    if (!LATE && visibilityBuffer[objectIndex].x < 0.5) {
                        return;
                    }

                    var visible = IsVisible(objectIndex);
                    // var visible = true;
                    if (LATE && visible) {
                        // visible = false;
                        // Do occlusion culling

                        let P00 = cullData.projectionMatrix[0][0];
                        let P11 = cullData.projectionMatrix[1][1];
                        let zNear = cullData.projectionMatrix[3][2];

                        let object = objectInfo[objectIndex];
                        let mesh = meshInfo[u32(object.meshID)];
                        let meshlet = meshletInfo[u32(object.meshletID)];
                        let scale = mesh.scale.x;
                        let boundingSphere = meshlet.boundingSphere * scale;
                        let center = (cullData.viewMatrix * vec4(boundingSphere.xyz + mesh.position.xyz, 1.0)).xyz;
                        let radius = boundingSphere.w;

                        let projected = projectSphere(center, radius, zNear, P00, P11);
                        if (projected.ret) {
                            // visible = false;
                            let aabb = projected.aabb;
                            let width = (aabb.z - aabb.x) * cullData.depthPyramidSize.x;
                            let height = (aabb.w - aabb.y) * cullData.depthPyramidSize.y;

                            let level = u32(ceil(log2(max(width, height))));
                            // let level = u32(floor(log2(max(width, height))));

                            let depth = textureSampleLevel(depthTexture, textureSampler, (aabb.xy + aabb.zw) * 0.5, level);
                            let depthSphere = zNear / (-center.z - radius);

                            visible = visible && (depthSphere + 1.0) < depth;
                        }
                    }

                    if (visible && (!LATE || visibilityBuffer[objectIndex].x < 0.5)) {
                        drawBuffer.vertexCount = ${vertexSize};
                        let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                        instanceInfo[countIndex].meshID = objectIndex;
                    }

                    if (LATE) {
                        visibilityBuffer[objectIndex].x = f32(visible);
                    }





                    // let shouldDraw = IsVisible(objectIndex);

                    // if (shouldDraw) {
                    //     drawBuffer.vertexCount = ${vertexSize};
                    //     let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                    //     instanceInfo[countIndex].meshID = objectIndex;
                    // }

                } 
            
            `,
            computeEntrypoint: "main",
            uniforms: {
                drawBuffer: {group: 0, binding: 0, type: "storage-write"},
                instanceInfo: {group: 0, binding: 1, type: "storage-write"},
                cullData: {group: 0, binding: 2, type: "storage"},

                meshletInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},

                visibilityBuffer: {group: 0, binding: 6, type: "storage-write"},
                currentPass: {group: 0, binding: 7, type: "storage"},

                textureSampler: {group: 0, binding: 8, type: "sampler"},
                depthTexture: {group: 0, binding: 9, type: "depthTexture"},
            }
        });

        this.depthPyramidShader = Shader.Create({
            code: code,
            colorOutputs: [],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                viewMatrix: {group: 0, binding: 0, type: "storage"},
                projectionMatrix: {group: 0, binding: 1, type: "storage"},
                vertices: {group: 0, binding: 2, type: "storage"},
                instanceInfo: {group: 0, binding: 3, type: "storage"},
                meshInfo: {group: 0, binding: 4, type: "storage"},
                objectInfo: {group: 0, binding: 5, type: "storage"},
            },
        });
        
        this.depthPyramidCompute = Shader.Create({
            code: `
                struct VertexInput {
                    @location(0) position : vec2<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) vUv : vec2<f32>,
                };
                
                @group(0) @binding(0) var depthTextureInputSampler: sampler;
                @group(0) @binding(1) var depthTextureInput: texture_depth_2d;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(input.position, 0.0, 1.0);
                    output.vUv = input.uv;
                    return output;
                }
                
                fn min_vec4(v: vec4<f32>) -> f32 {
                    let min_ab = min(v.x, v.y);
                    let min_cd = min(v.z, v.w);
                    return min(min_ab, min_cd);
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
                    let uv = input.vUv;
                    // let color = textureSample(depthTextureInput, depthTextureInputSampler, uv);
                    // return color;

                    
                    let dims = textureDimensions(depthTextureInput);
                    let p = input.position.xy / vec2f(dims.xy);
                    let a = textureGather(depthTextureInput, depthTextureInputSampler, uv);

                    var depth = min_vec4(a);

                    // let box0 = vec4f(0.219038, 0.366654, 0.372915, 0.604129);

                    // if (uv.x >= box0.x && uv.x <= box0.z && uv.y >= box0.y && uv.y <= box0.w) {
                    //     depth = 0.0;
                    // }

                    return depth;
                }
            `,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            uniforms: {
                depthTextureInputSampler: {group: 0, binding: 0, type: "sampler"},
                depthTextureInput: {group: 0, binding: 1, type: "depthTexture"},
            }
        });

        const depthPyramidSampler = TextureSampler.Create();
        this.depthPyramidCompute.SetSampler("depthTextureInputSampler", depthPyramidSampler);

        this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);

        this.depthPyramidGeometry = Geometry.Plane();



        this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";

        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertexSize)));

        this.currentPassBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);


        const sampler = TextureSampler.Create();
        this.compute.SetSampler("textureSampler", sampler);
        
        function previousPow2(v: number) {
            let r = 1;
            while (r * 2 < v) r *= 2;
            return r;
        }

        this.depthPyramidTargetTextureWidth = previousPow2(Renderer.width);
        this.depthPyramidTargetTextureHeight = previousPow2(Renderer.height);
        this.depthPyramidTargetTextureMipLevels = Math.floor(Math.log2(Math.max(this.depthPyramidTargetTextureWidth, this.depthPyramidTargetTextureHeight)));
        this.depthPyramidTargetTexture = DepthTexture.Create(this.depthPyramidTargetTextureWidth, this.depthPyramidTargetTextureHeight, 1, "depth24plus", this.depthPyramidTargetTextureMipLevels);


        this.visibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.visibleBuffer.SetArray(new Float32Array([1]));
        this.nonVisibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.nonVisibleBuffer.SetArray(new Float32Array([0]));

        this.compute.SetTexture("depthTexture", this.depthPyramidTargetTexture);

        this.colorTarget = RenderTexture.Create(Renderer.width, Renderer.height);

        this.depthViewer = new DepthViewer();
        this.textureViewer = new TextureViewer();
    }

    private buildMeshletData() {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
        // const sceneMeshletsInstanced = scene.GetComponents(InstancedMeshlet);

        if (this.currentMeshCount !== sceneMeshlets.length) {

            const meshlets: SceneMesh[] = [];
            for (const meshlet of sceneMeshlets) {
                for (const geometry of meshlet.meshlets) {
                    meshlets.push({mesh: meshlet, geometry: geometry});
                }
            }
            console.time("buildMeshletData");

            console.log("meshlets", meshlets.length);
            console.log("sceneMeshes", sceneMeshlets.length);

            console.time("GGGG");

            let meshletInfo: number[] = [];
            let meshInfo: number[] = [];
            let objectInfo: number[] = [];

            let vertices: number[] = [];
            const indexedCache: Map<number, number> = new Map();
            const meshCache: Map<string, number> = new Map();

            const boxes: Vector4[] = [];

            for (let i = 0; i < meshlets.length; i++) {
                const sceneMesh = meshlets[i];
                let geometryIndex = indexedCache.get(sceneMesh.geometry.crc);
                if (geometryIndex === undefined) {
                    console.log("Not found");
                    geometryIndex = indexedCache.size;
                    indexedCache.set(sceneMesh.geometry.crc, geometryIndex);
                    // verticesArray.set(sceneMesh.geometry.vertices, geometryIndex * vertexSize * 4);
                    vertices.push(...sceneMesh.geometry.vertices_gpu);

                    // Meshlet info
                    const meshlet = sceneMesh.geometry;
                    const bv = meshlet.boundingVolume;
                    const pbv = meshlet.boundingVolume;
                    meshletInfo.push(
                        ...bv.cone_apex.elements, 0,
                        ...bv.cone_axis.elements, 0,
                        bv.cone_cutoff, 0, 0, 0,
                        bv.center.x, bv.center.y, bv.center.z, bv.radius,
                        pbv.center.x, pbv.center.y, pbv.center.z, pbv.radius,
                        meshlet.clusterError, 0, 0, 0,
                        meshlet.parentError, 0, 0, 0,
                        meshlet.lod, 0, 0, 0
                    )
                }

                // Mesh info
                let meshIndex = meshCache.get(sceneMesh.mesh.id);
                if (meshIndex === undefined) {
                    meshIndex = meshCache.size;
                    meshCache.set(sceneMesh.mesh.id, meshIndex);

                    meshInfo.push(
                        ...sceneMesh.mesh.transform.localToWorldMatrix.elements,
                        ...sceneMesh.mesh.transform.position.elements, 0,
                        ...sceneMesh.mesh.transform.scale.elements, 0,
                    );
                }

                // Object info
                objectInfo.push(
                    meshIndex, geometryIndex, 0, 0,
                )


                // // this.projectionMatrix.perspectiveZO(fov, aspect, near, far);
                // const bv = sceneMesh.geometry.boundingVolume;
                // const projection = mainCamera.projectionMatrix.elements;
                // console.log(bv.center.clone().add(sceneMesh.mesh.transform.position), bv.radius)
                // boxes.push(
                //     getAxisAlignedBoundingBoxFast(
                //         bv.center.clone().add(sceneMesh.mesh.transform.position).applyMatrix4(mainCamera.viewMatrix),
                //         bv.radius,
                //         mainCamera.near,
                //         projection[0], // mainCamera.projectionMatrix.elements[0], // [0][0]
                //         projection[5] // mainCamera.projectionMatrix.elements[5] // [1][1]
                //     )
                // )
            }

            // console.log("boxes", boxes)

            // Vertex buffer
            const verticesArray = new Float32Array(vertices);
            console.log("verticesArray", verticesArray.length);


            // Meshlet info buffer
            const meshletInfoArray = new Float32Array(meshletInfo);
            const meshletInfoBuffer = Buffer.Create(meshletInfoArray.byteLength, BufferType.STORAGE);
            meshletInfoBuffer.name = "meshletInfoBuffer";
            meshletInfoBuffer.SetArray(meshletInfoArray);
            this.compute.SetBuffer("meshletInfo", meshletInfoBuffer);

            // Mesh info buffer
            const meshInfoBufferArray = new Float32Array(meshInfo);
            const meshInfoBuffer = Buffer.Create(meshInfoBufferArray.byteLength, BufferType.STORAGE);
            meshInfoBuffer.name = "meshInfoBuffer";
            meshInfoBuffer.SetArray(meshInfoBufferArray);
            this.compute.SetBuffer("meshInfo", meshInfoBuffer);

            // Object info buffer
            const objectInfoBufferArray = new Float32Array(objectInfo);
            const objectInfoBuffer = Buffer.Create(objectInfoBufferArray.byteLength, BufferType.STORAGE);
            objectInfoBuffer.name = "objectInfoBuffer";
            objectInfoBuffer.SetArray(objectInfoBufferArray);
            this.compute.SetBuffer("objectInfo", objectInfoBuffer);

            this.shader.SetBuffer("meshInfo", meshInfoBuffer);
            this.shader.SetBuffer("objectInfo", objectInfoBuffer);

            this.depthPyramidShader.SetBuffer("meshInfo", meshInfoBuffer);
            this.depthPyramidShader.SetBuffer("objectInfo", objectInfoBuffer);

            console.log("meshletInfoBuffer", meshletInfoArray.byteLength);
            console.log("meshInfoBufferArray", meshInfoBufferArray.byteLength);
            console.log("objectInfoBufferArray", objectInfoBufferArray.byteLength);


            console.timeEnd("GGGG");

            console.log("verticesArray", verticesArray.length)
            // Vertices buffer
            this.vertexBuffer = Buffer.Create(verticesArray.byteLength, BufferType.STORAGE);
            this.vertexBuffer.name = "vertexBuffer"
            this.vertexBuffer.SetArray(verticesArray);
            this.depthPyramidShader.SetBuffer("vertices", this.vertexBuffer);
            this.shader.SetBuffer("vertices", this.vertexBuffer);
            
            this.currentMeshCount = sceneMeshlets.length;
            console.timeEnd("buildMeshletData");

            const visibilityBufferArray = new Float32Array(meshlets.length * 4).fill(1);
            this.visibilityBuffer = Buffer.Create(visibilityBufferArray.byteLength, BufferType.STORAGE_WRITE);
            this.visibilityBuffer.SetArray(visibilityBufferArray);

            this.compute.SetBuffer("visibilityBuffer", this.visibilityBuffer);
            this.compute.SetBuffer("currentPass", this.currentPassBuffer);
            console.log("visibilityBufferArray", visibilityBufferArray.byteLength)

            Debugger.SetTotalMeshlets(meshlets.length);
        }

    }
    
    private buildDepthPyramid() {
        // // Render scene to first mip
        this.depthPyramidTargetTexture.SetActiveMipCount(1);
        this.depthPyramidTargetTexture.SetActiveMip(0);
        RendererContext.BeginRenderPass("GPUDriven - DepthPyramid", [], {target: this.depthPyramidTargetTexture, clear: true}, true);
        RendererContext.DrawIndirect(this.geometry, this.depthPyramidShader, this.drawIndirectBuffer);
        RendererContext.EndRenderPass();
        

        // // this.geometryPass(false)
        // console.log("build pyramid")
        // for (let i = 0; i < this.depthPyramidTargetTextureMipLevels-1; ++i) {
        //     const depthTarget = i === 0 ? this.depthTarget : this.depthPyramidTargetTexture;

        //     this.depthPyramidTargetTexture.SetActiveMip(i);
        //     this.depthPyramidCompute.SetTexture("depthTextureInput", this.depthPyramidTargetTexture);
        //     this.depthPyramidTargetTexture.SetActiveMip(i+1);
        //     RendererContext.BeginRenderPass("GPUDriven - DepthPyramid Build", [], {target: this.depthPyramidTargetTexture, clear: true}, true);
        //     RendererContext.DrawGeometry(this.depthPyramidGeometry, this.depthPyramidCompute);
        //     // RendererContext.DrawIndirect(this.geometry, this.depthPyramidShader, this.drawIndirectBuffer);
        //     RendererContext.EndRenderPass();
        // }

        this.depthPyramidTargetTexture.SetActiveMip(0);
        this.depthPyramidTargetTexture.SetActiveMipCount(this.depthPyramidTargetTextureMipLevels);
    }

    private generateDrawsPass(meshletsCount: number, prepass: boolean) {
        if (prepass === true) RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
        else RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);

        const workgroup_size = 64;
        const workgroupSizeX = Math.ceil(Math.floor((meshletsCount + workgroup_size-1) / workgroup_size) * 0.5);
        const workgroupSizeY = Math.ceil(Math.floor((meshletsCount + workgroup_size-1) / workgroup_size) * 0.5);


        // const workgroupSizeX = 4;  // Threads per workgroup along X
        // const workgroupSizeY = 4;  // Threads per workgroup along Y
        // const workgroupSizeZ = 1;  // Threads per workgroup along Z

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletsCount) / 4);

        // console.log(dispatchSizeX, dispatchSizeY, dispatchSizeZ)



        ComputeContext.BeginComputePass("GPUDriven - Culling", true);
        ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        ComputeContext.EndComputePass();
        RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);
    }

    private geometryPass(prepass: boolean) {
        const shouldClear = prepass ? true : false;
        RendererContext.BeginRenderPass("GPUDriven - Indirect", [{target: this.colorTarget, clear: shouldClear}], {target: this.depthTarget, clear: shouldClear}, true);
        RendererContext.DrawIndirect(this.geometry, this.shader, this.drawIndirectBuffer);
        RendererContext.EndRenderPass();
    }

    public execute(resources: ResourcePool) {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
        // const sceneMeshletsInstanced = scene.GetComponents(InstancedMeshlet);
        
        let meshletsCount = 0;
        for (const meshlet of sceneMeshlets) {
            meshletsCount += meshlet.meshlets.length;
        }
        
        if (meshletsCount === 0) return;
        
        this.buildMeshletData();

        
        this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
        this.depthPyramidShader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
        this.depthPyramidShader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);

        const cullDataArray = new Float32Array([
            ...mainCamera.projectionMatrix.elements,
            ...mainCamera.viewMatrix.elements,
            ...mainCamera.transform.position.elements, 0,
            ...this.frustum.planes[0].normal.elements, this.frustum.planes[0].constant,
            ...this.frustum.planes[1].normal.elements, this.frustum.planes[1].constant,
            ...this.frustum.planes[2].normal.elements, this.frustum.planes[2].constant,
            ...this.frustum.planes[3].normal.elements, this.frustum.planes[3].constant,
            ...this.frustum.planes[4].normal.elements, this.frustum.planes[4].constant,
            ...this.frustum.planes[5].normal.elements, this.frustum.planes[5].constant,
            meshletsCount, 0, 0, 0,
            Renderer.width, Renderer.height, 0, 0,
            this.depthPyramidTargetTextureWidth, this.depthPyramidTargetTextureHeight, 0, 0,
            mainCamera.near, mainCamera.far, 0, 0,
            ...mainCamera.projectionMatrix.clone().transpose().elements,
        ])
        if (!this.cullData) {
            this.cullData = Buffer.Create(cullDataArray.byteLength, BufferType.STORAGE);
            this.cullData.name = "cullData";
            this.compute.SetBuffer("cullData", this.cullData);
        }
        this.cullData.SetArray(cullDataArray);

        // this.isFirstPass = this.isFirstPass === 1 ? 0 : 1;


        if (!this.computeDrawBuffer) {
            // Draw indirect buffer
            this.computeDrawBuffer = Buffer.Create(4 * 4, BufferType.STORAGE_WRITE);
            this.computeDrawBuffer.name = "computeDrawBuffer";
            this.compute.SetBuffer("drawBuffer", this.computeDrawBuffer);

            // InstanceBuffer
            this.instanceInfoBuffer = Buffer.Create(meshletsCount * 1 * 4, BufferType.STORAGE_WRITE);
            this.instanceInfoBuffer.name = "instanceInfoBuffer"
            this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
            this.shader.SetBuffer("instanceInfo", this.instanceInfoBuffer);
            this.depthPyramidShader.SetBuffer("instanceInfo", this.instanceInfoBuffer);

        }


        RendererContext.ClearBuffer(this.computeDrawBuffer);

        this.generateDrawsPass(meshletsCount, true);
        this.geometryPass(true);

        this.buildDepthPyramid();

        this.generateDrawsPass(meshletsCount, false);
        this.geometryPass(false);

        // RendererContext.CopyTextureToTexture(this.depthPyramidTargetTexture, this.colorTarget);
        if (this.debugPyramid) {
            this.depthViewer.execute(resources, this.depthPyramidTargetTexture, this.debugLevel);
        }
        else {
            this.textureViewer.execute(resources, this.colorTarget);
        }

        this.computeDrawBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            Debugger.SetVisibleMeshes(visibleMeshCount);

            Debugger.SetTriangleCount(vertexSize / 3* meshletsCount);
            Debugger.SetVisibleTriangleCount(vertexSize / 3 * visibleMeshCount);
        })
    }
}