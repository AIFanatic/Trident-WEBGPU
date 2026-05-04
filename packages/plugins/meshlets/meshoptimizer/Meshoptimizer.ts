import { WASMHelper, WASMPointer } from "./WASMHelper";
import MeshOptimizerModule from "./MeshOptimizerModule.js";
import { Utils } from "@trident/core";

interface Group {
    center: Float32Array;
    radius: number;
    error: number;
    depth: number;
}

export interface Meshlet {
    id: string;
    lod: number;
    index_offset: number;
    index_count: number;
    
    center: Float32Array;
    radius: number;
    error: number;

    group_error: number;
    parent_center: Float32Array;
    parent_radius: number;
    parent_error: number;
}

export class Meshoptimizer {
    public static isLoaded: boolean = false;
    private static module;

    public static kMeshletMaxTriangles = 512;

    public static async load() {
        if (!Meshoptimizer.module) {
            Meshoptimizer.module = await MeshOptimizerModule();
            this.isLoaded = true;
        }
    }


    public static nanite(
        vertices: Float32Array, // Vertex (px,py,pz,nx,ny,nz,ux,uy)
        indices: Uint32Array,
    ): { indices: Uint32Array, meshlets: Meshlet[] } {
        const MeshOptmizer = Meshoptimizer.module;

        WASMHelper.call(MeshOptmizer, "nanite", "void",
            new WASMPointer(vertices), vertices.length / 12,
            new WASMPointer(indices), indices.length
        );

        const group_count = WASMHelper.call(MeshOptmizer, "group_count", "number");
        const meshlet_count = WASMHelper.call(MeshOptmizer, "meshlet_count", "number");
        const meshlet_indices_count = WASMHelper.call(MeshOptmizer, "meshlet_indices_count", "number");
        const group_ptr = WASMHelper.call(MeshOptmizer, "group_ptr", "number");
        const meshlet_ptr = WASMHelper.call(MeshOptmizer, "meshlet_ptr", "number");
        const meshlet_indices_ptr = WASMHelper.call(MeshOptmizer, "meshlet_indices_ptr", "number");

        function groupView(i): Group {
            const base = group_ptr + i * 24;
            const heap = MeshOptmizer.HEAPU8.buffer;

            return {
                center: new Float32Array(heap, base + 0, 3).slice(), // we want copies
                radius: new Float32Array(heap, base + 12, 1)[0],
                error: new Float32Array(heap, base + 16, 1)[0],
                depth: new Int32Array(heap, base + 20, 1)[0],
            };
        }

        function meshletView(i): Meshlet {
            const base = meshlet_ptr + i * 36;
            const heap = MeshOptmizer.HEAPU8.buffer;

            const group_id = new Int32Array(heap, base + 28, 1)[0];
            const refined_group_id = new Int32Array(heap, base + 32, 1)[0];

            const group = groups[group_id];
            const refined = refined_group_id >= 0 ? groups[refined_group_id] : group;

            return {
                id: Utils.UUID(),
                lod: group.depth,
                
                // Meshlet
                center: new Float32Array(heap, base + 0, 3).slice(),
                radius: new Float32Array(heap, base + 12, 1)[0],
                error: new Float32Array(heap, base + 16, 1)[0],

                index_offset: new Uint32Array(heap, base + 20, 1)[0],
                index_count: new Uint32Array(heap, base + 24, 1)[0],
                
                group_error: group.error,
                parent_center: refined.center,
                parent_radius: refined.radius,
                parent_error: refined_group_id >= 0 ? refined.error : 0,
            };
        }

        const groups: Group[] = new Array(group_count);
        for (let i = 0; i < group_count; i++) groups[i] = groupView(i);

        let meshlets: Meshlet[] = [];
        for (let i = 0; i < meshlet_count; i++) {
            const meshletRaw = meshletView(i);
            meshlets.push(meshletRaw)
        }

        const meshlet_indices = new Uint32Array(MeshOptmizer.HEAPU8.buffer, meshlet_indices_ptr, meshlet_indices_count).slice();
        return { indices: meshlet_indices, meshlets: meshlets };
    }
}
