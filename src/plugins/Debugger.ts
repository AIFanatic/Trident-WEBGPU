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

    public meshletsViewType: number = 0;
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
    private gpuTextureSizeStat: UITextStat;
    private gpuTextureSizeTotal: number = 0;

    public objectMove = {x: 0, y: 0, z: 0};

    public shadows = {
        shadowsUpdate: true,
        roundToPixelSize: true
    }

    constructor() {
        const container = document.createElement("div");
        container.classList.add("stats-panel");
        document.body.append(container);

        this.ui = new UIFolder(container, "Debugger");
        this.ui.Open();

        const shadowsFolder = new UIFolder(this.ui, "CSM Shadows");
        const shadowsUpdate = new UIButtonStat(shadowsFolder, "Update shadows", value => { this.shadows.shadowsUpdate = value}, this.shadows.shadowsUpdate);
        const shadowsRoundToPixelSize = new UIButtonStat(shadowsFolder, "RoundToPixelSize", value => { this.shadows.roundToPixelSize = value}, this.shadows.roundToPixelSize);
        shadowsFolder.Open();

        const objectMove = new UIFolder(this.ui, "Object");
        const objectMoveX = new UISliderStat(objectMove, "X:", -10, 10, 1, 0, value => {this.objectMove.x = value});
        const objectMoveY = new UISliderStat(objectMove, "Y:", -10, 10, 1, 0, value => {this.objectMove.y = value});
        const objectMoveZ = new UISliderStat(objectMove, "Z:", -10, 10, 1, 0, value => {this.objectMove.z = value});
        objectMove.Open();

        this.fps = new UITextStat(this.ui, "FPS", 0, 2, "", true);
        this.triangleCount = new UITextStat(this.ui, "Triangles: ");
        this.visibleTriangles = new UITextStat(this.ui, "Visible triangles: ");
        this.gpuTime = new UITextStat(this.ui, "GPU: ", 0, 2, "ms", true);
        this.gpuBufferSizeStat = new UITextStat(this.ui, "GPU buffer size: ", 0, 2);
        this.gpuTextureSizeStat = new UITextStat(this.ui, "GPU texture size: ", 0, 2);

        
        const meshletsFolder = new UIFolder(this.ui, "Plugin - Meshlets");
        const viewTypeStat2 = new UIDropdownStat(meshletsFolder, "Show:", ["Default", "Meshlets", "Triangles"], (index, value) => {this.meshletsViewType = index}, this.meshletsViewType);
        this.totalMeshlets = new UITextStat(meshletsFolder, "Total meshlets");
        this.visibleMeshes = new UITextStat(meshletsFolder, "Visible meshlets: ");
        meshletsFolder.Open();

        const hizFolder = new UIFolder(meshletsFolder, "- Hierarchical Z depth");
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


        const cullingFolder = new UIFolder(meshletsFolder, "- Culling");
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
        const viewTypeStat = new UIDropdownStat(rendererFolder, "GBuffer:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {this.viewType = index}, this.viewType);
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

    public SetTotalMeshlets(count: number) {
        this.totalMeshlets.SetValue(count);
    }

    public SetVisibleMeshes(count: number) {
        this.visibleMeshes.SetValue(count);
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