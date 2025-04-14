import { Geometry } from "../Geometry";
import { Buffer, BufferType } from "../renderer/Buffer";
import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { DepthTexture, RenderTexture, Texture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";

export class BilateralFilter extends RenderPass {
    private shader: Shader;
    private geometry: Geometry;

    private inputTexture: Texture;
    private renderTarget: RenderTexture;

    private blurDir: Buffer;
    private blurDirHorizontal: Buffer;
    private blurDirVertical: Buffer;

    private _filterSize: number = 12;
    private _blurDepthThreshold: number = 0.05;
    private _blurNormalThreshold: number = 0.25;

    public get filterSize(): number { return this._filterSize; }
    public get blurDepthThreshold(): number { return this._blurDepthThreshold; }
    public get blurNormalThreshold(): number { return this._blurNormalThreshold; }

    public set filterSize(value: number) { this.shader.SetValue("filterSize", value); }
    public set blurDepthThreshold(value: number) { this.shader.SetValue("blurDepthThreshold", value); }
    public set blurNormalThreshold(value: number) { this.shader.SetValue("blurNormalThreshold", value); }

    constructor() {
        super({});
    }

    public async init(resources: ResourcePool) {
        this.shader = await Shader.Create({
            code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(1) var texSampler: sampler;

            @group(0) @binding(2) var depthTex: texture_depth_2d;
            @group(0) @binding(3) var depthSampler: sampler;

            @group(0) @binding(4) var normalTex: texture_2d<f32>;
            @group(0) @binding(5) var normalSampler: sampler;

            @group(0) @binding(6) var<storage, read> blurDir: vec4<f32>;

            @group(0) @binding(7) var<storage, read> filterSize: f32;
            @group(0) @binding(8) var<storage, read> blurDepthThreshold: f32;
            @group(0) @binding(9) var<storage, read> blurNormalThreshold: f32;

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

            fn atanVec4(a: vec4f, b: vec4f) -> vec4f {
                return vec4f(atan2(a.x, b.x), atan2(a.y, b.y), atan2(a.z, b.z), atan2(a.w, b.w));
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                // // Sample the center pixel (color, depth, and normal).
                // let centerColor: vec4f = textureSample(tex, texSampler, input.uv);
                // let centerDepth: f32 = textureSample(depthTex, depthSampler, input.uv);
                // let centerNormal: vec3f = normalize(
                //     textureSample(normalTex, normalSampler, input.uv).rgb * 2.0 - vec3f(1.0)
                // );
                
                // // Sigma parameters for the spatial and range terms.
                // // You may need to adjust these based on your image and desired blur.
                // let sigma_space: f32 = 2.0;
                // let sigma_color: f32 = 0.1;
                // let sigma_depth: f32 = 0.1;
                // let sigma_normal: f32 = 0.1;
                
                // var sum: vec4f = vec4f(0.0);
                // var weightSum: f32 = 0.0;
                
                // // Define a blur radius in texels (this is along the blur direction).
                // let radius: i32 = 4;
                
                // // Loop over the one-dimensional kernel in the blur direction.
                // for (var i: i32 = -radius; i <= radius; i = i + 1) {
                //     // Calculate the offset based on the blur direction.
                //     // (For horizontal pass, blurDir.xy = (1/width, 0),
                //     //  for vertical pass, blurDir.xy = (0, 1/height)).
                //     let offset: vec2f = blurDir.xy * f32(i);
                //     let sampleUV = input.uv + offset;
                    
                //     // Sample the textures at the offset position.
                //     let sampleColor: vec4f = textureSample(tex, texSampler, sampleUV);
                //     let sampleDepth: f32 = textureSample(depthTex, depthSampler, sampleUV);
                //     let sampleNormal: vec3f = normalize(
                //         textureSample(normalTex, normalSampler, sampleUV).rgb * 2.0 - vec3f(1.0)
                //     );
                    
                //     // --- Compute weights ---
                //     // Spatial weight based solely on the index (distance along one dimension).
                //     let spatialWeight: f32 = exp(-0.5 * (f32(i * i)) / (sigma_space * sigma_space));
                    
                //     // Color weight based on color difference.
                //     let colorDiff: f32 = length(sampleColor.rgb - centerColor.rgb);
                //     let colorWeight: f32 = exp(-0.5 * (colorDiff * colorDiff) / (sigma_color * sigma_color));
                    
                //     // Depth weight based on depth difference.
                //     let depthDiff: f32 = abs(centerDepth - sampleDepth);
                //     let depthWeight: f32 = exp(-0.5 * (depthDiff * depthDiff) / (sigma_depth * sigma_depth));
                    
                //     // Normal weight based on normal difference.
                //     let normalDiff: f32 = 1.0 - dot(centerNormal, sampleNormal);
                //     let normalWeight: f32 = exp(-0.5 * (normalDiff * normalDiff) / (sigma_normal * sigma_normal));
                    
                //     // Combine the weights.
                //     let weight: f32 = spatialWeight * colorWeight * depthWeight * normalWeight;
                    
                //     sum = sum + sampleColor * weight;
                //     weightSum = weightSum + weight;
                // }
                
                // // Normalize by the sum of weights.
                // return sum / weightSum;



                

                var color: vec3f = textureSampleLevel(tex, texSampler, input.uv, 0.).rgb;
                var depth: f32 = textureSampleLevel(depthTex, depthSampler, input.uv, 0);
            
                if (depth >= 1e6 || depth <= 0.) {
                    return vec4f(color, 1.);
                }
            
                var normal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv, 0.).rgb;
            
                let filterSizeI32: i32 = i32(filterSize);
                var sigma: f32 =  f32(filterSize);
                var two_sigma2: f32 = 2.0 * sigma * sigma;
            
                var sigmaDepth: f32 = blurDepthThreshold;
                var two_sigmaDepth2: f32 = 2.0 * sigmaDepth * sigmaDepth;
            
                var sigmaNormal: f32 = blurNormalThreshold;
                var two_sigmaNormal2: f32 = 2.0 * sigmaNormal * sigmaNormal;
            
                var sum: vec3f =  vec3f(0.);
                var wsum: f32 = 0.;

                // let sigma_space = 2.0;
            
                for (var x: i32 = -filterSizeI32; x <= filterSizeI32; x++) {
                    var coords = vec2f(f32(x));
                    var sampleColor: vec3f = textureSampleLevel(tex, texSampler, input.uv + coords * blurDir.xy, 0.).rgb;
                    var sampleDepth: f32 = textureSampleLevel(depthTex, depthSampler, input.uv + f32(x) * blurDir.xy, 0);
                    var sampleNormal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv + coords * blurDir.xy, 0.).rgb;
            
                    var r: f32 = dot(coords, coords);
                    var w: f32 = exp(-r / two_sigma2);
                    // let w: f32 = exp(-0.5 * (f32(x * x)) / (sigma_space * sigma_space));
            
                    var depthDelta: f32 = abs(sampleDepth - depth);
                    var wd: f32 = step(depthDelta, blurDepthThreshold);
            
                    var normalDelta: vec3f = abs(sampleNormal - normal);
                    var wn: f32 = step(normalDelta.x + normalDelta.y + normalDelta.z, blurNormalThreshold);
            
                    sum += sampleColor * w * wd * wn;
                    wsum += w * wd * wn;
                }
                
                return vec4f(sum / wsum, 1.);
                // return vec4f(color, 1.0);
            }


            // const pi = 3.14159265359;
            // const pi2 = 2.0 * pi;

            // fn hash(_x: u32) -> u32 {
            //     var x = _x;
            //     x ^= x >> 16;
            //     x *= 0x7feb352d;
            //     x ^= x >> 15;
            //     x *= 0x846ca68b;
            //     x ^= x >> 16;
                
            //     return x;
            // }

            // //https://www.shadertoy.com/view/WsBBR3 
            // fn randomFloat(state: u32) -> f32 {
            //     return f32(hash(state)) / 4294967296.0;
            // } 

            // fn randomDir(state: u32) -> vec2f {
            //     let z: f32 = randomFloat(state) * 2.0 - 1.0;
            //     let a: f32 = randomFloat(state) * pi2;
            //     let r: f32 = sqrt(1.0f - z * z);
            //     let x: f32 = r * cos(a);
            //     let y: f32 = r * sin(a);
            //     return vec2(x, y);
            // }

            // @fragment
            // fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            //     let STEPS: i32 = 16;
            //     let DIFF: f32 = 4.0;
            //     let RADIUS: f32 = 16.0;

            //     let iResolution: vec2f = vec2f(textureDimensions(tex));
            //     let radius: vec2f = (RADIUS / iResolution.xy);
            //     let diff: f32 = DIFF / 255.0;
            //     let pixel: vec3f = textureSample(tex, texSampler, input.uv).xyz;
                
            //     var result: vec3f = vec3(0.0, 0.0, 0.0);
            //     var totalWeight: f32 = 0.0;

            //     let seed: u32 = 54321;

            //     for(var i: i32 = 0; i < STEPS; i++) {
            //         let dir: vec2f = randomDir(seed).xy * radius;
            //         let randomPixel: vec3f = textureSample(tex, texSampler, input.uv + dir).xyz;
            //         let delta: vec3f = randomPixel - pixel;
            //         let weight: f32 = exp(-dot(delta, delta) / diff);
            //         result += randomPixel * weight;
            //         totalWeight += weight;
            //     }
                
            //     result = result / totalWeight;
            //     return vec4( result, 1.0);

            //     // var color: vec3f = textureSampleLevel(tex, texSampler, input.uv, 0.).rgb;
                
            //     // return vec4f(color, 1.);
            // }

            // fn normpdf(x: f32, sigma: f32) -> f32 {
            //     return 0.39894 * exp(-0.5 * x * x / (sigma * sigma)) / sigma;
            // }

            // fn normpdf3(v: vec3f, sigma: f32) -> f32 {
            //     return 0.39894 * exp(-0.5 * dot(v, v) / (sigma * sigma)) / sigma;
            // }

            // // const SIGMA = 10.0;
            // //#define BSIGMA 0.1
            // const BSIGMA = 0.3;
            // const MSIZE = 15;

            // @fragment
            // fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            //     let c = textureSample(tex, texSampler, input.uv);


            //     //declare stuff
            //     const kSize = (MSIZE-1)/2;
            //     var kernel: array<f32, MSIZE>;
            //     var bfinal_colour: vec3f = vec3(0.0);
            
            //     var bZ: f32 = 0.0;
            
            //     //create the 1-D kernel
            //     for (var j: i32 = 0; j <= kSize; j++) {
            //         kernel[kSize-j] = normpdf(f32(j), filterSize);
            //         kernel[kSize+j] = kernel[kSize-j];
            //     }


            //     let sourceTexelSize = 1.0 / vec2f(textureDimensions(tex));
            //     var cc: vec3f;
            //     var gfactor: f32;
            //     var bfactor: f32;
            //     let bZnorm: f32 = 1.0/normpdf(0.0, BSIGMA);
            //     //read out the texels
            //     for (var i: i32 = -kSize; i <= kSize; i++)
            //     {
            //         for (var j: i32 = -kSize; j <= kSize; j++)
            //         {
            //             // color at pixel in the neighborhood
            //             let coord: vec2f = input.uv.xy + vec2(f32(i), f32(j))*sourceTexelSize.xy;
            //             cc = textureSample(tex, texSampler, coord).rgb;
                
            //             // compute both the gaussian smoothed and bilateral
            //             gfactor = kernel[kSize+j]*kernel[kSize+i];
            //             bfactor = normpdf3(cc-c.rgb, BSIGMA)*bZnorm*gfactor;
            //             bZ += bfactor;
                
            //             bfinal_colour += bfactor*cc;
            //         }
            //     }

            //     return vec4f(bfinal_colour/bZ, 1.0);
            //     // return c;
            // }
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
                
                depthTex: { group: 0, binding: 2, type: "depthTexture" },
                depthSampler: { group: 0, binding: 3, type: "sampler" },

                normalTex: { group: 0, binding: 4, type: "texture" },
                normalSampler: { group: 0, binding: 5, type: "sampler" },

                blurDir: { group: 0, binding: 6, type: "storage" },
                
                filterSize: { group: 0, binding: 7, type: "storage" },
                blurDepthThreshold: { group: 0, binding: 8, type: "storage" },
                blurNormalThreshold: { group: 0, binding: 9, type: "storage" },
            },
        });

        this.shader.SetSampler("texSampler", TextureSampler.Create());
        this.shader.SetSampler("depthSampler", TextureSampler.Create());
        this.shader.SetSampler("normalSampler", TextureSampler.Create());

        this.blurDir = Buffer.Create(4 * 4, BufferType.STORAGE);
        this.blurDirHorizontal = Buffer.Create(4 * 4, BufferType.STORAGE);
        this.blurDirVertical = Buffer.Create(4 * 4, BufferType.STORAGE);

        this.shader.SetBuffer("blurDir", this.blurDir);

        this.shader.SetValue("filterSize", this.filterSize);
        this.shader.SetValue("blurDepthThreshold", this.blurDepthThreshold);
        this.shader.SetValue("blurNormalThreshold", this.blurNormalThreshold);

        this.geometry = Geometry.Plane();
        this.initialized = true;
    }

    public Process(texture: Texture, depthTex: DepthTexture, normalTex: Texture): RenderTexture {
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

        this.shader.SetTexture("depthTex", depthTex);
        this.shader.SetTexture("normalTex", normalTex);

        RendererContext.CopyTextureToTextureV3({texture: texture}, {texture: this.inputTexture});

        RendererContext.CopyBufferToBuffer(this.blurDirHorizontal, this.blurDir);
        RendererContext.BeginRenderPass("BilateralFilter - H", [{target: this.renderTarget, clear: true}], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTextureV3({texture: this.renderTarget}, {texture: this.inputTexture});

        RendererContext.CopyBufferToBuffer(this.blurDirVertical, this.blurDir);
        RendererContext.BeginRenderPass("BilateralFilter - V", [{target: this.renderTarget, clear: false}], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();

        return this.renderTarget;
    }
}