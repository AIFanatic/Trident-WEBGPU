import { Component } from "./Component";
import { Material } from "../renderer/Material";
import { Meshlet } from "../plugins/meshlets/Meshlet";

export class MeshletMeshV3 extends Component {
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public meshlets: Meshlet[] = [];

    public Start(): void {
    }

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type: new(...args: any[]) => T): T[] {
        return this.materialsMapped.get(type.name) as T[] || [];
    }
}