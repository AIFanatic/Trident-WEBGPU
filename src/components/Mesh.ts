import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { EventSystem } from "../Events";
import { Material } from "../renderer/Material";

export class Mesh extends Component {
    private geometry: Geometry;
    private materials: Material[] = [];

    public AddMaterial(material: Material) {
        if (this.materials.includes(material)) return;
        this.materials.push(material);
        EventSystem.emit("MeshUpdated", this, "shader");
    }
    public GetMaterials(): Material[] { return this.materials};

    public SetGeometry(geometry: Geometry) {
        this.geometry = geometry;
        EventSystem.emit("MeshUpdated", this, "geometry");
    };

    public GetGeometry(): Geometry { return this.geometry};
}