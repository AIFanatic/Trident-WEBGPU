export class RenderPass {
    public name: string;
    public inputs: string[] = []
    public outputs: string[] = [];

    public initialized: boolean = false;
    
    constructor(params: {inputs?: string[], outputs?: string[]}) {
        if (params.inputs) this.inputs = params.inputs;
        if (params.outputs) this.outputs = params.outputs;
    }

    public async init(resources: ResourcePool) {};
    public execute(resources: ResourcePool, ...args: any) {};
    public set(data: {inputs?: string[], outputs?: string[]}) {
        if (data.inputs) this.inputs = data.inputs;
        if (data.outputs) this.outputs = data.outputs;
    };
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
    private passes: RenderPass[] = [];
    private resourcePool: ResourcePool = new ResourcePool();

    public addPass(pass: RenderPass): void {
        this.passes.push(pass);
    }

    public async init() {
        const sortedPasses = this.topologicalSort();
        for (const pass of sortedPasses) {
            if (pass.initialized) continue;
            await pass.init(this.resourcePool);
            pass.initialized = true;
        }
    }
    public execute(): void {
        const sortedPasses = this.topologicalSort();
        for (const pass of sortedPasses) {
            // If on pass is not initialized skip everything else
            // this is because subsequent passes may depend on the current pass
            if (!pass.initialized) {
                console.log(`didnt execute ${pass.name} because its not initialized`);
                return;
            }
            const inputs = pass.inputs.map(value => this.resourcePool.getResource(value));
            pass.execute(this.resourcePool, ...inputs, ...pass.outputs);
        }
    }

    private topologicalSort(): RenderPass[] {
        const order: RenderPass[] = [];
        const visited: { [key: string]: boolean } = {};
        const tempMark: { [key: string]: boolean } = {};

        const visit = (pass: RenderPass) => {
            if (tempMark[pass.name]) {
                throw new Error("Cycle detected in graph");
            }

            if (!visited[pass.name]) {
                tempMark[pass.name] = true;

                this.passes.filter(p => {
                    return pass.outputs && p.inputs?.some(input => pass.outputs!.includes(input));
                }
                ).forEach(visit);

                visited[pass.name] = true;
                tempMark[pass.name] = false;
                order.unshift(pass);
            }
        };

        this.passes.forEach(pass => {
            if (!visited[pass.name]) {
                visit(pass);
            }
        });

        // return order;
        return this.passes;
    }
}