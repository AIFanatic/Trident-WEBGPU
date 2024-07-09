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

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

const vertexSize = 128 * 3;
const workgroupSize = 64;

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
    public depthPyramidTargetTexture: RenderTexture;

    private depthPyramidGeometry: Geometry;
    
    constructor() {
        super({});

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

        this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);


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
                    screenSize: vec4<f32>
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
                    let a = objectInfo[objectIndex];
                    let mesh = meshInfo[u32(a.meshID)];
                    let meshlet = meshletInfo[u32(a.meshletID)];

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

                override blockSizeX: u32 = ${workgroupSize};
                override blockSizeY: u32 = 1;
                override blockSizeZ: u32 = 1;
                
                @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
                fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                    let gID = grid.z * (blockSizeX * blockSizeY) + grid.y * blockSizeX + grid.x;
                    if (gID < u32(cullData.meshCount.x)) {
                        let visible = IsVisible(gID);
                            
                        if (visible) {
                            drawBuffer.vertexCount = ${vertexSize};
                            let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                            instanceInfo[countIndex].meshID = gID;
                        }
                    }
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
            }
        });


        const depthPyramidShaderCode = `
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

            return vec4(1.0 - input.position.w);
            // return vec4(0.0);
        }
        `;
        this.depthPyramidShader = Shader.Create({
            code: depthPyramidShaderCode,
            colorOutputs: [{format: "rgba16float"}],
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
                @group(0) @binding(1) var depthTextureInput: texture_2d<f32>;
                // @group(0) @binding(2) var depthTextureOutput: texture_storage_2d<f32>;
                
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
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let uv = input.vUv;
                    // let color = textureSample(depthTextureInput, depthTextureInputSampler, uv);
                    // return color;

                    
                    let a = textureGather(0, depthTextureInput, depthTextureInputSampler, uv);
                    return vec4(min_vec4(a));
                }
                


                // @group(0) @binding(0) var depthTextureInputSampler: sampler;
                // @group(0) @binding(1) var depthTextureInput: texture_storage_2d<r32float, read_write>;
                // @group(0) @binding(2) var depthTextureOutput: texture_storage_2d<r32float, read_write>;

                // override blockSizeX: u32 = 1;
                // override blockSizeY: u32 = 1;
                // override blockSizeZ: u32 = 1;
                
                // @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
                // fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                //     let pos = grid.xy;

                //     let depth = textureLoad(depthTextureInput, vec2<i32>(pos.xy));
                //     textureStore(depthTextureOutput, vec2<i32>(pos.xy), vec4(depth));
                // } 
            
            `,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            colorOutputs: [{format: "rgba16float"}],
            uniforms: {
                depthTextureInputSampler: {group: 0, binding: 0, type: "sampler"},
                depthTextureInput: {group: 0, binding: 1, type: "texture"},
                // depthTextureOutput: {group: 0, binding: 2, type: "texture"},
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
            }

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

            Debugger.SetTotalMeshlets(meshlets.length);
        }

    }
    
    private buildDepthPyramid() {
        const miplevels = Math.floor(Math.log2(Math.max(Renderer.width, Renderer.height)));
        if (!this.depthPyramidTargetTexture) {
            this.depthPyramidTargetTexture = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float", miplevels);
        }

        // Render scene to first mip
        this.depthPyramidTargetTexture.SetActiveMipCount(1);
        this.depthPyramidTargetTexture.SetActiveMip(0);
        RendererContext.BeginRenderPass("GPUDriven - DepthPyramid", [{target: this.depthPyramidTargetTexture, clear: true, color: new Color(1,1,1)}], undefined, true);
        RendererContext.DrawIndirect(this.geometry, this.depthPyramidShader, this.drawIndirectBuffer);
        RendererContext.EndRenderPass();
        

        console.log("build pyramid")
        for (let i = 0; i < miplevels-1; i++) {
            // console.log(i)
            this.depthPyramidTargetTexture.SetActiveMip(i);
            this.depthPyramidCompute.SetTexture("depthTextureInput", this.depthPyramidTargetTexture);
            this.depthPyramidTargetTexture.SetActiveMip(i+1);
            // console.log("GPUDriven - DepthPyramid Building mip for ")
            // console.log(this.depthPyramidTargetTexture.width, this.depthPyramidTargetTexture.height)
            RendererContext.BeginRenderPass("GPUDriven - DepthPyramid Build", [{target: this.depthPyramidTargetTexture, clear: true, color: new Color(1,1,1)}], undefined, true);
            RendererContext.DrawGeometry(this.depthPyramidGeometry, this.depthPyramidCompute);
            RendererContext.EndRenderPass();
        }

        // console.log("build pyramid")
        // this.depthPyramidTargetTexture.SetActiveMip(0);
        // this.depthPyramidCompute.SetTexture("depthTextureInput", this.depthPyramidTargetTexture);
        // this.depthPyramidTargetTexture.SetActiveMip(1);
        // console.log("GPUDriven - DepthPyramid Build")
        // console.log(this.depthPyramidTargetTexture.width, this.depthPyramidTargetTexture.height)
        // RendererContext.BeginRenderPass("GPUDriven - DepthPyramid Build", [{target: this.depthPyramidTargetTexture, clear: true, color: new Color(1,1,1)}], undefined, true);
        // // RendererContext.SetViewport(0, 0, Math.floor(Renderer.width * 0.5 * 0.5), Math.floor(Renderer.height * 0.5 * 0.5))
        // RendererContext.DrawGeometry(this.depthPyramidGeometry, this.depthPyramidCompute);
        // RendererContext.EndRenderPass();
        // console.log("---------\n\n")

        this.depthPyramidTargetTexture.SetActiveMip(0);
        this.depthPyramidTargetTexture.SetActiveMipCount(miplevels);
        
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
            Renderer.width, Renderer.height, 0, 0
        ])
        if (!this.cullData) {
            this.cullData = Buffer.Create(cullDataArray.byteLength, BufferType.STORAGE);
            this.cullData.name = "cullData";
            this.compute.SetBuffer("cullData", this.cullData);
        }
        this.cullData.SetArray(cullDataArray);


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


        ComputeContext.BeginComputePass("GPUDriven - Culling", true);
        const workgroupSizeX = Math.floor((meshletsCount + workgroupSize-1) / workgroupSize);
        ComputeContext.Dispatch(this.compute, workgroupSizeX);
        ComputeContext.EndComputePass();

        RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);

        this.buildDepthPyramid();

        // RendererContext.BeginRenderPass("GPUDriven - Indirect", [{clear: true}], {target: this.depthTarget, clear: true}, true);
        // RendererContext.DrawIndirect(this.geometry, this.shader, this.drawIndirectBuffer);
        // RendererContext.EndRenderPass();


        // this.computeDrawBuffer.GetData().then(v => {
        //     const visibleMeshCount = new Uint32Array(v)[1];
        //     Debugger.SetVisibleMeshes(visibleMeshCount);

        //     Debugger.SetTriangleCount(vertexSize / 3* meshletsCount);
        //     Debugger.SetVisibleTriangleCount(vertexSize / 3 * visibleMeshCount);
        // })
    }
}