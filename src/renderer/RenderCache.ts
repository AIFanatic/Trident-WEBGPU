import { Geometry } from "../Geometry";
import { InstancedMesh } from "../components/InstancedMesh";
import { Mesh } from "../components/Mesh";
import { Matrix4 } from "../math/Matrix4";
import { Buffer } from "../renderer/Buffer";
import { Shader } from "./Shader";

// ----meshlets
// ----deferred rendering
// ----shadows
// collect draw calls

// set shader params (pre-render)
// execute draw calls

// do lighting
// post processing
// output

type DrawType = "Draw" | "DrawIndirect" | "DrawInstanced";

interface DrawCallBase {
    // name: string;
    // colorTargets: RenderTarget[];
    // depthTarget: DepthTarget;
    // shaderParams: [{ name: string, buffer: any }]; // Shader params
    shader: Shader;                       // Shader to draw
    geometry: Geometry;                   // Geometry to draw
    // timestamp: boolean;
    type: DrawType;
}

interface Draw extends DrawCallBase {
    type: "Draw";
    mesh: Mesh;
}

interface DrawIndirect extends DrawCallBase {
    type: "DrawIndirect";
    indirectBuffer: Buffer;
}

interface DrawInstanced extends DrawCallBase {
    type: "DrawInstanced";
    instances: number;
    instancedMesh: InstancedMesh;
}

type DrawCall = Draw | DrawIndirect | DrawInstanced;

// const Draw = (drawCalls: DrawCall[]) => {
//     for (const drawCall of drawCalls) {
//         // Set shader parameters
//         for (const param of drawCall.shaderParams) {
//             if (param.buffer instanceof Texture) drawCall.shader.SetTexture(param.name, param.buffer);
//             else if (param.buffer instanceof Buffer) drawCall.shader.SetBuffer(param.name, param.buffer);
//             else if (param.buffer instanceof Matrix4) drawCall.shader.SetMatrix4(param.name, param.buffer);
//             else if (param.buffer instanceof TextureSampler) drawCall.shader.SetSampler(param.name, param.buffer);
//             else if (param.buffer instanceof Vector3) drawCall.shader.SetVector3(param.name, param.buffer);
//             else if (param.buffer instanceof ArrayBuffer) drawCall.shader.SetArray(param.name, param.buffer);
//             else drawCall.shader.SetValue(param.name, param.buffer);
//         }

//         RendererContext.BeginRenderPass(drawCall.name, drawCall.colorTargets, drawCall.depthTarget, drawCall.timestamp);
//         if (drawCall.type === DrawType.Draw) RendererContext.DrawGeometry(drawCall.geometry, drawCall.shader, 1);
//         else if (drawCall.type === DrawType.DrawInstanced) RendererContext.DrawGeometry(drawCall.geometry, drawCall.shader, drawCall.instances);
//         else if (drawCall.type === DrawType.DrawIndirect) RendererContext.DrawIndirect(drawCall.geometry, drawCall.shader, drawCall.indirectBuffer);
//     }
// }

export class RenderCache {
    public static renderableMeshes: DrawCall[] = [];

    public static Reset() {
        this.renderableMeshes = [];
    }
}