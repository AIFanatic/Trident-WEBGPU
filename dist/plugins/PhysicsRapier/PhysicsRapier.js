import { Component } from '@trident/core';
import Tg from './rapier/rapier.es.js';

class PhysicsRapier extends Component {
  static hasLoaded = false;
  static Physics;
  static PhysicsWorld;
  Load() {
    return new Promise((resolve) => {
      Tg.init().then(() => {
        let gravity = { x: 0, y: -9.81, z: 0 };
        let world = new Tg.World(gravity);
        PhysicsRapier.Physics = Tg;
        PhysicsRapier.PhysicsWorld = world;
        PhysicsRapier.hasLoaded = true;
        resolve(true);
      });
    });
  }
  static CheckSphere(position, radius, filterExcludeRigidBody = void 0) {
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
  Update() {
    if (!PhysicsRapier.hasLoaded) return;
    PhysicsRapier.PhysicsWorld.step();
  }
}

export { PhysicsRapier };
