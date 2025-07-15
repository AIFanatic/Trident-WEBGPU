import { Component } from "./Component";
export class Mesh extends Component {
    geometry;
    materialsMapped = new Map();
    enableShadows = true;
    Start() {
    }
    AddMaterial(material) {
        if (!this.materialsMapped.has(material.constructor.name))
            this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }
    GetMaterials(type) {
        if (!type)
            return Array.from(this.materialsMapped, ([name, value]) => value).flat(Infinity);
        return this.materialsMapped.get(type.name) || [];
    }
    SetGeometry(geometry) { this.geometry = geometry; }
    GetGeometry() { return this.geometry; }
}
