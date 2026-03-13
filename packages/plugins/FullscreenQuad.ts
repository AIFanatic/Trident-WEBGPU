import { Geometry, GPU } from "@trident/core";

interface FullscreenQuadParams {
    code: string;
    target: GPU.RenderTexture;
    init?: (resource: GPU.ResourcePool, shader: GPU.Shader) => void;
    preFrame?: (resource: GPU.ResourcePool, shader: GPU.Shader) => void;
    afterExecute?: (resource: GPU.ResourcePool, shader: GPU.Shader) => void;
}

export class FullscreenQuad extends GPU.RenderPass {
    public name: string = "FullscreenQuad";
    
    private shader: GPU.Shader;
    private geometry: Geometry;

    private params: FullscreenQuadParams;

    constructor(params: FullscreenQuadParams) {
        super();
        this.params = params;
    }

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
            code: this.params.code,
            colorOutputs: [
                { format: "rgba16float" },
            ],
        });

        this.geometry = Geometry.Plane();
        
        if (this.params.init) this.params.init(resources, this.shader);
    }

    public async preFrame(resources: GPU.ResourcePool) {
        if (this.params.preFrame) this.params.preFrame(resources, this.shader);
    }

    public async execute(resources: GPU.ResourcePool, ...args: any) {
        GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.params.target, clear: true }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();

        if (this.params.afterExecute) this.params.afterExecute(resources, this.shader);
    }
}