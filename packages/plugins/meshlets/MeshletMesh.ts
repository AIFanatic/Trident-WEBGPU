import { Geometry, InterleavedVertexAttribute, Component, GPU, Utils, IndexAttribute } from "@trident/core";
import { Meshlet, Meshoptimizer } from "./meshoptimizer/Meshoptimizer";

await Meshoptimizer.load();

export class MeshletEvents {
    public static Updated = (meshlet: MeshletMesh) => { }
}

export interface MeshletData {
    meshlets: Meshlet[];
    interleavedVertices: InterleavedVertexAttribute;
    indices: IndexAttribute;
    meshletInfoPacked: Float32Array;
}

const meshletDataCache: Map<Geometry, MeshletData> = new Map();

export const MeshletInfoFloatStride = 20;

export function buildMeshletData(geometry: Geometry): MeshletData {
    const cached = meshletDataCache.get(geometry);
    if (cached) return cached;

    const pa = geometry.attributes.get("position");
    const na = geometry.attributes.get("normal");
    const ua = geometry.attributes.get("uv");
    const ta = geometry.attributes.get("tangent");
    const ia = geometry.index;
    if (!pa || !na || !ua || !ia || !ta) throw Error("Meshlets need indices, position, normal, uv and tangent attributes");

    const p = pa.array as Float32Array;
    const n = na.array as Float32Array;
    const u = ua.array as Float32Array;
    const t = ta.array as Float32Array;
    const indices = ia.array instanceof Uint32Array ? ia.array : Uint32Array.from(ia.array as ArrayLike<number>);

    const interleaved = InterleavedVertexAttribute.fromArrays([p, n, u, t], [3, 3, 2, 4]);
    const output = Meshoptimizer.nanite(interleaved.array as Float32Array, indices);

    const bytesPerMeshlet = MeshletInfoFloatStride * 4;
    const packed = new ArrayBuffer(output.meshlets.length * bytesPerMeshlet);
    const view = new DataView(packed);

    for (let i = 0; i < output.meshlets.length; i++) {
        const m = output.meshlets[i];
        const base = i * bytesPerMeshlet;
        view.setUint32(base + 0, m.index_offset, true);
        view.setUint32(base + 4, m.index_count, true);
        view.setFloat32(base + 16, m.center[0], true);
        view.setFloat32(base + 20, m.center[1], true);
        view.setFloat32(base + 24, m.center[2], true);
        view.setFloat32(base + 28, m.radius, true);
        view.setFloat32(base + 32, m.group_error, true);
        view.setFloat32(base + 48, m.parent_center[0], true);
        view.setFloat32(base + 52, m.parent_center[1], true);
        view.setFloat32(base + 56, m.parent_center[2], true);
        view.setFloat32(base + 60, m.parent_radius, true);
        view.setFloat32(base + 64, m.parent_error, true);
    }

    const data: MeshletData = {
        meshlets: output.meshlets,
        interleavedVertices: interleaved,
        indices: new IndexAttribute(output.indices),
        meshletInfoPacked: new Float32Array(packed),
    };

    meshletDataCache.set(geometry, data);
    return data;
}

export class MeshletMesh extends Component {
    public meshlets: Meshlet[] = [];
    public interleavedVertices: InterleavedVertexAttribute;
    public indices: IndexAttribute;
    public meshletInfoPacked: Float32Array;

    public static MeshletInfoFloatStride = MeshletInfoFloatStride;

    private _material: GPU.Material;
    @Utils.SerializeField
    public get material(): GPU.Material { return this._material; }
    public set material(material: GPU.Material) { this._material = material; }

    @Utils.SerializeField
    public enableShadows: boolean = true;

    public clusterizeOnly = false;

    public set geometry(geometry: Geometry) {
        const data = buildMeshletData(geometry);
        this.meshlets = data.meshlets;
        this.interleavedVertices = data.interleavedVertices;
        this.indices = data.indices;
        this.meshletInfoPacked = data.meshletInfoPacked;
    }
}
