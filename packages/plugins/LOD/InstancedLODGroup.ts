import { Components, Geometry, GPU, Mathf, Runtime } from "@trident/core";
import { LOD, LODRenderer } from "./LODGroup";

// 1) Compute shader bins instances per LOD and packs matrices into that LOD's slice.
// 2) The same dispatch increments instanceCount directly in the indirect buffer.
// 3) Each renderer draws indirect from its own 20-byte slot; firstInstance selects the slice.
//
// The packed matrices live inside Components.Mesh.modelMatrices — the engine-wide pool that
// Mesh/LODGroup already bind. Owning a private buffer means any material shared with a live
// Mesh ping-pongs the shader's "modelMatrix" binding every frame, which dirties the shader.

const DRAW_ARGS_U32 = 5;                       // indexCount, instanceCount, firstIndex, baseVertex, firstInstance
const DRAW_ARGS_BYTES = DRAW_ARGS_U32 * 4;

interface DrawSlot {
    renderer: LODRenderer;
    byteOffset: number;
    lodIndex: number;
}

export class InstancedLODGroup extends Components.Renderable {
    private initialized = false;

    private drawCompute: GPU.ShaderCompute;

    // One 20-byte indirect slot per (lod, renderer). Compute atomically bumps instanceCount in place.
    private drawArgsBuffer: GPU.Buffer;
    private drawArgs: Uint32Array;              // CPU template, re-uploaded each frame to reset the counters
    private drawSlots: DrawSlot[] = [];

    // Block reserved inside Components.Mesh.modelMatrices, lods.length slices of MATRICES_PER_LOD.
    private matrixBlockKey = {};
    private matrixBlockBase = 0;                // in matrices, not floats

    // 0 = only LOD0 casts shadows
    // 1 = LOD0 and LOD1 cast shadows
    public maxShadowLodIndex = 1;

    // Per-LOD table: screenSize + where that LOD's draw slots live. Uploaded as one Float32Array.
    private lodTable: Float32Array;

    public static readonly DefaultCapacity = 65536;
    public static readonly MATRICES_PER_LOD = InstancedLODGroup.DefaultCapacity;

    public lods: LOD[] = [];

    private matrices = new GPU.DynamicBufferMemoryAllocator(
        InstancedLODGroup.DefaultCapacity * 16,
        InstancedLODGroup.DefaultCapacity * 16,
    );
    private _instanceCount = 0;
    private builtLodCount = 0;

    public get instanceCount(): number { return this._instanceCount; }
    public get matricesBuffer(): GPU.Buffer { return this.matrices.getBuffer(); }

    public ResetInstances(): void { this._instanceCount = 0; }

    public SetMatrixAt(index: number, matrix: Mathf.Matrix4): void {
        this.matrices.set(index, matrix.elements);
        this._instanceCount = Math.max(this._instanceCount, index + 1);
    }

    public SetMatricesBulk(matrices: Float32Array): void {
        this.matrices.set(0, matrices);
        this._instanceCount = matrices.length / 16;
    }

    public ReserveInstances(count: number): void {
        if (this.matrices.has(0)) this.matrices.delete(0);
        this.matrices.set(0, new Float32Array(count * 16));
        this._instanceCount = count;
    }

    // Expose a representative geometry so RenderablePass picks it up.
    public get geometry(): Geometry {
        return this.lods[0]?.renderers?.[0]?.geometry;
    }

    public async Start() {
        super.Start();

        if (!GPU.Renderer.device.features.has("indirect-first-instance")) {
            throw Error("InstancedLODGroup requires the 'indirect-first-instance' WebGPU feature");
        }

        this.drawCompute = await GPU.ShaderCompute.Create({
            name: this.name + "-Compute",
            code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            struct DrawArgs {
                indexCount: u32,
                instanceCount: atomic<u32>,
                firstIndex: u32,
                baseVertex: u32,
                firstInstance: u32,
            };

            struct LODInfo {
                screenSize: f32,
                drawStart: f32,   // f32 so the whole table uploads as a single Float32Array
                drawCount: f32,
                _pad: f32,
            };

            @group(0) @binding(0) var<storage, read>       frameBuffer: FrameBuffer;
            @group(0) @binding(1) var<storage, read_write> drawBuffer: array<DrawArgs>;
            @group(0) @binding(2) var<storage, read>       modelMatrix: array<mat4x4<f32>>;
            @group(0) @binding(3) var<storage, read>       boundingSphere: vec4<f32>;
            @group(0) @binding(4) var<storage, read>       meshCount: f32;
            @group(0) @binding(5) var<storage, read>       lodCount: f32;
            @group(0) @binding(6) var<storage, read>       lods: array<LODInfo>;
            @group(0) @binding(7) var<storage, read_write> lodMatrices: array<mat4x4<f32>>;
            @group(0) @binding(8) var<storage, read>       matrixBase: f32;

            const lodMatrixCapacity: u32 = ${InstancedLODGroup.MATRICES_PER_LOD}u;
            const blockSize: u32 = 4;

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
                let dim: u32 = u32(ceil(pow(meshCount, 1.0 / 3.0)));
                let objectIndex = grid.x + grid.y * dim + grid.z * dim * dim;

                if (objectIndex >= u32(meshCount)) { return; }

                let modelMatrixInstance = modelMatrix[objectIndex];
                let modelPosition = modelMatrixInstance[3].xyz;

                if (outsideFrustum(modelMatrixInstance, boundingSphere)) { return; }

                let lc = u32(lodCount);
                if (lc == 0u) { return; }

                let radiusScale = computeRadiusScale(modelMatrixInstance);
                let worldRadius = boundingSphere.w * radiusScale;
                let d = max(0.0001, distance(frameBuffer.viewPosition.xyz, modelPosition));

                let projectionY = frameBuffer.projectionMatrix[1][1];
                let screenSize = (worldRadius * projectionY) / d;

                var lod: u32 = lc;
                for (var i: u32 = 0u; i < lc; i++) {
                    if (screenSize >= lods[i].screenSize) {
                        lod = i;
                        break;
                    }
                }

                if (lod >= lc) { return; }   // culled — don't enqueue

                // Every renderer in the LOD draws the same instances, so they all share the count.
                let info = lods[lod];
                let drawStart = u32(info.drawStart);
                let drawCount = u32(info.drawCount);

                var writeIndex = 0u;
                for (var r = 0u; r < drawCount; r++) {
                    writeIndex = atomicAdd(&drawBuffer[drawStart + r].instanceCount, 1u);
                }

                if (writeIndex < lodMatrixCapacity) {
                    lodMatrices[u32(matrixBase) + lod * lodMatrixCapacity + writeIndex] = modelMatrixInstance;
                }
            }
        `
        });
        this.initialized = true;
    }

    private buildLodBuffers(): void {
        this.drawArgsBuffer?.Destroy();

        if (!Components.Mesh.modelMatrices) {
            Components.Mesh.modelMatrices = new GPU.DynamicBufferMemoryAllocator(16 * 1000, 16 * 1000);
        }
        const pool = Components.Mesh.modelMatrices;
        if (pool.has(this.matrixBlockKey)) pool.delete(this.matrixBlockKey);

        const capacity = InstancedLODGroup.MATRICES_PER_LOD;
        const matrixCount = this.lods.length * InstancedLODGroup.MATRICES_PER_LOD * 16;

        this.matrixBlockBase = pool.reserve(this.matrixBlockKey, matrixCount) / 16;

        this.drawSlots = [];
        this.lodTable = new Float32Array(this.lods.length * 4);

        // Pass 1: lay out one draw slot per (lod, renderer).
        for (let i = 0; i < this.lods.length; i++) {
            const lod = this.lods[i];
            if (!lod.renderers || lod.renderers.length === 0) throw Error("LOD requires at least one renderer");

            this.lodTable[i * 4 + 1] = this.drawSlots.length;
            this.lodTable[i * 4 + 2] = lod.renderers.length;

            for (const renderer of lod.renderers) {
                if (!renderer.geometry) throw Error("No geometry");
                if (!renderer.geometry.index) throw Error("No index buffer");
                if (!renderer.material) throw Error("No material or shader");

                this.drawSlots.push({ renderer, byteOffset: this.drawSlots.length * DRAW_ARGS_BYTES, lodIndex: i });
            }
        }

        // Pass 2: build the CPU-side arg template. Only instanceCount ever changes, and only on the GPU.
        this.drawArgs = new Uint32Array(this.drawSlots.length * DRAW_ARGS_U32);
        for (let i = 0, slot = 0; i < this.lods.length; i++) {
            const firstInstance = this.matrixBlockBase + i * capacity;
            for (const renderer of this.lods[i].renderers) {
                const base = slot * DRAW_ARGS_U32;
                this.drawArgs[base + 0] = renderer.geometry.index.count;
                this.drawArgs[base + 4] = firstInstance;
                slot++;
            }
        }

        this.drawArgsBuffer = new GPU.Buffer(this.drawArgs.byteLength, GPU.BufferType.INDIRECT);

        this.builtLodCount = this.lods.length;
    }

    public OnPreFrame(): void {
        if (!this.initialized) return;
        if (this.lods.length === 0) return;

        if (this.builtLodCount !== this.lods.length) this.buildLodBuffers();

        for (let i = 0; i < this.lods.length; i++) this.lodTable[i * 4] = this.lods[i].screenSize;
        
        const bounds = this.lods[0].renderers[0].geometry.boundingVolume;

        // This queue write happens before the main command buffer is created.
        this.drawArgsBuffer.SetArray(this.drawArgs);

        const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        this.drawCompute.SetBuffer("frameBuffer", FrameBuffer);
        this.drawCompute.SetBuffer("drawBuffer", this.drawArgsBuffer);
        this.drawCompute.SetBuffer("modelMatrix", this.matricesBuffer);
        this.drawCompute.SetBuffer("lodMatrices", Components.Mesh.modelMatrices.getBuffer());
        this.drawCompute.SetArray("boundingSphere", new Float32Array([...bounds.center.elements, bounds.radius,]));
        this.drawCompute.SetArray("lods", this.lodTable);
        this.drawCompute.SetValue("meshCount", this.instanceCount);
        this.drawCompute.SetValue("lodCount", this.lods.length);
        this.drawCompute.SetValue("matrixBase", this.matrixBlockBase);
    }

    public OnPreRender(): void {
        if (!this.initialized || !this.drawArgsBuffer) return;

        // This is encoded into RenderingPipeline's main command encoder.
        const dispatch = Math.ceil(Math.max(1, Math.ceil(Math.cbrt(this.instanceCount))) / 4);
        GPU.ComputeContext.BeginComputePass(`InstancedLODGroup-Cull`, true);
        GPU.ComputeContext.Dispatch(this.drawCompute, dispatch, dispatch, dispatch);
        GPU.ComputeContext.EndComputePass();

        const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        const modelMatrices = Components.Mesh.modelMatrices.getBuffer();

        for (const { renderer } of this.drawSlots) {
            for (const shader of [renderer.material?.GetShader(), renderer.material?.GetShader("ShadowCaster")]) {
                if (!shader) continue;

                if (shader.HasProperty("frameBuffer")) shader.SetBuffer("frameBuffer", FrameBuffer);
                if (shader.HasProperty("modelMatrix")) shader.SetBuffer("modelMatrix", modelMatrices);
            }
        }
    }

    public OnRenderObject(): void {
        if (!this.initialized || !this.drawArgsBuffer) return;

        const isShadowPass = GPU.RendererContext.activePass?.name === "ShadowCaster";

        for (const slot of this.drawSlots) {
            if (isShadowPass && slot.lodIndex > this.maxShadowLodIndex) continue;

            const shader = slot.renderer.material?.shader;
            if (!shader) continue;

            GPU.RendererContext.DrawIndirect(slot.renderer.geometry, shader, this.drawArgsBuffer, slot.byteOffset);
        }
    }

    public Destroy(): void {
        this.drawArgsBuffer?.Destroy();
        Components.Mesh.modelMatrices?.delete(this.matrixBlockKey);
        this.matrices.Destroy();
        this.drawSlots = [];
        super.Destroy();
    }
}
