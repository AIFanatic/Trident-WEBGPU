import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystem } from "../Events";

export class Mesh extends Component {
    private geometry: Geometry;
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public Start(): void {
        // EventSystem.on("TransformUpdated", transform => {
        //     if (this.transform === transform) {
        //         EventSystem.emit("MeshUpdated", this);
        //     }
        // })
    }

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type: new(...args: any[]) => T): T[] {
        return this.materialsMapped.get(type.name) as T[] || [];
    }

    public SetGeometry(geometry: Geometry) { this.geometry = geometry }
    public GetGeometry(): Geometry { return this.geometry}
}