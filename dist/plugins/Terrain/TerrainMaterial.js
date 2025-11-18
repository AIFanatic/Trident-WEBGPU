import { GPU, Scene, Mathf } from '@trident/core';

class TerrainMaterial extends GPU.Material {
  // Used when no textures are passed
  blankTextureArray;
  gameObject;
  CreateTextureArray(textures) {
    const width = textures[0].width;
    const height = textures[0].height;
    const format = textures[0].format;
    const mipLevels = textures[0].mipLevels ?? 1;
    for (const texture of textures)
      if (texture.width !== width || texture.height !== height || texture.format !== format || texture.mipLevels !== mipLevels)
        throw Error("All textures must have the same size and format and mip count");
    const textureArray = GPU.TextureArray.Create(width, height, textures.length, format, mipLevels);
    GPU.Renderer.BeginRenderFrame();
    for (let layer = 0; layer < textures.length; layer++) {
      for (let mip = 0; mip < mipLevels; mip++) {
        const mipWidth = Math.max(1, width >> mip);
        const mipHeight = Math.max(1, height >> mip);
        GPU.RendererContext.CopyTextureToTextureV3(
          { texture: textures[layer], mipLevel: mip },
          { texture: textureArray, mipLevel: mip, origin: [0, 0, layer] },
          [mipWidth, mipHeight, 1]
        );
      }
    }
    GPU.Renderer.EndRenderFrame();
    textureArray.SetActiveMipCount(mipLevels);
    return textureArray;
  }
  set splatMapTextures(splatMaps) {
    this.shader.SetTexture("splatMapTextures", this.CreateTextureArray(splatMaps));
  }
  set layerTexture(layerTexture) {
    this.shader.SetTexture("layerTexture", layerTexture);
  }
  set layers(layers) {
    if (layers.length === 0) return;
    const keys = ["albedoMap", "normalMap", "armMap"];
    for (const key of keys) {
      const tex = layers.map((b) => b[key]).filter(Boolean);
      if (tex.length !== 0 && tex.length !== layers.length) throw new Error(`All or none must have ${key}`);
    }
    let layersArray = [];
    let albedoTextures = [];
    let normalTextures = [];
    let armTextures = [];
    for (const layer of layers) {
      let texture_index = [-1, -1, -1, -1];
      let transform = layer.transform || [1, 1, 0, 0];
      if (layer.albedoMap) texture_index[0] = albedoTextures.push(layer.albedoMap) - 1;
      if (layer.normalMap) texture_index[1] = normalTextures.push(layer.normalMap) - 1;
      if (layer.armMap) texture_index[2] = armTextures.push(layer.armMap) - 1;
      layersArray.push(...texture_index, ...transform);
    }
    this.shader.SetArray("Layers", new Float32Array(layersArray));
    if (albedoTextures.length > 0) this.shader.SetTexture("albedoTextures", this.CreateTextureArray(albedoTextures));
    if (normalTextures.length > 0) this.shader.SetTexture("normalTextures", this.CreateTextureArray(normalTextures));
    if (armTextures.length > 0) this.shader.SetTexture("armTextures", this.CreateTextureArray(armTextures));
  }
  constructor(gameObject) {
    super({ isDeferred: true });
    this.createShader();
    this.gameObject = gameObject;
  }
  async createShader() {
    const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;
    this.shader = await GPU.Shader.Create({
      code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl";

                struct VertexInput {
                    @builtin(instance_index) instance : u32,
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                    @location(3) tangent : vec4<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) normal : vec3<f32>,
                    @location(1) vUv : vec2<f32>,
                    @location(2) worldPosition : vec4<f32>,
                    @location(3) tangent : vec3<f32>,
                    @location(4) bitangent : vec3<f32>,
                };

                @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(3) var<storage, read> cameraPosition: vec3<f32>;
                @group(0) @binding(4) var<storage, read> normalMatrix: mat4x4<f32>;


                @group(1) @binding(0) var textureSampler: sampler;
                @group(1) @binding(1) var albedoTextures: texture_2d_array<f32>;
                @group(1) @binding(2) var normalTextures: texture_2d_array<f32>;
                @group(1) @binding(3) var armTextures:    texture_2d_array<f32>;
                @group(1) @binding(4) var splatMapTextures: texture_2d_array<f32>;

                @group(1) @binding(5) var layerTexture: texture_2d<f32>;

                struct Layer {
                    texture_index: vec4<f32>, // x=albedo, y=normal, z=arm
                    transform: vec4<f32>, // xy=scale, zw=offset
                };
                @group(1) @binding(6) var<storage, read> Layers: array<Layer>;

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;

                    let modelMatrixInstance = modelMatrix[input.instance];

                    output.position = projectionMatrix * viewMatrix * modelMatrixInstance * vec4(input.position.xyz, 1.0);
                    output.vUv = input.uv;

                    output.worldPosition = modelMatrixInstance * vec4(input.position, 1.0);

                    let worldNormal = normalize(normalMatrix * vec4(input.normal.xyz, 0.0)).xyz;
                    let worldTangent = normalize(normalMatrix * vec4(input.tangent.xyz, 0.0)).xyz;
                    let worldBitangent = cross(worldNormal, worldTangent) * input.tangent.w;
                    
                    output.normal = worldNormal;
                    output.tangent = worldTangent;
                    output.bitangent = worldBitangent;

                    return output;
                }

                struct FragmentOutput {
                    @location(0) albedo : vec4f,
                    @location(1) normal : vec4f,
                    @location(2) RMO : vec4f,
                };
                
                struct TerrainSample {
                    albedo : vec3<f32>,
                    normal  : vec3<f32>,
                    arm: vec3<f32>
                };

                fn sample_layer(uv: vec2<f32>, layer_index: u32) -> TerrainSample {
                    let layer = Layers[layer_index];
                    let uv_layer = uv * 1 / layer.transform.xy + layer.transform.zw;
                    let layerAlbedo = textureSample(albedoTextures, textureSampler, uv_layer, layer_index);
                    let layerNormal = textureSample(normalTextures, textureSampler, uv_layer, layer_index);
                    let layerArm = textureSample(armTextures, textureSampler, uv_layer, layer_index);

                    return TerrainSample(layerAlbedo.rgb, layerNormal.rgb, layerArm.gar); // Unity style r=metalness,g=ao,b=detail,a=roughness
                }
                    
                @fragment
                fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                    var output: FragmentOutput;

                    let dims = vec2f(textureDimensions(layerTexture));

                    let uv = input.vUv;

                    // Each channel corresponds to a layer entry index, so r=0=grass, r=1=rock etc
                    // Can have 3 layers per pixel rgb (alpha not used)
                    // Example rgb(0, 1, 2) // 0 = grass, 1 = rock, 2 = forest
                    let layerIdsPerPixel = vec4<u32>(textureLoad(layerTexture, vec2<i32>(input.vUv * (dims - 1.0)), 0) * 255.0);
                    
                    // Weights of each layer, used for blending
                    // Example rgb(0.33, 0.33, 0.33) // 33% grass, 33% rock, 33% forest (from the example above)
                    let layerWeightsPerPixel = textureSample(splatMapTextures, textureSampler, uv, 0);

                    let uv_detail = input.worldPosition.xz;
                    let layer0 = sample_layer(uv_detail, layerIdsPerPixel.x);
                    let layer1 = sample_layer(uv_detail, layerIdsPerPixel.y);
                    let layer2 = sample_layer(uv_detail, layerIdsPerPixel.z);

                    let albedo = (layer0.albedo * layerWeightsPerPixel.x) + (layer1.albedo * layerWeightsPerPixel.y) + (layer2.albedo * layerWeightsPerPixel.z);
                    let normal = (layer0.normal * layerWeightsPerPixel.x) + (layer1.normal * layerWeightsPerPixel.y) + (layer2.normal * layerWeightsPerPixel.z);
                    let arm = (layer0.arm * layerWeightsPerPixel.x) + (layer1.arm * layerWeightsPerPixel.y) + (layer2.arm * layerWeightsPerPixel.z);

                    let nTan = normalize(normal * 2.0 - 1.0);

                    // TBN from geometry
                    let N = normalize(input.normal);
                    let T = normalize(input.tangent);
                    let B = normalize(input.bitangent);

                    let TBN = mat3x3<f32>(T, B, N);
                    let worldNormal = normalize(TBN * nTan);

                    output.albedo = vec4f(albedo, arm.y);
                    output.normal = vec4f(OctEncode(worldNormal), arm.x, arm.z);
                    output.RMO = vec4f(vec3(0.0), 0.0);

                    return output;
                }
            `,
      colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" },
        tangent: { location: 3, size: 4, type: "vec4" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        viewMatrix: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 0, binding: 2, type: "storage" },
        cameraPosition: { group: 0, binding: 3, type: "storage" },
        normalMatrix: { group: 0, binding: 4, type: "storage" },
        textureSampler: { group: 1, binding: 0, type: "sampler" },
        albedoTextures: { group: 1, binding: 1, type: "texture" },
        normalTextures: { group: 1, binding: 2, type: "texture" },
        armTextures: { group: 1, binding: 3, type: "texture" },
        splatMapTextures: { group: 1, binding: 4, type: "texture" },
        layerTexture: { group: 1, binding: 5, type: "texture" },
        Layers: { group: 1, binding: 6, type: "storage" }
      }
    });
    this.blankTextureArray = GPU.TextureArray.Create(1, 1, 1);
    this.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.shader.SetTexture("albedoTextures", this.blankTextureArray);
    this.shader.SetTexture("normalTextures", this.blankTextureArray);
    this.shader.SetTexture("armTextures", this.blankTextureArray);
    this.shader.SetTexture("splatMapTextures", this.blankTextureArray);
    let normalMatrix = new Mathf.Matrix4();
    this.shader.OnPreRender = (geometry) => {
      normalMatrix.copy(this.gameObject.transform.localToWorldMatrix).invert().transpose();
      this.shader.SetMatrix4("normalMatrix", normalMatrix);
      return true;
    };
  }
}

export { TerrainMaterial };
