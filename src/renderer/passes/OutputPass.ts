import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";



// type VariableType = "u32" | "i32" | "f32" | "vec3<f32>" | "vec4<f32>" | "texture_2d<f32>";

// interface Builtin {
//     keyword: string;
//     name: string;
//     type: VariableType;
// }

// interface Location {
//     index: number;
//     name: string;
//     type: VariableType;
// }

// interface ShaderDefinition {
//     code: string;
//     inputs: (Builtin | Location)[];
//     outputs: (Builtin | Location)[];
// }

// interface ShaderBinding {
//     group: number;
//     binding: number;
//     name: string;
//     type: "texture_2d<f32>" | "textureSampler" | "vec3<f32>";
// }
// class ShaderV2 {
//     constructor(params: {bindings?: ShaderBinding[], vertexShader: ShaderDefinition, fragmentShader: ShaderDefinition}) {
//     }
// }

// const s = new ShaderV2({
//     bindings: [{group: 0, binding: 0, name: "texture", type: "texture_2d<f32>"}],
//     vertexShader: {
//         inputs: [
//             {keyword: "instance_index", name: "instanceIdx", type: "u32"},
//             {index: 0, name: "position", type: "vec3<f32>"},
//             {index: 1, name: "normal", type: "vec3<f32>"},
//         ],
//         outputs: [
//             {keyword: "position", name: "position", type: "vec4<f32>"}
//         ],
//         code: `output.position = vec4(input.position, 1.0);`
//     },
//     fragmentShader: {
//         code: `
//             let uv = fragData.position.xy / vec2<f32>(textureDimensions(texture));
//             var color = textureSample(texture, textureSampler, uv);
//             output.color = color;
//         `,
//         inputs: [
//             {keyword: "position", name: "position", type: "vec4<f32>"}
//         ],
//         outputs: [
//             {index: 0, name: "color", type: "vec4<f32>"},
//         ]
//     }
// })



export class OutputPass extends RenderPass {
    public name: string = "OutputPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    private inputRenderTarget: string;

    constructor(inputRenderTarget: string) {
        super({inputs: [inputRenderTarget]});
        this.inputRenderTarget = inputRenderTarget;
        this.inputs = [this.inputRenderTarget];

        const code = `
        @group(0) @binding(0) var texture: texture_2d<f32>;
        @group(0) @binding(1) var textureSampler: sampler;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(texture));
            var color = textureSample(texture, textureSampler, uv);
            return color;
        }
        `;
        this.shader = Shader.Create({
            code: code,
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"}
            },
            uniforms: {
                texture: {location: 0, type: "storage"},
                textureSampler: {location: 1, type: "storage"},
            },
            targets: 1
        });
        // this.shader.depthTest = false;


        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool) {
        const texture = resources.getResource(this.inputRenderTarget) as RenderTexture;
        if (!texture) throw Error(`No texture passed to ${this.name}!`);
       
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const depthTarget = camera.depthTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("DebugOutputPass",
            [{target: renderTarget, clear: true, color: backgroundColor}],
            {target: depthTarget, clear: true}
        );

        RendererContext.SetScissor(0, 0, Renderer.width * 0.5, Renderer.height);
    
        this.shader.SetTexture("texture", texture);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}






export class Pass {
    public name: string = "OutputPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor() {
        const code = `
        @group(0) @binding(0) var texture: texture_2d<f32>;
        @group(0) @binding(1) var textureSampler: sampler;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(texture));
            var color = textureSample(texture, textureSampler, uv);
            return color;
        }
        `;
        
        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);
        this.quadGeometry = Geometry.Plane();
    }

    public execute(inputRenderTarget: RenderTexture, output1: string) {
        RendererContext.BeginRenderPass("DebugOutputPass",
            [{target: inputRenderTarget, clear: true}],
        );

        this.shader.SetTexture("texture", inputRenderTarget);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}