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
  Update() {
    if (!PhysicsRapier.hasLoaded) return;
    PhysicsRapier.PhysicsWorld.step();
  }
}

export { PhysicsRapier };
