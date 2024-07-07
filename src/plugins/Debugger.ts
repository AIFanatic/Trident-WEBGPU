import { UIStats, UITextStat } from "./UIStats";

class _Debugger {
    public readonly ui: UIStats;

    private frameRenderPassesStat: UITextStat;
    private frameRenderPasses: string[] = [];

    private totalMeshlets: UITextStat;
    private visibleMeshes: UITextStat;
    private gpuTime: UITextStat;
    private triangleCount: UITextStat;
    private visibleTriangles: UITextStat;

    constructor() {
        this.ui = new UIStats();
        this.frameRenderPassesStat = this.ui.AddTextStat("Render passes: ", "");
        this.totalMeshlets = this.ui.AddTextStat("Total meshlets: ", "");
        this.visibleMeshes = this.ui.AddTextStat("Visible meshlets: ", "");
        this.gpuTime = this.ui.AddTextStat("GPU time: ", "");
        this.triangleCount = this.ui.AddTextStat("Triangles: ", "");
        this.visibleTriangles = this.ui.AddTextStat("Visible triangles: ", "");
    }

    public ResetFrame() {
        this.frameRenderPasses = [];
        this.frameRenderPassesStat.SetValue("");
    }

    public AddFrameRenderPass(name: string) {
        if (this.frameRenderPasses.includes(name)) return;
        this.frameRenderPasses.push(name);
        this.frameRenderPassesStat.SetValue(this.frameRenderPasses.join("\n"));
    }

    public SetTotalMeshlets(count: number) {
        this.totalMeshlets.SetValue(count.toString());
    }

    public SetVisibleMeshes(count: number) {
        this.visibleMeshes.SetValue(count.toString());
    }

    public SetGPUTime(time: number | string) {
        this.gpuTime.SetValue(time.toString());
    }

    public SetTriangleCount(count: number) {
        this.triangleCount.SetValue(count.toString());
    }

    public SetVisibleTriangleCount(count: number) {
        this.visibleTriangles.SetValue(count.toString());
    }
}

export const Debugger = new _Debugger();