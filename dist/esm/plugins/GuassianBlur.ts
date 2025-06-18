import { Geometry } from "../Geometry";
import { Buffer, BufferType } from "../renderer/Buffer";
import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { RenderTexture, Texture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";

export class GuassianBlur extends RenderPass {
    private shader: Shader;
    private geometry: Geometry;

    private inputTexture: Texture;
    private renderTarget: RenderTexture;

    private blurDir: Buffer;
    private blurDirHorizontal: Buffer;
    private blurDirVertical: Buffer;

    private _filterSize: number = 12;

    public get filterSize(): number { return this._filterSize; }

    public set filterSize(value: number) { this.shader.SetValue("filterSize", value); }

    constructor() {
        super({});
    }

    public async init(resources: ResourcePool) {
        this.shader = await Shader.Create({
            code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(1) var texSampler: sampler;

            @group(0) @binding(2) var<storage, read> blurDir: vec4<f32>;

            @group(0) @binding(3) var<storage, read> filterSize: f32;

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                var color: vec3f = textureSampleLevel(tex, texSampler, input.uv, 0.).rgb;
            
                let filterSizeI32: i32 = i32(filterSize);
                let sigma: f32 = f32(filterSize);
                let two_sigma2: f32 = 2.0 * sigma * sigma;
            
                var sum: vec3f = vec3f(0.0);
                var wsum: f32 = 0.0;
            
                for (var x: i32 = -filterSizeI32; x <= filterSizeI32; x++) {
                    let coords = vec2f(f32(x));
                    let offset = coords * blurDir.xy;
            
                    let sampleColor: vec3f = textureSampleLevel(tex, texSampler, input.uv + offset, 0.).rgb;
            
                    let r: f32 = dot(coords, coords);
                    let w: f32 = exp(-r / two_sigma2);
            
                    sum += sampleColor * w;
                    wsum += w;
                }
            
                return vec4f(sum / wsum, 1.0);
            }
            `,
            colorOutputs: [
                { format: "rgba16float" },
            ],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                tex: { group: 0, binding: 0, type: "texture" },
                texSampler: { group: 0, binding: 1, type: "sampler" },
                
                blurDir: { group: 0, binding: 2, type: "storage" },
                
                filterSize: { group: 0, binding: 3, type: "storage" },
            },
        });

        this.shader.SetSampler("texSampler", TextureSampler.Create());

        this.blurDir = Buffer.Create(4 * 4, BufferType.STORAGE);
        this.blurDirHorizontal = Buffer.Create(4 * 4, BufferType.STORAGE);
        this.blurDirVertical = Buffer.Create(4 * 4, BufferType.STORAGE);

        this.shader.SetBuffer("blurDir", this.blurDir);
        this.shader.SetValue("filterSize", this.filterSize);

        this.geometry = Geometry.Plane();
        this.initialized = true;
    }

    public Process(texture: Texture): RenderTexture {
        if (this.initialized === false) {
            throw Error("Not initialized")
        };

        if (!this.renderTarget || this.renderTarget.width !== texture.width || this.renderTarget.height !== texture.height || this.renderTarget.depth !== texture.depth) {
            this.inputTexture = Texture.Create(texture.width, texture.height, texture.depth, "rgba16float");
            this.renderTarget = RenderTexture.Create(texture.width, texture.height, texture.depth, "rgba16float");

            this.shader.SetTexture("tex", this.inputTexture);

            console.log(texture.width)
            this.blurDirHorizontal.SetArray(new Float32Array([1 / texture.width, 0, 0, 0]));
            this.blurDirVertical.SetArray(new Float32Array([0, 1 / texture.height, 0, 0]));
        }

        RendererContext.CopyTextureToTextureV3({texture: texture}, {texture: this.inputTexture});

        RendererContext.CopyBufferToBuffer(this.blurDirHorizontal, this.blurDir);
        RendererContext.BeginRenderPass("GuassianBlur - H", [{target: this.renderTarget, clear: true}], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTextureV3({texture: this.renderTarget}, {texture: this.inputTexture});

        RendererContext.CopyBufferToBuffer(this.blurDirVertical, this.blurDir);
        RendererContext.BeginRenderPass("GuassianBlur - V", [{target: this.renderTarget, clear: false}], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();

        return this.renderTarget;
    }
}