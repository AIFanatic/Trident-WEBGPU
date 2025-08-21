import { IGeometry } from "./IGeometry";
import { IMaterial } from "./IMaterial";

export interface IMesh {
    SetGeometry(geometry: IGeometry);
    GetGeometry(): IGeometry;
    
    GetMaterials<T extends IMaterial>(type?: new(...args: any[]) => T): T[];
    AddMaterial(material: IMaterial);
}