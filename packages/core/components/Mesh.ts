import { Component, SerializedComponent } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystemLocal } from "../Events";
import { TransformEvents } from "./Transform";
import { SerializeField } from "../utils/SerializeField";

export class Mesh extends Component {
    public static type = "@trident/core/components/Mesh";

    @SerializeField
    public geometry: Geometry;
    @SerializeField
    public material: Material;

    @SerializeField
    public enableShadows: boolean = true;

    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            if (!this.geometry) return;
            this.geometry.boundingVolume.center.copy(this.transform.position);
            this.geometry.boundingVolume.scale = Math.max(this.transform.scale.x, this.transform.scale.y, this.transform.scale.z);
        })
    }

    public Destroy(): void {
        this.geometry.Destroy();
        this.material.Destroy();
    }

    public Serialize(): SerializedComponent {
        return {
            type: Mesh.type,
            geometry: this.geometry.Serialize(),
            material: this.material.Serialize(),
            enableShadows: this.enableShadows
        }
    }

    public Deserialize(data: any) {
        this.geometry = new Geometry();
        this.geometry.Deserialize(data.geometry);
        this.material = Material.Deserialize(data.material);
        this.enableShadows = data.enableShadows;
    }
}

Component.Registry.set(Mesh.type, Mesh);