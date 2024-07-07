import { UIFolder, UITextStat } from "./ui/UIStats";

class _Debugger {
    public readonly ui: UIFolder;
    private renderPassesFolder: UIFolder;

    private framePassesStats: Map<string, UITextStat> = new Map();

    private totalMeshlets: UITextStat;
    private visibleMeshes: UITextStat;
    private triangleCount: UITextStat;
    private visibleTriangles: UITextStat;

    constructor() {
        const container = document.createElement("div");
        container.classList.add("stats-panel");

        this.ui = new UIFolder(container, "Debugger");
        this.ui.Open();
        document.body.append(container);

        this.totalMeshlets = new UITextStat(this.ui, "Total meshlets");
        this.visibleMeshes = new UITextStat(this.ui, "Visible meshlets: ");
        this.triangleCount = new UITextStat(this.ui, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.ui, "Visible triangles: ");

        this.renderPassesFolder = new UIFolder(this.ui, "Frame passes");
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

    public SetTotalMeshlets(count: number) {
        this.totalMeshlets.SetValue(count);
    }

    public SetVisibleMeshes(count: number) {
        this.visibleMeshes.SetValue(count);
    }

    public SetTriangleCount(count: number) {
        this.triangleCount.SetValue(count);
    }

    public SetVisibleTriangleCount(count: number) {
        this.visibleTriangles.SetValue(count);
    }
}

export const Debugger = new _Debugger();