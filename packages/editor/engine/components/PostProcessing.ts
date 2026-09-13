import { Components, Runtime, GPU, SerializeField, Console, Mathf } from "@trident/core";
import { PostProcessingPass } from "@trident/plugins/PostProcessing/PostProcessingPass";
import { PostProcessingFXAA } from "@trident/plugins/PostProcessing/effects/FXAA";
import { PostProcessingSMAA } from "@trident/plugins/PostProcessing/effects/SMAA";
import { PostProcessingFog } from "@trident/plugins/PostProcessing/effects/Fog";
import { PostProcessingBloom } from "@trident/plugins/PostProcessing/effects/Bloom";

type ConsoleValueType = number | boolean | Mathf.Color;
function WriteConsole(name: string, value: ConsoleValueType) {
    const v = Console.getVar<ConsoleValueType>(name);
    if (v) v.value = value;
}

function ReadConsole(name: string): ConsoleValueType | null {
    const v = Console.getVar<ConsoleValueType>(name);
    if (v) return v.value;
    return null;
}

// ───────── Anti-aliasing (pick one) ─────────
export class AntiAliasingSettings {
    /** Fired when the effect list needs rebuilding. Assigned by the owning component. */
    public onChange = () => { };

    private _enableFXAA = false;
    private _enableSMAA = true;

    @SerializeField(Boolean) get enableFXAA() { return this._enableFXAA; }
    set enableFXAA(v: boolean) { this._enableFXAA = v; this.onChange(); }

    @SerializeField(Boolean) get enableSMAA() { return this._enableSMAA; }
    set enableSMAA(v: boolean) { this._enableSMAA = v; this.onChange(); }
}

// ───────── Tonemap / color ─────────
// These drive console vars consumed by TonemapPass rather than a PostProcessingPass effect.
export class TonemapSettings {
    // tonemapper: 0 = off, 1 = ACES.
    // exposure  : stops (use this for "brightness"; +1 = ×2 brightness).
    // contrast  : 1 = neutral.  saturation: 1 = neutral.
    private _tonemapper = 1;
    private _exposure = 0;
    private _contrast = 1;
    private _saturation = 1;

    @SerializeField(Number) get tonemapper() { return this._tonemapper; }
    set tonemapper(v: number) { this._tonemapper = v; WriteConsole("r_tonemapper", v); }

    @SerializeField(Number) get exposure() { return this._exposure; }
    set exposure(v: number) { this._exposure = v; WriteConsole("r_exposure", v); }

    @SerializeField(Number) get contrast() { return this._contrast; }
    set contrast(v: number) { this._contrast = v; WriteConsole("r_contrast", v); }

    @SerializeField(Number) get saturation() { return this._saturation; }
    set saturation(v: number) { this._saturation = v; WriteConsole("r_saturation", v); }

    /** Push every value at once — console vars may not exist while deserializing. */
    public Apply() {
        WriteConsole("r_tonemapper", this._tonemapper);
        WriteConsole("r_exposure", this._exposure);
        WriteConsole("r_contrast", this._contrast);
        WriteConsole("r_saturation", this._saturation);
    }
}

// ───────── Bloom ─────────
export class BloomSettings {
    public effect?: PostProcessingBloom;

    @SerializeField(Boolean) get enabled() { return ReadConsole("r_bloom_enabled") as boolean ; }
    set enabled(v: boolean) { WriteConsole("r_bloom_enabled", v) }

    @SerializeField(Number) get threshold() { return ReadConsole("r_bloom_threshold") as number; }
    set threshold(v: number) { WriteConsole("r_bloom_threshold", v) }

    @SerializeField(Number) get softThreshold() { return ReadConsole("r_bloom_soft_threshold") as number; }
    set softThreshold(v: number) { WriteConsole("r_bloom_soft_threshold", v) }

    @SerializeField(Number) get strength() { return ReadConsole("r_bloom_strength") as number; }
    set strength(v: number) { WriteConsole("r_bloom_strength", v) }

    @SerializeField(Number) get downsampleDistance() { return ReadConsole("r_bloom_downsample_distance") as number; }
    set downsampleDistance(v: number) { WriteConsole("r_bloom_downsample_distance", v) }

    @SerializeField(Number) get upsampleDistance() { return ReadConsole("r_bloom_upsample_distance") as number; }
    set upsampleDistance(v: number) { WriteConsole("r_bloom_upsample_distance", v) }

    @SerializeField(Number) get iterations() { return ReadConsole("r_bloom_iterations") as number; }
    set iterations(v: number) { WriteConsole("r_bloom_iterations", v) }
}

// ───────── Fog ─────────
export class FogSettings {
    public effect?: PostProcessingFog;

    @SerializeField(Boolean) get enabled() { return ReadConsole("r_fog_enabled") as boolean ; }
    set enabled(v: boolean) { WriteConsole("r_fog_enabled", v) }

    @SerializeField(Mathf.Color) get color() { return ReadConsole("r_fog_color") as Mathf.Color ; }
    set color(v: Mathf.Color) { WriteConsole("r_fog_color", v) }

    @SerializeField get baseHeight() { return ReadConsole("r_fog_base_height") as number ; }
    set baseHeight(v: number) { WriteConsole("r_fog_base_height", v) }

    @SerializeField get heightFalloff() { return ReadConsole("r_fog_height_falloff") as number ; }
    set heightFalloff(v: number) { WriteConsole("r_fog_height_falloff", v) }

    @SerializeField get density() { return ReadConsole("r_fog_density") as number ; }
    set density(v: number) { WriteConsole("r_fog_density", v) }

    @SerializeField get maxDistance() { return ReadConsole("r_fog_max_distance") as number ; }
    set maxDistance(v: number) { WriteConsole("r_fog_max_distance", v) }
}

export class PostProcessing extends Components.Component {
    public static type = "@trident/plugins/PostProcessing";
    public runInEditMode: boolean = true;

    // Runs at BeforeScreenOutput, i.e. AFTER tonemapping.
    private pass?: PostProcessingPass;
    // Runs at AfterLighting, i.e. BEFORE tonemapping, on linear HDR.
    private hdrPass?: PostProcessingPass;

    private fxaa?: PostProcessingFXAA;
    private smaa?: PostProcessingSMAA;

    @SerializeField(AntiAliasingSettings) public antiAliasing = new AntiAliasingSettings();
    @SerializeField(TonemapSettings) public tonemap = new TonemapSettings();
    @SerializeField(BloomSettings) public bloom = new BloomSettings();
    @SerializeField(FogSettings) public fog = new FogSettings();

    // ───────── Lifecycle ─────────
    public async Start() {
        if (this.pass) return;

        // Wire here rather than at construction: deserialization runs the setters before Start,
        // and the default no-op onChange keeps those from touching passes that don't exist yet.
        this.antiAliasing.onChange = () => this.SyncEffects();

        this.pass = Runtime.Renderer.RenderPipeline.AddPass(
            PostProcessingPass,
            GPU.RenderPassOrder.BeforeScreenOutput,
        );
        this.hdrPass = Runtime.Renderer.RenderPipeline.AddPass(
            PostProcessingPass,
            GPU.RenderPassOrder.BeforePostProcess,
        );

        this.SyncEffects();
        this.tonemap.Apply();
    }

    private SyncEffects() {
        if (this.pass) {
            const list: GPU.RenderPass[] = [];

            if (this.antiAliasing.enableSMAA) {
                this.smaa ??= new PostProcessingSMAA();
                list.push(this.smaa);
            }
            if (this.antiAliasing.enableFXAA) {
                this.fxaa ??= new PostProcessingFXAA();
                list.push(this.fxaa);
            }
            this.pass.effects = list;
        }

        if (this.hdrPass) {
            const hdrList: GPU.RenderPass[] = [];

            this.fog.effect ??= new PostProcessingFog();
            hdrList.push(this.fog.effect);
            
            this.bloom.effect ??= new PostProcessingBloom();
            hdrList.push(this.bloom.effect);

            this.hdrPass.effects = hdrList;
        }
    }

    public Destroy(): void {
        const pipeline = Runtime.Renderer.RenderPipeline;
        if (this.pass) pipeline.RemovePass(this.pass, GPU.RenderPassOrder.BeforeScreenOutput);
        if (this.hdrPass) pipeline.RemovePass(this.hdrPass, GPU.RenderPassOrder.BeforePostProcess);

        this.fxaa?.Destroy?.();
        this.smaa?.Destroy?.();
        this.fog.effect?.Destroy?.();
        this.bloom.effect?.Destroy?.();

        this.pass = undefined;
        this.hdrPass = undefined;
        this.fxaa = undefined;
        this.smaa = undefined;
        this.fog.effect = undefined;
        this.bloom.effect = undefined;

        super.Destroy();
    }
}