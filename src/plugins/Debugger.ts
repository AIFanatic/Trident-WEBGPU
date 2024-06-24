import { UIStats, UITextStat } from "./UIStats";

class _Debugger {
    public readonly ui: UIStats;

    private frameRenderPassesStat: UITextStat;
    private frameRenderPasses: string[] = [];

    constructor() {
        this.ui = new UIStats();
        this.frameRenderPassesStat = this.ui.AddTextStat("Render passes: ", "");
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
}

export const Debugger = new _Debugger();