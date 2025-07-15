import { Geometry } from "../../Geometry";
import { Mesh } from "../../components/Mesh";
import { Shader } from "../../renderer/Shader";
import { RenderTexture } from "../../renderer/Texture";
import { Object3D } from "../../Object3D";
export declare class ImpostorMesh extends Mesh {
    impostorGeometry: Geometry;
    impostorShader: Shader;
    albedoTexture: RenderTexture;
    normalTexture: RenderTexture;
    Create(objects: Object3D[], atlasResolution?: number, atlasTiles?: number): Promise<void>;
    private OctahedralCoordToVector;
    private renderByPosition;
    private createImpostorMesh;
}
//# sourceMappingURL=ImpostorMesh.d.ts.map