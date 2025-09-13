import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystemLocal } from "../Events";
import { TransformEvents } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export class Mesh extends Component {
    @SerializeField
    protected geometry: Geometry;
    @SerializeField
    private materialsMapped: Map<string, Material[]> = new Map();

    @SerializeField
    public enableShadows: boolean = true;

    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            if (!this.geometry) return;
            this.geometry.boundingVolume.center.copy(this.transform.position);
            this.geometry.boundingVolume.scale = Math.max(this.transform.scale.x, this.transform.scale.y, this.transform.scale.z);
        })
    }

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type?: new(...args: any[]) => T): T[] {
        if (!type) return Array.from(this.materialsMapped, ([name, value]) => value).flat(Infinity) as T[];
        return this.materialsMapped.get(type.name) as T[] || [];
    }

    public SetGeometry(geometry: Geometry) { this.geometry = geometry }
    public GetGeometry(): Geometry { return this.geometry}

    public Destroy(): void {
        this.geometry.Destroy();
        for (const material of this.GetMaterials()) material.Destroy();
    }
}