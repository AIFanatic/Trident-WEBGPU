import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { HideInInspector, SerializeField, UUID } from "../utils";
import { Flags } from "../utils/Flags";
import { TypeRegistry } from "../utils/TypeRegistry";
import { Transform } from "./Transform";

export type SerializedComponent = { type: string } & Record<string, unknown>;

export class ComponentEvents {
    public static AddedComponent = (component: Component, scene: Scene) => {};
    public static RemovedComponent = (component: Component, scene: Scene) => {};
}

export class Component {
    public runInEditMode: boolean = false;
    public flags: Flags = Flags.None;
    public static type: string;
    public id = UUID();
    public hasStarted: boolean = false;
    public isDeserializing: boolean = false;
    public name: string;
    public assetPath: string;
    public readonly shouldUpdate: boolean;

    public readonly gameObject: GameObject;
    public readonly transform: Transform;

    public static Registry = TypeRegistry;

    protected _enabled: boolean = true;
    @SerializeField @HideInInspector public get enabled(): boolean { return this._enabled }
    public set enabled(value: boolean) { this._enabled = value }

    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
        this.transform = gameObject.transform;
        this.name = this.constructor.name;
        this.shouldUpdate = (this as any).Update !== Component.prototype.Update;

        EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);

        const ctor = this.constructor as typeof Component;
        Component.Registry.set(ctor.type || ctor.name, ctor);
    }

    public Start() {}
    public Update() {}
    public Destroy() {
        EventSystem.emit(ComponentEvents.RemovedComponent, this, this.gameObject.scene);
    }
}