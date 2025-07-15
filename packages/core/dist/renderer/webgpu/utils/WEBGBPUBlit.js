import { Geometry } from "../../../Geometry";
import { Renderer } from "../../Renderer";
import { RendererContext } from "../../RendererContext";
import { Shader } from "../../Shader";
import { ShaderLoader } from "../../ShaderUtils";
import { TextureSampler } from "../../TextureSampler";
import { WEBGPURenderer } from "../WEBGPURenderer";
const i = setInterval(async () => {
    if (Renderer.type === "webgpu") {
        WEBGPUBlit.blitShader = await Shader.Create({
            code: await ShaderLoader.Blit,
            colorOutputs: [{ format: Renderer.SwapChainFormat }],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: { group: 0, binding: 0, type: "texture" },
                textureSampler: { group: 0, binding: 1, type: "sampler" },
                mip: { group: 0, binding: 2, type: "storage" },
                uv_scale: { group: 0, binding: 3, type: "storage" },
            },
        });
        const textureSampler = TextureSampler.Create();
        WEBGPUBlit.blitShader.SetSampler("textureSampler", textureSampler);
        WEBGPUBlit.blitShader.SetValue("mip", 0);
        clearInterval(i);
    }
}, 100);
export class WEBGPUBlit {
    static blitShader;
    static blitGeometry;
    static Blit(source, destination, width, height, uv_scale) {
        if (!this.blitShader)
            throw Error("Blit shader not created");
        if (!this.blitGeometry)
            this.blitGeometry = Geometry.Plane();
        this.blitShader.SetTexture("texture", source);
        this.blitShader.SetArray("uv_scale", uv_scale.elements);
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder)
            Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }]);
        RendererContext.SetViewport(0, 0, width, height);
        RendererContext.DrawGeometry(this.blitGeometry, this.blitShader);
        RendererContext.EndRenderPass();
        if (!activeCommandEncoder)
            Renderer.EndRenderFrame();
    }
}
