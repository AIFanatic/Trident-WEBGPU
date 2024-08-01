import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "./ui/UIStats";

class _Debugger {
    public isDebugDepthPassEnabled: boolean = false;
    public debugDepthMipLevel: number = 0;
    public debugDepthExposure: number = 0;

    public isFrustumCullingEnabled: boolean = true;
    public isBackFaceCullingEnabled: boolean = false;
    public isOcclusionCullingEnabled: boolean = true;
    public isSmallFeaturesCullingEnabled: boolean = true;
    public dynamicLODErrorThreshold: number = 1;
    public isDynamicLODEnabled: boolean = true;
    public staticLOD: number = 20;

    public viewType: number = 0;
    public heightScale: number = 0.05;
    public useHeightMap: boolean = false;

    public readonly ui: UIFolder;
    private renderPassesFolder: UIFolder;

    private framePassesStats: Map<string, UITextStat> = new Map();

    private fps: UITextStat;
    private totalMeshlets: UITextStat;
    private visibleMeshes: UITextStat;
    private triangleCount: UITextStat;
    private visibleTriangles: UITextStat;
    private gpuTime: UITextStat;
    private gpuBufferSizeStat: UITextStat;
    private gpuBufferSizeTotal: number = 0;

    constructor() {
        const container = document.createElement("div");
        container.classList.add("stats-panel");

        this.ui = new UIFolder(container, "Debugger");
        this.ui.Open();
        document.body.append(container);

        this.fps = new UITextStat(this.ui, "FPS", 0, 2, "", true);
        this.totalMeshlets = new UITextStat(this.ui, "Total meshlets");
        this.visibleMeshes = new UITextStat(this.ui, "Visible meshlets: ");
        this.triangleCount = new UITextStat(this.ui, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.ui, "Visible triangles: ");
        this.gpuTime = new UITextStat(this.ui, "GPU: ", 0, 2, "ms", true);
        this.gpuBufferSizeStat = new UITextStat(this.ui, "GPU buffer size: ", 0, 2);

        const hizFolder = new UIFolder(this.ui, "Hierarchical Z depth");
        hizFolder.Open();

        const debugDepthMipLevel = new UISliderStat(hizFolder, "Depth mip:", 0, 20, 1, 0, value => {this.debugDepthMipLevel = value});
        const debugDepthExposure = new UISliderStat(hizFolder, "Depth exposure:", -10, 10, 0.01, 0, value => {this.debugDepthExposure = value});
        debugDepthMipLevel.Disable();
        debugDepthExposure.Disable();
        const debugDepth = new UIButtonStat(hizFolder, "View depth:", state => {
            this.isDebugDepthPassEnabled = state;
            if (this.isDebugDepthPassEnabled === true) {
                debugDepthMipLevel.Enable();
                debugDepthExposure.Enable();
            }
            else {
                debugDepthMipLevel.Disable();
                debugDepthExposure.Disable();
            }
        });

        const cullingFolder = new UIFolder(this.ui, "Culling");
        const frustumCulling = new UIButtonStat(cullingFolder, "Frustum culling:", state => {this.isFrustumCullingEnabled = state}, this.isFrustumCullingEnabled);
        const backFaceCulling = new UIButtonStat(cullingFolder, "Backface culling:", state => {this.isBackFaceCullingEnabled = state}, this.isBackFaceCullingEnabled);
        const occlusionCulling = new UIButtonStat(cullingFolder, "Occlusion culling:", state => {this.isOcclusionCullingEnabled = state}, this.isOcclusionCullingEnabled);
        const smallFeatureCulling = new UIButtonStat(cullingFolder, "Small features:", state => {this.isSmallFeaturesCullingEnabled = state}, this.isSmallFeaturesCullingEnabled);
        const staticLOD = new UISliderStat(cullingFolder, "Static LOD:", 0, this.staticLOD, 1, 0, state => {this.staticLOD = state});
        staticLOD.Disable();
        const dynamicLODErrorThreshold = new UISliderStat(cullingFolder, "Dynamic LOD error:", 0, 20, 0.01, this.dynamicLODErrorThreshold, value => {this.dynamicLODErrorThreshold = value});
        const dynamicLOD = new UIButtonStat(cullingFolder, "Dynamic LOD:", state => {
            this.isDynamicLODEnabled = state;
            if (this.isDynamicLODEnabled === true) {
                staticLOD.Disable();
                dynamicLODErrorThreshold.Enable();
            }
            else {
                staticLOD.Enable();
                dynamicLODErrorThreshold.Disable();
            }
        }, this.isDynamicLODEnabled);
        cullingFolder.Open();

        const rendererFolder = new UIFolder(this.ui, "Renderer");
        rendererFolder.Open();
        const viewTypeStat = new UIDropdownStat(rendererFolder, "GBuffer:", ["Instances", "Instance+Triangles", "Albedo Map", "Normal Map", "Lighting"], (index, value) => {this.viewType = index});
        const heightScale = new UISliderStat(rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScale, state => {this.heightScale = state});
        const useHeightMapStat = new UIButtonStat(rendererFolder, "Use heightmap:", state => {this.useHeightMap = state}, this.useHeightMap);

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

    public IncrementGPUBufferSize(value: number) {
        const FormatBytes = (bytes: number, decimals = 2): {value: number, rank: string} => {
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return {value: parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)), rank: sizes[i]};
        }

        this.gpuBufferSizeTotal += value;
        const formatted = FormatBytes(this.gpuBufferSizeTotal, this.gpuBufferSizeStat.GetPrecision());
        this.gpuBufferSizeStat.SetUnit(formatted.rank);
        this.gpuBufferSizeStat.SetValue(formatted.value);
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

    public SetFPS(count: number) {
        this.fps.SetValue(count);

        let totalGPUTime = 0;
        for (const [_, framePass] of this.framePassesStats) {
            totalGPUTime += framePass.GetValue();
        }
        this.gpuTime.SetValue(totalGPUTime);
    }
}

export const Debugger = new _Debugger();