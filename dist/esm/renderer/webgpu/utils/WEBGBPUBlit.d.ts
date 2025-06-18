import { Vector2 } from "../../../math/Vector2";
import { Shader } from "../../Shader";
import { Texture } from "../../Texture";
export declare class WEBGPUBlit {
    static blitShader: Shader;
    private static blitGeometry;
    static Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale: Vector2): void;
}
