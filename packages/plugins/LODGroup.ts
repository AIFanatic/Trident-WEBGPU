import { Components, Geometry, GPU, Mathf, Scene } from "@trident/core";

export interface LODRenderer {
    geometry: Geometry;
    material: GPU.Material;
}

export interface LOD {
    renderers: LODRenderer[];
    screenSize: number;
}

type LodRendererData = {
    renderer: LODRenderer;
    drawBuffer: GPU.Buffer;
};

export class LODGroup extends Components.Renderable {
    public static readonly DefaultCapacity = 100000;
    public static readonly MATRICES_PER_LOD = LODGroup.DefaultCapacity;
    public static readonly MATRIX_STRIDE_BYTES = LODGroup.MATRICES_PER_LOD * 16 * 4;

    public lods: LOD[] = [];

    private matrices = new GPU.DynamicBufferMemoryAllocator(16, LODGroup.DefaultCapacity * 16);
    private _instanceCount = 0;

    public get instanceCount(): number { return this._instanceCount; }
    public get matricesBuffer(): GPU.Buffer { return this.matrices.getBuffer(); }

    public ResetInstances(): void { this._instanceCount = 0; }

    public SetMatrixAt(index: number, matrix: Mathf.Matrix4): void {
        this.matrices.set(index, matrix.elements);
        this._instanceCount = Math.max(this._instanceCount, index + 1);
    }

    // Expose a representative geometry so shadow passes can at least draw something.
    public get geometry(): Geometry | undefined {
        const lod0 = this.lods[0];
        const renderer0 = lod0?.renderers?.[0];
        return renderer0?.geometry;
    }
}

// 1) Compute shader bins instances per LOD and packs matrices per LOD.
// 2) Copy each LOD’s draw arguments + packed matrices to dedicated buffers.
// 3) Draw every renderer belonging to each LOD.

export class LODInstanceRenderable extends LODGroup {
    private initialized = false;

    private drawCompute: GPU.Compute;
    private drawIndirectBuffer: GPU.Buffer;
    private lodRendererData: LodRendererData[][] = [];
    private lodMatricesScratch: GPU.Buffer;
    private lodMatrixBuffers: GPU.Buffer[] = [];

    public async Start() {
        this.drawCompute = await GPU.Compute.Create({
            code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
            
            @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;

            struct DrawBuffer {
                indexCount: u32,
                instanceCount: atomic<u32>,
                firstIndex: u32,
                baseVertex: u32,
                firstInstance: u32,
            };

            @group(0) @binding(1) var<storage, read_write> drawBuffer: array<DrawBuffer>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(0) @binding(3) var<storage, read> boundingSphere: vec4<f32>;

            @group(0) @binding(4) var<storage, read> meshCount: f32;
            @group(0) @binding(5) var<storage, read> lodCount: f32;

            struct LODInfo {
                distance: f32,
            };
            @group(0) @binding(6) var<storage, read> lods: array<LODInfo>;

            @group(0) @binding(7) var<storage, read_write> lodMatrices: array<mat4x4<f32>>;

            @group(0) @binding(8) var<storage, read> viewProjection: mat4x4<f32>;

            const lodMatrixCapacity: u32 = ${LODGroup.MATRICES_PER_LOD}u;

            const blockSize: u32 = 1;

            fn computeRadiusScale(modelMatrix: mat4x4<f32>) -> f32 {
                let sx = length(modelMatrix[0].xyz);
                let sy = length(modelMatrix[1].xyz);
                let sz = length(modelMatrix[2].xyz);
                return max(sx, max(sy, sz));
            }

            fn worldCenter(modelMatrix: mat4x4<f32>, localCenter: vec3f) -> vec3f {
                return (modelMatrix * vec4f(localCenter, 1.0)).xyz;
            }
                
            fn outsideFrustum(modelMatrix: mat4x4<f32>, boundingSphere: vec4<f32>) -> bool {
                let radiusScale = computeRadiusScale(modelMatrix);
                let centerWorld = worldCenter(modelMatrix, boundingSphere.xyz);
                let worldRadius = boundingSphere.w * radiusScale;
            
                for (var i = 0u; i < 6u; i++) {
                    let plane = frameBuffer.frustum[i];
                    let distance = dot(plane.xyz, centerWorld) + plane.w;
                    if (distance < -worldRadius) {
                        return true;
                    }
                }
                    
                return false;
            }

            @compute @workgroup_size(blockSize, blockSize, blockSize)
            fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                let size = u32(ceil(pow(meshCount, 1.0 / 3.0)));
                let objectIndex = grid.x + (grid.y * size) + (grid.z * size * size);

                if (objectIndex >= u32(meshCount)) {
                    return;
                }

                let modelMatrixInstance = modelMatrix[objectIndex];
                let modelPosition = modelMatrixInstance[3].xyz;

                if (outsideFrustum(modelMatrixInstance, boundingSphere)) {
                    // return;
                }

                let lc = u32(lodCount);
                if (lc == 0u) { return; }
                
                let d = distance(frameBuffer.viewPosition.xyz, modelPosition);
                let cullDistance = lods[lc - 1u].distance;
                if (d > cullDistance) { return; }

                var lod: u32 = lc - 1u;

                // pick the first threshold that contains d
                for (var i: u32 = 0u; i < lc; i++) {
                    if (d <= lods[i].distance) {
                        lod = i;
                        break;
                    }
                }

                let writeIndex = atomicAdd(&drawBuffer[lod].instanceCount, 1u);
                if (writeIndex < lodMatrixCapacity) {
                    let baseIndex = lod * lodMatrixCapacity + writeIndex;
                    lodMatrices[baseIndex] = modelMatrixInstance;
                }
            }
        `
        });

        this.drawIndirectBuffer = GPU.Buffer.Create(this.lods.length * 5 * 4, GPU.BufferType.STORAGE_WRITE);
        this.lodMatricesScratch = GPU.Buffer.Create(this.lods.length * LODGroup.MATRIX_STRIDE_BYTES, GPU.BufferType.STORAGE_WRITE);
        this.lodMatrixBuffers = this.lods.map(() => GPU.Buffer.Create(LODGroup.MATRIX_STRIDE_BYTES, GPU.BufferType.STORAGE));

        this.lodRendererData.length = this.lods.length;

        for (let i = 0; i < this.lods.length; i++) {
            const lod = this.lods[i];
            if (!lod.renderers || lod.renderers.length === 0) throw Error("LOD requires at least one renderer");

            this.drawIndirectBuffer.SetArray(new Uint32Array([0, 0, 0, 0, 0]), i * 5 * 4);
            this.lodRendererData[i] = [];

            for (const renderer of lod.renderers) {
                const geometry = renderer.geometry;
                if (!geometry) throw Error("No geometry");
                const indexBuffer = geometry.index;
                if (!indexBuffer) throw Error("No index buffer");
                if (!renderer.material) throw Error("No material or shader");

                const drawBuffer = GPU.Buffer.Create(5 * 4, GPU.BufferType.INDIRECT);
                const indexCountBuffer = GPU.Buffer.Create(4, GPU.BufferType.STORAGE);
                indexCountBuffer.SetArray(new Uint32Array([indexBuffer.count]));
                drawBuffer.SetArray(new Uint32Array([indexBuffer.count, 0, 0, 0, 0]));

                drawBuffer.SetArray(new Uint32Array([indexBuffer.count, 0, 0, 0, 0])); // indexCount set once
                this.lodRendererData[i].push({ renderer, drawBuffer });
            }
        }

        const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;
        this.material = new GPU.Material({
            isDeferred: true,
            shader: await GPU.Shader.Create({
                code: `
                    struct FrameBuffer {
                        projectionOutputSize: vec4<f32>,
                        viewPosition: vec4<f32>,
                        projectionInverseMatrix: mat4x4<f32>,
                        viewInverseMatrix: mat4x4<f32>,
                        viewMatrix: mat4x4<f32>,
                        projectionMatrix: mat4x4<f32>,
                    };
                    @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                `,
                colorOutputs: [
                    { format: gbufferFormat },
                    { format: gbufferFormat },
                    { format: gbufferFormat },
                    { format: gbufferFormat }
                ],
                depthOutput: "depth24plus",
            })
        });

        this.initialized = true;
    }

    public OnPreFrame(): void {
        if (!this.initialized) return;
        if (this.lods.length === 0) return;

        // Set boundingSphere from first lod
        const lod0 = this.lods[0];
        this.drawCompute.SetArray("boundingSphere", new Float32Array([
            ...lod0.renderers[0].geometry.boundingVolume.center.elements,
            lod0.renderers[0].geometry.boundingVolume.radius
        ]));

        for (let i = 0; i < this.lods.length; i++) {
            this.drawIndirectBuffer.SetArray(new Uint32Array([0, 0, 0, 0, 0]), i * 5 * 4);
        }

        const lodInfo: number[] = [];
        for (const lod of this.lods) lodInfo.push(lod.screenSize);
        this.drawCompute.SetArray("lods", new Float32Array(lodInfo));

        const resources = Scene.mainScene.renderPipeline.renderGraph.resourcePool;
        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        GPU.Renderer.BeginRenderFrame();

        this.drawCompute.SetBuffer("drawBuffer", this.drawIndirectBuffer);
        this.drawCompute.SetValue("meshCount", this.instanceCount);
        this.drawCompute.SetBuffer("frameBuffer", FrameBuffer);
        this.drawCompute.SetBuffer("modelMatrix", this.matricesBuffer);
        this.drawCompute.SetValue("lodCount", this.lods.length);
        this.drawCompute.SetBuffer("lodMatrices", this.lodMatricesScratch);

        GPU.ComputeContext.BeginComputePass("LODGroup");
        const dispatchSize = Math.max(1, Math.ceil(Math.cbrt(this.instanceCount)));
        GPU.ComputeContext.Dispatch(this.drawCompute, dispatchSize, dispatchSize, dispatchSize);
        GPU.ComputeContext.EndComputePass();

        GPU.Renderer.EndRenderFrame();
    }

    public OnPreRender(): void {
        if (!this.initialized) return;

        const resources = Scene.mainScene.renderPipeline.renderGraph.resourcePool;
        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        for (let i = 0; i < this.lods.length; i++) {
            const lodMatricesOffset = i * LODGroup.MATRIX_STRIDE_BYTES;
            GPU.RendererContext.CopyBufferToBuffer(this.lodMatricesScratch, this.lodMatrixBuffers[i], lodMatricesOffset, 0, LODGroup.MATRIX_STRIDE_BYTES);

            const lodDrawOffset = i * 5 * 4;

            for (const data of this.lodRendererData[i]) {
                GPU.RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, data.drawBuffer, lodDrawOffset + 4, 4, 4);

                const { geometry, material } = data.renderer;
                material.shader.SetBuffer("modelMatrix", this.lodMatrixBuffers[i]);
                material.shader.SetBuffer("frameBuffer", FrameBuffer);
            }
        }
    }

    public OnRenderObject(shaderOverride: GPU.Shader) {
        if (!this.initialized) return;

        for (const lodData of this.lodRendererData) {
            for (const data of lodData) {
                const { geometry, material } = data.renderer;
                const shader = shaderOverride ? shaderOverride : material.shader;

                GPU.RendererContext.DrawIndirect(geometry, shader, data.drawBuffer);
            }
        }
    }

    public Destroy(): void {
        this.drawIndirectBuffer?.Destroy();
        this.lodMatricesScratch?.Destroy();
        for (const buffer of this.lodMatrixBuffers) buffer.Destroy();
        for (const lodData of this.lodRendererData) {
            for (const data of lodData) {
                data.drawBuffer.Destroy();
            }
        }
        super.Destroy();
    }
}
