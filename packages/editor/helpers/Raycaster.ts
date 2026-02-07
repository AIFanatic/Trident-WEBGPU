
import { Components, GameObject, GPU, Input, Scene } from "@trident/core";

const DYNAMIC_SLOT_BYTES = 256;
const DYNAMIC_SLOT_FLOATS = DYNAMIC_SLOT_BYTES / 4;

export class Raycaster {
    private shader: GPU.Shader;
    public renderTarget: GPU.RenderTexture;
    private idMap: GPU.DynamicBuffer;

    private initialized = false;

    constructor() {
        this.init();
    }

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
                @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(3) var<storage, read> id: f32;

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = projectionMatrix * viewMatrix * modelMatrix[0] * vec4(input.position, 1.0);
                    return output;
                }

                                  
                fn rand(x: f32) -> f32 {
                    return fract(sin(x) * 43758.5453123);
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) u32 {
                    // store object id in red channel
                    return u32(id);
                }
              `,
            colorOutputs: [{ format: "r32uint" }],
        });

        this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "r32uint");

        // 10000 dynamic slots, each slot must be 256-byte aligned
        this.idMap = GPU.DynamicBuffer.Create(10000 * DYNAMIC_SLOT_BYTES * 4, GPU.BufferType.STORAGE, DYNAMIC_SLOT_BYTES);
        this.shader.SetBuffer("id", this.idMap);
        this.initialized = true;
    }

    private mouseToPixel() {
        const mousePosition = Input.mousePosition;
        const rect = GPU.Renderer.canvas.getBoundingClientRect();

        // mouse in [0..1] over displayed canvas
        const u = (mousePosition.x - rect.left) / rect.width;
        const v = (mousePosition.y - rect.top) / rect.height;

        // map to texture pixels (top-left origin)
        const texWidth = this.renderTarget.width;
        const texHeight = this.renderTarget.height;
        const x = Math.floor(u * texWidth);
        const y = Math.floor(v * texHeight);

        // clamp
        return {
            x: Math.max(0, Math.min(texWidth - 1, x)),
            y: Math.max(0, Math.min(texHeight - 1, y)),
        };
    }

    public async execute(): Promise<GameObject> {
        if (!this.initialized) return;

        const resources = Scene.mainScene.renderPipeline.renderGraph.resourcePool;

        const gBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        if (!gBufferDepth) return;

        const camera = Components.Camera.mainCamera;
        this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
        this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);

        const all = Scene.mainScene.GetComponents(Components.Renderable);
        const pickables = all.filter(r => !!r.geometry);

        const ids = new Float32Array(pickables.length * DYNAMIC_SLOT_FLOATS);
        for (let slot = 0; slot < pickables.length; slot++) {
            pickables[slot].OnPreRender(this.shader);
            ids[slot * DYNAMIC_SLOT_FLOATS] = slot + 1; // id 0 = no hit
        }
        this.idMap.SetArray(ids);

        GPU.Renderer.BeginRenderFrame();
        GPU.RendererContext.BeginRenderPass("Raycaster", [{ target: this.renderTarget, clear: true }], gBufferDepth, true);

        for (let slot = 0; slot < pickables.length; slot++) {
            this.idMap.dynamicOffset = slot * DYNAMIC_SLOT_BYTES; // bytes, not floats
            pickables[slot].OnRenderObject(this.shader);
        }

        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();

        const mousePixel = this.mouseToPixel();
        const id = (await this.renderTarget.GetPixels(mousePixel.x, mousePixel.y, 1, 1, 0))[0];
        if (id > 0) {
            return pickables[id-1].gameObject;
        }
        return null;
    }
}