import { Geometry, InterleavedVertexAttribute, Component, GPU, Utils, VertexAttribute, IndexAttribute } from "@trident/core";
import { Meshlet, Meshoptimizer } from "./meshoptimizer/Meshoptimizer";

export const meshletsCache: Map<Geometry, MeshletMesh> = new Map();

await Meshoptimizer.load();

export class MeshletEvents {
    public static Updated = (meshlet: MeshletMesh) => { }
}

export class MeshletMesh extends Component {

    public meshlets: Meshlet[] = [];
    public interleavedVertices: InterleavedVertexAttribute;
    public indices: IndexAttribute;

    public static MeshletInfoFloatStride = 20;
    public meshletInfoPacked: Float32Array;

    private _material: GPU.Material;
    @Utils.SerializeField
    public get material(): GPU.Material { return this._material; };
    public set material(material: GPU.Material) {
        this._material = material;
        // EventSystem.emit(MeshEvents.MaterialUpdated, this, material);
    };

    @Utils.SerializeField
    public enableShadows: boolean = true;

    public clusterizeOnly = false;

    public set geometry(geometry: Geometry) {
        let cached = meshletsCache.get(geometry);
        if (cached) {
            this.meshlets = cached.meshlets;
            this.interleavedVertices = cached.interleavedVertices;
            this.indices = cached.indices;
            this.meshletInfoPacked = cached.meshletInfoPacked;
            return;
        }

        const pa = geometry.attributes.get("position");
        const na = geometry.attributes.get("normal");
        const ua = geometry.attributes.get("uv");
        const ta = geometry.attributes.get("tangent");
        const ia = geometry.index;
        if (!pa || !na || !ua || !ia || !ta) throw Error("To create meshlets need indices, position, normal and uv attributes");


        const p = pa.array as Float32Array;
        const n = na.array as Float32Array;
        const u = ua.array as Float32Array;
        const t = ta.array as Float32Array;
        // const indices = ia.array as Uint32Array;
        const indices = ia.array instanceof Uint32Array ? ia.array : Uint32Array.from(ia.array as ArrayLike<number>);

        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u, t], [3, 3, 2, 4]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

        const output = Meshoptimizer.nanite(interleavedVertices, indices);
        this.meshlets = output.meshlets;

        this.interleavedVertices = interleavedBufferAttribute;
        this.indices = new IndexAttribute(output.indices);

        console.log("meshlets", this.meshlets);

        const meshletCount = this.meshlets.length;
        const bytesPerMeshlet = MeshletMesh.MeshletInfoFloatStride * 4;
        const packedBuffer = new ArrayBuffer(meshletCount * bytesPerMeshlet);
        const packedView = new DataView(packedBuffer);

        for (let i = 0; i < meshletCount; i++) {
            const meshlet = this.meshlets[i];
            const base = i * bytesPerMeshlet;

            packedView.setUint32(base + 0, meshlet.index_offset, true);
            packedView.setUint32(base + 4, meshlet.index_count, true);
            packedView.setUint32(base + 8, 0, true);
            packedView.setUint32(base + 12, 0, true);

            packedView.setFloat32(base + 16, meshlet.center[0], true);
            packedView.setFloat32(base + 20, meshlet.center[1], true);
            packedView.setFloat32(base + 24, meshlet.center[2], true);
            packedView.setFloat32(base + 28, meshlet.radius, true);

            packedView.setFloat32(base + 32, meshlet.group_error, true);
            packedView.setFloat32(base + 36, 0, true);
            packedView.setFloat32(base + 40, 0, true);
            packedView.setFloat32(base + 44, 0, true);

            packedView.setFloat32(base + 48, meshlet.parent_center[0], true);
            packedView.setFloat32(base + 52, meshlet.parent_center[1], true);
            packedView.setFloat32(base + 56, meshlet.parent_center[2], true);
            packedView.setFloat32(base + 60, meshlet.parent_radius, true);

            packedView.setFloat32(base + 64, meshlet.parent_error, true);
            packedView.setFloat32(base + 68, 0, true);
            packedView.setFloat32(base + 72, 0, true);
            packedView.setFloat32(base + 76, 0, true);
        }

        this.meshletInfoPacked = new Float32Array(packedBuffer);

        meshletsCache.set(geometry, this);
    }
}