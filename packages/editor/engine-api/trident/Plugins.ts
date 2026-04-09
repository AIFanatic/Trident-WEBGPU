import { Component } from "@trident/core";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { MeshCollider } from "@trident/plugins/PhysicsRapier/colliders/MeshCollider";
import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";

Component.Registry.set(PhysicsRapier.type, PhysicsRapier);
Component.Registry.set(MeshCollider.type, MeshCollider);
// Component.Registry.set(PhysicsDebugger.type, PhysicsDebugger);