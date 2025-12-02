import { Scene, GPU } from "@trident/core";
import { Irradiance } from "./Irradiance";
import { Prefilter } from "./Prefilter";
import { BRDF } from "./BRDF";

export class Environment {
    private scene: Scene;

    private irradiance: Irradiance;
    private prefilter: Prefilter;
    private brdf: BRDF;

    private skyTexture: GPU.RenderTextureCube;

    constructor(scene: Scene, skyTexture: GPU.RenderTextureCube) {
        this.scene = scene;
        this.skyTexture = skyTexture;
    }

    public async init() {
        this.irradiance = new Irradiance();
        this.prefilter = new Prefilter();
        this.brdf = new BRDF();
        
        await this.irradiance.init();
        await this.prefilter.init();
        await this.brdf.init();

        this.Update();
    }

    public Update() {
        this.irradiance.Update(this.skyTexture);
        this.prefilter.Update(this.skyTexture);

        this.scene.renderPipeline.skybox = this.skyTexture;
        this.scene.renderPipeline.skyboxIrradiance = this.irradiance.irradianceTexture;
        this.scene.renderPipeline.skyboxPrefilter = this.prefilter.prefilterTexture;
        this.scene.renderPipeline.skyboxBRDFLUT = this.brdf.brdfTexture;
    }
}