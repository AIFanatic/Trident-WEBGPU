export declare class ShaderPreprocessor {
    static ProcessDefines(code: string, defines: {
        [key: string]: boolean;
    }): string;
    static ProcessIncludes(code: string, url?: string): Promise<string>;
}
export declare class ShaderLoader {
    static Load(shader_url: string): Promise<string>;
    static get Cull(): Promise<string>;
    static get CullStructs(): Promise<string>;
    static get SettingsStructs(): Promise<string>;
    static get DepthDownsample(): Promise<string>;
    static get DrawIndirect(): Promise<string>;
    static get Draw(): Promise<string>;
    static get Blit(): Promise<string>;
    static get BlitDepth(): Promise<string>;
    static get DeferredLighting(): Promise<string>;
}
