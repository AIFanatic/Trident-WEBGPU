import { Components, Geometry, GPU } from "@trident/core";
import { Heap, Ptr } from "../Heap";
import { BindlessMesh } from "../components/BindlessMesh";
import { BINDLESS_WGSL } from "./BindlessPassCommon";
import { BindlessCamera } from "../components/BindlessCamera";
import { PassData } from "./PassData";
import { BINDLESS_VT_WGSL, BindlessVT } from "../BindlessVT";

export interface BindlessDrawCommand {
    cullMode: "back" | "none" | "front";
    castShadows: boolean;
    vertexCount: number;
    drawPtr: Ptr;
    indirectByteOffset?: number;   // set => indirect draw from the heap
}

export class BindlessDrawPass extends GPU.RenderPass {
    public name = "BindlessDrawPass";

    private shaders = new Map<string, GPU.Shader>();
    private passSlot!: number;
    private dummyGeometry = new Geometry();

    public async init(resources: GPU.ResourcePool) {
        const code = `#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";\n`
            + BINDLESS_WGSL + BINDLESS_VT_WGSL + `

            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) normal: vec3f,
                @location(1) @interpolate(flat) material: u32,
                @location(2) uv: vec2f,
                @location(3) worldPos: vec3f
            };

            @vertex
            fn vertexMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) drawPtr: u32) -> VertexOutput {
                let draw = loadDraw(drawPtr);
                let geo  = loadGeometry(draw.geometry);
                let cam  = currentCamera();

                let localInstance = vi / geo.indexCount;
                let localVertex   = vi % geo.indexCount;

                let vertexId = U32At(geo.indices, localVertex);
                let position = Vec3At(geo.positions, vertexId);
                let normal   = Vec3At(geo.normals, vertexId);
                let uv       = Vec2At(geo.uvs, vertexId);
                let model    = Mat4At(draw.transforms, localInstance);

                let world = model * vec4f(position, 1.0);
                var output: VertexOutput;
                output.position = cam.projection * cam.view * model * vec4f(position, 1.0);
                output.normal   = normalize(model * vec4f(normal, 0.0)).xyz;
                output.uv = uv;
                output.worldPos = world.xyz;
                output.material = draw.material;
                return output;
            }

            struct FragmentOutput {
                @location(0) albedo: vec4f,
                @location(1) normal: vec4f,
                @location(2) ermo:   vec4f,
            };

            // Tangent frame from derivatives — no tangent attribute needed (Schüler's cotangent frame).
            fn cotangentFrame(N: vec3f, p: vec3f, uv: vec2f) -> mat3x3f {
                let dp1 = dpdx(p);   let dp2 = dpdy(p);
                let duv1 = dpdx(uv); let duv2 = dpdy(uv);
                let dp2perp = cross(dp2, N);
                let dp1perp = cross(N, dp1);
                let T = dp2perp * duv1.x + dp1perp * duv2.x;
                let B = dp2perp * duv1.y + dp1perp * duv2.y;
                let invmax = inverseSqrt(max(dot(T, T), dot(B, B)));
                return mat3x3f(T * invmax, B * invmax, N);
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                // Derivatives must be computed in uniform control flow —
                // before any discard or data-dependent branch.
                let geoNormal = normalize(input.normal);
                let tbn = cotangentFrame(geoNormal, input.worldPos, input.uv);

                let mat = loadMaterial(input.material);

                var albedo = mat.albedo;
                if (mat.albedoRegion.z > 0.0) { albedo *= SampleRegion(mat.albedoRegion, input.uv); }
                if (mat.alphaCutoff > 0.0 && albedo.a < mat.alphaCutoff) { discard; }

                var normal = geoNormal;
                if (mat.normalRegion.z > 0.0) {
                    let sampled = SampleRegion(mat.normalRegion, input.uv).xyz * 2.0 - 1.0;
                    normal = normalize(tbn * sampled);
                }

                var roughness = mat.roughness;
                var metalness = mat.metalness;
                var occlusion = 1.0;
                if (mat.armRegion.z > 0.0) {
                    let arm = SampleRegion(mat.armRegion, input.uv);
                    occlusion = arm.r; roughness *= arm.g; metalness *= arm.b;
                }

                var output: FragmentOutput;
                output.albedo = vec4f(albedo.rgb, roughness);
                output.normal = vec4f(OctEncode(normal), occlusion, metalness);
                output.ermo   = vec4f(mat.emissive.rgb, mat.unlit);
                return output;
            }
        `;
        for (const mode of ["back", "none", "front"] as const) {
            const shader = await GPU.Shader.Create({ code, colorOutputs: Array(3).fill({ format: GPU.RenderingPipeline.GBufferFormat }), depthOutput: "depth24plus", cullMode: mode });
            shader.SetBuffer("data", Heap.buffer);
            shader.SetBuffer("passPtr", PassData.buffer);
            BindlessVT.Bind(shader);
            this.shaders.set(mode, shader);
        }

        this.passSlot = PassData.Register(BindlessCamera.record.ptr);

        this.initialized = true;
    }

    public preFrame(resources: GPU.ResourcePool): void {
        if (!this.initialized) return;
        BindlessVT.Update();
        BindlessCamera.Update(Components.Camera.mainCamera)

        for (const mesh of BindlessMesh.Instances) {
            if (mesh.enabled && mesh.gameObject.enabled) mesh.OnPreFrame();
        }
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        PassData.Select(this.passSlot);
        GPU.RendererContext.BeginRenderPass(this.name, [
            { target: resources.getResource(GPU.PassParams.GBufferAlbedo), clear: false },
            { target: resources.getResource(GPU.PassParams.GBufferNormal), clear: false },
            { target: resources.getResource(GPU.PassParams.GBufferERMO), clear: false },
        ], { target: resources.getResource(GPU.PassParams.GBufferDepth), clear: false }, true);

        for (const mesh of BindlessMesh.Instances) {
            if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.ready) continue;
            for (const cmd of mesh.drawCommands) {
                const shader = this.shaders.get(cmd.cullMode)!;
                if (cmd.indirectByteOffset !== undefined) GPU.RendererContext.DrawIndirect(this.dummyGeometry, shader, Heap.buffer, cmd.indirectByteOffset);
                else GPU.RendererContext.DrawVertex(shader, cmd.vertexCount, 1, 0, cmd.drawPtr);
            }
        }

        GPU.RendererContext.EndRenderPass();
    }
}