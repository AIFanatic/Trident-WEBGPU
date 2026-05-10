import { GPU, Mathf } from '@trident/core';

class SHGenerator {
  compute;
  format = "rgba16float";
  initialized = false;
  async Initialize(size) {
    if (this.initialized) return;
    this.compute = await GPU.ShaderCompute.Create({
      code: `
             struct SH9 {
                c0: vec4f,
                c1: vec4f,
                c2: vec4f,
                c3: vec4f,
                c4: vec4f,
                c5: vec4f,
                c6: vec4f,
                c7: vec4f,
                c8: vec4f,
            };

            @group(0) @binding(0) var _CubeMapTexture: texture_cube<f32>;
            @group(0) @binding(1) var sampler_LinearClamp: sampler;
            @group(0) @binding(2) var<storage, read_write> _GroupCoefficients: array<SH9>;
            @group(0) @binding(3) var<storage, read> _DispatchCountF: vec4<f32>;
            @group(0) @binding(4) var<storage, read> _TextureSizeF: vec4<f32>;

            var<workgroup> coeffs: array<SH9, 64>;

            fn ZeroSH9() -> SH9 {
                let z = vec4f(0.0);
                return SH9(z, z, z, z, z, z, z, z, z);
            }

            fn AddSH9(a: SH9, b: SH9) -> SH9 {
                return SH9(
                    a.c0 + b.c0,
                    a.c1 + b.c1,
                    a.c2 + b.c2,
                    a.c3 + b.c3,
                    a.c4 + b.c4,
                    a.c5 + b.c5,
                    a.c6 + b.c6,
                    a.c7 + b.c7,
                    a.c8 + b.c8
                );
            }

            //Check if we are sampling inside texture
            fn CheckInRange(texturesize: vec3<u32>, dispatchThreadID: vec3<u32>) -> bool {
                return !any(dispatchThreadID >= texturesize);
            }

            //Calculate direction from dispatchThreadID
            fn GetDirectionFromIndex(textureSize: vec3<u32>, dispatchThreadID: vec3<u32>) -> vec3f {
                let uv = (vec2f(dispatchThreadID.xy) + 0.5) / vec2f(textureSize.xy);

                let u = uv.x * 2.0 - 1.0;
                let v = uv.y * 2.0 - 1.0;

                switch dispatchThreadID.z {
                    case 0u { return normalize(vec3f( 1.0,  v, -u)); } // +X
                    case 1u { return normalize(vec3f(-1.0,  v,  u)); } // -X
                    case 2u { return normalize(vec3f( u,  1.0, -v)); } // +Y
                    case 3u { return normalize(vec3f( u, -1.0,  v)); } // -Y
                    case 4u { return normalize(vec3f( u,  v,  1.0)); } // +Z
                    default { return normalize(vec3f(-u,  v, -1.0)); } // -Z
                }
            }

            fn AreaElement(x: f32, y: f32) -> f32 {
                return atan2(x * y, sqrt(x * x + y * y + 1));
            }

            //Calculate solid angle
            fn GetWeightFromIndex(textureSize: vec3<u32>, dispatchThreadID: vec3<u32>) -> f32 {
                let invTextureSize: vec2<f32> = 1.0 / vec2<f32>(textureSize.xy);
                var uv: vec2<f32> = (vec2<f32>(dispatchThreadID.xy) + 0.5) * invTextureSize;
                uv = uv * 2.0 - 1.0;
                let x0 = uv.x - invTextureSize.x;
                let y0 = uv.y - invTextureSize.y;
                let x1 = uv.x + invTextureSize.x;
                let y1 = uv.y + invTextureSize.y;

                return AreaElement(x0, y0) - AreaElement(x0, y1) - AreaElement(x1, y0) + AreaElement(x1, y1);
            }

            //Texture format is RGBA SFloat, so we do not need to decode sampleHDR
            fn SampleCubeMap(cubeTex: texture_cube<f32>, sampleDir: vec3<f32>) -> vec3<f32> {
                return textureSampleLevel(cubeTex, sampler_LinearClamp, sampleDir, 0).rgb;
            }

            struct SHBasis
            {
                y00: f32,
                y1p1: f32,
                y10: f32,
                y1n1: f32,
                y2p1: f32,
                y2n1: f32,
                y2n2: f32,
                y20: f32,
                y2p2: f32
            };

            fn Evaluate(normal: vec3<f32>) -> SHBasis
            {
                var shBasis: SHBasis;
                shBasis.y00 = 0.2820947917f;
                shBasis.y1p1 = 0.4886025119f * normal.y;
                shBasis.y10 = 0.4886025119f * normal.z;
                shBasis.y1n1 = 0.4886025119f * normal.x;
                shBasis.y2p1 = 1.0925484306f * normal.x * normal.y;
                shBasis.y2n1 = 1.0925484306f * normal.y * normal.z;
                shBasis.y2n2= 0.3153915652f * (3 * normal.z * normal.z - 1.0f);
                shBasis.y20 = 1.0925484306f * normal.x * normal.z;
                shBasis.y2p2 = 0.5462742153f * (normal.x * normal.x - normal.y * normal.y);
                return shBasis;
            }

            @compute @workgroup_size(8, 8, 1)
            fn main(
                @builtin(workgroup_id) groupID: vec3<u32>,
                @builtin(local_invocation_index) groupIndex: u32,
                @builtin(global_invocation_id) dispatchThreadID: vec3<u32>
            ) {
                let dispatchCount = vec3u(
                    u32(_DispatchCountF.x),
                    u32(_DispatchCountF.y),
                    u32(_DispatchCountF.z)
                );

                let textureSize = vec3u(
                    u32(_TextureSizeF.x),
                    u32(_TextureSizeF.y),
                    u32(_TextureSizeF.z)
                );

                let indexGroup =
                    groupID.z * dispatchCount.x * dispatchCount.y +
                    groupID.y * dispatchCount.x +
                    groupID.x;

                var temp = ZeroSH9();

                if (CheckInRange(textureSize, dispatchThreadID)) {
                    let direction = GetDirectionFromIndex(textureSize, dispatchThreadID);
                    let weight = GetWeightFromIndex(textureSize, dispatchThreadID);
                    let sampleColor = SampleCubeMap(_CubeMapTexture, direction) * weight;
                    let shBasis = Evaluate(direction);

                    temp.c0 = vec4f(shBasis.y00  * sampleColor, 0.0);
                    temp.c1 = vec4f(shBasis.y1p1 * sampleColor, 0.0);
                    temp.c2 = vec4f(shBasis.y10  * sampleColor, 0.0);
                    temp.c3 = vec4f(shBasis.y1n1 * sampleColor, 0.0);
                    temp.c4 = vec4f(shBasis.y2p1 * sampleColor, 0.0);
                    temp.c5 = vec4f(shBasis.y2n1 * sampleColor, 0.0);
                    temp.c6 = vec4f(shBasis.y2n2 * sampleColor, 0.0);
                    temp.c7 = vec4f(shBasis.y20  * sampleColor, 0.0);
                    temp.c8 = vec4f(shBasis.y2p2 * sampleColor, 0.0);
                }

                coeffs[groupIndex] = temp;

                workgroupBarrier();

                var stride = 32u;
                loop {
                    if (stride == 0u) { break; }

                    if (groupIndex < stride) {
                        coeffs[groupIndex] = AddSH9(coeffs[groupIndex], coeffs[groupIndex + stride]);
                    }

                    workgroupBarrier();
                    stride = stride / 2u;
                }

                if (groupIndex == 0u) {
                    _GroupCoefficients[indexGroup] = coeffs[0];
                }
            }
            `,
      computeEntrypoint: "main"
    });
    this.compute.SetSampler("sampler_LinearClamp", new GPU.TextureSampler());
    this.initialized = true;
  }
  async FromCubemap(cubemap) {
    const KernelThreadGroupSizes = new Mathf.Vector3(8, 8, 1);
    const dispatchCounts = new Mathf.Vector3(Math.ceil(cubemap.width / KernelThreadGroupSizes.x), Math.ceil(cubemap.height / KernelThreadGroupSizes.y), 6);
    const groupCount = dispatchCounts.x * dispatchCounts.y * dispatchCounts.z;
    const sh9Buffer = new GPU.Buffer(groupCount * 36 * 4, GPU.BufferType.STORAGE_WRITE);
    sh9Buffer.SetArray(new Float32Array(groupCount * 36));
    this.compute.SetTexture("_CubeMapTexture", cubemap);
    this.compute.SetBuffer("_GroupCoefficients", sh9Buffer);
    this.compute.SetArray("_DispatchCountF", new Float32Array([dispatchCounts.x, dispatchCounts.y, dispatchCounts.z, 0]));
    this.compute.SetArray("_TextureSizeF", new Float32Array([cubemap.width, cubemap.height, 6, 0]));
    GPU.Renderer.BeginRenderFrame();
    GPU.ComputeContext.BeginComputePass("SHGenerator", true);
    GPU.ComputeContext.Dispatch(this.compute, dispatchCounts.x, dispatchCounts.y, dispatchCounts.z);
    GPU.ComputeContext.EndComputePass();
    GPU.Renderer.EndRenderFrame();
    const sh9Array = new Float32Array(await sh9Buffer.GetData());
    const coefficientsArray = new Float32Array(9 * 3);
    const inv4PI = 0.25 / Math.PI;
    for (let group = 0; group < groupCount; group++) {
      const base = group * 36;
      for (let coeff = 0; coeff < 9; coeff++) {
        const src = base + coeff * 4;
        const dst = coeff * 3;
        coefficientsArray[dst + 0] += sh9Array[src + 0];
        coefficientsArray[dst + 1] += sh9Array[src + 1];
        coefficientsArray[dst + 2] += sh9Array[src + 2];
      }
    }
    for (let i = 0; i < coefficientsArray.length; i++) {
      coefficientsArray[i] *= inv4PI;
    }
    return coefficientsArray;
  }
}

export { SHGenerator };
