import { Scene } from "../../Scene";
import { Camera } from "../../components/Camera";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Mesh } from "../../components/Mesh";
import { Buffer, BufferType } from "../Buffer";
import { Material } from "../Material";
import { RendererContext } from "../RendererContext";

export class SceneRenderer {
    public static Render<T extends Material>(scene: Scene, camera: Camera, material: new(...args: any[]) => T) { 
        const projectionMatrix = camera.projectionMatrix;
        const viewMatrix = camera.viewMatrix;

        const projectionBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);
        const viewBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);
        projectionBuffer.SetArray(projectionMatrix.elements);
        viewBuffer.SetArray(viewMatrix.elements);
        // shader.SetBuffer("projectionMatrix", projectionBuffer);
        // shader.SetBuffer("viewMatrix", viewBuffer);

        const meshes = scene.GetComponents(Mesh);
        for (const mesh of meshes) {
            const geometry = mesh.GetGeometry();
            const materials = mesh.GetMaterials(material);
            for (const material of materials) {
                const shader = material.shader;
                
                // const projectionBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);
                // const viewBuffer = Buffer.Create(4 * 16, BufferType.STORAGE);
                // projectionBuffer.SetArray(projectionMatrix.elements);
                // viewBuffer.SetArray(viewMatrix.elements);
                shader.SetBuffer("projectionMatrix", projectionBuffer);
                shader.SetBuffer("viewMatrix", viewBuffer);

                // shader.SetMatrix4("projectionMatrix", projectionMatrix);
                // shader.SetMatrix4("viewMatrix", viewMatrix);
                shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
                RendererContext.DrawGeometry(geometry, shader, 1);
            }
        }

        // const instancedMeshes = scene.GetComponents(InstancedMesh);
        // for (const instancedMesh of instancedMeshes) {
        //     const geometry = instancedMesh.GetGeometry();
        //     const materials = instancedMesh.GetMaterials(material);
        //     for (const material of materials) {
        //         const shader = material.shader;
        //         shader.SetMatrix4("projectionMatrix", projectionMatrix);
        //         shader.SetMatrix4("viewMatrix", viewMatrix);
        //         shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        //         RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount+1);
        //     }
        // }
    }
}