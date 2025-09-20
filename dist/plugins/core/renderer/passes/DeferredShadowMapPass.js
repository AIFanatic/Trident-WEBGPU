import { Camera } from '../../components/Camera.js';
import { RendererContext } from '../RendererContext.js';
import { RenderPass } from '../RenderGraph.js';
import { Mesh } from '../../components/Mesh.js';
import { PassParams } from '../RenderingPipeline.js';
import { InstancedMesh } from '../../components/InstancedMesh.js';
import { SpotLight, PointLight, DirectionalLight, AreaLight } from '../../components/Light.js';
import { Shader } from '../Shader.js';
import { Buffer, BufferType, DynamicBuffer } from '../Buffer.js';
import { Matrix4 } from '../../math/Matrix4.js';
import { EventSystemLocal } from '../../Events.js';
import { TransformEvents } from '../../components/Transform.js';
import { Vector3 } from '../../math/Vector3.js';
import { DepthTextureArray } from '../Texture.js';

class _DeferredShadowMapPassDebug {
  shadowsUpdateValue = true;
  roundToPixelSizeValue = true;
  debugCascadesValue = false;
  pcfResolutionValue = 1;
  blendThresholdValue = 0.3;
  viewBlendThresholdValue = false;
}
const DeferredShadowMapPassDebug = new _DeferredShadowMapPassDebug();
class DeferredShadowMapPass extends RenderPass {
  name = "DeferredShadowMapPass";
  drawInstancedShadowShader;
  drawShadowShader;
  lightProjectionMatrixBuffer;
  lightProjectionViewMatricesBuffer;
  modelMatrices;
  cascadeIndexBuffers = [];
  cascadeCurrentIndexBuffer;
  numOfCascades = 4;
  lightShadowData = /* @__PURE__ */ new Map();
  shadowOutput;
  shadowWidth = 2048;
  shadowHeight = 2048;
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: [
        PassParams.ShadowPassDepth,
        PassParams.ShadowPassCascadeData
      ]
    });
  }
  async init(resources) {
    const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIdx : u32, 
            @location(0) position : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
        @group(0) @binding(1) var<storage, read> cascadeIndex: f32;
        
        @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;

        @vertex
        fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
            var output : VertexOutput;

            let modelMatrixInstance = modelMatrix[input.instanceIdx];
            let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];
        
            return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);
        }
        
        @fragment
        fn fragmentMain() -> @location(0) vec4<f32> {
            return vec4(1.0);
        }
        `;
    this.drawShadowShader = await Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      // depthBias: 2,              // Constant bias
      // depthBiasSlopeScale: -1.0,  // Slope-scale bias
      // depthBiasClamp: 0.0,       // Max clamp for the bias
      cullMode: "front"
    });
    this.drawInstancedShadowShader = await Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      cullMode: "back"
    });
    this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);
    this.initialized = true;
  }
  getCornersForCascade(camera, cascadeNear, cascadeFar) {
    const projectionMatrix = new Matrix4().perspectiveWGPUMatrix(camera.fov * (Math.PI / 180), camera.aspect, cascadeNear, cascadeFar);
    let frustumCorners = [
      new Vector3(-1, 1, 0),
      new Vector3(1, 1, 0),
      new Vector3(1, -1, 0),
      new Vector3(-1, -1, 0),
      new Vector3(-1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, -1, 1),
      new Vector3(-1, -1, 1)
    ];
    const invViewProj = projectionMatrix.clone().mul(camera.viewMatrix).invert();
    for (let i = 0; i < 8; i++) {
      frustumCorners[i].applyMatrix4(invViewProj);
    }
    return frustumCorners;
  }
  getCascades(camera, cascadeCount, light) {
    const CASCADE_PERCENTAGES = [0.05, 0.15, 0.5, 1];
    const CASCADE_DISTANCES = [
      CASCADE_PERCENTAGES[0] * camera.far,
      CASCADE_PERCENTAGES[1] * camera.far,
      CASCADE_PERCENTAGES[2] * camera.far,
      CASCADE_PERCENTAGES[3] * camera.far
    ];
    let cascades = [];
    for (let i = 0; i < cascadeCount; i++) {
      const cascadeNear = i === 0 ? camera.near : CASCADE_DISTANCES[i - 1];
      const cascadeFar = CASCADE_DISTANCES[i];
      const frustumCorners = this.getCornersForCascade(camera, cascadeNear, cascadeFar);
      const frustumCenter = new Vector3(0, 0, 0);
      for (let i2 = 0; i2 < frustumCorners.length; i2++) {
        frustumCenter.add(frustumCorners[i2]);
      }
      frustumCenter.mul(1 / frustumCorners.length);
      const lightDirection = light.transform.position.clone().normalize();
      const radius = frustumCorners[0].clone().sub(frustumCorners[6]).length() / 2;
      if (DeferredShadowMapPassDebug.roundToPixelSizeValue === true) {
        const shadowMapSize = this.shadowWidth;
        const texelsPerUnit = shadowMapSize / (radius * 2);
        const scalar = new Matrix4().makeScale(new Vector3(texelsPerUnit, texelsPerUnit, texelsPerUnit));
        const baseLookAt = new Vector3(-lightDirection.x, -lightDirection.y, -lightDirection.z);
        const lookAt = new Matrix4().lookAt(new Vector3(0, 0, 0), baseLookAt, new Vector3(0, 1, 0)).mul(scalar);
        const lookAtInv = lookAt.clone().invert();
        frustumCenter.transformDirection(lookAt);
        frustumCenter.x = Math.floor(frustumCenter.x);
        frustumCenter.y = Math.floor(frustumCenter.y);
        frustumCenter.transformDirection(lookAtInv);
      }
      const eye = frustumCenter.clone().sub(lightDirection.clone().mul(radius * 2));
      const lightViewMatrix = new Matrix4();
      lightViewMatrix.lookAt(
        eye,
        frustumCenter,
        new Vector3(0, 1, 0)
      );
      const lightProjMatrix = new Matrix4().orthoZO(-radius, radius, -radius, radius, -radius * 6, radius * 6);
      const out = lightProjMatrix.mul(lightViewMatrix);
      cascades.push({
        viewProjMatrix: out,
        splitDepth: cascadeFar
      });
    }
    return cascades;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    this.lightShadowData.clear();
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    for (let i = lights.length - 1; i >= 0; i--) {
      if (lights[i].castShadows === false) {
        lights.splice(i, 1);
      }
    }
    if (lights.length === 0) return;
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    let meshes = [];
    const _meshes = scene.GetComponents(Mesh);
    for (const mesh of _meshes) {
      if (mesh.enableShadows && mesh.enabled && mesh.gameObject.enabled) meshes.push(mesh);
    }
    if (meshes.length === 0 && instancedMeshes.length === 0) return;
    if (lights.length !== this.shadowOutput.depth) {
      this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
    }
    RendererContext.BeginRenderPass(`ShadowPass - clear`, [], { target: this.shadowOutput, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
    if (!this.lightProjectionMatrixBuffer) {
      this.lightProjectionMatrixBuffer = Buffer.Create(lights.length * 4 * 4 * 16, BufferType.STORAGE);
      this.drawShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
      this.drawInstancedShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
    }
    if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
      this.modelMatrices = DynamicBuffer.Create(meshes.length * 256, BufferType.STORAGE, 256);
    }
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
      this.lightProjectionViewMatricesBuffer = Buffer.Create(lights.length * this.numOfCascades * 4 * 16, BufferType.STORAGE);
    }
    if (!this.cascadeCurrentIndexBuffer) {
      this.cascadeCurrentIndexBuffer = Buffer.Create(4, BufferType.STORAGE);
    }
    if (this.cascadeIndexBuffers.length === 0) {
      for (let i = 0; i < this.numOfCascades; i++) {
        const buffer = Buffer.Create(4, BufferType.STORAGE);
        buffer.SetArray(new Float32Array([i]));
        this.cascadeIndexBuffers.push(buffer);
      }
    }
    for (let i = 0; i < meshes.length; i++) {
      this.modelMatrices.SetArray(meshes[i].transform.localToWorldMatrix.elements, i * 256);
    }
    this.drawShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
    const shadowOutput = resources.getResource(PassParams.ShadowPassDepth);
    shadowOutput.SetActiveLayer(0);
    this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    let shadowMapIndex = 0;
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      shadowOutput.SetActiveLayer(shadowMapIndex);
      EventSystemLocal.emit(TransformEvents.Updated, light.transform);
      let matricesForLight = [];
      let splits = [0, 0, 0, 0];
      if (light instanceof DirectionalLight) {
        const cascades = this.getCascades(Camera.mainCamera, this.numOfCascades, light);
        matricesForLight = cascades.map((c) => c.viewProjMatrix);
        splits = cascades.map((c) => c.splitDepth);
        this.numOfCascades;
      } else if (light instanceof SpotLight) {
        const vp = light.camera.projectionMatrix.clone().mul(light.camera.viewMatrix);
        matricesForLight = [vp, vp, vp, vp];
        splits = [0, 0, 0, 0];
      } else {
        shadowMapIndex++;
        continue;
      }
      const ld = new Float32Array(matricesForLight.flatMap((m) => [...m.elements]));
      this.lightProjectionViewMatricesBuffer.SetArray(ld, i * this.numOfCascades * 4 * 16);
      this.lightShadowData.set(light.id, {
        cascadeSplits: new Float32Array(splits),
        projectionMatrices: ld,
        shadowMapIndex
        // <— this layer holds this light’s shadow
      });
      RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i * this.numOfCascades * 4 * 16, 0, this.numOfCascades * 4 * 16);
      for (let cascadePass = 0; cascadePass < this.numOfCascades; cascadePass++) {
        RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);
        RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 ? true : false }, true);
        if (light instanceof DirectionalLight) {
          const width = this.shadowOutput.width / 2;
          const height = this.shadowOutput.height / 2;
          let x = 0, y = 0;
          if (cascadePass >= 2) x += width;
          if (cascadePass & 1) y += height;
          RendererContext.SetViewport(x, y, width, height, 0, 1);
        } else {
          RendererContext.SetViewport(0, 0, this.shadowOutput.width, this.shadowOutput.height, 0, 1);
        }
        let meshCount = 0;
        for (const mesh of meshes) {
          const geometry = mesh.GetGeometry();
          if (!geometry) continue;
          if (!geometry.attributes.has("position")) continue;
          const uniform_offset = meshCount * 256;
          this.modelMatrices.dynamicOffset = uniform_offset;
          RendererContext.DrawGeometry(geometry, this.drawShadowShader, 1);
          meshCount++;
        }
        for (const instance of instancedMeshes) {
          if (instance.instanceCount === 0) continue;
          if (!instance.enableShadows) continue;
          this.drawInstancedShadowShader.SetBuffer("modelMatrix", instance.matricesBuffer);
          RendererContext.DrawGeometry(instance.GetGeometry(), this.drawInstancedShadowShader, instance.instanceCount + 1);
        }
        RendererContext.EndRenderPass();
      }
      shadowMapIndex++;
    }
    shadowOutput.SetActiveLayer(0);
    resources.setResource(PassParams.ShadowPassCascadeData, this.lightShadowData);
  }
}

export { DeferredShadowMapPass, DeferredShadowMapPassDebug };
