import { Geometry, Components, InterleavedVertexAttribute, EventSystem, Component, GPU, Utils, Mathf } from "@trident/core";
import { Meshoptimizer, meshopt_Meshlet } from "./nv_cluster_lod_builder/meshoptimizer/Meshoptimizer";
import { MeshInput } from "./nv_cluster_lod_builder/nvclusterlod_mesh";
import { LodMeshlet, NV_Cluster, computeMeshletBounds } from "./nv_cluster_lod_builder/lib";

await Meshoptimizer.load();

export class MeshletEvents {
    public static Updated = (meshlet: MeshletMeshV3) => {}
}

export class MeshletMeshV3 extends Component {

    private _material: GPU.Material;
    @Utils.SerializeField
    public get material(): GPU.Material { return this._material; };
    public set material(material: GPU.Material) {
        this._material = material;
        // EventSystem.emit(MeshEvents.MaterialUpdated, this, material);
    };

    @Utils.SerializeField
    public enableShadows: boolean = true;

    public lodMeshlets: LodMeshlet[] = [];


    public clusterizeOnly = true;
    
    public set geometry(geometry: Geometry) {
        const pa = geometry.attributes.get("position");
        const na = geometry.attributes.get("normal");
        const ua = geometry.attributes.get("uv");
        const ia = geometry.index;
        if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        const p = pa.array as Float32Array;
        const n = na.array as Float32Array;
        const u = ua.array as Float32Array;
        // const indices = ia.array as Uint32Array;
        const indices = ia.array instanceof Uint32Array ? ia.array : Uint32Array.from(ia.array as ArrayLike<number>);

        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;
        
        // Clusterize only path
        if (this.clusterizeOnly) {
            const meshletsBuildOutput = Meshoptimizer.meshopt_buildMeshlets(interleavedVertices, indices, 128, 128, 0.0);
            const lodMeshlet: LodMeshlet = {
                lod: 0,
                interleavedVertices: interleavedVertices,
                vertices: meshletsBuildOutput.meshlet_vertices_result,
                indices: meshletsBuildOutput.meshlet_triangles_result,
                meshlets: []
            };
            for (const meshlet of meshletsBuildOutput.meshlets_result) {
                const bounds = computeMeshletBounds(meshlet, meshletsBuildOutput.meshlet_vertices_result, meshletsBuildOutput.meshlet_triangles_result, interleavedVertices, 8);
          
                lodMeshlet.meshlets.push({
                    triangle_offset: meshlet.triangle_offset,
                    triangle_count: meshlet.triangle_count,
                    vertex_offset: meshlet.vertex_offset,
                    vertex_count: meshlet.vertex_count,
                    cone: { apex: bounds.cone_apex, axis: bounds.cone_axis, cutoff: bounds.cone_cutoff },
                    bounds: { center: bounds.center, radius: bounds.radius},
                    parentBounds: {center: bounds.center, radius: bounds.radius},
                    parentError: 0,
                    error: Math.max(bounds.radius, 1.0)
                });
            }
            this.lodMeshlets.push(lodMeshlet);
            EventSystem.emit(MeshletEvents.Updated, this);
            return;
        }

        const meshInput: MeshInput = new MeshInput();
        // Mesh data
        meshInput.indices = indices;
        meshInput.indexCount = indices.length;
        meshInput.vertices = interleavedVertices;
        meshInput.vertexOffset = 0;
        meshInput.vertexCount = interleavedVertices.length / 8;
        meshInput.vertexStride = 3 + 3 + 2;
        // Use default configurations and decimation factor:
        meshInput.clusterConfig = {
            minClusterSize: 128,
            maxClusterSize: 128,
            costUnderfill: 0.9,
            costOverlap: 0.5,
            preSplitThreshold: 1 << 17,
        };
        // Cluster group configuration -- here we force groups of size 32:
        meshInput.groupConfig = {
            minClusterSize: 32,
            maxClusterSize: 32,
            costUnderfill: 0.5,
            costOverlap: 0.0,
            preSplitThreshold: 0,
        };
        // Decimation factor
        meshInput.decimationFactor = 0.5;
        try {
            const outputMeshes = NV_Cluster.BuildToMeshlets(meshInput);
            this.lodMeshlets = outputMeshes;
        }
        catch(error) {
            console.warn("Ignoring geometry", geometry, error);
        }
    }
}