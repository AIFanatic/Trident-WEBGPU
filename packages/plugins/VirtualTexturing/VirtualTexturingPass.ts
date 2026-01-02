import { Components, GPU, Scene, Mathf } from "@trident/core";
import { VTFeedbackPass } from "./VTFeedbackPass";
import { PageManager } from "./PageManager";
import { VTPaintPass } from "./VTPaintPass";

export class VirtualTexturingPass extends GPU.RenderPass {
    private vtFeedbackPass: VTFeedbackPass;
    private vtPainPass: VTPaintPass;

    private page_manager: PageManager;

    private params: Float32Array;

    constructor() {
        super();

        const window_size = new Mathf.Vector2(GPU.Renderer.width, GPU.Renderer.height);
        const virtual_size = new Mathf.Vector2(8192.0, 8192.0);
        const buffer_size = window_size.clone().div(4.0);
        const page_size = new Mathf.Vector2(512.0, 512.0);
        const page_padding = new Mathf.Vector2(4.0, 4.0);
        const pages = virtual_size.clone().div(page_size);
        const bufferScreenRatio = new Mathf.Vector2(0.25, 0.25);

        this.vtFeedbackPass = new VTFeedbackPass(buffer_size.x, buffer_size.y);

        this.page_manager = new PageManager(virtual_size, page_padding, page_size);

        this.vtPainPass = new VTPaintPass(this.page_manager.Atlas(), this.page_manager.PageTables());

        const atlasSize = this.page_manager.AtlasSize();
        const mip_range = new Mathf.Vector2(0.0, this.page_manager.LODs() - 1);
        this.params = new Float32Array([
            virtual_size.x, virtual_size.y, // u_VirtualSize: vec2f,
            pages.x, pages.y, // u_PageGrid: vec2f,
            atlasSize.x, atlasSize.y, // u_AtlasSize: vec2f,
            page_size.x, page_size.y, // u_PageSize: vec2f,
            page_padding.x, page_padding.y, // u_PagePadding: vec2f,
            mip_range.x, mip_range.y, // u_MinMaxMipLevel: vec2f,
            bufferScreenRatio.x, bufferScreenRatio.y, // u_BufferScreenRatio: vec2f,
            0, 0 // padding
        ]);
    }

    public async init(resources: GPU.ResourcePool) {
        await this.vtPainPass.init(resources); // TODO: Warning when after "await this.vtFeedbackPass.init(resources);"
        await this.vtFeedbackPass.init(resources);

        // Meh
        this.vtFeedbackPass.shader.SetArray("params", this.params);
        this.vtPainPass.shader.SetArray("params", this.params);

        this.initialized = true;
    }

    private pendingFeedback: Promise<BufferSource> | null = null;
    public async preFrame(resources: GPU.ResourcePool) {
        if (this.pendingFeedback) {
            const data = await this.pendingFeedback;
            this.pendingFeedback = null;
            this.page_manager.IngestFeedback(new Uint32Array(data));
        }
        this.page_manager.FlushUploadQueue();
        this.page_manager.UpdatePageTables();

        const renderables = Scene.mainScene.GetComponents(Components.Renderable);
        this.vtFeedbackPass.renderables = renderables;
        this.vtPainPass.renderables = renderables;
        await this.vtFeedbackPass.preFrame(resources);
        
        await this.vtPainPass.preFrame(resources);
    }

    public async execute(resources: GPU.ResourcePool) {
        await this.vtFeedbackPass.execute(resources);
        this.pendingFeedback = this.vtFeedbackPass.feedback_buffer.GetData();

        await this.vtPainPass.execute(resources);
    }
}