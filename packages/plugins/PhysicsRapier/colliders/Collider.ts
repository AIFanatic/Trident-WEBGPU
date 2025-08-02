import { Component } from "@trident/core";
import RAPIER from "../rapier/rapier";

export class Collider extends Component {
    public collider: RAPIER.Collider;
    public colliderDesc: RAPIER.ColliderDesc;
}