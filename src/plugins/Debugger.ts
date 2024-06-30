import { UIStats, UITextStat } from "./UIStats";

class _Debugger {
    public readonly ui: UIStats;

    private frameRenderPassesStat: UITextStat;
    private frameRenderPasses: string[] = [];

    private visibleMeshes: UITextStat;

    constructor() {
        this.ui = new UIStats();
        this.frameRenderPassesStat = this.ui.AddTextStat("Render passes: ", "");
        this.visibleMeshes = this.ui.AddTextStat("Visible: ", "");
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

    public SetVisibleMeshes(count: number) {
        this.visibleMeshes.SetValue(count.toString());
    }
}

export const Debugger = new _Debugger();