// import { Debugger } from "../plugins/Debugger";
// import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "../plugins/ui/UIStats";
class _RendererDebug {
    //     public isDebugDepthPassEnabled: boolean = false;
    //     private rendererFolder: UIFolder;
    //     private fps: UITextStat;
    //     private triangleCount: UITextStat;
    //     private visibleTriangles: UITextStat;
    //     private cpuTime: UITextStat;
    //     private gpuTime: UITextStat;
    //     private gpuBufferSizeStat: UITextStat;
    //     private gpuTextureSizeStat: UITextStat;
    //     private bindGroupLayoutsStat: UITextStat;
    //     private bindGroupsStat: UITextStat;
    //     private compiledShadersStat: UITextStat;
    //     private drawCallsStat: UITextStat;
    //     private viewTypeStat: UIDropdownStat;
    //     private heightScale: UISliderStat;
    //     private useHeightMapStat: UIButtonStat;
    viewTypeValue = 0;
    heightScaleValue = 0;
    useHeightMapValue = false;
    gpuBufferSizeTotal = 0;
    gpuTextureSizeTotal = 0;
    //     private renderPassesFolder: UIFolder;
    //     private framePassesStats: Map<string, UITextStat> = new Map();
    //     constructor() {
    //         this.rendererFolder = new UIFolder(Debugger.ui, "Renderer");
    //         this.rendererFolder.Open();
    //         this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
    //         this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
    //         this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
    //         this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
    //         this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
    //         this.gpuBufferSizeStat = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
    //         this.gpuTextureSizeStat = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
    //         this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
    //         this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
    //         this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
    //         this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
    //         this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {this.viewTypeValue = index}, this.viewTypeValue);
    //         this.heightScale = new UISliderStat(this.rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScaleValue, state => {this.heightScaleValue = state});
    //         this.useHeightMapStat = new UIButtonStat(this.rendererFolder, "Use heightmap:", state => {this.useHeightMapValue = state}, this.useHeightMapValue);
    //         this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
    //         this.renderPassesFolder.Open();
    //     }
    SetPassTime(name, time) {
        //         let framePass = this.framePassesStats.get(name);
        //         if (!framePass) {
        //             framePass = new UITextStat(this.renderPassesFolder, name, 0, 2, "ms", true);
        //             this.framePassesStats.set(name, framePass);
        //         }
        //         framePass.SetValue(time / 1e6);
    }
    SetCPUTime(value) {
        //         this.cpuTime.SetValue(value);
    }
    SetTriangleCount(count) {
        //         this.triangleCount.SetValue(count);
    }
    IncrementTriangleCount(count) {
        //         this.triangleCount.SetValue(this.triangleCount.GetValue() + count);
    }
    SetVisibleTriangleCount(count) {
        //         this.visibleTriangles.SetValue(count);
    }
    IncrementVisibleTriangleCount(count) {
        //         this.visibleTriangles.SetValue(this.visibleTriangles.GetValue() + count);
    }
    SetFPS(count) {
        //         this.fps.SetValue(count);
        //         let totalGPUTime = 0;
        //         for (const [_, framePass] of this.framePassesStats) {
        //             totalGPUTime += framePass.GetValue();
        //         }
        //         this.gpuTime.SetValue(totalGPUTime);
    }
    IncrementBindGroupLayouts(value) {
        //         this.bindGroupLayoutsStat.SetValue(this.bindGroupLayoutsStat.GetValue() + value);
    }
    IncrementBindGroups(value) {
        //         this.bindGroupsStat.SetValue(this.bindGroupsStat.GetValue() + value);
    }
    FormatBytes(bytes, decimals = 2) {
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return { value: parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)), rank: sizes[i] };
    }
    IncrementGPUBufferSize(value) {
        //         this.gpuBufferSizeTotal += value;
        //         const formatted = this.FormatBytes(this.gpuBufferSizeTotal, this.gpuBufferSizeStat.GetPrecision());
        //         this.gpuBufferSizeStat.SetUnit(formatted.rank);
        //         this.gpuBufferSizeStat.SetValue(formatted.value);
    }
    IncrementGPUTextureSize(value) {
        //         this.gpuTextureSizeTotal += value;
        //         const formatted = this.FormatBytes(this.gpuTextureSizeTotal, this.gpuTextureSizeStat.GetPrecision());
        //         this.gpuTextureSizeStat.SetUnit(formatted.rank);
        //         this.gpuTextureSizeStat.SetValue(formatted.value);
    }
    IncrementDrawCalls(count) {
        //         this.drawCallsStat.SetValue(this.drawCallsStat.GetValue() + count);
    }
    IncrementShaderCompiles(count) {
        //         this.compiledShadersStat.SetValue(this.compiledShadersStat.GetValue() + count);
    }
    ResetFrame() {
        //         this.drawCallsStat.SetValue(0);
    }
}
export const RendererDebug = new _RendererDebug();
