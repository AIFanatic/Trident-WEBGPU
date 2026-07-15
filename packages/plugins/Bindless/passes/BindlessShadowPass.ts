import { Geometry, GPU } from "@trident/core";
import { Heap, VBuffer } from "../Heap";
import { BINDLESS_WGSL } from "./BindlessPassCommon";
import { BindlessMesh } from "../components/BindlessMesh";
import { PassData } from "./PassData";
import { BINDLESS_VT_WGSL, BindlessVT } from "../BindlessVT";

type ShadowInfo = {
    numCascades: number;
    projectionMatrices: Float32Array;
    cascadeViewports: { x: number; y: number; width: number; height: number }[];
    shadowMapIndex: number;
};

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

export class BindlessShadowPass extends GPU.RenderPass {
    public name = "BindlessShadowPass";

    private shader: GPU.Shader;
    private lightCameras = new Map<string, VBuffer[]>();   // light.id -> per-cascade camera records
    private passSlots = new Map<string, number>();

    private dummyGeometry = new Geometry();

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
            code: BINDLESS_WGSL + BINDLESS_VT_WGSL + `
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) uv: vec2f,
                    @location(1) @interpolate(flat) material: u32,
                };

                @vertex
                fn vertexMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) drawPtr: u32) -> VertexOutput {
                    let draw = loadDraw(drawPtr);
                    let geo  = loadGeometry(draw.geometry);
                    let cam  = currentCamera();

                    let localInstance = vi / geo.indexCount;
                    let vertexId = U32At(geo.indices, vi % geo.indexCount);
                    let position = Vec3At(geo.positions, vertexId);
                    let model    = Mat4At(draw.transforms, localInstance);

                    var output: VertexOutput;
                    output.position = cam.projection * cam.view * model * vec4f(position, 1.0);
                    output.uv = Vec2At(geo.uvs, vertexId);
                    output.material = draw.material;
                    return output;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let mat = loadMaterial(input.material);
                    if (mat.alphaCutoff > 0.0 && mat.albedoRegion.z > 0.0) {
                        if (SampleRegion(mat.albedoRegion, input.uv).a < mat.alphaCutoff) { discard; }
                    }
                    return vec4(1.0);
                }
            `,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: "none",
            depthBias: 1,
            depthBiasSlopeScale: 1,
        });
        this.shader.SetBuffer("data", Heap.buffer);
        this.shader.SetBuffer("passPtr", PassData.buffer);
        BindlessVT.Bind(this.shader);
        this.initialized = true;
    }

    public preFrame(resources: GPU.ResourcePool): void {
        if (!this.initialized) return;
        const shadowData = resources.getResource(GPU.PassParams.ShadowPassCascadeData) as Map<string, ShadowInfo> | undefined;
        if (!shadowData) return;

        for (const [lightId, info] of shadowData) {
            // Shadow views are just camera records: projection = viewProj, view = identity.
            let cams = this.lightCameras.get(lightId);
            if (!cams) {
                cams = [];
                for (let c = 0; c < 4; c++) {
                    const cam = new VBuffer(32);
                    cam.SetArray(IDENTITY, 16);
                    cams.push(cam);
                }
                this.lightCameras.set(lightId, cams);
            }
            for (let c = 0; c < info.numCascades; c++) {
                cams[c].SetArray(info.projectionMatrices.subarray(c * 16, (c + 1) * 16) as Float32Array, 0);
                const key = `${lightId}/${c}`;
                if (!this.passSlots.has(key)) this.passSlots.set(key, PassData.Register(cams[c].ptr));
            }
        }
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        const shadowData = resources.getResource(GPU.PassParams.ShadowPassCascadeData) as Map<string, ShadowInfo> | undefined;
        const atlas = resources.getResource(GPU.PassParams.ShadowPassDepth) as any;
        if (!shadowData || shadowData.size === 0 || !atlas) return;

        for (const [lightId, info] of shadowData) {
            atlas.SetActiveLayer(info.shadowMapIndex);

            for (let c = 0; c < info.numCascades; c++) {
                PassData.Select(this.passSlots.get(`${lightId}/${c}`)!);
                GPU.RendererContext.BeginRenderPass(this.name, [], { target: atlas, clear: false }, true);

                const vp = info.cascadeViewports[c];
                if (vp) GPU.RendererContext.SetViewport(vp.x, vp.y, vp.width, vp.height, 0, 1);

                for (const mesh of BindlessMesh.Instances) {
                    if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.ready) continue;
                    for (const cmd of mesh.drawCommands) {
                        if (!cmd.castShadows) continue;
                        if (cmd.indirectByteOffset !== undefined) GPU.RendererContext.DrawIndirect(this.dummyGeometry, this.shader, Heap.buffer, cmd.indirectByteOffset);
                        else GPU.RendererContext.DrawVertex(this.shader, cmd.vertexCount, 1, 0, cmd.drawPtr);
                    }
                }

                GPU.RendererContext.EndRenderPass();
            }
        }
        atlas.SetActiveLayer(0);
    }
}