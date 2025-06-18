export class RenderPass {
    name;
    inputs = [];
    outputs = [];
    initialized = false;
    initializing = false;
    constructor(params) {
        if (params.inputs)
            this.inputs = params.inputs;
        if (params.outputs)
            this.outputs = params.outputs;
    }
    async init(resources) { }
    ;
    execute(resources, ...args) { }
    ;
    set(data) {
        if (data.inputs)
            this.inputs = data.inputs;
        if (data.outputs)
            this.outputs = data.outputs;
    }
    ;
}
export class ResourcePool {
    resources = {};
    setResource(name, resource) {
        this.resources[name] = resource;
    }
    getResource(name) {
        return this.resources[name];
    }
}
export class RenderGraph {
    passes = [];
    resourcePool = new ResourcePool();
    addPass(pass) {
        this.passes.push(pass);
    }
    async init() {
        const sortedPasses = this.topologicalSort();
        for (const pass of sortedPasses) {
            if (pass.initialized === true || pass.initializing === true)
                continue;
            pass.initializing = true;
            await pass.init(this.resourcePool);
            pass.initialized = true;
        }
    }
    execute() {
        const sortedPasses = this.topologicalSort();
        for (const pass of sortedPasses) {
            // If a pass is not initialized skip everything else
            // this is because subsequent passes may depend on the current pass
            if (!pass.initialized) {
                console.log(`didnt execute ${pass.name} because its not initialized`);
                return;
            }
            const inputs = pass.inputs.map(value => this.resourcePool.getResource(value));
            pass.execute(this.resourcePool, ...inputs, ...pass.outputs);
        }
    }
    topologicalSort() {
        // const order: RenderPass[] = [];
        // const visited: { [key: string]: boolean } = {};
        // const tempMark: { [key: string]: boolean } = {};
        // const visit = (pass: RenderPass) => {
        //     if (tempMark[pass.name]) {
        //         throw new Error("Cycle detected in graph");
        //     }
        //     if (!visited[pass.name]) {
        //         tempMark[pass.name] = true;
        //         this.passes.filter(p => {
        //             return pass.outputs && p.inputs?.some(input => pass.outputs!.includes(input));
        //         }
        //         ).forEach(visit);
        //         visited[pass.name] = true;
        //         tempMark[pass.name] = false;
        //         order.unshift(pass);
        //     }
        // };
        // this.passes.forEach(pass => {
        //     if (!visited[pass.name]) {
        //         visit(pass);
        //     }
        // });
        // return order;
        return this.passes;
    }
}
//# sourceMappingURL=RenderGraph.js.map