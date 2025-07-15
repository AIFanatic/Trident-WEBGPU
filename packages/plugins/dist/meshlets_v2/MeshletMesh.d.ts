import { Geometry } from "../../Geometry";
import { Mesh } from "../../components/Mesh";
import { Meshlet } from "./Meshlet";
export declare const meshletsCache: Map<Geometry, {
    meshlets: Meshlet[];
    instanceCount: number;
}>;
export declare class MeshletMesh extends Mesh {
    meshlets: Meshlet[];
    Start(): void;
    SetGeometry(geometry: Geometry, clusterize?: boolean): Promise<void>;
}
//# sourceMappingURL=MeshletMesh.d.ts.map