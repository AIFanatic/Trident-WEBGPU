import { System, Mathf } from "@trident/core"

import RAPIER_Module from "./rapier/rapier.es.js"
import RAPIER from "./rapier/rapier";

export interface RaycastHit {
    point: Mathf.Vector3;
    normal: Mathf.Vector3;
}

export class PhysicsRapier extends System {
    public static type = "@trident/plugins/PhysicsRapier";
    public static hasLoaded = false;

    public static Physics: typeof RAPIER;
    public static PhysicsWorld: RAPIER.World;

    public static fixedDeltaTime = 1 / 60;   // seconds

    public async Start() {
        console.log("CALLED")
        await RAPIER_Module.init()
        let gravity = { x: 0.0, y: -9.81, z: 0.0 };
        let world = new RAPIER_Module.World(gravity);
        PhysicsRapier.Physics = RAPIER_Module;
        PhysicsRapier.PhysicsWorld = world;
        PhysicsRapier.hasLoaded = true;
        world.timestep = PhysicsRapier.fixedDeltaTime;
    }

    public static CheckSphere(position: Mathf.Vector3, radius: number, filterExcludeRigidBody?: RAPIER.RigidBody): boolean {
        let shape = new this.Physics.Ball(radius);
        let shapePos = { x: position.x, y: position.y, z: position.z };
        let shapeRot = { x: 0.0, y: 0.0, z: 0.0, w: 1.0 };

        let found = false;
        this.PhysicsWorld.intersectionsWithShape(shapePos, shapeRot, shape, (handle) => {
            found = true;
            return false; // Return `false` instead if we want to stop searching for other colliders that contain this point.
        }, undefined, undefined, undefined, filterExcludeRigidBody);
        
        return found;
    }

    public static Raycast(origin: Mathf.Vector3, direction: Mathf.Vector3, maxDistance: number, filterExcludeRigidBody?: RAPIER.RigidBody): RaycastHit | null {
        let ray = new this.Physics.Ray(origin, direction);
        const rayHit = this.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true, undefined, undefined, undefined, filterExcludeRigidBody);
        if (!rayHit) return null;
        
        const hitPoint = ray.pointAt(rayHit.timeOfImpact);
        
        return {
            point: new Mathf.Vector3(hitPoint.x, hitPoint.y, hitPoint.z),
            normal: new Mathf.Vector3(rayHit.normal.x, rayHit.normal.y, rayHit.normal.z)
        }
    }
    

    public Update(): void {
        if (!PhysicsRapier.hasLoaded) return;
        PhysicsRapier.PhysicsWorld.step();
    }
}