import { Debugger } from "../../Debugger";
import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "../../ui/UIStats";
class _MeshletDebug {
    meshletsFolder;
    viewTypeStat;
    viewTypeValue = 0;
    meshletsViewType = 0;
    totalMeshlets;
    visibleMeshes;
    hizFolder;
    debugDepthMipLevel;
    debugDepthMipLevelValue = 0;
    debugDepthExposure;
    debugDepthExposureValue = 0;
    debugDepth;
    isDebugDepthPassEnabled;
    cullingFolder;
    frustumCulling;
    backFaceCulling;
    occlusionCulling;
    smallFeatureCulling;
    dynamicLODErrorThreshold;
    dynamicLOD;
    staticLOD;
    isFrustumCullingEnabled = true;
    isBackFaceCullingEnabled = false;
    isOcclusionCullingEnabled = true;
    isSmallFeaturesCullingEnabled = true;
    dynamicLODErrorThresholdValue = 1;
    isDynamicLODEnabled = true;
    staticLODValue = 20;
    constructor() {
        this.meshletsFolder = new UIFolder(Debugger.ui, "Plugin - Meshlets");
        this.viewTypeStat = new UIDropdownStat(this.meshletsFolder, "Show:", ["Default", "Meshlets", "Triangles"], (index, value) => { this.meshletsViewType = index; }, this.meshletsViewType);
        this.totalMeshlets = new UITextStat(this.meshletsFolder, "Total meshlets");
        this.visibleMeshes = new UITextStat(this.meshletsFolder, "Visible meshlets: ");
        this.meshletsFolder.Open();
        this.hizFolder = new UIFolder(this.meshletsFolder, "- Hierarchical Z depth");
        this.hizFolder.Open();
        this.debugDepthMipLevel = new UISliderStat(this.hizFolder, "Depth mip:", 0, 20, 1, 0, value => { this.debugDepthMipLevelValue = value; });
        this.debugDepthExposure = new UISliderStat(this.hizFolder, "Depth exposure:", -10, 10, 0.01, 0, value => { this.debugDepthExposureValue = value; });
        this.debugDepthMipLevel.Disable();
        this.debugDepthExposure.Disable();
        this.debugDepth = new UIButtonStat(this.hizFolder, "View depth:", state => {
            this.isDebugDepthPassEnabled = state;
            if (this.isDebugDepthPassEnabled === true) {
                this.debugDepthMipLevel.Enable();
                this.debugDepthExposure.Enable();
            }
            else {
                this.debugDepthMipLevel.Disable();
                this.debugDepthExposure.Disable();
            }
        });
        this.cullingFolder = new UIFolder(this.meshletsFolder, "- Meshlet Culling");
        this.frustumCulling = new UIButtonStat(this.cullingFolder, "Frustum culling:", state => { this.isFrustumCullingEnabled = state; }, this.isFrustumCullingEnabled);
        this.backFaceCulling = new UIButtonStat(this.cullingFolder, "Backface culling:", state => { this.isBackFaceCullingEnabled = state; }, this.isBackFaceCullingEnabled);
        this.occlusionCulling = new UIButtonStat(this.cullingFolder, "Occlusion culling:", state => { this.isOcclusionCullingEnabled = state; }, this.isOcclusionCullingEnabled);
        this.smallFeatureCulling = new UIButtonStat(this.cullingFolder, "Small features:", state => { this.isSmallFeaturesCullingEnabled = state; }, this.isSmallFeaturesCullingEnabled);
        this.staticLOD = new UISliderStat(this.cullingFolder, "Static LOD:", 0, this.staticLODValue, 1, 0, state => { this.staticLODValue = state; });
        this.staticLOD.Disable();
        this.dynamicLODErrorThreshold = new UISliderStat(this.cullingFolder, "Dynamic LOD error:", 0, 20, 0.01, this.dynamicLODErrorThresholdValue, value => { this.dynamicLODErrorThresholdValue = value; });
        this.dynamicLOD = new UIButtonStat(this.cullingFolder, "Dynamic LOD:", state => {
            this.isDynamicLODEnabled = state;
            if (this.isDynamicLODEnabled === true) {
                this.staticLOD.Disable();
                this.dynamicLODErrorThreshold.Enable();
            }
            else {
                this.staticLOD.Enable();
                this.dynamicLODErrorThreshold.Disable();
            }
        }, this.isDynamicLODEnabled);
        this.cullingFolder.Open();
    }
}
export const MeshletDebug = new _MeshletDebug();
