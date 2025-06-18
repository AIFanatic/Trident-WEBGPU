import { RenderPass, ResourcePool } from "../RenderGraph";
export interface LightShadowData {
    cascadeSplits: Float32Array;
    projectionMatrices: Float32Array;
    shadowMapIndex: number;
}
declare class _DeferredShadowMapPassDebug {
    private shadowsFolder;
    private shadowsUpdate;
    private shadowsRoundToPixelSize;
    private debugCascades;
    private pcfResolution;
    private blendThreshold;
    private viewBlendThreshold;
    shadowsUpdateValue: boolean;
    roundToPixelSizeValue: boolean;
    debugCascadesValue: boolean;
    pcfResolutionValue: number;
    blendThresholdValue: number;
    viewBlendThresholdValue: boolean;
    constructor();
}
export declare const DeferredShadowMapPassDebug: _DeferredShadowMapPassDebug;
export declare class DeferredShadowMapPass extends RenderPass {
    name: string;
    private drawInstancedShadowShader;
    private drawShadowShader;
    private lightProjectionMatrixBuffer;
    private lightProjectionViewMatricesBuffer;
    private modelMatrices;
    private cascadeIndexBuffers;
    private cascadeCurrentIndexBuffer;
    private numOfCascades;
    private lightShadowData;
    private shadowOutput;
    private shadowWidth;
    private shadowHeight;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    private getCornersForCascade;
    private getCascades;
    execute(resources: ResourcePool): void;
}
export {};
