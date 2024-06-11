import { Shader } from "../Shader";
import { Geometry, IndexAttribute, VertexAttribute } from "../../Geometry";
import { DepthTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Light } from "../../components/Light";
import { Renderer } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";
import { Vector3 } from "../../math/Vector3";

export class LightingPass extends RenderPass {
    public name: string = "LightingPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    constructor(inputGBufferPosition: string, inputGBufferAlbedo: string, inputGBufferNormal: string, inputGbufferERMO: string, inputGBufferDepth: string) {
        super({ inputs: [inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth] });

        const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) normal : vec3<f32>,
            @location(2) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
            @location(1) normal : vec3<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;

        @group(0) @binding(1) var positionTexture: texture_2d<f32>;
        @group(0) @binding(2) var albedoTexture: texture_2d<f32>;
        @group(0) @binding(3) var normalTexture: texture_2d<f32>;
        @group(0) @binding(4) var ermoTexture: texture_2d<f32>;
        @group(0) @binding(5) var depthTexture: texture_depth_2d;
        

        struct Light {
            position: vec4<f32>,
            color: vec4<f32>,
        };

        @group(0) @binding(6) var<storage, read> lights: array<Light>;
        @group(0) @binding(7) var<storage, read> lightCount: u32;




        @group(0) @binding(9) var<storage, read> projectionOutputSize: vec3<f32>;
        @group(0) @binding(10) var<storage, read> projectionInverseMatrix: mat4x4<f32>;
        @group(0) @binding(11) var<storage, read> viewInverseMatrix: mat4x4<f32>;
        @group(0) @binding(12) var<storage, read> viewPosition: vec3<f32>;

        @vertex
        fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            output.normal = input.normal;
            return output;
        }
        const PI = 3.141592653589793;

        

        struct PointLight {
            pointToLight: vec3<f32>,
            color: vec3<f32>,
            range: f32,
            intensity: f32,
        }

        struct DirectionalLight {
            direction: vec3<f32>,
            color: vec3<f32>,
        }

        struct Surface {
            albedo: vec4<f32>,
            metallic: f32,
            roughness: f32,
            worldPos: vec4<f32>,
            N: vec3<f32>,
            F0: vec3<f32>,
            V: vec3<f32>,
        };
        
        fn reconstructWorldPosFromZ(
            coords: vec2<f32>,
            size: vec2<f32>,
            depthTexture: texture_depth_2d,
            projInverse: mat4x4<f32>,
            viewInverse: mat4x4<f32>
          ) -> vec4<f32> {
            let uv = coords.xy / size;
            var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);
                let x = uv.x * 2.0 - 1.0;
                let y = (1.0 - uv.y) * 2.0 - 1.0;
                let projectedPos = vec4(x, y, depth, 1.0);
                var worldPosition = projInverse * projectedPos;
                worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
                worldPosition = viewInverse * worldPosition;
            return worldPosition;
        }

        fn DistributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
            let a      = roughness*roughness;
            let a2     = a*a;
            let NdotH  = max(dot(N, H), 0.0);
            let NdotH2 = NdotH*NdotH;
        
            let num   = a2;
            var denom = (NdotH2 * (a2 - 1.0) + 1.0);
            denom = PI * denom * denom;
            return num / denom;
        }
    
        fn GeometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
            let r = (roughness + 1.0);
            let k = (r*r) / 8.0;
    
            let num   = NdotV;
            let denom = NdotV * (1.0 - k) + k;
    
            return num / denom;
        }
    
        fn GeometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
            let NdotV = max(dot(N, V), 0.0);
            let NdotL = max(dot(N, L), 0.0);
            let ggx2  = GeometrySchlickGGX(NdotV, roughness);
            let ggx1  = GeometrySchlickGGX(NdotL, roughness);
    
            return ggx1 * ggx2;
        }
    
        fn FresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
            return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
        } 
    
        fn rangeAttenuation(range : f32, distance : f32) -> f32 {
            if (range <= 0.0) {
                // Negative range means no cutoff
                return 1.0 / pow(distance, 2.0);
            }
            return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
        }
        
        fn PointLightRadiance(light : PointLight, surface : Surface) -> vec3<f32> {
            let L = normalize(light.pointToLight);
            let H = normalize(surface.V + L);
            let distance = length(light.pointToLight);
        
            // cook-torrance brdf
            let NDF = DistributionGGX(surface.N, H, surface.roughness);
            let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);
            let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);
        
            let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);
        
            let NdotL = max(dot(surface.N, L), 0.0);
        
            let numerator = NDF * G * F;
            let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);
            let specular = numerator / vec3(denominator, denominator, denominator);
        
            // add to outgoing radiance Lo
            let attenuation = rangeAttenuation(light.range, distance);
            let radiance = light.color * light.intensity * attenuation;
            return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * radiance * NdotL;
        }
        
        fn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {
            let L = normalize(light.direction);
            let H = normalize(surface.V + L);
        
            // cook-torrance brdf
            let NDF = DistributionGGX(surface.N, H, surface.roughness);
            let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);
            let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);
        
            let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);
        
            let NdotL = max(dot(surface.N, L), 0.0);
        
            let numerator = NDF * G * F;
            let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);
            let specular = numerator / vec3(denominator, denominator, denominator);
        
            // add to outgoing radiance Lo
            let radiance = light.color;
            return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * radiance * NdotL;
        }

        fn Tonemap_ACES(x: vec3f) -> vec3f {
            // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"
            let a = 2.51;
            let b = 0.03;
            let c = 2.43;
            let d = 0.59;
            let e = 0.14;
            return (x * (a * x + b)) / (x * (c * x + d) + e);
        }

        fn OECF_sRGBFast(linear: vec3f) -> vec3f {
            return pow(linear, vec3(1.0 / 2.2));
        }



        @fragment
        fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
            // let uv = input.position.xy / vec2<f32>(textureDimensions(albedoTexture));
            let uv = input.vUv;
            var positionA = textureSample(positionTexture, textureSampler, uv).xyz;
            var albedo = textureSample(albedoTexture, textureSampler, uv).rgb;
            var normal = textureSample(normalTexture, textureSampler, uv).xyz;
            var ermo = textureSample(ermoTexture, textureSampler, uv).xyz;
            var depth = textureSample(depthTexture, textureSampler, uv);



            var color: vec3f = vec3(0);

            let worldPosition = reconstructWorldPosFromZ(
                input.position.xy,
                projectionOutputSize.xy,
                depthTexture,
                projectionInverseMatrix,
                viewInverseMatrix
            );

            var surface: Surface;
            surface.albedo = vec4(albedo, 1.0);
            surface.roughness = ermo.r;
            surface.metallic = ermo.g;
            surface.worldPos = worldPosition;
            surface.N = normal;
            surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
            surface.V = normalize(viewPosition - worldPosition.xyz);

            // output luminance to add to
            var Lo = vec3(0.0);
    
            for (var i : u32 = 0u; i < lightCount; i = i + 1u) {
                let light = lights[i];
                var pointLight: PointLight;
                
                
                pointLight.pointToLight = light.position.xyz - worldPosition.xyz;
                pointLight.color = light.color.rgb;
                // pointLight.range = 1000.0; // light.range;

                // // Don't calculate if too far away
                // if (distance(light.position.xyz, worldPosition.xyz) > pointLight.range) {
                //     continue;
                // }
                pointLight.intensity = light.color.a;
                Lo += PointLightRadiance(pointLight, surface);
            }


            let ambient = vec3(0.09) * albedo.rgb;
            color = ambient + Lo;

            // // color = Tonemap_ACES(color);
            // // color = OECF_sRGBFast(color);

            return vec4(color, 1.0);
            // return vec4(albedo, 1.0);
            // return vec4(worldPosition.xyz, 1.0);
            // return vec4(normal, 1.0);
        }
        `;
        this.shader = Shader.Create({
            code: code,
            attributes: {
                position: { location: 0, size: 2, type: "vec2" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: { location: 0, type: "storage" },
                positionTexture: { location: 1, type: "storage" },
                albedoTexture: { location: 2, type: "storage" },
                normalTexture: { location: 3, type: "storage" },
                ermoTexture: { location: 4, type: "storage" },
                depthTexture: { location: 5, type: "storage" },
                
                lights: { location: 6, type: "storage" },
                lightCount: { location: 7, type: "storage" },

                
                
                
                projectionOutputSize: { location: 9, type: "storage" },
                projectionInverseMatrix: { location: 10, type: "storage" },
                viewInverseMatrix: { location: 11, type: "storage" },
                viewPosition: { location: 12, type: "storage" },

            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        this.sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", this.sampler);

        const geometry = new Geometry();
        const vertices = new Float32Array([
            -1.0, -1.0,  // Bottom left
             1.0, -1.0,  // Bottom right
             1.0,  1.0,  // Top right
            -1.0,  1.0   // Top left
        ]);
        
        // UV coordinates
        const uvs = new Float32Array([
            0.0, 1.0,  // Bottom left (now top left)
            1.0, 1.0,  // Bottom right (now top right)
            1.0, 0.0,  // Top right (now bottom right)
            0.0, 0.0   // Top left (now bottom left)
        ]);
        
        // Indices for two triangles
        const indices = new Uint32Array([
            0, 1, 2,  // First triangle (bottom left to top right)
            2, 3, 0   // Second triangle (top right to top left)
        ]);

        const normals = new Float32Array([
            0.0, 0.0, 1.0,  // Normal for bottom left vertex
            0.0, 0.0, 1.0,  // Normal for bottom right vertex
            0.0, 0.0, 1.0,  // Normal for top right vertex
            0.0, 0.0, 1.0   // Normal for top left vertex
        ]);
        

        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        // geometry.ComputeNormals();
        this.quadGeometry = geometry;

        console.log(this.shader)
        // this.quadGeometry = Geometry.Plane();
    }

    public execute(resources: ResourcePool, inputGBufferPosition: RenderTexture, inputGBufferAlbedo: RenderTexture, inputGBufferNormal: RenderTexture, inputGbufferERMO: RenderTexture, inputGBufferDepth: DepthTexture) {
        const camera = Camera.mainCamera;
        const renderTarget = camera.renderTarget;
        const backgroundColor = camera.backgroundColor;

        RendererContext.BeginRenderPass("LightingPass", [{ clear: true, color: backgroundColor }]);

        // TODO: Should be reactive
        this.shader.SetTexture("positionTexture", inputGBufferPosition);
        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);

        const lights = Camera.mainCamera.gameObject.scene.GetComponents(Light);
        const lightBuffer = new Float32Array(lights.length * (4 + 4));
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            lightBuffer.set([
                light.transform.position.x, light.transform.position.y, light.transform.position.z, 1.0,
                light.color.r, light.color.g, light.color.b,
                light.intensity
            ], i * (4 + 4));
        }
        this.shader.SetArray("lights", lightBuffer);
        this.shader.SetArray("lightCount", new Uint32Array([lights.length]));

        
        const tempMatrix = new Matrix4();
        this.shader.SetVector3("projectionOutputSize", new Vector3(Renderer.width, Renderer.height, 0));
        tempMatrix.copy(camera.projectionMatrix).invert();
        this.shader.SetMatrix4("projectionInverseMatrix", tempMatrix);
        tempMatrix.copy(camera.viewMatrix).invert();
        this.shader.SetMatrix4("viewInverseMatrix", tempMatrix);
        
        this.shader.SetVector3("viewPosition", camera.transform.position);

        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}