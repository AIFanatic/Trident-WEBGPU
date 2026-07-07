import { Components, Geometry, GPU, PBRMaterial, SerializeField } from "@trident/core";

class FoliageMaterialParams extends GPU.MaterialParams {
    @SerializeField(Geometry) public foliageGeometry: Geometry;
    @SerializeField(GPU.Texture) public foliageAlbedo: GPU.Texture;
    @SerializeField(GPU.Texture) public foliageNormal: GPU.Texture;
}

export class FoliageMaterial extends GPU.Material<FoliageMaterialParams> {
    public static type = "@trident/plugins/FoliageMaterial";

    // Just conveniences
    public SetFromMesh(mesh: Components.Mesh) {
        const geometry = mesh.geometry;
        const material = mesh.material as PBRMaterial;
        if (geometry && material && material instanceof PBRMaterial) {
            this.params.foliageGeometry = geometry;
            this.params.foliageAlbedo = material.params.albedoMap;
            this.params.foliageNormal = material.params.normalMap;
            this.BuildShader().then(shader => {
                this.shader = shader;
            })
        }
    }
    // Just conveniences
    public static SetFromMesh(mesh: Components.Mesh): FoliageMaterial {
        const foliageMaterial = new FoliageMaterial();
        foliageMaterial.SetFromMesh(mesh);
        return foliageMaterial;
    }

    constructor(params?: Partial<FoliageMaterialParams>) {
        super(new FoliageMaterialParams(), { isDeferred: true, ...params });
    }

    /**
     * For each billboard quad (6 indices = 2 triangles), computes the quad
     * center and writes it to every vertex of that quad. Used in the vertex
     * shader to pivot each leaf plane toward the camera.
     */
    private computeBillboardCenters(vertices: Float32Array | number[], indices: Uint16Array | Uint32Array | number[], { vertexStride = 3, positionOffset = 0, indexStart = 0, indexCount = indices.length } = {}): Float32Array {
        if (indexCount % 6 !== 0) {
            console.warn("Index count is not divisible by 6. Expected billboard quads (2 triangles / 6 indices).");
        }

        const centers = new Float32Array((vertices.length / vertexStride) * 3);

        for (let i = indexStart; i < indexStart + indexCount; i += 6) {
            const quad = [...new Set(indices.slice(i, i + 6) as number[])];

            if (quad.length !== 4) {
                console.warn("Skipping non-quad index group:", quad);
                continue;
            }

            let cx = 0, cy = 0, cz = 0;
            for (const v of quad) {
                const base = v * vertexStride + positionOffset;
                cx += vertices[base];
                cy += vertices[base + 1];
                cz += vertices[base + 2];
            }
            cx /= quad.length;
            cy /= quad.length;
            cz /= quad.length;

            for (const v of quad) {
                const out = v * 3;
                centers[out] = cx;
                centers[out + 1] = cy;
                centers[out + 2] = cz;
            }
        }

        return centers;
    }

    protected async BuildShader(): Promise<GPU.Shader> {
        if (!this.params.foliageGeometry || !this.params.foliageAlbedo || !this.params.foliageNormal) return;

        const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;

        const shader = await GPU.Shader.Create({
            name: "FoliageMaterial",
            code: `
                    #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                    @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                    @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

                    @group(0) @binding(2) var textureSampler: sampler;
                    @group(0) @binding(3) var albedoMap: texture_2d<f32>;
                    @group(0) @binding(4) var normalMap: texture_2d<f32>;

                    @group(0) @binding(5) var<storage, read> leafCenters: array<f32>;

                    struct VertexInput {
                        @builtin(instance_index) instanceIdx: u32,
                        @builtin(vertex_index) vertexIdx: u32,
                        @location(0) position : vec3<f32>,
                        @location(1) normal : vec3<f32>,
                        @location(2) uv : vec2<f32>,
                    };

                    struct VertexOutput {
                        @builtin(position) position : vec4<f32>,
                        @location(0) vUv : vec2<f32>,
                    };

                    @vertex
                    fn vertexMain(input: VertexInput) -> VertexOutput {
                        var output : VertexOutput;

                        let centerBase = input.vertexIdx * 3u;
                        let leafCenterOS = vec3<f32>(
                            leafCenters[centerBase + 0u],
                            leafCenters[centerBase + 1u],
                            leafCenters[centerBase + 2u]
                        );

                        let localOffsetOS = input.position - leafCenterOS;

                        let model = modelMatrix[input.instanceIdx];
                        let centerWS = (model * vec4<f32>(leafCenterOS, 1.0)).xyz;

                        let forwardWS = normalize(frameBuffer.viewPosition.xyz - centerWS);
                        let rightWS = normalize(frameBuffer.viewInverseMatrix[0].xyz);
                        let upWS    = normalize(frameBuffer.viewInverseMatrix[1].xyz);

                        let billboardPositionWS = centerWS + rightWS * localOffsetOS.x + upWS * localOffsetOS.y;

                        output.position = frameBuffer.viewProjectionMatrix * vec4<f32>(billboardPositionWS, 1.0);
                        output.vUv = input.uv;
                        return output;
                    }

                    struct FragmentOutput {
                        @location(0) albedo : vec4f,
                        @location(1) normal : vec4f,
                        @location(2) RMO : vec4f,
                    };

                    @fragment
                    fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                        var output: FragmentOutput;

                        let albedo = textureSample(albedoMap, textureSampler, input.vUv);
                        if (albedo.a < 0.5) {
                            discard;
                        }

                        // TODO: Should the normal just pass through?
                        let normalSample = textureSample(normalMap, textureSampler, input.vUv);

                        output.albedo = vec4f(albedo.rgb, 1.0);
                        output.normal = normalSample;
                        output.RMO = vec4f(0.0);

                        return output;
                    }
                `,
            colorOutputs: Array(3).fill({ format: gbufferFormat }),
            depthOutput: "depth24plus",
            cullMode: "none"
        });

        shader.SetTexture("albedoMap", this.params.foliageAlbedo);
        shader.SetTexture("normalMap", this.params.foliageNormal);
        shader.SetSampler("textureSampler", new GPU.TextureSampler());

        const vertices = this.params.foliageGeometry.attributes.get("position");
        const indices = this.params.foliageGeometry.index;
        if (!vertices || !indices) {
            throw new Error("Foliage geometry needs both vertices and indices");
        }

        const leafCenters = this.computeBillboardCenters(vertices.array as Float32Array, indices.array);
        shader.SetArray("leafCenters", leafCenters);

        return shader;          // ← was: this._shader = shader; return shader;
    }

    public ReloadMaterial(): void {
        const s = this._shader;
        if (!s) return;
        s.SetTexture("albedoMap", this.params.foliageAlbedo);
        s.SetTexture("normalMap", this.params.foliageNormal);
    }
}

GPU.Material.Registry.set(FoliageMaterial.type, FoliageMaterial);