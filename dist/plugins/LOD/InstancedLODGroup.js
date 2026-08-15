import { Components, GPU, Runtime } from '@trident/core';

const DRAW_ARGS_U32 = 5;
const DRAW_ARGS_BYTES = DRAW_ARGS_U32 * 4;
class InstancedLODGroup extends Components.Renderable {
  initialized = false;
  drawCompute;
  // One 20-byte indirect slot per (lod, renderer). Compute atomically bumps instanceCount in place.
  drawArgsBuffer;
  drawArgs;
  // CPU template, re-uploaded each frame to reset the counters
  drawSlots = [];
  // Block reserved inside Components.Mesh.modelMatrices, lods.length slices of MATRICES_PER_LOD.
  matrixBlockKey = {};
  matrixBlockBase = 0;
  // in matrices, not floats
  // 0 = only LOD0 casts shadows
  // 1 = LOD0 and LOD1 cast shadows
  maxShadowLodIndex = 1;
  // Per-LOD table: screenSize + where that LOD's draw slots live. Uploaded as one Float32Array.
  lodTable;
  static DefaultCapacity = 65536;
  static MATRICES_PER_LOD = InstancedLODGroup.DefaultCapacity;
  lods = [];
  matrices = new GPU.DynamicBufferMemoryAllocator(
    InstancedLODGroup.DefaultCapacity * 16,
    InstancedLODGroup.DefaultCapacity * 16
  );
  _instanceCount = 0;
  builtLodCount = 0;
  get instanceCount() {
    return this._instanceCount;
  }
  get matricesBuffer() {
    return this.matrices.getBuffer();
  }
  ResetInstances() {
    this._instanceCount = 0;
  }
  SetMatrixAt(index, matrix) {
    this.matrices.set(index, matrix.elements);
    this._instanceCount = Math.max(this._instanceCount, index + 1);
  }
  SetMatricesBulk(matrices) {
    this.matrices.set(0, matrices);
    this._instanceCount = matrices.length / 16;
  }
  ReserveInstances(count) {
    if (this.matrices.has(0)) this.matrices.delete(0);
    this.matrices.set(0, new Float32Array(count * 16));
    this._instanceCount = count;
  }
  // Expose a representative geometry so RenderablePass picks it up.
  get geometry() {
    return this.lods[0]?.renderers?.[0]?.geometry;
  }
  async Start() {
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

                if (lod >= lc) { return; }   // culled \u2014 don't enqueue

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
  buildLodBuffers() {
    this.drawArgsBuffer?.Destroy();
    if (!Components.Mesh.modelMatrices) {
      Components.Mesh.modelMatrices = new GPU.DynamicBufferMemoryAllocator(16 * 1e3, 16 * 1e3);
    }
    const pool = Components.Mesh.modelMatrices;
    if (pool.has(this.matrixBlockKey)) pool.delete(this.matrixBlockKey);
    const capacity = InstancedLODGroup.MATRICES_PER_LOD;
    const matrixCount = this.lods.length * InstancedLODGroup.MATRICES_PER_LOD * 16;
    this.matrixBlockBase = pool.reserve(this.matrixBlockKey, matrixCount) / 16;
    this.drawSlots = [];
    this.lodTable = new Float32Array(this.lods.length * 4);
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
  OnPreFrame() {
    if (!this.initialized) return;
    if (this.lods.length === 0) return;
    if (this.builtLodCount !== this.lods.length) this.buildLodBuffers();
    for (let i = 0; i < this.lods.length; i++) this.lodTable[i * 4] = this.lods[i].screenSize;
    const bounds = this.lods[0].renderers[0].geometry.boundingVolume;
    this.drawArgsBuffer.SetArray(this.drawArgs);
    const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
    const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    this.drawCompute.SetBuffer("frameBuffer", FrameBuffer);
    this.drawCompute.SetBuffer("drawBuffer", this.drawArgsBuffer);
    this.drawCompute.SetBuffer("modelMatrix", this.matricesBuffer);
    this.drawCompute.SetBuffer("lodMatrices", Components.Mesh.modelMatrices.getBuffer());
    this.drawCompute.SetArray("boundingSphere", new Float32Array([...bounds.center.elements, bounds.radius]));
    this.drawCompute.SetArray("lods", this.lodTable);
    this.drawCompute.SetValue("meshCount", this.instanceCount);
    this.drawCompute.SetValue("lodCount", this.lods.length);
    this.drawCompute.SetValue("matrixBase", this.matrixBlockBase);
  }
  OnPreRender() {
    if (!this.initialized || !this.drawArgsBuffer) return;
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
  OnRenderObject() {
    if (!this.initialized || !this.drawArgsBuffer) return;
    const isShadowPass = GPU.RendererContext.activePass?.name === "ShadowCaster";
    for (const slot of this.drawSlots) {
      if (isShadowPass && slot.lodIndex > this.maxShadowLodIndex) continue;
      const shader = slot.renderer.material?.shader;
      if (!shader) continue;
      GPU.RendererContext.DrawIndirect(slot.renderer.geometry, shader, this.drawArgsBuffer, slot.byteOffset);
    }
  }
  Destroy() {
    this.drawArgsBuffer?.Destroy();
    Components.Mesh.modelMatrices?.delete(this.matrixBlockKey);
    this.matrices.Destroy();
    this.drawSlots = [];
    super.Destroy();
  }
}

export { InstancedLODGroup };
