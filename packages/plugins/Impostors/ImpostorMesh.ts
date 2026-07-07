import { Components, GPU, Mathf, GameObject, Geometry, Runtime } from "@trident/core";
import { MeshBaker } from "./MeshBaker";

export class ImpostorMesh extends Components.Mesh {
    public atlasAlbedo: GPU.RenderTexture;
    public atlasNormal: GPU.RenderTexture;
    public atlasERMO: GPU.RenderTexture;

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
        const atlasNormal = GPU.RenderTexture.Create(atlasResolution, atlasResolution, 1, fmt);
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
                    false,
                );
            }
        }

        atlasDepth.Destroy();
        await this.buildRuntimeMaterial(atlasTiles, atlasAlbedo, atlasNormal, atlasERMO);
        this.atlasAlbedo = atlasAlbedo;
        this.atlasNormal = atlasNormal;
        this.atlasERMO = atlasERMO;
        this.atlasAlbedo.GenerateMips();
        this.atlasERMO.GenerateMips();
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

    private async buildRuntimeMaterial(atlasTiles: number, atlasAlbedo: GPU.RenderTexture, atlasNormal: GPU.RenderTexture, atlasERMO: GPU.RenderTexture) {
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
                @group(0) @binding(6) var<storage, read> originalBounds : vec4<f32>;

                fn inverse(m: mat4x4f) -> mat4x4f {
                    let a00 = m[0][0]; let a01 = m[1][0]; let a02 = m[2][0]; let a03 = m[3][0];
                    let a10 = m[0][1]; let a11 = m[1][1]; let a12 = m[2][1]; let a13 = m[3][1];
                    let a20 = m[0][2]; let a21 = m[1][2]; let a22 = m[2][2]; let a23 = m[3][2];
                    let a30 = m[0][3]; let a31 = m[1][3]; let a32 = m[2][3]; let a33 = m[3][3];
                    let b00 = a00*a11 - a01*a10; let b01 = a00*a12 - a02*a10;
                    let b02 = a00*a13 - a03*a10; let b03 = a01*a12 - a02*a11;
                    let b04 = a01*a13 - a03*a11; let b05 = a02*a13 - a03*a12;
                    let b06 = a20*a31 - a21*a30; let b07 = a20*a32 - a22*a30;
                    let b08 = a20*a33 - a23*a30; let b09 = a21*a32 - a22*a31;
                    let b10 = a21*a33 - a23*a31; let b11 = a22*a33 - a23*a32;
                    let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
                    return mat4x4f(
                        a11*b11 - a12*b10 + a13*b09,  a02*b10 - a01*b11 - a03*b09,
                        a31*b05 - a32*b04 + a33*b03,  a22*b04 - a21*b05 - a23*b03,
                        a12*b08 - a10*b11 - a13*b07,  a00*b11 - a02*b08 + a03*b07,
                        a32*b02 - a30*b05 - a33*b01,  a20*b05 - a22*b02 + a23*b01,
                        a10*b10 - a11*b08 + a13*b06,  a01*b08 - a00*b10 - a03*b06,
                        a30*b04 - a31*b02 + a33*b00,  a21*b02 - a20*b04 - a23*b00,
                        a11*b07 - a10*b09 - a12*b06,  a00*b09 - a01*b07 + a02*b06,
                        a31*b01 - a30*b03 - a32*b00,  a20*b03 - a21*b01 + a22*b00,
                    ) * (1.0 / det);
                }

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

                    let camLocal = (inverse(objectToWorld) * vec4<f32>(frameBuffer.viewPosition.xyz, 1.0)).xyz;
                    let camDir = normalize(camLocal);

                    let basisCam  = planeBasis(camDir);
                    let projected = basisCam[0] * input.position.x + basisCam[1] * input.position.y;

                    let gridMax = vec2<f32>(_ImposterFrames - 1.0);
                    let grid    = encodeDirection(camDir) * gridMax;
                    let gFloor  = min(floor(grid), gridMax);

                    let n1  = decodeDirection(gFloor, gridMax);
                    let uv1 = projectToPlaneUV(n1, basisCam, camDir, projected);

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

                    let albedo = textureSample(atlasAlbedo, textureSampler, u);
                    if (albedo.a < 0.5) { discard; }

                    let ermo = textureSample(atlasERMO, textureSampler, u);

                    // let nRuntime = normalize(frameBuffer.viewPosition.xyz - input.centerWS);
                    // let normal = vec4<f32>(OctEncode(nRuntime), 0.0, 0.0);
                    let normalTexel = textureSampleLevel(atlasNormal, textureSampler, u, 0.0);
                    let normal = normalTexel;

                    var output: FragmentOutput;
                    output.albedo = albedo;
                    output.normal = normal;
                    output.RMO    = ermo;
                    return output;
                }
                `,
            colorOutputs: [{ format: fmt }, { format: fmt }, { format: fmt }],
            depthOutput: "depth24plus",
            cullMode: "none",
        });

        shader.SetSampler("textureSampler", new GPU.TextureSampler());
        shader.SetTexture("atlasAlbedo", atlasAlbedo);
        shader.SetTexture("atlasNormal", atlasNormal);
        shader.SetTexture("atlasERMO", atlasERMO);
        shader.SetArray("originalBounds", new Float32Array([
            ...this.originalBounds.center.elements,
            this.originalBounds.radius,
        ]));

        this.geometry = Geometry.Plane();
        this.material = new GPU.ShaderMaterial({ shader, isDeferred: true });
    }
}