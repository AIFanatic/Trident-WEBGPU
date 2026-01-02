import { Geometry, GPU } from "@trident/core";

export class CanvasTexture {
    public readonly canvas: HTMLCanvasElement;
    public readonly context: GPUCanvasContext;

    constructor(width: number, height: number) {
        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext("webgpu");
    }

    private init() {
        const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: GPU.Renderer.device,
            format: presentationFormat,
        });
    }

    public GetView(): GPUTextureView {
        this.init();
        return this.context.getCurrentTexture().createView();
    }
}

export class TextureViewer {
    private shader: GPU.Shader;
    private quadGeometry: Geometry;

    private readonly texture: GPU.Texture;
    public readonly canvasTexture: CanvasTexture;

    constructor(texture: GPU.Texture) {
        this.texture = texture;
        this.canvasTexture = new CanvasTexture(texture.width, texture.height);
    }

    public async init() {
        const FormatToType = {
            "bgra8unorm": "float",
            "rgba16float": "float",
            "r32uint": "uint"
        }
        const type = FormatToType[this.texture.format];
        const floatSample = `let color = textureSample(texture, textureSampler, input.uv);`;
        const uintSample = `
        let coords = input.uv * vec2f(textureDimensions(texture));
        let color = vec4f(textureLoad(texture, vec2i(coords), 0));
        `;
        const code = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) uv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<${type === "float" ? "f32" : "u32"}>;
        // Full-screen triangle (covers screen with 3 verts)
        const p = array<vec2f, 3>(
            vec2f(-1.0, -1.0),
            vec2f( 3.0, -1.0),
            vec2f(-1.0,  3.0)
        );

        @vertex fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
            var out : VertexOutput;
            out.position = vec4f(p[vertexIndex], 0.0, 1.0);
          
            // Derive UVs from NDC: ([-1,1] -> [0,1])
            let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
            out.uv = vec2f(uv.x, 1.0 - uv.y); // flip Y if your texture space needs it
            return out;
        }
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            // let color = textureSample(texture, textureSampler, input.uv);
            ${type === "float" ? floatSample : uintSample}
            return color;
        }
        `;

        this.shader = await GPU.Shader.Create({
            code: code,
            colorOutputs: [{format: GPU.Renderer.SwapChainFormat}],
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
            }
        });
        this.quadGeometry = new Geometry();

        const sampler = GPU.TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
        this.shader.SetTexture("texture", this.texture);
    }

    public async execute() {
        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass("TextureViewer", [{target: this.canvasTexture, clear: true}]);
        GPU.RendererContext.Draw(this.quadGeometry, this.shader, 3);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
    }
}