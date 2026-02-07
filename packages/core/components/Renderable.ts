import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Geometry } from "../Geometry";
import { Shader } from "../renderer";
import { Material } from "../renderer/Material";
import { SerializeField } from "../utils/SerializeField";
import { Component, SerializedComponent } from "./Component";

export class RenderableEvents {
    public static MaterialUpdated = (gameObject: GameObject, material: Material) => {};
}

export class Renderable extends Component {

    public static Renderables: Map<string, Renderable> = new Map();

    public static type = "@trident/core/components/Renderable";
    
    @SerializeField
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

    constructor(gameObject: GameObject) {
        super(gameObject);
        Renderable.Renderables.set(this.id, this);
    }

    public OnPreFrame(shaderOverride?: Shader) { }
    public OnPreRender(shaderOverride?: Shader) { }
    public OnRenderObject(shaderOverride?: Shader) { }

    public Destroy(): void {
        this.geometry.Destroy();
        this.material.Destroy();
        Renderable.Renderables.delete(this.id);
    }

    public Serialize(metadata: any = {}): SerializedComponent {
        return {
            type: this.constructor.type,
            geometry: this.geometry.Serialize(metadata),
            material: this.material.Serialize(metadata),
            enableShadows: this.enableShadows
        }
    }

    public Deserialize(data: any) {
        this.enableShadows = data.enableShadows;
        this.geometry = Geometry.Deserialize(data.geometry);
        this.material = Material.Deserialize(data.material);
    }
}