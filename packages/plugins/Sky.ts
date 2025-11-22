// From: https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Sky.js
// Check https://github.com/diharaw/sky-models/tree/master

import {
    Components,
    GPU,
    Geometry,
    Mathf,
    Scene,
} from "@trident/core";

export class Sky extends GPU.RenderPass {
    public name: string = "Sky";
    public output: GPU.RenderTexture;

    private geometry: Geometry;
    private shader: GPU.Shader;

    public sunDirection: Mathf.Vector3 = new Mathf.Vector3(0, 0.035, -1);
    public rayleigh: number = 3;
    public turbidity: number = 10;
    public mieCoefficient: number = 0.005;
    public mieDirectionalG: number = 0.7;

    constructor() {
        super();
    }

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv: vec2<f32>,

                @location(1) vWorldPosition: vec3<f32>,
                @location(2) vSunDirection: vec3<f32>,
                @location(3) vSunfade: f32,
                @location(4) vBetaR: vec3<f32>,
                @location(5) vBetaM: vec3<f32>,
                @location(6) vSunE: f32,
            };

            struct Params {
                sunPosition: vec4<f32>,
                up: vec4<f32>,
                rayleigh: f32,
                turbidity: f32,
                mieCoefficient: f32,
                mieDirectionalG: f32
            };
            @group(0) @binding(0) var<storage, read> params: Params;
            @group(0) @binding(1) var<storage, read> cameraPosition: vec4<f32>;
            
            @group(0) @binding(2) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(3) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(4) var<storage, read> modelMatrix: mat4x4<f32>;
            
            // constants for atmospheric scattering
            const e = 2.71828182845904523536028747135266249775724709369995957;
            const pi = 3.141592653589793238462643383279502884197169;

            // wavelength of used primaries, according to preetham
            const lambda = vec3( 680E-9, 550E-9, 450E-9 );
            // this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
            // (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
            const totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

            // mie stuff
            // K coefficient for the primaries
            const v = 4.0;
            const K = vec3( 0.686, 0.678, 0.666 );
            // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
            const MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

            // earth shadow hack
            // cutoffAngle = pi / 1.95;
            const cutoffAngle = 1.6110731556870734;
            const steepness = 1.5;
            const EE = 1000.0;

            // constants for atmospheric scattering

            const n = 1.0003; // refractive index of air
            const N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

            // optical length at zenith for molecules
            const rayleighZenithLength = 8.4E3;
            const mieZenithLength = 1.25E3;
            // 66 arc seconds -> degrees, and the cosine of that
            const sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

            // 3.0 / ( 16.0 * pi )
            const THREE_OVER_SIXTEENPI = 0.05968310365946075;
            // 1.0 / ( 4.0 * pi )
            const ONE_OVER_FOURPI = 0.07957747154594767;

            fn sunIntensity( _zenithAngleCos: f32 ) -> f32 {
                let zenithAngleCos = clamp( _zenithAngleCos, -1.0, 1.0 );
                return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
            }

            fn totalMie( T: f32 ) -> vec3<f32> {
                let c = ( 0.2 * T ) * 10E-18;
                return 0.434 * c * MieConst;
            }
                
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                
            var output : VertexOutput;

                let worldPosition = (modelMatrix * vec4(input.position, 1.0 )).xyz;
                output.vWorldPosition = worldPosition.xyz;

                output.position = projectionMatrix * viewMatrix * vec4f(worldPosition, 1.0);
                output.position.z = output.position.w; // set z to camera.far

                output.uv = input.uv;

                output.vSunDirection = normalize( params.sunPosition.xyz );

                output.vSunE = sunIntensity( dot( output.vSunDirection, params.up.xyz ) );

                output.vSunfade = 1.0 - clamp( 1.0 - exp( ( params.sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

                let rayleighCoefficient = params.rayleigh - ( 1.0 * ( 1.0 - output.vSunfade ) );

                // extinction (absorption + out scattering)
                // rayleigh coefficients
                output.vBetaR = totalRayleigh * rayleighCoefficient;

                // mie coefficients
                output.vBetaM = totalMie( params.turbidity ) * params.mieCoefficient;

                return output;
            }

            fn rayleighPhase( cosTheta: f32 ) -> f32 {
                return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
            }

            fn hgPhase( cosTheta: f32, g: f32 ) -> f32 {
                let g2 = pow( g, 2.0 );
                let inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
                return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
            }
                
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

                let direction: vec3<f32> = normalize( input.vWorldPosition - cameraPosition.xyz );
                // optical length
                // cutoff angle at 90 to avoid singularity in next formula.
                let zenithAngle = acos( max( 0.0, dot( params.up.xyz, direction ) ) );
                let inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
                let sR = rayleighZenithLength * inverse;
                let sM = mieZenithLength * inverse;

                // combined extinction factor
                let Fex = exp( -( input.vBetaR * sR + input.vBetaM * sM ) );

                // in scattering
                let cosTheta = dot( direction, input.vSunDirection );

                let rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
                let betaRTheta = input.vBetaR * rPhase;

                let mPhase = hgPhase( cosTheta, params.mieDirectionalG );
                let betaMTheta = input.vBetaM * mPhase;



                var Lin = pow( input.vSunE * ( ( betaRTheta + betaMTheta ) / ( input.vBetaR + input.vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
                Lin *= mix( vec3( 1.0 ), pow( input.vSunE * ( ( betaRTheta + betaMTheta ) / ( input.vBetaR + input.vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( params.up.xyz, input.vSunDirection ), 5.0 ), 0.0, 1.0 ) );

                // nightsky
                let theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
                let phi = atan2( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
                let uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
                var L0 = vec3( 0.1 ) * Fex;

                // composition + solar disc
                let sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
                L0 += ( input.vSunE * 19000.0 * Fex ) * sundisk;

                let texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

                let retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * input.vSunfade ) ) ) );

                return vec4(retColor, 1.0);
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
                params: {group: 0, binding: 0, type: "storage"},
                cameraPosition: {group: 0, binding: 1, type: "storage"},
                projectionMatrix: {group: 0, binding: 2, type: "storage"},
                viewMatrix: {group: 0, binding: 3, type: "storage"},
                modelMatrix: {group: 0, binding: 4, type: "storage"},
            },
            cullMode: "front",
        })

        this.geometry = Geometry.Cube();
        
        const p = new Mathf.Vector3();
        const r = new Mathf.Quaternion();
        const scale = 1000;
        const s = new Mathf.Vector3(scale,scale,scale);
        this.shader.SetMatrix4("modelMatrix", new Mathf.Matrix4().compose(p,r,s));

        this.output = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        this.initialized = true;
    }

    public async preFrame() {
        const mainCamera = Components.Camera.mainCamera;

        // sunPosition: vec4<f32>,
        // up: vec4<f32>
        // rayleigh: f32,
        // turbidity: f32,
        // mieCoefficient: f32,
        // mieDirectionalG: f32

        this.shader.SetArray("params", new Float32Array([
            ...this.sunDirection.elements, 0, // sunPosition
            ...new Mathf.Vector3(0, 1, 0).elements, 0, // up
            this.rayleigh, // rayleigh
            this.turbidity, // turbidity
            this.mieCoefficient, // mieCoefficient
            this.mieDirectionalG, // mieDirectionalG
        ]));

        const camera = Components.Camera.mainCamera;
        this.shader.SetArray("cameraPosition", new Float32Array([...camera.transform.position.elements, 0]));

        this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
    }

    public async execute() {
        if (!this.initialized) return;

        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass(this.name, [ { target: this.output, clear: false } ], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
    }
}