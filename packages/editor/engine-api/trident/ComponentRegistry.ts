import { Component, Components } from "@trident/core";

import { IComponent, IComponentConstructor } from "./components/IComponent";

import { RigidBody } from "@trident/plugins/PhysicsRapier/RigidBody";
import { BoxCollider } from "@trident/plugins/PhysicsRapier/colliders/BoxCollider";
import { CapsuleCollider } from "@trident/plugins/PhysicsRapier/colliders/CapsuleCollider";
import { MeshCollider } from "@trident/plugins/PhysicsRapier/colliders/MeshCollider";
import { PlaneCollider } from "@trident/plugins/PhysicsRapier/colliders/PlaneCollider";
import { SphereCollider } from "@trident/plugins/PhysicsRapier/colliders/SphereCollider";

import { Terrain } from "@trident/plugins/Terrain/Terrain";
import { ICamera } from "./components/ICamera";
import { IDirectionalLight, IPointLight, ISpotLight } from "./components/ILight";
import { IMesh } from "./components/IMesh";
  
const component = <T extends IComponent>(ctor: unknown): IComponentConstructor<T> => ctor as IComponentConstructor<T>;

Component.Registry.set(RigidBody.type, RigidBody);
Component.Registry.set(BoxCollider.type, BoxCollider);
Component.Registry.set(CapsuleCollider.type, CapsuleCollider);
Component.Registry.set(MeshCollider.type, MeshCollider);
Component.Registry.set(PlaneCollider.type, PlaneCollider);
Component.Registry.set(SphereCollider.type, SphereCollider);

Component.Registry.set(Terrain.type, Terrain);

  export const ComponentRegistry = {
      Camera: component<ICamera>(Components.Camera),

      SpotLight: component<ISpotLight>(Components.SpotLight),
      PointLight: component<IPointLight>(Components.PointLight),
      DirectionalLight: component<IDirectionalLight>(Components.DirectionalLight),

      Mesh: component<IMesh>(Components.Mesh),
      SkinnedMesh: component<IComponent>(Components.SkinnedMesh),
      Animator: component<IComponent>(Components.Animator),
      AnimationTrack: component<IComponent>(Components.AnimationTrack),

      RigidBody: component<IComponent>(RigidBody),
      BoxCollider: component<IComponent>(BoxCollider),
      CapsuleCollider: component<IComponent>(CapsuleCollider),
      MeshCollider: component<IComponent>(MeshCollider),
      PlaneCollider: component<IComponent>(PlaneCollider),
      SphereCollider: component<IComponent>(SphereCollider),

      Terrain: component<IMesh>(Terrain),
  };