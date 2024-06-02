import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { EventSystem } from "../Events";
import { Shader } from "../renderer/Shader";

export class Mesh extends Component {
    private geometry: Geometry;
    private shaders: Shader[] = [];
    public enableGPUInstancing = true;

    public AddShader(shader: Shader) {
        if (this.shaders.includes(shader)) return;
        this.shaders.push(shader);
        EventSystem.emit("MeshUpdated", this, "shader");
    }
    public GetShaders(): Shader[] { return this.shaders};

    public SetGeometry(geometry: Geometry) {
        this.geometry = geometry;
        EventSystem.emit("MeshUpdated", this, "geometry");
    };

    public GetGeometry(): Geometry { return this.geometry};
}