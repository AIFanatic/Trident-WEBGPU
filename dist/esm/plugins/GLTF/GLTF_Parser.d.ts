import { Object3D } from "../../Object3D";
export declare class GLTFParser {
    private static TextureCache;
    private static getTexture;
    private static parsePrimitive;
    private static parseNode;
    static Load(url: string): Promise<Object3D>;
}
