import { Texture } from "../renderer/Texture";
export declare class TextureViewer {
    name: string;
    private shader;
    private quadGeometry;
    private initialized;
    init(): Promise<void>;
    execute(texture: Texture): Promise<void>;
}
//# sourceMappingURL=TextureViewer.d.ts.map