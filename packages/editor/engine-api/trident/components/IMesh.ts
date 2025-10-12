import { IGeometry } from "./IGeometry";
import { IMaterial } from "./IMaterial";

export interface IMesh {
    geometry: IGeometry;
    material: IMaterial;    
}