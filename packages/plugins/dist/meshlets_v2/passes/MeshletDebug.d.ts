import { UIButtonStat, UIDropdownStat, UIFolder, UISliderStat, UITextStat } from "../../ui/UIStats";
declare class _MeshletDebug {
    meshletsFolder: UIFolder;
    viewTypeStat: UIDropdownStat;
    viewTypeValue: number;
    meshletsViewType: number;
    totalMeshlets: UITextStat;
    visibleMeshes: UITextStat;
    hizFolder: UIFolder;
    debugDepthMipLevel: UISliderStat;
    debugDepthMipLevelValue: number;
    debugDepthExposure: UISliderStat;
    debugDepthExposureValue: number;
    debugDepth: UIButtonStat;
    isDebugDepthPassEnabled: boolean;
    cullingFolder: UIFolder;
    frustumCulling: UIButtonStat;
    backFaceCulling: UIButtonStat;
    occlusionCulling: UIButtonStat;
    smallFeatureCulling: UIButtonStat;
    dynamicLODErrorThreshold: UISliderStat;
    dynamicLOD: UISliderStat;
    staticLOD: UISliderStat;
    isFrustumCullingEnabled: boolean;
    isBackFaceCullingEnabled: boolean;
    isOcclusionCullingEnabled: boolean;
    isSmallFeaturesCullingEnabled: boolean;
    dynamicLODErrorThresholdValue: number;
    isDynamicLODEnabled: boolean;
    staticLODValue: number;
    constructor();
}
export declare const MeshletDebug: _MeshletDebug;
export {};
//# sourceMappingURL=MeshletDebug.d.ts.map