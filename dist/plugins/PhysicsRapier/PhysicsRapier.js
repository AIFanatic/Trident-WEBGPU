import { System, Mathf } from '@trident/core';
import Tg from './rapier/rapier.es.js';

class PhysicsRapier extends System {
  static type = "@trident/plugins/PhysicsRapier";
  static hasLoaded = false;
  static Physics;
  static PhysicsWorld;
  static fixedDeltaTime = 1 / 60;
  // seconds
  async Start() {
    console.log("CALLED");
    await Tg.init();
    let gravity = { x: 0, y: -9.81, z: 0 };
    let world = new Tg.World(gravity);
    PhysicsRapier.Physics = Tg;
    PhysicsRapier.PhysicsWorld = world;
    PhysicsRapier.hasLoaded = true;
    world.timestep = PhysicsRapier.fixedDeltaTime;
  }
  static CheckSphere(position, radius, filterExcludeRigidBody) {
    let shape = new this.Physics.Ball(radius);
    let shapePos = { x: position.x, y: position.y, z: position.z };
    let shapeRot = { x: 0, y: 0, z: 0, w: 1 };
    let found = false;
    this.PhysicsWorld.intersectionsWithShape(shapePos, shapeRot, shape, (handle) => {
      found = true;
      return false;
    }, void 0, void 0, void 0, filterExcludeRigidBody);
    return found;
  }
  static Raycast(origin, direction, maxDistance, filterExcludeRigidBody) {
    let ray = new this.Physics.Ray(origin, direction);
    const rayHit = this.PhysicsWorld.castRayAndGetNormal(ray, maxDistance, true, void 0, void 0, void 0, filterExcludeRigidBody);
    if (!rayHit) return null;
    const hitPoint = ray.pointAt(rayHit.timeOfImpact);
    return {
      point: new Mathf.Vector3(hitPoint.x, hitPoint.y, hitPoint.z),
      normal: new Mathf.Vector3(rayHit.normal.x, rayHit.normal.y, rayHit.normal.z)
    };
  }
  Update() {
    if (!PhysicsRapier.hasLoaded) return;
    PhysicsRapier.PhysicsWorld.step();
  }
}

export { PhysicsRapier };
