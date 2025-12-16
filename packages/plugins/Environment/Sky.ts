import { Assets, GPU, Geometry } from "@trident/core";

import CommonWGSL from "./resources/Common.wgsl";
import VertexWGSL from "./resources/Vertex.wgsl";
import TransmittanceLUTWGSL from "./resources/TransmittanceLUT.wgsl";
import SkyAtmosphereWGSL from "./resources/SkyAtmosphere.wgsl";
import CubemapWGSL from "./resources/Cubemap.wgsl";

Assets.Register("@trident/plugins/Sky/resources/Common.wgsl", CommonWGSL);
Assets.Register("@trident/plugins/Sky/resources/Vertex.wgsl", VertexWGSL);

export class Sky {
    public SUN_ELEVATION_DEGREES = 60;
    public SUN_AZIMUTH_DEGREES = 0;
    public EYE_ALTITUDE = 0.5;

    public skyTexture: GPU.RenderTexture;
    public skyTextureCubemap: GPU.RenderTexture;
    
    private transmittanceLUT: GPU.RenderTexture;

    private name = "Sky";
    private initialized = false;

    private geometry: Geometry;
    private transmittanceLUTShader: GPU.Shader;
    private skyTextureShader: GPU.Shader;

    private cubemapShader: GPU.Shader;

    constructor(cubemapRes = 512) {
        this.skyTextureCubemap = GPU.RenderTextureCube.Create(cubemapRes, cubemapRes, 6, "rgba16float");
    }

    public async init() {
        this.transmittanceLUTShader = await GPU.Shader.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(TransmittanceLUTWGSL),
            colorOutputs: [ { format: "rgba16float" } ],
            uniforms: {
                params: {group: 0, binding: 0, type: "storage"}
            },
        });

        this.skyTextureShader = await GPU.Shader.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(SkyAtmosphereWGSL),
            colorOutputs: [ { format: "rgba16float" } ],
            uniforms: {
                params: {group: 0, binding: 0, type: "storage"},
                textureSampler: { group: 0, binding: 1, type: "sampler" },
                TransmittanceLUTTexture: { group: 0, binding: 2, type: "texture" },
            },
        });

        this.cubemapShader = await GPU.Shader.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(CubemapWGSL),
            colorOutputs: [{ format: this.skyTextureCubemap.format }],
            attributes: { position: { location: 0, size: 3, type: "vec3" } },
            uniforms: {
                hdrTexture: { group: 0, binding: 1, type: "texture" },
                hdrSampler: { group: 0, binding: 2, type: "sampler" },
                face: { group: 0, binding: 3, type: "storage" },
            }
        });

        this.geometry = Geometry.Plane();

        this.transmittanceLUT = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        this.skyTexture = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");

        this.skyTextureShader.SetSampler("textureSampler", GPU.TextureSampler.Create());

        const hdrSampler = GPU.TextureSampler.Create({minFilter: "linear", magFilter: "linear", mipmapFilter: "linear", addressModeU: "repeat", addressModeV: "clamp-to-edge"});
        this.cubemapShader.SetSampler("hdrSampler", hdrSampler);

        this.initialized = true;

        this.Update();
    }

    public Update() {
        if (!this.initialized) return;

        const params = new Float32Array([this.SUN_ELEVATION_DEGREES, this.SUN_AZIMUTH_DEGREES, this.EYE_ALTITUDE, 0]);
        this.transmittanceLUTShader.SetArray("params", params);
        this.skyTextureShader.SetArray("params", params);

        // TODO: TransmittanceLUT doesn't have to be generated whenever the sky changes
        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.transmittanceLUT, clear: true }]);
        GPU.RendererContext.Draw(this.geometry, this.transmittanceLUTShader, 3);
        GPU.RendererContext.EndRenderPass();

        this.skyTextureShader.SetTexture("TransmittanceLUTTexture", this.transmittanceLUT);
        GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.skyTexture, clear: true }]);
        GPU.RendererContext.Draw(this.geometry, this.skyTextureShader, 3);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();

        // Cubemap
        this.cubemapShader.SetTexture("hdrTexture", this.skyTexture);

        for (let face = 0; face < 6; face++) {
            this.cubemapShader.SetArray("face", new Float32Array([face, 0, 0, 0]));

            GPU.Renderer.BeginRenderFrame();
            this.skyTextureCubemap.SetActiveLayer(face);
            GPU.RendererContext.BeginRenderPass(`EquirectToCubeFace_${face}`, [{ target: this.skyTextureCubemap, clear: true }]);
            GPU.RendererContext.DrawGeometry(this.geometry, this.cubemapShader);
            GPU.RendererContext.EndRenderPass();
            GPU.Renderer.EndRenderFrame();
        }
    }
}