export interface TextureSamplerParams {
    magFilter?: "linear" | "nearest";
    minFilter?: "linear" | "nearest";
    mipmapFilter?: "linear" | "nearest";
    addressModeU?: "clamp-to-edge" | "repeat" | "mirror-repeat";
    addressModeV?: "clamp-to-edge" | "repeat" | "mirror-repeat";
    compare?: "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";
    maxAnisotropy?: number;
}
export declare class TextureSampler {
    readonly params: TextureSamplerParams;
    static Create(params?: TextureSamplerParams): TextureSampler;
}
//# sourceMappingURL=TextureSampler.d.ts.map