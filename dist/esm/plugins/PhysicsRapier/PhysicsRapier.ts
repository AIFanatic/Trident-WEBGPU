import { Component } from "../../components/Component"

import RAPIER_Module from "./rapier/rapier.es.js"
import RAPIER from "./rapier/rapier";

export class PhysicsRapier extends Component {
    public static hasLoaded = false;

    public static Physics: typeof RAPIER;
    public static PhysicsWorld: RAPIER.World;

    public Load(): Promise<boolean> {
        return new Promise(resolve => {
            RAPIER_Module.init().then(() => {
                let gravity = { x: 0.0, y: -9.81, z: 0.0 };
                let world = new RAPIER_Module.World(gravity);
                PhysicsRapier.Physics = RAPIER_Module;
                PhysicsRapier.PhysicsWorld = world;
                PhysicsRapier.hasLoaded = true;
                resolve(true);
            })  
        })
    }

    public Update(): void {
        if (!PhysicsRapier.hasLoaded) return;

        PhysicsRapier.PhysicsWorld.step();
    }
}