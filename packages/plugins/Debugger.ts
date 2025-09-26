import { Renderer, GPU, Components, EventSystem, Scene, Geometry } from "@trident/core";
import { UIDropdownStat, UIFolder, UITextStat } from "@trident/plugins/ui/UIStats";

enum ViewTypes {
    Lighting,
    Albedo,
    Normal,
    Metalness,
    Roughness,
    Emissive
};

class DebuggerRenderPass extends GPU.RenderPass {
    public name: string = "DebuggerRenderPass";
    public currentViewType: ViewTypes = ViewTypes.Lighting;
    private geometry: Geometry;
    private outputViewerShader: GPU.Shader;

    constructor() {
        super({
            inputs: [
                GPU.PassParams.MainCamera,
                GPU.PassParams.GBufferAlbedo,
                GPU.PassParams.GBufferNormal,
                GPU.PassParams.GBufferERMO,
                GPU.PassParams.GBufferDepth,
            ],
            outputs: []
        });
    }

    public async init(resources: GPU.ResourcePool) {
        this.outputViewerShader = await GPU.Shader.Create({
            code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(1) uv : vec2<f32>,
                };

                @group(0) @binding(0) var inputTexture: texture_2d<f32>;
                @group(0) @binding(1) var inputSampler: sampler;
                
                @group(0) @binding(2) var<storage, read> viewType: f32;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = vec4(input.position, 1.0);
                    output.uv = input.uv;
                    return output;
                }
                
                struct FragmentOutput {
                    @location(0) albedo : vec4f,
                };
                
                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    var color = textureSample(inputTexture, inputSampler, input.uv);
                    if (u32(viewType) == 0) {} // Lighting
                    else if (u32(viewType) == 1) {} // Albedo
                    else if (u32(viewType) == 2) {} // Normal
                    else if (u32(viewType) == 3) { color = vec4(color.a); } // Metalness
                    else if (u32(viewType) == 4) { color = vec4(color.a); } // Roughness
                    else if (u32(viewType) == 5) { color = vec4(color.rgb, 1.0); } // Emissive
                    return vec4(color.rgb, 1.0);
                }
            `,
            colorOutputs: [{format: "rgba16float"}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                inputTexture: {group: 0, binding: 0, type: "texture"},
                inputSampler: {group: 0, binding: 1, type: "sampler"},
                viewType: {group: 0, binding: 2, type: "storage"},
            }
        });

        this.geometry = Geometry.Plane();
        this.outputViewerShader.SetSampler("inputSampler", GPU.TextureSampler.Create());
        this.initialized = true;
    }

    public execute(resources: GPU.ResourcePool, ...args: any): void {
        // console.log(this.currentViewType)
        if (this.currentViewType === ViewTypes.Lighting) return;

        const GBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const GBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const GBufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);

        this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        if (this.currentViewType === ViewTypes.Albedo) this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        else if (this.currentViewType === ViewTypes.Normal) this.outputViewerShader.SetTexture("inputTexture", GBufferNormal);
        else if (this.currentViewType === ViewTypes.Metalness) this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        else if (this.currentViewType === ViewTypes.Roughness) this.outputViewerShader.SetTexture("inputTexture", GBufferNormal);
        else if (this.currentViewType === ViewTypes.Emissive) this.outputViewerShader.SetTexture("inputTexture", GBufferERMO);

        this.outputViewerShader.SetValue("viewType", this.currentViewType);
        GPU.RendererContext.BeginRenderPass("DebugOutputViewer", [{target: lightingOutput, clear: true}], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.outputViewerShader);
        GPU.RendererContext.EndRenderPass();
    }
}

class _Debugger {
    public readonly ui: UIFolder;
    private container: HTMLDivElement;

    private rendererFolder: UIFolder;

    private resolution: UITextStat;
    private fps: UITextStat;
    private triangleCount: UITextStat;
    private visibleTriangles: UITextStat;
    private cpuTime: UITextStat;
    private gpuTime: UITextStat;
    private gpuBufferSizeStat: UITextStat;
    private gpuTextureSizeStat: UITextStat;
    private bindGroupLayoutsStat: UITextStat;
    private bindGroupsStat: UITextStat;
    private compiledShadersStat: UITextStat;
    private drawCallsStat: UITextStat;
    private viewTypeStat: UIDropdownStat;
    // private heightScale: UISliderStat;
    // private useHeightMapStat: UIButtonStat;

    // public heightScaleValue: UITextStat;
    // public useHeightMapValue: boolean = false;

    private gpuBufferSizeTotal: UITextStat;
    private gpuBufferCount: UITextStat;
    private gpuTextureSizeTotal: UITextStat;
    private gpuTextureCount: UITextStat;

    private visibleObjectsStat: UITextStat;
    
    private renderPassesFolder: UIFolder;
    private framePassesStats: Map<string, UITextStat> = new Map();

    private constructor() {
        this.container = document.createElement("div");
        this.container.classList.add("stats-panel");
        document.body.append(this.container);

        this.ui = new UIFolder(this.container, "Debugger");
        this.ui.Open();

        this.rendererFolder = new UIFolder(this.ui, "Renderer");
        this.rendererFolder.Open();

        this.resolution = new UITextStat(this.rendererFolder, "Resolution: ", 0, 0, "", false);
        this.fps = new UITextStat(this.rendererFolder, "FPS: ", 0, 2, "", true);
        this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
        this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
        this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
        this.gpuBufferSizeTotal = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
        this.gpuBufferCount = new UITextStat(this.rendererFolder, "GPU buffer count: ", 0, 0);
        this.gpuTextureSizeTotal = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 0);
        this.gpuTextureCount = new UITextStat(this.rendererFolder, "GPU texture count: ", 0, 0);
        this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
        this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
        this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
        this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
        this.visibleObjectsStat = new UITextStat(this.rendererFolder, "Visible objects: ");

        const debuggerRenderPass = new DebuggerRenderPass();
        EventSystem.on(Scene.Events.OnStarted, scene => {
            const mainCamera = Components.Camera.mainCamera;
            mainCamera.gameObject.scene.renderPipeline.AddPass(debuggerRenderPass, GPU.RenderPassOrder.AfterLighting);
        });
        this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", Object.values(ViewTypes).filter(value => typeof value === "string") as string[], (index, value) => {debuggerRenderPass.currentViewType = index}, 0);

        this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
        this.renderPassesFolder.Open();

        this.textStatBytesFormatter(this.gpuBufferSizeTotal);
        this.textStatBytesFormatter(this.gpuTextureSizeTotal);

        setInterval(() => {
            this.Update();
        }, 100);
    }

    private textStatBytesFormatter(textStat: UITextStat) {
        textStat.formatter = (value => {
            const k = 1024;
            const decimals = 2;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(value) / Math.log(k));

            textStat.SetUnit(sizes[i]);
            return parseFloat((value / Math.pow(k, i)).toFixed(decimals));
        })
    }

    public Update() {
        this.resolution.SetText(`${Renderer.width}x${Renderer.height}`)
        this.fps.SetValue(Renderer.info.fps);
        this.triangleCount.SetValue(Renderer.info.triangleCount);
        this.visibleTriangles.SetValue(Renderer.info.visibleTriangles);
        this.cpuTime.SetValue(Renderer.info.cpuTime);
        this.gpuBufferSizeTotal.SetValue(Renderer.info.gpuBufferSizeTotal);
        this.gpuBufferCount.SetValue(Renderer.info.gpuBufferCount);
        this.gpuTextureSizeTotal.SetValue(Renderer.info.gpuTextureSizeTotal);
        this.gpuTextureCount.SetValue(Renderer.info.gpuTextureCount);
        this.bindGroupLayoutsStat.SetValue(Renderer.info.bindGroupLayoutsStat);
        this.bindGroupsStat.SetValue(Renderer.info.bindGroupsStat);
        this.drawCallsStat.SetValue(Renderer.info.drawCallsStat);
        this.compiledShadersStat.SetValue(Renderer.info.compiledShadersStat);
        this.visibleObjectsStat.SetValue(Renderer.info.visibleObjects);

        let totalGPUTime = 0;
        for (const [framePassName, framePassValue] of Renderer.info.framePassesStats) {
            let framePassStat = this.framePassesStats.get(framePassName);
            if (framePassStat === undefined) {
                framePassStat = new UITextStat(this.renderPassesFolder, framePassName, 0, 2, "ms", true);
                this.framePassesStats.set(framePassName, framePassStat);
            }
            
            totalGPUTime += framePassValue;
            framePassStat.SetValue(framePassValue);
        }
        this.gpuTime.SetValue(totalGPUTime);
    }

    public Enable() {
        this.container.style.display = "";
    }

    public Disable() {
        this.container.style.display = "none";
    }

    static getInstance(): _Debugger {
        const g = globalThis as any;
        if (!g.__DebuggerInstance) {
            g.__DebuggerInstance = new _Debugger();
        }
        return g.__DebuggerInstance;
    }
}

export const Debugger = _Debugger.getInstance();