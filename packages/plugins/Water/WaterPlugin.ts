// Ported from: https://github.com/clayjohn/godot-realistic-water/blob/fix-for-4.2/realistic_water_shader/

import {
    GameObject,
    Geometry,
    IndexAttribute,
    VertexAttribute,
    Components,
    Component,
    Renderer,
    GPU,
    Scene
} from "@trident/core";

import { DataBackedBuffer } from "@trident/plugins/DataBackedBuffer";

const WaterPassWGSL = "./resources/WaterPass.wgsl";
const uv_sampler_texture_url = "./resources/textures/Water_UV.png";
const normalmap_a_sampler_texture_url = "./resources/textures/Water_N_A.png";
const normalmap_b_sampler_texture_url = "./resources/textures/Water_N_B.png";
const foam_sampler_texture_url = "./resources/textures/Foam.png";
const caustic_sampler_texture_url = "./resources/textures/Caustic.png";

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
            normals.push( 0, 0, 1 );
            uvs.push( ix / gridX );
            uvs.push( 1 - ( iy / gridY ) );
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

    private albedoClone: GPU.RenderTexture;
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
        const GBufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;

        this.waterShader = await GPU.Shader.Create({
            // code: await Assets.Load("./WaterPass.wgsl", "json"),
            code: await GPU.ShaderLoader.LoadURL(new URL(WaterPassWGSL, import.meta.url)),
            colorOutputs: [
                { format: GBufferFormat },
                { format: GBufferFormat },
                { format: GBufferFormat },
            ],
            depthOutput: "depth24plus",
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
        this.waterShader.SetSampler("texture_sampler", GPU.TextureSampler.Create());
        this.waterShader.SetSampler("depth_texture_sampler", GPU.TextureSampler.Create({compare: "less-equal"}));

        this.albedoClone = GPU.RenderTexture.Create(Renderer.width, Renderer.height, 1, GBufferFormat);
        this.depthClone = GPU.DepthTexture.Create(Renderer.width, Renderer.height);


        // Ideally get 14 from WaterSettings
        this.waterSettingsBuffer = GPU.Buffer.Create(14 * 4 * 4, GPU.BufferType.STORAGE);
        this.waterShader.SetBuffer("waveSettings", this.waterSettingsBuffer);

        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        const scene = Components.Camera.mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Components.Mesh);
        if (meshes.length === 0) return;

        const inputCamera = Components.Camera.mainCamera;
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const backgroundColor = inputCamera.backgroundColor;

        const currentAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const currentDepth = resources.getResource(GPU.PassParams.GBufferDepth);

        if (!currentAlbedo || !currentDepth) return;

        GPU.RendererContext.CopyTextureToTexture(currentAlbedo, this.albedoClone);
        GPU.RendererContext.CopyTextureToTexture(currentDepth, this.depthClone);

        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const inputGBufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        GPU.RendererContext.BeginRenderPass(this.name,
            [
                { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
                { target: inputGBufferNormal, clear: false, color: backgroundColor },
                { target: inputGBufferERMO, clear: false, color: backgroundColor },
            ]
            , { target: inputGBufferDepth, clear: false }
            , true);

        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;

        this.waterShader.SetBuffer("frameBuffer", FrameBuffer);
        this.waterShader.SetTexture("SCREEN_TEXTURE", this.albedoClone);
        this.waterShader.SetTexture("DEPTH_TEXTURE", this.depthClone);
        this.waterShader.SetValue("TIME", performance.now() / 1000);
        this.waterShader.SetMatrix4("INV_PROJECTION_MATRIX", projectionMatrix.clone().invert());
        this.waterShader.SetMatrix4("INV_VIEW_MATRIX", viewMatrix.clone().invert());

        for (const [geometry, waterInfo] of this.waterGeometries) {
            // TODO: This is bad, causes context switching, use dynamic buffers or storage array
            this.waterShader.SetBuffer("waveSettings", waterInfo.settings.buffer);
            // RendererContext.CopyBufferToBuffer(waterInfo.settings.buffer, this.waterSettingsBuffer);
            this.waterShader.SetMatrix4("modelMatrix", waterInfo.transform.localToWorldMatrix);
            this.waterShader.SetMatrix4("inv_mvp", projectionMatrix.clone().mul(viewMatrix).mul(waterInfo.transform.localToWorldMatrix).invert());
            GPU.RendererContext.DrawGeometry(geometry, this.waterShader, 1);
        }

        GPU.RendererContext.EndRenderPass();
    }
}

export class Water extends Component {
    public static type = "@trident/plugins/Water";
    public settings: DataBackedBuffer<WaterSettings>;

    // TODO: Hack, fix
    private static WaterRenderPass: WaterRenderPass;
    private static WaterRenderPassScene: Scene;

    private geometry: Geometry;

    constructor(gameObject: GameObject) {
        super(gameObject);

        if (!Water.WaterRenderPass || Water.WaterRenderPassScene !== gameObject.scene) {
            Water.WaterRenderPass = new WaterRenderPass();
            Water.WaterRenderPassScene = gameObject.scene;
            this.gameObject.scene.renderPipeline.AddPass(Water.WaterRenderPass, GPU.RenderPassOrder.BeforeLighting);
        }

        this.geometry = PlaneGeometry(1, 1, 256, 256);

        this.settings = new DataBackedBuffer<WaterSettings>({
            wave_speed: [0.5, 0.0, 0.0, 0.0],

            wave_a: [1.0, 0.4, 0.5, 3.0],
            wave_b: [-0.1, 0.6, 0.3, 1.55],
            wave_c: [-1.0, -0.8, 0.1, 0.9],
    
            sampler_scale: [0.25, 0.25, 0.0, 0.0],
            sampler_direction: [0.05, 0.04, 0.0, 0.0],
    
            uv_sampler_scale: [0.25, 0.25, 0.0, 0.0],
            uv_sampler_strength: [0.04, 0.0, 0.0, 0.0],
    
            foam_level: [0.75, 0.0, 0.0, 0.0],
    
            refraction: [0.075, 0.0, 0.0, 0.0],
    
            // color_deep: [0.32, 0.4, 0.5, 1.0],
            // color_shallow: [0.66, 0.75, 0.76, 1.0],

            color_shallow: [0.0, 0.4, 0.45, 1.0],
            color_deep: [0.1, 0.5, 0.5, 1.0],
    
            beers_law: [2.0, 0.0, 0.0, 0.0],
            depth_offset: [-0.75, 0.0, 0.0, 0.0],
        });

        Water.WaterRenderPass.waterGeometries.set(this.geometry, {
            settings: this.settings,
            transform: this.transform
        })
    }

    public Serialize(): Components.SerializedComponent {
        return {
            type: Water.type,
            settings: this.settings.Serialize()
        }
    }

    public Deserialize(data: any): void {
        this.settings.Deserialize(data.settings);
    }
}