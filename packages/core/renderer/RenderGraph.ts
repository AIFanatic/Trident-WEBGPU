import type { Geometry } from "../Geometry";
import type { Shader } from "./Shader";

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
    public preFrame(resources: ResourcePool) { };
    public preRender(resources: ResourcePool) { };
    public execute(resources: ResourcePool) { };
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

    public preFrame() { for (const pass of this.passes) if (pass.initialized) pass.preFrame(this.resourcePool) }
    public preRender() { for (const pass of this.passes) if (pass.initialized) pass.preRender(this.resourcePool) }
    public execute() { for (const pass of this.passes) if (pass.initialized) pass.execute(this.resourcePool) }
}