import { Renderer } from "@trident/core";
import { RendererContext } from "@trident/core/renderer/RendererContext";
import { Shader } from "@trident/core/renderer/Shader";
import { RenderTexture } from "@trident/core/renderer/Texture";
import { TextureSampler } from "@trident/core/renderer/TextureSampler";
import { Geometry } from "@trident/core";

export class Dilator {
    public static async Dilate(texture: RenderTexture): Promise<RenderTexture> {
        const shader = await Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
    
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
                @location(1) vNormal : vec3<f32>,
            };
    
            @group(0) @binding(2) var texture: texture_2d<f32>;
            @group(0) @binding(3) var textureSampler: sampler;
    
            fn getMain(uv: vec2f) -> vec4f {
                return textureSampleLevel(texture, textureSampler, uv, 0);
            }

            fn getMask(uv: vec2f) -> f32 {
                return textureSampleLevel(texture, textureSampler, uv, 0).a;
            }

            fn frag_dilate( uv: vec2f , alpha: bool ) -> vec4f {
                var offsets: array<vec2f, 8>;
                offsets[0] = vec2f( -1, -1 );
                offsets[1] = vec2f(  0, -1 );
                offsets[2] = vec2f( 1, -1 );
                offsets[3] = vec2f( -1,  0 );
                offsets[4] = vec2f( 1,  0 );
                offsets[5] = vec2f( -1, 1 );
                offsets[6] = vec2f(  0, 1 );
                offsets[7] = vec2f( 1, 1 );

                var ref_main = getMain(uv); // tex2D( _MainTex, i.uv.xy );
                var ref_mask = getMask(uv); // tex2D( _MaskTex, i.uv.xy ).a;
                var result = vec4f(0);

                var dims = textureDimensions(texture);
                var _MainTex_TexelSize = vec4f(
                    1.0 / f32(dims.x),
                    1.0 / f32(dims.y),
                    f32(dims.x),
                    f32(dims.y)
                );
    
                if ( ref_mask == 0.0 )
                {
                    var hits = 0;
    
                    for ( var tap: i32 = 0; tap < 8; tap++ )
                    {
                        var uv = uv.xy + offsets[ tap ] * _MainTex_TexelSize.xy;
                        var main = getMain(uv); // tex2Dlod( _MainTex, float4( uv, 0, 0 ) );
                        var mask = getMask(uv); // tex2Dlod( _MaskTex, float4( uv, 0, 0 ) ).a;
    
                        if ( mask != ref_mask )
                        {
                            result += main;
                            hits++;
                        }
                    }
    
                    if ( hits > 0 )
                    {
                        if ( alpha )
                        {
                            result /= f32(hits);
                        }
                        else
                        {
                            result = vec4f( result.rgb / f32(hits), ref_main.a );
                        }
                    }
                    else
                    {
                        result = ref_main;
                    }
                }
                else
                {
                    result = ref_main;
                }
    
                return result;
            }

            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.vUv = input.uv;
                return output;
            }
            
            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                var co = textureSample(texture, textureSampler, input.vUv);
                var c = frag_dilate(input.vUv, true);
                c.a = co.a;
                return c;
            }
            `,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"}
            },
            uniforms: {
                texture: {group: 0, binding: 2, type: "texture"},
                textureSampler: {group: 0, binding: 3, type: "sampler"},
            },
            defines: {
            }
        });

        const geometry = Geometry.Plane();
        const output = RenderTexture.Create(texture.width, texture.height, texture.depth);

        const input = RenderTexture.Create(texture.width, texture.height, texture.depth);

        


        Renderer.BeginRenderFrame();
        
        RendererContext.CopyTextureToTexture(texture, input);

        for (let i = 0; i < 50; i++) {
            shader.SetTexture("texture", input);
            shader.SetSampler("textureSampler", TextureSampler.Create());
    
            RendererContext.BeginRenderPass("Dilator", [{target: output, clear: true}]);
            RendererContext.DrawGeometry(geometry, shader);
            RendererContext.EndRenderPass();

            RendererContext.CopyTextureToTexture(output, input);
        }
        Renderer.EndRenderFrame();

        return output;
    }
}