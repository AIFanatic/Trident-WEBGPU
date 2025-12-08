import { Component, Components } from "@trident/core";

export interface LOD {
    renderer: Components.Renderable;
    screenSize: number; // Percentage screen size
}

export class LODGroup extends Component {
    public lods: LOD[] = [];
}