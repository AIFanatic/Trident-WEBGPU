import { Components, GPU, Mathf, GameObject, Geometry, Runtime } from "@trident/core";
import { MeshBaker } from "./MeshBaker";

// TODO: Clean this, kinda here because MeshBaker uses the normal material, so other stuff can be used
// like foliage materials etc, the downside is the normal gets messed up because its OctEncoded
// This prevents seams by converting the normals from oct-encoded to raw xyz.
export class NormalToXYZ {
    public static async Convert(atlasNormal: GPU.RenderTexture): Promise<GPU.RenderTexture> {
        const shader = await GPU.Shader.Create({
            code: `
                  #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
                  struct VOut { @builtin(position) position : vec4f };
                  const verts = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
                  @vertex fn vertexMain(@builtin(vertex_index) i:u32) -> VOut {
                      var o:VOut; o.position = vec4f(verts[i], 0, 1); return o;
                  }
                  @group(0) @binding(0) var src : texture_2d<f32>;
                  @fragment fn fragmentMain(in:VOut) -> @location(0) vec4f {
                      let texel = textureLoad(src, vec2<i32>(floor(in.position.xy)), 0);
                      let n = OctDecode(texel.rg);        // world normal
                      return vec4f(n * 0.5 + 0.5, texel.a); // xyz in rgb, metallic in a
                  }
              `,
            colorOutputs: [{ format: atlasNormal.format }],
            uniforms: { src: { group: 0, binding: 0, type: "texture" } },
        });
        shader.SetTexture("src", atlasNormal);
        const out = GPU.RenderTexture.Create(atlasNormal.width, atlasNormal.height, atlasNormal.depth, atlasNormal.format);
        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass("NormalToXYZ", [{ target: out, clear: true }]);
        GPU.RendererContext.DrawVertex(shader, 3);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
        return out;
    }
}

export class ImpostorMesh extends Components.Mesh {
    public atlasAlbedo: GPU.RenderTexture;
    public atlasNormal: GPU.RenderTexture;
    public atlasERMO: GPU.RenderTexture;
    public atlasDepth: GPU.DepthTexture;

    private originalBounds: Mathf.BoundingVolume;

    public async Create(meshes: Components.Mesh[], atlasResolution = 2048, atlasTiles = 16) {
        if (meshes.length === 0) throw Error("ImpostorMesh.Create needs at least one mesh");

        await MeshBaker.awaitShaders(meshes);
        this.originalBounds = MeshBaker.computeBounds(meshes);
        const { radius: R, center } = this.originalBounds;

        const cameraDist = R;
        const camera = new GameObject().AddComponent(Components.Camera);
        camera.SetOrthographic(-R, R, -R, R, cameraDist - R, cameraDist + R);

        const fmt = GPU.RenderingPipeline.GBufferFormat;
        const atlasAlbedo = GPU.RenderTexture.Create(atlasResolution, atlasResolution, 1, fmt);
        let atlasNormal = GPU.RenderTexture.Create(atlasResolution, atlasResolution, 1, fmt);
        const atlasERMO = GPU.RenderTexture.Create(atlasResolution, atlasResolution, 1, fmt);
        const atlasDepth = GPU.DepthTexture.Create(atlasResolution, atlasResolution);

        const modelData = new Float32Array(meshes.length * 16);
        for (let i = 0; i < meshes.length; i++) {
            modelData.set(this.getCenteredMatrix(meshes[i], center).elements, i * 16);
        }

        const tileSize = atlasResolution / atlasTiles;
        const gridMax = atlasTiles - 1;
        const dir = new Mathf.Vector3();
        const targets = { albedo: atlasAlbedo, normal: atlasNormal, ermo: atlasERMO, depth: atlasDepth };

        for (let x = 0; x < atlasTiles; x++) {
            for (let y = 0; y < atlasTiles; y++) {
                this.gridToDir(x, y, gridMax, dir);
                camera.transform.position.copy(dir).mul(cameraDist);
                camera.transform.LookAt(new Mathf.Vector3());
                camera.transform.Update();
                camera.Update();

                MeshBaker.Bake(meshes, modelData, camera, targets,
                    { x: x * tileSize, y: y * tileSize, width: tileSize, height: tileSize },
                    x === 0 && y === 0,
                );
            }
        }

        const xyzNormal = await NormalToXYZ.Convert(atlasNormal);
        atlasNormal.Destroy();
        atlasNormal = xyzNormal;

        await this.buildRuntimeMaterial(atlasTiles, atlasAlbedo, atlasNormal, atlasERMO, atlasDepth);
        this.atlasAlbedo = atlasAlbedo;
        this.atlasNormal = atlasNormal;
        this.atlasERMO = atlasERMO;
        this.atlasDepth = atlasDepth;
        camera.Destroy();
    }

    private getCenteredMatrix(mesh: Components.Mesh, center: Mathf.Vector3): Mathf.Matrix4 {
        const matrix = mesh.transform.localToWorldMatrix.clone();
        matrix.elements[12] -= center.x;
        matrix.elements[13] -= center.y;
        matrix.elements[14] -= center.z;
        return matrix;
    }

    private gridToDir(i: number, j: number, gridMax: number, out: Mathf.Vector3): Mathf.Vector3 {
        const gx = i / gridMax;
        const gy = j / gridMax;
        const px = gx - gy;
        const pz = gx + gy - 1.0;
        const py = 1.0 - Math.abs(px) - Math.abs(pz);
        return out.set(px, py, pz).normalize();
    }

    public dilated: GPU.RenderTexture;

    private async buildRuntimeMaterial(atlasTiles: number, atlasAlbedo: GPU.RenderTexture, atlasNormal: GPU.RenderTexture, atlasERMO: GPU.RenderTexture, atlasDepth: GPU.DepthTexture) {
        const fmt = Runtime.Renderer.RenderPipeline.GBufferFormat;
        const shader = await GPU.Shader.Create({
            code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                const _ImposterFrames : f32 = ${atlasTiles};

                struct VertexInput {
                    @builtin(instance_index) instanceIdx : u32,
                    @location(0) position : vec3<f32>,
                    @location(1) normal   : vec3<f32>,
                    @location(2) uv       : vec2<f32>,
                };
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) tile     : vec2<f32>,
                    @location(1) uv       : vec2<f32>,
                    @location(2) centerWS : vec3<f32>,
                    @location(3) @interpolate(flat) instanceIdx : u32,
                };

                @group(0) @binding(0) var<storage, read> frameBuffer    : FrameBuffer;
                @group(0) @binding(1) var<storage, read> modelMatrix    : array<mat4x4<f32>>;
                @group(0) @binding(2) var                textureSampler : sampler;
                @group(0) @binding(3) var                atlasAlbedo    : texture_2d<f32>;
                @group(0) @binding(4) var                atlasNormal    : texture_2d<f32>;
                @group(0) @binding(5) var                atlasERMO      : texture_2d<f32>;
                @group(0) @binding(6) var                atlasDepth      : texture_depth_2d;
                @group(0) @binding(7) var<storage, read> originalBounds : vec4<f32>;

                fn encodeDirection(d: vec3<f32>) -> vec2<f32> {
                    let oct = d / dot(d, sign(d));
                    return vec2<f32>(1.0 + oct.x + oct.z, 1.0 + oct.z - oct.x) * 0.5;
                }
                fn decodeDirection(grid: vec2<f32>, gridMax: vec2<f32>) -> vec3<f32> {
                    let g = grid / gridMax;
                    var p = vec3<f32>(g.x - g.y, 0.0, g.x + g.y - 1.0);
                    p.y = 1.0 - abs(p.x) - abs(p.z);
                    return normalize(p);
                }
                fn planeBasis(n: vec3<f32>) -> mat2x3<f32> {
                    var up = vec3<f32>(0.0, 1.0, 0.0);
                    if (abs(n.y) > 0.999) { up = vec3<f32>(1.0, 0.0, 0.0); }
                    let t = normalize(cross(up, n));
                    return mat2x3<f32>(t, cross(n, t));
                }
                fn projectToPlaneUV(n: vec3<f32>, basis: mat2x3<f32>, camDir: vec3<f32>, vertexLocal: vec3<f32>) -> vec2<f32> {
                    let denom = dot(camDir, n);
                    let hit = vertexLocal - camDir * (dot(vertexLocal, n) / denom);
                    return vec2<f32>(
                        0.5 + dot(basis[0], hit) * 0.5,
                        0.5 - dot(basis[1], hit) * 0.5
                    );
                }

                @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    let model = modelMatrix[input.instanceIdx];

                    let boundsMat = mat4x4f(
                        vec4f(originalBounds.w, 0.0, 0.0, 0.0),
                        vec4f(0.0, originalBounds.w, 0.0, 0.0),
                        vec4f(0.0, 0.0, originalBounds.w, 0.0),
                        vec4f(originalBounds.x, originalBounds.y, originalBounds.z, 1.0),
                    );
                    let objectToWorld = model * boundsMat;

                    let m3 = mat3x3f(objectToWorld[0].xyz, objectToWorld[1].xyz, objectToWorld[2].xyz);
                    let camLocal = transpose(m3) * (frameBuffer.viewPosition.xyz - objectToWorld[3].xyz);
                    let camDir = normalize(camLocal);

                    let basisCam  = planeBasis(camDir);
                    let projected = basisCam[0] * input.position.x + basisCam[1] * input.position.y;

                    let gridMax = vec2<f32>(_ImposterFrames - 1.0);
                    let grid    = encodeDirection(camDir) * gridMax;
                    let gFloor  = min(floor(grid), gridMax);

                    let n1  = decodeDirection(gFloor, gridMax);
                    let uv1 = projectToPlaneUV(n1, basisCam, camDir, projected);

                    // objectToWorld rotates the quad back out, so it still faces the camera
                    output.position    = frameBuffer.projectionMatrix * frameBuffer.viewMatrix * objectToWorld * vec4<f32>(projected, 1.0);
                    output.tile        = gFloor;
                    output.uv          = uv1;
                    output.centerWS    = (objectToWorld * vec4<f32>(0.0, 0.0, 0.0, 1.0)).xyz;
                    output.instanceIdx = input.instanceIdx;
                    return output;
                }

                struct FragmentOutput {
                    @location(0) albedo : vec4f,
                    @location(1) normal : vec4f,
                    @location(2) RMO    : vec4f,
                };

                fn tileUV(localUV: vec2<f32>, tile: vec2<f32>) -> vec2<f32> {
                    let local = clamp(localUV, vec2<f32>(0.0), vec2<f32>(1.0));
                    return clamp((tile + local) / _ImposterFrames, vec2<f32>(0.0), vec2<f32>(1.0));
                }

                @fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                    let u = tileUV(input.uv, input.tile);

                    // let atlasDim = vec2<f32>(textureDimensions(atlasDepth));
                    // let coverage = textureLoad(atlasDepth, vec2<i32>(u * atlasDim), 0);
                    // if (coverage >= 1.0) { discard; }

                    let albedo = textureSample(atlasAlbedo, textureSampler, u);
                    if (albedo.a <= 0.5) { discard; }
                    // let normalTexel = textureSample(atlasNormal, textureSampler, u);
                    let normalTexel = textureSample(atlasNormal, textureSampler, u);   // filtered + mipped, safe now
                    let worldN = normalize(normalTexel.xyz * 2.0 - 1.0);

                    let model  = modelMatrix[input.instanceIdx];
                    let rot    = mat3x3f(normalize(model[0].xyz), normalize(model[1].xyz), normalize(model[2].xyz));
                    let finalN = normalize(rot * worldN);

                    let metalnessRoughness = textureSample(atlasERMO, textureSampler, u);

                    var output: FragmentOutput;
                    output.albedo = albedo;
                    // output.normal = normalTexel;
                    output.normal = vec4f(OctEncode(finalN), 1.0, normalTexel.a);  // occlusion=1, metallic kept
                    output.RMO    = metalnessRoughness;

                    return output;
                }
                `,
            colorOutputs: [{ format: fmt }, { format: fmt }, { format: fmt }],
            depthOutput: "depth24plus",
            cullMode: "none",
        });

        atlasAlbedo.GenerateMips();
        atlasNormal.GenerateMips();
        atlasERMO.GenerateMips();
        shader.SetSampler("textureSampler", new GPU.TextureSampler({ maxAnisotropy: 4 }));
        shader.SetTexture("atlasAlbedo", atlasAlbedo);
        shader.SetTexture("atlasNormal", atlasNormal);
        shader.SetTexture("atlasERMO", atlasERMO);
        shader.SetTexture("atlasDepth", atlasDepth);
        shader.SetArray("originalBounds", new Float32Array([
            ...this.originalBounds.center.elements,
            this.originalBounds.radius,
        ]));

        this.geometry = Geometry.Plane();
        this.material = new GPU.ShaderMaterial({ shader, isDeferred: true });
    }
}