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
        super.Start();
        this.modelMatrixOffset = Components.Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        this.activeLodIndex = this.SelectLOD();
    }

    private GetRelativeScreenSize(): number {
        const camera = Components.Camera.mainCamera;
        if (!camera) return Number.POSITIVE_INFINITY;

        const lod = this.lods[0];
        const renderer = lod?.renderers?.[0];
        const geometry = renderer?.geometry;
        if (!geometry) return 0;

        const bounds = geometry.boundingVolume;
        const worldCenter = bounds.center.clone().applyMatrix4(this.transform.localToWorldMatrix);
        const distance = Math.max(0.0001, worldCenter.distanceTo(camera.transform.position));

        const e = this.transform.localToWorldMatrix.elements;
        const sx = Math.hypot(e[0], e[1], e[2]);
        const sy = Math.hypot(e[4], e[5], e[6]);
        const sz = Math.hypot(e[8], e[9], e[10]);
        const radiusScale = Math.max(sx, sy, sz);

        const radius = bounds.radius * radiusScale;
        const projectionY = camera.projectionMatrix.elements[5];

        return (radius * projectionY) / distance;
    }

    private SelectLOD(): number {
        if (this.lods.length === 0) return -1;

        const screenSize = this.GetRelativeScreenSize();

        for (let i = 0; i < this.lods.length; i++) {
            if (screenSize >= this.lods[i].screenSize) return i;
        }

        return -1;   // below smallest threshold → cull
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