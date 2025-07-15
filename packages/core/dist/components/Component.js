import { EventSystem } from "../Events";
import { Utils } from "../utils/Utils";
export class ComponentEvents {
    static CallUpdate = (component, shouldUpdate) => { };
    static AddedComponent = (component, scene) => { };
    static RemovedComponent = (component, scene) => { };
}
export class Component {
    id = Utils.UUID();
    enabled = true;
    hasStarted = false;
    name;
    gameObject;
    transform;
    constructor(gameObject) {
        this.gameObject = gameObject;
        this.transform = gameObject.transform;
        this.name = this.constructor.name;
        if (this.gameObject.scene.hasStarted)
            this.Start();
        if (this.constructor.prototype.Update !== Component.prototype.Update)
            EventSystem.emit(ComponentEvents.CallUpdate, this, true);
        EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
    }
    Start() { }
    Update() { }
    LateUpdate() { }
    Destroy() { }
}
