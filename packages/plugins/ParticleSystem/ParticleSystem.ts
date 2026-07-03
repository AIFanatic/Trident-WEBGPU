import { Assets, Component, Components, GPU, GameObject, Geometry, Mathf, SerializeField, Utils } from "@trident/core";
import { AlphaKey, ColorKey, GradientTexture } from "./GradientTexture";

import WGSL_Structs from "./resources/structs.wgsl";
import WGSL_Draw from "./resources/draw.wgsl";
import WGSL_Compute from "./resources/update.wgsl";

Assets.Register("@trident/plugins/ParticleSystem/resources/structs.wgsl", WGSL_Structs);

enum ShapeType {
    Sphere,
    HemiSphere,
    Cone,
    Box,
    Circle
};

enum FrameOverTime {
    Constant,
    OverLifetime,
    Random
};

export class ParticleSystem extends Component {
    public static type = "@trident/plugins/ParticleSystem/ParticleSystem";
    public runInEditMode: boolean = true;
    private geometry: Geometry;
    private material: GPU.Material;
    private instancedMesh: Components.InstancedMesh;

    private compute: GPU.ShaderCompute;
    private particleInfoBuffer: GPU.DynamicBufferMemoryAllocator;

    private lastTime = 0;

    @SerializeField public startSize: number = 1;
    @SerializeField public startLifetime: number = 20;

    // Emission
    @SerializeField public rateOverTime: number = 100;

    // Shape
    @SerializeField(ShapeType) public shapeType: ShapeType = ShapeType.Cone;
    @SerializeField public emitFromShell: boolean = true;
    @SerializeField public radius: number = 1;
    @SerializeField public coneAngle: number = 25;
    @SerializeField public coneHeight: number = 1;
    @SerializeField public boxHalfExtents: Mathf.Vector3 = new Mathf.Vector3(0.5, 0.5, 0.5);

    // Texture sheet animation
    @SerializeField(GPU.Texture) public texture: GPU.Texture;
    @SerializeField public textureTiles = new Mathf.Vector2(1, 1);
    @SerializeField public frameOvertime: FrameOverTime = FrameOverTime.Random;

    // Color over lifetime
    @SerializeField public colorOverLifetimeGradients: GradientTexture = new GradientTexture();
    public colorOverLifetimeAddColor(color: ColorKey) { this.colorOverLifetimeGradients.addColor(color); }
    public colorOverLifetimeAddAlpha(alpha: AlphaKey) { this.colorOverLifetimeGradients.addAlpha(alpha); }
    public colorOverLifetimeSetColorKeys(colorKeys: ColorKey[]) { this.colorOverLifetimeGradients.setColorKeys(colorKeys); }
    public colorOverLifetimeSetAlphaKeys(alphaKeys: AlphaKey[]) { this.colorOverLifetimeGradients.setAlphaKeys(alphaKeys); }

    @SerializeField public gravity = new Mathf.Vector3(0, 0, 0);

    // Arc stuff
    @SerializeField public arcLoop: boolean = false;
    @SerializeField public arcSpeed: number = 1;   // loops per second
    private arcPhase: number = 0;

    private textureSampler: GPU.TextureSampler;


    private _startSpeed: Mathf.Vector3 = new Mathf.Vector3(1, 1, 1).mul(10);
    @SerializeField(Mathf.Vector3)
    public get startSpeed(): Mathf.Vector3 { return this._startSpeed; }
    public set startSpeed(startSpeed: Mathf.Vector3) { this._startSpeed.copy(startSpeed); }

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.init();
        this.colorOverLifetimeGradients.setColorKeys([
            { t: 0, r: 1, g: 1, b: 1 },
            { t: 1, r: 1, g: 1, b: 1 },
        ]);
        this.colorOverLifetimeGradients.setAlphaKeys([
            { t: 0, a: 1 },
            { t: 1, a: 0 },
        ]);
    }

    private async init() {
        this.material = new GPU.Material({
            isDeferred: false,
            shader: await GPU.Shader.Create({
                code: await GPU.ShaderPreprocessor.ProcessIncludesV2(WGSL_Draw),
                colorOutputs: [{ format: "rgba16float", blendMode: "premultiplied" }],
                depthOutput: "depth24plus",
                depthWriteEnabled: false
            })
        });

        this.instancedMesh = this.gameObject.AddComponent(Components.InstancedMesh);
        this.instancedMesh.flags |= Utils.Flags.DontSaveInEditor;
        this.instancedMesh._instanceCount = 1024;

        this.instancedMesh.name = "ParticleSystem";
        this.instancedMesh.enableShadows = false;
        this.geometry = Geometry.Plane();
        this.instancedMesh.geometry = this.geometry;
        this.instancedMesh.material = this.material;

        this.compute = await GPU.ShaderCompute.Create({
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

        this.SetParams();
    }

    private SetParams() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTime;
        this.lastTime = currentTime;
        const dt = elapsed / 1000;
        if (this.arcLoop) this.arcPhase = (this.arcPhase + this.arcSpeed * dt) % 1;

        const particleCount = this.instancedMesh.instanceCount;

        if (!this.texture) this.texture = GPU.Texture.Create(1, 1);
        if (!this.textureSampler) this.textureSampler = new GPU.TextureSampler();
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
            +(this.texture.width > 1 || this.texture.height > 1),

            ...this.textureTiles.elements,
            this.frameOvertime,
            0,

            ...this.gravity.elements, 0,

            +this.arcLoop, this.arcPhase, 0, 0,
        ]);
        this.compute.SetArray("settings", settings);
        this.material.shader.SetArray("settings", settings);
    }

    public Update() {
        if (!this.compute) return;
        this.SetParams();

        const particleCount = this.instancedMesh.instanceCount;
        const dispatchSizeX = Math.ceil(Math.cbrt(particleCount) / 4);
        const dispatchSizeY = Math.ceil(Math.cbrt(particleCount) / 4);
        const dispatchSizeZ = Math.ceil(Math.cbrt(particleCount) / 4);

        GPU.Renderer.BeginRenderFrame();
        GPU.ComputeContext.BeginComputePass("ParticleSystem", true);
        GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
        GPU.ComputeContext.EndComputePass();
        GPU.Renderer.EndRenderFrame();
    }

    public Destroy() {
        super.Destroy();

        this.instancedMesh.Destroy();
        this.geometry.Destroy();
        this.material.Destroy();
        this.compute.Destroy();
        this.particleInfoBuffer.Destroy();
    }
}