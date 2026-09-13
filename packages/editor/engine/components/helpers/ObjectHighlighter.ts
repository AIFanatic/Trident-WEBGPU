import { Components, GameObject, Geometry, GPU, IndexAttribute, Mathf, VertexAttribute } from "@trident/core";

export class ObjectHighlighter extends GPU.RenderPass {
    public selectedGameObject: GameObject | null;

    private shader: GPU.Shader;
    private geometry: Geometry;
    private matrix: Mathf.Matrix4;

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: `
                  struct VertexInput {
                      @location(0) position : vec3<f32>,
                  };

                  struct VertexOutput {
                      @builtin(position) position : vec4<f32>,
                  };

                  @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                  @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                  @group(0) @binding(2) var<storage, read> modelMatrix: mat4x4<f32>;

                  @vertex
                  fn vertexMain(input: VertexInput) -> VertexOutput {
                      var output : VertexOutput;
                      output.position = projectionMatrix * viewMatrix * modelMatrix * vec4(input.position, 1.0);
                      return output;
                  }

                  @fragment
                  fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                      return vec4(1.0, 0.5, 0.0, 1.0);
                  }
                `,
            colorOutputs: [{ format: "rgba16float" }],
            // cullMode: "front"
            // depthOutput: "depth24plus",
            topology: GPU.Topology.Lines,
        });

        const vertices = new Float32Array([-0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5]);
        const indices = new Uint32Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.index = new IndexAttribute(indices);
        geometry.ComputeTangents();
        this.matrix = new Mathf.Matrix4();

        this.geometry = geometry;

        this.initialized = true;
    }

    private computeWorldBounds(gameObject: GameObject): { center: Mathf.Vector3, size: Mathf.Vector3 } {
        const min = new Mathf.Vector3(Infinity, Infinity, Infinity);
        const max = new Mathf.Vector3(-Infinity, -Infinity, -Infinity);

        for (const renderable of gameObject.GetComponentsInChildren(Components.Renderable)) {
            if (!renderable.geometry?.attributes.has("position")) continue;
            const bv = renderable.geometry.boundingVolume;
            const m = renderable.transform.localToWorldMatrix;

            for (let i = 0; i < 8; i++) {
                const c = new Mathf.Vector3(
                    (i & 1) ? bv.max.x : bv.min.x,
                    (i & 2) ? bv.max.y : bv.min.y,
                    (i & 4) ? bv.max.z : bv.min.z,
                ).applyMatrix4(m);
                min.min(c);
                max.max(c);
            }
        }

        return { center: max.clone().add(min).mul(0.5), size: max.clone().sub(min) };
    }

    public preFrame(resources: GPU.ResourcePool): void {
        if (!this.initialized) return;
        if (!this.selectedGameObject) return;

        const camera = Components.Camera.mainCamera;
        this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);

        const { center, size } = this.computeWorldBounds(this.selectedGameObject);
        this.matrix.compose(center, new Mathf.Quaternion(), size);
        this.shader.SetMatrix4("modelMatrix", this.matrix);
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        if (!this.selectedGameObject) return;

        const LightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        const DepthOutput = resources.getResource(GPU.PassParams.GBufferDepth);

        if (!LightingOutput || !DepthOutput) return;

        GPU.RendererContext.BeginRenderPass("GPUPicker", [{ target: LightingOutput, clear: false }]);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();
    }
}