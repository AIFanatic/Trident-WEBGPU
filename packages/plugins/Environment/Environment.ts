import { Scene, GPU, Renderer } from "@trident/core";
import { PrefilterDiffuse } from "./PrefilterDiffuse";
import { PrefilterSpecular } from "./PrefilterSpecular";
import { BRDF } from "./BRDF";

export class Environment {
    private prefilterDiffuse: PrefilterDiffuse;
    private prefilterSpecular: PrefilterSpecular;
    private brdf: BRDF;

    private skyTexture: GPU.RenderTextureCube;

    constructor(scene: Scene, skyTexture: GPU.RenderTextureCube) {
        this.skyTexture = skyTexture;
    }

    public async init() {
        this.prefilterDiffuse = new PrefilterDiffuse();
        this.prefilterSpecular = new PrefilterSpecular();
        this.brdf = new BRDF();
        
        await this.prefilterDiffuse.init();
        await this.prefilterSpecular.init();
        await this.brdf.init();

        this.Update();
    }

    public Update() {
        this.prefilterDiffuse.Update(this.skyTexture);
        this.prefilterSpecular.Update(this.skyTexture);

        Renderer.RenderPipeline.skybox = this.skyTexture;
        Renderer.RenderPipeline.skyboxPrefilterDiffuse = this.prefilterDiffuse.prefilterDiffuse;
        Renderer.RenderPipeline.skyboxPrefilterSpecular = this.prefilterSpecular.prefilterSpecular;
        Renderer.RenderPipeline.skyboxBRDFLUT = this.brdf.brdfTexture;
    }
}