import { Debugger } from "../plugins/Debugger";
import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "../plugins/ui/UIStats";

class _RendererDebug {
    public isDebugDepthPassEnabled: boolean = false;

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
    private viewTypeStat: UIDropdownStat;
    private heightScale: UISliderStat;
    private useHeightMapStat: UIButtonStat;

    public viewTypeValue: number = 0;
    public heightScaleValue: number = 0;
    public useHeightMapValue: boolean = false;

    private gpuBufferSizeTotal: number = 0;
    private gpuTextureSizeTotal: number = 0;
    
    private renderPassesFolder: UIFolder;
    private framePassesStats: Map<string, UITextStat> = new Map();

    constructor() {
        this.rendererFolder = new UIFolder(Debugger.ui, "Renderer");
        this.rendererFolder.Open();

        this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
        this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
        this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
        this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
        this.gpuBufferSizeStat = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
        this.gpuTextureSizeStat = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
        this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
        this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
        this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
        this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");

        this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {this.viewTypeValue = index}, this.viewTypeValue);
        this.heightScale = new UISliderStat(this.rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScaleValue, state => {this.heightScaleValue = state});
        this.useHeightMapStat = new UIButtonStat(this.rendererFolder, "Use heightmap:", state => {this.useHeightMapValue = state}, this.useHeightMapValue);

        this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
        this.renderPassesFolder.Open();
    }

    public SetPassTime(name: string, time: number) {
        let framePass = this.framePassesStats.get(name);
        if (!framePass) {
            framePass = new UITextStat(this.renderPassesFolder, name, 0, 2, "ms", true);
            this.framePassesStats.set(name, framePass);
        }

        framePass.SetValue(time / 1e6);
    }

    public SetCPUTime(value: number) {
        this.cpuTime.SetValue(value);
    }

    public SetTriangleCount(count: number) {
        this.triangleCount.SetValue(count);
    }
    
    public IncrementTriangleCount(count: number) {
        this.triangleCount.SetValue(this.triangleCount.GetValue() + count);
    }

    public SetVisibleTriangleCount(count: number) {
        this.visibleTriangles.SetValue(count);
    }

    public IncrementVisibleTriangleCount(count: number) {
        this.visibleTriangles.SetValue(this.visibleTriangles.GetValue() + count);
    }

    public SetFPS(count: number) {
        this.fps.SetValue(count);

        let totalGPUTime = 0;
        for (const [_, framePass] of this.framePassesStats) {
            totalGPUTime += framePass.GetValue();
        }
        this.gpuTime.SetValue(totalGPUTime);
    }

    public IncrementBindGroupLayouts(value: number) {
        this.bindGroupLayoutsStat.SetValue(this.bindGroupLayoutsStat.GetValue() + value);
    }

    public IncrementBindGroups(value: number) {
        this.bindGroupsStat.SetValue(this.bindGroupsStat.GetValue() + value);
    }

    private FormatBytes (bytes: number, decimals = 2): {value: number, rank: string} {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return {value: parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)), rank: sizes[i]};
    }

    public IncrementGPUBufferSize(value: number) {
        this.gpuBufferSizeTotal += value;
        const formatted = this.FormatBytes(this.gpuBufferSizeTotal, this.gpuBufferSizeStat.GetPrecision());
        this.gpuBufferSizeStat.SetUnit(formatted.rank);
        this.gpuBufferSizeStat.SetValue(formatted.value);
    }

    public IncrementGPUTextureSize(value: number) {
        this.gpuTextureSizeTotal += value;
        const formatted = this.FormatBytes(this.gpuTextureSizeTotal, this.gpuTextureSizeStat.GetPrecision());
        this.gpuTextureSizeStat.SetUnit(formatted.rank);
        this.gpuTextureSizeStat.SetValue(formatted.value);
    }

    public IncrementDrawCalls(count: number) {
        this.drawCallsStat.SetValue(this.drawCallsStat.GetValue() + count);
    }

    public IncrementShaderCompiles(count: number) {
        this.compiledShadersStat.SetValue(this.compiledShadersStat.GetValue() + count);
    }

    public ResetFrame() {
        this.drawCallsStat.SetValue(0);
    }
}

export const RendererDebug = new _RendererDebug();