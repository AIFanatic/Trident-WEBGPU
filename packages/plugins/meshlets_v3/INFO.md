interface Meshlet {
    triangle_offset: number;
    triangle_count: number;
    vertex_offset: number;
    vertex_count: number;
    cone_apex: [number,number,number];
    cone_axis: [number,number,number];
    cone_cutoff: number;
    center: [number,number,number];
    radius: number;
}

interface Mesh {
    matrix: number[];
}

interface LodMesh {
    lod: number;
    meshIndex: number;
    baseVertexFloatOffset: number;
    baseVertexOffset: number;
    baseTriangleOffset: number;
    meshlet: Meshlet[];
}

interface ObjectInfo {
    lodMesh: number;
    meshletIndex: number;
}









interface Meshlet {
    triangle_offset: number;
    triangle_count: number;
    vertex_offset: number;
    vertex_count: number;
    cone_apex: [number,number,number];
    cone_axis: [number,number,number];
    cone_cutoff: number;
    center: [number,number,number];
    radius: number;
}

interface Mesh {
    matrix: number[];
}

interface LodMesh {
    lod: number;
    baseVertexFloatOffset: number;
    baseVertexOffset: number;
    baseTriangleOffset: number;
    meshlet: Meshlet[];
}

interface ObjectInfo {
    meshIndex: number;
    lodMeshIndex: number;
    meshletIndex: number;
}