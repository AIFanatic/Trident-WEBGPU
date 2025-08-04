import { Renderer } from "@trident/core";
import { UIFolder, UITextStat } from "@trident/plugins/ui/UIStats";

class _Debugger {
    public readonly ui: UIFolder;
    private container: HTMLDivElement;

    private rendererFolder: UIFolder;

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
    // private viewTypeStat: UIDropdownStat;
    // private heightScale: UISliderStat;
    // private useHeightMapStat: UIButtonStat;

    public viewTypeValue: UITextStat;
    // public heightScaleValue: UITextStat;
    // public useHeightMapValue: boolean = false;

    private gpuBufferSizeTotal: UITextStat;
    private gpuTextureSizeTotal: UITextStat;
    
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

        this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
        this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
        this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
        this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
        this.gpuBufferSizeTotal = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
        this.gpuTextureSizeTotal = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
        this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
        this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
        this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
        this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");

        // this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {this.viewTypeValue = index}, this.viewTypeValue);
        // this.heightScale = new UISliderStat(this.rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScaleValue, state => {this.heightScaleValue = state});
        // this.useHeightMapStat = new UIButtonStat(this.rendererFolder, "Use heightmap:", state => {this.useHeightMapValue = state}, this.useHeightMapValue);

        this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
        this.renderPassesFolder.Open();

        setInterval(() => {
            this.Update();
        }, 100);
    }

    public Update() {
        this.fps.SetValue(Renderer.info.fps);
        this.triangleCount.SetValue(Renderer.info.triangleCount);
        this.visibleTriangles.SetValue(Renderer.info.visibleTriangles);
        this.cpuTime.SetValue(Renderer.info.cpuTime);
        this.gpuBufferSizeTotal.SetValue(Renderer.info.gpuBufferSizeTotal);
        this.gpuTextureSizeTotal.SetValue(Renderer.info.gpuTextureSizeTotal);
        this.bindGroupLayoutsStat.SetValue(Renderer.info.bindGroupLayoutsStat);
        this.bindGroupsStat.SetValue(Renderer.info.bindGroupsStat);
        this.drawCallsStat.SetValue(Renderer.info.drawCallsStat);
        this.compiledShadersStat.SetValue(Renderer.info.compiledShadersStat);

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
        console.log("Running", this.container)
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