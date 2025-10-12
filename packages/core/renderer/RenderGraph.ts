import { Geometry } from "../Geometry";
import { Shader } from "./Shader";

export interface DrawCommand {
    geometry: Geometry;
    shader: Shader;
    instanceCount: number;
    firstInstance: number;
}

export class RenderPass {
    public name: string;

    public initialized: boolean = false;
    public initializing: boolean = false;
    protected readonly drawCommands: DrawCommand[] = [];

    public async init(resources: ResourcePool) { };
    public async preFrame(resources: ResourcePool) { };
    public async preRender(resources: ResourcePool) { };
    public async execute(resources: ResourcePool) { };
}

export class ResourcePool {
    private resources: { [key: string]: any } = {};

    setResource(name: string, resource: any): void {
        this.resources[name] = resource;
    }

    getResource(name: string): any {
        return this.resources[name];
    }
}

export class RenderGraph {
    public passes: RenderPass[] = [];
    public resourcePool: ResourcePool = new ResourcePool();

    public addPass(pass: RenderPass): void {
        this.passes.push(pass);
    }

    public async init() {
        for (const pass of this.passes) {
            if (pass.initialized === true || pass.initializing === true) continue;
            pass.initializing = true;
            await pass.init(this.resourcePool);
            pass.initialized = true;
        }
    }

    public async preFrame() { for (const pass of this.passes) if (pass.initialized) await pass.preFrame(this.resourcePool) }
    public async preRender() { for (const pass of this.passes) if (pass.initialized) await pass.preRender(this.resourcePool) }
    public async execute() { for (const pass of this.passes) if (pass.initialized) await pass.execute(this.resourcePool) }
}