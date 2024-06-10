import { Color } from "../math/Color";
import { Renderer } from "../renderer/Renderer";
import { DepthTexture, RenderTexture } from "../renderer/Texture";
import { Camera } from "./Camera";
import { Component } from "./Component";

export class Light extends Component {
    public camera: Camera;
    public color: Color = new Color(1,1,1);
    public intensity: number = 1;
    public radius: number = 1;

    public Start(): void {
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);
        this.camera.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
    }
}