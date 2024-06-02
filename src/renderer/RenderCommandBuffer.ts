import { Geometry } from "../Geometry";
import { RenderTexture } from "./Texture";
import { Shader } from "./Shader";
import { Buffer } from "./Buffer";
import { Color } from "../math/Color";

type Command = 
    | { cmd: "SetRenderTarget", arg: RenderTexture | null }
    | { cmd: "SetDepthTarget", arg: RenderTexture | null }
    | { cmd: "ClearRenderTarget", arg: {clearColor: boolean, clearDepth: boolean, backgroundColor: Color} }
    | { cmd: "SetShader", arg: Shader }
    | { cmd: "SetGeometry", arg: Geometry }
    | { cmd: "SetVertexBuffer", arg: Buffer }
    | { cmd: "SetNormalBuffer", arg: Buffer }
    | { cmd: "SetIndexBuffer", arg: Buffer }
    | { cmd: "DrawIndexed", arg: {indexCount: number, instanceCount: number} }
;

export class RenderCommandBuffer {
    public readonly name: string;
    public commands: Map<Command["cmd"], Command> = new Map();

    constructor(name: string = "") {this.name = name};

    private SetCommand<K extends Command["cmd"]>(cmd: K, arg: Extract<Command, { cmd: K }>["arg"]) {
        const command: Command = { cmd, arg } as Command;
        this.commands.set(cmd, command);
    }

    public PopCommand<K extends Command["cmd"]>(cmd: K): Extract<Command, { cmd: K }>["arg"] | null {
        const command = this.commands.get(cmd);
        this.commands.delete(cmd);
        // @ts-ignore
        if (command) return command.arg;
        
        return null;
    }

    public ClearRenderTarget(clearColor: boolean, clearDepth: boolean, backgroundColor: Color) {
        this.SetCommand("ClearRenderTarget", {clearColor: clearColor, clearDepth: clearDepth, backgroundColor: backgroundColor});
    }

    public SetRenderTarget(renderTarget: RenderTexture | null, depthTarget: RenderTexture | null) {
        this.SetCommand("SetRenderTarget", renderTarget);
        this.SetCommand("SetDepthTarget", depthTarget);
    }

    public DrawMesh(geometry: Geometry, shader: Shader, instances: number = 1) {
        this.SetCommand("SetGeometry", geometry);
        this.SetCommand("SetShader", shader);
        this.SetCommand("SetVertexBuffer", geometry.vertexBuffer);
        this.SetCommand("SetNormalBuffer", geometry.normalBuffer);
        this.SetCommand("SetIndexBuffer", geometry.indexBuffer);
        this.SetCommand("DrawIndexed", {indexCount: geometry.indexBuffer.size / 4, instanceCount: instances});
    }
}