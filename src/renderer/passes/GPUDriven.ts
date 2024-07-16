import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Compute, Shader } from "../Shader";
import { Geometry, VertexAttribute } from "../../Geometry";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";
import { ComputeContext } from "../ComputeContext";
import { DepthTexture, RenderTexture } from "../Texture";
import { Frustum } from "../../math/Frustum";
import { Debugger } from "../../plugins/Debugger";
import { MeshletMesh } from "../../components/MeshletMesh";
import { Meshlet } from "../../plugins/meshlets/Meshlet";
import { TextureSampler } from "../TextureSampler";
import { DepthViewer } from "./DepthViewer";
import { TextureViewer } from "./TextureViewer";
import { OcclusionCullingDebugger } from "./OcclusionCullingDebugger";
import { HiZPass } from "./HiZPass";

interface SceneMesh {
    geometry: Meshlet;
    mesh: MeshletMesh;
};

const vertexSize = Meshlet.max_triangles * 3;
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

    private cullData: Buffer;
    private frustum: Frustum = new Frustum();

    private visibilityBuffer: Buffer;
    private currentPassBuffer: Buffer;

    private visibleBuffer: Buffer;
    private nonVisibleBuffer: Buffer;


    private depthTexture: DepthTexture;
    private hizPass: HiZPass;
    private debugPyramid: boolean = false;

    private colorTarget: RenderTexture;

    private depthViewer: DepthViewer;
    private textureViewer: TextureViewer;
    private occlusionCullingDebugger: OcclusionCullingDebugger;
    private debugLevel: number = 0;


    private meshInfoBuffer: Buffer;
    private meshletInfoBuffer: Buffer;
    private objectInfoBuffer: Buffer;

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

        struct Settings {
            frustumCullingEnabled: f32,
            backFaceCullingEnabled: f32,
            occlusionCullingEnabled: f32,
            smallFeaturesCullingEnabled: f32,
            staticLOD: f32,
            dynamicLODErrorThreshold: f32,
            dynamicLODEnabled: f32,
            viewInstanceColors: f32,
        };
        @group(0) @binding(6) var<storage, read> settings: Settings;
        

        const modelMatrix = mat4x4<f32>();
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
            var color = vec4(0.2);
            if (bool(settings.viewInstanceColors)) {
                let r = rand(f32(input.instance) + 12.1212);
                let g = rand(f32(input.instance) + 22.1212);
                let b = rand(f32(input.instance) + 32.1212);
                color = vec4(r, g, b, 1.0);
            }
            return color;
        }
        `;

        this.shader = Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
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
                settings: {group: 0, binding: 6, type: "storage"},
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
                    lod: vec4<f32>,

                    bboxMin: vec4<f32>,
                    bboxMax: vec4<f32>,
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


                struct Settings {
                    frustumCullingEnabled: f32,
                    backFaceCullingEnabled: f32,
                    occlusionCullingEnabled: f32,
                    smallFeaturesCullingEnabled: f32,
                    staticLOD: f32,
                    dynamicLODErrorThreshold: f32,
                    dynamicLODEnabled: f32,
                    viewInstanceColors: f32,
                };
                @group(0) @binding(10) var<storage, read> settings: Settings;


                // assume a fixed resolution and fov
                const PI = 3.141592653589793;
                const testFOV = PI * 0.5;
                const cotHalfFov = 1.0 / tan(testFOV / 2.0);

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


                fn isMeshletVisible(meshlet: MeshletInfo, modelview: mat4x4<f32>) -> bool {
                    var projectedBounds = vec4(meshlet.boundingSphere.xyz, max(meshlet.error.x, 10e-10f));
                    projectedBounds = transformSphere(projectedBounds, modelview);
            
                    var parentProjectedBounds = vec4(meshlet.parentBoundingSphere.xyz, max(meshlet.parentError.x, 10e-10f));
                    parentProjectedBounds = transformSphere(parentProjectedBounds, modelview);
            
                    let clusterError = projectErrorToScreen(projectedBounds);
                    let parentError = projectErrorToScreen(parentProjectedBounds);
                    return clusterError <= settings.dynamicLODErrorThreshold && parentError > settings.dynamicLODErrorThreshold;
                }



                fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
                    return dot(normal, point) + constant;
                }

                fn IsVisible(objectIndex: u32) -> bool {
                    let object = objectInfo[objectIndex];
                    let mesh = meshInfo[u32(object.meshID)];
                    let meshlet = meshletInfo[u32(object.meshletID)];

                    if (bool(settings.dynamicLODEnabled)) {
                        if (!isMeshletVisible(meshlet, cullData.viewMatrix * mesh.modelMatrix)) {
                            return false;
                        }
                    }
                    else {
                        if (!(u32(meshlet.lod.x) == u32(settings.staticLOD))) {
                            return false;
                        }
                    }

                    // Backface
                    if (bool(settings.backFaceCullingEnabled)) {
                        if (dot(normalize(meshlet.cone_apex.xyz - cullData.cameraPosition.xyz), meshlet.cone_axis.xyz) >= meshlet.cone_cutoff) {
                            return false;
                        }
                    }

                    // Camera frustum
                    if (bool(settings.frustumCullingEnabled)) {
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
                    }

                    return true;
                }

                fn isOccluded(index: i32) -> bool {
                    let objectIndex = objectInfo[index];
                    let mesh = meshInfo[u32(objectIndex.meshID)];
                    let meshlet = meshletInfo[u32(objectIndex.meshletID)];

                    let bmin = -vec3f(meshlet.boundingSphere.w);
                    let bmax = vec3f(meshlet.boundingSphere.w);
                    let bboxMin = (cullData.viewMatrix * mesh.modelMatrix * vec4(bmin + meshlet.boundingSphere.xyz, 1.0)).xyz;
                    let bboxMax = (cullData.viewMatrix * mesh.modelMatrix * vec4(bmax + meshlet.boundingSphere.xyz, 1.0)).xyz;
                    
                    let boxSize = bboxMax - bboxMin;
        
                    let boxCorners: array<vec3f, 8> = array(bboxMin.xyz,
                        bboxMin.xyz + vec3f(boxSize.x,0,0),
                        bboxMin.xyz + vec3f(0, boxSize.y,0),
                        bboxMin.xyz + vec3f(0, 0, boxSize.z),
                        bboxMin.xyz + vec3f(boxSize.xy,0),
                        bboxMin.xyz + vec3f(0, boxSize.yz),
                        bboxMin.xyz + vec3f(boxSize.x, 0, boxSize.z),
                        bboxMin.xyz + boxSize.xyz
                    );
        
        
                    var minZ = 1.0;
                    var minXY = vec2f(1);
                    var maxXY = vec2f(0);
            
                    for (var i = 0; i < 8; i++) {
                        //transform world space aaBox to NDC
                        var clipPos = cullData.projectionMatrix * vec4f(boxCorners[i], 1);
            
                        clipPos.z = max(clipPos.z, 0);
            
                        let _a = clipPos.xyz / clipPos.w;
                        clipPos.x = _a.x;
                        clipPos.y = _a.y;
                        clipPos.z = _a.z;
            
                        let _b = clamp(clipPos.xy, vec2f(-1.0), vec2f(1.0));
                        clipPos.x = _b.x;
                        clipPos.y = _b.y;
                        
                        let _c = clipPos.xy * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
                        clipPos.x = _c.x;
                        clipPos.y = _c.y;
        
                        minXY = min(clipPos.xy, minXY);
                        maxXY = max(clipPos.xy, maxXY);
            
                        minZ = saturate(min(minZ, clipPos.z));
                    }
        
                    let boxUVs = vec4f(minXY, maxXY);
        
                    // Calculate hi-Z buffer mip
                    let depthTextureSize = textureDimensions(depthTexture, 0);
                    let RTSize = vec2f(depthTextureSize.xy);
                    let MaxMipLevel = 10;
        
                    let size = vec2((maxXY - minXY)) * RTSize.xy;
                    var mip = ceil(log2(f32(max(size.x, size.y))));
             
                    mip = clamp(mip, 0, f32(MaxMipLevel));


                    // small-feature culling
                    let _size = (maxXY.xy - minXY.xy);
                    let maxsize = max(_size.x, _size.y) * f32(max(depthTextureSize.x,depthTextureSize.y));
                    if (bool(settings.smallFeaturesCullingEnabled)) {
                        if(maxsize <= 1.0f) {
                            return false;
                        }
                    }
        
        
        
                    // Texel footprint for the lower (finer-grained) level
                    let level_lower = max(mip - 1, 0);
                    let _scale = exp2(-level_lower);
                    // let _scale = exp2(-level_lower) * 1024.0;
                    let a = floor(boxUVs.xy*_scale);
                    let b = ceil(boxUVs.zw*_scale);
                    let dims = b - a;
        
                    // Use the lower level if we only touch <= 2 texels in both dimensions
                    if (dims.x <= 2 && dims.y <= 2) {
                        mip = level_lower;
                    }
        
                    //load depths from high z buffer
                    let depth = vec4f(
                        textureSampleLevel(depthTexture, textureSampler, boxUVs.xy, u32(mip)),
                        textureSampleLevel(depthTexture, textureSampler, boxUVs.zy, u32(mip)),
                        textureSampleLevel(depthTexture, textureSampler, boxUVs.xw, u32(mip)),
                        textureSampleLevel(depthTexture, textureSampler, boxUVs.zw, u32(mip))
                    );
        
                    //find the max depth
                    let maxDepth = max(max(max(depth.x, depth.y), depth.z), depth.w);
        
                    return minZ <= maxDepth;
                }

                // const blockSizeX: u32 = ${workgroupSize};
                // const blockSizeY: u32 = 1;
                // const blockSizeZ: u32 = 1;

                const blockSize: u32 = 4;
                
                // @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
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

                        if (bool(settings.occlusionCullingEnabled)) {
                            visible = visible && isOccluded(i32(objectIndex));
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





                    // drawBuffer.vertexCount = ${vertexSize};
                    // let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                    // instanceInfo[countIndex].meshID = objectIndex;
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

                settings: {group: 0, binding: 10, type: "storage"},
            }
        });

        this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);
        this.drawIndirectBuffer.name = "drawIndirectBuffer";

        this.geometry = new Geometry();
        this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertexSize)));

        this.currentPassBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);


        const sampler = TextureSampler.Create({magFilter: "nearest", minFilter: "nearest"});
        this.compute.SetSampler("textureSampler", sampler);
        
        function previousPow2(v: number) {
            let r = 1;
            while (r * 2 < v) r *= 2;
            return r;
        }

        this.hizPass = new HiZPass();
        this.compute.SetTexture("depthTexture", this.hizPass.debugDepthTexture);


        this.visibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.visibleBuffer.SetArray(new Float32Array([1]));
        this.nonVisibleBuffer = Buffer.Create(4, BufferType.STORAGE);
        this.nonVisibleBuffer.SetArray(new Float32Array([0]));

        this.colorTarget = RenderTexture.Create(Renderer.width, Renderer.height);
        this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);

        this.depthViewer = new DepthViewer();
        this.textureViewer = new TextureViewer();
        this.occlusionCullingDebugger = new OcclusionCullingDebugger();
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

                    console.log("sceneMesh.geometry.vertices_gpu", sceneMesh.geometry.vertices_gpu)

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
                        meshlet.lod, 0, 0, 0,
                        ...meshlet.bounds.min.elements, 0,
                        ...meshlet.bounds.max.elements, 0
                    )

                    console.log(sceneMesh)
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

            console.log("meshletInfoBuffer", meshletInfoArray.byteLength);
            console.log("meshInfoBufferArray", meshInfoBufferArray.byteLength);
            console.log("objectInfoBufferArray", objectInfoBufferArray.byteLength);


            this.meshInfoBuffer = meshInfoBuffer;
            this.meshletInfoBuffer = meshletInfoBuffer;
            this.objectInfoBuffer = objectInfoBuffer;


            console.timeEnd("GGGG");

            console.log("verticesArray", verticesArray.length)
            // Vertices buffer
            this.vertexBuffer = Buffer.Create(verticesArray.byteLength, BufferType.STORAGE);
            this.vertexBuffer.name = "vertexBuffer"
            this.vertexBuffer.SetArray(verticesArray);
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

    private generateDrawsPass(meshletsCount: number, prepass: boolean) {

        if (prepass === true) RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
        else RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);

        const workgroupSizeX = Math.floor((meshletsCount + workgroupSize-1) / workgroupSize);


        // const workgroupSizeX = 4;  // Threads per workgroup along X
        // const workgroupSizeY = 4;  // Threads per workgroup along Y
        // const workgroupSizeZ = 1;  // Threads per workgroup along Z

        // Calculate dispatch sizes based on the cube root approximation
        const dispatchSizeX = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(meshletsCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(meshletsCount) / 4);

        // console.log(dispatchSizeX, dispatchSizeY, dispatchSizeZ)


        ComputeContext.BeginComputePass(`GPUDriven - Culling prepass: ${prepass}`, true);
        ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        ComputeContext.EndComputePass();
        RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);

        // this.depthPyramidTargetTexture.SetActiveMip(0);
        // this.depthPyramidTargetTexture.SetActiveMipCount(this.depthPyramidTargetTextureMipLevels);
    }

    private geometryPass(prepass: boolean) {
        const shouldClear = prepass ? true : false;
        RendererContext.BeginRenderPass(`GPUDriven - Indirect prepass: ${prepass}`, [{target: this.colorTarget, clear: shouldClear}], undefined, true);
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

        // projectionMatrix: mat4x4<f32>,
        // viewMatrix: mat4x4<f32>,
        // cameraPosition: vec4<f32>,
        // frustum: array<vec4<f32>, 6>,
        // meshCount: vec4<f32>,
        // screenSize: vec4<f32>,
        // cameraNearFar: vec4<f32>,
        // projectionMatrixTransposed: mat4x4<f32>,
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
        }

        // Settings
        // struct Settings {
        //     frustumCullingEnabled: f32,
        //     backFaceCullingEnabled: f32,
        //     occlusionCullingEnabled: f32,
        //     smallFeaturesCullingEnabled: f32,
        //     staticLOD: f32,
        //     dynamicLODErrorThreshold: f32,
        //     dynamicLODEnabled: f32,
        // };
        const settings = new Float32Array([
            +Debugger.isFrustumCullingEnabled,
            +Debugger.isBackFaceCullingEnabled,
            +Debugger.isOcclusionCullingEnabled,
            +Debugger.isSmallFeaturesCullingEnabled,
            Debugger.staticLOD,
            Debugger.dynamicLODErrorThreshold,
            +Debugger.isDynamicLODEnabled,
            +Debugger.viewInstanceColors
        ]);
        this.compute.SetArray("settings", settings);
        this.shader.SetArray("settings", settings);

        RendererContext.ClearBuffer(this.computeDrawBuffer);

        this.generateDrawsPass(meshletsCount, true);
        // this.geometryPass(true);

        this.hizPass.buildDepthPyramid(this.depthTexture, this.vertexBuffer, this.instanceInfoBuffer, this.meshInfoBuffer, this.objectInfoBuffer, this.drawIndirectBuffer);

        this.generateDrawsPass(meshletsCount, false);
        this.drawIndirectBuffer.SetArray(new Uint32Array([Meshlet.max_triangles, meshletsCount, 0, 0]))
        this.geometryPass(true);

        if (Debugger.isDebugDepthPassEnabled) {
            this.depthViewer.execute(resources, this.hizPass.debugDepthTexture, Debugger.debugDepthMipLevel, Debugger.debugDepthExposure);
        }
        else {
            this.textureViewer.execute(resources, this.colorTarget);
            // this.occlusionCullingDebugger.execute(resources, this.colorTarget, this.hizPass.debugDepthTexture, this.cullData, this.meshInfoBuffer, this.meshletInfoBuffer, this.objectInfoBuffer);
        }

        this.computeDrawBuffer.GetData().then(v => {
            const visibleMeshCount = new Uint32Array(v)[1];
            Debugger.SetVisibleMeshes(visibleMeshCount);

            Debugger.SetTriangleCount(vertexSize / 3* meshletsCount);
            Debugger.SetVisibleTriangleCount(vertexSize / 3 * visibleMeshCount);
        })
    }
}