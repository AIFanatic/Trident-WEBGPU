import { Color } from "../math/Color";
import { Renderer } from "../renderer/Renderer";
import { Camera } from "./Camera";
import { Component } from "./Component";

export class Light extends Component {
    public camera: Camera;
    public color: Color = new Color(1,1,1);
    public intensity: number = 1;
    public radius: number = 1;

    public Start(): void {
        this.camera = this.gameObject.AddComponent(Camera);
        this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1000);
    }
}