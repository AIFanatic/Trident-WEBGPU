import { Component, SerializedComponent } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystem, EventSystemLocal } from "../Events";
import { TransformEvents } from "./Transform";
import { SerializeField } from "../utils/SerializeField";
import { BoundingVolume } from "../math/BoundingVolume";

export class MeshEvents {
    public static TransformUpdated = (mesh: Mesh) => {};
    public static MaterialUpdated = (mesh: Mesh, material: Material) => {};
}

export class Mesh extends Component {
    public static type = "@trident/core/components/Mesh";

    private _geometry: Geometry;
    @SerializeField
    public get geometry(): Geometry { return this._geometry; };
    public set geometry(geometry: Geometry) { this._geometry = geometry; };


    private _material: Material;
    @SerializeField
    public get material(): Material { return this._material; };
    public set material(material: Material) {
        this._material = material;
        EventSystem.emit(MeshEvents.MaterialUpdated, this, material);
    };

    @SerializeField
    public enableShadows: boolean = true;

    public get localBounds(): BoundingVolume { return this.geometry.boundingVolume; }
    public bounds = new BoundingVolume();

    public Start(): void {
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            if (!this.geometry) return;
            const local = this.localBounds;
            this.bounds.center.copy(local.center);
            this.bounds.center.applyMatrix4(this.transform.localToWorldMatrix);

            const m = this.transform.localToWorldMatrix.elements;
            const sx = Math.hypot(m[0], m[1], m[2]);
            const sy = Math.hypot(m[4], m[5], m[6]);
            const sz = Math.hypot(m[8], m[9], m[10]);
            this.bounds.radius = local.radius * Math.max(sx, sy, sz);

            EventSystem.emit(MeshEvents.TransformUpdated, this);
        });
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