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
        const width = texture.dimension === "cube" ? texture.width * 4 : texture.width;
        const height = texture.dimension === "cube" ? texture.height * 3 : texture.height;

        this.canvasTexture = new CanvasTexture(width, height);
    }

    public async init() {
        const FormatToType = {
            "rgba8unorm": "float",
            "bgra8unorm": "float",
            "rgba16float": "float",
            "r32uint": "uint"
        }
        const isCube = this.texture.dimension === "cube";
        const type = FormatToType[this.texture.format];
        const cubeSample = `
            let cell = vec2<u32>(
                min(u32(floor(input.uv.x * 4.0)), 3u),
                min(u32(floor(input.uv.y * 3.0)), 2u)
            );

            let localUV = fract(vec2f(
                input.uv.x * 4.0,
                input.uv.y * 3.0
            ));

            let xy = localUV * 2.0 - vec2f(1.0);

            var valid = true;
            var dir = vec3f(0.0, 0.0, 1.0);

            // Cross layout:
            //        +Y
            // -X  +Z  +X  -Z
            //        -Y
            if (cell.x == 1u && cell.y == 0u) { dir = normalize(vec3f(xy.x, 1.0, xy.y)); }
            else if (cell.x == 0u && cell.y == 1u) { dir = normalize(vec3f(-1.0, -xy.y, xy.x)); }
            else if (cell.x == 1u && cell.y == 1u) { dir = normalize(vec3f(xy.x, -xy.y, 1.0)); }
            else if (cell.x == 2u && cell.y == 1u) { dir = normalize(vec3f(1.0, -xy.y, -xy.x)); }
            else if (cell.x == 3u && cell.y == 1u) { dir = normalize(vec3f(-xy.x, -xy.y, -1.0)); }
            else if (cell.x == 1u && cell.y == 2u) { dir = normalize(vec3f(xy.x, -1.0, -xy.y)); }
            else { valid = false; }

            let color = select(vec4f(0.0, 0.0, 0.0, 1.0), textureSample(texture, textureSampler, dir), valid);
        `;

        const floatSample = isCube ? cubeSample : `let color = textureSample(texture, textureSampler, input.uv);`;

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
            @group(0) @binding(1) var texture: ${isCube ? "texture_cube<f32>" : `texture_2d<${type === "float" ? "f32" : "u32"}>`};
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

        const sampler = new GPU.TextureSampler();
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