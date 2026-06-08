import { Components, Runtime, GPU, SerializeField, GameObject, Mathf } from "@trident/core";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { Sky } from "@trident/plugins/Environment/Sky";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";

export class EnvironmentManager extends Components.Component {
    public static type = "@trident/plugins/EnvironmentManager";

    public runInEditMode: boolean = true;

    @SerializeField(GameObject) sunlight: Components.DirectionalLight;

    private sky: Sky;
    private iblPass: IBLLightingPass;
    private skyboxPass: SkyboxPass;

    private solidColorTexture: GPU.CubeTexture;
    private currentSkyCubemap: GPU.CubeTexture;

    private _enableSky = true;

    @SerializeField(Boolean) public get enableSky() {
        return this._enableSky;
    }

    public set enableSky(value: boolean) {
        this._enableSky = value;
        if (this._enableSky && this.sky) this.currentSkyCubemap = this.sky.skyTextureCubemap;
        else this.currentSkyCubemap = this.solidColorTexture;
        this.UpdateEnvironment();
    }

    private _sunElevation: number = 60;

    @SerializeField(Number) public get sunElevation() { return this._sunElevation }
    public set sunElevation(value: number) {
        this._sunElevation = value;

        this.UpdateEnvironment();
        this.UpdateSunlight();
    }

    private _sunAzimuth: number = 40;

    @SerializeField(Number) public get sunAzimuth() { return this._sunAzimuth }
    public set sunAzimuth(value: number) {
        this._sunAzimuth = value;

        this.UpdateSunlight();
        this.UpdateEnvironment();
    }

    private UpdateEnvironment() {
        if (this.iblPass) this.iblPass.SetEnvironment(this.currentSkyCubemap);
        if (this.skyboxPass) this.skyboxPass.SetSkybox(this.currentSkyCubemap);
    }

    private UpdateSunlight() {
        if (!this.sunlight) return;

        this.sky.SUN_ELEVATION_DEGREES = this._sunElevation;
        this.sky.SUN_AZIMUTH_DEGREES = this._sunAzimuth;

        const radius = 1; // distance of the directional light from origin
        const elevationRad = Mathf.Deg2Rad * this.sky.SUN_ELEVATION_DEGREES;
        const azimuthRad = Mathf.Deg2Rad * this.sky.SUN_AZIMUTH_DEGREES;

        // Convert spherical coordinates to 3D position
        const x = radius * Mathf.Cos(elevationRad) * Mathf.Cos(azimuthRad);
        const y = radius * Mathf.Sin(elevationRad);
        const z = radius * Mathf.Cos(elevationRad) * Mathf.Sin(azimuthRad);

        const sunPos = new Mathf.Vector3(x, y, z);

        this.sunlight.transform.position = sunPos;
        this.sunlight.transform.LookAtV1(new Mathf.Vector3(0, 0, 0));

        if (this.sky.SUN_ELEVATION_DEGREES < 0) this.sunlight.intensity = 0;
        else this.sunlight.intensity = this.sky.SUN_ELEVATION_DEGREES / 10;

        this.sky.Update();
    }

    public async Start() {
        this.solidColorTexture = GPU.CubeTexture.Create(1, 1, 6, "rgba8unorm");

        this.sky = new Sky();
        await this.sky.init();
        this._sunElevation = this.sky.SUN_ELEVATION_DEGREES;
        this._sunAzimuth = this.sky.SUN_AZIMUTH_DEGREES;

        const pipeline = Runtime.Renderer.RenderPipeline;
        console.log(GPU)
        this.iblPass = pipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
        this.skyboxPass = pipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

        this.currentSkyCubemap = this.sky.skyTextureCubemap;
        this.UpdateEnvironment();

        const lights = this.gameObject.scene.GetComponents(Components.DirectionalLight);
        if (lights.length > 0) {
            this.sunlight = lights[0];
            this.UpdateSunlight();
        }
    }

    public Destroy(): void {
        const pipeline = Runtime.Renderer.RenderPipeline;
        if (this.iblPass) pipeline.RemovePass(this.iblPass, GPU.RenderPassOrder.AfterLighting);
        if (this.skyboxPass) pipeline.RemovePass(this.skyboxPass, GPU.RenderPassOrder.AfterLighting);

        this.sky?.Destroy();
        this.solidColorTexture?.Destroy();   // <-- add this

        this.iblPass = undefined as any;
        this.skyboxPass = undefined as any;
        this.sky = undefined as any;
        this.solidColorTexture = undefined as any;
        this.currentSkyCubemap = undefined as any;   // borrowed pointer; just null

        super.Destroy();
    }
}