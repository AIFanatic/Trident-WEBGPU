import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Compute, Shader } from "../Shader";
import { Geometry, IndexAttribute, VertexAttribute } from "../../Geometry";
import { Buffer, BufferType } from "../Buffer";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { ComputeContext } from "../ComputeContext";
import { DepthTexture } from "../Texture";
import { Frustum } from "../../math/Frustum";
import { Debugger } from "../../plugins/Debugger";


const toNonIndexed = (geometry: Geometry): Geometry => {
    function convertBufferAttribute(attribute: VertexAttribute, indices: Uint32Array ) {
        const array = attribute.array;
        const itemSize = 3;
        const array2 = new Float32Array(indices.length * itemSize);

        let index = 0, index2 = 0;
        for ( let i = 0, l = indices.length; i < l; i ++ ) {
            index = indices[ i ] * itemSize;
            for ( let j = 0; j < itemSize; j ++ ) {
                array2[ index2 ++ ] = array[ index ++ ];
            }
        }

        return new VertexAttribute(array2);
    }

    if (!geometry.index || geometry.index === null) {
        throw Error('THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.');
    }

    const geometry2 = new Geometry();
    const indices = geometry.index.array;
    const attributes = geometry.attributes;

    for (const [name, attribute] of attributes ) {
        const newAttribute = convertBufferAttribute( attribute, indices as Uint32Array );
        geometry2.attributes.set( name, newAttribute );
    }

    return geometry2;
}

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

        @group(0) @binding(3) var<storage, read> vertices: array<vec4<f32>>;

        struct InstanceInfo {
            meshID: u32
        };

        @group(0) @binding(4) var<storage, read> instanceInfo: array<InstanceInfo>;

        struct MeshInfo {
            startVertex: vec4<f32>,
            objectID: vec4<f32>,
            modelMatrix: mat4x4<f32>,
            sphereBounds: vec4<f32>,
        };
        @group(0) @binding(5) var<storage, read> meshInfo: array<MeshInfo>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let meshID = instanceInfo[input.instanceIndex].meshID;
            let mesh = meshInfo[meshID];
            let modelMatrix = mesh.modelMatrix;
            
            let vertexID = input.vertexIndex + u32(mesh.objectID.x) * 128;
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
                vertices: {group: 0, binding: 3, type: "storage"},
                instanceInfo: {group: 0, binding: 4, type: "storage"},
                meshInfo: {group: 0, binding: 5, type: "storage"},
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

                struct MeshInfo {
                    startVertex: vec4<f32>,
                    objectID: vec4<f32>,
                    modelMatrix: mat4x4<f32>,
                    sphereBounds: vec4<f32>,
                };

                @group(0) @binding(1) var<storage, read> meshInfo: array<MeshInfo>;

                struct InstanceInfo {
                    meshID: u32
                };

                @group(0) @binding(2) var<storage, read_write> instanceInfo: array<InstanceInfo>;


                struct CullData {
                    projectionMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    frustum: array<vec4<f32>, 6>,
                    meshCount: vec4<f32>
                };

                @group(0) @binding(3) var<storage, read> cullData: CullData;
                

                fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
                    return dot(normal, point) + constant;
                    // return this.normal.dot( point ) + this.constant;
                }

                fn IsVisible(objectIndex: u32) -> bool {
                    let sphereBounds = meshInfo[objectIndex].sphereBounds;
                    // var center = sphereBounds.xyz;
                    var center = sphereBounds.xyz;
                    center = (cullData.viewMatrix * vec4(center, 1.0)).xyz;
                    let negRadius = -sphereBounds.w;
                    var visible = true;

                    for (var i = 0; i < 6; i++) {
                        let distance = planeDistanceToPoint(cullData.frustum[i].xyz, cullData.frustum[i].w, center);

                        if (distance < negRadius) {
                            visible = false;
                            break;
                        }
                    }

                    // var center = sphereBounds.xyz;
                    // center = (cullData.viewMatrix * vec4(center, 1.0)).xyz;
                    // let radius = sphereBounds.w;
                    
                    // let visible = true;


                
                    // the left/top/right/bottom plane culling utilizes frustum symmetry to cull against two planes at the same time
                    // visible = visible && center.z * cullData.frustum[1] - abs(center.x) * cullData.frustum[0] > -radius;
                    // visible = visible && center.z * cullData.frustum[3] - abs(center.y) * cullData.frustum[2] > -radius;
                
                    // if(cullData.distCull != 0)
                    // {// the near/far plane culling uses camera space Z directly
                    //     visible = visible && center.z + radius > cullData.znear && center.z - radius < cullData.zfar;
                    // }
                    
                
                    // // visible = visible || cullData.cullingEnabled == 0;
                
                    // // //flip Y because we access depth texture that way
                    // // center.y *= -1;
                
                    // // if(visible && cullData.occlusionEnabled != 0)
                    // // {
                    // //     vec4 aabb;
                    // //     if (projectSphere(center, radius, cullData.znear, cullData.P00, cullData.P11, aabb))
                    // //     {
                    // //         float width = (aabb.z - aabb.x) * cullData.pyramidWidth;
                    // //         float height = (aabb.w - aabb.y) * cullData.pyramidHeight;
                
                    // //         float level = floor(log2(max(width, height)));
                
                    // //         // Sampler is set up to do min reduction, so this computes the minimum depth of a 2x2 texel quad
                            
                    // //         float depth = textureLod(depthPyramid, (aabb.xy + aabb.zw) * 0.5, level).x;
                    // //         float depthSphere =cullData.znear / (center.z - radius);
                
                    // //         visible = visible && depthSphere >= depth;
                    // //     }
                    // // }
                
                    return visible;
                }

                override blockSizeX: u32 = 32;
                override blockSizeY: u32 = 1;
                override blockSizeZ: u32 = 1;
                
                @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
                fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                    let gID = grid.z * (blockSizeX * blockSizeY) + grid.y * blockSizeX + grid.x;
                    if (gID < u32(cullData.meshCount.x)) {
                        let visible = IsVisible(gID);
                            
                        if (visible) {

                            let mesh = meshInfo[gID];
                            
                            
                            
                            drawBuffer.vertexCount = 128;
                            let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                            
        
                            instanceInfo[countIndex].meshID = gID;
                        }
                        
                    }

                } 
            
            `,
            computeEntrypoint: "main",
            uniforms: {
                drawBuffer: {group: 0, binding: 0, type: "storage-write"},
                meshInfo: {group: 0, binding: 1, type: "storage"},
                instanceInfo: {group: 0, binding: 2, type: "storage-write"},
                cullData: {group: 0, binding: 3, type: "storage"},
            }
        });
    }

    public execute(resources: ResourcePool) {
        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const sceneMeshes = scene.GetComponents(Mesh);


        if (this.currentMeshCount !== sceneMeshes.length) {


            console.time("GGGG");
            let vertices: number[] = [];

            const vsT = new Float32Array(128 * 3);

            let meshInfoData: number[][] = [];
            const indexedCache: Map<string, number> = new Map();
            for (let i = 0; i < sceneMeshes.length; i++) {
                const mesh = sceneMeshes[i];
                const meshGeometry = mesh.GetGeometry();
                let geometryIndex = indexedCache.get(meshGeometry.id);
                if (geometryIndex === undefined) {
                    geometryIndex = indexedCache.size;
                    indexedCache.set(meshGeometry.id, geometryIndex);

                    const indexedGeometry = toNonIndexed(meshGeometry);
                    const geometryVertices = indexedGeometry.attributes.get("position");
                    if (!geometryVertices) throw Error("Need mesh to have vertices");
    
                    vsT.set(geometryVertices.array);
    
                    vertices.push(...vsT);
                }

                const aabbMin = Math.min(...meshGeometry.aabb.min.elements);
                const aabbMax = Math.max(...meshGeometry.aabb.max.elements);
                const aabbExtents = Math.abs(aabbMin) + Math.abs(aabbMax);
                const sphereDiameter = aabbExtents;
                meshInfoData.push([
                    i * 384, 0, 0, 0,
                    geometryIndex, 0, 0, 0,
                    ...sceneMeshes[i].transform.localToWorldMatrix.elements,
                    ...sceneMeshes[i].transform.position.elements, sphereDiameter
                ]);
            }
            // console.log(indexedCache)
            // console.log(vertices)
            // console.log(meshInfoData)
            const meshInfoBuffer = Buffer.Create(sceneMeshes.length * (4 + 4 + 16 + 4) * 4, BufferType.STORAGE);
            meshInfoBuffer.SetArray(new Float32Array(meshInfoData.flat()));
            this.compute.SetBuffer("meshInfo", meshInfoBuffer);
            this.shader.SetBuffer("meshInfo", meshInfoBuffer);

            console.timeEnd("GGGG");

            console.warn(`
            TODO: You are passing each individual mesh as a unique mesh which kinda defeats the purpose of all of this,
                  each mesh if its repeated (vertices already loaded) can just pass the baseVertex id
            `)


            this.drawIndirectBuffer = Buffer.Create(4 * 4, BufferType.INDIRECT);


            this.geometry = new Geometry();
            this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(128)));

            // Vertices buffer
            const verticesArray = new Float32Array(sceneMeshes.length * 128 * 4);

            let j = 0;
            for (let i = 0; i < vertices.length; i+=3) {
                verticesArray[j] = vertices[i + 0];
                verticesArray[++j] = vertices[i + 1];
                verticesArray[++j] = vertices[i + 2];
                verticesArray[++j] = vertices[i + 3];
                verticesArray[++j] = 0;
            }

            // console.log(verticesArray)
            this.vertexBuffer = Buffer.Create(verticesArray.byteLength, BufferType.STORAGE);
            this.vertexBuffer.SetArray(verticesArray);
            this.shader.SetBuffer("vertices", this.vertexBuffer);
            
            this.currentMeshCount = sceneMeshes.length;
        }

        this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);

        this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);
        this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);

        // projectionMatrix: mat4x4<f32>,
        // viewMatrix: mat4x4<f32>,
        // frustum: array<vec4<f32>, 4>
        if (!this.cullData) {
            this.cullData = Buffer.Create((16 + 16 + (6 * 4) + 4) * 4, BufferType.STORAGE);
            this.compute.SetBuffer("cullData", this.cullData);
        }

        // projectionMatrix: mat4x4<f32>,
        // viewMatrix: mat4x4<f32>,
        // frustum: array<vec4<f32>, 4>
        this.cullData.SetArray(new Float32Array([
            ...mainCamera.projectionMatrix.elements,
            ...mainCamera.viewMatrix.elements,
            ...this.frustum.planes[0].normal.elements, this.frustum.planes[0].constant,
            ...this.frustum.planes[1].normal.elements, this.frustum.planes[1].constant,
            ...this.frustum.planes[2].normal.elements, this.frustum.planes[2].constant,
            ...this.frustum.planes[3].normal.elements, this.frustum.planes[3].constant,
            ...this.frustum.planes[4].normal.elements, this.frustum.planes[4].constant,
            ...this.frustum.planes[5].normal.elements, this.frustum.planes[5].constant,
            sceneMeshes.length, 0, 0, 0
        ]))


        if (!this.computeDrawBuffer) {
            // Draw indirect buffer
            this.computeDrawBuffer = Buffer.Create(4 * 4, BufferType.STORAGE_WRITE);
            this.compute.SetBuffer("drawBuffer", this.computeDrawBuffer);

            // InstanceBuffer
            this.instanceInfoBuffer = Buffer.Create(sceneMeshes.length * 1 * 4, BufferType.STORAGE_WRITE);
            this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
            this.shader.SetBuffer("instanceInfo", this.instanceInfoBuffer);

        }
        RendererContext.ClearBuffer(this.computeDrawBuffer);


        ComputeContext.BeginComputePass("GPUDriven");
        const workgroupSizeX = Math.floor((sceneMeshes.length + 31) / 32);
        ComputeContext.Dispatch(this.compute, workgroupSizeX);
        ComputeContext.EndComputePass();

        RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);

        RendererContext.BeginRenderPass("GPUDriven", [{clear: true}], {target: this.depthTarget, clear: true});
        RendererContext.DrawIndirect(this.geometry, this.shader, this.drawIndirectBuffer);
        RendererContext.EndRenderPass();


        this.computeDrawBuffer.GetData().then(v => {
            Debugger.SetVisibleMeshes(new Uint32Array(v)[1]);
            // console.log(new Uint32Array(v))
        })
    }
}