// import { ShaderCode } from "../ShaderCode";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTexture } from "./WEBGPUTexture";

export class WEBGPUMipsGenerator {
    private static sampler;
    private static module;
    private static pipelineByFormat = {};

    private static numMipLevels (...sizes) { return 1 + Math.log2(Math.max(...sizes)) | 0 }

    // TODO: Cannot call this twice because of texture usages
    public static generateMips(source: WEBGPUTexture): GPUTexture {
        if (!WEBGPURenderer.device) throw Error("WEBGPU not initialized");

        const device = WEBGPURenderer.device;
        const sourceBuffer = source.GetBuffer();

        if (!this.module) {
            this.module = device.createShaderModule({
                label: 'textured quad shaders for mip level generation',
                code: ShaderCode.QuadShader,
            });

            this.sampler = device.createSampler({minFilter: 'linear', magFilter: 'linear'});
        }

        if (!this.pipelineByFormat[sourceBuffer.format]) {
            this.pipelineByFormat[sourceBuffer.format] = device.createRenderPipeline({
                label: 'mip level generator pipeline',
                layout: 'auto',
                vertex: { module: this.module },
                fragment: { module: this.module, targets: [{ format: sourceBuffer.format }] },
            });
        }
        const pipeline = this.pipelineByFormat[sourceBuffer.format];

        const encoder = device.createCommandEncoder({ label: 'mip gen encoder' });

        const destinationBuffer = device.createTexture({
        format: sourceBuffer.format,
        mipLevelCount: this.numMipLevels(source.width, source.height),
        size: [source.width, source.height, 1],
        usage: GPUTextureUsage.TEXTURE_BINDING |
                GPUTextureUsage.COPY_DST |
                GPUTextureUsage.RENDER_ATTACHMENT,
        });

        let width = sourceBuffer.width;
        let height = sourceBuffer.height;

        encoder.copyTextureToTexture({texture: sourceBuffer}, {texture: destinationBuffer}, [width, height]);
        
        let baseMipLevel = 0;
        while (width > 1 || height > 1) {
            width = Math.max(1, width / 2 | 0);
            height = Math.max(1, height / 2 | 0);

            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: this.sampler },
                    { binding: 1, resource: destinationBuffer.createView({ baseMipLevel: baseMipLevel, mipLevelCount: 1 }) },
                ],
            });

            ++baseMipLevel;

            const renderPassDescriptor: GPURenderPassDescriptor = {
                label: 'WEBGPUMipsGenerator',
                colorAttachments: [
                    {
                        view: destinationBuffer.createView({ baseMipLevel: baseMipLevel, mipLevelCount: 1 }),
                        loadOp: 'clear',
                        storeOp: 'store',
                    },
                ],
            };

            const pass = encoder.beginRenderPass(renderPassDescriptor);
            pass.setPipeline(pipeline);
            pass.setBindGroup(0, bindGroup);
            pass.draw(6);  // call our vertex shader 6 times
            pass.end();
        }

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        return destinationBuffer;
    };
}