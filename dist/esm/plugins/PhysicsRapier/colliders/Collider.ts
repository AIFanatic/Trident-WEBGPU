import { Component } from "../../../components/Component";
import RAPIER from "../rapier/rapier";

export class Collider extends Component {
    public collider: RAPIER.Collider;
    public colliderDesc: RAPIER.ColliderDesc;
}