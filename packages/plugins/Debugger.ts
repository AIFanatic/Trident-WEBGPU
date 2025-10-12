import { Renderer, GPU, Components, EventSystem, Scene, Geometry } from "@trident/core";
import { UIDropdownStat, UIFolder, UITextStat } from "@trident/plugins/ui/UIStats";

enum ViewTypes {
    Lighting,
    Albedo,
    Normal,
    Metalness,
    Roughness,
    Emissive,
    Depth,
    ShadowsCSM
};

class DebuggerRenderPass extends GPU.RenderPass {
    public name: string = "DebuggerRenderPass";
    public currentViewType: ViewTypes = ViewTypes.Lighting;
    private geometry: Geometry;
    private outputViewerShader: GPU.Shader;
    private lightingOutputClone: GPU.Texture;

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
                @group(0) @binding(1) var inputDepth: texture_depth_2d;
                @group(0) @binding(2) var inputSampler: sampler;
                @group(0) @binding(3) var inputDepthSampler: sampler;
                
                @group(0) @binding(4) var<storage, read> viewType: f32;

                struct Camera {
                    projectionOutputSize: vec4<f32>,
                    projectionInverseMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    viewInverseMatrix: mat4x4<f32>,
                    near: f32,
                    far: f32
                };
                @group(0) @binding(5) var<storage, read> camera: Camera;
                @group(0) @binding(6) var<storage, read> csmSplits: vec4<f32>;
                
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

                fn LinearizeDepthFromNDC(ndcDepth: f32) -> f32 {
                    let n = camera.near; // camera z near
                    let f = camera.far; // camera z far
                    let z = ndcDepth * 2.0 - 1.0;
                    return (2.0 * n * f) / (f + n - z * (f - n));
                }

                fn VisualizeDepth_Log(depthSample: f32) -> f32 {
                    let z = LinearizeDepthFromNDC(depthSample);
                    let n = camera.near;
                    let f = camera.far;
                    let c = 10.0;
                    let v = log(1.0 + c * (z - n)) / log(1.0 + c * (f - n));
                    return clamp(v, 0.0, 1.0);
                }

                fn ShadowLayerSelection(depthValue: f32, numCascades: i32, cascadeSplits: vec4<f32>) -> i32 {
                    // count how many splits we have passed (0..3)
                    var layer = 0;
                    layer += select(0, 1, depthValue >= cascadeSplits.x);
                    layer += select(0, 1, depthValue >= cascadeSplits.y);
                    layer += select(0, 1, depthValue >= cascadeSplits.z);
                    return clamp(layer, 0, numCascades - 1);
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    var color = textureSample(inputTexture, inputSampler, input.uv);
                    let depth = textureLoad(inputDepth, vec2<i32>(floor(input.position.xy)), 0);
                    if (u32(viewType) == 0) {} // Lighting
                    else if (u32(viewType) == 1) {} // Albedo
                    else if (u32(viewType) == 2) {} // Normal
                    else if (u32(viewType) == 3) { color = vec4(color.a); } // Metalness
                    else if (u32(viewType) == 4) { color = vec4(color.a); } // Roughness
                    else if (u32(viewType) == 5) { color = vec4(color.rgb, 1.0); } // Emissive
                    else if (u32(viewType) == 6) { color = vec4(vec3f(VisualizeDepth_Log(depth)), 1.0); } // Depth
                    else if (u32(viewType) == 7) { // Shadows CSM
                        const debug_cascadeColors = array<vec4<f32>, 5>(
                            vec4<f32>(1.0, 0.0, 0.0, 1.0),
                            vec4<f32>(0.0, 1.0, 0.0, 1.0),
                            vec4<f32>(0.0, 0.0, 1.0, 1.0),
                            vec4<f32>(1.0, 1.0, 0.0, 1.0),
                            vec4<f32>(0.0, 0.0, 0.0, 1.0)
                        );
    
                        let viewZ = LinearizeDepthFromNDC(depth);
                        let layer = ShadowLayerSelection(viewZ, 4, csmSplits);
                        color = vec4f(mix(color.rgb, debug_cascadeColors[layer].rgb, 0.25), 1.0);
                    }

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
                inputDepth: {group: 0, binding: 1, type: "depthTexture"},
                inputSampler: {group: 0, binding: 2, type: "sampler"},
                inputDepthSampler: {group: 0, binding: 3, type: "sampler"},
                viewType: {group: 0, binding: 4, type: "storage"},
                camera: {group: 0, binding: 5, type: "storage"},
                csmSplits: {group: 0, binding: 6, type: "storage"},
            }
        });

        this.geometry = Geometry.Plane();
        this.outputViewerShader.SetSampler("inputSampler", GPU.TextureSampler.Create());
        this.outputViewerShader.SetSampler("inputDepthSampler", GPU.TextureSampler.Create());
        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool, ...args: any) {
        // console.log(this.currentViewType)
        if (this.currentViewType === ViewTypes.Lighting) return;

        const GBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const GBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const GBufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const GBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);

        if (!this.lightingOutputClone) {
            this.lightingOutputClone = GPU.Texture.Create(lightingOutput.width, lightingOutput.height, lightingOutput.depth, lightingOutput.format);
        }

        this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        if (this.currentViewType === ViewTypes.Albedo) this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        else if (this.currentViewType === ViewTypes.Normal) this.outputViewerShader.SetTexture("inputTexture", GBufferNormal);
        else if (this.currentViewType === ViewTypes.Metalness) this.outputViewerShader.SetTexture("inputTexture", GBufferAlbedo);
        else if (this.currentViewType === ViewTypes.Roughness) this.outputViewerShader.SetTexture("inputTexture", GBufferNormal);
        else if (this.currentViewType === ViewTypes.Emissive) this.outputViewerShader.SetTexture("inputTexture", GBufferERMO);
        else if (this.currentViewType === ViewTypes.ShadowsCSM) {
            GPU.RendererContext.CopyTextureToTextureV3({texture: lightingOutput}, {texture: this.lightingOutputClone});
            this.outputViewerShader.SetTexture("inputTexture", this.lightingOutputClone);
        }
        const csmSplits = Components.Camera.mainCamera.gameObject.scene.renderPipeline.DeferredShadowMapPass.csmSplits;
        this.outputViewerShader.SetArray("csmSplits", new Float32Array(csmSplits));
        this.outputViewerShader.SetTexture("inputDepth", GBufferDepth);

        const mainCamera = Components.Camera.mainCamera;
        this.outputViewerShader.SetArray("camera", new Float32Array([
            ...[Renderer.width, Renderer.height, 0, 0],
            ...mainCamera.projectionMatrix.clone().invert().elements,
            ...mainCamera.viewMatrix.elements,
            ...mainCamera.viewMatrix.clone().invert().elements,
            mainCamera.near,
            mainCamera.far,
            0, 0
        ]));


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
    private vertexCount: UITextStat;
    private triangleCount: UITextStat;
    private visibleTriangles: UITextStat;
    private cpuTime: UITextStat;
    private gpuTime: UITextStat;
    private gpuBufferSizeStat: UITextStat;
    private gpuTextureSizeStat: UITextStat;
    private bindGroupLayoutsStat: UITextStat;
    private bindGroupsStat: UITextStat;
    private frameVertexBuffersStat: UITextStat;
    private frameIndexBufferStat: UITextStat;
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
        this.vertexCount = new UITextStat(this.rendererFolder, "Vertices: ");
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
        this.frameVertexBuffersStat = new UITextStat(this.rendererFolder, "Frame vertex buffers: ");
        this.frameIndexBufferStat = new UITextStat(this.rendererFolder, "Frame index buffers: ");
        this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
        this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
        this.visibleObjectsStat = new UITextStat(this.rendererFolder, "Visible objects: ");

        const debuggerRenderPass = new DebuggerRenderPass();
        EventSystem.on(Scene.Events.OnStarted, scene => {
            const mainCamera = Components.Camera.mainCamera;
            mainCamera.gameObject.scene.renderPipeline.AddPass(debuggerRenderPass, GPU.RenderPassOrder.AfterLighting);
        });
        this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Debug view:", Object.values(ViewTypes).filter(value => typeof value === "string") as string[], (index, value) => {debuggerRenderPass.currentViewType = index}, 0);

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
        this.vertexCount.SetValue(Renderer.info.vertexCount);
        this.triangleCount.SetValue(Renderer.info.triangleCount);
        this.visibleTriangles.SetValue(Renderer.info.visibleTriangles);
        this.cpuTime.SetValue(Renderer.info.cpuTime);
        this.gpuBufferSizeTotal.SetValue(Renderer.info.gpuBufferSizeTotal);
        this.gpuBufferCount.SetValue(Renderer.info.gpuBufferCount);
        this.gpuTextureSizeTotal.SetValue(Renderer.info.gpuTextureSizeTotal);
        this.gpuTextureCount.SetValue(Renderer.info.gpuTextureCount);
        this.bindGroupLayoutsStat.SetValue(Renderer.info.bindGroupLayoutsStat);
        this.bindGroupsStat.SetValue(Renderer.info.bindGroupsStat);
        this.frameVertexBuffersStat.SetValue(Renderer.info.frameVertexBuffersStat);
        this.frameIndexBufferStat.SetValue(Renderer.info.frameIndexBufferStat);
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