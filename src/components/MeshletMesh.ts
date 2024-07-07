import { Component } from "./Component";
import { Material } from "../renderer/Material";
import { Meshlet } from "../plugins/meshlets/Meshlet";
import { Geometry } from "../Geometry";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";

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

        const vertices = geometry.attributes.get("position");
        const indices = geometry.index;
        if (!vertices || !indices) throw Error("Needs vertices and indices");

        const geometryVertices = vertices.array as Float32Array;
        const geometryIndices = indices.array as Uint32Array

        const rootMeshlet = await Meshletizer.Build(geometryVertices, geometryIndices);

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
    }
}