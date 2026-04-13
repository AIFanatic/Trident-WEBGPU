import { GPU, Geometry, IndexAttribute, Components } from "@trident/core";

interface WireframeDraw {
    wire: Geometry;
    buffer: GPU.Buffer;
    offset: number;
    count: number;
    skinned?: boolean;
    bones?: GPU.Buffer;
}

export class WireframePass extends GPU.RenderPass {
    public name = "WireframePass";
    public enabled = true;
    public color: [number, number, number] = [1, 1, 1];

    private shader: GPU.Shader;
    private skinnedShader: GPU.Shader;
    private wireframeCache = new WeakMap<Geometry, Geometry>();
    private drawList: WireframeDraw[] = [];
    private colorBuffer = new Float32Array(4);
    private skinnedModelMatrices: GPU.DynamicBuffer;

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(2) var<storage, read> wireColor: vec4<f32>;

                struct VertexInput {
                    @builtin(instance_index) instance : u32,
                    @location(0) position : vec3<f32>,
                };

                @vertex
                fn vertexMain(input: VertexInput) -> @builtin(position) vec4f {
                    return frameBuffer.projectionMatrix * frameBuffer.viewMatrix * modelMatrix[input.instance] * vec4f(input.position, 1.0);
                }

                @fragment
                fn fragmentMain() -> @location(0) vec4f {
                    return wireColor;
                }
            `,
            colorOutputs: [{ format: "rgba16float" }],
            depthOutput: "depth24plus",
            depthCompare: "less-equal",
            topology: GPU.Topology.Lines,
            depthWriteEnabled: false,
            cullMode: "none",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
            },
            uniforms: {
                frameBuffer: { group: 0, binding: 0, type: "storage" },
                modelMatrix: { group: 0, binding: 1, type: "storage" },
                wireColor: { group: 0, binding: 2, type: "storage" },
            },
        });

        this.skinnedShader = await GPU.Shader.Create({
            code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(2) var<storage, read> wireColor: vec4<f32>;
                @group(0) @binding(3) var<storage, read> boneMatrices: array<mat4x4<f32>>;

                struct VertexInput {
                    @builtin(instance_index) instance : u32,
                    @location(0) position : vec3<f32>,
                    @location(1) joints : vec4<u32>,
                    @location(2) weights : vec4<f32>,
                };

                @vertex
                fn vertexMain(input: VertexInput) -> @builtin(position) vec4f {
                    let skinMatrix: mat4x4<f32> =
                        boneMatrices[input.joints[0]] * input.weights[0] +
                        boneMatrices[input.joints[1]] * input.weights[1] +
                        boneMatrices[input.joints[2]] * input.weights[2] +
                        boneMatrices[input.joints[3]] * input.weights[3];

                    let skinnedPosition = skinMatrix * vec4f(input.position, 1.0);
                    return frameBuffer.projectionMatrix * frameBuffer.viewMatrix * modelMatrix[input.instance] * skinnedPosition;
                }

                @fragment
                fn fragmentMain() -> @location(0) vec4f {
                    return wireColor;
                }
            `,
            colorOutputs: [{ format: "rgba16float" }],
            depthOutput: "depth24plus",
            depthCompare: "less-equal",
            topology: GPU.Topology.Lines,
            depthWriteEnabled: false,
            cullMode: "none",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                joints: { location: 1, size: 4, type: "vec4u" },
                weights: { location: 2, size: 4, type: "vec4" },
            },
            uniforms: {
                frameBuffer: { group: 0, binding: 0, type: "storage" },
                modelMatrix: { group: 0, binding: 1, type: "storage" },
                wireColor: { group: 0, binding: 2, type: "storage" },
                boneMatrices: { group: 0, binding: 3, type: "storage" },
            },
        });

        this.initialized = true;
    }

    private getWireframe(source: Geometry): Geometry | null {
        let wire = this.wireframeCache.get(source);
        if (wire) return wire;

        if (!source.index) return null;

        const tri = source.index.array;
        const lines = new Uint32Array(tri.length * 2);
        let li = 0;
        for (let i = 0; i < tri.length; i += 3) {
            const a = tri[i], b = tri[i + 1], c = tri[i + 2];
            lines[li++] = a; lines[li++] = b;
            lines[li++] = b; lines[li++] = c;
            lines[li++] = c; lines[li++] = a;
        }

        wire = new Geometry();
        for (const [name, attribute] of source.attributes) {
            wire.attributes.set(name, attribute);
        }
        wire.index = new IndexAttribute(lines);
        this.wireframeCache.set(source, wire);
        return wire;
    }

    public preFrame(resources: GPU.ResourcePool) {
        if (!this.enabled || !this.shader || !this.skinnedShader) return;

        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        if (!FrameBuffer) return;

        this.shader.SetBuffer("frameBuffer", FrameBuffer);
        this.skinnedShader.SetBuffer("frameBuffer", FrameBuffer);

        this.colorBuffer.set(this.color, 0);
        this.colorBuffer[3] = 1;
        this.shader.SetArray("wireColor", this.colorBuffer);
        this.skinnedShader.SetArray("wireColor", this.colorBuffer);

        this.drawList.length = 0;
        let skinnedMatrixIndex = 0;
        let skinnedMatrixCount = 0;

        for (const [, renderable] of Components.Renderable.Renderables) {
            if (!(renderable instanceof Components.SkinnedMesh)) continue;
            if (!renderable.enabled || !renderable.gameObject.enabled) continue;
            if (!renderable.geometry || !renderable.geometry.index) continue;
            if (!renderable.geometry.attributes.has("position")) continue;
            if (!renderable.geometry.attributes.has("joints") || !renderable.geometry.attributes.has("weights")) continue;
            if (!renderable.GetBoneMatricesBuffer()) continue;
            skinnedMatrixCount++;
        }

        const skinnedMatrixBufferSize = skinnedMatrixCount * 256;
        if (skinnedMatrixBufferSize > 0 && (!this.skinnedModelMatrices || this.skinnedModelMatrices.size < skinnedMatrixBufferSize)) {
            if (this.skinnedModelMatrices) this.skinnedModelMatrices.Destroy();
            this.skinnedModelMatrices = new GPU.DynamicBuffer(skinnedMatrixBufferSize, GPU.BufferType.STORAGE, 256);
        }

        for (const [, renderable] of Components.Renderable.Renderables) {
            if (!renderable.enabled || !renderable.gameObject.enabled) continue;
            if (!renderable.geometry || !renderable.geometry.index) continue;
            if (!renderable.geometry.attributes.has("position")) continue;

            const wire = this.getWireframe(renderable.geometry);
            if (!wire) continue;

            if (renderable instanceof Components.InstancedMesh) {
                if (renderable.instanceCount === 0) continue;
                this.drawList.push({
                    wire,
                    buffer: renderable.matricesBuffer,
                    offset: 0,
                    count: renderable.instanceCount,
                });
            } else if (renderable instanceof Components.SkinnedMesh) {
                if (!renderable.geometry.attributes.has("joints") || !renderable.geometry.attributes.has("weights")) continue;

                const bones = renderable.GetBoneMatricesBuffer();
                if (!bones) continue;

                this.skinnedModelMatrices.SetArray(renderable.transform.localToWorldMatrix.elements, skinnedMatrixIndex * 256);
                this.drawList.push({
                    wire,
                    buffer: this.skinnedModelMatrices,
                    offset: skinnedMatrixIndex * 256,
                    count: 1,
                    skinned: true,
                    bones,
                });
                skinnedMatrixIndex++;
            } else if (renderable instanceof Components.Mesh) {
                const buf = Components.Mesh.modelMatrices.getBuffer();
                this.drawList.push({
                    wire,
                    buffer: buf,
                    offset: (renderable as any).modelMatrixOffset * Components.Mesh.modelMatrices.getStride(),
                    count: 1,
                });
            }
        }
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.enabled || !this.shader || this.drawList.length === 0) return;

        const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        const GBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        if (!LightingPassOutput || !GBufferDepth) return;

        GPU.RendererContext.BeginRenderPass(this.name,
            [{ target: LightingPassOutput, clear: false }],
            { target: GBufferDepth, clear: false },
            true
        );

        for (const draw of this.drawList) {
            const shader = draw.skinned ? this.skinnedShader : this.shader;
            shader.SetBuffer("modelMatrix", draw.buffer);
            if (draw.bones) shader.SetBuffer("boneMatrices", draw.bones);
            if (draw.buffer instanceof GPU.DynamicBuffer) draw.buffer.dynamicOffset = draw.offset;
            GPU.RendererContext.DrawGeometry(draw.wire, shader, draw.count);
        }

        GPU.RendererContext.EndRenderPass();
    }
}
