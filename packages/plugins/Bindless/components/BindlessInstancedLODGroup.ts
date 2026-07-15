import { Geometry, GPU, Mathf, Runtime } from "@trident/core";
import { Heap, VBuffer, Ptr } from "../Heap";
import { BindlessMesh } from "./BindlessMesh";
import { BindlessPBRMaterial } from "../BindlessPBRMaterial";
import { PassData } from "../passes/PassData";
import { BINDLESS_COMPUTE_WGSL } from "../passes/BindlessPassCommon";
import { BindlessDrawCommand } from "../passes/BindlessDrawPass";

export interface BindlessLODRenderer { geometry: Geometry; material: BindlessPBRMaterial; }
export interface BindlessLOD { screenSize: number; renderers: BindlessLODRenderer[]; }

/* All state is heap data:
 *   group record: [sourceMatrices, instanceCount, lodCount, slotCount,
 *                  lodMatrices, drawArgs, counters, slots,
 *                  boundingSphere: vec4, screenSizes, capacity, pad] (16 u32)
 *   slot:         [lod, indexCount, drawRecordPtr, pad]
 *   drawArgs:     [vertexCount, 1, 0, drawRecordPtr] per slot — drawn indirect FROM THE HEAP
 * The dispatch finds its group record through passPtr, same as render passes find their camera.
 */
export class BindlessInstancedLODGroup extends BindlessMesh {
    public static readonly DefaultCapacity = 65536;

    public lods: BindlessLOD[] = [];
    public _instanceCount = 0;
    public get instanceCount(): number { return this._instanceCount; }

    // PropGenerator contract: the buffer is the heap; the region starts at matricesPtr.
    private sourceMatrices?: VBuffer;
    public get matricesBuffer(): GPU.Buffer { return Heap.buffer; }
    public get matricesPtr(): Ptr { return this.sourceMatrices!.ptr; }

    private compute?: GPU.ShaderCompute;
    private group?: VBuffer;
    private lodMatrices?: VBuffer;
    private drawArgs?: VBuffer;
    private counters?: VBuffer;
    private slots?: VBuffer;
    private screenSizes?: VBuffer;
    private slotRecordPtrs: Ptr[] = [];
    private passSlot = -1;
    private builtLodCount = 0;

    public get ready(): boolean { return this.builtLodCount > 0; }

    public ResetInstances(): void { this._instanceCount = 0; }

    public ReserveInstances(count: number): void {
        if (!this.sourceMatrices || this.sourceMatrices.size < count * 16) {
            this.sourceMatrices = new VBuffer(count * 16, 16);   // old region leaks — heap free-list later
        }
        this.sourceMatrices.SetArray(new Float32Array(count * 16));
        this._instanceCount = count;
    }

    public SetMatrixAt(index: number, matrix: Mathf.Matrix4 | Float32Array): void {
        if (!this.sourceMatrices) this.ReserveInstances(BindlessInstancedLODGroup.DefaultCapacity);
        const elements = matrix instanceof Float32Array ? matrix : matrix.elements;
        this.sourceMatrices!.SetArray(elements, index * 16);
        this._instanceCount = Math.max(this._instanceCount, index + 1);
    }

    public SetMatricesBulk(matrices: Float32Array) {
        if (!this.sourceMatrices || this.sourceMatrices.size < matrices.length) this.ReserveInstances(matrices.length / 16);
        this.sourceMatrices!.SetArray(matrices);
        this._instanceCount = matrices.length / 16;
    }

    public async Start() {
        this.compute = await GPU.ShaderCompute.Create({
            name: this.name + "-BindlessLODCompute",
            code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
                ` + BINDLESS_COMPUTE_WGSL + `
                @group(0) @binding(2) var<storage, read> frameBuffer: FrameBuffer;

                struct LODGroup {
                    sourceMatrices: u32, instanceCount: u32, lodCount: u32, slotCount: u32,
                    lodMatrices: u32, drawArgs: u32, counters: u32, slots: u32,
                    boundingSphere: vec4f, screenSizes: u32, capacity: u32,
                };
                fn loadLODGroup(p: u32) -> LODGroup {
                    return LODGroup(
                        loadU32(p), loadU32(p + 1u), loadU32(p + 2u), loadU32(p + 3u),
                        loadU32(p + 4u), loadU32(p + 5u), loadU32(p + 6u), loadU32(p + 7u),
                        loadVec4(p + 8u), loadU32(p + 12u), loadU32(p + 13u));
                }

                const blockSize: u32 = 4;

                fn radiusScale(m: mat4x4f) -> f32 {
                    return max(length(m[0].xyz), max(length(m[1].xyz), length(m[2].xyz)));
                }

                fn outsideFrustum(m: mat4x4f, sphere: vec4f) -> bool {
                    let center = (m * vec4f(sphere.xyz, 1.0)).xyz;
                    let radius = sphere.w * radiusScale(m);
                    for (var i = 0u; i < 6u; i++) {
                        let plane = frameBuffer.frustum[i];
                        if (dot(plane.xyz, center) + plane.w < -radius) { return true; }
                    }
                    return false;
                }

                @compute @workgroup_size(blockSize, blockSize, blockSize)
                fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                    let group = loadLODGroup(passPtr);

                    let dim = u32(ceil(pow(f32(group.instanceCount), 1.0 / 3.0)));
                    let objectIndex = grid.x + grid.y * dim + grid.z * dim * dim;
                    if (objectIndex >= group.instanceCount) { return; }

                    let m = Mat4At(group.sourceMatrices, objectIndex);
                    if (outsideFrustum(m, group.boundingSphere)) { return; }

                    let worldRadius = group.boundingSphere.w * radiusScale(m);
                    let d = max(0.0001, distance(frameBuffer.viewPosition.xyz, m[3].xyz));
                    let screenSize = (worldRadius * frameBuffer.projectionMatrix[1][1]) / d;

                    var lod = group.lodCount;
                    for (var i = 0u; i < group.lodCount; i++) {
                        if (screenSize >= F32At(group.screenSizes, i)) { lod = i; break; }
                    }
                    if (lod >= group.lodCount) { return; }

                    let writeIndex = atomicAddU32(group.counters + lod, 1u);
                    if (writeIndex >= group.capacity) { return; }

                    storeMat4(group.lodMatrices + (lod * group.capacity + writeIndex) * 16u, m);

                    for (var s = 0u; s < group.slotCount; s++) {
                        let slot = group.slots + s * 4u;
                        if (loadU32(slot) == lod) { atomicAddU32(group.drawArgs + s * 4u, loadU32(slot + 1u)); }
                    }
                }
            `
        });
        this.compute.SetBuffer("data", Heap.buffer);
        this.compute.SetBuffer("passPtr", PassData.buffer);
    }

    private buildLodBuffers() {
        this.drawCommands.length = 0;
        const cap = BindlessInstancedLODGroup.DefaultCapacity;

        this.lodMatrices = new VBuffer(this.lods.length * cap * 16, 16);
        this.counters = new VBuffer(this.lods.length);
        this.screenSizes = new VBuffer(this.lods.length);
        this.group = new VBuffer(16, 16);

        const slotCount = this.lods.reduce((n, lod) => n + lod.renderers.length, 0);
        this.drawArgs = new VBuffer(slotCount * 4, 4);   // allocated BEFORE commands reference it

        const slotsMeta: number[] = [];
        this.slotRecordPtrs = [];
        for (let lodIndex = 0; lodIndex < this.lods.length; lodIndex++) {
            const lodTransformsPtr = this.lodMatrices.ptr + lodIndex * cap * 16;
            for (const renderer of this.lods[lodIndex].renderers) {
                const geo = BindlessMesh.uploadGeometry(renderer.geometry);
                const record = new VBuffer(4);
                record.SetArray(new Uint32Array([geo.ptr, lodTransformsPtr, renderer.material.ptr, 0]));

                const s = this.slotRecordPtrs.length;   // this slot's index
                this.slotRecordPtrs.push(record.ptr);
                slotsMeta.push(lodIndex, geo.indexCount, record.ptr, 0);

                this.drawCommands.push({
                    cullMode: (renderer.material.params.cullMode ?? "back") as BindlessDrawCommand["cullMode"],
                    castShadows: this.enableShadows,
                    vertexCount: 0,
                    drawPtr: 0,
                    indirectByteOffset: (this.drawArgs.ptr + s * 4) * 4,
                });
                console.log(renderer.material.params.cullMode)
            }
        }

        this.slots = new VBuffer(slotsMeta.length);
        this.slots.SetArray(new Uint32Array(slotsMeta));

        this.passSlot = PassData.Register(this.group.ptr);
        this.builtLodCount = this.lods.length;
    }

    public OnPreFrame(): void {
        if (!this.compute || this.lods.length === 0 || !this.sourceMatrices) return;
        if (this.builtLodCount !== this.lods.length) this.buildLodBuffers();

        const geo0 = this.lods[0].renderers[0].geometry;
        const slotCount = this.slotRecordPtrs.length;

        this.screenSizes!.SetArray(new Float32Array(this.lods.map(l => l.screenSize)));
        this.counters!.SetArray(new Uint32Array(this.lods.length));

        const args = new Uint32Array(slotCount * 4);
        for (let s = 0; s < slotCount; s++) args.set([0, 1, 0, this.slotRecordPtrs[s]], s * 4);
        this.drawArgs!.SetArray(args);

        this.group!.SetArray(new Uint32Array([
            this.sourceMatrices.ptr, this._instanceCount, this.lods.length, slotCount,
            this.lodMatrices!.ptr, this.drawArgs!.ptr, this.counters!.ptr, this.slots!.ptr,
        ]));
        this.group!.SetArray(new Float32Array([...geo0.boundingVolume.center.elements, geo0.boundingVolume.radius]), 8);
        this.group!.SetArray(new Uint32Array([this.screenSizes!.ptr, BindlessInstancedLODGroup.DefaultCapacity, 0, 0]), 12);

        const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
        this.compute.SetBuffer("frameBuffer", resources.getResource(GPU.PassParams.FrameBuffer));

        PassData.Select(this.passSlot);

        GPU.Renderer.BeginRenderFrame();
        GPU.ComputeContext.BeginComputePass(this.name + "-LODBin", true);
        const dim = Math.max(1, Math.ceil(Math.cbrt(this._instanceCount)));
        const dispatch = Math.ceil(dim / 4);
        GPU.ComputeContext.Dispatch(this.compute, dispatch, dispatch, dispatch);
        GPU.ComputeContext.EndComputePass();
        GPU.Renderer.EndRenderFrame();
    }
}