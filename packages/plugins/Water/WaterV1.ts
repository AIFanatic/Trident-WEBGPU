// Ported from: https://github.com/clayjohn/godot-realistic-water/blob/fix-for-4.2/realistic_water_shader/

import { GameObject, Geometry, IndexAttribute, VertexAttribute, Components, Component, Renderer, GPU, Scene, Runtime, Mathf, Assets } from "@trident/core";
import { DataBackedBuffer } from "@trident/plugins/DataBackedBuffer";

const WaterPassWGSL = "./resources/WaterPassV1.wgsl";

const uv_sampler_texture_url = "./resources/textures/Water_UV.png";
const normalmap_a_sampler_texture_url = "./resources/textures/Water_N_C.png";
const normalmap_b_sampler_texture_url = "./resources/textures/Water_N_D.png";
const foam_sampler_texture_url = "./resources/textures/Foam.png";
const caustic_sampler_texture_url = "./resources/textures/Caustic.png";

const perlin_noise = "./resources/textures/perlin_256x256.png";

import water_render_v2_wgsl_url from "./resources/WaterRenderV2.wgsl" with { type: "text" };
Assets.Register("@trident/plugins/Water/resources/WaterRenderV2.wgsl", water_render_v2_wgsl_url);

function PlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1): Geometry {
    const width_half = width / 2;
    const height_half = height / 2;

    const gridX = Math.floor(widthSegments);
    const gridY = Math.floor(heightSegments);

    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;

    const segment_width = width / gridX;
    const segment_height = height / gridY;

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];

    for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segment_height - height_half;
        for (let ix = 0; ix < gridX1; ix++) {
            const x = ix * segment_width - width_half;
            vertices.push(x, - y, 0);
            normals.push(0, 0, 1);
            uvs.push(ix / gridX);
            uvs.push(1 - (iy / gridY));
        }
    }


    for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
            const a = ix + gridX1 * iy;
            const b = ix + gridX1 * (iy + 1);
            const c = (ix + 1) + gridX1 * (iy + 1);
            const d = (ix + 1) + gridX1 * iy;

            indices.push(a, b, d);
            indices.push(b, c, d);
        }
    }

    const geometry = new Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));

    return geometry;
}

export interface WaterSettings {
    wave_speed: [number, number, number, number], // Speed scale for the waves

    wave_a: [number, number, number, number], // xy = Direction, z = Steepness, w = Length
    wave_b: [number, number, number, number], // xy = Direction, z = Steepness, w = Length
    wave_c: [number, number, number, number], // xy = Direction, z = Steepness, w = Length

    sampler_scale: [number, number, number, number], // Scale for the sampler
    sampler_direction: [number, number, number, number], // Direction and speed for the sampler offset

    uv_sampler_scale: [number, number, number, number], // UV sampler scale
    uv_sampler_strength: [number, number, number, number], // UV shifting strength

    foam_level: [number, number, number, number], // Foam level -> distance from the object (0.0 - 0.5)

    refraction: [number, number, number, number], // Refraction of the water

    color_deep: [number, number, number, number], // Color for deep places in the water
    color_shallow: [number, number, number, number], // Color for lower places in the water,

    beers_law: [number, number, number, number], // Beers law value, regulates the blending size to the deep water level
    depth_offset: [number, number, number, number], // Offset for the blending
};

interface WaterInfo {
    settings: DataBackedBuffer<WaterSettings>;
    transform: Components.Transform;
};

class WaterRenderPass extends GPU.RenderPass {
    public name: string = "WaterRenderPass";

    private lightingClone: GPU.RenderTexture;
    private depthClone: GPU.DepthTexture;
    private waterShader: GPU.Shader;

    // public readonly settings: DataBackedBuffer<WaterSettings>;

    public readonly waterGeometries: Map<Geometry, WaterInfo>;

    private waterSettingsBuffer: GPU.Buffer;

    constructor() {
        super();
        this.waterGeometries = new Map();
    }

    public async init(resources: GPU.ResourcePool) {
        const GBufferFormat = Runtime.Renderer.RenderPipeline.GBufferFormat;

        const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;
        this.waterShader = await GPU.Shader.Create({
            code: await GPU.ShaderLoader.LoadURL(new URL(WaterPassWGSL, import.meta.url)),
            colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
            depthOutput: "depth24plus",
            cullMode: "none",
        })


        const uv_sampler_texture = await GPU.Texture.Load(new URL(uv_sampler_texture_url, import.meta.url));
        const normalmap_a_sampler_texture = await GPU.Texture.Load(new URL(normalmap_a_sampler_texture_url, import.meta.url));
        const normalmap_b_sampler_texture = await GPU.Texture.Load(new URL(normalmap_b_sampler_texture_url, import.meta.url));
        const foam_sampler_texture = await GPU.Texture.Load(new URL(foam_sampler_texture_url, import.meta.url));
        const caustic_sampler_texture = await GPU.Texture.Load(new URL(caustic_sampler_texture_url, import.meta.url));

        uv_sampler_texture.GenerateMips();
        normalmap_a_sampler_texture.GenerateMips();
        normalmap_b_sampler_texture.GenerateMips();
        foam_sampler_texture.GenerateMips();

        this.waterShader.SetTexture("uv_sampler", uv_sampler_texture);
        this.waterShader.SetTexture("normalmap_a_sampler", normalmap_a_sampler_texture);
        this.waterShader.SetTexture("normalmap_b_sampler", normalmap_b_sampler_texture);
        this.waterShader.SetTexture("foam_sampler", foam_sampler_texture);
        this.waterShader.SetTexture("caustic_sampler", caustic_sampler_texture);
        this.waterShader.SetSampler("texture_sampler", new GPU.TextureSampler());
        this.waterShader.SetSampler("depth_texture_sampler", new GPU.TextureSampler({ compare: "less-equal" }));

        this.waterShader.SetTexture("perlin", await GPU.Texture.Load(new URL(perlin_noise, import.meta.url)));

        // this.lightingClone = GPU.RenderTexture.Create(Renderer.width, Renderer.height, 1, GBufferFormat, 1 + Math.log2(Renderer.width) | 0);
        this.lightingClone = GPU.RenderTexture.Create(Renderer.width, Renderer.height, 1, GBufferFormat);
        this.lightingClone.name = "LightingCloneWater"
        this.depthClone = GPU.DepthTexture.Create(Renderer.width, Renderer.height);

        // Ideally get 14 from WaterSettings
        this.waterSettingsBuffer = new GPU.Buffer(14 * 4 * 4, GPU.BufferType.STORAGE);
        this.waterShader.SetBuffer("waveSettings", this.waterSettingsBuffer);

        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        if (this.waterGeometries.size === 0) return;

        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        const currentLightingPass = resources.getResource(GPU.PassParams.LightingPassOutput);
        const currentAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const currentNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const currentERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const currentDepth = resources.getResource(GPU.PassParams.GBufferDepth);

        if (!currentLightingPass || !currentDepth) return;

        GPU.RendererContext.CopyTextureToTextureV3({ texture: currentAlbedo }, { texture: this.lightingClone });
        // this.lightingClone.GenerateMips();
        GPU.RendererContext.CopyTextureToTextureV3({ texture: currentDepth }, { texture: this.depthClone });

        GPU.RendererContext.BeginRenderPass(this.name, [
            { target: currentAlbedo, clear: false },
            { target: currentNormal, clear: false },
            { target: currentERMO, clear: false },
        ],
            { target: currentDepth, clear: false }, true);

        this.waterShader.SetBuffer("frameBuffer", FrameBuffer);
        this.waterShader.SetTexture("SCREEN_TEXTURE", this.lightingClone);
        this.waterShader.SetTexture("DEPTH_TEXTURE", this.depthClone);
        this.waterShader.SetValue("TIME", performance.now() / 1000);

        for (const [geometry, waterInfo] of this.waterGeometries) {
            // TODO: This is bad, causes context switching, use dynamic buffers or storage array
            this.waterShader.SetBuffer("waveSettings", waterInfo.settings.buffer);
            // RendererContext.CopyBufferToBuffer(waterInfo.settings.buffer, this.waterSettingsBuffer);
            this.waterShader.SetMatrix4("modelMatrix", waterInfo.transform.localToWorldMatrix);
            GPU.RendererContext.DrawGeometry(geometry, this.waterShader, 1);
        }

        GPU.RendererContext.EndRenderPass();
    }
}

export class WaterV1 extends Component {
    public static type = "@trident/plugins/Water";
    public settings: DataBackedBuffer<WaterSettings>;

    // TODO: Hack, fix
    private static WaterRenderPass: WaterRenderPass;
    private static WaterRenderPassScene: Scene;

    private geometry: Geometry;

    constructor(gameObject: GameObject) {
        super(gameObject);

        if (!WaterV1.WaterRenderPass || WaterV1.WaterRenderPassScene !== gameObject.scene) {
            WaterV1.WaterRenderPass = new WaterRenderPass();
            WaterV1.WaterRenderPassScene = gameObject.scene;
            Runtime.Renderer.RenderPipeline.AddPass(WaterV1.WaterRenderPass, GPU.RenderPassOrder.BeforeLighting);
        }

        this.geometry = PlaneGeometry(1, 1, 256, 256);

        this.settings = new DataBackedBuffer<WaterSettings>({
            wave_speed: [0.5, 0.0, 0.0, 0.0],

            // wave_a: [1.0, 0.4, 0.5, 3.0],
            // wave_b: [-0.1, 0.6, 0.3, 1.55],
            // wave_c: [-1.0, -0.8, 0.1, 0.9],

  wave_a: [0.93, 0.37, 0.13, 32.0],
  wave_b: [-0.41, 0.91, 0.12, 12.0],
  wave_c: [0.12, -0.99, 0.065, 4.4],

            sampler_scale: [0.125, 0.125, 0.0, 0.0],
            sampler_direction: [0.005, 0.004, 0.0, 0.0],

            uv_sampler_scale: [0.25, 0.25, 0.0, 0.0],
            uv_sampler_strength: [0.04, 0.0, 0.0, 0.0],

            foam_level: [0.75, 0.0, 0.0, 0.0],

            refraction: [0.075, 0.0, 0.0, 0.0],

            // color_deep: [0.32, 0.4, 0.5, 1.0],
            // color_shallow: [0.66, 0.75, 0.76, 1.0],

            color_shallow: [0.0, 0.4, 0.45, 1.0],
            // color_deep: [0.1, 0.5, 0.5, 1.0],
            color_deep: [0.0, 0.0, 0.0, 1.0],

            beers_law: [0.2, 0.0, 0.0, 0.0],
            depth_offset: [0.75, 0.0, 0.0, 0.0],
        });

        WaterV1.WaterRenderPass.waterGeometries.set(this.geometry, {
            settings: this.settings,
            transform: this.transform
        })
    }

    public Destroy(): void {
        WaterV1.WaterRenderPass?.waterGeometries.delete(this.geometry);

        if (this.geometry) this.geometry.Destroy();
        if (this.settings) this.settings.buffer.Destroy();

        super.Destroy();
    }
}