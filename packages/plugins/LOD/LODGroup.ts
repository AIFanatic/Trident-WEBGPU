import { Components, EventSystemLocal, GameObject, Geometry, GPU, NonSerialized, Runtime, SerializeField } from "@trident/core";

export class LODRenderer {
    @SerializeField(Geometry) geometry: Geometry;
    @SerializeField(GPU.Material) material: GPU.Material;
}

export class LOD {
    @SerializeField(Number) screenSize: number = 0;
    @SerializeField(LODRenderer) renderers: LODRenderer[] = [];
}

export class LODGroup extends Components.Renderable {
    public static type = "@trident/plugins/LOD/LODGroup";

    @SerializeField(LOD) public lods: LOD[] = [];

    private activeLodIndex = -1;
    private modelMatrixOffset = -1;

    constructor(gameObject: GameObject) {
        super(gameObject);

        if (!Components.Mesh.modelMatrices) {
            Components.Mesh.modelMatrices = new GPU.DynamicBufferMemoryAllocatorDynamic(256 * 10, GPU.BufferType.STORAGE, 256 * 10);
        }

        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
            this.modelMatrixOffset = Components.Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        });
    }

    public Start(): void {
        this.modelMatrixOffset = Components.Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        this.activeLodIndex = this.SelectLOD();
    }

    private SelectLOD(): number {
        if (this.lods.length === 0) return -1;

        const camera = Components.Camera.mainCamera;
        if (!camera) return 0;

        const distance = this.transform.position.distanceTo(camera.transform.position);

        for (let i = 0; i < this.lods.length; i++) if (distance <= this.lods[i].screenSize) return i;

        return this.lods.length - 1;
    }

    public OnPreRender(shaderOverride?: GPU.Shader): void {
        this.activeLodIndex = this.SelectLOD();

        const lod = this.lods[this.activeLodIndex];
        if (!lod) return;

        const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
        const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        const modelMatrices = Components.Mesh.modelMatrices.getBuffer();
        modelMatrices.dynamicOffset = this.modelMatrixOffset * Components.Mesh.modelMatrices.getStride();

        for (const renderer of lod.renderers) {
            const shader = shaderOverride ?? renderer.material?.shader;
            if (!renderer.geometry || !renderer.material || !shader) continue;

            shader.SetBuffer("frameBuffer", FrameBuffer);
            shader.SetBuffer("modelMatrix", modelMatrices);
        }
    }

    public OnRenderObject(shaderOverride?: GPU.Shader): void {
        const lod = this.lods[this.activeLodIndex];
        if (!lod) return;

        Components.Mesh.modelMatrices.getBuffer().dynamicOffset =
            this.modelMatrixOffset * Components.Mesh.modelMatrices.getStride();

        for (const renderer of lod.renderers) {
            const shader = shaderOverride ?? renderer.material?.shader;
            if (!renderer.geometry || !renderer.geometry.attributes.has("position") || !renderer.material || !shader) {
                continue;
            }

            GPU.RendererContext.DrawGeometry(renderer.geometry, shader);
        }
    }

    @NonSerialized public get geometry(): Geometry | undefined {
        const lod = this.lods[this.activeLodIndex] ?? this.lods[0];
        return lod?.renderers?.[0]?.geometry;
    }

    public Destroy(): void {
        if (Components.Mesh.modelMatrices?.has(this.id)) {
            Components.Mesh.modelMatrices.delete(this.id);
        }

        super.Destroy();
    }
}