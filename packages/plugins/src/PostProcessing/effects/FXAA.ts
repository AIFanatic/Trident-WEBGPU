import { Geometry } from "../../../Geometry";
import { Vector2 } from "../../../math/Vector2";
import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
import { Renderer } from "../../../renderer/Renderer";
import { RendererContext } from "../../../renderer/RendererContext";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { Shader } from "../../../renderer/Shader";
import { RenderTexture } from "../../../renderer/Texture";
import { TextureSampler } from "../../../renderer/TextureSampler";

export class PostProcessingFXAA extends RenderPass {
    public name: string = "PostProcessingFXAA";
    private shader: Shader;
    private quadGeometry: Geometry;

    private renderTarget: RenderTexture;

    constructor() {
        super({inputs: [
            PassParams.LightingPassOutput,
        ]});
    }

    public async init() {
        // const code = `
        // struct VertexInput {
        //     @location(0) position : vec2<f32>,
        //     @location(1) uv : vec2<f32>,
        // };

        // struct VertexOutput {
        //     @builtin(position) position : vec4<f32>,
        //     @location(0) vUv : vec2<f32>,
        // };

        // @group(0) @binding(0) var textureSampler: sampler;
        // @group(0) @binding(1) var texture: texture_2d<f32>;
        // @group(0) @binding(2) var<storage, read> resolutionInv: vec2<f32>;

        // @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
        //     var output: VertexOutput;
        //     output.position = vec4(input.position, 0.0, 1.0);
        //     output.vUv = input.uv;
        //     return output;
        // }
        
        // // Ported from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/shaders/FXAAShader.js
        // const EDGE_STEP_COUNT: i32 = 6;
        // const EDGE_GUESS: f32 = 8.0;
        // const edgeSteps: array<f32, EDGE_STEP_COUNT> = array(1.0, 1.5, 2.0, 2.0, 2.0, 4.0);

		// const _ContrastThreshold = 0.0312;
		// const _RelativeThreshold = 0.063;
		// const _SubpixelBlending = 1.0;


		// fn Sample(tex2D: texture_2d<f32>, uv: vec2f) -> vec4f {
		// 	return textureSampleLevel( tex2D, textureSampler, uv, 0);
		// }

		// fn SampleLuminance1(tex2D: texture_2d<f32>, uv: vec2f ) -> f32 {
		// 	return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );
		// }

		// fn SampleLuminance2(tex2D: texture_2d<f32>, texSize: vec2f, uv: vec2f, uOffset: f32, vOffset: f32 ) -> f32 {
		// 	let _uv = uv + texSize * vec2(uOffset, vOffset);
		// 	return SampleLuminance1(tex2D, _uv);
		// }

		// struct LuminanceData {
		// 	m: f32, n: f32, e: f32, s: f32, w: f32,
		// 	ne: f32, nw: f32, se: f32, sw: f32,
		// 	highest: f32, lowest: f32, contrast: f32
		// };

		// fn SampleLuminanceNeighborhood(tex2D: texture_2d<f32>, texSize: vec2f, uv: vec2f ) -> LuminanceData {
		// 	var l: LuminanceData;
		// 	l.m = SampleLuminance1( tex2D, uv );
		// 	l.n = SampleLuminance2( tex2D, texSize, uv,  0.0,  1.0 );
		// 	l.e = SampleLuminance2( tex2D, texSize, uv,  1.0,  0.0 );
		// 	l.s = SampleLuminance2( tex2D, texSize, uv,  0.0, -1.0 );
		// 	l.w = SampleLuminance2( tex2D, texSize, uv, -1.0,  0.0 );

		// 	l.ne = SampleLuminance2( tex2D, texSize, uv,  1.0,  1.0 );
		// 	l.nw = SampleLuminance2( tex2D, texSize, uv, -1.0,  1.0 );
		// 	l.se = SampleLuminance2( tex2D, texSize, uv,  1.0, -1.0 );
		// 	l.sw = SampleLuminance2( tex2D, texSize, uv, -1.0, -1.0 );

		// 	l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
		// 	l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
		// 	l.contrast = l.highest - l.lowest;
		// 	return l;
		// }

		// fn ShouldSkipPixel(l: LuminanceData) -> bool {
		// 	let threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
		// 	return l.contrast < threshold;
		// }

		// fn DeterminePixelBlendFactor( l: LuminanceData) -> f32 {
		// 	var f = 2.0 * ( l.n + l.e + l.s + l.w );
		// 	f += l.ne + l.nw + l.se + l.sw;
		// 	f *= 1.0 / 12.0;
		// 	f = abs( f - l.m );
		// 	f = clamp( f / l.contrast, 0.0, 1.0 );

		// 	let blendFactor = smoothstep( 0.0, 1.0, f );
		// 	return blendFactor * blendFactor * _SubpixelBlending;
		// }

		// struct EdgeData {
		// 	isHorizontal: bool,
		// 	pixelStep: f32,
		// 	oppositeLuminance: f32, gradient: f32
		// };

		// fn DetermineEdge(texSize: vec2f, l: LuminanceData) -> EdgeData {
		// 	var e: EdgeData;
		// 	let horizontal =
		// 		abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
		// 		abs( l.ne + l.se - 2.0 * l.e ) +
		// 		abs( l.nw + l.sw - 2.0 * l.w );
		// 	let vertical =
		// 		abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
		// 		abs( l.ne + l.nw - 2.0 * l.n ) +
		// 		abs( l.se + l.sw - 2.0 * l.s );
		// 	e.isHorizontal = horizontal >= vertical;

		// 	let pLuminance = select(l.e, l.n, e.isHorizontal);
		// 	let nLuminance = select(l.w, l.s, e.isHorizontal);
		// 	let pGradient = abs( pLuminance - l.m );
		// 	let nGradient = abs( nLuminance - l.m );

		// 	e.pixelStep = select(texSize.x, texSize.y, e.isHorizontal);
			
		// 	if (pGradient < nGradient) {
		// 		e.pixelStep = -e.pixelStep;
		// 		e.oppositeLuminance = nLuminance;
		// 		e.gradient = nGradient;
		// 	} else {
		// 		e.oppositeLuminance = pLuminance;
		// 		e.gradient = pGradient;
		// 	}

		// 	return e;
		// }
        
        // fn DetermineEdgeBlendFactor(tex2D: texture_2d<f32>, texSize: vec2f, l: LuminanceData, e: EdgeData, uv: vec2f ) -> f32 {
		// 	var uvEdge: vec2f = uv;
		// 	var edgeStep: vec2f;
		// 	if (e.isHorizontal) {
		// 		uvEdge.y += e.pixelStep * 0.5;
		// 		edgeStep = vec2( texSize.x, 0.0 );
		// 	} else {
		// 		uvEdge.x += e.pixelStep * 0.5;
		// 		edgeStep = vec2( 0.0, texSize.y );
		// 	}

		// 	let edgeLuminance: f32 = ( l.m + e.oppositeLuminance ) * 0.5;
		// 	let gradientThreshold: f32 = e.gradient * 0.25;

		// 	var puv: vec2f = uvEdge + edgeStep * edgeSteps[0];
		// 	var pLuminanceDelta: f32 = SampleLuminance1( tex2D, puv ) - edgeLuminance;
		// 	var pAtEnd: bool = abs( pLuminanceDelta ) >= gradientThreshold;

		// 	for (var i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++) {
		// 		puv += edgeStep * edgeSteps[i];
		// 		pLuminanceDelta = SampleLuminance1( tex2D, puv ) - edgeLuminance;
		// 		pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
		// 	}

		// 	if ( !pAtEnd ) {
		// 		puv += edgeStep * EDGE_GUESS;
		// 	}

		// 	var nuv: vec2f = uvEdge - edgeStep * edgeSteps[0];
		// 	var nLuminanceDelta: f32 = SampleLuminance1( tex2D, nuv ) - edgeLuminance;
		// 	var nAtEnd: bool = abs( nLuminanceDelta ) >= gradientThreshold;

		// 	for (var i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++) {
		// 		nuv -= edgeStep * edgeSteps[i];
		// 		nLuminanceDelta = SampleLuminance1( tex2D, nuv ) - edgeLuminance;
		// 		nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
		// 	}

		// 	if ( !nAtEnd ) {
		// 		nuv -= edgeStep * EDGE_GUESS;
		// 	}

		// 	var pDistance: f32;
        //     var nDistance: f32;
		// 	if ( e.isHorizontal ) {
		// 		pDistance = puv.x - uv.x;
		// 		nDistance = uv.x - nuv.x;
		// 	} else {
		// 		pDistance = puv.y - uv.y;
		// 		nDistance = uv.y - nuv.y;
		// 	}

		// 	var shortestDistance: f32;
		// 	var deltaSign: bool;
		// 	if ( pDistance <= nDistance ) {
		// 		shortestDistance = pDistance;
		// 		deltaSign = pLuminanceDelta >= 0.0;
		// 	} else {
		// 		shortestDistance = nDistance;
		// 		deltaSign = nLuminanceDelta >= 0.0;
		// 	}

		// 	if (deltaSign == ( l.m - edgeLuminance >= 0.0 )) {
		// 		return 0.0;
		// 	}

		// 	return 0.5 - shortestDistance / ( pDistance + nDistance );
		// }

		// fn ApplyFXAA(tex2D: texture_2d<f32>, texSize: vec2f, _uv: vec2f ) -> vec4f {
        //     var uv: vec2f = _uv;
		// 	let luminance: LuminanceData = SampleLuminanceNeighborhood(tex2D, texSize, uv);
		// 	if ( ShouldSkipPixel( luminance ) ) {
		// 		return Sample( tex2D, uv );
		// 	}

		// 	let pixelBlend: f32 = DeterminePixelBlendFactor( luminance );
		// 	let edge: EdgeData = DetermineEdge( texSize, luminance );
		// 	let edgeBlend: f32 = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
		// 	let finalBlend: f32 = max( pixelBlend, edgeBlend );

		// 	if (edge.isHorizontal) {
		// 		uv.y += edge.pixelStep * finalBlend;
		// 	} else {
		// 		uv.x += edge.pixelStep * finalBlend;
		// 	}

		// 	return Sample(tex2D, uv);
		// }

        // @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        //     return ApplyFXAA(texture, resolutionInv, input.vUv );
        // }
        // `;

		const code = `
			struct VertexInput {
				@location(0) position : vec2<f32>,
				@location(1) uv : vec2<f32>,
			};

			struct VertexOutput {
				@builtin(position) position : vec4<f32>,
				@location(0) vUv : vec2<f32>,
			};

			@group(0) @binding(0) var textureSampler: sampler;
			@group(0) @binding(1) var texture: texture_2d<f32>;
			@group(0) @binding(2) var<storage, read> resolutionInv: vec2<f32>;

			@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
				var output: VertexOutput;
				output.position = vec4(input.position, 0.0, 1.0);
				output.vUv = input.uv;
				return output;
			}

			const FXAA_REDUCE_MIN: f32 = (1.0 / 128.0);
			const FXAA_REDUCE_MUL: f32 = (1.0 / 8.0);
			const FXAA_SPAN_MAX: f32 = 8.0;

			// optimized version for mobile, where dependent
			// texture reads can be a bottleneck
			fn fxaa(tex: texture_2d<f32>, fragCoord: vec2f, resolution: vec2f, v_rgbNW: vec2f, v_rgbNE: vec2f, v_rgbSW: vec2f, v_rgbSE: vec2f, v_rgbM: vec2f) -> vec4f {
				var color: vec4f = vec4f(0);
				let inverseVP: vec2f = vec2(1.0 / resolution.x, 1.0 / resolution.y);
				let rgbNW: vec3f     = textureSample(tex, textureSampler, v_rgbNW).xyz;
				let rgbNE: vec3f     = textureSample(tex, textureSampler, v_rgbNE).xyz;
				let rgbSW: vec3f     = textureSample(tex, textureSampler, v_rgbSW).xyz;
				let rgbSE: vec3f     = textureSample(tex, textureSampler, v_rgbSE).xyz;
				let texColor: vec4f  = textureSample(tex, textureSampler, v_rgbM);
				let rgbM: vec3f      = texColor.xyz;
				let luma: vec3f      = vec3(0.299, 0.587, 0.114);
				let lumaNW: f32    = dot(rgbNW, luma);
				let lumaNE: f32    = dot(rgbNE, luma);
				let lumaSW: f32    = dot(rgbSW, luma);
				let lumaSE: f32    = dot(rgbSE, luma);
				let lumaM: f32     = dot(rgbM, luma);
				let lumaMin: f32   = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
				let lumaMax: f32   = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));

				var dir: vec2f = vec2f(0);
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
				dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));

				let dirReduce: f32 = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);

				let rcpDirMin: f32 = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;

				let rgbA: vec3f = 0.5 * (textureSample(tex, textureSampler, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + textureSample(tex, textureSampler, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);
				let rgbB: vec3f = rgbA * 0.5 + 0.25 * (textureSample(tex, textureSampler, fragCoord * inverseVP + dir * -0.5).xyz + textureSample(tex, textureSampler, fragCoord * inverseVP + dir * 0.5).xyz);

				let lumaB = dot(rgbB, luma);
				if((lumaB < lumaMin) || (lumaB > lumaMax)) {
					color = vec4(rgbA, texColor.a);
				}
				else {
					color = vec4(rgbB, texColor.a);
				}
				return color;
			}

			@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
				let resolution: vec2f = vec2f(textureDimensions(texture, 0));
				let fragCoord: vec2f  = input.vUv * resolution;
			  
				let inverseVP: vec2f = 1.0 / resolution.xy;
				let v_rgbNW: vec2f   = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
				let v_rgbNE: vec2f   = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
				let v_rgbSW: vec2f   = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
				let v_rgbSE: vec2f   = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
				let v_rgbM: vec2f    = vec2(fragCoord * inverseVP);
				
				return fxaa(texture, fragCoord, resolution, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
			}
		`;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
                resolutionInv: {group: 0, binding: 2, type: "storage"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
        this.shader.SetVector2("resolutionInv", new Vector2(1 / Renderer.width, 1 / Renderer.height));

        this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);

        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;

        this.shader.SetTexture("texture", LightingPassOutputTexture);

        RendererContext.BeginRenderPass(this.name, [{clear: false, target: this.renderTarget}], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
        
        RendererContext.CopyTextureToTexture(this.renderTarget, LightingPassOutputTexture);

        resources.setResource(PassParams.LightingPassOutput, LightingPassOutputTexture);
    }
}