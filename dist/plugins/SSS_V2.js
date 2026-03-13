import { GPU, Geometry, Components, Mathf } from '@trident/core';

class SSS_V2 extends GPU.RenderPass {
  name = "SSS_V2";
  shader;
  target;
  light;
  blend;
  blendInput;
  blendTarget;
  blendGeometry;
  constructor(light) {
    super();
    this.light = light;
  }
  async init(resources) {
    this.shader = await GPU.Compute.Create({
      code: `
                // Mariam Baradi del Alamo - 2024
                // Screen-space shadows WGSL compute shader
            
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                // Output Texture
                @group(0) @binding(0) var outputTex : texture_storage_2d<rgba16float, write>;
                // Input Textures
                @group(0) @binding(1) var positionTex : texture_2d<f32>;

                @group(0) @binding(4) var depthTex : texture_depth_2d;
                @group(0) @binding(5) var<storage, read> frameBuffer : FrameBuffer;

                struct CameraData{
                    ViewMat : mat4x4<f32>,
                    ProjMat : mat4x4<f32>,
                    CameraPos : vec3<f32>,
                    Far : f32,
                };
                @group(0) @binding(2) var<uniform> cameraData : CameraData;

                struct SSSParameters
                {
                    // Length of shadow from contact point
                    ShadowLength : f32,
                    // Minimum depth difference to avoid artifacts
                    ShadowBias : f32,
                    // How far each step goes in View Space
                    StepSize : f32,
                    // Opacity
                    IntensityMultiplier : f32,
                    // Light direction or position 'xyz' and type 'w'
                    LightVector : vec4<f32>,
                }
                @group(0) @binding(3) var<uniform> sssParams : SSSParameters;

                // Shader-scope variables
                var<private> fragPosVS : vec3<f32>;
                var<private> rayStepVS : vec3<f32>;
                var<private> stepPosSS : vec2<f32>;
                var<private> tempStepPosPS : vec4<f32>;
                var<private> shadowed : f32;
                var<private> depthDifference : f32;

                fn getWorldPosition(coords: vec2<i32>) -> vec4<f32> {
                    let depth = textureLoad(depthTex, coords.xy, 0);

                    let uv = vec2<f32>(coords.xy) / frameBuffer.projectionOutputSize.xy;
                    let x = uv.x * 2.0 - 1.0;
                    let y = (1.0 - uv.y) * 2.0 - 1.0;
                    let projectedPos = vec4(x, y, depth, 1.0);
                    var worldPosition = frameBuffer.projectionInverseMatrix * projectedPos;
                    worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
                    worldPosition = frameBuffer.viewInverseMatrix * worldPosition;
                    return worldPosition;
                }

                @compute @workgroup_size(16, 16, 1)
                fn main(@builtin(global_invocation_id) global_id : vec3<u32>)
                {
                    let iid = vec3<i32>(global_id);
                    let screenDims = vec2<f32>(textureDimensions(positionTex, 0));
                    let fragUV : vec2<f32> = vec2<f32>(global_id.xy) / screenDims;

                    let depth = textureLoad(depthTex, iid.xy, 0);
                    if (depth > 0.99999) {
                        textureStore(outputTex, iid.xy, vec4<f32>(1.0, 0.0, 0.0, 1.0));
                        return;
                    }

                    fragPosVS = (cameraData.ViewMat * getWorldPosition(iid.xy)).xyz;
                    
                    let steps : i32 = 16;
                    // Evaluate type of light. Directional Light = 0, Point Light = 1
                    if (sssParams.LightVector.w == 0){
                        rayStepVS = normalize(sssParams.LightVector.xyz) * sssParams.StepSize; 
                    } else {
                        rayStepVS = normalize(sssParams.LightVector.xyz - fragPosVS) * sssParams.StepSize; 
                    }

                    // Ray marching
                    for(var i : i32 = 0; i < steps; i = i + 1){
                        fragPosVS += rayStepVS;
                        tempStepPosPS = (cameraData.ProjMat * vec4<f32>(fragPosVS, 1));
                        stepPosSS = tempStepPosPS.xy / tempStepPosPS.w;
                        // stepPosSS = (stepPosSS + 1) / 2.0;
                        stepPosSS = vec2<f32>((stepPosSS.x + 1.0) / 2.0, 1.0 - (stepPosSS.y + 1.0) / 2.0);

                        // depthDifference = (cameraData.ViewMat * textureLoad(positionTex, vec2<i32>(stepPosSS.xy * screenDims), 0)).z;
                        depthDifference = (cameraData.ViewMat * getWorldPosition(vec2<i32>(stepPosSS.xy * screenDims))).z;
                        depthDifference = depthDifference - fragPosVS.z;
                       
                        if ((depthDifference > sssParams.ShadowBias) && (depthDifference < sssParams.ShadowLength)){
                                shadowed = 1;
                                // Fade out edges to avoid artifacts from texture limits
                                let edgeUV : vec2<f32> = abs(fragUV - 0.5) * 10 - 4;
                                let edgeScreenFade : f32 = clamp(max(edgeUV.x, edgeUV.y), 0.0, 1.0);
                                shadowed = shadowed * sssParams.IntensityMultiplier * (1.0 - edgeScreenFade);
                                // If shadowed, stop 
                                break;
                        }
                    }

                    shadowed = 1.0 - shadowed;
                    textureStore(outputTex, iid.xy, vec4<f32>(vec3f(shadowed), 1.0));
                }
            `,
      uniforms: {
        "outputTex": { group: 0, binding: 0, type: "storage-write-only" }
      }
    });
    this.blend = await GPU.Shader.Create({
      code: `
                // Output Texture
                @group(0) @binding(0) var texSampler: sampler;

                @group(0) @binding(1) var sssTex: texture_2d<f32>;
                @group(0) @binding(2) var lightingTex: texture_2d<f32>;

                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) uv : vec2<f32>
                };
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = vec4(input.position, 1.0);
                    output.uv = input.uv;
                    return output;
                }
                    
                @fragment    
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let color = textureSample(lightingTex, texSampler, input.uv);
                    let shadow = textureSample(sssTex, texSampler, input.uv);

                    return vec4(color.rgb * shadow.r, 1.0);
                    // return vec4(vec3(shadow.rgb), 1.0);
                }
            `,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.target = GPU.RenderTextureStorage2D.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.shader.SetTexture("outputTex", this.target);
    this.blendGeometry = Geometry.Plane();
    this.blendInput = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.blendTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.blend.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.blend.SetTexture("sssTex", this.blendInput);
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    const DepthTexture = resources.getResource(GPU.PassParams.depthTexture);
    const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    if (!LightingPassOutput || !DepthTexture) return;
    this.shader.SetTexture("positionTex", LightingPassOutput);
    this.shader.SetTexture("depthTex", DepthTexture);
    this.shader.SetTexture("frameBuffer", FrameBuffer);
    this.blend.SetTexture("lightingTex", LightingPassOutput);
    const camera = Components.Camera.mainCamera;
    this.shader.SetArray("cameraData", new Float32Array([
      ...camera.viewMatrix.elements,
      // ViewMat : mat4x4<f32>,
      ...camera.projectionMatrix.elements,
      // ProjMat : mat4x4<f32>,
      ...camera.transform.position.elements,
      // CameraPos : vec3<f32>,
      camera.far
      // Far : f32,
    ]));
    const lightType = this.light instanceof Components.DirectionalLight ? 0 : 1;
    let lightPos = new Mathf.Vector3();
    if (lightType == 0) {
      lightPos = this.light.transform.position.clone().sub(new Mathf.Vector3(0, 0, 0)).transformDirection(camera.viewMatrix);
    } else {
      lightPos = this.light.transform.position.clone().applyMatrix4(camera.viewMatrix);
    }
    this.shader.SetArray("sssParams", new Float32Array([
      // // Length of shadow from contact point
      1.2,
      // ShadowLength : f32,
      // // Minimum depth difference to avoid artifacts
      0.02,
      // ShadowBias : f32,
      // // How far each step goes in View Space
      0.02,
      // StepSize : f32,
      // // Opacity
      1,
      // IntensityMultiplier : f32,
      // // Light direction or position 'xyz' and type 'w'
      // ...this.light.transform.position.elements, 0 // LightVector : vec4<f32>, // Directional = 0, Point = 1
      ...lightPos.elements,
      lightType
    ]));
  }
  async execute(resources, ...args) {
    if (!this.initialized) return;
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!LightingPassOutput) return;
    GPU.ComputeContext.BeginComputePass(this.name, true);
    GPU.ComputeContext.Dispatch(this.shader, 320, 160, 1);
    GPU.ComputeContext.EndComputePass();
    GPU.RendererContext.CopyTextureToTexture(this.target, this.blendInput);
    GPU.RendererContext.BeginRenderPass(this.name + "-blend", [{ target: this.blendTarget, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.blendGeometry, this.blend);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.blendTarget }, { texture: LightingPassOutput });
  }
}

export { SSS_V2 };
