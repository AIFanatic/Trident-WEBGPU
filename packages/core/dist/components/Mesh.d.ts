import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
export declare class Mesh extends Component {
    protected geometry: Geometry;
    private materialsMapped;
    enableShadows: boolean;
    Start(): void;
    AddMaterial(material: Material): void;
    GetMaterials<T extends Material>(type?: new (...args: any[]) => T): T[];
    SetGeometry(geometry: Geometry): void;
    GetGeometry(): Geometry;
}
//# sourceMappingURL=Mesh.d.ts.map