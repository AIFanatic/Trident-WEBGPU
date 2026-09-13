import { IComponent } from "./IComponent";
import { IGeometry } from "./IGeometry";
import { IMaterial } from "./IMaterial";

export interface IMesh extends IComponent {
    geometry: IGeometry;
    material: IMaterial;
}