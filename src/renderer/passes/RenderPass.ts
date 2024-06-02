import { RenderCommandBuffer } from "../RenderCommandBuffer";
import { RenderTexture } from "../Texture";

export interface RenderPass {
    Execute(inputTarget?: RenderTexture, inputDepth?: RenderTexture): RenderCommandBuffer;
}