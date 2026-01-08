import { WEBGPURenderer } from "../WEBGPURenderer";
import { WEBGPUTexture } from "../WEBGPUTexture";

export class WEBGPUCubeMipsGenerator {
    private static sampler: GPUSampler;
    private static module: GPUShaderModule;
    private static pipelineByFormat: Record<string, GPURenderPipeline> = {};

    public static numMipLevels(...sizes: number[]) { return 1 + Math.log2(Math.max(...sizes)) | 0 }

    public static generateMips(source: WEBGPUTexture): GPUTexture {
        if (!WEBGPURenderer.device) throw Error("WEBGPU not initialized");
        if (source.dimension !== "cube") throw Error("Cube mip generator requires cube texture");

        const device = WEBGPURenderer.device;
        const sourceBuffer = source.GetBuffer();

        if (!this.module) {
            this.module = device.createShaderModule({
                label: "cubemap mip generator shaders",
                code: `
                    struct VSOutput {
                        @builtin(position) position: vec4f,
                        @location(0) uv: vec2f,
                    };

                    @vertex
                    fn vs(@builtin(vertex_index) vertexIndex: u32) -> VSOutput {
                        // Fullscreen triangle
                        let pos = array<vec2f, 3>(
                            vec2f(-1.0, -1.0),
                            vec2f( 3.0, -1.0),
                            vec2f(-1.0,  3.0)
                        );
                        var out: VSOutput;
                        out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
                        out.uv = 0.5 * (pos[vertexIndex] + vec2f(1.0, 1.0));
                        return out;
                    }

                    @group(0) @binding(0) var ourSampler: sampler;
                    @group(0) @binding(1) var ourTexture: texture_cube<f32>;
                    @group(0) @binding(2) var<uniform> params: vec4f; // x=face, y=srcMip

                    fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                        let u = x * 2.0 - 1.0;
                        let v = y * 2.0 - 1.0;
                        switch face {
                            case 0u { return normalize(vec3( 1.0,  v, -u)); } // +X
                            case 1u { return normalize(vec3(-1.0,  v,  u)); } // -X
                            case 2u { return normalize(vec3( u,  1.0, -v)); } // +Y
                            case 3u { return normalize(vec3( u, -1.0,  v)); } // -Y
                            case 4u { return normalize(vec3( u,  v,  1.0)); } // +Z
                            default { return normalize(vec3(-u,  v, -1.0)); } // -Z
                        }
                    }

                    @fragment
                    fn fs(input: VSOutput) -> @location(0) vec4f {
                        let face = u32(params.x);
                        let srcMip = params.y;
                        let dir = dirFromFaceUV(face, input.uv.x, input.uv.y);
                        return vec4f(textureSampleLevel(ourTexture, ourSampler, dir, srcMip).rgb, 1.0);
                    }
                `,
            });

            this.sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
        }

        if (!this.pipelineByFormat[sourceBuffer.format]) {
            this.pipelineByFormat[sourceBuffer.format] = device.createRenderPipeline({
                label: "cubemap mip generator pipeline",
                layout: "auto",
                vertex: { module: this.module, entryPoint: "vs" },
                fragment: { module: this.module, entryPoint: "fs", targets: [{ format: sourceBuffer.format }] },
            });
        }
        const pipeline = this.pipelineByFormat[sourceBuffer.format];

        const mipLevels = this.numMipLevels(source.width, source.height);
        const encoder = device.createCommandEncoder({ label: "cubemap mip gen encoder" });

        const destinationBuffer = device.createTexture({
            label: "cubemap mip destination",
            format: sourceBuffer.format,
            mipLevelCount: mipLevels,
            size: [source.width, source.height, 6],
            dimension: "2d",
            usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.COPY_SRC |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        encoder.copyTextureToTexture(
            { texture: sourceBuffer },
            { texture: destinationBuffer },
            [source.width, source.height, 6]
        );

        for (let mip = 1; mip < mipLevels; mip++) {
            const srcMip = mip - 1;
            const mipWidth = Math.max(1, source.width >> mip);
            const mipHeight = Math.max(1, source.height >> mip);

            const cubeView = destinationBuffer.createView({
                dimension: "cube",
                baseMipLevel: srcMip,
                mipLevelCount: 1,
            });

            const faceBuffers: GPUBuffer[] = [];
            const faceBindGroups: GPUBindGroup[] = [];
            for (let face = 0; face < 6; face++) {
                const faceBuffer = device.createBuffer({
                    size: 16,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                device.queue.writeBuffer(faceBuffer, 0, new Float32Array([face, srcMip, 0, 0]));
                faceBuffers.push(faceBuffer);
                faceBindGroups.push(device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(0),
                    entries: [
                        { binding: 0, resource: this.sampler },
                        { binding: 1, resource: cubeView },
                        { binding: 2, resource: { buffer: faceBuffer } },
                    ],
                }));
            }

            for (let face = 0; face < 6; face++) {
                const pass = encoder.beginRenderPass({
                    label: `cubemap mip gen m${mip} f${face}`,
                    colorAttachments: [{
                        view: destinationBuffer.createView({
                            dimension: "2d",
                            baseArrayLayer: face,
                            arrayLayerCount: 1,
                            baseMipLevel: mip,
                            mipLevelCount: 1,
                        }),
                        loadOp: "clear",
                        storeOp: "store",
                    }],
                });
                pass.setPipeline(pipeline);
                pass.setBindGroup(0, faceBindGroups[face]);
                pass.setViewport(0, 0, mipWidth, mipHeight, 0, 1);
                pass.draw(3);
                pass.end();
            }
        }

        device.queue.submit([encoder.finish()]);
        return destinationBuffer;
    }
}
