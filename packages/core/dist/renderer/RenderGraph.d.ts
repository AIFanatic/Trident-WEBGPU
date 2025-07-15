export declare class RenderPass {
    name: string;
    inputs: string[];
    outputs: string[];
    initialized: boolean;
    initializing: boolean;
    constructor(params: {
        inputs?: string[];
        outputs?: string[];
    });
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool, ...args: any): void;
    set(data: {
        inputs?: string[];
        outputs?: string[];
    }): void;
}
export declare class ResourcePool {
    private resources;
    setResource(name: string, resource: any): void;
    getResource(name: string): any;
}
export declare class RenderGraph {
    passes: RenderPass[];
    resourcePool: ResourcePool;
    addPass(pass: RenderPass): void;
    init(): Promise<void>;
    execute(): void;
    private topologicalSort;
}
//# sourceMappingURL=RenderGraph.d.ts.map