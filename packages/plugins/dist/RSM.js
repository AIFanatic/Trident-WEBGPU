import { RenderPass } from "../renderer/RenderGraph";
import { Shader } from "../renderer/Shader";
import { RenderTexture, Texture } from "../renderer/Texture";
import { Buffer, BufferType } from "../renderer/Buffer";
import { TextureSampler } from "../renderer/TextureSampler";
import { Mesh } from "../components/Mesh";
import { RendererContext } from "../renderer/RendererContext";
import { PBRMaterial } from "../renderer/Material";
import { Camera } from "../components/Camera";
export class RSMRenderPass extends RenderPass {
    name = "RSMRenderPass";
    light;
    rsmDepth;
    rsmNormal;
    rsmFlux;
    rsmWorldPosition;
    shader;
    modelMatrixBuffer;
    colorBuffer;
    dummyAlbedo;
    constructor(light, RSM_RES) {
        super({});
        this.light = light;
        this.rsmDepth = RenderTexture.Create(RSM_RES, RSM_RES, 1, "rgba16float");
        this.rsmNormal = RenderTexture.Create(RSM_RES, RSM_RES, 1, "rgba16float");
        this.rsmFlux = RenderTexture.Create(RSM_RES, RSM_RES, 1, "rgba16float");
        this.rsmWorldPosition = RenderTexture.Create(RSM_RES, RSM_RES, 1, "rgba16float");
        this.dummyAlbedo = Texture.Create(1, 1, 1, "bgra8unorm");
        this.dummyAlbedo.SetData(new Uint8Array([255, 255, 255, 255]));
    }
    async init(resources) {
        this.shader = await Shader.Create({
            code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) normal: vec3<f32>,
                @location(1) texcoord: vec2<f32>,
                @location(2) depth: vec3<f32>,
                @location(3) vWorldSpacePosition: vec3<f32>
            };

            @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
            @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
            @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

            @group(0) @binding(3) var<storage, read> color: vec4<f32>;

            @group(0) @binding(4) var albedoMap: texture_2d<f32>;
            @group(0) @binding(5) var texSampler: sampler;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
            
                let modelMatrixInstance = modelMatrix[input.instanceIdx];
                let worldSpacePos: vec4f = modelMatrixInstance * vec4(input.position , 1);
                output.position = projectionMatrix * viewMatrix * worldSpacePos;
                output.texcoord = input.uv;
                output.normal = (modelMatrixInstance * vec4(input.normal, 0.0)).xyz;
                output.depth = output.position.xyz / output.position.w;
                output.vWorldSpacePosition = worldSpacePos.xyz;
            
                return output;
            }

            struct FragmentOutput {
                @location(0) rsmDepth : vec4f,
                @location(1) rsmNormal : vec4f,
                @location(2) rsmFlux : vec4f,
                @location(3) rsmWorldPosition : vec4f,
            };
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                var output: FragmentOutput;

                output.rsmDepth = vec4(vec3f(input.depth.z), 1.0);
                output.rsmNormal = vec4f(normalize(input.normal), 1.0);
                let c = textureSample(albedoMap, texSampler, input.texcoord).rgb;
                output.rsmFlux = vec4(c * color.rgb, 1.0);
                output.rsmWorldPosition = vec4(input.vWorldSpacePosition, 1.0);
                return output;
            }
            `,
            colorOutputs: [
                { format: "rgba16float" },
                { format: "rgba16float" },
                { format: "rgba16float" },
                { format: "rgba16float" },
            ],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                projectionMatrix: { group: 0, binding: 0, type: "storage" },
                viewMatrix: { group: 0, binding: 1, type: "storage" },
                modelMatrix: { group: 0, binding: 2, type: "storage" },
                color: { group: 0, binding: 3, type: "storage" },
                albedoMap: { group: 0, binding: 4, type: "storage" },
                texSampler: { group: 0, binding: 5, type: "sampler" },
            },
        });
        this.modelMatrixBuffer = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.colorBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);
        this.shader.SetSampler("texSampler", TextureSampler.Create());
        this.initialized = true;
    }
    matrices = new Map();
    modelColors = new Map();
    execute(resources, ...args) {
        if (!this.initialized)
            return;
        const scene = Camera.mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        this.shader.SetArray("projectionMatrix", this.light.camera.projectionMatrix.elements);
        this.shader.SetArray("viewMatrix", this.light.camera.viewMatrix.elements);
        this.shader.SetBuffer("modelMatrix", this.modelMatrixBuffer);
        this.shader.SetBuffer("color", this.colorBuffer);
        RendererContext.BeginRenderPass(this.name + " - clear", [
            { target: this.rsmDepth, clear: true },
            { target: this.rsmNormal, clear: true },
            { target: this.rsmFlux, clear: true },
            { target: this.rsmWorldPosition, clear: true }
        ], undefined, true);
        RendererContext.EndRenderPass();
        for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            if (!mesh.enabled)
                continue;
            const materials = mesh.GetMaterials(PBRMaterial);
            const material = materials.length > 0 ? materials[0] : undefined;
            const geometry = mesh.GetGeometry();
            if (!material)
                continue;
            if (material.params.unlit === true)
                continue;
            if (!geometry.attributes.has("position"))
                continue;
            if (!geometry.attributes.has("normal"))
                continue;
            if (!geometry.attributes.has("uv"))
                continue;
            let modelMatrixBuffer = this.matrices.get(mesh.transform);
            if (!modelMatrixBuffer) {
                modelMatrixBuffer = Buffer.Create(16 * 4, BufferType.STORAGE);
                modelMatrixBuffer.SetArray(mesh.transform.localToWorldMatrix.elements);
                this.matrices.set(mesh.transform, modelMatrixBuffer);
            }
            let colorBuffer = this.modelColors.get(mesh.transform);
            if (!colorBuffer) {
                colorBuffer = Buffer.Create(4 * 4., BufferType.STORAGE);
                colorBuffer.SetArray(material.params.albedoColor.elements);
                this.modelColors.set(mesh.transform, colorBuffer);
            }
            if (material.params.albedoMap) {
                this.shader.SetTexture("albedoMap", material.params.albedoMap);
            }
            else {
                this.shader.SetTexture("albedoMap", this.dummyAlbedo);
            }
            RendererContext.CopyBufferToBuffer(modelMatrixBuffer, this.modelMatrixBuffer);
            RendererContext.CopyBufferToBuffer(colorBuffer, this.colorBuffer);
            RendererContext.BeginRenderPass(this.name, [
                { target: this.rsmDepth, clear: false },
                { target: this.rsmNormal, clear: false },
                { target: this.rsmFlux, clear: false },
                { target: this.rsmWorldPosition, clear: false }
            ], undefined, true);
            RendererContext.DrawGeometry(geometry, this.shader, 1);
            RendererContext.EndRenderPass();
        }
    }
}
