import { Components, Geometry, GPU, NonSerialized, Runtime, SerializeField } from "@trident/core";

export class LODRenderer {
    @SerializeField(Geometry) geometry: Geometry;
    @SerializeField(GPU.Material) material: GPU.Material;
}

export class LOD {
    @SerializeField(Number) screenSize: number = 0;
    @SerializeField(LODRenderer) renderers: LODRenderer[] = [];
}

export class LODGroup extends Components.Mesh {
    public static type = "@trident/plugins/LOD/LODGroup";

    @SerializeField(LOD) public lods: LOD[] = [];

    private activeLodIndex = -1;

    // Matrix upload, allocator, transform-event wiring, firstInstance and Destroy
    // cleanup are all inherited from Mesh.

    @NonSerialized public get material(): GPU.Material { return this._material; };
    @NonSerialized public get geometry(): Geometry {
        const lod = this.lods[this.activeLodIndex] ?? this.lods[0];
        return lod?.renderers?.[0]?.geometry;
    }

    public Start(): void {
        super.Start();
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

        for (const renderer of lod.renderers) {
            const shader = shaderOverride ?? renderer.material?.shader;
            if (!renderer.geometry || !renderer.material || !shader) continue;

            shader.SetBuffer("frameBuffer", FrameBuffer);
            shader.SetBuffer("modelMatrix", modelMatrices);
        }
    }

    public OnRenderObject(): void {
        const lod = this.lods[this.activeLodIndex];
        if (!lod) return;
        const modelMatrices = Components.Mesh.modelMatrices.getBuffer();
        for (const renderer of lod.renderers) {
            const shader = renderer.material?.shader;
            if (!renderer.geometry?.attributes.has("position") || !renderer.material || !shader) continue;
            shader.SetBuffer("modelMatrix", modelMatrices);
            GPU.RendererContext.DrawGeometry(renderer.geometry, shader, 1, this.firstInstance);
        }
    }
}