import { Geometry } from "../../Geometry";
import { Mesh } from "../../components/Mesh";
import { Transform } from "../../components/Transform";
import { Buffer, BufferType } from "../Buffer";
import { Shader } from "../Shader";

interface RenderableObjectBase {
    geometry: Geometry;
    shader: Shader;
    modelMatrixBuffer: Buffer;
};

interface RenderableObject extends RenderableObjectBase { transform: Transform };
interface RenderableObjectInstanced extends RenderableObjectBase { transform: Transform[] };

export class MeshRenderCache {
    private static renderable: RenderableObject[] = [];
    private static renderableInstanced: Map<string, RenderableObjectInstanced> = new Map();
    private static transformMap: Map<Transform, {buffer: Buffer, index: number}> = new Map();

    public static GetRenderable(): RenderableObject[] { return this.renderable };
    public static GetRenderableInstanced(): Map<string, RenderableObjectInstanced> { return this.renderableInstanced };

    private static MAX_INSTANCE_COUNT = 1000000;

    private static AddRenderable(transform: Transform, geometry: Geometry, shader: Shader) {
        const renderable = { transform: transform, geometry: geometry, shader: shader, modelMatrixBuffer: Buffer.Create(4 * 16, BufferType.STORAGE) };
        this.renderable.push(renderable);
        this.transformMap.set(transform, {buffer: renderable.modelMatrixBuffer, index: -1});
    }

    private static AddRenderableInstanced(transform: Transform, geometry: Geometry, shader: Shader) {
        const key = `${geometry.id}-${shader.id}`;

        let renderableInstanced = this.renderableInstanced.get(key);
        if (!renderableInstanced) {
            renderableInstanced = {
                transform: [],
                geometry: geometry,
                shader: shader,
                modelMatrixBuffer: Buffer.Create(this.MAX_INSTANCE_COUNT * 4 * 16, BufferType.STORAGE)
            };
        }

        if (renderableInstanced.transform.length > this.MAX_INSTANCE_COUNT) {
            console.warn("Cannot exceed MAX_INSTANCE_COUNT.");
            return;
        }
        renderableInstanced.transform.push(transform);
        this.renderableInstanced.set(key, renderableInstanced);
        this.transformMap.set(transform, {buffer: renderableInstanced.modelMatrixBuffer, index: renderableInstanced.transform.length-1});
    }

    public static AddMesh(mesh: Mesh) {
        const geometry = mesh.GetGeometry();
        const shaders = mesh.GetShaders();
        
        if (!geometry || !geometry.vertices) return;
        if (!shaders || shaders.length === 0) return;

        const transform = mesh.transform;
        for (const shader of shaders) {
            if (mesh.enableGPUInstancing) this.AddRenderableInstanced(transform, geometry, shader);
            else this.AddRenderable(transform, geometry, shader);
        }
    }

    public static UpdateTransform(transform: Transform) {
        const transformMap = this.transformMap.get(transform);
        if (!transformMap) return;
        
        if (transformMap.index === -1) transformMap.buffer.SetArray(transform.localToWorldMatrix.elements);
        else transformMap.buffer.SetArray(transform.localToWorldMatrix.elements, 4 * 16 * transformMap.index);
    }
};