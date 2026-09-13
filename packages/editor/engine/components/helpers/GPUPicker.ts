import { Components, GameObject, GPU, Input, Runtime } from "@trident/core";

const DYNAMIC_SLOT_BYTES = 256;
const DYNAMIC_SLOT_FLOATS = DYNAMIC_SLOT_BYTES / 4;
const MAX_PICKABLES = 10000;

export class GPUPicker {
    private static shader: GPU.Shader;
    public static renderTarget: GPU.RenderTexture;
    private static depthTarget: GPU.DepthTexture;
    private static instanceBuffer: GPU.DynamicBuffer;

    private static initialized = false;

    private static async init() {
        this.shader = await GPU.Shader.Create({
            code: `
                  struct VertexInput {
                      @location(0) position : vec3<f32>,
                  };

                  struct VertexOutput {
                      @builtin(position) position : vec4<f32>,
                  };

                  struct PickInstance {
                      modelMatrix : mat4x4<f32>,
                      id : f32,
                  };

                  @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                  @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                  @group(0) @binding(2) var<storage, read> instance: PickInstance;

                  @vertex
                  fn vertexMain(input: VertexInput) -> VertexOutput {
                      var output : VertexOutput;
                      output.position = projectionMatrix * viewMatrix * instance.modelMatrix * vec4(input.position, 1.0);
                      return output;
                  }

                  @fragment
                  fn fragmentMain(input: VertexOutput) -> @location(0) u32 {
                      return u32(instance.id);
                  }
                `,
            colorOutputs: [{ format: "r32uint" }],
            depthOutput: "depth24plus"
        });

        this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "r32uint");
        this.depthTarget = GPU.DepthTexture.Create(GPU.Renderer.width, GPU.Renderer.height);

        // one 256-byte slot per pickable: mat4 (64B) + id (4B), rest padding
        this.instanceBuffer = new GPU.DynamicBuffer(MAX_PICKABLES * DYNAMIC_SLOT_BYTES, GPU.BufferType.STORAGE, DYNAMIC_SLOT_BYTES);
        this.shader.SetBuffer("instance", this.instanceBuffer);
        this.initialized = true;
    }

    private static mouseToPixel() {
        const mousePosition = Input.mousePosition;
        const rect = GPU.Renderer.canvas.getBoundingClientRect();

        const u = (mousePosition.x - rect.left) / rect.width;
        const v = (mousePosition.y - rect.top) / rect.height;

        const texWidth = this.renderTarget.width;
        const texHeight = this.renderTarget.height;
        const x = Math.floor(u * texWidth);
        const y = Math.floor(v * texHeight);

        return {
            x: Math.max(0, Math.min(texWidth - 1, x)),
            y: Math.max(0, Math.min(texHeight - 1, y)),
        };
    }

    public static async Pick(filter?: (renderable: Components.Renderable) => boolean): Promise<GameObject | null> {
        if (!this.initialized) await this.init();

        const camera = Components.Camera.mainCamera;
        if (!camera) return null;
        this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);

        const all = Runtime.SceneManager.GetActiveScene().GetComponents(Components.Renderable);
        const pickables = all.filter(r =>
            r.enabled &&
            r.gameObject.enabled &&
            !!r.geometry?.attributes.has("position") &&
            (!filter || filter(r))
        );
        if (pickables.length === 0) return null;

        const count = Math.min(pickables.length, MAX_PICKABLES);
        const data = new Float32Array(count * DYNAMIC_SLOT_FLOATS);
        for (let slot = 0; slot < count; slot++) {
            const base = slot * DYNAMIC_SLOT_FLOATS;
            data.set(pickables[slot].transform.localToWorldMatrix.elements, base);
            data[base + 16] = slot + 1; // id 0 = no hit
        }
        this.instanceBuffer.SetArray(data);

        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass("GPUPicker", [{ target: this.renderTarget, clear: true }], { target: this.depthTarget, clear: true });

        for (let slot = 0; slot < count; slot++) {
            this.instanceBuffer.dynamicOffset = slot * DYNAMIC_SLOT_BYTES;
            GPU.RendererContext.DrawGeometry(pickables[slot].geometry, this.shader);
        }

        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();

        const mousePixel = this.mouseToPixel();
        const id = (await this.renderTarget.GetPixels(mousePixel.x, mousePixel.y, 1, 1, 0))[0];
        if (id > 0) return pickables[id - 1].gameObject;
        return null;
    }
}