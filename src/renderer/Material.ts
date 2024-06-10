import { Color } from "../math/Color";
import { Renderer } from "./Renderer";
import { Shader, ShaderCode, ShaderParams } from "./Shader";
import { Texture } from "./Texture";
import { TextureSampler } from "./TextureSampler";

export class Material {
    public shader: Shader;
}

export interface MeshBasicMaterialParams {
    albedoColor?: Color;
    albedoMap?: Texture;
}

export class MeshBasicMaterial extends Material {
    constructor(params?: MeshBasicMaterialParams) {
        super();

        const shaderParams: ShaderParams = {
            code: ShaderCode.MeshBasicMaterial(),
            colorOutputs: [
                {format: "rgba16float"},
                {format: "rgba16float"},
                {format: "rgba16float"},
            ],
            depthOutput: "depth24plus",
            attributes: {
                position: {location: 0, size: 3, type: "vec3"},
                normal: {location: 1, size: 3, type: "vec3"},
                uv: {location: 2, size: 2, type: "vec2"}
            },
            uniforms: {
                projectionMatrix: {location: 0, type: "storage"},
                viewMatrix: {location: 1, type: "storage"},
                modelMatrix: {location: 2, type: "storage"},
                albedoSampler: {location: 3, type: "sampler"},
                albedoMap: {location: 4, type: "texture"},
                albedoColor: {location: 5, type: "storage"},
                useAlbedoMap: {location: 6, type: "storage"},
            }
        }

        this.shader = Shader.Create(shaderParams);

        const albedoColor = params?.albedoColor ? params.albedoColor : new Color(1,1,1,1);
        const albedoMap = params?.albedoMap ? params.albedoMap : Texture.Create(10, 10, Renderer.SwapChainFormat);
        const useAlbedoMap = params?.albedoMap ? 1 : 0;
        const albedoSampler = TextureSampler.Create();

        this.shader.SetArray("albedoColor", albedoColor.elements);
        this.shader.SetTexture("albedoMap", albedoMap);
        this.shader.SetSampler("albedoSampler", albedoSampler);
        this.shader.SetValue("useAlbedoMap", useAlbedoMap);
    }
}