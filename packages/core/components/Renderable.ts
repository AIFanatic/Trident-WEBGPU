import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { SerializeField } from "../utils/SerializeField";
import { Component, SerializedComponent } from "./Component";

export class RenderableEvents {
    public static MaterialUpdated = (gameObject: GameObject, material: Material) => {};
}

export class Renderable extends Component {
    public static type = "@trident/core/components/Renderable";
    public enableShadows: boolean = true;
    
    private _geometry: Geometry;
    @SerializeField
    public get geometry(): Geometry { return this._geometry; };
    public set geometry(geometry: Geometry) { this._geometry = geometry; };

    protected _material: Material;
    @SerializeField
    public get material(): Material { return this._material; };
    public set material(material: Material) {
        this._material = material;
        EventSystem.emit(RenderableEvents.MaterialUpdated, this.gameObject, material);
    };

    public OnPreRender() { }
    public OnRenderObject() { }

    public Destroy(): void {
        this.geometry.Destroy();
        this.material.Destroy();
    }

    public Serialize(metadata: any = {}): SerializedComponent {
        return {
            type: Renderable.type,
            geometry: this.geometry.Serialize(metadata),
            material: this.material.Serialize(metadata),
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

Component.Registry.set(Renderable.type, Renderable);