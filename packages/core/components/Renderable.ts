import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Geometry } from "../Geometry";
import { Shader } from "../renderer";
import { Material, PBRMaterial } from "../renderer/Material";
import { SerializeField } from "../utils/SerializeField";
import { Component } from "./Component";

export class RenderableEvents {
    public static MaterialUpdated = (gameObject: GameObject, material: Material) => {};
}

export class Renderable extends Component {

    public static Renderables: Map<string, Renderable> = new Map();

    public static type = "@trident/core/components/Renderable";
    
    @SerializeField
    public enableShadows: boolean = true;
    
    private _geometry: Geometry = new Geometry();
    @SerializeField(Geometry)
    public get geometry(): Geometry { return this._geometry; };
    public set geometry(geometry: Geometry) { this._geometry = geometry; };

    protected _material: Material = new PBRMaterial();
    @SerializeField(Material)
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
        super.Destroy();
        if (this._geometry) { this._geometry.Destroy(); this._geometry = null; }
        if (this._material) { this._material.Destroy(); this._material = null; }
        Renderable.Renderables.delete(this.id);
    }

}