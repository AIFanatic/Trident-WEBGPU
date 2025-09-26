import { Assets, Component, Components, GPU, GameObject, Geometry, Mathf, Utils } from "@trident/core";
import { AlphaKey, ColorKey, Gradient } from "./Gradient";

import WGSL_Structs from "./resources/structs.wgsl";
import WGSL_Draw from "./resources/draw.wgsl";
import WGSL_Compute from "./resources/update.wgsl";

Assets.Register("@trident/plugins/ParticleSystem/resources/structs.wgsl", WGSL_Structs);

enum ShapeType {
    Sphere,
    HemiSphere,
    Cone,
    Box
};

enum FrameOverTime {
    Constant,
    OverLifetime,
    Random
};

export class ParticleSystem extends Component {
    private geometry: Geometry;
    private material: GPU.Material;
    private instancedMesh: Components.InstancedMesh;

    private compute: GPU.Compute;
    private particleInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private lastTime = 0;

    @Utils.SerializeField public startSize: number = 1;
    @Utils.SerializeField public startLifetime: number = 20;

    // Emission
    @Utils.SerializeField public rateOverTime: number = 100;

    // Shape
    @Utils.SerializeField public shapeType: ShapeType = ShapeType.Cone;
    @Utils.SerializeField public emitFromShell: boolean = true;
    @Utils.SerializeField public radius: number = 1;
    @Utils.SerializeField public coneAngle: number = 25;
    @Utils.SerializeField public coneHeight: number = 1;
    @Utils.SerializeField public boxHalfExtents: Mathf.Vector3 = new Mathf.Vector3(0.5, 0.5, 0.5);

    // Texture sheet animation
    @Utils.SerializeField public texture: GPU.Texture;
    @Utils.SerializeField public textureTiles = new Mathf.Vector2(1, 1);
    @Utils.SerializeField public frameOvertime: FrameOverTime = FrameOverTime.Random;

    // Color over lifetime
    private _colorOverLifetimeGradients: Gradient = new Gradient();
    public get colorOverLifetimeGradients(): Gradient { return this._colorOverLifetimeGradients };
    public colorOverLifetimeAddColor(color: ColorKey) { this.colorOverLifetimeGradients.addColor(color); }
    public colorOverLifetimeAddAlpha(alpha: AlphaKey) { this.colorOverLifetimeGradients.addAlpha(alpha); }
    public colorOverLifetimeSetColorKeys(colorKeys: ColorKey[]) { this.colorOverLifetimeGradients.setColorKeys(colorKeys); }
    public colorOverLifetimeSetAlphaKeys(alphaKeys: AlphaKey[]) { this.colorOverLifetimeGradients.setAlphaKeys(alphaKeys); }

    @Utils.SerializeField public gravity = new Mathf.Vector3(0, 0, 0);

    private textureSampler: GPU.TextureSampler;


    private _startSpeed: Mathf.Vector3 = new Mathf.Vector3(1, 1, 1).mul(10);
    @Utils.SerializeField
    public get startSpeed(): Mathf.Vector3 { return this._startSpeed; }
    public set startSpeed(startSpeed: Mathf.Vector3) { this._startSpeed.copy(startSpeed); }

    constructor(gameObject: GameObject) {
        super(gameObject);

        this.init();
    }

    private async init() {
        this.material = new GPU.Material({
            isDeferred: false,
            shader: await GPU.Shader.Create({
                code: await GPU.ShaderPreprocessor.ProcessIncludesV2(WGSL_Draw),
                colorOutputs: [{ format: "rgba16float", blendMode: "premultiplied" }],
                depthOutput: "depth24plus",
                attributes: {
                    position: { location: 0, size: 3, type: "vec3" },
                    normal: { location: 1, size: 3, type: "vec3" },
                    uv: { location: 2, size: 2, type: "vec2" },
                },
                uniforms: {
                    projectionMatrix: { group: 0, binding: 0, type: "storage" },
                    viewMatrix: { group: 0, binding: 1, type: "storage" },
                    modelMatrix: { group: 0, binding: 2, type: "storage" },
                    particles: { group: 0, binding: 3, type: "storage" },
                    texture: { group: 0, binding: 4, type: "texture" },
                    textureSampler: { group: 0, binding: 5, type: "sampler" },
                    settings: { group: 0, binding: 6, type: "storage" },
                    colorOverLifetimeRamp: { group: 0, binding: 7, type: "texture" },
                },
                depthWriteEnabled: false
            })
        });

        this.instancedMesh = this.gameObject.AddComponent(Components.InstancedMesh);
        this.instancedMesh._instanceCount = 1024;

        this.instancedMesh.name = "ParticleSystem";
        this.instancedMesh.enableShadows = false;
        this.geometry = Geometry.Plane();
        await this.instancedMesh.SetGeometry(this.geometry);
        this.instancedMesh.AddMaterial(this.material);

        this.compute = await GPU.Compute.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(WGSL_Compute),
            computeEntrypoint: "main",
            uniforms: {
                particles: { group: 0, binding: 0, type: "storage-write" },
                settings: { group: 0, binding: 1, type: "storage" },
            }
        })

        this.particleInfoBuffer = new GPU.DynamicBufferMemoryAllocator(this.instancedMesh.instanceCount * 64);

        this.compute.SetBuffer("particles", this.particleInfoBuffer.getBuffer());

        this.material.shader.SetBuffer("particles", this.particleInfoBuffer.getBuffer());
    }

    public Update(): void {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (!this.compute) return;
        const particleCount = this.instancedMesh.instanceCount;
        const dispatchSizeX = Math.ceil(Math.cbrt(particleCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(particleCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(particleCount) / 4);

        if (!this.texture) this.texture = GPU.Texture.Create(1, 1);
        if (!this.textureSampler) this.textureSampler = GPU.TextureSampler.Create();
        this.material.shader.SetSampler("textureSampler", this.textureSampler);
        this.material.shader.SetTexture("texture", this.texture);
        this.material.shader.SetTexture("colorOverLifetimeRamp", this.colorOverLifetimeGradients.rampTexture);

        const settings = new Float32Array([
            particleCount,
            elapsed,
            this.startSize,
            this.startLifetime,

            ...this._startSpeed.elements, 0,
            ...this.transform.position.elements, 0,

            currentTime,
            this.rateOverTime,
            this.shapeType,
            +this.emitFromShell,

            this.radius,
            this.coneAngle * Math.PI / 180,
            this.coneHeight,
            0,

            ...this.boxHalfExtents.elements,
            +(this.texture.width > 1 || this.texture.height > 1), // hasTexture

            ...this.textureTiles.elements,
            this.frameOvertime,
            0,
            ...this.gravity.elements, 0
        ]);
        this.compute.SetArray("settings", settings);
        this.material.shader.SetArray("settings", settings);

        GPU.Renderer.BeginRenderFrame();
        GPU.ComputeContext.BeginComputePass("ParticleSystem", true);
        GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        GPU.ComputeContext.EndComputePass();
        GPU.Renderer.EndRenderFrame();
    }
}