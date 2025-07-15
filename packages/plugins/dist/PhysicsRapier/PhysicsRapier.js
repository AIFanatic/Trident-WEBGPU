import { Component } from "../../components/Component";
import RAPIER_Module from "./rapier/rapier.es.js";
export class PhysicsRapier extends Component {
    static hasLoaded = false;
    static Physics;
    static PhysicsWorld;
    Load() {
        return new Promise(resolve => {
            RAPIER_Module.init().then(() => {
                let gravity = { x: 0.0, y: -9.81, z: 0.0 };
                let world = new RAPIER_Module.World(gravity);
                PhysicsRapier.Physics = RAPIER_Module;
                PhysicsRapier.PhysicsWorld = world;
                PhysicsRapier.hasLoaded = true;
                resolve(true);
            });
        });
    }
    Update() {
        if (!PhysicsRapier.hasLoaded)
            return;
        PhysicsRapier.PhysicsWorld.step();
    }
}
