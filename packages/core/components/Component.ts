import { EventSystem } from "../Events";
import { GameObject } from "../GameObject";
import { Scene } from "../Scene";
import { GetSerializedFields, UUID } from "../utils";
import { Transform } from "./Transform";

export type SerializedComponent = { type: string } & Record<string, unknown>;

export class ComponentEvents {
    public static CallUpdate = (component: Component, shouldUpdate: boolean) => {};
    public static AddedComponent = (component: Component, scene: Scene) => {};
    public static RemovedComponent = (component: Component, scene: Scene) => {};
}

export class Component {
    public static type;
    public id = UUID();
    public enabled: boolean = true;
    public hasStarted: boolean = false;
    public name: string;

    public readonly gameObject: GameObject;
    public readonly transform: Transform;

    public static Registry: Map<string, typeof Component> = new Map();

    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
        this.transform = gameObject.transform;
        this.name = this.constructor.name;

        if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);

        EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);

        const ctor = this.constructor as typeof Component;
        Component.Registry.set(ctor.type, ctor);
    }

    public Start() {}
    public Update() {}
    public Destroy() { this.gameObject.RemoveComponent(this) }

    public Serialize(metadata: any = {}): SerializedComponent {
        const serializedFields = GetSerializedFields(this);

        let fields = {};
        for (const {name, type} of serializedFields) {
            const value = this[name];
            if (typeof value["Serialize"] === "function") fields[name] = value["Serialize"]();
            else if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") fields[name] = value;
            else if (value instanceof Float32Array) fields[name] = Array.from(value);
            else if (value instanceof Array) fields[name] = value; // This doesnt work if the array contains an object
            else {
                throw Error(`Could not serialize ${this.constructor["type"]}::${name as string} ${value instanceof Float32Array}`)
            }
        }
        return {type: this.constructor["type"], id: this.id, name: this.name, ...fields};
    }

    public Deserialize(data: any) {
        for (const property in data) {
            const value = data[property];

            if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") this[property] = value;
            // This is meh, basically relies on the property having an initializer on the class 
            else if (this[property] instanceof Float32Array) this[property] = new Float32Array(value);
            else if (this[property] instanceof Array) this[property] = value;
            else if (this[property]["Deserialize"]) this[property]["Deserialize"](value);
            else throw Error(`Could not Deserialize ${this.constructor["type"]}::${property as string}`);
        }
    }
}

console.log(Component.Registry)
