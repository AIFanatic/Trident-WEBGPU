import { Components, Geometry, GPU, Mathf, PBRMaterial, SerializeField } from "@trident/core";

class FoliageMaterialParams extends GPU.MaterialParams {
    @SerializeField(Geometry) public foliageGeometry: Geometry;
    @SerializeField(GPU.Texture) public foliageAlbedo: GPU.Texture;
    @SerializeField(GPU.Texture) public foliageNormal: GPU.Texture;
    @SerializeField(GPU.Texture) public foliageArm: GPU.Texture;
}

export class FoliageMaterial extends GPU.Material<FoliageMaterialParams> {
    public static type = "@trident/plugins/FoliageMaterial";

    /** Handle for the sun-uniform poller so reloads don't stack intervals. */
    private sunUpdateHandle: ReturnType<typeof setInterval> | null = null;

    // Just conveniences
    public SetFromMesh(mesh: Components.Mesh) {
        const geometry = mesh.geometry;
        const material = mesh.material as PBRMaterial;
        if (geometry && material && material instanceof PBRMaterial) {
            this.params.foliageGeometry = geometry;
            this.params.foliageAlbedo = material.params.albedoMap;
            this.params.foliageNormal = material.params.normalMap;
            this.params.foliageArm = material.params.armMap;
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
        const { foliageGeometry, foliageAlbedo, foliageNormal, foliageArm } = this.params;
        if (!foliageGeometry) {
            throw new Error("FoliageMaterial has missing parameters.");
        }

        const wgsl = `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
            @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

            @group(0) @binding(2) var textureSampler: sampler;
            @group(0) @binding(3) var albedoMap: texture_2d<f32>;
            @group(0) @binding(4) var normalMap: texture_2d<f32>;
            @group(0) @binding(5) var armMap: texture_2d<f32>;

            @group(0) @binding(6) var<storage, read> leafCenters: array<f32>;

            struct Sun {
                direction: vec4<f32>,
                color: vec4<f32>,
            };
            @group(0) @binding(7) var<storage, read> sun: Sun;

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
                @location(1) tangent : vec3<f32>,    // world-space billboard basis
                @location(2) bitangent : vec3<f32>,
                @location(3) vNormal : vec3<f32>,
                @location(4) vPositionWS : vec3<f32>,
                // Pre-billboard leaf card normal, world space. This is the only
                // normal in the shader that does NOT rotate with the camera,
                // so all lighting variation has to come from it.
                @location(5) vLeafNormalWS : vec3<f32>,
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

                let rightWS = normalize(frameBuffer.viewInverseMatrix[0].xyz);
                let upWS    = normalize(frameBuffer.viewInverseMatrix[1].xyz);
                // Camera forward (pointing from the quad toward the camera) -
                // this is the geometric normal of the billboarded quad.
                let normalWS = normalize(frameBuffer.viewInverseMatrix[2].xyz);

                let scale = length(model[0].xyz);
                let billboardPositionWS = centerWS + (rightWS * localOffsetOS.x + upWS * localOffsetOS.y) * scale;

                output.position = frameBuffer.viewProjectionMatrix * vec4<f32>(billboardPositionWS, 1.0);
                output.vUv = input.uv;

                // TBN of the billboard, already in world space
                output.tangent   = rightWS;
                output.bitangent = upWS;
                output.vNormal   = normalWS;
                output.vPositionWS = billboardPositionWS;

                // Stable, camera-independent leaf orientation (normal matrix
                // assumed orthogonal - swap for the inverse-transpose if you
                // ever use non-uniform scale on foliage instances).
                output.vLeafNormalWS = normalize((model * vec4<f32>(input.normal, 0.0)).xyz);

                return output;
            }

            struct FragmentOutput {
                @location(0) albedo : vec4f,
                @location(1) normal : vec4f,
                @location(2) RMO : vec4f,
            };

            @fragment
            fn fragmentMain(@builtin(front_facing) is_front: bool, input: VertexOutput) -> FragmentOutput {
                var output: FragmentOutput;

                let albedo = textureSample(albedoMap, textureSampler, input.vUv);
                if (albedo.a < 0.5) {
                    discard;
                }

                // Same as the mesh path: unpack tangent-space normal, rotate into world space via TBN
                var tbn: mat3x3<f32>;
                tbn[0] = input.tangent;
                tbn[1] = input.bitangent;
                tbn[2] = input.vNormal;

                let normalSample = textureSample(normalMap, textureSampler, input.vUv).xyz * 2.0 - 1.0;
                let mappedNormal = normalize(tbn * normalSample);

                // ARM: r = occlusion, g = roughness, b = metalness (matching the mesh shader)
                let arm = textureSample(armMap, textureSampler, input.vUv);
                let occlusion = arm.r;
                let roughness = arm.g;
                let metalness = arm.b;

                let V = normalize(frameBuffer.viewPosition.xyz - input.vPositionWS);
                let L = normalize(sun.direction.xyz);

                // Raw card normal - keep the sign for the SSS bend so leaves
                // turned away from the sun respond differently to ones facing it.
                let leafN = normalize(input.vLeafNormalWS);

                // ---- G-buffer normal -------------------------------------------------
                // The mapped normal is built from the camera basis, so on its own it
                // swims. Blend it toward the stable card normal. Orient the card normal
                // toward the viewer first, otherwise a leaf facing away drags the
                // shading normal backwards and the leaf goes black in the deferred pass.
                const SSS_NORMAL_BLEND = 0.35;   // 0 = fully stable, 1 = fully mapped
                let leafNView = select(-leafN, leafN, dot(leafN, V) > 0.0);
                let gbufferNormal = normalize(mix(leafNView, mappedNormal, SSS_NORMAL_BLEND));

                output.albedo = vec4f(albedo.rgb, roughness);
                output.normal = vec4f(OctEncode(gbufferNormal), occlusion, metalness);
                output.RMO = vec4f(0.0);

                // // ---- subsurface / translucency ---------------------------------------
                // const SSS_DISTORTION = 0.15;  // how much the normal bends L. 0.1 - 0.3
                // const SSS_POWER      = 3.0;   // falloff sharpness. lower = broader glow
                // const SSS_SCALE      = 1.5;   // overall strength
                // const SSS_THICKNESS  = 0.2;   // 0 = opaque, 1 = fully translucent
                // const SSS_AMBIENT    = 0.02;  // floor so unlit leaves don't read black
                // const SSS_TINT       = vec3<f32>(1.0, 1.25, 0.55); // transmitted light is yellower than albedo

                // // Distance fade - billboard normals stop meaning much on far LODs.
                // // These are world units, retune for your scene scale.
                // const SSS_FADE_START = 40.0;
                // const SSS_FADE_END   = 90.0;

                // // Buried leaves have more occlusion baked in, so treat them as thicker.
                // let thickness = SSS_THICKNESS * mix(0.3, 1.0, occlusion);

                // let H = normalize(L + leafN * SSS_DISTORTION);
                // let directional = pow(saturate(dot(V, -H)), SSS_POWER) * SSS_SCALE;

                // // Wrap the ambient floor around the leaf so it isn't a flat lift.
                // let ambientTerm = SSS_AMBIENT * saturate(dot(leafN, L) * 0.5 + 0.5);

                // let dist = length(frameBuffer.viewPosition.xyz - input.vPositionWS);
                // let distFade = 1.0 - smoothstep(SSS_FADE_START, SSS_FADE_END, dist);

                // let transmission = (directional + ambientTerm) * thickness * distFade;

                // let sss = transmission * sun.color.rgb * sun.color.a * albedo.rgb * SSS_TINT;

                // output.RMO = vec4f(sss, 0.0);   // .a must stay 0.0 - that's the unlit flag

                return output;
            }
        `;
        const wgslShadow = `
            @group(0) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            
            @group(0) @binding(1) var<storage, read> leafCenters: array<f32>;
            
            @group(0) @binding(2) var textureSampler: sampler;
            @group(0) @binding(3) var albedoMap: texture_2d<f32>;

            @group(1) @binding(0) var<storage, read> lightProjection: array<mat4x4<f32>, 4>;
            @group(1) @binding(1) var<storage, read> cascadeIndex: u32;

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

                let lightVP = lightProjection[cascadeIndex];
                let rightWS = normalize(vec3<f32>(lightVP[0][0], lightVP[1][0], lightVP[2][0]));
                let upWS    = normalize(vec3<f32>(lightVP[0][1], lightVP[1][1], lightVP[2][1]));

                let scale = length(model[0].xyz);
                let billboardPositionWS = centerWS + (rightWS * localOffsetOS.x + upWS * localOffsetOS.y) * scale;

                output.position = lightVP * vec4<f32>(billboardPositionWS, 1.0);
                output.vUv = input.uv;

                return output;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) {
                let albedo = textureSample(albedoMap, textureSampler, input.vUv);
                if (albedo.a < 0.5) {
                    discard;
                }
            }
        `;
        const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;

        const shader = await GPU.Shader.Create({
            name: "FoliageMaterial",
            code: wgsl,
            colorOutputs: Array(3).fill({ format: gbufferFormat }),
            depthOutput: "depth24plus",
            cullMode: "front",
        });
        const shadowShader = await GPU.Shader.Create({
            name: "FoliageMaterial-Shadow",
            code: wgslShadow,
            colorOutputs: [],
            depthOutput: "depth24plus",
            cullMode: this.params.cullMode === "none" ? "none" : "front",
            depthBias: 1,
            depthBiasSlopeScale: 1,
        });
        shadowShader.SetSampler("textureSampler", PBRMaterial.sampler);
        shader.SetSampler("textureSampler", PBRMaterial.sampler);

        this.SetShader("ShadowCaster", shadowShader);

        const vertices = this.params.foliageGeometry.attributes.get("position");
        const indices = this.params.foliageGeometry.index;
        if (!vertices || !indices) {
            throw new Error("Foliage geometry needs both vertices and indices");
        }

        const leafCenters = this.computeBillboardCenters(vertices.array as Float32Array, indices.array);
        shader.SetArray("leafCenters", leafCenters);
        shadowShader.SetArray("leafCenters", leafCenters);

        this.ReloadMaterial();

        return shader;
    }

    /** Pushes the current directional light into every shader that wants it. */
    private UpdateSunUniform(): void {
        const mainCamera = Components.Camera.mainCamera;
        if (!mainCamera) return;

        const sun = mainCamera.gameObject.scene
            .GetComponents(Components.DirectionalLight)
            .find(l => l.enabled && l.gameObject.enabled);
        if (!sun) return;

        const inv = sun.camera.viewMatrix.clone().invert();
        // +Z of the light's view basis == direction from the surface toward the sun.
        // If your backlight fires on the wrong side of the tree, negate this.
        const d = new Mathf.Vector4(0, 0, 1, 0).applyMatrix4(inv).normalize();

        const payload = new Float32Array([
            d.x, d.y, d.z, 0,
            sun.color.r, sun.color.g, sun.color.b, sun.intensity,
        ]);

        for (const shader of this.allShaders()) {
            if (shader.HasProperty("sun")) shader.SetArray("sun", payload);
        }
    }

    public ReloadMaterial(): void {
        for (const shader of this.allShaders()) {
            if (shader.HasProperty("albedoMap")) shader.SetTexture("albedoMap", this.params.foliageAlbedo || GPU.Texture.WhiteTexture);
            if (shader.HasProperty("normalMap")) shader.SetTexture("normalMap", this.params.foliageNormal || GPU.Texture.NormalTexture);
            if (shader.HasProperty("armMap")) shader.SetTexture("armMap", this.params.foliageArm || GPU.Texture.ARMTexture);
        }

        // One poller per material, not one per shader per reload.
        // Better still: call UpdateSunUniform() from your per-frame update and
        // drop the interval entirely, otherwise an animated sun steps at 1 Hz.
        if (this.sunUpdateHandle !== null) clearInterval(this.sunUpdateHandle);
        this.UpdateSunUniform();
        this.sunUpdateHandle = setInterval(() => this.UpdateSunUniform(), 1000);
    }

    public Destroy(): void {
        if (this.sunUpdateHandle !== null) {
            clearInterval(this.sunUpdateHandle);
            this.sunUpdateHandle = null;
        }
        super.Destroy?.();
    }
}

GPU.Material.Registry.set(FoliageMaterial.type, FoliageMaterial);