import { GPU, Geometry, Mathf } from '@trident/core';

class HDRParser {
  static radiancePattern = "#\\?RADIANCE";
  static commentPattern = "#.*";
  static exposurePattern = "EXPOSURE=\\s*([0-9]*[.][0-9]*)";
  static formatPattern = "FORMAT=32-bit_rle_rgbe";
  static widthHeightPattern = "-Y ([0-9]+) \\+X ([0-9]+)";
  static readPixelsRawRLE(buffer, data, offset, fileOffset, scanlineWidth, scanlinesCount) {
    const rgbe = new Array(4);
    let scanlineBuffer = null;
    let ptr;
    let ptr_end;
    let count;
    const twoBytes = new Array(2);
    const bufferLength = buffer.length;
    function readBuf(buf) {
      let bytesRead = 0;
      do {
        buf[bytesRead++] = buffer[fileOffset];
        fileOffset += 1;
      } while (fileOffset < bufferLength && bytesRead < buf.length);
      return bytesRead;
    }
    function readBufferOffset(buf, offset2, length) {
      let bytesRead = 0;
      do {
        buf[offset2 + bytesRead] = buffer[fileOffset];
        bytesRead += 1;
        fileOffset += 1;
      } while (fileOffset < bufferLength && bytesRead < length);
      return bytesRead;
    }
    function readPixelsRaw(data2, offset2, numpixels) {
      const numExpected = 4 * numpixels;
      let readCount = readBufferOffset(data2, offset2, numExpected);
      if (readCount < numExpected) {
        throw new Error(
          "Error reading raw pixels: got " + readCount + " bytes, expected " + numExpected
        );
      }
    }
    while (scanlinesCount > 0) {
      if (readBuf(rgbe) < rgbe.length) {
        throw new Error("Error reading bytes: expected " + rgbe.length);
      }
      if (rgbe[0] != 2 || rgbe[1] != 2 || (rgbe[2] & 128) != 0) {
        data[offset + 0] = rgbe[0];
        data[offset + 1] = rgbe[1];
        data[offset + 2] = rgbe[2];
        data[offset + 3] = rgbe[3];
        offset += 4;
        readPixelsRaw(data, offset, scanlineWidth * scanlinesCount - 1);
        return;
      }
      if (((rgbe[2] & 255) << 8 | rgbe[3] & 255) != scanlineWidth) {
        throw new Error(
          "Wrong scanline width " + ((rgbe[2] & 255) << 8 | rgbe[3] & 255) + ", expected " + scanlineWidth
        );
      }
      if (scanlineBuffer == null) {
        scanlineBuffer = new Array(4 * scanlineWidth);
      }
      ptr = 0;
      for (let i = 0; i < 4; i += 1) {
        ptr_end = (i + 1) * scanlineWidth;
        while (ptr < ptr_end) {
          if (readBuf(twoBytes) < twoBytes.length) {
            throw new Error("Error reading 2-byte buffer");
          }
          if ((twoBytes[0] & 255) > 128) {
            count = (twoBytes[0] & 255) - 128;
            if (count == 0 || count > ptr_end - ptr) {
              throw new Error("Bad scanline data");
            }
            while (count-- > 0) {
              scanlineBuffer[ptr++] = twoBytes[1];
            }
          } else {
            count = twoBytes[0] & 255;
            if (count == 0 || count > ptr_end - ptr) {
              throw new Error("Bad scanline data");
            }
            scanlineBuffer[ptr++] = twoBytes[1];
            if (--count > 0) {
              if (readBufferOffset(scanlineBuffer, ptr, count) < count) {
                throw new Error("Error reading non-run data");
              }
              ptr += count;
            }
          }
        }
      }
      for (let i = 0; i < scanlineWidth; i += 1) {
        data[offset + 0] = scanlineBuffer[i];
        data[offset + 1] = scanlineBuffer[i + scanlineWidth];
        data[offset + 2] = scanlineBuffer[i + 2 * scanlineWidth];
        data[offset + 3] = scanlineBuffer[i + 3 * scanlineWidth];
        offset += 4;
      }
      scanlinesCount -= 1;
    }
  }
  static async Load(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    let fileOffset = 0;
    const bufferLength = buffer.length;
    const NEW_LINE = 10;
    function readLine() {
      let line = "";
      while (++fileOffset < bufferLength) {
        let b = buffer[fileOffset];
        if (b == NEW_LINE) {
          fileOffset += 1;
          break;
        }
        line += String.fromCharCode(b);
      }
      return line;
    }
    let width = 0;
    let height = 0;
    let exposure = 1;
    let gamma = 1;
    for (let i = 0; i < 20; i += 1) {
      let line = readLine();
      let match;
      if (match = line.match(HDRParser.radiancePattern)) ; else if (match = line.match(HDRParser.formatPattern)) ; else if (match = line.match(HDRParser.exposurePattern)) {
        exposure = Number(match[1]);
      } else if (match = line.match(HDRParser.commentPattern)) ; else if (match = line.match(HDRParser.widthHeightPattern)) {
        height = Number(match[1]);
        width = Number(match[2]);
        break;
      }
    }
    let data = new Uint8Array(width * height * 4);
    let scanlineWidth = width;
    let scanlinesCount = height;
    HDRParser.readPixelsRawRLE(buffer, data, 0, fileOffset, scanlineWidth, scanlinesCount);
    const f32 = new Float32Array(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      const e = data[i + 3];
      const s = e ? Math.pow(2, e - 128) / 256 : 0;
      f32[i + 0] = data[i + 0] * s;
      f32[i + 1] = data[i + 1] * s;
      f32[i + 2] = data[i + 2] * s;
      f32[i + 3] = 1;
    }
    function f32toF16(x) {
      f32toF16.f[0] = x;
      const u = f32toF16.u[0];
      const s = u >>> 31 & 1;
      let e = u >>> 23 & 255;
      let m = u & 8388607;
      if (e === 255) return s << 15 | 31744 | (m ? 512 : 0);
      if (e === 0) return s << 15;
      e = e - 127 + 15;
      if (e <= 0) {
        if (e < -10) return s << 15;
        m = (m | 8388608) >>> 1 - e;
        return s << 15 | m + 4096 >>> 13;
      }
      if (e >= 31) return s << 15 | 31744;
      return s << 15 | e << 10 | m + 4096 >>> 13;
    }
    f32toF16.f = new Float32Array(1);
    f32toF16.u = new Uint32Array(f32toF16.f.buffer);
    const f16 = new Uint16Array(f32.length);
    for (let i = 0; i < f32.length; i++) f16[i] = f32toF16(f32[i]);
    return {
      width,
      height,
      exposure,
      gamma,
      data: f16
    };
  }
  static async ToCubemap(hdr) {
    const srcHDR = GPU.RenderTexture.Create(hdr.width, hdr.height, 1, "rgba16float");
    srcHDR.SetData(hdr.data, hdr.width * 8);
    const faceSize = Math.min(hdr.width / 2 | 0, hdr.height | 0);
    const renderTarget = GPU.RenderTextureCube.Create(faceSize, faceSize, 6, "rgba8unorm");
    renderTarget.SetName("Skybox");
    const hdrSampler = GPU.TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "clamp-to-edge"
    });
    const geometry = Geometry.Plane();
    const shader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            @group(0) @binding(1) var hdrTexture: texture_2d<f32>;
            @group(0) @binding(2) var hdrSampler: sampler;
      
            @group(0) @binding(3) var<storage, read> face: vec4<f32>;
      
            struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
      
            @vertex
            fn vertexMain(@location(0) position: vec3f) -> VSOut {
                var o: VSOut;
                o.pos = vec4f(position.xy, 0.0, 1.0);
                o.uv  = position.xy; // [-1,1]
                return o;
            }
      
            fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                let u = x; let v = y;
                switch face {
                    case 0u { return normalize(vec3(-1.0,  v,  u)); } // -X
                    case 1u { return normalize(vec3( 1.0,  v, -u)); } // +X
                    case 2u { return normalize(vec3( -u,  1.0, v)); } // +Y
                    case 3u { return normalize(vec3( -u, -1.0, -v)); } // -Y
                    case 4u { return normalize(vec3(-u,  v, -1.0)); } // +Z
                    default { return normalize(vec3( u,  v,  1.0)); } // -Z
                }
            }
      
            const invAtan = vec2f(0.15915494309189535, 0.3183098861837907);
      
            fn sampleSphericalMap(v: vec3f) -> vec2f {
                var st = vec2f(atan2(v.z, v.x), asin(v.y));
                st *= invAtan;
                st += 0.5;
                return st;
            }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y) * -1;
                let st  = sampleSphericalMap(dir);
                let col = textureSample(hdrTexture, hdrSampler, st).rgb;
                return vec4f(col, 1.0);
            }
          `
      ),
      colorOutputs: [{ format: "rgba8unorm" }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        hdrTexture: { group: 0, binding: 1, type: "texture" },
        hdrSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" }
      }
    });
    const params = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    shader.SetTexture("hdrTexture", srcHDR);
    shader.SetSampler("hdrSampler", hdrSampler);
    shader.SetBuffer("face", params);
    for (let face = 0; face < 6; face++) {
      params.SetArray(new Float32Array([face, 0, 0, 0]));
      GPU.Renderer.BeginRenderFrame();
      renderTarget.SetActiveLayer(face);
      GPU.RendererContext.BeginRenderPass(`EquirectToCubeFace_${face}`, [{ target: renderTarget, clear: false }]);
      GPU.RendererContext.DrawGeometry(geometry, shader);
      GPU.RendererContext.EndRenderPass();
      GPU.Renderer.EndRenderFrame();
    }
    return renderTarget;
  }
  static async GetIrradianceMap(hdrCubemap, size = 32) {
    const res = size;
    const renderTarget = GPU.RenderTextureCube.Create(res, res, 6, "rgba8unorm");
    renderTarget.SetName("IrradianceMap");
    const geometry = Geometry.Plane();
    const shader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            @group(0) @binding(1) var environmentMap: texture_cube<f32>;
            @group(0) @binding(2) var environmentMapSampler: sampler;
      
            @group(0) @binding(3) var<storage, read> face: vec4<f32>;

            @group(0) @binding(4) var<storage, read> modelViewProjectionMatrix: mat4x4f;
      
            struct VSOut {
              @builtin(position) pos: vec4f,
              @location(0) uv: vec2f,
            };
      
            @vertex
            fn vertexMain(@location(0) position: vec3f) -> VSOut {
              var o: VSOut;
              o.pos = vec4f(position.xy, 0.0, 1.0);
              o.uv  = position.xy;        // [-1,1] quad coords
              return o;
            }
      
            // Map face + NDC uv -> direction
            fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                let u = x; let v = y;
                switch face {
                  case 0u { return normalize(vec3(-1.0, v, -u)); } // +X
                  case 1u { return normalize(vec3(1.0, v, u)); } // -X
                  case 2u { return normalize(vec3(-u, 1.0, -v)); } // -Y
                  case 3u { return normalize(vec3(-u, -1.0, v)); } // +Y
                  case 4u { return normalize(vec3(-u, v, 1.0)); } // +Z
                  default { return normalize(vec3(u, v, -1.0)); } // -Z
                }
            }
      
            const PI = 3.14159265359;
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
              // Per-pixel normal for this output cubemap face
              let normal = dirFromFaceUV(u32(face.x), uv.x, uv.y);
      
              var irradiance = vec3f(0.0, 0.0, 0.0);

              var up = vec3f(0.0, 1.0, 0.0);
              let right = normalize(cross(up, normal));
              up = normalize(cross(normal, right));
          
              var sampleDelta = 0.025;
              var nrSamples = 0.0;
              for(var phi: f32 = 0.0; phi < 2.0 * PI; phi = phi + sampleDelta) {
                for(var theta : f32 = 0.0; theta < 0.5 * PI; theta = theta + sampleDelta) {
                    // spherical to cartesian (in tangent space)
                    let tangentSample: vec3f = vec3f(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta));
                    // tangent space to world
                    let sampleVec = tangentSample.x * right + tangentSample.y * up + tangentSample.z * normal;
            
                    // irradiance += textureSample(environmentMap, environmentMapSampler, sampleVec).rgb * cos(theta) * sin(theta);
                    irradiance += textureSampleLevel(environmentMap, environmentMapSampler, normalize(sampleVec), 0.0).rgb * cos(theta) * sin(theta);

                    nrSamples += 1.0;
                }
              }
              irradiance = PI * irradiance * (1.0 / nrSamples);
          
              return vec4f(irradiance, 1.0);
            }
          `
      ),
      colorOutputs: [{ format: "rgba8unorm" }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        environmentMap: { group: 0, binding: 1, type: "texture" },
        environmentMapSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" },
        modelViewProjectionMatrix: { group: 0, binding: 4, type: "storage" }
      }
    });
    const environmentMapSampler = GPU.TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    const params = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    shader.SetTexture("environmentMap", hdrCubemap);
    shader.SetSampler("environmentMapSampler", environmentMapSampler);
    shader.SetBuffer("face", params);
    for (let face = 0; face < 6; face++) {
      params.SetArray(new Float32Array([face, 0, 0, 0]));
      GPU.Renderer.BeginRenderFrame();
      renderTarget.SetActiveLayer(face);
      GPU.RendererContext.BeginRenderPass(`CubemapIrradiance_${face}`, [
        { target: renderTarget, clear: false }
      ]);
      GPU.RendererContext.DrawGeometry(geometry, shader);
      GPU.RendererContext.EndRenderPass();
      GPU.Renderer.EndRenderFrame();
    }
    return renderTarget;
  }
  static async GetPrefilterMap(hdrCubemap, size = 256, roughnessLevels = 5) {
    const res = size;
    const prefilterTexture = GPU.RenderTextureCube.Create(res, res, 6, "rgba8unorm", roughnessLevels);
    prefilterTexture.SetName("PrefilterMap");
    const geometry = Geometry.Plane();
    const shader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            @group(0) @binding(1) var environmentMap: texture_cube<f32>;
            @group(0) @binding(2) var environmentSampler: sampler;
      
            @group(0) @binding(3) var<storage, read> face: vec4<f32>;
            @group(0) @binding(4) var<storage, read> roughness: vec4<f32>;
      
            struct VSOut {
              @builtin(position) pos: vec4f,
              @location(0) uv: vec2f,
            };
      
            @vertex
            fn vertexMain(@location(0) position: vec3f) -> VSOut {
              var o: VSOut;
              o.pos = vec4f(position.xy, 0.0, 1.0);
              o.uv  = position.xy;        // [-1,1] quad coords
              return o;
            }
      
            // Map face + NDC uv -> direction
            fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                let u = x; let v = y;
                switch face {
                  case 0u { return normalize(vec3(-1.0, v, -u)); } // +X
                  case 1u { return normalize(vec3(1.0, v, u)); } // -X
                  case 2u { return normalize(vec3(-u, 1.0, -v)); } // -Y
                  case 3u { return normalize(vec3(-u, -1.0, v)); } // +Y
                  case 4u { return normalize(vec3(-u, v, 1.0)); } // +Z
                  default { return normalize(vec3(u, v, -1.0)); } // -Z
                }
            }
      
            const PI = 3.14159265359;
      
            // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
            // efficient VanDerCorpus calculation.
            fn radicalInverseVdC(bits_in: u32) -> f32 {
                var bits = bits_in;
                bits = (bits << 16u) | (bits >> 16u);
                bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
                bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
                bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
                bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
                return f32(bits) * 2.3283064365386963e-10;
            }

            fn hammersley(i: u32, n: u32) -> vec2f {
                return vec2f(f32(i) / f32(n), radicalInverseVdC(i));
            }

            fn importanceSampleGGX(xi: vec2f, n: vec3f, roughness: f32) -> vec3f {
                let a = roughness * roughness;
              
                let phi = 2.0 * PI * xi.x;
                let cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
                let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
              
                // from spherical coordinates to cartesian coordinates - halfway vector
                let h = vec3f(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
              
                // from tangent-space H vector to world-space sample vector
                let up: vec3f = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(n.z) < 0.999);
                let tangent = normalize(cross(up, n));
                let bitangent = cross(n, tangent);
              
                let sampleVec = tangent * h.x + bitangent * h.y + n * h.z;
                return normalize(sampleVec);
            }

            fn distributionGGX(n: vec3f, h: vec3f, roughness: f32) -> f32 {
                let a = roughness * roughness;
                let a2 = a * a;
                let nDotH = max(dot(n, h), 0.0);
                let nDotH2 = nDotH * nDotH;
                var denom = (nDotH2 * (a2 - 1.0) + 1.0);
                denom = PI * denom * denom;
                return a2 / denom;
            }

            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
              // Per-pixel normal for this output cubemap face
              let n = dirFromFaceUV(u32(face.x), uv.x, uv.y);
      
              // Make the simplifying assumption that V equals R equals the normal
              let r = n;
              let v = r;
            
              let SAMPLE_COUNT: u32 = 4096u;
              var prefilteredColor = vec3f(0.0, 0.0, 0.0);
              var totalWeight = 0.0;
            
              for (var i: u32 = 0u; i < SAMPLE_COUNT; i = i + 1u) {
                // Generates a sample vector that's biased towards the preferred alignment
                // direction (importance sampling).
                let xi = hammersley(i, SAMPLE_COUNT);
                let h = importanceSampleGGX(xi, n, roughness.x);
                let l = normalize(2.0 * dot(v, h) * h - v);
            
                let nDotL = max(dot(n, l), 0.0);
            
                if(nDotL > 0.0) {
                  // sample from the environment's mip level based on roughness/pdf
                  let d = distributionGGX(n, h, roughness.x);
                  let nDotH = max(dot(n, h), 0.0);
                  let hDotV = max(dot(h, v), 0.0);
                  let pdf = d * nDotH / (4.0 * hDotV) + 0.0001;
            
                  let resolution = ${size}.0; // resolution of source cubemap (per face)
                  let saTexel = 4.0 * PI / (6.0 * resolution * resolution);
                  let saSample = 1.0 / (f32(SAMPLE_COUNT) * pdf + 0.0001);
            
                  let mipLevel = select(0.5 * log2(saSample / saTexel), 0.0, roughness.x == 0.0);
            
                  prefilteredColor += textureSampleLevel(environmentMap, environmentSampler, l, mipLevel).rgb * nDotL;
                  totalWeight += nDotL;
                }
              }
            
              prefilteredColor = prefilteredColor / totalWeight;
              return vec4f(prefilteredColor, 1.0);
            }
          `
      ),
      colorOutputs: [{ format: prefilterTexture.format }],
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        environmentMap: { group: 0, binding: 1, type: "texture" },
        environmentSampler: { group: 0, binding: 2, type: "sampler" },
        face: { group: 0, binding: 3, type: "storage" },
        roughness: { group: 0, binding: 4, type: "storage" }
      }
    });
    const environmentMapSampler = GPU.TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    const faceBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    const roughnessBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    shader.SetTexture("environmentMap", hdrCubemap);
    shader.SetSampler("environmentSampler", environmentMapSampler);
    shader.SetBuffer("face", faceBuffer);
    shader.SetBuffer("roughness", roughnessBuffer);
    for (let mip = 0; mip < roughnessLevels; mip += 1) {
      const width = prefilterTexture.width >> mip;
      const height = prefilterTexture.height >> mip;
      const roughness = mip / (roughnessLevels - 1);
      roughnessBuffer.SetArray(new Float32Array([roughness, 0, 0, 0]));
      for (let face = 0; face < 6; face++) {
        faceBuffer.SetArray(new Float32Array([face, 0, 0, 0]));
        GPU.Renderer.BeginRenderFrame();
        prefilterTexture.SetActiveLayer(face);
        prefilterTexture.SetActiveMip(mip);
        prefilterTexture.SetActiveMipCount(1);
        GPU.RendererContext.BeginRenderPass(`Prefilter_${face}`, [{ target: prefilterTexture, clear: false, color: new Mathf.Color(0.3, 0.3, 0.3, 1) }]);
        GPU.RendererContext.SetViewport(0, 0, width, height, 0, 1);
        GPU.RendererContext.DrawGeometry(geometry, shader);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
      }
    }
    prefilterTexture.SetActiveMip(0);
    prefilterTexture.SetActiveMipCount(roughnessLevels);
    return prefilterTexture;
  }
  static async GetBRDFLUT(size = 512) {
    const res = size;
    const renderTarget = GPU.RenderTexture.Create(res, res, 1, "rg16float");
    renderTarget.SetName("BRDFLUT");
    const geometry = Geometry.Plane();
    const shader = await GPU.Shader.Create({
      code: (
        /* wgsl */
        `
            struct VSIn {
                @location(0) position: vec3<f32>,
                @location(1) normal: vec3<f32>,
                @location(2) uv: vec2<f32>,
            };

            struct VSOut {
                @builtin(position) pos: vec4f,
                @location(0) uv: vec2f,
            };
      
            @vertex
            fn vertexMain(input: VSIn) -> VSOut {
                var o: VSOut;
                o.pos = vec4f(input.position.xy, 0.0, 1.0);
                o.uv = input.uv.xy;
                return o;
            }
      
            const PI: f32 = 3.14159265359;

            fn geometrySmith(n: vec3f, v: vec3f, l: vec3f, roughness: f32) -> f32 {
                let nDotV = max(dot(n, v), 0.0);
                let nDotL = max(dot(n, l), 0.0);
                let ggx2 = geometrySchlickGGX(nDotV, roughness);
                let ggx1 = geometrySchlickGGX(nDotL, roughness);
                return ggx1 * ggx2;
            }

            fn importanceSampleGGX(xi: vec2f, n: vec3f, roughness: f32) -> vec3f {
                let a = roughness * roughness;
              
                let phi = 2.0 * PI * xi.x;
                let cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));
                let sinTheta = sqrt(1.0 - cosTheta * cosTheta);
              
                // from spherical coordinates to cartesian coordinates - halfway vector
                let h = vec3f(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);
              
                // from tangent-space H vector to world-space sample vector
                let up: vec3f = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(n.z) < 0.999);
                let tangent = normalize(cross(up, n));
                let bitangent = cross(n, tangent);
              
                let sampleVec = tangent * h.x + bitangent * h.y + n * h.z;
                return normalize(sampleVec);
            }

            fn radicalInverseVdC(bits_in: u32) -> f32 {
                var bits = bits_in;
                bits = (bits << 16u) | (bits >> 16u);
                bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
                bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
                bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
                bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
                return f32(bits) * 2.3283064365386963e-10;
            }

            fn hammersley(i: u32, n: u32) -> vec2f {
                return vec2f(f32(i) / f32(n), radicalInverseVdC(i));
            }

            fn geometrySchlickGGX(nDotV: f32, roughness: f32) -> f32 {
                let a = roughness;
                let k = (a * a) / 2.0;
              
                let nom = nDotV;
                let denom = nDotV * (1.0 - k) + k;
              
                return nom / denom;
            }
            
            fn integrateBRDF(NdotV: f32, roughness: f32) -> vec2f {
                var V: vec3f;
                V.x = sqrt(1.0 - NdotV * NdotV);
                V.y = 0.0;
                V.z = NdotV;
                
                var A: f32 = 0.0;
                var B: f32 = 0.0;
                
                let N = vec3f(0.0, 0.0, 1.0);
                
                let SAMPLE_COUNT: u32 = 1024u;
                for(var i: u32 = 0u; i < SAMPLE_COUNT; i = i + 1u) {
                    let Xi: vec2f = hammersley(i, SAMPLE_COUNT);
                    let H: vec3f = importanceSampleGGX(Xi, N, roughness);
                    let L: vec3f = normalize(2.0 * dot(V, H) * H - V);
                
                    let NdotL: f32 = max(L.z, 0.0);
                    let NdotH: f32 = max(H.z, 0.0);
                    let VdotH: f32 = max(dot(V, H), 0.0);
                
                    if(NdotL > 0.0) {
                        let G: f32 = geometrySmith(N, V, L, roughness);
                        let G_Vis: f32 = (G * VdotH) / (NdotH * NdotV);
                        let Fc: f32 = pow(1.0 - VdotH, 5.0);
                
                        A += (1.0 - Fc) * G_Vis;
                        B += Fc * G_Vis;
                    }
                }
                A /= f32(SAMPLE_COUNT);
                B /= f32(SAMPLE_COUNT);
                return vec2f(A, B);
            }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec2<f32> {
              return integrateBRDF(uv.x, uv.y);
            }
          `
      ),
      colorOutputs: [{ format: "rg16float" }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {}
    });
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass(`BRDFLUT`, [{ target: renderTarget, clear: true }]);
    GPU.RendererContext.DrawGeometry(geometry, shader);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
    return renderTarget;
  }
}

export { HDRParser };
