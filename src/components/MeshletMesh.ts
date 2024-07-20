import { Component } from "./Component";
import { Material } from "../renderer/Material";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Geometry, InterleavedVertexAttribute } from "../Geometry";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";
import { Meshoptimizer } from "../plugins/meshlets/Meshoptimizer";
import { MeshletCreator } from "../plugins/meshlets/utils/MeshletCreator";

const meshletsCache: Map<Geometry, Meshlet[]> = new Map();

export class MeshletMesh extends Component {
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public meshlets: Meshlet[] = [];

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type: new(...args: any[]) => T): T[] {
        return this.materialsMapped.get(type.name) as T[] || [];
    }

    public async SetGeometry(geometry: Geometry) {
        const cached = meshletsCache.get(geometry);
        if (cached) {
            this.meshlets.push(...cached);
            return;
        }

        const pa = geometry.attributes.get("position");
        const na = geometry.attributes.get("normal");
        const ua = geometry.attributes.get("uv");
        const ia = geometry.index;
        if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
        
        const p = pa.array as Float32Array;
        const n = na.array as Float32Array;
        const u = ua.array as Float32Array;
        const indices = ia.array as Uint32Array;

        const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
        const interleavedVertices = interleavedBufferAttribute.array as Float32Array;

        await Meshoptimizer.load();
        console.log("interleaved", interleavedVertices)
        const rootMeshlet = await Meshletizer.Build(interleavedVertices, indices);

        function traverse(meshlet: Meshlet, fn: (meshlet: Meshlet) => void, visited: string[] = []) {
            if (visited.indexOf(meshlet.id) !== -1) return;
    
            fn(meshlet);
            visited.push(meshlet.id);
    
            for (let child of meshlet.parents) {
                traverse(child, fn, visited);
            }
        }
    
        const allMeshlets: Meshlet[] = [];
        traverse(rootMeshlet, m => allMeshlets.push(m));

        this.meshlets = allMeshlets;
        meshletsCache.set(geometry, this.meshlets);

        // this.meshlets = [new Meshlet(interleavedVertices, indices)];
        // console.log("original meshlet", this.meshlets);
        // const output = MeshletCreator.build(interleavedVertices, indices, 255, Meshlet.max_triangles);
        // // console.log(output)
        // this.meshlets = output;
        console.log("meshlets", this.meshlets)
    }
}