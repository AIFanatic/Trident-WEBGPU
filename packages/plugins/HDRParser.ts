import { Geometry, GPU } from "@trident/core";

export class HDRParser {
    private static radiancePattern = "#\\?RADIANCE";
    private static commentPattern = "#.*";
    private static exposurePattern = "EXPOSURE=\\s*([0-9]*[.][0-9]*)";
    private static formatPattern = "FORMAT=32-bit_rle_rgbe";
    private static widthHeightPattern = "-Y ([0-9]+) \\+X ([0-9]+)";

    private static ImageFormat: GPU.TextureFormat = "rgba16float";

    private static readPixelsRawRLE(buffer: Uint8Array, data: Uint8Array, offset: number, fileOffset: number, scanlineWidth: number, scanlinesCount: number) {
        const rgbe = new Array<number>(4);
        let scanlineBuffer: number[] | null = null;
        let ptr;
        let ptr_end;
        let count;
        const twoBytes = new Array<number>(2);
        const bufferLength = buffer.length;

        function readBuf(buf: Uint8Array | number[]) {
            let bytesRead = 0;
            do {
                buf[bytesRead++] = buffer[fileOffset];
                fileOffset += 1;
            } while (fileOffset < bufferLength && bytesRead < buf.length);
            return bytesRead;
        }

        function readBufferOffset(
            buf: Uint8Array | number[],
            offset: number,
            length: number,
        ) {
            let bytesRead = 0;
            do {
                buf[offset + bytesRead] = buffer[fileOffset];
                bytesRead += 1;
                fileOffset += 1;
            } while (fileOffset < bufferLength && bytesRead < length);
            return bytesRead;
        }

        function readPixelsRaw(data: Uint8Array, offset: number, numpixels: number) {
            const numExpected = 4 * numpixels;
            let readCount = readBufferOffset(data, offset, numExpected);
            if (readCount < numExpected) {
                throw new Error(
                    "Error reading raw pixels: got " +
                    readCount +
                    " bytes, expected " +
                    numExpected,
                );
            }
        }

        while (scanlinesCount > 0) {
            if (readBuf(rgbe) < rgbe.length) {
                throw new Error("Error reading bytes: expected " + rgbe.length);
            }

            if (rgbe[0] != 2 || rgbe[1] != 2 || (rgbe[2] & 0x80) != 0) {
                //this file is not run length encoded
                data[offset + 0] = rgbe[0];
                data[offset + 1] = rgbe[1];
                data[offset + 2] = rgbe[2];
                data[offset + 3] = rgbe[3];
                offset += 4;
                readPixelsRaw(data, offset, scanlineWidth * scanlinesCount - 1);
                return;
            }

            if ((((rgbe[2] & 0xff) << 8) | (rgbe[3] & 0xff)) != scanlineWidth) {
                throw new Error(
                    "Wrong scanline width " +
                    (((rgbe[2] & 0xff) << 8) | (rgbe[3] & 0xff)) +
                    ", expected " +
                    scanlineWidth,
                );
            }

            if (scanlineBuffer == null) {
                scanlineBuffer = new Array<number>(4 * scanlineWidth);
            }

            ptr = 0;
            // Read each of the four channels for the scanline into the buffer.
            for (let i = 0; i < 4; i += 1) {
                ptr_end = (i + 1) * scanlineWidth;
                while (ptr < ptr_end) {
                    if (readBuf(twoBytes) < twoBytes.length) {
                        throw new Error("Error reading 2-byte buffer");
                    }
                    if ((twoBytes[0] & 0xff) > 128) {
                        /* a run of the same value */
                        count = (twoBytes[0] & 0xff) - 128;
                        if (count == 0 || count > ptr_end - ptr) {
                            throw new Error("Bad scanline data");
                        }
                        while (count-- > 0) {
                            scanlineBuffer[ptr++] = twoBytes[1];
                        }
                    } else {
                        /* a non-run */
                        count = twoBytes[0] & 0xff;
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


    public static async Load(url: string): Promise<GPU.RenderTexture> {
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
        let rle = false;

        for (let i = 0; i < 20; i += 1) {
            let line = readLine();
            let match;
            if ((match = line.match(HDRParser.radiancePattern))) {
            } else if ((match = line.match(HDRParser.formatPattern))) {
                rle = true;
            } else if ((match = line.match(HDRParser.exposurePattern))) {
                exposure = Number(match[1]);
            } else if ((match = line.match(HDRParser.commentPattern))) {
            } else if ((match = line.match(HDRParser.widthHeightPattern))) {
                height = Number(match[1]);
                width = Number(match[2]);
                break;
            }
        }

        let data = new Uint8Array(width * height * 4);
        let scanlineWidth = width;
        let scanlinesCount = height;

        HDRParser.readPixelsRawRLE(buffer, data, 0, fileOffset, scanlineWidth, scanlinesCount);


        function acesToneMapping(x: number): number {
            const a = 2.51;
            const b = 0.03;
            const c = 2.43;
            const d = 0.59;
            const e = 0.14;
            // Same structure as WGSL: max(0, ...)
            const y = (x * (a * x + b)) / (x * (c * x + d) + e);
            return Math.max(0, y);
        }

        function linearToSRGB(linearValue: number): number {
            // IMPORTANT: clamp to avoid NaN from pow(negative, frac)
            const v = Math.max(0, linearValue);
            if (v <= 0.0031308) return 12.92 * v;
            return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        }

        // Use the parsed header exposure if you want, and/or allow user exposure
        const exposureMul = exposure; // or exposure * userExposure

        let floatData = new Float16Array(width * height * 4);

        for (let offset = 0; offset < data.length; offset += 4) {
            let r = data[offset + 0] / 255;
            let g = data[offset + 1] / 255;
            let b = data[offset + 2] / 255;
            const e = data[offset + 3];

            // RGBE -> linear HDR scale
            const scale = Math.pow(2.0, e - 128.0);
            r *= scale;
            g *= scale;
            b *= scale;

            // === Match WGSL pipeline ===
            r *= exposureMul;
            g *= exposureMul;
            b *= exposureMul;

            r = acesToneMapping(r);
            g = acesToneMapping(g);
            b = acesToneMapping(b);

            // r = linearToSRGB(r);
            // g = linearToSRGB(g);
            // b = linearToSRGB(b);

            // Store (sRGB in float16)
            const i = offset; // same indexing since offset steps by 4
            floatData[i + 0] = r;
            floatData[i + 1] = g;
            floatData[i + 2] = b;
            floatData[i + 3] = 1.0;
        }

        const dstHDR = GPU.RenderTexture.Create(width, height, 1, HDRParser.ImageFormat);
        dstHDR.SetData(floatData, width * 8);
        return dstHDR;
    }

    public static async ToCubemap(hdr: GPU.Texture): Promise<GPU.RenderTextureCube> {
        const faceSize = Math.min((hdr.width / 2) | 0, hdr.height | 0);
        console.log("faceSize", faceSize)
        const renderTarget = GPU.RenderTextureCube.Create(faceSize, faceSize, 6, "rgba16float");
        renderTarget.SetName("Skybox");

        const hdrSampler = GPU.TextureSampler.Create({
            minFilter: "linear", magFilter: "linear", mipmapFilter: "linear",
            addressModeU: "repeat", addressModeV: "clamp-to-edge",
        });

        const geometry = Geometry.Plane();
        const shader = await GPU.Shader.Create({
            code: /* wgsl */`
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
      let u = x;
      let v = y;
      switch face {
          case 0u { return normalize(vec3( 1.0,  v, -u)); } // +X
          case 1u { return normalize(vec3(-1.0,  v,  u)); } // -X
          case 2u { return normalize(vec3( u,  1.0, -v)); } // +Y
          case 3u { return normalize(vec3( u, -1.0,  v)); } // -Y
          case 4u { return normalize(vec3( u,  v,  1.0)); } // +Z
          default { return normalize(vec3(-u,  v, -1.0)); } // -Z
      }
  }
      
            const invAtan = vec2f(0.15915494309189535, 0.3183098861837907);
      
        fn sampleSphericalMap(v: vec3f) -> vec2f {
            var st = vec2f(atan2(v.z, v.x), asin(v.y));
            st *= invAtan;
            st = vec2f(st.x + 0.5, 1.0 - (st.y + 0.5)); // flip Y here
            return st;
        }
      
            @fragment
            fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y);
                let st  = sampleSphericalMap(dir);
                let col = textureSample(hdrTexture, hdrSampler, st).rgb;
                return vec4f(col, 1.0);
            }
          `,
            colorOutputs: [{ format: renderTarget.format }],
            attributes: { position: { location: 0, size: 3, type: "vec3" } },
            uniforms: {
                hdrTexture: { group: 0, binding: 1, type: "texture" },
                hdrSampler: { group: 0, binding: 2, type: "sampler" },
                face: { group: 0, binding: 3, type: "storage" },
            }
        });

        const params = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);

        shader.SetTexture("hdrTexture", hdr);
        shader.SetSampler("hdrSampler", hdrSampler);
        shader.SetBuffer("face", params);

        for (let face = 0; face < 6; face++) {
            params.SetArray(new Float32Array([face, 0, 0, 0]));

            GPU.Renderer.BeginRenderFrame();
            renderTarget.SetActiveLayer(face);
            GPU.RendererContext.BeginRenderPass(`EquirectToCubeFace_${face}`, [{ target: renderTarget, clear: true }]);
            GPU.RendererContext.DrawGeometry(geometry, shader);
            GPU.RendererContext.EndRenderPass();
            GPU.Renderer.EndRenderFrame();
        }

        renderTarget.GenerateMips();
        return renderTarget;
    }
}
